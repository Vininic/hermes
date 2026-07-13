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
}

export interface FlowsDocument {
  version: number;
  flows: FlowDefinition[];
  runs: RunRecord[];
  heartbeatAt?: string;
}
