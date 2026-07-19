import { RotateCw, XCircle } from "lucide-react";
import { describeAction, type AetherisAction } from "@/lib/ai/actions";
import type { OutboxDocument } from "@/lib/outbox/types";

const ACTION_ICONS: Record<AetherisAction["type"], typeof RotateCw> = {
  retry_message: RotateCw,
  cancel_message: XCircle,
};

interface ActionPillProps {
  action: AetherisAction;
  doc: OutboxDocument;
}

/** One proposed action as a colored chip — same visual language Kairos and
 *  Pluto use for their own ActionPill (dot + colored wash + icon), ported
 *  per-domain. Hermes only has two action types and no per-category color
 *  to resolve, so this always reads in the suite's own quicksilver cyan. */
export default function ActionPill({ action, doc }: ActionPillProps) {
  const Icon = ACTION_ICONS[action.type];
  return (
    <div className="flex items-start gap-2 rounded-lg border border-secondary/30 bg-secondary/10 px-2.5 py-2">
      <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-secondary/25 text-secondary">
        <Icon className="h-3 w-3" />
      </div>
      <span className="flex-1 text-sm text-primary">{describeAction(doc, action)}</span>
    </div>
  );
}
