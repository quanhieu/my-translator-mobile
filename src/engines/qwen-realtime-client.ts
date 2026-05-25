/**
 * Qwen LiveTranslate Flash Realtime translation client.
 *
 * Endpoint: wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime
 *           ?model=qwen3-livetranslate-flash-realtime
 *
 * Auth: `Authorization: Bearer <DashScope key>` on the WS handshake.
 *
 * Turn control: server-side. The live model has its own VAD and streams
 * responses continuously — manual `input_audio_buffer.commit` /
 * `response.create` are rejected. We just append audio and let server
 * decide segmentation. This replaces the omni-plus client-side RMS-VAD.
 *
 * Source language: auto-detected. The `input_audio_transcription` field
 * is omitted entirely (probed 2026-05-25: works identically to an
 * explicit `ja` code, matches the existing app UX where source is never
 * surfaced to the user).
 *
 * Event mapping:
 *   response.text.delta             → onProvisional
 *   response.text.done              → onSegment("", tgt)
 *   error                           → onError
 *
 * Audio: input pcm16 @ 16kHz mono (AudioCapture(16000)). Output disabled
 * — modalities locked to ["text"] (TTS playback would loop into mic).
 *
 * Migration notes vs prior omni-plus client:
 *   - Model name: qwen3.5-omni-plus-realtime → qwen3-livetranslate-flash-realtime
 *   - session.update payload: dropped `instructions`, `output_audio_format`;
 *     added `translation.language`
 *   - Removed all client-side RMS-VAD + manual commitTurn
 *   - Removed audio output queue (text-only)
 *   - Removed input_audio_transcription event handling (live model doesn't
 *     emit transcription events for the source side — only translation)
 *   - See plans/reports/benchmark-260525-1453-qwen-model-sweep.md
 */

const QWEN_REALTIME_URL =
  "wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime?model=qwen3-livetranslate-flash-realtime";

export type QwenStatus = "connecting" | "ready" | "closed" | "error";

export interface QwenRealtimeConfig {
  apiKey: string;
  targetLanguage: string;
}

export interface QwenRealtimeCallbacks {
  onStatusChange?: (status: QwenStatus, message?: string) => void;
  onSegment?: (sourceText: string, translatedText: string) => void;
  onProvisional?: (text: string) => void;
  onError?: (code: string, message: string) => void;
  onClosed?: (reason: string) => void;
}

interface WSWithHeaders {
  new (
    url: string,
    protocols?: string | string[] | null,
    options?: { headers?: Record<string, string> },
  ): WebSocket;
}

export class QwenRealtimeClient {
  private ws: WebSocket | null = null;
  private connected = false;

  private provisionalBuffer = "";
  // Guard: response.text.done can fire twice for a single response when both
  // text and audio_transcript streams complete — emit segment once.
  private lastDoneResponseId: string | null = null;

  constructor(public callbacks: QwenRealtimeCallbacks = {}) {}

