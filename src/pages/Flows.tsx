import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle, CheckCircle2, Clock, Code2, Database, Send, type LucideIcon,
} from "lucide-react";
import { loadFlowCatalog, flowBounds } from "@/lib/flows/catalog";
import { getLatestRun } from "@/lib/flows/service";
import { useFlowsDocument } from "@/lib/flows/store";
import type { FlowDefinition, FlowNode } from "@/lib/flows/types";
import { useT } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

const NODE_H = 44, PAD = 32, ICON_W = 40, CHAR_W = 7.2, NODE_PAD_X = 20;

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

/** Absolute-positioned nodes + gradient edges, straight from the committed
 *  n8n export (flows/*.json) — not an n8n iframe, not a hand-typed mock of
 *  what the flows look like. Node positions are n8n's own canvas coordinates.
 *  Node width is measured from the real name (not a fixed box) so labels
 *  never clip — the bug the first version of this diagram shipped with. */
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

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
      <defs>
        <linearGradient id={`edge-${flow.id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity="0.15" />
          <stop offset="50%" stopColor="hsl(var(--secondary))" stopOpacity="0.7" />
          <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      {flow.connections.map((c, i) => {
        const s = nodeById.get(c.source), t = nodeById.get(c.target);
        if (!s || !t) return null;
        const sp = at(s.position), tp = at(t.position);
        const x1 = sp.x + widths.get(s.id)!, y1 = sp.y + NODE_H / 2;
        const x2 = tp.x, y2 = tp.y + NODE_H / 2;
        const midX = (x1 + x2) / 2;
        return (
          <path
            key={i}
            d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
            fill="none"
            stroke={`url(#edge-${flow.id})`}
            strokeWidth={2}
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
  );
}

export default function Flows() {
  const t = useT();
  const F = t.hermes.flows;
  const navigate = useNavigate();
  const doc = useFlowsDocument();
  const catalog = useMemo(() => loadFlowCatalog(), []);

  return (
    <div className="space-y-6">
      <header>
        <div className="text-[11px] uppercase tracking-[0.22em] text-secondary">{F.eyebrow}</div>
        <h1 className="font-display mt-1.5 text-4xl text-primary">{F.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{F.subtitle}</p>
      </header>

      <div className="grid min-w-0 gap-6">
        {catalog.map((flow) => {
          const latest = getLatestRun(doc, flow.id);
          const status = latest?.status ?? null;
          return (
            <div
              key={flow.id}
              className="hermes-card min-w-0 cursor-pointer p-6 transition-colors hover:bg-card/80"
              onClick={() => navigate(`/runs?flow=${flow.id}`)}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg text-primary">{flow.name}</h2>
                  <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">{flow.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">{F.trigger}:</span>
                  <span className="rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] text-primary">{flow.trigger}</span>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <FlowDiagram flow={flow} />
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                <span className="text-[11px] text-muted-foreground">{F.lastRun}:</span>
                {!status ? (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <AlertCircle className="h-3 w-3" /> {F.neverRun}
                  </span>
                ) : (
                  <span className={cn("flex items-center gap-1 text-xs font-medium", status === "success" ? "text-secondary" : "text-red-400")}>
                    {status === "success" ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    {status === "success" ? t.hermes.runs.success : t.hermes.runs.failed}
                  </span>
                )}
              </div>
            </div>
          );
        })}
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
