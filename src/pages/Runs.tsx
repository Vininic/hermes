import { Activity } from "lucide-react";
import EmptyPage from "@/components/EmptyPage";
import { useT } from "@/lib/i18n/I18nProvider";

/** Placeholder — real execution history (cached in `hermes-flows`, with an
 *  "engine offline" banner) lands in M2. See HERMES.md "Runs". */
export default function Runs() {
  const t = useT();
  const P = t.hermes.placeholders.runs;
  return <EmptyPage icon={Activity} eyebrow={P.eyebrow} title={P.title} lead={P.lead} milestone={P.milestone} />;
}
