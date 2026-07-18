import { AlertCircle, CheckCircle2, Clock, Inbox, Radio, Workflow } from "lucide-react";
import { format } from "date-fns";
import { useOutbox } from "@/lib/outbox/store";
import { getEngineStatus } from "@/lib/flows/service";
import { useFlowsDocument } from "@/lib/flows/store";
import { CHANNEL_DEFINITIONS } from "@/lib/channels/types";
import { SOURCE_COLORS, alpha } from "@/lib/color";
import type { OutboxMessage, MessageSource } from "@/lib/outbox/types";
import { useT } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

/** Buckets messages into one count per day, most-recent day last, using
 *  `dateOf(m)` as the day to attribute each message to. Shared by the
 *  per-stat sparklines (7 days) and the full volume chart (14 days) so
 *  "trend" always means the same thing across the page. */
function bucketsByDay(messages: OutboxMessage[], days: number, dateOf: (m: OutboxMessage) => string): number[] {
  const buckets = new Array(days).fill(0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const m of messages) {
    const d = new Date(dateOf(m));
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
    if (diff >= 0 && diff < days) buckets[days - 1 - diff] += 1;
  }
  return buckets;
}

function lastNDates(n: number): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: n }, (_, i) => new Date(today.getTime() - (n - 1 - i) * 86400000));
}

/** A tiny 7-bar trend, colored to match its stat card — this is what fills
 *  the dead space every stat card used to have to the right of its number. */
function Sparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(1, ...values);
  const w = 60, h = 26, barW = w / values.length;
  return (
    <svg width={w} height={h} className="shrink-0" aria-hidden="true">
      {values.map((v, i) => {
        const barH = Math.max(2, (v / max) * h);
        return (
          <rect
            key={i}
            x={i * barW + 1.5}
            y={h - barH}
            width={Math.max(1.5, barW - 3)}
            height={barH}
            rx={1}
            fill={color}
            opacity={v === 0 ? 0.15 : 0.85}
          />
        );
      })}
    </svg>
  );
}

function StatCard({
  icon: Icon, label, value, iconClass, sparkColor, trend,
}: {
  icon: typeof Clock; label: string; value: string | number; iconClass?: string; sparkColor: string; trend: number[];
}) {
  return (
    <div className="hermes-card flex items-center justify-between gap-3 p-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10", iconClass)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 leading-tight">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
          <div className="font-display num text-xl text-primary">{value}</div>
        </div>
      </div>
      <Sparkline values={trend} color={sparkColor} />
    </div>
  );
}

/** Full-width 14-day area chart of total message volume — real data, no
 *  charting library. Draws flat-at-baseline (not blank) when there's no
 *  activity, with an explicit empty-state label over it. */
function VolumeChart({ values, dates, emptyLabel }: { values: number[]; dates: Date[]; emptyLabel: string }) {
  const width = 800, height = 180, padTop = 14, padBottom = 26, padX = 6;
  const max = Math.max(1, ...values);
  const innerH = height - padTop - padBottom;
  const stepX = (width - padX * 2) / Math.max(1, values.length - 1);
  const points = values.map((v, i) => ({ x: padX + i * stepX, y: padTop + innerH - (v / max) * innerH }));
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const baseline = height - padBottom;
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${baseline} L ${points[0].x.toFixed(1)} ${baseline} Z`;
  const isEmpty = values.every((v) => v === 0);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full" aria-hidden="true">
        <defs>
          <linearGradient id="hermes-volume-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity="0.35" />
            <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={padX} y1={baseline} x2={width - padX} y2={baseline} stroke="hsl(var(--border))" strokeWidth={1} />
        <path d={areaPath} fill="url(#hermes-volume-fill)" />
        <path d={linePath} fill="none" stroke="hsl(var(--secondary))" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={values[i] > 0 ? 3 : 0} fill="hsl(var(--secondary))" />
        ))}
        {dates.map((d, i) => (
          i % 2 === 0 ? (
            <text key={i} x={points[i].x} y={height - 8} fontSize={11} textAnchor="middle" fill="hsl(var(--muted-foreground))">
              {format(d, "dd/MM")}
            </text>
          ) : null
        ))}
      </svg>
      {isEmpty && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center pb-6">
          <span className="text-sm text-muted-foreground">{emptyLabel}</span>
        </div>
      )}
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

  const pendingTrend = bucketsByDay(doc.messages.filter((m) => m.status === "pending"), 7, (m) => m.createdAt);
  const sentTrend = bucketsByDay(doc.messages.filter((m) => m.status === "sent"), 7, (m) => m.sentAt ?? m.createdAt);
  const failedTrend = bucketsByDay(doc.messages.filter((m) => m.status === "failed"), 7, (m) => m.sentAt ?? m.createdAt);
  const totalTrend7 = bucketsByDay(doc.messages, 7, (m) => m.createdAt);
  const totalTrend14 = bucketsByDay(doc.messages, 14, (m) => m.createdAt);
  const dates14 = lastNDates(14);

  const recent = doc.messages.filter((m) => m.status !== "pending").slice(0, 6);

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
        <StatCard icon={Clock} label={D.pending} value={counts.pending} iconClass="text-amber-500" sparkColor="#F59E0B" trend={pendingTrend} />
        <StatCard icon={CheckCircle2} label={D.sent} value={counts.sent} iconClass="text-secondary" sparkColor="hsl(var(--secondary))" trend={sentTrend} />
        <StatCard icon={AlertCircle} label={D.failed} value={counts.failed} iconClass="text-red-400" sparkColor="#F87171" trend={failedTrend} />
        <StatCard icon={Inbox} label={D.pendingCount} value={doc.messages.length} sparkColor="hsl(var(--primary))" trend={totalTrend7} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="hermes-card flex flex-col p-5">
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

          <div className="mt-5 border-t border-border pt-4">
            <div className="mb-2.5 flex items-center gap-2">
              <Radio className="h-3.5 w-3.5 text-secondary" />
              <span className="text-xs text-muted-foreground">{D.channelHealth}</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {CHANNEL_DEFINITIONS.map((ch) => {
                const sentCount = doc.messages.filter((m) => m.channel === ch.kind && m.status === "sent").length;
                return (
                  <div key={ch.kind} className="flex items-center gap-2.5 rounded-lg border border-border bg-background/40 px-3 py-2">
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", ch.configured ? "bg-secondary" : "bg-amber-500")} />
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="truncate text-xs font-medium text-primary">{ch.label}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {ch.configured ? `${sentCount} ${D.delivered}` : t.hermes.channels.notConfigured}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="hermes-card flex flex-col p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Workflow className="h-4 w-4 text-secondary" />
              <h2 className="text-sm font-medium text-primary">{D.recentRuns}</h2>
            </div>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.hermes.runs.noRuns}</p>
          ) : (
            <div className="space-y-2">
              {recent.map((m) => {
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

      <section className="hermes-card p-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Workflow className="h-4 w-4 text-secondary" />
            <h2 className="text-sm font-medium text-primary">{D.volumeTitle}</h2>
          </div>
          <span className="text-[11px] text-muted-foreground">{D.last14days}</span>
        </div>
        <VolumeChart values={totalTrend14} dates={dates14} emptyLabel={D.noActivity} />
      </section>
    </div>
  );
}
