export type Engine = "soniox" | "openai" | "qwen";

// Human-readable engine names — single source of truth for every UI surface
// (header, settings, history). Add a new engine here and the UI follows.
export const ENGINE_LABELS: Record<Engine, string> = {
  soniox: "Soniox",
  openai: "OpenAI",
  qwen: "Qwen",
};

// Engines that produce spoken TTS output (and therefore show the mute toggle).
export function engineHasVoice(engine: Engine): boolean {
  return engine === "openai" || engine === "qwen";
}

export type LangCode = string;

export type SessionStatus =
  | "idle"
  | "connecting"
  | "streaming"
  | "stopping"
  | "error";

export type PanelMode = "single" | "dual";

export interface TranscriptRow {
  id: string;
  source?: string;
  translation: string;
  isProvisional?: boolean;
  timestamp: number;
}

export interface SessionMeta {
  id: string;
  createdAt: number;
  engine: Engine;
  targetLang: LangCode;
  rowCount: number;
  preview: string;
  name?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SavedSession {
  meta: SessionMeta;
  rows: TranscriptRow[];
  summary?: string;
  chat?: ChatMessage[];
}
