import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { SonioxClient, type SonioxStatus } from "@/src/engines/soniox-client";
import { AudioCapture } from "@/src/lib/audio-capture";
import type { SessionStatus, TranscriptRow } from "@/src/types";
import { useSettings } from "@/src/state/settings-context";

interface SessionState {
  status: SessionStatus;
  rows: TranscriptRow[];
  errorMessage: string | null;
}

interface SessionActions {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  clear: () => void;
}

const SessionContext = createContext<(SessionState & SessionActions) | null>(null);

const MAX_ROWS = 200;

export function SessionProvider({ children }: { children: ReactNode }) {
  const { engine, sonioxKey, openaiKey, sourceLang, targetLang } = useSettings();

  const [status, setStatus] = useState<SessionStatus>("idle");
  const [rows, setRows] = useState<TranscriptRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const rowsRef = useRef<TranscriptRow[]>([]);
  const captureRef = useRef<AudioCapture | null>(null);
  const sonioxRef = useRef<SonioxClient | null>(null);
  // Latest provisional row id we are mutating in place (cleared on final).
  const provisionalIdRef = useRef<string | null>(null);

  const replaceRows = (next: TranscriptRow[]) => {
    if (next.length > MAX_ROWS) next.splice(0, next.length - MAX_ROWS);
    rowsRef.current = next;
    setRows(next);
  };

  const pushRow = (row: TranscriptRow) => {
    replaceRows([...rowsRef.current, row]);
  };

  const upsertProvisional = (text: string) => {
    const id = provisionalIdRef.current;
    if (!text) {
      if (!id) return;
      // Drop the provisional row entirely on clear signal.
      const next = rowsRef.current.filter((r) => r.id !== id);
      provisionalIdRef.current = null;
      replaceRows(next);
      return;
    }
    if (id) {
      const next = rowsRef.current.map((r) =>
        r.id === id ? { ...r, translation: text } : r,
      );
      replaceRows(next);
    } else {
      const newId = `prov-${Date.now()}`;
      provisionalIdRef.current = newId;
      pushRow({
        id: newId,
        translation: text,
        isProvisional: true,
        timestamp: Date.now(),
      });
    }
  };

  const finalizeProvisional = () => {
    provisionalIdRef.current = null;
  };

  const mapSonioxStatus = (s: SonioxStatus): SessionStatus => {
    if (s === "connecting") return "connecting";
    if (s === "connected") return "streaming";
    if (s === "error") return "error";
    return "idle";
  };

  const cleanup = async () => {
    try {
      sonioxRef.current?.disconnect();
    } catch {
      /* ignore */
    }
    sonioxRef.current = null;
    try {
      await captureRef.current?.stop();
    } catch {
      /* ignore */
    }
    captureRef.current = null;
    provisionalIdRef.current = null;
  };

  const start = async () => {
    if (status === "streaming" || status === "connecting") return;
    setErrorMessage(null);

    if (engine !== "soniox") {
      setStatus("error");
      setErrorMessage("OpenAI Realtime — coming in phase 3");
      return;
    }
    if (!sonioxKey) {
      setStatus("error");
      setErrorMessage("Soniox API key missing — open Settings");
      return;
    }

    setStatus("connecting");

    const capture = new AudioCapture(16000);
    const granted = await capture.requestPermission();
    if (!granted) {
      setStatus("error");
      setErrorMessage("Microphone permission denied");
      return;
    }

    const client = new SonioxClient({
      onStatusChange: (s) => setStatus(mapSonioxStatus(s)),
      onError: (msg) => setErrorMessage(msg),
      onOriginal: (text) => {
        // Original (source) text — attach as `source` on the most recent translation
        // row if it is missing one; else append a new row.
        const last = rowsRef.current[rowsRef.current.length - 1];
        if (last && !last.isProvisional && !last.source) {
          const next = [...rowsRef.current];
          next[next.length - 1] = { ...last, source: text };
          replaceRows(next);
        } else {
          pushRow({
            id: `src-${Date.now()}`,
            source: text,
            translation: "",
            timestamp: Date.now(),
          });
        }
      },
      onTranslation: (text) => {
        finalizeProvisional();
        pushRow({
          id: `t-${Date.now()}`,
          translation: text,
          timestamp: Date.now(),
        });
      },
      onProvisional: (text) => {
        upsertProvisional(text);
      },
    });

    sonioxRef.current = client;
    captureRef.current = capture;

    try {
      await capture.start((pcm) => client.sendAudio(pcm));
    } catch (err) {
      setStatus("error");
      setErrorMessage((err as Error).message);
      await cleanup();
      return;
    }

    client.connect({
      apiKey: sonioxKey,
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
    });
  };

  const stop = async () => {
    setStatus("stopping");
    await cleanup();
    setStatus("idle");
  };

  const clear = () => {
    rowsRef.current = [];
    provisionalIdRef.current = null;
    setRows([]);
  };

  // Best-effort cleanup if the provider unmounts mid-session.
  useEffect(() => {
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Silence unused-var warning for openaiKey until phase 3.
  void openaiKey;

  return (
    <SessionContext.Provider
      value={{ status, rows, errorMessage, start, stop, clear }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
