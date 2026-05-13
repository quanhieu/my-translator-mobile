import { createContext, useContext, useRef, useState, type ReactNode } from "react";

import type { SessionStatus, TranscriptRow } from "@/src/types";

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
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [rows, setRows] = useState<TranscriptRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const rowsRef = useRef<TranscriptRow[]>([]);

  const pushRow = (row: TranscriptRow) => {
    const next = [...rowsRef.current, row];
    if (next.length > MAX_ROWS) next.splice(0, next.length - MAX_ROWS);
    rowsRef.current = next;
    setRows(next);
  };

  const start = async () => {
    setErrorMessage(null);
    setStatus("connecting");
    // Phase 2/3 will wire engines here.
    setStatus("streaming");
    // Demo placeholder row so the UI is not empty during dev:
    pushRow({
      id: String(Date.now()),
      translation: "(Phase 1 stub — engines not yet wired)",
      timestamp: Date.now(),
    });
  };

  const stop = async () => {
    setStatus("stopping");
    setStatus("idle");
  };

  const clear = () => {
    rowsRef.current = [];
    setRows([]);
  };

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
