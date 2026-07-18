import { useState } from "react";
import { useOutbox } from "@/lib/outbox/store";
import { createMessage } from "@/lib/outbox/service";
import type { ChannelKind } from "./types";

/** Shared "send a test message" action — used by the Channels page's
 *  per-channel buttons and the topbar's quick-send dialog, so there's one
 *  implementation instead of two.
 *
 *  Extracted from Channels.tsx's original inline handler, which had a real
 *  bug: it built a fresh `{ version: 1, messages: [msg] }` document and
 *  upserted it straight to Supabase, replacing the entire cloud outbox with
 *  just the one test message — silently destroying every other message the
 *  user had. This version goes through `useOutbox()`'s `enqueue` (adds to
 *  the real local doc) then `pushToCloud()` (pushes that real doc), so nothing
 *  gets clobbered. */
export function useSendTest() {
  const { enqueue, pushToCloud } = useOutbox();
  const [sending, setSending] = useState<ChannelKind | null>(null);

  async function sendTest(kind: ChannelKind): Promise<boolean> {
    setSending(kind);
    try {
      const msg = createMessage("hermes", kind, "custom", `Test message (${kind})`, {
        text: `This is a test message sent from Hermes at ${new Date().toISOString()}.`,
      });
      enqueue(msg);
      await pushToCloud();
      return true;
    } catch {
      return false;
    } finally {
      setSending(null);
    }
  }

  return { sending, sendTest };
}
