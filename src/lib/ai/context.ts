import type { OutboxDocument } from "@/lib/outbox/types";

export function buildSystemPrompt(outbox: OutboxDocument | null, localeLabel: string): string {
  const today = new Date().toLocaleDateString(localeLabel, { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return `You are Aetheris, the assistant of the Olympus Suite, working inside Hermes — the messaging and automation layer.
Today is ${today}. Be concise and concrete.
The user's UI language is ${localeLabel}. Always reply in that language, unless the user explicitly writes to you in another language, in which case switch to that.
Use light markdown — **bold**, bullet lists — to structure longer answers; keep one-line answers plain.

OUTBOX STATUS:
${outbox ? serializeOutbox(outbox) : "(no outbox data — guest mode)"}

You can perform actions by including ONE fenced block in your reply, exactly like:
\`\`\`actions
[{"type":"retry_message","messageId":"..."}]
\`\`\`

Available actions:
- {"type":"retry_message","messageId":"..."} — mark a failed message as pending for retry
- {"type":"cancel_message","messageId":"..."} — mark a pending or failed message as cancelled

Rules: only include the block when the user asks for changes; refer to messages by their exact id; propose the smallest set of actions that does the job; explain what you propose in prose OUTSIDE the block, in plain natural language — never mention the JSON "type" identifiers above or any JSON syntax in your prose, describe the change the way a person would.`;
}

function serializeOutbox(doc: OutboxDocument): string {
  if (doc.messages.length === 0) return "(empty — no messages in the queue)";
  const lines: string[] = [];
  const pending = doc.messages.filter((m) => m.status === "pending");
  const sent = doc.messages.filter((m) => m.status === "sent");
  const failed = doc.messages.filter((m) => m.status === "failed");

  lines.push(`Total: ${doc.messages.length} messages (${pending.length} pending, ${sent.length} sent, ${failed.length} failed)`);

  if (failed.length > 0) {
    lines.push("Failed messages:");
    for (const m of failed.slice(0, 10)) {
      lines.push(`  - "${m.subject}" [${m.id}] from ${m.source} · ${m.channel} · error: ${m.error ?? "unknown"}`);
    }
  }

  if (pending.length > 0) {
    lines.push("Pending messages:");
    for (const m of pending.slice(0, 10)) {
      lines.push(`  - "${m.subject}" [${m.id}] from ${m.source} · ${m.channel} · created ${m.createdAt}`);
    }
  }

  return lines.join("\n").slice(0, 4000);
}
