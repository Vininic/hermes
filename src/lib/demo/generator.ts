/** Realistic demo data — shown to first-time visitors (mostly portfolio
 *  reviewers) so every page has something real to look at instead of an
 *  empty state. Mirrors Pluto's `lib/demo/generator.ts` pattern: pure
 *  generators plus a couple of localStorage flags, no UI here. Writes
 *  straight to the same localStorage keys the Outbox/Flows stores read
 *  (`hermes.outbox.v1`, `hermes.flows.v1`) — those stores don't expose a
 *  bulk "replace" like Pluto's ledger does, so DemoPrompt reloads the page
 *  after writing instead of pushing through React state. */
import { addMessage as addOutboxMessage, createMessage, emptyDocument as emptyOutbox } from "@/lib/outbox/service";
import type { OutboxDocument, MessageChannel, MessageSource, MessageTemplate } from "@/lib/outbox/types";
import { addRun, emptyDocument as emptyFlows } from "@/lib/flows/service";
import type { FlowsDocument, RunRecord } from "@/lib/flows/types";
import { loadFlowCatalog } from "@/lib/flows/catalog";

const OUTBOX_KEY = "hermes.outbox.v1";
const FLOWS_KEY = "hermes.flows.v1";
const DEMO_FLAG = "hermes.demo.active";
const DISMISSED_FLAG = "hermes.demo.dismissed";

function daysAgo(n: number, hour = 8, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function generateOutbox(): OutboxDocument {
  let doc = emptyOutbox();
  const msg = (
    source: MessageSource, channel: MessageChannel, template: MessageTemplate,
    subject: string, daysBack: number, status: "sent" | "pending" | "failed", error?: string,
  ) => {
    let m = createMessage(source, channel, template, subject);
    m = { ...m, createdAt: daysAgo(daysBack, 8, 0), status };
    if (status === "sent") m.sentAt = daysAgo(daysBack, 8, 2);
    if (error) m.error = error;
    if (status !== "pending") m.attempts = 1;
    doc = addOutboxMessage(doc, m);
  };

  msg("pluto", "email", "monthly-report", "Relatório mensal — Julho", 14, "sent");
  msg("pluto", "email", "budget-alert", "Orçamento de Alimentação estourado", 9, "sent");
  msg("chronos", "email", "digest", "Resumo semanal do Chronos", 7, "sent");
  msg("kairos", "email", "deadline-reminder", "3 tarefas vencendo hoje", 6, "sent");
  msg("pluto", "telegram", "budget-alert", "Meta \"PC novo\" 80% completa", 5, "sent");
  msg("chiron", "email", "digest", "12 cartões pra revisar hoje", 4, "sent");
  msg("pluto", "email", "monthly-report", "Relatório mensal — Agosto", 3, "failed", "Resend API: rate limit exceeded");
  msg("kairos", "whatsapp", "deadline-reminder", "Projeto \"Zonai Codex\" — prazo amanhã", 2, "sent");
  msg("chronos", "email", "digest", "Resumo semanal do Chronos", 1, "sent");
  msg("pluto", "email", "budget-alert", "Orçamento de Transporte estourado", 0, "pending");
  msg("hermes", "email", "custom", "Teste de canal — Email", 0, "sent");

  return doc;
}

function generateFlows(): FlowsDocument {
  let doc = emptyFlows();
  const catalog = loadFlowCatalog();
  const byId = (id: string) => catalog.find((f) => f.id === id)!;

  const run = (
    flowId: string, daysBack: number, hour: number, status: "success" | "failed", durationMs: number,
    messageCount: number, error?: string, failedNodeId?: string,
  ) => {
    const flow = byId(flowId);
    const startedAt = daysAgo(daysBack, hour, 0);
    const record: RunRecord = {
      id: crypto.randomUUID(),
      flowId,
      flowName: flow.name,
      status,
      startedAt,
      completedAt: new Date(new Date(startedAt).getTime() + durationMs).toISOString(),
      durationMs,
      messageCount,
      ...(error ? { error } : {}),
      ...(failedNodeId ? { failedNodeId } : {}),
    };
    doc = addRun(doc, record);
  };

  // outbox-consumer runs roughly once a minute in production; a sparse
  // sample is enough to make Runs/Flows feel alive without 10k rows.
  for (let d = 5; d >= 0; d--) {
    run("outbox-consumer", d, 8, "success", 640, d === 3 ? 0 : 1);
  }
  // The rate-limit failure happens at the node that actually calls Resend —
  // "resend" in outbox-consumer's flow.json — so the failed-node highlight
  // has something real to point at instead of a made-up id.
  run("outbox-consumer", 3, 9, "failed", 1200, 0, "Resend API: rate limit exceeded", "resend");
  run("monthly-report", 14, 8, "success", 3400, 1);
  run("heartbeat", 0, 8, "success", 210, 0);

  doc = { ...doc, heartbeatAt: daysAgo(0, new Date().getHours(), new Date().getMinutes()) };
  return doc;
}

export function generateDemoData(): { outbox: OutboxDocument; flows: FlowsDocument } {
  return { outbox: generateOutbox(), flows: generateFlows() };
}

export function loadDemoData(): void {
  const { outbox, flows } = generateDemoData();
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
    localStorage.setItem(FLOWS_KEY, JSON.stringify(flows));
    localStorage.setItem(DEMO_FLAG, "true");
  } catch { /* noop */ }
}

export function isDemoMode(): boolean {
  try {
    return localStorage.getItem(DEMO_FLAG) === "true";
  } catch {
    return false;
  }
}

export function hasRealData(): boolean {
  try {
    const outboxRaw = localStorage.getItem(OUTBOX_KEY);
    const flowsRaw = localStorage.getItem(FLOWS_KEY);
    const outboxHasData = !!outboxRaw && (JSON.parse(outboxRaw) as OutboxDocument).messages?.length > 0;
    const flowsHasData = !!flowsRaw && (JSON.parse(flowsRaw) as FlowsDocument).runs?.length > 0;
    return outboxHasData || flowsHasData;
  } catch {
    return false;
  }
}

export function shouldShowDemoPrompt(): boolean {
  try {
    if (localStorage.getItem(DEMO_FLAG) === "true") return false;
    if (localStorage.getItem(DISMISSED_FLAG) === "true") return false;
    return !hasRealData();
  } catch {
    return false;
  }
}

export function dismissDemoPrompt(): void {
  try {
    localStorage.setItem(DISMISSED_FLAG, "true");
  } catch { /* noop */ }
}
