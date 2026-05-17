import type { TranscriptRow } from "@/src/types";

// Caps keep each Keychain value well under the OS per-item ceiling. We persist
// only finals (no provisional), newest rows win, and long fields are trimmed.
export const MAX_SESSIONS = 20;
export const MAX_ROWS_PERSIST = 120;
export const MAX_FIELD_CHARS = 600;
export const PREVIEW_CHARS = 80;
// Summaries are paragraphs, not single fields — larger cap than MAX_FIELD_CHARS
// but still well under the Keychain per-item ceiling.
export const MAX_SUMMARY_CHARS = 2000;

export interface Blob {
  rows: TranscriptRow[];
  summary?: string;
}

// Blobs were originally stored as a bare TranscriptRow[]. New blobs are an
// envelope { rows, summary? }. Detect shape so old sessions keep loading.
export function normalizeBlob(parsed: unknown): Blob | null {
  if (Array.isArray(parsed)) return { rows: parsed as TranscriptRow[] };
  if (
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as Blob).rows)
  ) {
    const b = parsed as Blob;
    return { rows: b.rows, summary: b.summary };
  }
  return null;
}

export function trimField(v: string | undefined): string | undefined {
  if (v == null) return undefined;
  return v.length > MAX_FIELD_CHARS ? v.slice(0, MAX_FIELD_CHARS) : v;
}

export function sanitizeRows(rows: TranscriptRow[]): TranscriptRow[] {
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
