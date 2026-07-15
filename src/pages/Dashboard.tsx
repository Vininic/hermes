import { Activity, AlertCircle, CheckCircle2, Clock, Inbox, Radio, Workflow } from "lucide-react";
import { useOutbox } from "@/lib/outbox/store";
import { getEngineStatus } from "@/lib/flows/service";
import { useFlowsDocument } from "@/lib/flows/store";
import { CHANNEL_DEFINITIONS } from "@/lib/channels/types";
import { useT } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Activity; label: string; value: string | number; color?: string }) {
  return (
    <div className="hermes-card flex items-start gap-4 p-5">
      <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10", color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
        <div className="font-display mt-1 text-2xl text-primary">{value}</div>
      </div>
    </div>
  );
}

function ChannelChip({ name, configured }: { name: string; configured: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium",
      configured ? "bg-secondary/10 text-secondary" : "bg-muted/30 text-muted-foreground",
    )}>
      <span className={cn("h-2 w-2 rounded-full", configured ? "bg-secondary" : "bg-muted-foreground/40")} />
      {name}
    </div>
  );
}

export default function Dashboard() {
  const t = useT();
  const D = t.hermes.dashboard;
  const { doc, counts } = useOutbox();
  const flowsDoc = useFlowsDocument();
  const engineStatus = getEngineStatus(flowsDoc);

  return (
    <div className="space-y-6">
      <header>
        <div className="text-[11px] uppercase tracking-[0.22em] text-secondary">{D.eyebrow}</div>
        <h1 className="font-display mt-1.5 text-4xl text-primary">{D.title}</h1>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={Clock} label={D.pending} value={counts.pending} color="text-amber-500" />
        <StatCard icon={CheckCircle2} label={D.sent} value={counts.sent} color="text-secondary" />
        <StatCard icon={AlertCircle} label={D.failed} value={counts.failed} color="text-red-400" />
        <StatCard icon={Inbox} label={D.pendingCount} value={doc.messages.length} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="hermes-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Radio className="h-4 w-4 text-secondary" />
            <h2 className="text-sm font-medium text-primary">{D.channelHealth}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {CHANNEL_DEFINITIONS.map((ch) => (
              <ChannelChip key={ch.kind} name={ch.label} configured={ch.configured} />
            ))}
          </div>
        </section>

        <section className="hermes-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-secondary" />
            <h2 className="text-sm font-medium text-primary">{D.engineStatus}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn("h-3 w-3 rounded-full", engineStatus.online ? "bg-secondary" : "bg-red-400")} />
            <span className="text-sm text-primary">{engineStatus.online ? D.engineOnline : D.engineOffline}</span>
            {engineStatus.lastSeenAgo && (
              <span className="text-xs text-muted-foreground">({D.lastSeen}: {engineStatus.lastSeenAgo})</span>
            )}
          </div>
        </section>
      </div>

      <section className="hermes-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Workflow className="h-4 w-4 text-secondary" />
          <h2 className="text-sm font-medium text-primary">{D.recentRuns}</h2>
        </div>
        {doc.messages.filter((m) => m.status !== "pending").length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.hermes.runs.noRuns}</p>
        ) : (
          <div className="space-y-2">
            {doc.messages.filter((m) => m.status !== "pending").slice(0, 5).map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span className="truncate text-primary">{m.subject}</span>
                <span className={cn(
                  "shrink-0 text-xs",
                  m.status === "sent" ? "text-secondary" : "text-red-400",
                )}>
                  {m.status === "sent" ? D.sent : D.failed}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
