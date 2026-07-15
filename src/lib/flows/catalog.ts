import type { FlowDefinition } from "./types";
import heartbeat from "../../../flows/heartbeat/flow.json";
import outboxConsumer from "../../../flows/outbox-consumer/flow.json";
import monthlyReport from "../../../flows/monthly-report/flow.json";

/** Raw shape committed by the n8n export — no `id` field (the folder name IS
 *  the id), `lastRunStatus` always "never" (it's a static design artifact,
 *  not live state; real status comes from `FlowsDocument.runs` at render time). */
interface RawFlow extends Omit<FlowDefinition, "id"> {}

const RAW_FLOWS: Record<string, RawFlow> = {
  heartbeat: heartbeat as RawFlow,
  "outbox-consumer": outboxConsumer as RawFlow,
  "monthly-report": monthlyReport as RawFlow,
};

/** The suite's flow catalog, straight from the committed n8n export
 *  (`flows/*.json`) — this is what actually runs in n8n and in production
 *  (the Edge Function mirrors the same logic), not a hand-typed mock. */
export function loadFlowCatalog(): FlowDefinition[] {
  return Object.entries(RAW_FLOWS).map(([id, raw]) => ({ id, ...raw }));
}

/** Bounding box of a flow's node positions, in n8n canvas units — used to
 *  size/scale the SVG viewBox so every node fits regardless of flow shape. */
export function flowBounds(flow: FlowDefinition): { minX: number; minY: number; maxX: number; maxY: number } {
  const xs = flow.nodes.map((n) => n.position[0]);
  const ys = flow.nodes.map((n) => n.position[1]);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}
