import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Cloud, LogOut, MonitorSmartphone, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { useOutbox } from "@/lib/outbox/store";
import { useT } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** A single-profile snapshot — no carousel/multi-slot switching: the suite
 *  account is one identity, and this dialog is its one home. Mirrors
 *  Pluto's `ProfileDialog.tsx` shape: identity + 3 domain stat tiles + sign-out. */
export default function ProfileDialog({ open, onOpenChange }: Props) {
  const { session, signOut, updateName } = useAuth();
  const { counts } = useOutbox();
  const navigate = useNavigate();
  const t = useT();
  const L = t.hermes.outbox;

  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const cloud = !!session?.email;

  function startEditing() {
    setNameDraft(session?.name ?? "");
    setEditing(true);
  }
  function saveName() {
    const trimmed = nameDraft.trim();
    if (trimmed) void updateName(trimmed);
    setEditing(false);
  }

  if (!session) return null;
  const initial = session.name.trim().charAt(0).toUpperCase() || "H";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
        <div className="p-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="font-display grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cyan text-base font-semibold text-primary-deep">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              {editing ? (
                <div className="flex items-center gap-1.5">
                  <input
                    autoFocus
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditing(false); }}
                    className="w-36 rounded border border-sidebar-border bg-sidebar-accent/60 px-2 py-0.5 font-display text-sm text-sidebar-accent-foreground outline-none"
                  />
                  <button onClick={saveName} className="p-0.5 text-secondary hover:text-secondary/80"><Check className="h-3 w-3" /></button>
                  <button onClick={() => setEditing(false)} className="p-0.5 text-sidebar-foreground/50 hover:text-sidebar-foreground/80"><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <div className="group flex items-center gap-2">
                  <span className="font-display truncate text-sm text-sidebar-accent-foreground">{session.name}</span>
                  <button onClick={startEditing} className="p-0.5 text-sidebar-foreground/40 opacity-0 transition-all hover:text-secondary/80 group-hover:opacity-100">
                    <Pencil className="h-2.5 w-2.5" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-sidebar-foreground/50">
                {cloud ? <Cloud className="h-2.5 w-2.5" /> : <MonitorSmartphone className="h-2.5 w-2.5" />}
                {cloud ? t.common.suiteAccount : t.common.thisBrowser}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 px-4 pb-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-2.5 text-center">
              <div className="text-[9px] uppercase tracking-wider text-sidebar-foreground/50">{L.pending}</div>
              <div className="font-display num mt-0.5 text-base text-sidebar-accent-foreground">{counts.pending}</div>
            </div>
            <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-2.5 text-center">
              <div className="text-[9px] uppercase tracking-wider text-sidebar-foreground/50">{L.sent}</div>
              <div className="font-display num mt-0.5 text-base text-sidebar-accent-foreground">{counts.sent}</div>
            </div>
            <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-2.5 text-center">
              <div className="text-[9px] uppercase tracking-wider text-sidebar-foreground/50">{L.failed}</div>
              <div className={cn("font-display num mt-0.5 text-base text-sidebar-accent-foreground", counts.failed > 0 && "text-destructive")}>
                {counts.failed}
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            className="h-9 w-full bg-sidebar/50 text-xs"
            style={{ borderColor: "rgba(178,58,46,0.4)", color: "rgba(224,120,105,1)" }}
            onClick={() => { void signOut(); navigate("/login"); onOpenChange(false); }}
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" /> {t.common.signOut}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