  connect(cfg: QwenRealtimeConfig): void {
    this.provisionalBuffer = "";
    this.lastDoneResponseId = null;

    this.callbacks.onStatusChange?.("connecting");

    let ws: WebSocket;
    try {
      const WSCtor = WebSocket as unknown as WSWithHeaders;
      ws = new WSCtor(QWEN_REALTIME_URL, null, {
        headers: {
          Authorization: `Bearer ${cfg.apiKey}`,
        },
      });
    } catch (err) {
      this.callbacks.onError?.("connect_failed", (err as Error).message);
      this.callbacks.onStatusChange?.("error", (err as Error).message);
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.connected = true;
      const sessionUpdate = {
        type: "session.update",
        session: {
          modalities: ["text"],
          input_audio_format: "pcm",
          // input_audio_transcription omitted → server auto-detects source.
          translation: { language: cfg.targetLanguage },
          // VAD is server-side — manual commits are rejected.
          turn_detection: null,
        },
      };
      try {
        ws.send(JSON.stringify(sessionUpdate));
      } catch (err) {
        this.callbacks.onError?.(
          "session_update_failed",
          (err as Error).message,
        );
        return;
      }
      this.callbacks.onStatusChange?.("ready");
    };

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data as string);
        this.handleServerEvent(data);
      } catch {
        /* ignore parse errors */
      }
    };

    ws.onerror = () => {
      this.callbacks.onError?.("ws_error", "WebSocket error");
      this.callbacks.onStatusChange?.("error", "WebSocket error");
    };

    ws.onclose = (event) => {
      this.connected = false;
      this.ws = null;
      const reason = `${event.code}: ${event.reason || "closed"}`;
      this.callbacks.onClosed?.(reason);
      this.callbacks.onStatusChange?.("closed", reason);
    };
  }

  sendAudio(pcm: ArrayBuffer): void {
    if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN)
      return;
    if (pcm.byteLength === 0) return;
    const b64 = arrayBufferToBase64(pcm);
    try {
      this.ws.send(
        JSON.stringify({ type: "input_audio_buffer.append", audio: b64 }),
      );
    } catch {
      /* ignore — onclose / onerror will surface real failure */
    }
  }

  /**
   * Emit any in-flight provisional text as a final segment so stop-mid-
   * sentence content isn't silently dropped. Safe to call multiple times.
   */
  flushPending(): void {
    const tgt = this.provisionalBuffer;
    this.provisionalBuffer = "";
    if (tgt) this.callbacks.onSegment?.("", tgt);
  }

  disconnect(): void {
    if (!this.ws) {
      this.connected = false;
      return;
    }
    this.connected = false;
    this.flushPending();
    try {
      this.ws.close(1000, "User disconnected");
    } catch {
      /* ignore */
    }
    this.ws = null;
  }

  private handleServerEvent(data: Record<string, unknown>): void {
    const type = data.type as string | undefined;
    if (!type) return;
    console.log("[qwen-livetranslate] evt:", type);

    switch (type) {
      case "session.created":
      case "session.updated":
      case "response.created":
      case "response.done":
        break;

      case "response.text.delta":
      case "response.audio_transcript.delta": {
        const delta = (data.delta as string) ?? "";
        if (delta) {
          this.provisionalBuffer += delta;
          this.callbacks.onProvisional?.(this.provisionalBuffer);
        }
        break;
      }

      case "response.text.done":
      case "response.audio_transcript.done": {
        const responseId =
          (data.response_id as string) ?? (data.item_id as string) ?? null;
        if (responseId && responseId === this.lastDoneResponseId) break;
        this.lastDoneResponseId = responseId;

        const text =
          (data.text as string) ??
          (data.transcript as string) ??
          this.provisionalBuffer;
        this.provisionalBuffer = "";
        if (text) this.callbacks.onSegment?.("", text);
        break;
      }

      case "error": {
        const err = (data.error ?? {}) as { code?: string; message?: string };
        this.callbacks.onError?.(
          err.code ?? "unknown",
          friendlyError(err.code, err.message),
        );
        break;
      }

      default:
        break;
    }
  }
}

function friendlyError(code?: string, message?: string): string {
  const c = (code ?? "").toLowerCase();
  if (c.includes("auth") || c.includes("401") || c.includes("invalid_api_key"))
    return "Invalid DashScope API key. Check it in Settings.";
  if (c.includes("quota") || c.includes("rate") || c.includes("429"))
    return "Qwen quota or rate limit reached. Try again later.";
  if (c.includes("model") && c.includes("not"))
    return "Qwen Realtime model unavailable.";
  return message ?? "Qwen Realtime error.";
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  if (typeof btoa === "function") return btoa(bin);
  if (globalThis.Buffer) {
    return globalThis.Buffer.from(bin, "binary").toString("base64");
  }
  return "";
}
