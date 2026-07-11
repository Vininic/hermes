import { useState } from "react";
import { FileText, History, LayoutList, PanelRightClose, PanelRightOpen, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { HermesMark } from "@/components/HermesLogo";
import { useT } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

type Tab = "overview" | "digest" | "history";

/** Minimal chat shell for M0 — layout and composer only, no AI wiring yet.
 *  Shaped to SUITE-ARCHITECTURE.md §3a's converged Aetheris pattern (chat
 *  column + collapsible 280-320px right sidebar with Overview/Digest/History
 *  tabs) so the real chat, action vocabulary and history mechanism can slot
 *  in later without restructuring the page. See HERMES.md "Aetheris". */
export default function Aetheris() {
  const t = useT();
  const A = t.hermes.aetheris;
  const [draft, setDraft] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");

  function send() {
    if (!draft.trim()) return;
    toast(A.comingSoon);
    setDraft("");
  }

  const tabs: { id: Tab; label: string; icon: typeof LayoutList }[] = [
    { id: "overview", label: A.tabOverview, icon: LayoutList },
    { id: "digest", label: A.tabDigest, icon: FileText },
    { id: "history", label: A.tabHistory, icon: History },
  ];

  const tabEmpty: Record<Tab, string> = {
    overview: A.overviewEmpty,
    digest: A.digestEmpty,
    history: A.historyEmpty,
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="mb-4 flex shrink-0 items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-secondary">{A.eyebrow}</div>
          <h1 className="font-display mt-1 text-2xl text-primary">{A.title}</h1>
        </div>
        <button
          type="button"
          onClick={() => setSidebarOpen((o) => !o)}
          className="hidden h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:text-foreground lg:grid"
          aria-label={sidebarOpen ? A.tabHistory : A.tabOverview}
          title={sidebarOpen ? "Collapse" : "Expand"}
        >
          {sidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
        </button>
      </header>

      <div className="flex min-h-0 flex-1 gap-5">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-10 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">{A.emptyLead}</p>
            <div className="mt-6 flex max-w-lg flex-wrap justify-center gap-2">
              {A.suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setDraft(s)}
                  className="rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-secondary/40 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="shrink-0 border-t border-border p-3">
            <div className="flex items-end gap-2 rounded-lg border border-border bg-surface-raised p-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={A.placeholder}
                rows={1}
                className="min-h-[2.5rem] flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
              <Button type="button" size="icon" className="h-9 w-9 shrink-0" onClick={send} aria-label={A.send}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <aside className={cn("hidden w-72 shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card lg:w-80", sidebarOpen && "lg:flex")}>
          <div className="flex shrink-0 border-b border-border">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-2.5 text-xs font-medium transition-colors",
                  tab === id ? "border-secondary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
          <div className="flex flex-1 items-center justify-center p-6 text-center">
            <div>
              <HermesMark className="mx-auto h-6 w-6 text-secondary/50" />
              <p className="mt-3 text-xs text-muted-foreground">{tabEmpty[tab]}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
