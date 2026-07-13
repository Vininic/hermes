import { describe, it, expect } from "vitest";
import { parseActions, applyAction, describeAction } from "@/lib/ai/actions";
import { createMessage, addMessage } from "@/lib/outbox/service";
import type { OutboxDocument } from "@/lib/outbox/types";

describe("Aetheris actions", () => {
  it("parses an actions block from assistant reply", () => {
    const reply = 'Some prose\n\n```actions\n[{"type":"retry_message","messageId":"abc"}]\n```\n\nMore text';
    const { prose, actions } = parseActions(reply);
    expect(prose).toContain("Some prose");
    expect(prose).toContain("More text");
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe("retry_message");
  });

  it("returns empty on no actions block", () => {
    const { prose, actions } = parseActions("Just prose");
    expect(actions).toHaveLength(0);
    expect(prose).toBe("Just prose");
  });

  it("applies retry_message action", () => {
    const doc = { version: 1, messages: [{ id: "m1", source: "pluto" as const, channel: "email" as const, template: "custom" as const, subject: "Test", payload: {}, status: "failed" as const, createdAt: new Date().toISOString(), attempts: 2, error: "Resend error" }] };
    const result = applyAction(doc, { type: "retry_message", messageId: "m1" });
    if (typeof result === "string") throw new Error(result);
    expect(result.messages[0].status).toBe("pending");
  });

  it("refuses to retry a sent message", () => {
    const doc = { version: 1, messages: [{ id: "m1", source: "pluto" as const, channel: "email" as const, template: "custom" as const, subject: "Test", payload: {}, status: "sent" as const, createdAt: new Date().toISOString(), sentAt: new Date().toISOString(), attempts: 1 }] };
    const result = applyAction(doc, { type: "retry_message", messageId: "m1" });
    expect(typeof result).toBe("string");
  });

  it("applies cancel_message action", () => {
    const doc = { version: 1, messages: [{ id: "m1", source: "pluto" as const, channel: "email" as const, template: "custom" as const, subject: "Test", payload: {}, status: "pending" as const, createdAt: new Date().toISOString(), attempts: 0 }] };
    const result = applyAction(doc, { type: "cancel_message", messageId: "m1" });
    if (typeof result === "string") throw new Error(result);
    expect(result.messages[0].status).toBe("failed");
  });

  it("describes actions in localized text", () => {
    const doc = { version: 1, messages: [{ id: "m1", source: "pluto" as const, channel: "email" as const, template: "custom" as const, subject: "Monthly Report", payload: {}, status: "failed" as const, createdAt: new Date().toISOString(), attempts: 2, error: "err" }] };
    const desc = describeAction(doc, { type: "retry_message", messageId: "m1" });
    expect(desc).toContain("Monthly Report");
  });
});
