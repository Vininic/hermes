import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle, CalendarClock, CheckCircle2, Clock, Code2, Database, Radio, Send, type LucideIcon,
} from "lucide-react";
import { format } from "date-fns";
import { loadFlowCatalog, flowBounds } from "@/lib/flows/catalog";
import { getLatestRun } from "@/lib/flows/service";
import { useFlowsDocument } from "@/lib/flows/store";
import type { FlowDefinition, FlowNode, RunRecord } from "@/lib/flows/types";
import { Button } from "@/components/ui/button";
import { alpha } from "@/lib/color";
import { useT } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

const NODE_H = 44, PAD = 32, ICON_W = 40, CHAR_W = 7.2, NODE_PAD_X = 20;

// A distinct color + icon per flow (not per node) — the overview grid and the
// selected-flow header both key off this so a flow reads as the same thing
// wherever it appears.
const FLOW_ACCENT: Record<string, { icon: LucideIcon; color: string }> = {
  heartbeat: { icon: Radio, color: "#C49A3A" },
  "outbox-consumer": { icon: Send, color: "#4A8AB5" },
  "monthly-report": { icon: CalendarClock, color: "#7D4E8C" },
};
const DEFAULT_FLOW_ACCENT = { icon: Code2, color: "#5E6B77" };

function statusDotClass(status: RunRecord["status"] | null): string {
  if (status === "success") return "bg-secondary";
  if (status === "failed") return "bg-red-400";
  return "bg-muted-foreground/40";
}

// n8n node "type" strings, mapped to a real icon + a suite-palette color —
// so a trigger/data-source/logic/send step reads as different at a glance,
// matching the colored-icon-box language Chronos' own block cards use.
const NODE_KIND: Record<string, { icon: LucideIcon; color: string }> = {
  "n8n-nodes-base.scheduleTrigger": { icon: Clock, color: "#C49A3A" },   // Ochre — trigger
  "n8n-nodes-base.supabase": { icon: Database, color: "#3E8A80" },       // Verdigris — data
  "n8n-nodes-base.code": { icon: Code2, color: "#7D4E8C" },              // Plum — logic
  "n8n-nodes-base.httpRequest": { icon: Send, color: "#4A8AB5" },        // Sky — outbound call
};
const DEFAULT_KIND = { icon: Code2, color: "#5E6B77" };

function nodeWidth(n: FlowNode): number {
  return Math.max(160, ICON_W + n.name.length * CHAR_W + NODE_PAD_X * 2);
}

/** A small abstract "shape of the pipeline" thumbnail — real node positions
 *  and connections from the flow, normalized into a fixed 140×44 box and
 *  drawn as dots + curves with no text (text at this scale is just mush).
 *  This is what makes the overview cards read as template cards instead of
 *  icon+label rows: every card's glyph is visually distinct because the
 *  underlying flow shapes are actually different. */
function FlowGlyph({ flow, color }: { flow: FlowDefinition; color: string }) {
  const bounds = flowBounds(flow);
  const w = 140, h = 40, pad = 10;
  const spanX = Math.max(1, bounds.maxX - bounds.minX);
  const spanY = bounds.maxY - bounds.minY;
  const at = (pos: [number, number]) => ({
    x: pad + ((pos[0] - bounds.minX) / spanX) * (w - pad * 2),
    y: spanY === 0 ? h / 2 : pad + ((pos[1] - bounds.minY) / spanY) * (h - pad * 2),
  });
  const nodeById = new Map(flow.nodes.map((n) => [n.id, n]));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-10 w-full" aria-hidden="true">
      {flow.connections.map((c, i) => {
        const s = nodeById.get(c.source), t = nodeById.get(c.target);
        if (!s || !t) return null;
        const sp = at(s.position), tp = at(t.position);
        const midX = (sp.x + tp.x) / 2;
        return (
          <path
            key={i}
            d={`M ${sp.x} ${sp.y} C ${midX} ${sp.y}, ${midX} ${tp.y}, ${tp.x} ${tp.y}`}
            fill="none"
            stroke={color}
            strokeOpacity={0.4}
            strokeWidth={1.5}
          />
        );
      })}
      {flow.nodes.map((n) => {
        const p = at(n.position);
        return <circle key={n.id} cx={p.x} cy={p.y} r={4} fill={color} />;
      })}
    </svg>
  );
}

