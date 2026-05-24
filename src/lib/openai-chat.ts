// Generic plain-HTTPS call to OpenAI Chat Completions. One-shot REST, fully
// decoupled from the realtime websocket engine. Used for the post-session
// summary, the session chat, and auto-naming.

import type { ChatMessage } from "@/src/types";

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
// DashScope international OpenAI-compat endpoint. Same payload shape as OpenAI;
// auth via DashScope key. Model id `qwen-*` routes here automatically.
const DASHSCOPE_ENDPOINT =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions";
export const DEFAULT_CHAT_MODEL = "gpt-5-mini";
export const MAX_INPUT_CHARS = 12000;

function endpointForModel(model: string): string {
  return model.startsWith("qwen") ? DASHSCOPE_ENDPOINT : OPENAI_ENDPOINT;
}

// Pick the right API key for a chat model. qwen-* runs on DashScope (qwenKey),
// everything else (gpt-*, default) runs on OpenAI (openaiKey).
export function pickKeyForModel(
  model: string,
  openaiKey: string,
  qwenKey: string,
): string {
  return model.startsWith("qwen") ? qwenKey : openaiKey;
}

interface ChatArgs {
  apiKey: string;
  model: string;
  system: string;
  messages: ChatMessage[];
}

export async function chatCompletion({
  apiKey,
  model,
  system,
  messages,
}: ChatArgs): Promise<string> {
  const res = await fetch(endpointForModel(model), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error?.message ?? "";
    } catch {
      /* non-JSON error body */
    }
    const provider = model.startsWith("qwen") ? "DashScope" : "OpenAI";
    throw new Error(`${provider} ${res.status}${detail ? `: ${detail}` : ""}`);
  }

  const body = await res.json();
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    const provider = model.startsWith("qwen") ? "DashScope" : "OpenAI";
    throw new Error(`${provider} returned an empty response`);
  }
  return content.trim();
}

interface SummarizeArgs {
  apiKey: string;
  text: string;
  targetLang: string;
  model?: string;
}

interface SuggestTitleArgs {
  apiKey: string;
  text: string;
  targetLang: string;
  model?: string;
}

// Returns a short session title (no quotes, no trailing punctuation). Caller
// trims/caps before persisting via renameSession.
export async function suggestSessionTitle({
  apiKey,
  text,
  targetLang,
  model = DEFAULT_CHAT_MODEL,
}: SuggestTitleArgs): Promise<string> {
  const transcript =
    text.length > MAX_INPUT_CHARS ? text.slice(-MAX_INPUT_CHARS) : text;

  const raw = await chatCompletion({
    apiKey,
    model,
    system: `You name recorded sessions. Reply with ONLY a short title (max 6 words), no quotes, no punctuation at the end. Write it in the language with code "${targetLang}".`,
    messages: [{ role: "user", content: transcript }],
  });
  return raw.replace(/^["']|["'.]+$/g, "").trim();
}

export async function summarizeTranscript({
  apiKey,
  text,
  targetLang,
  model = DEFAULT_CHAT_MODEL,
}: SummarizeArgs): Promise<string> {
  const transcript =
    text.length > MAX_INPUT_CHARS ? text.slice(-MAX_INPUT_CHARS) : text;

  return chatCompletion({
    apiKey,
    model,
    system: `You summarize meeting and lecture transcripts. Respond ONLY in the language with code "${targetLang}". Be concise: the key points, then any decisions or action items.`,
    messages: [{ role: "user", content: transcript }],
  });
}
