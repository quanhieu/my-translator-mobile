# Phase 1 — History storage layer

**OTA: SAFE** (pure JS over already-linked `expo-secure-store`, no new dep).

## Context links
- `reports/persistence-decision.md`
- Pattern source: `src/lib/secure-keys.ts`
- Data model: `src/types/index.ts` (`TranscriptRow`)

## Overview
Priority P2 · Status pending. Create the persistence module + types. No UI, no
session wiring yet (those are P2/P3). Pure, unit-testable functions.

## Key insights
- Reuse SecureStore (DRY with existing prefs layer). No AsyncStorage/file-system.
- Shard: `history.index` (array of meta) + `history.session.<id>` (full rows).
- Caps prevent Keychain oversize: `MAX_SESSIONS=20`, `MAX_ROWS_PERSIST=120`,
  `MAX_FIELD_CHARS=600`.

## Requirements
Functional: save a session, list session metas (newest first), get one
session's rows, delete one, clear all. Non-functional: never throw to caller —
return success boolean; enforce caps; idempotent.

## Architecture / data flow
```
saveSession(meta, rows)
  -> sanitize rows (drop provisional, trim fields to MAX_FIELD_CHARS,
                    head-truncate to MAX_ROWS_PERSIST keeping newest)
  -> SecureStore.set(history.session.<id>, JSON(rows))
  -> read index, prepend meta, evict >MAX_SESSIONS (delete evicted blobs)
  -> SecureStore.set(history.index, JSON(index))
  on set failure: retry halved -> drop oldest -> skip (return false)
```

`SessionMeta = { id, createdAt, engine, targetLang, rowCount, preview }`
(`preview` = first ~80 chars of first translation, for the list).

## Related code files
- Create: `src/lib/history-store.ts` (<200 lines)
- Modify: `src/types/index.ts` — append `SessionMeta`, `SavedSession` interfaces

## Implementation steps
1. Add `SessionMeta` and `SavedSession { meta; rows: TranscriptRow[] }` to `src/types/index.ts`.
2. New `src/lib/history-store.ts`:
   - Constants `MAX_SESSIONS`, `MAX_ROWS_PERSIST`, `MAX_FIELD_CHARS`, key prefixes.
   - `sanitizeRows(rows)`: filter `!isProvisional`, slice last N, trim source/translation.
   - `async saveSession(meta, rows): Promise<boolean>` with retry/evict logic.
   - `async listSessions(): Promise<SessionMeta[]>` (newest first; tolerate corrupt JSON → []).
   - `async getSession(id): Promise<SavedSession | null>`.
   - `async deleteSession(id): Promise<void>` (remove blob + index entry).
   - `async clearAllHistory(): Promise<void>` (delete all blobs + index).
3. Wrap every SecureStore call in try/catch; corrupt index → reset to `[]`.

## Todo
- [ ] Types appended to `src/types/index.ts`
- [ ] `history-store.ts` CRUD implemented with caps + retry
- [ ] Corrupt-JSON tolerance verified by reasoning/test
- [ ] `tsc --noEmit` passes

## Success criteria
- `saveSession` then `getSession` round-trips rows (minus provisional/trims).
- 21st save evicts oldest; its blob key is deleted.
- Corrupt index value → `listSessions()` returns `[]`, no throw.

## Risk assessment
| Risk | L×I | Mitigation |
|------|-----|------------|
| Value too large for Keychain | M×H | caps + retry-halved + drop-oldest fallback |
| Index/blob desync (orphan blobs) | L×L | delete blob before/with index update; clearAll sweeps by prefix |

## Rollback
Delete `src/lib/history-store.ts`; revert type append. No callers yet → zero blast radius.

## Next
Unblocks P2 (auto-save) and P3 (history screen read path).
