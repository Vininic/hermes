export interface FlowNode {
  id: string;
  name: string;
  type: string;
  position: [number, number];
}

export interface FlowConnection {
  source: string;
  target: string;
}

export interface FlowDefinition {
  id: string;
  name: string;
  description: string;
  trigger: string;
  nodes: FlowNode[];
  connections: FlowConnection[];
  lastRunStatus?: "success" | "failed" | "never";
  lastRunAt?: string;
}

export interface RunRecord {
  id: string;
  flowId: string;
  flowName: string;
  status: "success" | "failed";
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  messageCount: number;
  error?: string;
  /** Which node in the flow's node list (FlowNode.id) the failure happened
   *  at — only meaningful when status is "failed". Populated by the demo
   *  generator here; the real production Edge Function that writes run
   *  records lives outside this repo and would need its own update to
   *  start populating this for real failures. */
  failedNodeId?: string;
}

export interface FlowsDocument {
  version: number;
  flows: FlowDefinition[];
  runs: RunRecord[];
  heartbeatAt?: string;
}
