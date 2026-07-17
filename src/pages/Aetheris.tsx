import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Check, Copy, FileText, History, LayoutList, Loader2, PanelRightClose, PanelRightOpen,
  Send, Sparkles, Square, Undo2, Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import Markdown from "@/components/Markdown";
import { HermesMark } from "@/components/HermesLogo";
import { useT } from "@/lib/i18n/I18nProvider";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useOutbox } from "@/lib/outbox/store";
import { cn } from "@/lib/utils";
import {
  loadSessions, createSession, addSession, deleteSession,
  addMessage, type ChatMessage as SessionMessage, type ChatSession,
} from "@/lib/ai/chatSessions";
import {
  loadSettings, saveSettings, DEFAULT_MODELS, PROVIDER_LABELS,
  type AISettings, type AutonomyLevel,
} from "@/lib/ai/settings";
import { streamChat, type ChatMessage } from "@/lib/ai/providers";
import { buildSystemPrompt } from "@/lib/ai/context";
import { parseActions, applyAction, describeAction } from "@/lib/ai/actions";
import { loadHistory, logHistory, markUndone, type HistoryEntry } from "@/lib/ai/actionHistory";

type Tab = "overview" | "digest" | "history";

// Rough shared context-window budget for the UI meter (see Chiron's Aetheris —
// same rationale: conservative floor across the free/hosted models this suite
// targets, so the meter reads as "getting full" before a provider truncates).
const CONTEXT_BUDGET_TOKENS = 32_000;
const estimateTokens = (text: string) => Math.ceil(text.length / 4);

