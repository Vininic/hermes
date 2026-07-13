import { describe, it, expect } from "vitest";
import { emptyDocument, addRun, getRunsByFlow, getLatestRun, getEngineStatus } from "./service";
import type { RunRecord } from "./types";

describe("flows service", () => {
  it("creates empty document", () => {
    const doc = emptyDocument();
    expect(doc.flows).toEqual([]);
    expect(doc.runs).toEqual([]);
  });

  it("adds a run and keeps recent 200", () => {
    let doc = emptyDocument();
    const run: RunRecord = { id: "r1", flowId: "f1", flowName: "Heartbeat", status: "success", startedAt: new Date().toISOString(), durationMs: 500, messageCount: 0 };
    doc = addRun(doc, run);
    expect(doc.runs).toHaveLength(1);
  });

  it("filters runs by flow id", () => {
    let doc = emptyDocument();
    doc = addRun(doc, { id: "r1", flowId: "f1", flowName: "Heartbeat", status: "success", startedAt: new Date().toISOString(), durationMs: 100, messageCount: 0 });
    doc = addRun(doc, { id: "r2", flowId: "f2", flowName: "Outbox", status: "failed", startedAt: new Date().toISOString(), durationMs: 200, messageCount: 5, error: "timeout" });
    const f1Runs = getRunsByFlow(doc, "f1");
    expect(f1Runs).toHaveLength(1);
    expect(f1Runs[0].flowName).toBe("Heartbeat");
  });

  it("returns engine status", () => {
    const recent = getEngineStatus({ version: 1, flows: [], runs: [], heartbeatAt: new Date().toISOString() });
    expect(recent.online).toBe(true);

    const old = getEngineStatus({ version: 1, flows: [], runs: [], heartbeatAt: new Date(Date.now() - 10 * 60 * 1000).toISOString() });
    expect(old.online).toBe(false);

    const none = getEngineStatus({ version: 1, flows: [], runs: [] });
    expect(none.online).toBe(false);
    expect(none.lastSeenAgo).toBeNull();
  });
});
