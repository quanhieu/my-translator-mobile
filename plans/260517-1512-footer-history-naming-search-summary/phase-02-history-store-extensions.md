# Phase 02 — History Store & Type Extensions (foundation)

## Overview
- Priority: P2 | Status: pending | Effort: ~45m
- Add optional `name?` to `SessionMeta` and `summary?` to the per-session blob.
- Add `renameSession(id, name)` + `saveSummary(id, summary)` to history-store.
- Foundation for phases 3 & 5. Blocks 3, 4, 5. Independent of phase 1.

## OTA-Safety Statement
PASS. Pure TypeScript — type fields + two `SecureStore` mutator functions.
No native dep, no config. OTA-safe.

## Data-Flow / Design Decisions
- `name?: string` → on `SessionMeta` (the small INDEX). Names are short, shown
  in the list without loading the blob. Acceptable index growth (≤ a few dozen
  chars/entry, 20 sessions cap).
- `summary?: string` → NOT on the index (would bloat it). Lives WITH the rows
  blob. Cleanest: change the blob payload from a bare `TranscriptRow[]` to an
  envelope `{ rows: TranscriptRow[]; summary?: string }`.
  - **Backwards compat:** existing blobs are a JSON array. `getSession` must
    detect shape: if parsed is `Array` → `{ rows: parsed, summary: undefined }`;
    if object with `.rows` array → use as-is. Old sessions keep working
    (forward + backward compatible). Document this branch in `getSession`.
- `SavedSession` type unchanged externally: keep `{ meta, rows }` and add
  optional `summary?: string` to it so detail view can read it.

## Files
- MODIFY `src/types/index.ts`:
  - `SessionMeta`: add `name?: string`.
  - `SavedSession`: add `summary?: string`.
  - (No new exported blob type needed — internal to history-store.)
- MODIFY `src/lib/history-store.ts` (currently 145 lines; additions ~+45):
  - Internal helper to read/normalize blob shape (array | envelope).
  - `saveSession`: write envelope `{ rows: sanitized }` (preserve any existing
    summary if re-saving same id — not needed for live stop() path; keep simple:
    new save = no summary). Update read path accordingly.
  - `getSession`: return `{ meta, rows, summary }` via shape detection.
  - NEW `renameSession(id, name)`: read index, map matching meta →
    `{ ...m, name: trimmed || undefined }`, `writeIndex`. Tolerate corrupt
    index (reuse `readIndex` try/catch). Return `boolean`. Trim name to
    `MAX_FIELD_CHARS` via existing `trimField`. Empty/whitespace name clears it.
  - NEW `saveSummary(id, summary)`: read blob, normalize to envelope, set
    `summary` (trimmed to a cap, e.g. reuse 600 or a `MAX_SUMMARY_CHARS=2000`
    constant — summaries are longer than fields; pick 2000, document why),
    re-`setItemAsync`. If blob missing → return false (can't summarize a
    session with no rows). Wrap in try/catch, never throw.

## Steps
1. Edit `types/index.ts`: add the two optional fields.
2. Add `MAX_SUMMARY_CHARS = 2000` constant + comment in history-store.
3. Add `normalizeBlob(parsed): { rows; summary }` internal helper.
4. Refactor `saveSession` blob write to envelope; keep retry/shrink logic
   (shrink still operates on `rows`).
5. Refactor `getSession` to use `normalizeBlob`; return `summary`.
6. Implement `renameSession`, `saveSummary` following the never-throw,
   corrupt-tolerant pattern.
7. `npx tsc --noEmit` clean.

## Todo
- [ ] `SessionMeta.name?`, `SavedSession.summary?`
- [ ] `normalizeBlob` shape-detection helper
- [ ] `saveSession` writes envelope, retry logic intact
- [ ] `getSession` reads both shapes, returns `summary`
- [ ] `renameSession(id, name)` corrupt-tolerant, returns boolean
- [ ] `saveSummary(id, summary)` corrupt-tolerant, returns boolean
- [ ] Typecheck clean

## Success Criteria
- Old array-shaped blobs still load (no data loss for existing users).
- New saves use envelope; summary survives app restart.
- Rename updates only the index (no blob touch).
- All mutators return false (not throw) on corrupt/missing data.
- history-store.ts ≤ ~200 lines (it will be ~190; if over, extract
  `history-blob.ts` for normalize/sanitize helpers — note as fallback).

## Risks
| Risk | L | I | Mitigation |
|---|---|---|---|
| Envelope migration loses old sessions | Med | High | Shape-detection branch in `getSession`; never rewrite old blob unless `saveSummary` called. |
| history-store.ts > 200 lines | Med | Low | Extract `history-blob.ts` helpers if needed. |
| Summary too large for Keychain item | Low | Med | `MAX_SUMMARY_CHARS=2000` cap before write. |

## Backwards Compatibility
Old installs (pre-OTA) ignore unknown `name`/`summary` fields. New code reads
old array blobs. Reverting the OTA bundle: new fields silently ignored, no
crash. Fully forward+backward compatible.
