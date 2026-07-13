import { describe, it, expect } from "vitest";
import {
  emptyDocument,
  createMessage,
  addMessage,
  updateMessageStatus,
  retryMessage,
  cancelMessage,
  getMessagesByStatus,
  countByStatus,
  serialize,
  deserialize,
} from "./service";
import type { OutboxDocument } from "./types";

describe("outbox service", () => {
  it("creates an empty document", () => {
    const doc = emptyDocument();
    expect(doc.version).toBe(1);
    expect(doc.messages).toEqual([]);
  });

  it("creates a message", () => {
    const msg = createMessage("pluto", "email", "monthly-report", "Test report", { html: "<p>test</p>" });
    expect(msg.source).toBe("pluto");
    expect(msg.channel).toBe("email");
    expect(msg.status).toBe("pending");
    expect(msg.attempts).toBe(0);
    expect(msg.id).toBeTruthy();
  });

  it("adds a message to the document", () => {
    const doc = emptyDocument();
    const msg = createMessage("chronos", "telegram", "digest", "Daily digest");
    const next = addMessage(doc, msg);
    expect(next.messages).toHaveLength(1);
    expect(next.version).toBe(2);
  });

  it("updates message status", () => {
    const doc = emptyDocument();
    const msg = createMessage("kairos", "email", "custom", "Hello");
    const withMsg = addMessage(doc, msg);
    const updated = updateMessageStatus(withMsg, msg.id, "sent");
    expect(updated.messages[0].status).toBe("sent");
    expect(updated.messages[0].sentAt).toBeTruthy();
    expect(updated.messages[0].attempts).toBe(1);
  });

  it("retries a failed message", () => {
    const doc = emptyDocument();
    const msg = createMessage("pluto", "email", "monthly-report", "Report");
    const failed = updateMessageStatus(addMessage(doc, msg), msg.id, "failed", "Resend error");
    const retried = retryMessage(failed, msg.id);
    expect(retried.messages[0].status).toBe("pending");
  });

  it("cancels a pending message", () => {
    const doc = emptyDocument();
    const msg = createMessage("hermes", "email", "custom", "Cancel test");
    const withMsg = addMessage(doc, msg);
    const cancelled = cancelMessage(withMsg, msg.id);
    expect(cancelled.messages[0].status).toBe("failed");
    expect(cancelled.messages[0].error).toBe("Cancelled by user");
  });

  it("counts messages by status", () => {
    const doc = emptyDocument();
    const m1 = createMessage("pluto", "email", "custom", "1");
    const m2 = createMessage("pluto", "email", "custom", "2");
    const m3 = createMessage("pluto", "email", "custom", "3");
    const step1 = updateMessageStatus(addMessage(addMessage(addMessage(doc, m1), m2), m3), m1.id, "sent");
    const step2 = updateMessageStatus(step1, m2.id, "failed", "err");
    const counts = countByStatus(step2);
    expect(counts.pending).toBe(1);
    expect(counts.sent).toBe(1);
    expect(counts.failed).toBe(1);
  });

  it("filters messages by status", () => {
    const doc = emptyDocument();
    const m1 = createMessage("pluto", "email", "custom", "1");
    const m2 = createMessage("pluto", "email", "custom", "2");
    const withMsgs = updateMessageStatus(addMessage(addMessage(doc, m1), m2), m1.id, "sent");
    const pending = getMessagesByStatus(withMsgs, "pending");
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe(m2.id);
  });

  it("serializes and deserializes", () => {
    const doc = emptyDocument();
    const msg = createMessage("chronos", "email", "digest", "Test");
    const withMsg = addMessage(doc, msg);
    const raw = serialize(withMsg);
    const restored = deserialize(raw);
    expect(restored.messages).toHaveLength(1);
    expect(restored.messages[0].subject).toBe("Test");
  });

  it("returns empty doc on garbage deserialize", () => {
    const doc = deserialize("not valid json");
    expect(doc.messages).toEqual([]);
  });
});
