import { Radio } from "lucide-react";
import EmptyPage from "@/components/EmptyPage";
import { useT } from "@/lib/i18n/I18nProvider";

/** Placeholder — per-channel setup state + test-send lands in M2 (email)
 *  and M4 (Telegram/WhatsApp). See HERMES.md "Channels". */
export default function Channels() {
  const t = useT();
  const P = t.hermes.placeholders.channels;
  return <EmptyPage icon={Radio} eyebrow={P.eyebrow} title={P.title} lead={P.lead} milestone={P.milestone} />;
}
