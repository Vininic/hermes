import type { OutboxDocument, OutboxMessage, MessageChannel, MessageSource, MessageTemplate, MessageStatus } from "./types";

const OUTBOX_KEY = "hermes-outbox";

export function emptyDocument(): OutboxDocument {
  return { version: 1, messages: [] };
}

export function createMessage(
  source: MessageSource,
  channel: MessageChannel,
  template: MessageTemplate,
  subject: string,
  payload: Record<string, unknown> = {},
): OutboxMessage {
  return {
    id: crypto.randomUUID(),
    source,
    channel,
    template,
    subject,
    payload,
    status: "pending",
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
}

export function addMessage(doc: OutboxDocument, msg: OutboxMessage): OutboxDocument {
  return { ...doc, messages: [...doc.messages, msg], version: doc.version + 1 };
}

export function updateMessageStatus(
  doc: OutboxDocument,
  messageId: string,
  status: MessageStatus,
  error?: string,
): OutboxDocument {
  return {
    ...doc,
    messages: doc.messages.map((m) =>
      m.id === messageId
        ? { ...m, status, attempts: m.attempts + 1, ...(status === "sent" ? { sentAt: new Date().toISOString() } : {}), ...(error ? { error } : {}) }
        : m,
    ),
    version: doc.version + 1,
  };
}

export function retryMessage(doc: OutboxDocument, messageId: string): OutboxDocument {
  return updateMessageStatus(doc, messageId, "pending");
}

export function cancelMessage(doc: OutboxDocument, messageId: string): OutboxDocument {
  return {
    ...doc,
    messages: doc.messages.map((m) => (m.id === messageId ? { ...m, status: "failed" as const, error: "Cancelled by user" } : m)),
    version: doc.version + 1,
  };
}

export function getMessagesByStatus(doc: OutboxDocument, status: MessageStatus): OutboxMessage[] {
  return doc.messages.filter((m) => m.status === status);
}

export function getMessagesBySource(doc: OutboxDocument, source: MessageSource): OutboxMessage[] {
  return doc.messages.filter((m) => m.source === source);
}

export function countByStatus(doc: OutboxDocument): Record<MessageStatus, number> {
  const counts: Record<MessageStatus, number> = { pending: 0, sent: 0, failed: 0 };
  for (const m of doc.messages) counts[m.status]++;
  return counts;
}

export function serialize(doc: OutboxDocument): string {
  return JSON.stringify(doc);
}

export function deserialize(raw: string): OutboxDocument {
  try {
    const parsed = JSON.parse(raw) as OutboxDocument;
    if (!parsed.messages || !Array.isArray(parsed.messages)) return emptyDocument();
    return parsed;
  } catch {
    return emptyDocument();
  }
}
