import type { TranscriptRow } from "@/src/types";

// Plain-text rendering of a session transcript. Final rows only; source line
// (when present) above its translation. Shared by share/export and the
// OpenAI summary feature.
export function formatTranscript(rows: TranscriptRow[]): string {
  return rows
    .filter((r) => !r.isProvisional && r.translation)
    .map((r) => (r.source ? `${r.source}\n${r.translation}` : r.translation))
    .join("\n\n");
}
