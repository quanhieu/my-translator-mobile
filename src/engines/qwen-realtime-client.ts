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
 * Unlike OpenAI's dedicated /realtime/translations endpoint, Qwen-Omni is a
 * general omni model: translation is driven by an `instructions` system prompt,
 * source language is auto-detected by the STT layer. Server VAD auto-commits
 * the input buffer and auto-triggers a response, so the streaming flow matches
 * the OpenAI client (no manual commit / response.create).
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
            `You are a real-time translator. Translate everything you hear into ` +
            `${cfg.targetLanguageName}. Output ONLY the translation — no commentary, ` +
            `no source text, no explanations.`,
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            silence_duration_ms: 800,
          },
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
