import * as SecureStore from "expo-secure-store";

import type { SavedSession, SessionMeta, TranscriptRow } from "@/src/types";

// Caps keep each Keychain value well under the OS per-item ceiling. We persist
// only finals (no provisional), newest rows win, and long fields are trimmed.
const MAX_SESSIONS = 20;
const MAX_ROWS_PERSIST = 120;
const MAX_FIELD_CHARS = 600;
const PREVIEW_CHARS = 80;

const INDEX_KEY = "history.index";
const sessionKey = (id: string) => `history.session.${id}`;

function trimField(v: string | undefined): string | undefined {
  if (v == null) return undefined;
  return v.length > MAX_FIELD_CHARS ? v.slice(0, MAX_FIELD_CHARS) : v;
}

function sanitizeRows(rows: TranscriptRow[]): TranscriptRow[] {
  const finals = rows.filter((r) => !r.isProvisional && r.translation);
  const recent =
    finals.length > MAX_ROWS_PERSIST
      ? finals.slice(finals.length - MAX_ROWS_PERSIST)
      : finals;
  return recent.map((r) => ({
    id: r.id,
    source: trimField(r.source),
    translation: trimField(r.translation) ?? "",
    timestamp: r.timestamp,
  }));
}

async function readIndex(): Promise<SessionMeta[]> {
  try {
    const raw = await SecureStore.getItemAsync(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SessionMeta[]) : [];
  } catch {
    return [];
  }
}

async function writeIndex(index: SessionMeta[]): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify(index));
    return true;
  } catch {
    return false;
  }
}

async function deleteBlob(id: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(sessionKey(id));
  } catch {
    /* ignore */
  }
}

// Persist one finished session. Never throws; returns false if the blob could
// not be stored even after shrinking + evicting the oldest session.
export async function saveSession(
  meta: SessionMeta,
  rows: TranscriptRow[],
): Promise<boolean> {
  let sanitized = sanitizeRows(rows);
  if (sanitized.length === 0) return false;

  const first = sanitized[0];
  const finalMeta: SessionMeta = {
    ...meta,
    rowCount: sanitized.length,
    preview: (first.translation || first.source || "").slice(0, PREVIEW_CHARS),
  };

  const stored = await (async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await SecureStore.setItemAsync(
          sessionKey(meta.id),
          JSON.stringify(sanitized),
        );
        return true;
      } catch {
        // Shrink (keep newest half) and retry; give up after a few rounds.
        if (sanitized.length <= 1) break;
        sanitized = sanitized.slice(Math.ceil(sanitized.length / 2));
        finalMeta.rowCount = sanitized.length;
      }
    }
    return false;
  })();

  if (!stored) return false;

  const index = await readIndex();
  const next = [finalMeta, ...index.filter((m) => m.id !== meta.id)];
  const evicted = next.splice(MAX_SESSIONS);
  await Promise.all(evicted.map((m) => deleteBlob(m.id)));

  const wroteIndex = await writeIndex(next);
  if (!wroteIndex) {
    await deleteBlob(meta.id);
    return false;
  }
  return true;
}

export async function listSessions(): Promise<SessionMeta[]> {
  return readIndex();
}

export async function getSession(id: string): Promise<SavedSession | null> {
  const index = await readIndex();
  const meta = index.find((m) => m.id === id);
  if (!meta) return null;
  try {
    const raw = await SecureStore.getItemAsync(sessionKey(id));
    if (!raw) return null;
    const rows = JSON.parse(raw);
    if (!Array.isArray(rows)) return null;
    return { meta, rows: rows as TranscriptRow[] };
  } catch {
    return null;
  }
}

export async function deleteSession(id: string): Promise<void> {
  await deleteBlob(id);
  const index = await readIndex();
  await writeIndex(index.filter((m) => m.id !== id));
}

export async function clearAllHistory(): Promise<void> {
  const index = await readIndex();
  await Promise.all(index.map((m) => deleteBlob(m.id)));
  try {
    await SecureStore.deleteItemAsync(INDEX_KEY);
  } catch {
    /* ignore */
  }
}