export default function Aetheris() {
  const t = useT();
  const { bcp47, locale } = useI18n();
  const A = t.hermes.aetheris;
  const { doc, retry, cancel } = useOutbox();

  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions());
  const [activeId, setActiveId] = useState<string>(() => sessions[0]?.id ?? "");
  const [draft, setDraft] = useState("");
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [settings, setSettings] = useState<AISettings>(() => loadSettings());
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const active = sessions.find((s) => s.id === activeId) ?? sessions[0];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages, streamingText]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const updateSettings = (patch: Partial<AISettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };

  const switchSession = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const handleNewSession = useCallback(() => {
    const next = addSession(sessions);
    setSessions(next);
    setActiveId(next[0].id);
  }, [sessions]);

  const handleDeleteSession = useCallback((id: string) => {
    const next = deleteSession(sessions, id);
    setSessions(next);
    if (activeId === id) setActiveId(next[0].id);
  }, [sessions, activeId]);

  const systemPrompt = useMemo(() => buildSystemPrompt(doc, bcp47), [doc, bcp47]);
  const usedTokens = useMemo(() => {
    const convoText = (active?.messages ?? []).map((m) => m.content).join("\n") + (streamingText ?? "") + draft;
    return estimateTokens(systemPrompt) + estimateTokens(convoText);
  }, [systemPrompt, active, streamingText, draft]);
  const contextPct = Math.min(100, Math.round((usedTokens / CONTEXT_BUDGET_TOKENS) * 100));

  const sendMessage = useCallback(async () => {
    const trimmed = draft.trim();
    if (!trimmed || sending) return;

    setDraft("");
    setSending(true);
    setStreamingText("");

    const userMsg: SessionMessage = { role: "user", content: trimmed, timestamp: new Date().toISOString() };
    const msgsAfterUser = addMessage(sessions, activeId, userMsg);
    setSessions(msgsAfterUser);

    const historyForModel = (msgsAfterUser.find((s) => s.id === activeId)?.messages ?? []);
    const chatMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...historyForModel.map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
    ];

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let full = "";
      await streamChat(settings, chatMessages, (delta) => {
        full += delta;
        setStreamingText(full);
      }, controller.signal);

      const { prose, actions } = parseActions(full);
      let replyText = prose || full;
      let currentDoc = doc;

      if (actions.length > 0 && settings.autonomy === "confirm") {
        const descriptions = actions.map((a) => describeAction(currentDoc, a));
        const confirmed = window.confirm(
          `O Aetheris quer:\n${descriptions.map((d) => `• ${d}`).join("\n")}\n\nAplicar?`,
        );
        if (!confirmed) {
          replyText += "\n\n(Ações não aplicadas — o usuário recusou.)";
        } else {
          const beforeSnapshot = JSON.parse(JSON.stringify(currentDoc)) as typeof currentDoc;
          let allOk = true;
          for (const action of actions) {
            const result2 = applyAction(currentDoc, action);
            if (typeof result2 === "string") {
              replyText += `\n\nErro ao aplicar "${action.type}": ${result2}`;
              allOk = false;
            } else {
              currentDoc = result2;
            }
          }
          if (allOk) {
            logHistory(beforeSnapshot, descriptions.map((d) => d));
            setHistory(loadHistory());
            replyText += "\n\n(Ações aplicadas com sucesso.)";
            actions.forEach((a) => {
              if (a.type === "retry_message") retry(a.messageId);
              if (a.type === "cancel_message") cancel(a.messageId);
            });
            toast("Ações aplicadas!", { description: descriptions.join("; ") });
          }
        }
      } else if (actions.length > 0) {
        const beforeSnapshot = JSON.parse(JSON.stringify(currentDoc)) as typeof currentDoc;
        const descriptions = actions.map((a) => describeAction(currentDoc, a));
        let allOk = true;
        for (const action of actions) {
          const result2 = applyAction(currentDoc, action);
          if (typeof result2 === "string") {
            replyText += `\n\nErro ao aplicar "${action.type}": ${result2}`;
            allOk = false;
          } else {
            currentDoc = result2;
          }
        }
        if (allOk) {
          logHistory(beforeSnapshot, descriptions);
          setHistory(loadHistory());
          actions.forEach((a) => {
            if (a.type === "retry_message") retry(a.messageId);
            if (a.type === "cancel_message") cancel(a.messageId);
          });
          toast("Ações automáticas aplicadas!");
        }
      }

      const assistantMsg: SessionMessage = { role: "assistant", content: replyText, timestamp: new Date().toISOString() };
      setSessions((prev) => addMessage(prev, activeId, assistantMsg));
    } catch (err) {
      const errorMsg: SessionMessage = {
        role: "assistant",
        content: `Erro: ${err instanceof Error ? err.message : "Falha ao contactar o assistente."}`,
        timestamp: new Date().toISOString(),
      };
      setSessions((prev) => addMessage(prev, activeId, errorMsg));
    } finally {
      setStreamingText(null);
      setSending(false);
      abortRef.current = null;
    }
  }, [draft, sending, sessions, activeId, doc, settings, systemPrompt, retry, cancel]);

  const stopGenerating = () => abortRef.current?.abort();

  const toggleSpeak = (id: string, content: string) => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (speakingId === id) {
      synth.cancel();
      setSpeakingId(null);
      return;
    }
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(content);
    utter.lang = locale === "en" ? "en-US" : "pt-BR";
    utter.onend = () => setSpeakingId(null);
    utter.onerror = () => setSpeakingId(null);
    setSpeakingId(id);
    synth.speak(utter);
  };

  const copyMessage = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1500);
    } catch { /* clipboard unavailable — no-op */ }
  };

  const tabs: { id: Tab; label: string; icon: typeof LayoutList }[] = [
    { id: "overview", label: A.tabOverview, icon: LayoutList },
    { id: "digest", label: A.tabDigest, icon: FileText },
    { id: "history", label: A.tabHistory, icon: History },
  ];

  const pendingCount = doc.messages.filter((m) => m.status === "pending").length;
  const failedCount = doc.messages.filter((m) => m.status === "failed").length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-secondary">{A.eyebrow}</div>
            <h1 className="font-display mt-1 text-2xl text-primary">{A.title}</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <select
              value={activeId}
              onChange={(e) => switchSession(e.target.value)}
              className="h-8 rounded-md border border-border bg-card px-2.5 text-xs text-primary"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
            <button type="button" onClick={handleNewSession} className="grid h-8 w-8 place-items-center rounded-md border border-border bg-card text-xs text-muted-foreground hover:text-primary">+</button>
            {sessions.length > 1 && (
              <button type="button" onClick={() => handleDeleteSession(activeId)} className="grid h-8 w-8 place-items-center rounded-md border border-border bg-card text-xs text-muted-foreground hover:text-red-400">✕</button>
            )}
            <div className="flex items-center gap-1.5 border-l border-border pl-3">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Auto:</span>
              <select
                value={settings.autonomy}
                onChange={(e) => updateSettings({ autonomy: e.target.value as AutonomyLevel })}
                className="h-7 rounded border border-border bg-card px-2 text-[11px] text-primary"
              >
                <option value="confirm">Confirmar</option>
                <option value="auto">Automático</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="hidden h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:text-foreground lg:grid"
            aria-label={sidebarOpen ? A.tabHistory : A.tabOverview}
          >
            {sidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-5">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex flex-1 flex-col overflow-y-auto px-6 py-6">
            {active?.messages.length === 0 && streamingText === null ? (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
                  <Sparkles className="h-6 w-6" />
                </div>
                <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">{A.emptyLead}</p>
                <div className="mt-6 flex max-w-lg flex-wrap justify-center gap-2">
                  {A.suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setDraft(s)}
                      className="rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-secondary/40 hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto w-full max-w-3xl space-y-4">
                {active?.messages.map((msg, i) => (
                  <div key={i} className={cn("group flex gap-3", msg.role === "assistant" && "flex-row-reverse")}>
                    <div className={cn(
                      "max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-surface-raised text-primary",
                    )}>
                      {msg.role === "assistant" ? <Markdown text={msg.content} /> : <div>{msg.content}</div>}
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground/60">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                        <div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button type="button" onClick={() => copyMessage(`${i}`, msg.content)} className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:text-foreground" aria-label="Copiar" title="Copiar">
                            {copiedId === `${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </button>
                          {msg.role === "assistant" && (
                            <button type="button" onClick={() => toggleSpeak(`${i}`, msg.content)} className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:text-foreground" aria-label="Ouvir" title="Ouvir">
                              {speakingId === `${i}` ? <Square className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {streamingText !== null && (
                  <div className="flex flex-row-reverse gap-3">
                    <div className="max-w-[80%] rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm text-primary">
                      {streamingText ? <Markdown text={streamingText} /> : (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Pensando…
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-border p-3">
            <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-1 pb-1.5 text-[10px] text-muted-foreground">
              <Link to="/settings" className="hover:text-foreground">
                {A.poweredBy(PROVIDER_LABELS[settings.provider], settings.model.trim() || DEFAULT_MODELS[settings.provider])}
              </Link>
              <span className="num" title={`${usedTokens} tokens (estimado)`}>
                {contextPct}% contexto · {usedTokens.toLocaleString()} tokens (estimado)
              </span>
            </div>
            <div className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-lg border border-border bg-surface-raised p-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={A.placeholder}
                rows={1}
                className="min-h-[2.5rem] flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
              {sending ? (
                <Button type="button" size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={stopGenerating} aria-label="Parar">
                  <Square className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button type="button" size="icon" className="h-9 w-9 shrink-0" onClick={sendMessage} disabled={!draft.trim()} aria-label={A.send}>
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <aside className={cn("hidden w-72 shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card lg:w-80", sidebarOpen && "lg:flex")}>
          <div className="flex shrink-0 border-b border-border">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-2.5 text-xs font-medium transition-colors",
                  tab === id ? "border-secondary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {tab === "overview" && (
              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-surface-raised p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Pendentes</div>
                  <div className="font-display mt-1 text-2xl text-primary">{pendingCount}</div>
                </div>
                <div className="rounded-lg border border-border bg-surface-raised p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Falhas</div>
                  <div className="font-display mt-1 text-2xl text-primary">{failedCount}</div>
                </div>
                <div className="rounded-lg border border-border bg-surface-raised p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Fila total</div>
                  <div className="font-display mt-1 text-2xl text-primary">{doc.messages.length}</div>
                </div>
              </div>
            )}

            {tab === "digest" && (
              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-surface-raised p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Resumo da fila</div>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <p>• {pendingCount} pendentes</p>
                    <p>• {doc.messages.filter((m) => m.status === "sent").length} enviadas</p>
                    <p>• {failedCount} falhas</p>
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground/60">
                    Atualizado: {new Date().toLocaleTimeString()}
                  </p>
                </div>
              </div>
            )}

            {tab === "history" && (
              <div className="space-y-2">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <HermesMark className="mx-auto h-6 w-6 text-secondary/50" />
                    <p className="mt-3 text-xs text-muted-foreground">{A.historyEmpty}</p>
                  </div>
                ) : (
                  history.map((entry) => (
                    <div key={entry.id} className={cn("rounded-lg border p-3", entry.undone ? "border-border/50 opacity-60" : "border-border")}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(entry.timestamp).toLocaleString()}
                          </div>
                          <ul className="mt-1 space-y-0.5">
                            {entry.descriptions.map((d, i) => (
                              <li key={i} className="text-xs text-primary">{d}</li>
                            ))}
                          </ul>
                        </div>
                        {!entry.undone && (
                          <button
                            type="button"
                            onClick={() => {
                              markUndone(entry.id);
                              setHistory(loadHistory());
                              toast("Ação desfeita");
                            }}
                            className="shrink-0 rounded p-1 text-muted-foreground hover:text-secondary"
                            title="Desfazer"
                          >
                            <Undo2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      {entry.undone && (
                        <div className="mt-1 text-[10px] text-muted-foreground">(desfeito)</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
