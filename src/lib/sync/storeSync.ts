// Sync engine pattern — mirrors Kairos' boardSync.ts.
// On cloud login: pull from user_data, re-hydrate local store.
// On local change: debounced push (1s) to user_data.
// Realtime subscription with own-write echo guard.

import { getSupabaseClient } from "@/lib/supabase/client";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type SyncCallback<T> = (data: T) => void;

interface SyncOptions<T> {
  key: string;
  serialize: (data: T) => string;
  deserialize: (raw: string) => T;
  onRemoteChange: SyncCallback<T>;
}

export function createStoreSync<T>(options: SyncOptions<T>) {
  let pushTimer: ReturnType<typeof setTimeout> | null = null;
  let lastPushVersion = 0;
  let realtimeChannel: RealtimeChannel | null = null;

  async function pull(): Promise<T | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("user_data")
      .select("value")
      .eq("key", options.key)
      .single();
    if (error || !data?.value) return null;
    const raw = JSON.stringify(data.value);
    return options.deserialize(raw);
  }

  async function push(data: T): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const version = Date.now();
    lastPushVersion = version;
    await supabase.from("user_data").upsert(
      { key: options.key, value: JSON.parse(options.serialize(data)), version },
      { onConflict: "user_id, key" },
    );
  }

  function schedulePush(data: T) {
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => { push(data); }, 1000);
  }

  function subscribe(userId: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    realtimeChannel = supabase
      .channel(`sync-${options.key}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_data",
          filter: `key=eq.${options.key}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const newVersion = (payload.new as { version?: number })?.version ?? 0;
          if (newVersion <= lastPushVersion) return;
          const raw = JSON.stringify((payload.new as { value?: unknown })?.value ?? "{}");
          const data = options.deserialize(raw);
          options.onRemoteChange(data);
        },
      )
      .subscribe();
  }

  function disconnect() {
    if (pushTimer) clearTimeout(pushTimer);
    if (realtimeChannel) realtimeChannel.unsubscribe();
  }

  return { pull, push, schedulePush, subscribe, disconnect };
}
