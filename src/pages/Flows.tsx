import { Workflow } from "lucide-react";
import EmptyPage from "@/components/EmptyPage";
import { useT } from "@/lib/i18n/I18nProvider";

/** Placeholder — the suite-style flow renderer (from exported n8n JSON)
 *  lands in M3. See HERMES.md "Flows". */
export default function Flows() {
  const t = useT();
  const P = t.hermes.placeholders.flows;
  return <EmptyPage icon={Workflow} eyebrow={P.eyebrow} title={P.title} lead={P.lead} milestone={P.milestone} />;
}
