import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import type { OutboxDocument, OutboxMessage } from "./types";
import { addMessage, cancelMessage, countByStatus, emptyDocument, retryMessage } from "./service";

const LOCAL_KEY = "hermes.outbox.v1";

interface OutboxContextValue {
  doc: OutboxDocument;
  counts: ReturnType<typeof countByStatus>;
  enqueue: (msg: OutboxMessage) => void;
  retry: (messageId: string) => void;
  cancel: (messageId: string) => void;
  pushToCloud: () => Promise<void>;
  pullFromCloud: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const OutboxCtx = createContext<OutboxContextValue | null>(null);

function loadLocal(): OutboxDocument {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return emptyDocument();
    const parsed = JSON.parse(raw) as OutboxDocument;
    if (!parsed.messages || !Array.isArray(parsed.messages)) return emptyDocument();
    return parsed;
  } catch {
    return emptyDocument();
  }
}

function saveLocal(doc: OutboxDocument) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(doc));
  } catch { /* noop */ }
}

export function OutboxProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [doc, setDoc] = useState<OutboxDocument>(loadLocal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cloudFetched = useRef(false);

  useEffect(() => {
    saveLocal(doc);
  }, [doc]);

  useEffect(() => {
    if (session?.email && !cloudFetched.current) {
      cloudFetched.current = true;
      pullFromCloud();
    }
    if (!session?.email) {
      cloudFetched.current = false;
    }
  }, [session?.email]);

  async function pullFromCloud() {
    if (!session?.email) return;
    setLoading(true);
    setError(null);
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = (await import("@/lib/supabase/client")).getSupabaseClient();
      if (!supabase) return;
      const { data, error: fetchError } = await supabase
        .from("user_data")
        .select("value")
        .eq("key", "hermes-outbox")
        .single();
      if (fetchError) {
        if (fetchError.code === "PGRST116") return;
        setError(fetchError.message);
        return;
      }
      if (data?.value) {
        setDoc(data.value as OutboxDocument);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function pushToCloud() {
    if (!session?.email) return;
    setError(null);
    try {
      const supabase = (await import("@/lib/supabase/client")).getSupabaseClient();
      if (!supabase) return;
      const { error: upsertError } = await supabase.from("user_data").upsert(
        { key: "hermes-outbox", value: doc, version: Date.now() },
        { onConflict: "user_id, key" },
      );
      if (upsertError) setError(upsertError.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  const enqueue = useCallback((msg: OutboxMessage) => {
    setDoc((prev) => {
      const next = addMessage(prev, msg);
      return next;
    });
  }, []);

  const retry = useCallback((messageId: string) => {
    setDoc((prev) => retryMessage(prev, messageId));
  }, []);

  const cancel = useCallback((messageId: string) => {
    setDoc((prev) => cancelMessage(prev, messageId));
  }, []);

  const counts = useMemo(() => countByStatus(doc), [doc]);

  return (
    <OutboxCtx.Provider value={{ doc, counts, enqueue, retry, cancel, pushToCloud, pullFromCloud, loading, error }}>
      {children}
    </OutboxCtx.Provider>
  );
}

export function useOutbox() {
  const ctx = useContext(OutboxCtx);
  if (!ctx) throw new Error("useOutbox must be used within OutboxProvider");
  return ctx;
}
