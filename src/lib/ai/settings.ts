export type AIProvider = "gemini-hosted" | "openrouter-hosted" | "gemini" | "openai" | "anthropic" | "openrouter" | "ollama";
export type AutonomyLevel = "confirm" | "auto";

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  "gemini-hosted": "Gemini (Hosted, free)",
  "openrouter-hosted": "OpenRouter (Hosted, free)",
  gemini: "Google Gemini (own key)",
  openai: "OpenAI",
  anthropic: "Anthropic",
  openrouter: "OpenRouter (own key)",
  ollama: "Ollama (local)",
};

export const DEFAULT_MODELS: Record<AIProvider, string> = {
  "gemini-hosted": "gemini-3.1-flash-lite",
  "openrouter-hosted": "meta-llama/llama-3.3-70b-instruct:free",
  gemini: "gemini-2.5-flash",
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-5",
  openrouter: "google/gemini-2.5-flash",
  ollama: "llama3.1",
};

const KEYS = {
  provider: "hermes.ai.provider",
  apiKey: "hermes.ai.apiKey",
  model: "hermes.ai.model",
  baseUrl: "hermes.ai.baseUrl",
  autonomy: "hermes.ai.autonomy",
} as const;

export interface AISettings {
  provider: AIProvider;
  apiKey: string;
  model: string;
  /** Ollama only. */
  baseUrl: string;
  autonomy: AutonomyLevel;
}

export function loadSettings(): AISettings {
  try {
    const provider = (localStorage.getItem(KEYS.provider) as AIProvider) || "gemini-hosted";
    return {
      provider,
      apiKey: localStorage.getItem(KEYS.apiKey) || "",
      model: localStorage.getItem(KEYS.model) || "",
      baseUrl: localStorage.getItem(KEYS.baseUrl) || "",
      autonomy: (localStorage.getItem(KEYS.autonomy) as AutonomyLevel) || "confirm",
    };
  } catch {
    return { provider: "gemini-hosted", apiKey: "", model: "", baseUrl: "", autonomy: "confirm" };
  }
}

export function saveSettings(s: AISettings): void {
  try {
    localStorage.setItem(KEYS.provider, s.provider);
    localStorage.setItem(KEYS.apiKey, s.apiKey);
    localStorage.setItem(KEYS.model, s.model);
    localStorage.setItem(KEYS.baseUrl, s.baseUrl);
    localStorage.setItem(KEYS.autonomy, s.autonomy);
  } catch { /* noop */ }
}

export function modelOf(s: Pick<AISettings, "provider" | "model">): string {
  return s.model.trim() || DEFAULT_MODELS[s.provider];
}
