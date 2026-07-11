import { Inbox } from "lucide-react";
import EmptyPage from "@/components/EmptyPage";
import { useT } from "@/lib/i18n/I18nProvider";

/** Placeholder — the real queue (pending/sent/failed, source chip, retry/
 *  cancel) lands in M2, reading the `hermes-outbox` user_data key. See
 *  HERMES.md "Outbox" and SUITE-ARCHITECTURE.md §4 for the bridge contract. */
export default function Outbox() {
  const t = useT();
  const P = t.hermes.placeholders.outbox;
  return <EmptyPage icon={Inbox} eyebrow={P.eyebrow} title={P.title} lead={P.lead} milestone={P.milestone} />;
}
