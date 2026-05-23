/**
 * Qwen-Omni-Realtime translation client (direct WebSocket from device).
 *
 * Endpoint: wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime
 *           ?model=qwen3.5-omni-plus-realtime
 *
 * Auth: `Authorization: Bearer <DashScope key>` on the WS handshake — same
 * mechanism the OpenAI client relies on (RN passes a 3rd-arg `{ headers }`).
 * Verify on a physical iOS device before shipping.
 *
 * Turn control: server-VAD is DISABLED. Benchmarks showed Qwen's server-VAD
 * silently drops ~33-80% of translated content. Instead we run client-side
 * RMS-based silence detection and fire `input_audio_buffer.commit` +
 * `response.create` ourselves at natural pauses (or at MAX_WINDOW_MS).
 * Result: full coverage, ~2.3s first token, better pronoun continuity.
 * See plans/reports/benchmark-260523-0701-qwen-coherence-improvement.md.
 *
 * Event mapping:
 *   conversation.item.input_audio_transcription.completed → onSourceProvisional / pendingSourceFinals
 *   response.text.delta | response.audio_transcript.delta → onProvisional
 *   response.text.done  | response.audio_transcript.done  → onSegment(src, tgt)
 *   response.audio.delta                                  → outputQueue.push(b64)
 *   error                                                 → onError
 *
 * Audio: input pcm16 @ 16kHz mono (AudioCapture(16000)), output pcm @ 24kHz.
 */

import type { OpenAiAudioOutputQueue } from "@/src/lib/openai-audio-output-queue";

const QWEN_REALTIME_URL =
  "wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime?model=qwen3.5-omni-plus-realtime";

// Client-side RMS-VAD config — tuned on Hope-v2 benchmark (variant K).
// SILENCE_RMS may need per-device calibration once we test on real mic.
const SILENCE_RMS = 500; // int16 PCM amplitude
const SILENCE_MS = 400; // sustained quiet → commit
const MIN_WINDOW_MS = 2000;
const MAX_WINDOW_MS = 7000;
const SAMPLE_RATE = 16000;
const BYTES_PER_SAMPLE = 2;

export type QwenStatus = "connecting" | "ready" | "closed" | "error";

export interface QwenRealtimeConfig {
  apiKey: string;
  targetLanguage: string;
  targetLanguageName: string;
  audioOutput?: boolean;
}

export interface QwenRealtimeCallbacks {
  onStatusChange?: (status: QwenStatus, message?: string) => void;
  onSegment?: (sourceText: string, translatedText: string) => void;
  onProvisional?: (text: string) => void;
  onSourceProvisional?: (text: string) => void;
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
  private muted = false;
  private outputQueue: OpenAiAudioOutputQueue | null = null;

  private provisionalBuffer = "";
  private sourceBuffer = "";
  // Source-language finals from STT, waiting to be paired with the next
  // translated target final. STT + translation finalize independently.
  private pendingSourceFinals: string[] = [];
  // Guard: text + audio_transcript streams can both fire `.done` for one
  // response — emit the segment only once per response id.
  private lastDoneResponseId: string | null = null;

  // RMS-VAD turn state — accumulates per-chunk and triggers manual commits.
  private windowMs = 0;
  private silenceMs = 0;
  private hasAudioInWindow = false;

