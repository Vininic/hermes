import type { OutboxDocument } from "@/lib/outbox/types";

export interface HistoryEntry {
  id: string;
  timestamp: string;
  descriptions: string[];
  outboxBefore: OutboxDocument;
  undone: boolean;
}

const KEY = "hermes.ai-history.v1";
const MAX_ENTRIES = 30;

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch { /* noop */ }
}

export function logHistory(outboxBefore: OutboxDocument, descriptions: string[]): HistoryEntry[] {
  const entry: HistoryEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    descriptions,
    outboxBefore,
    undone: false,
  };
  const next = [entry, ...loadHistory()];
  saveHistory(next);
  return next;
}

export function markUndone(id: string): HistoryEntry[] {
  const next = loadHistory().map((e) => (e.id === id ? { ...e, undone: true } : e));
  saveHistory(next);
  return next;
}
