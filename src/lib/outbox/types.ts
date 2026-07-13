export type MessageChannel = "email" | "telegram" | "whatsapp";
export type MessageStatus = "pending" | "sent" | "failed";
export type MessageSource = "pluto" | "chronos" | "kairos" | "chiron" | "hermes";
export type MessageTemplate = "monthly-report" | "budget-alert" | "digest" | "deadline-reminder" | "custom";

export interface OutboxMessage {
  id: string;
  source: MessageSource;
  channel: MessageChannel;
  template: MessageTemplate;
  subject: string;
  payload: Record<string, unknown>;
  status: MessageStatus;
  createdAt: string;
  sentAt?: string;
  error?: string;
  attempts: number;
}

export interface OutboxDocument {
  version: number;
  messages: OutboxMessage[];
}
