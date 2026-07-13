import { useState } from "react";
import { AlertCircle, CheckCircle2, Clock, Inbox, RotateCcw, XCircle } from "lucide-react";
import { useOutbox } from "@/lib/outbox/store";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";
import { alpha, SOURCE_COLORS } from "@/lib/color";
import type { MessageStatus } from "@/lib/outbox/types";
import { Button } from "@/components/ui/button";

type FilterTab = "all" | MessageStatus;

const STAT_ICONS: Record<MessageStatus, typeof Clock> = {
  pending: Clock,
  sent: CheckCircle2,
  failed: AlertCircle,
};

export default function Outbox() {
  const t = useT();
  const O = t.hermes.outbox;
  const { session } = useAuth();
  const { doc, counts, retry, cancel } = useOutbox();
  const [filter, setFilter] = useState<FilterTab>("all");

  const filtered = filter === "all" ? doc.messages : doc.messages.filter((m) => m.status === filter);

  if (!session) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <Inbox className="h-6 w-6" />
        </div>
        <div className="mt-6 text-[11px] uppercase tracking-[0.22em] text-secondary">{O.eyebrow}</div>
        <h1 className="font-display mt-2 text-3xl text-primary">{O.title}</h1>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">{O.guestEmpty}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="text-[11px] uppercase tracking-[0.22em] text-secondary">{O.eyebrow}</div>
        <h1 className="font-display mt-1.5 text-4xl text-primary">{O.title}</h1>
      </header>

      <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
        {(["all", "pending", "sent", "failed"] as const).map((tab) => {
          const Icon = tab !== "all" ? STAT_ICONS[tab] : null;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={cn(
                "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors",
                filter === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary",
              )}
            >
              {Icon && <Icon className="h-3 w-3" />}
              {tab === "all" ? "Todas" : O[tab]} ({tab === "all" ? doc.messages.length : counts[tab]})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="hermes-card flex flex-col items-center justify-center p-12 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">{O.noMessages}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((msg) => {
            const sourceColor = SOURCE_COLORS[msg.source] ?? "#5E6B77";
            return (
              <div key={msg.id} className="hermes-card flex items-start gap-4 p-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                      style={{ backgroundColor: alpha(sourceColor, "1A"), color: sourceColor, border: `1px solid ${alpha(sourceColor, "33")}` }}
                    >
                      {msg.source}
                    </span>
                    <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {msg.channel}
                    </span>
                    <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {msg.template}
                    </span>
                    <span className={cn(
                      "ml-auto flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider",
                      msg.status === "sent" && "text-secondary",
                      msg.status === "failed" && "text-red-400",
                      msg.status === "pending" && "text-amber-500",
                    )}>
                      {msg.status === "pending" && <Clock className="h-3 w-3" />}
                      {msg.status === "sent" && <CheckCircle2 className="h-3 w-3" />}
                      {msg.status === "failed" && <XCircle className="h-3 w-3" />}
                      {O[msg.status]}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-primary">{msg.subject}</span>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>{O.createdAt}: {new Date(msg.createdAt).toLocaleString()}</span>
                    {msg.sentAt && <span>{O.sentAt}: {new Date(msg.sentAt).toLocaleString()}</span>}
                  </div>
                  {msg.error && (
                    <div className="flex items-center gap-1 text-[11px] text-red-400">
                      <AlertCircle className="h-3 w-3" /> {msg.error}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  {msg.status === "failed" && (
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => retry(msg.id)}>
                      <RotateCcw className="mr-1 h-3 w-3" /> {O.retry}
                    </Button>
                  )}
                  {msg.status !== "sent" && (
                    <Button variant="outline" size="sm" className="h-7 text-xs text-red-400 hover:text-red-300" onClick={() => cancel(msg.id)}>
                      <XCircle className="mr-1 h-3 w-3" /> {O.cancel}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
