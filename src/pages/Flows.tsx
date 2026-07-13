import { AlertCircle, CheckCircle2, Workflow } from "lucide-react";
import { useT } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface FlowNode {
  id: string;
  name: string;
  position: [number, number];
}

const SAMPLE_FLOWS = [
  {
    id: "heartbeat",
    name: "Heartbeat",
    description: "Timestamps hermes-flows every minute to signal the engine is alive.",
    trigger: "Cron: every minute",
    nodes: [
      { id: "schedule", name: "Schedule Trigger", position: [0, 0] as [number, number] },
      { id: "http", name: "HTTP Request", position: [1, 0] as [number, number] },
      { id: "code", name: "Write heartbeat", position: [2, 0] as [number, number] },
    ],
    lastRunStatus: "success" as const,
  },
  {
    id: "outbox-consumer",
    name: "Outbox Consumer",
    description: "Polls hermes-outbox for pending messages and delivers via Resend.",
    trigger: "Cron: every minute",
    nodes: [
      { id: "schedule", name: "Schedule Trigger", position: [0, 0] as [number, number] },
      { id: "supabase", name: "Fetch pending", position: [1, 0] as [number, number] },
      { id: "code-split", name: "Split by channel", position: [2, 0] as [number, number] },
      { id: "resend", name: "Resend email", position: [3, -1] as [number, number] },
      { id: "code-write", name: "Write status", position: [4, 0] as [number, number] },
    ],
    lastRunStatus: "success" as const,
  },
  {
    id: "monthly-report",
    name: "Monthly Report",
    description: "Triggered by Pluto's schedule: generates a report and sends via email.",
    trigger: "Cron: 1st of month, 08:00",
    nodes: [
      { id: "schedule", name: "Cron trigger", position: [0, 0] as [number, number] },
      { id: "pluto-data", name: "Fetch ledger", position: [1, 0] as [number, number] },
      { id: "code-gen", name: "Generate HTML", position: [2, 0] as [number, number] },
      { id: "resend", name: "Send email", position: [3, 0] as [number, number] },
    ],
    lastRunStatus: "never" as const,
  },
];

function FlowNodeBadge({ node, index }: { node: FlowNode; index: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs">
      <span className="grid h-5 w-5 place-items-center rounded-full bg-secondary/10 text-[10px] font-medium text-secondary">{index + 1}</span>
      <span className="text-primary">{node.name}</span>
    </div>
  );
}

export default function Flows() {
  const t = useT();
  const F = t.hermes.flows;
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <header>
        <div className="text-[11px] uppercase tracking-[0.22em] text-secondary">{F.eyebrow}</div>
        <h1 className="font-display mt-1.5 text-4xl text-primary">{F.title}</h1>
      </header>

      <div className="grid gap-6">
        {SAMPLE_FLOWS.map((flow) => (
          <div
            key={flow.id}
            className="hermes-card cursor-pointer p-6 transition-colors hover:bg-card/80"
            onClick={() => navigate("/runs")}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Workflow className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg text-primary">{flow.name}</h2>
                  <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">{flow.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-muted-foreground">{F.trigger}:</span>
                <span className="rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] text-primary">{flow.trigger}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4 overflow-x-auto pb-1">
              <span className="shrink-0 text-[11px] text-muted-foreground">{F.nodes} ({flow.nodes.length}):</span>
              <div className="flex items-center gap-1.5">
                {flow.nodes.map((node, i) => (
                  <FlowNodeBadge key={node.id} node={node} index={i} />
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
              <span className="text-[11px] text-muted-foreground">{F.lastRun}:</span>
              {flow.lastRunStatus === "never" ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <AlertCircle className="h-3 w-3" /> {F.neverRun}
                </span>
              ) : (
                <span className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  flow.lastRunStatus === "success" ? "text-secondary" : "text-red-400",
                )}>
                  {flow.lastRunStatus === "success" ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  {flow.lastRunStatus === "success" ? t.hermes.runs.success : t.hermes.runs.failed}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-600 dark:text-amber-400">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{F.engineOffline}</span>
        </div>
      </div>
    </div>
  );
}
