import { LayoutDashboard } from "lucide-react";
import EmptyPage from "@/components/EmptyPage";
import { useT } from "@/lib/i18n/I18nProvider";

/** Placeholder — real content (delivery counters, channel health chips,
 *  engine heartbeat, recent runs) lands in M2. See HERMES.md "Dashboard". */
export default function Dashboard() {
  const t = useT();
  const P = t.hermes.placeholders.dashboard;
  return <EmptyPage icon={LayoutDashboard} eyebrow={P.eyebrow} title={P.title} lead={P.lead} milestone={P.milestone} />;
}