/** Absolute-positioned nodes + gradient, arrow-terminated edges over a
 *  dot-grid canvas texture, straight from the committed n8n export
 *  (flows/*.json) — not an n8n iframe, not a hand-typed mock. Node width is
 *  measured from the real name so labels never clip. */
function FlowDiagram({ flow }: { flow: FlowDefinition }) {
  const bounds = flowBounds(flow);
  const widths = new Map(flow.nodes.map((n) => [n.id, nodeWidth(n)]));
  const widestAtMaxX = Math.max(...flow.nodes.filter((n) => n.position[0] === bounds.maxX).map((n) => widths.get(n.id)!));
  const width = bounds.maxX - bounds.minX + widestAtMaxX + PAD * 2;
  const height = bounds.maxY - bounds.minY + NODE_H + PAD * 2;
  const at = (pos: [number, number]) => ({
    x: pos[0] - bounds.minX + PAD,
    y: pos[1] - bounds.minY + PAD,
  });
  const nodeById = new Map(flow.nodes.map((n) => [n.id, n]));
  const gradId = `edge-${flow.id}`, arrowId = `arrow-${flow.id}`;

  return (
    <div
      className="overflow-x-auto rounded-lg border border-border/70"
      style={{
        backgroundImage: "radial-gradient(hsl(var(--muted-foreground) / 0.22) 1px, transparent 1px)",
        backgroundSize: "16px 16px",
        backgroundColor: "hsl(var(--background) / 0.5)",
      }}
    >
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity="0.15" />
            <stop offset="50%" stopColor="hsl(var(--secondary))" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0.15" />
          </linearGradient>
          <marker id={arrowId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--secondary))" fillOpacity={0.8} />
          </marker>
        </defs>
        {flow.connections.map((c, i) => {
          const s = nodeById.get(c.source), t = nodeById.get(c.target);
          if (!s || !t) return null;
          const sp = at(s.position), tp = at(t.position);
          const x1 = sp.x + widths.get(s.id)!, y1 = sp.y + NODE_H / 2;
          const x2 = tp.x - 8, y2 = tp.y + NODE_H / 2;
          const midX = (x1 + x2) / 2;
          return (
            <path
              key={i}
              d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth={2}
              markerEnd={`url(#${arrowId})`}
            />
          );
        })}
        {flow.nodes.map((n) => {
          const p = at(n.position);
          const w = widths.get(n.id)!;
          const { icon: Icon, color } = NODE_KIND[n.type] ?? DEFAULT_KIND;
          return (
            <g key={n.id}>
              <rect x={p.x} y={p.y} width={w} height={NODE_H} rx={7} fill="hsl(var(--card))" stroke={color} strokeOpacity={0.4} strokeWidth={1.5} />
              <rect x={p.x} y={p.y} width={4} height={NODE_H} rx={2} fill={color} />
              <foreignObject x={p.x + 14} y={p.y + (NODE_H - 22) / 2} width={22} height={22}>
                <Icon size={16} color={color} strokeWidth={2} />
              </foreignObject>
              <text x={p.x + ICON_W} y={p.y + NODE_H / 2 + 4} fontSize={12.5} fontWeight={500} fill="hsl(var(--foreground))">{n.name}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function Flows() {
  const t = useT();
  const F = t.hermes.flows;
  const navigate = useNavigate();
  const doc = useFlowsDocument();
  const catalog = useMemo(() => loadFlowCatalog(), []);
  const [params, setParams] = useSearchParams();

  const selectedId = params.get("flow") && catalog.some((f) => f.id === params.get("flow")) ? params.get("flow")! : catalog[0]?.id;
  const selectedFlow = catalog.find((f) => f.id === selectedId) ?? null;
  const selectedLatest = selectedFlow ? getLatestRun(doc, selectedFlow.id) : undefined;
  const selectedStatus = selectedLatest?.status ?? null;
  const selectedAccent = selectedFlow ? (FLOW_ACCENT[selectedFlow.id] ?? DEFAULT_FLOW_ACCENT) : DEFAULT_FLOW_ACCENT;

  return (
    <div className="space-y-6">
      <header>
        <div className="text-[11px] uppercase tracking-[0.22em] text-secondary">{F.eyebrow}</div>
        <h1 className="font-display mt-1.5 text-4xl text-primary">{F.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{F.subtitle}</p>
      </header>

      {/* Overview: a real template gallery — a mini flow-shape glyph per
          card (not just icon+text), and an explicit selected state (colored
          ring matching the flow's accent) that drives which single diagram
          renders below. Clicking a card selects it in place; it no longer
          silently navigates away with zero visual feedback. */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{F.overview}</h2>
          <span className="text-[11px] text-muted-foreground">{F.overviewCount(catalog.length)}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.map((flow) => {
            const latest = getLatestRun(doc, flow.id);
            const status = latest?.status ?? null;
            const { icon: Icon, color } = FLOW_ACCENT[flow.id] ?? DEFAULT_FLOW_ACCENT;
            const isSelected = flow.id === selectedId;
            return (
              <button
                key={flow.id}
                type="button"
                onClick={() => setParams({ flow: flow.id })}
                className={cn(
                  "hermes-card flex flex-col gap-3 p-4 text-left transition-all",
                  !isSelected && "hover:bg-card/80",
                )}
                style={isSelected ? { boxShadow: `0 0 0 2px ${color}, var(--shadow-elevated)` } : undefined}
                aria-pressed={isSelected}
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ backgroundColor: alpha(color, "1A") }}>
                    <Icon className="h-4.5 w-4.5" style={{ color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-primary">{flow.name}</span>
                      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", statusDotClass(status))} title={status ?? F.neverRun} />
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">{flow.trigger}</div>
                  </div>
                </div>
                <FlowGlyph flow={flow} color={color} />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{flow.nodes.length} {F.nodes}</span>
                  <span className="truncate">{latest ? format(new Date(latest.startedAt), "dd/MM HH:mm") : F.neverRun}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {selectedFlow && (
        <section className="hermes-card min-w-0 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ backgroundColor: alpha(selectedAccent.color, "1A") }}>
                <selectedAccent.icon className="h-5 w-5" style={{ color: selectedAccent.color }} />
              </div>
              <div>
                <h2 className="font-display text-lg text-primary">{selectedFlow.name}</h2>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">{selectedFlow.description}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] text-primary">{selectedFlow.trigger}</span>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate(`/runs?flow=${selectedFlow.id}`)}>
                {F.viewRuns}
              </Button>
            </div>
          </div>

          <div className="mt-4">
            <FlowDiagram flow={selectedFlow} />
          </div>

          <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
            <span className="text-[11px] text-muted-foreground">{F.lastRun}:</span>
            {!selectedStatus ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <AlertCircle className="h-3 w-3" /> {F.neverRun}
              </span>
            ) : (
              <span className={cn("flex items-center gap-1 text-xs font-medium", selectedStatus === "success" ? "text-secondary" : "text-red-400")}>
                {selectedStatus === "success" ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                {selectedStatus === "success" ? t.hermes.runs.success : t.hermes.runs.failed}
              </span>
            )}
          </div>
        </section>
      )}

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-600 dark:text-amber-400">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{F.engineOffline}</span>
        </div>
      </div>
    </div>
  );
}
