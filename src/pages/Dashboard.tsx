import { AlertCircle, CheckCircle2, Clock, Inbox, Radio, Workflow } from "lucide-react";
import { useOutbox } from "@/lib/outbox/store";
import { getEngineStatus } from "@/lib/flows/service";
import { useFlowsDocument } from "@/lib/flows/store";
import { CHANNEL_DEFINITIONS } from "@/lib/channels/types";
import { SOURCE_COLORS, alpha } from "@/lib/color";
import type { MessageSource } from "@/lib/outbox/types";
import { useT } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Clock; label: string; value: string | number; color?: string }) {
  return (
    <div className="hermes-card flex items-center gap-3 p-3.5">
      <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10", color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 leading-tight">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
        <div className="font-display num text-xl text-primary">{value}</div>
      </div>
    </div>
  );
}

const SOURCE_LABELS: Record<MessageSource, string> = {
  pluto: "Pluto", chronos: "Chronos", kairos: "Kairos", chiron: "Chiron", hermes: "Hermes",
};

export default function Dashboard() {
  const t = useT();
  const D = t.hermes.dashboard;
  const { doc, counts } = useOutbox();
  const flowsDoc = useFlowsDocument();
  const engineStatus = getEngineStatus(flowsDoc);

  const bySource = (Object.keys(SOURCE_LABELS) as MessageSource[])
    .map((source) => ({ source, count: doc.messages.filter((m) => m.source === source).length }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);
  const maxCount = Math.max(1, ...bySource.map((s) => s.count));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-secondary">{D.eyebrow}</div>
          <h1 className="font-display mt-1.5 text-4xl text-primary">{D.title}</h1>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs">
          <span className={cn("h-2 w-2 rounded-full", engineStatus.online ? "bg-secondary" : "bg-red-400")} />
          <span className="text-primary">{engineStatus.online ? D.engineOnline : D.engineOffline}</span>
          {engineStatus.lastSeenAgo && <span className="text-muted-foreground">· {D.lastSeen} {engineStatus.lastSeenAgo}</span>}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Clock} label={D.pending} value={counts.pending} color="text-amber-500" />
        <StatCard icon={CheckCircle2} label={D.sent} value={counts.sent} color="text-secondary" />
        <StatCard icon={AlertCircle} label={D.failed} value={counts.failed} color="text-red-400" />
        <StatCard icon={Inbox} label={D.pendingCount} value={doc.messages.length} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="hermes-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Workflow className="h-4 w-4 text-secondary" />
            <h2 className="text-sm font-medium text-primary">{D.bySource}</h2>
          </div>
          {bySource.length === 0 ? (
            <p className="text-sm text-muted-foreground">{D.pendingCount}: 0</p>
          ) : (
            <div className="space-y-2.5">
              {bySource.map(({ source, count }) => (
                <div key={source} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-xs text-muted-foreground">{SOURCE_LABELS[source]}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/30">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(count / maxCount) * 100}%`, backgroundColor: SOURCE_COLORS[source] }}
                    />
                  </div>
                  <span className="num w-6 shrink-0 text-right text-xs text-primary">{count}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 flex items-center gap-2 border-t border-border pt-4">
            <Radio className="h-3.5 w-3.5 text-secondary" />
            <span className="text-xs text-muted-foreground">{D.channelHealth}:</span>
            <div className="flex flex-wrap gap-1.5">
              {CHANNEL_DEFINITIONS.map((ch) => (
                <span key={ch.kind} className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px] text-muted-foreground">
                  {ch.label}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="hermes-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Workflow className="h-4 w-4 text-secondary" />
            <h2 className="text-sm font-medium text-primary">{D.recentRuns}</h2>
          </div>
          {doc.messages.filter((m) => m.status !== "pending").length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.hermes.runs.noRuns}</p>
          ) : (
            <div className="space-y-2">
              {doc.messages.filter((m) => m.status !== "pending").slice(0, 6).map((m) => {
                const color = SOURCE_COLORS[m.source] ?? "#5E6B77";
                return (
                  <div key={m.id} className="flex items-center gap-2.5 rounded-md border border-border px-3 py-2 text-sm">
                    <span
                      className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                      style={{ backgroundColor: alpha(color, "1A"), color }}
                    >
                      {m.source}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-primary">{m.subject}</span>
                    <span className={cn(
                      "shrink-0 text-xs",
                      m.status === "sent" ? "text-secondary" : "text-red-400",
                    )}>
                      {m.status === "sent" ? D.sent : D.failed}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
