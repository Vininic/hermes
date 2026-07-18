import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Activity, CircleHelp, Inbox, LayoutDashboard, Search, Send, Settings2, Sparkles, Workflow } from "lucide-react";
import { HermesMark } from "@/components/HermesLogo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { useOutbox } from "@/lib/outbox/store";
import { useSendTest } from "@/lib/channels/useSendTest";
import { CHANNEL_DEFINITIONS } from "@/lib/channels/types";
import { loadFlowCatalog } from "@/lib/flows/catalog";
import { useT } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

type SearchResult = { id: string; kind: "outbox" | "flow"; label: string; sub: string };

/** Global omnibox — a local, in-memory substring filter over already-loaded
 *  outbox messages + the flow catalog, same shape as Chronos' Topbar search
 *  (useMemo'd filter, capped result counts, dropdown closed by an
 *  outside-click listener, selecting a result just navigates to the
 *  relevant section rather than deep-linking to the exact item). */
function TopbarSearch() {
  const t = useT();
  const nav = t.hermes.nav;
  const navigate = useNavigate();
  const { doc } = useOutbox();
  const flowCatalog = useMemo(() => loadFlowCatalog(), []);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const results = useMemo<SearchResult[]>(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const messages = doc.messages
      .filter((m) => m.subject.toLowerCase().includes(term) || m.source.includes(term) || m.channel.includes(term) || m.template.includes(term))
      .slice(0, 5)
      .map((m) => ({ id: m.id, kind: "outbox" as const, label: m.subject, sub: `${m.source} · ${m.channel}` }));
    const flows = flowCatalog
      .filter((f) => f.name.toLowerCase().includes(term) || f.description.toLowerCase().includes(term))
      .slice(0, 3)
      .map((f) => ({ id: f.id, kind: "flow" as const, label: f.name, sub: f.trigger }));
    return [...messages, ...flows];
  }, [q, doc.messages, flowCatalog]);

  function go(r: SearchResult) {
    setOpen(false);
    setQ("");
    if (r.kind === "outbox") navigate("/outbox");
    else navigate(`/runs?flow=${r.id}`);
  }

  return (
    <div ref={ref} className="relative hidden max-w-xs flex-1 md:block">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => q && setOpen(true)}
        placeholder={t.common.searchPlaceholder}
        aria-label={t.common.search}
        className="h-8 border-border bg-background/60 pl-8 text-xs"
      />
      {open && q.trim() !== "" && (
        <div className="absolute left-0 top-full z-20 mt-1.5 w-72 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-elevated">
          {results.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">{t.common.noResults}</div>
          ) : (
            results.map((r) => (
              <button
                key={`${r.kind}-${r.id}`}
                type="button"
                onClick={() => go(r)}
                className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors hover:bg-accent/50"
              >
                <span className="truncate text-xs font-medium text-primary">{r.label}</span>
                <span className="text-[10px] text-muted-foreground">{r.kind === "outbox" ? nav.outbox : nav.flows} · {r.sub}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** Delivery health readout — Kairos' board-progress-in-topbar pattern
 *  (a done/total fraction next to a bar), applied to the suite-wide stat
 *  that's actually meaningful for Hermes on every page: how much of the
 *  queue has actually been delivered. Plain CSS bar, matching every other
 *  bar already built for the Dashboard — no Radix Progress here. */
function DeliveryProgress() {
  const t = useT();
  const { doc, counts } = useOutbox();
  if (doc.messages.length === 0) return null;
  const pct = Math.round((counts.sent / doc.messages.length) * 100);
  return (
    <span className="num hidden shrink-0 items-center gap-2.5 text-xs text-muted-foreground lg:flex">
      <span>{counts.sent}/{doc.messages.length}</span>
      <span
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t.common.percentComplete(pct)}
        className="h-1.5 w-24 overflow-hidden rounded-full bg-muted/40"
      >
        <span className="block h-full rounded-full bg-secondary transition-all" style={{ width: `${pct}%` }} />
      </span>
    </span>
  );
}

/** Quick-send — Chronos' "new block" pattern (an always-visible primary
 *  button opening a modal, no navigation), applied to the one write action
 *  that makes sense from anywhere in Hermes: firing a test message without
 *  detouring to the Channels page. */
function QuickTestDialog() {
  const t = useT();
  const C = t.hermes.channels;
  const { sending, sendTest } = useSendTest();
  const [open, setOpen] = useState(false);

  async function handle(kind: (typeof CHANNEL_DEFINITIONS)[number]["kind"]) {
    const ok = await sendTest(kind);
    toast(ok ? C.testSent : C.testFailed);
    if (ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="hidden h-8 gap-1.5 text-xs md:flex">
          <Send className="h-3.5 w-3.5" /> {C.testSend}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{C.testSend}</DialogTitle>
          <DialogDescription>{C.testSendDesc}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {CHANNEL_DEFINITIONS.map((ch) => (
            <Button
              key={ch.kind}
              variant="outline"
              className="w-full justify-start gap-2 text-sm"
              disabled={sending === ch.kind}
              onClick={() => handle(ch.kind)}
            >
              <Send className="h-3.5 w-3.5" />
              {sending === ch.kind ? "…" : ch.label}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Suite-style persistent top bar — mirrors Chronos'/Kairos' Topbar placement
 *  convention (language/theme controls live here on every page, never the
 *  sidebar), and now actually earns its keep the same way they do: a global
 *  search (Chronos), a delivery-progress readout (Kairos' board-progress
 *  pattern), and an always-available quick action (Chronos' "new block"
 *  dialog) — not just the two toggles it shipped with. */
export default function Topbar() {
  const location = useLocation();
  const t = useT();
  const nav = t.hermes.nav;

  const crumb =
    location.pathname === "/dashboard" ? { icon: LayoutDashboard, label: nav.dashboard } :
    location.pathname === "/outbox" ? { icon: Inbox, label: nav.outbox } :
    location.pathname === "/flows" ? { icon: Workflow, label: nav.flows } :
    location.pathname === "/runs" ? { icon: Activity, label: nav.runs } :
    location.pathname === "/channels" ? { icon: Activity, label: nav.channels } :
    location.pathname === "/aetheris" ? { icon: Sparkles, label: nav.aetheris } :
    location.pathname === "/settings" ? { icon: Settings2, label: nav.settings } :
    location.pathname === "/about" ? { icon: CircleHelp, label: nav.about } :
    null;

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card/70 px-4 backdrop-blur lg:px-6">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-secondary md:hidden">
        <HermesMark className="h-3.5 w-3.5" /> Hermes
      </div>

      {crumb && (
        <div className={cn("hidden shrink-0 items-center gap-1.5 text-sm font-medium text-primary", "lg:flex")}>
          <crumb.icon className="h-3.5 w-3.5 text-secondary" /> {crumb.label}
        </div>
      )}

      <TopbarSearch />

      <div className="ml-auto flex items-center gap-3">
        <DeliveryProgress />
        <QuickTestDialog />
        <LanguageToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}
