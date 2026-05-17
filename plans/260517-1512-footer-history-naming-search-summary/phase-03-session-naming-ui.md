# Phase 03 — Session Naming UI

## Overview
- Priority: P2 | Status: pending | Effort: ~1h
- Show custom name in list; rename affordance in detail view.
- **Depends on Phase 2** (`renameSession`, `SessionMeta.name`).
- **First writer of `app/history.tsx` in the 3→4→5 chain.**

## OTA-Safety Statement
PASS. JS-only: store call + UI. `Alert.prompt` is RN core (iOS-only API, not a
native dep). Android path uses RN core `Modal`+`TextInput`. OTA-safe.

## Files
- MODIFY `src/components/history-list-item.tsx` (~45 lines): if `meta.name`,
  render it as the primary line (replacing/above the date/time line). Keep
  preview as secondary, or name → primary, `formatWhen · engine · lines` →
  secondary. KISS: when `name` set, show `name` bold + meta sub-line; else
  current behavior unchanged.
- CREATE `src/components/rename-session-modal.tsx` (~70 lines): cross-platform
  rename. Controlled `Modal` (RN core) w/ `TextInput`, Save/Cancel. Used on
  BOTH platforms for consistency (simpler than branching `Alert.prompt`; KISS —
  one code path, predictable, no iOS-only divergence). *Decision: skip
  `Alert.prompt` entirely → single cross-platform modal.*
- MODIFY `app/history.tsx`: in the `selected` detail header add a "Rename"
  Pressable; manage modal open state; on save call `renameSession(id, name)`
  then `refresh()` and update `selected.meta.name` locally (or re-`getSession`).

## Steps
1. `history-list-item.tsx`: branch on `meta.name`.
2. Create `rename-session-modal.tsx`: props `{ visible, initialName, onCancel,
   onSubmit(name) }`. Local `TextInput` state seeded from `initialName`.
   NativeWind styled, dark-mode aware, matches existing zinc palette.
3. `app/history.tsx`: add `renaming` boolean state; "Rename" Pressable in
   detail header (next to "lines" count); render `<RenameSessionModal>`.
4. onSubmit → `await renameSession(selected.meta.id, name)`; update local
   `selected` (`setSelected({ ...selected, meta: { ...selected.meta, name } })`)
   and `refresh()` so list reflects it on back.
5. Check `app/history.tsx` line count (will grow ~+25). If approaching 200,
   defer detail-view extraction to Phase 5 (which already plans
   `session-detail-view.tsx`). Note current ~129 → safe this phase.
6. `npx tsc --noEmit` clean.

## Todo
- [ ] List item shows name when set, fallback unchanged
- [ ] `rename-session-modal.tsx` cross-platform
- [ ] Rename Pressable + modal wired in detail view
- [ ] `renameSession` called, list + detail update
- [ ] Typecheck clean

## Success Criteria
- Set a name → visible in list immediately on back, persists across re-focus
  and app restart.
- Empty name clears it (falls back to date/time line).
- Works identically on iOS and Android (single modal path).
- `app/history.tsx` < 200 lines after this phase.

## Risks
| Risk | L | I | Mitigation |
|---|---|---|---|
| `Alert.prompt` iOS-only divergence | High | Med | Eliminated — single `Modal` path both platforms. |
| Stale `selected` after rename | Med | Low | Update local `selected.meta` + `refresh()`. |
| history.tsx line creep | Med | Low | Detail-view extraction deferred to Phase 5. |

## Unresolved Questions
- Q3.1: Name in list — replace the preview line, or add above it? Recommend:
  name = primary line, `date · engine · N lines` = sub-line, drop preview when
  named (less clutter). Confirm with user if preview should always remain.
