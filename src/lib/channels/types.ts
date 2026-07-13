export type ChannelKind = "email" | "telegram" | "whatsapp";

export interface ChannelConfig {
  kind: ChannelKind;
  label: string;
  configured: boolean;
  description: string;
  docsUrl?: string;
}

export const CHANNEL_DEFINITIONS: ChannelConfig[] = [
  {
    kind: "email",
    label: "Email (Resend)",
    configured: false,
    description: "Delivered via Resend API. Requires RESEND_API_KEY secret in Supabase.",
    docsUrl: "https://resend.com",
  },
  {
    kind: "telegram",
    label: "Telegram",
    configured: false,
    description: "Delivered via Telegram Bot API. Requires TELEGRAM_BOT_TOKEN secret in Supabase.",
  },
  {
    kind: "whatsapp",
    label: "WhatsApp",
    configured: false,
    description: "Meta WhatsApp Cloud API (test mode — up to 5 verified recipients). Requires WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID.",
  },
];
