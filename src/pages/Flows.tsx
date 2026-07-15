import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { loadFlowCatalog, flowBounds } from "@/lib/flows/catalog";
import { getLatestRun } from "@/lib/flows/service";
import { useFlowsDocument } from "@/lib/flows/store";
import type { FlowDefinition } from "@/lib/flows/types";
import { useT } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

const NODE_W = 148, NODE_H = 40, PAD = 32;

/** Absolute-positioned nodes + gradient edges, straight from the committed
 *  n8n export (flows/*.json) — not an n8n iframe, not a hand-typed mock of
 *  what the flows look like. Node positions are n8n's own canvas coordinates. */
function FlowDiagram({ flow }: { flow: FlowDefinition }) {
  const bounds = flowBounds(flow);
  const width = bounds.maxX - bounds.minX + NODE_W + PAD * 2;
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
        const x1 = sp.x + NODE_W, y1 = sp.y + NODE_H / 2;
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
      {flow.nodes.map((n, i) => {
        const p = at(n.position);
        return (
          <g key={n.id}>
            <rect x={p.x} y={p.y} width={NODE_W} height={NODE_H} rx={6} fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth={1.5} />
            <circle cx={p.x + 18} cy={p.y + NODE_H / 2} r={9} fill="hsl(var(--secondary) / 0.12)" />
            <text x={p.x + 18} y={p.y + NODE_H / 2 + 4} fontSize={10} fill="hsl(var(--secondary))" textAnchor="middle" fontWeight={600}>{i + 1}</text>
            <text x={p.x + 34} y={p.y + NODE_H / 2 + 4} fontSize={12} fill="hsl(var(--foreground))">{n.name}</text>
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
