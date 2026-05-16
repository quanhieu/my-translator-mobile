# Phase 2 — Auto-save session on Stop

**OTA: SAFE** (JS-only change inside an existing context).

## Context links
- `phase-01-history-storage.md` (must be done first)
- `src/state/session-context.tsx` (lines 123–181 `cleanup`, 332–336 `stop`)
- `src/state/settings-context.tsx` (`engine`, `targetLang`)

## Overview
Priority P2 · Status pending. Persist the just-finished session when the user
taps Stop, after `cleanup()` has promoted provisional rows to final.

## Key insights
- `stop()` calls `await cleanup()` then sets idle. After cleanup, `rowsRef.current`
  holds final rows — correct snapshot to persist.
- `clear()` must NOT delete history (only clears live rows). Leave clear() alone.
- Unmount cleanup (line 351-356) also calls `cleanup()` but NOT a real Stop —
  do NOT auto-save there (avoids saving on app backgrounding/navigation churn).

## Requirements
Functional: on explicit Stop with ≥1 final row, write a `SessionMeta` +
sanitized rows via `history-store.saveSession`. Non-functional: non-blocking
(don't delay UI returning to idle); failure is silent (logged only).

## Architecture / data flow
```
stop() -> setStatus("stopping") -> await cleanup()
       -> snapshot = rowsRef.current.filter(final & has translation)
       -> if snapshot.length === 0: skip
       -> build meta {id: `sess-${Date.now()}`, createdAt: Date.now(),
                       engine, targetLang, rowCount, preview}
       -> void saveSession(meta, snapshot)  // fire-and-forget, catch internally
       -> setStatus("idle")
```

## Related code files
- Modify: `src/state/session-context.tsx` only (add import + ~12 lines in `stop`)

## Implementation steps
1. Import `saveSession` from `@/src/lib/history-store` and `SessionMeta` type.
2. In `stop()` after `await cleanup()` and before `setStatus("idle")`:
   - Compute `finals = rowsRef.current.filter(r => !r.isProvisional && r.translation)`.
   - If empty → skip save.
   - Build meta (engine + targetLang from `useSettings()` already in scope, line 44).
   - `saveSession(meta, finals).catch(() => {})` — do not await-block UI.
3. Do NOT modify `clear()`, `cleanup()`, or the unmount effect.

## Todo
- [ ] Import added
- [ ] Save logic in `stop()` only, guarded by non-empty finals
- [ ] `clear()` / unmount path untouched (verified by reading diff)
- [ ] `tsc --noEmit` passes

## Success criteria
- Stop after a real session → session appears via `listSessions()`.
- Stop with zero rows → nothing persisted.
- Pressing Clear does not remove saved history.
- UI returns to idle without perceptible delay (save is fire-and-forget).

## Risk assessment
| Risk | L×I | Mitigation |
|------|-----|------------|
| Double-save (Stop then unmount) | M×M | Save only in `stop()`, never in unmount cleanup |
| Saving aborted/empty session | M×L | Skip when no final translation rows |
| Await blocks UI | L×M | Fire-and-forget `.catch()` |

## Rollback
Remove the import + the inserted block in `stop()`. History store stays inert.

## Next
Unblocks P3 (history screen shows real saved data).
