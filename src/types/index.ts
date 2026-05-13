export type Engine = "soniox" | "openai";

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
