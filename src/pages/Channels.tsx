import { useState } from "react";
import { CheckCircle2, ExternalLink, Radio, Send, Terminal, XCircle } from "lucide-react";
import { useT } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { CHANNEL_DEFINITIONS, type ChannelKind } from "@/lib/channels/types";

const CHANNEL_SECRETS: Record<ChannelKind, string[]> = {
  email: ["RESEND_API_KEY", "REPORT_FROM_EMAIL"],
  telegram: ["TELEGRAM_BOT_TOKEN"],
  whatsapp: ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"],
};

export default function Channels() {
  const t = useT();
  const C = t.hermes.channels;
  const [sending, setSending] = useState<ChannelKind | null>(null);

  async function handleTestSend(kind: ChannelKind) {
    setSending(kind);
    try {
      const { createMessage } = await import("@/lib/outbox/service");
      const { getSupabaseClient } = await import("@/lib/supabase/client");
      const supabase = getSupabaseClient();
      if (!supabase) {
        toast(C.testFailed, { description: "Cloud account required" });
        return;
      }
      const msg = createMessage("hermes", kind, "custom", `Test message (${kind})`, { text: `This is a test message sent from Hermes at ${new Date().toISOString()}.` });
      const pendingDoc = { version: 1, messages: [msg] };
      await supabase.from("user_data").upsert(
        { key: "hermes-outbox", value: pendingDoc, version: Date.now() },
        { onConflict: "user_id, key" },
      );
      toast(C.testSent);
    } catch {
      toast(C.testFailed);
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="text-[11px] uppercase tracking-[0.22em] text-secondary">{C.eyebrow}</div>
        <h1 className="font-display mt-1.5 text-4xl text-primary">{C.title}</h1>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {CHANNEL_DEFINITIONS.map((ch) => (
          <div key={ch.kind} className="hermes-card p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Radio className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg text-primary">{ch.label}</h2>
                  <span className={cn(
                    "inline-flex items-center gap-1 text-xs font-medium",
                    ch.configured ? "text-secondary" : "text-muted-foreground",
                  )}>
                    {ch.configured ? (
                      <><CheckCircle2 className="h-3 w-3" /> {C.configured}</>
                    ) : (
                      <><XCircle className="h-3 w-3" /> {C.notConfigured}</>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{ch.description}</p>

            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Terminal className="h-3 w-3" />
                <span>{C.configSecret}</span>
              </div>
              {CHANNEL_SECRETS[ch.kind].map((secret) => (
                <code key={secret} className="block rounded-md border border-border bg-card px-3 py-2 text-[11px] text-primary">
                  {secret}
                </code>
              ))}
              {ch.docsUrl && (
                <a href={ch.docsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-secondary hover:underline">
                  <ExternalLink className="h-3 w-3" /> {C.configDocs}
                </a>
              )}
            </div>

            <div className="mt-5 border-t border-border pt-4">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-full text-xs"
                disabled={sending === ch.kind}
                onClick={() => handleTestSend(ch.kind)}
              >
                <Send className="mr-1.5 h-3 w-3" />
                {sending === ch.kind ? "Enviando..." : C.testSend}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
