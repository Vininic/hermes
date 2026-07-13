import type { OutboxDocument } from "@/lib/outbox/types";
import { retryMessage, cancelMessage } from "@/lib/outbox/service";

export type AetherisAction =
  | { type: "retry_message"; messageId: string }
  | { type: "cancel_message"; messageId: string };

const ACTION_TYPES = ["retry_message", "cancel_message"];

export function parseActions(reply: string): { prose: string; actions: AetherisAction[] } {
  const match = reply.match(/```actions\s*([\s\S]*?)```/);
  if (!match) return { prose: reply.trim(), actions: [] };
  const prose = reply.replace(match[0], "").trim();
  let raw: unknown;
  try {
    raw = JSON.parse(match[1]);
  } catch {
    return { prose, actions: [] };
  }
  if (!Array.isArray(raw)) return { prose, actions: [] };
  const actions = raw.filter(
    (a): a is AetherisAction =>
      !!a && typeof a === "object" && ACTION_TYPES.includes((a as { type?: string }).type ?? ""),
  );
  return { prose, actions };
}

export function applyAction(doc: OutboxDocument, action: AetherisAction): OutboxDocument | string {
  switch (action.type) {
    case "retry_message": {
      const msg = doc.messages.find((m) => m.id === action.messageId);
      if (!msg) return `No message with id "${action.messageId}"`;
      if (msg.status !== "failed") return `Message "${action.messageId}" is not in failed state`;
      return retryMessage(doc, action.messageId);
    }
    case "cancel_message": {
      const msg = doc.messages.find((m) => m.id === action.messageId);
      if (!msg) return `No message with id "${action.messageId}"`;
      if (msg.status === "sent") return `Message "${action.messageId}" has already been sent`;
      return cancelMessage(doc, action.messageId);
    }
  }
}

export function describeAction(doc: OutboxDocument, action: AetherisAction): string {
  const msg = doc.messages.find((m) => m.id === action.messageId);
  const subject = msg?.subject ?? action.messageId;
  switch (action.type) {
    case "retry_message":
      return `Reenviar "${subject}"`;
    case "cancel_message":
      return `Cancelar "${subject}"`;
  }
}
