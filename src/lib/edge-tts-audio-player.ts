/**
 * Audio player for Edge TTS MP3 output using expo-audio.
 * Queue-based playback for sequential TTS segments.
 */

import { AudioPlayer, createAudioPlayer } from "expo-audio";
import Constants from "expo-constants";
import { File, Paths } from "expo-file-system";

const isSimulator = !Constants.isDevice;

export class EdgeTTSAudioPlayer {
  private queue: string[] = [];
  private isPlaying = false;
  private currentPlayer: AudioPlayer | null = null;
  private enabled = true;

  async enqueue(base64Mp3: string): Promise<void> {
    if (!this.enabled || !base64Mp3) return;

    // Skip playback on iOS Simulator - audio subsystem crash kills mic capture.
    // Real devices handle play+record audio session correctly.
    if (isSimulator) {
      console.log("[TTS-Player] Simulator: skip playback (audio crash kills STT)");
      return;
    }

    this.queue.push(base64Mp3);
    if (!this.isPlaying) {
      this.playNext();
    }
  }

  private async playNext(): Promise<void> {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const b64 = this.queue.shift()!;
    let finished = false;
    let file: File | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (finished) return;
      finished = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      try {
        this.currentPlayer?.release();
      } catch { /* ignore */ }
      try {
        if (file?.exists) file.delete();
      } catch { /* ignore */ }
      this.currentPlayer = null;
      // Use setTimeout to avoid blocking and potential stack overflow
      setTimeout(() => this.playNext(), 0);
    };

    try {
      file = new File(Paths.cache, `tts-${Date.now()}.mp3`);
      if (file.exists) file.delete();
      file.create();
      file.write(b64, { encoding: "base64" });

      const player = createAudioPlayer({ uri: file.uri });
      this.currentPlayer = player;

      // Estimate duration from MP3 size (48kbps = 6KB/s), min 2s, max 30s
      const estimatedDurationMs = Math.min(30000, Math.max(2000, (b64.length * 0.75 / 6000) * 1000 + 500));
      fallbackTimer = setTimeout(() => {
        console.log("[TTS-Player] Fallback timeout, moving to next");
        cleanup();
      }, estimatedDurationMs);

      player.addListener("playbackStatusUpdate", (status) => {
        if (status.didJustFinish) {
          cleanup();
        }
      });

      player.play();
    } catch (err) {
      // Graceful fallback: log error, cleanup, continue with next item
      console.warn("[TTS-Player] Play error (continuing):", (err as Error).message);
      cleanup();
    }
  }

  async stop(): Promise<void> {
    this.queue = [];
    if (this.currentPlayer) {
      try {
        this.currentPlayer.pause();
        this.currentPlayer.release();
      } catch {
        /* ignore */
      }
      this.currentPlayer = null;
    }
    this.isPlaying = false;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  get active(): boolean {
    return this.isPlaying || this.queue.length > 0;
  }
}

export const edgeTTSPlayer = new EdgeTTSAudioPlayer();
