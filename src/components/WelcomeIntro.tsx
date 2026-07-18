import { useEffect, useState } from "react";
import { Inbox, Radio, Sparkles, Workflow, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dismissDemoPrompt, hasRealData, loadDemoData, shouldShowDemoPrompt } from "@/lib/demo/generator";
import { useT } from "@/lib/i18n/I18nProvider";

const CONCEPT_ICONS = [Inbox, Workflow, Radio, Sparkles];

/** Welcome / "how this works" explainer — shown automatically on first
 *  visit with no data (was DemoPrompt's whole job), and re-openable any
 *  time from the topbar's "Como funciona" button, controlled via `open`/
 *  `onOpenChange`.
 *
 *  Grew out of DemoPrompt because a bare "load demo data or start fresh"
 *  choice, with no explanation of what an outbox/flow/channel even is,
 *  is exactly the "complex and unintuitive for the end user" gap flagged
 *  after the Flows/Topbar redesign — Hermes is the most backend-flavored
 *  app in the suite (outbox, flows, n8n, edge functions), and a visitor
 *  landing on it has no reason to already know that vocabulary. The
 *  concept cards below exist to translate it before showing any data.
 *
 *  The demo/fresh-start choice only shows when there's no real data yet —
 *  reopening this from the topbar after an account already has messages
 *  must never re-offer "load demo data", since that would silently
 *  overwrite it. */
export default function WelcomeIntro({ open, onOpenChange }: { open?: boolean; onOpenChange?: (open: boolean) => void } = {}) {
  const t = useT();
  const I = t.hermes.intro;
  const L = t.hermes.demo;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (shouldShowDemoPrompt()) setVisible(true);
  }, []);

  useEffect(() => {
    if (open) setVisible(true);
  }, [open]);

  if (!visible) return null;

  function close() {
    setVisible(false);
    onOpenChange?.(false);
  }

  function loadDemo() {
    loadDemoData();
    window.location.reload();
  }

  function startFresh() {
    dismissDemoPrompt();
    close();
  }

  const offerDemoChoice = !hasRealData();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="hermes-card w-full max-w-lg space-y-5 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary/20">
              <Sparkles className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <h2 className="font-display text-lg text-primary">{I.title}</h2>
            </div>
          </div>
          <button onClick={close} className="text-muted-foreground transition-colors hover:text-primary" aria-label={I.continueLabel}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">{I.lead}</p>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {I.concepts.map((c, i) => {
            const Icon = CONCEPT_ICONS[i];
            return (
              <div key={c.title} className="flex items-start gap-2.5 rounded-lg border border-border bg-background/40 p-3">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-secondary/10">
                  <Icon className="h-3.5 w-3.5 text-secondary" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-primary">{c.title}</div>
                  <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{c.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        {offerDemoChoice ? (
          <div>
            <p className="mb-3 text-sm text-muted-foreground">{L.description}</p>
            <div className="flex gap-2">
              <Button onClick={loadDemo} className="flex-1 bg-primary text-primary-foreground hover:bg-primary-deep">
                <Sparkles className="mr-2 h-4 w-4" /> {L.loadDemo}
              </Button>
              <Button variant="outline" onClick={startFresh}>{L.startFresh}</Button>
            </div>
          </div>
        ) : (
          <Button onClick={close} className="w-full bg-primary text-primary-foreground hover:bg-primary-deep">
            {I.continueLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