  constructor(public callbacks: QwenRealtimeCallbacks = {}) {}

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.outputQueue?.flush();
  }

  connect(cfg: QwenRealtimeConfig, outputQueue: OpenAiAudioOutputQueue): void {
    this.outputQueue = outputQueue;
    this.muted = cfg.audioOutput === false;
    this.provisionalBuffer = "";
    this.sourceBuffer = "";
    this.pendingSourceFinals = [];
    this.lastDoneResponseId = null;
    this.windowMs = 0;
    this.silenceMs = 0;
    this.hasAudioInWindow = false;

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
          modalities: cfg.audioOutput !== false ? ["text", "audio"] : ["text"],
          voice: "Tina",
          input_audio_format: "pcm",
          output_audio_format: "pcm",
          instructions:
            `You are a professional simultaneous interpreter translating one ` +
            `speaker's talk into ${cfg.targetLanguageName}. RULES: ` +
            `(1) Use consistent singular pronouns for the speaker across ` +
            `turns — refer to them the same way every time. ` +
            `(2) Preserve continuity from earlier turns in this session; ` +
            `if a sentence was cut mid-thought in a prior turn, continue ` +
            `smoothly. (3) Translate EVERY utterance fully — never stay ` +
            `silent. (4) Output ONLY the ${cfg.targetLanguageName} ` +
            `translation, no source, no commentary.`,
          // VAD disabled — client drives commits via RMS-VAD (see sendAudio).
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
      return;
    }

    // RMS-VAD turn control. Advance window/silence timers, fire commit at
    // a natural pause once we've buffered enough audio.
    const chunkMs = (pcm.byteLength / (SAMPLE_RATE * BYTES_PER_SAMPLE)) * 1000;
    const energy = rmsInt16(pcm);
    this.windowMs += chunkMs;
    if (energy >= SILENCE_RMS) {
      this.silenceMs = 0;
      this.hasAudioInWindow = true;
    } else {
      this.silenceMs += chunkMs;
    }

    // Skip committing windows that contain only silence — avoids the
    // pre-speech intro artifact ("Xin chào, tôi là trợ lý...") we saw in
    // benchmarks when commit fires on empty audio.
    if (!this.hasAudioInWindow) {
      if (this.windowMs >= MAX_WINDOW_MS) {
        this.windowMs = 0;
        this.silenceMs = 0;
      }
      return;
    }

    const hitMax = this.windowMs >= MAX_WINDOW_MS;
    const hitPause =
      this.windowMs >= MIN_WINDOW_MS && this.silenceMs >= SILENCE_MS;
    if (hitMax || hitPause) this.commitTurn();
  }

  private commitTurn(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
      this.ws.send(JSON.stringify({ type: "response.create" }));
    } catch {
      /* ignore — onclose / onerror will surface real failure */
    }
    this.windowMs = 0;
    this.silenceMs = 0;
    this.hasAudioInWindow = false;
  }

  /**
   * Emit any in-flight buffers as a final segment so stop-mid-sentence text
   * isn't silently dropped. Safe to call multiple times.
   */
  flushPending(): void {
    try {
      while (this.pendingSourceFinals.length > 1) {
        this.callbacks.onSegment?.(this.pendingSourceFinals.shift()!, "");
      }
      const tgt = this.provisionalBuffer;
      const src = this.pendingSourceFinals.shift() ?? this.sourceBuffer;
      this.provisionalBuffer = "";
      this.sourceBuffer = "";
      if (tgt || src) this.callbacks.onSegment?.(src, tgt);
    } catch {
      /* ignore */
    }
  }

  disconnect(): void {
    if (!this.ws) {
      this.connected = false;
      return;
    }
    // Commit any pending audio so the tail of the last sentence still gets
    // translated. Only useful if the window had real speech.
    if (this.hasAudioInWindow && this.windowMs > 0) this.commitTurn();
    this.connected = false;
    this.flushPending();
    try {
      this.ws.close(1000, "User disconnected");
    } catch {
      /* ignore */
    }
    this.ws = null;
    this.outputQueue?.flush();
  }

  private handleServerEvent(data: Record<string, unknown>): void {
    const type = data.type as string | undefined;
    if (!type) return;
    if (__DEV__) console.log("[qwen-realtime] evt:", type);

    switch (type) {
      case "session.created":
      case "session.updated":
      case "response.created":
      case "response.done":
        break;

      case "conversation.item.input_audio_transcription.completed": {
        const text =
          (data.transcript as string) ?? (data.text as string) ?? "";
        if (text) {
          this.pendingSourceFinals.push(text);
          this.sourceBuffer = "";
          this.callbacks.onSourceProvisional?.(text);
        }
        break;
      }

      case "conversation.item.input_audio_transcription.failed": {
        const err = (data.error ?? {}) as { code?: string; message?: string };
        this.callbacks.onError?.(
          "transcription_failed",
          err.message ?? "Transcription failed",
        );
        break;
      }

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
        // text + audio_transcript both finalize one response — emit once.
        if (responseId && responseId === this.lastDoneResponseId) break;
        this.lastDoneResponseId = responseId;

        const text =
          (data.text as string) ??
          (data.transcript as string) ??
          this.provisionalBuffer;
        const sourceText =
          this.pendingSourceFinals.shift() ?? this.sourceBuffer;
        this.provisionalBuffer = "";
        this.sourceBuffer = "";
        if (text || sourceText) {
          this.callbacks.onSegment?.(sourceText, text);
        }
        break;
      }

      case "response.audio.delta": {
        const b64 = data.delta as string | undefined;
        if (b64 && !this.muted) this.outputQueue?.push(b64);
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
        // Unknown / no-op event (input_audio_buffer.*, etc.) — keep parsing.
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

/** RMS amplitude of int16 little-endian PCM in an ArrayBuffer. */
function rmsInt16(buf: ArrayBuffer): number {
  const view = new DataView(buf);
  const n = Math.floor(buf.byteLength / 2);
  if (!n) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const s = view.getInt16(i * 2, true);
    sum += s * s;
  }
  return Math.sqrt(sum / n);
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
