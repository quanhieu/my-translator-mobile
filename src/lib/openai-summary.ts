// Plain HTTPS call to OpenAI Chat Completions for a post-session summary.
// Deliberately NOT using the realtime websocket client — this is a one-shot
// REST request, decoupled from the live-translation engine.

const ENDPOINT = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-5-mini";
const MAX_INPUT_CHARS = 12000;

interface SummarizeArgs {
  apiKey: string;
  text: string;
  targetLang: string;
}

export async function summarizeTranscript({
  apiKey,
  text,
  targetLang,
}: SummarizeArgs): Promise<string> {
  const transcript =
    text.length > MAX_INPUT_CHARS ? text.slice(-MAX_INPUT_CHARS) : text;

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You summarize meeting and lecture transcripts. Respond ONLY in the language with code "${targetLang}". Be concise: the key points, then any decisions or action items.`,
        },
        { role: "user", content: transcript },
      ],
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
    throw new Error(`OpenAI ${res.status}${detail ? `: ${detail}` : ""}`);
  }

  const body = await res.json();
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenAI returned an empty summary");
  }
  return content.trim();
}
