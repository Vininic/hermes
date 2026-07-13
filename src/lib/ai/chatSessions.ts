export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

const KEY = "hermes.chat-sessions.v1";
const MAX_SESSIONS = 20;

export function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [createSession()];
    const parsed = JSON.parse(raw) as ChatSession[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [createSession()];
  } catch {
    return [createSession()];
  }
}

function saveSessions(sessions: ChatSession[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
  } catch { /* noop */ }
}

export function createSession(): ChatSession {
  return {
    id: crypto.randomUUID(),
    title: "Novo chat",
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function addSession(sessions: ChatSession[]): ChatSession[] {
  return [createSession(), ...sessions].slice(0, MAX_SESSIONS);
}

export function deleteSession(sessions: ChatSession[], id: string): ChatSession[] {
  const next = sessions.filter((s) => s.id !== id);
  saveSessions(next);
  return next.length > 0 ? next : [createSession()];
}

export function updateSession(sessions: ChatSession[], id: string, updates: Partial<ChatSession>): ChatSession[] {
  const next = sessions.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s));
  saveSessions(next);
  return next;
}

export function addMessage(sessions: ChatSession[], sessionId: string, msg: ChatMessage): ChatSession[] {
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return sessions;

  const title = session.messages.length === 0 && msg.role === "user"
    ? msg.content.slice(0, 60) + (msg.content.length > 60 ? "…" : "")
    : session.title;

  return updateSession(sessions, sessionId, {
    messages: [...session.messages, msg],
    title,
  });
}
