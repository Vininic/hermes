import { useLocation } from "react-router-dom";
import { Activity, CircleHelp, Inbox, LayoutDashboard, Settings2, Sparkles, Workflow } from "lucide-react";
import { HermesMark } from "@/components/HermesLogo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useT } from "@/lib/i18n/I18nProvider";

/** Suite-style persistent top bar — mirrors Chronos'/Kairos'/Pluto's Topbar
 *  placement convention: language and theme controls live here, on every
 *  page, never inside the sidebar. Route-aware breadcrumb; delivery stats
 *  join once the domain exists — see HERMES.md M2. */
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
        <div className="hidden items-center gap-1.5 text-sm font-medium text-primary lg:flex">
          <crumb.icon className="h-3.5 w-3.5 text-secondary" /> {crumb.label}
        </div>
      )}

      <div className="ml-auto flex items-center gap-3">
        <LanguageToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}
