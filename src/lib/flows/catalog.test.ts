import { describe, it, expect } from "vitest";
import { loadFlowCatalog, flowBounds } from "./catalog";

describe("flow catalog", () => {
  it("loads all three committed flows with derived ids", () => {
    const catalog = loadFlowCatalog();
    const ids = catalog.map((f) => f.id).sort();
    expect(ids).toEqual(["heartbeat", "monthly-report", "outbox-consumer"]);
  });

  it("every flow has connected nodes only (no dangling connection endpoints)", () => {
    for (const flow of loadFlowCatalog()) {
      const nodeIds = new Set(flow.nodes.map((n) => n.id));
      for (const c of flow.connections) {
        expect(nodeIds.has(c.source)).toBe(true);
        expect(nodeIds.has(c.target)).toBe(true);
      }
    }
  });

  it("computes a bounding box covering every node position", () => {
    const heartbeat = loadFlowCatalog().find((f) => f.id === "heartbeat")!;
    const bounds = flowBounds(heartbeat);
    expect(bounds.minX).toBe(0);
    expect(bounds.maxX).toBe(600);
    expect(bounds.minY).toBe(0);
    expect(bounds.maxY).toBe(0);
  });
});
