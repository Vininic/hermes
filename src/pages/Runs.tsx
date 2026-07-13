import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { useT } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

const SAMPLE_RUNS = [
  { id: "1", flowName: "Outbox Consumer", status: "success" as const, startedAt: new Date(Date.now() - 2 * 60000).toISOString(), durationMs: 1200, messageCount: 3 },
  { id: "2", flowName: "Outbox Consumer", status: "success" as const, startedAt: new Date(Date.now() - 4 * 60000).toISOString(), durationMs: 800, messageCount: 1 },
  { id: "3", flowName: "Heartbeat", status: "success" as const, startedAt: new Date(Date.now() - 5 * 60000).toISOString(), durationMs: 400, messageCount: 0 },
];

export default function Runs() {
  const t = useT();
  const R = t.hermes.runs;

  return (
    <div className="space-y-6">
      <header>
        <div className="text-[11px] uppercase tracking-[0.22em] text-secondary">{R.eyebrow}</div>
        <h1 className="font-display mt-1.5 text-4xl text-primary">{R.title}</h1>
      </header>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-600 dark:text-amber-400">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{R.engineOffline}</span>
        </div>
      </div>

      {SAMPLE_RUNS.length === 0 ? (
        <div className="hermes-card flex flex-col items-center justify-center p-12 text-center">
          <Clock className="h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">{R.noRuns}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card/50">
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{R.flowName}</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{R.status}</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{R.startedAt}</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{R.duration}</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{R.messagesCount}</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_RUNS.map((run) => (
                <tr key={run.id} className="border-b border-border last:border-0 hover:bg-card/30">
                  <td className="px-4 py-3 font-medium text-primary">{run.flowName}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center gap-1 text-xs font-medium",
                      run.status === "success" ? "text-secondary" : "text-red-400",
                    )}>
                      {run.status === "success" ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      {R[run.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(run.startedAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground">{(run.durationMs / 1000).toFixed(1)}s</td>
                  <td className="px-4 py-3 text-muted-foreground">{run.messageCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
