import type { FlowsDocument, FlowDefinition, RunRecord } from "./types";

const FLOWS_KEY = "hermes-flows";

export function emptyDocument(): FlowsDocument {
  return { version: 1, flows: [], runs: [] };
}

export function addRun(doc: FlowsDocument, run: RunRecord): FlowsDocument {
  return { ...doc, runs: [run, ...doc.runs].slice(0, 200), version: doc.version + 1 };
}

export function getRunsByFlow(doc: FlowsDocument, flowId: string): RunRecord[] {
  return doc.runs.filter((r) => r.flowId === flowId);
}

export function getLatestRun(doc: FlowsDocument, flowId: string): RunRecord | undefined {
  return doc.runs.find((r) => r.flowId === flowId);
}

export function getEngineStatus(doc: FlowsDocument): { online: boolean; lastSeenAgo: string | null } {
  if (!doc.heartbeatAt) return { online: false, lastSeenAgo: null };
  const elapsed = Date.now() - new Date(doc.heartbeatAt).getTime();
  const online = elapsed < 5 * 60 * 1000;
  const mins = Math.floor(elapsed / 60000);
  const secs = Math.floor((elapsed % 60000) / 1000);
  return {
    online,
    lastSeenAgo: mins > 0 ? `${mins}m ${secs}s ago` : `${secs}s ago`,
  };
}

export function serialize(doc: FlowsDocument): string {
  return JSON.stringify(doc);
}

export function deserialize(raw: string): FlowsDocument {
  try {
    const parsed = JSON.parse(raw) as FlowsDocument;
    if (!parsed.flows || !Array.isArray(parsed.flows)) return emptyDocument();
    return parsed;
  } catch {
    return emptyDocument();
  }
}
