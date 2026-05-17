# Phase 04 — History Search

## Overview
- Priority: P3 | Status: pending | Effort: ~40m
- Search bar above the History list; client-side filter of loaded `metas`.
- **Depends on Phase 3** (single-writer `app/history.tsx`; runs after 3).
- Uses `SessionMeta.name` from Phase 2 in the match.

## OTA-Safety Statement
PASS. Pure client-side in-memory filter + RN core `TextInput`. Zero storage
change, no dep. OTA-safe.

## Files
- CREATE `src/components/history-search-bar.tsx` (~30 lines): controlled
  `TextInput`, props `{ value, onChangeText }`, NativeWind styled, clear "✕"
  affordance optional (KISS — plain input ok). Keeps `app/history.tsx` small.
- MODIFY `app/history.tsx`:
  - `const [query, setQuery] = useState("")`.
  - Derived `filtered = useMemo(...)`: empty/whitespace query → `metas`;
    else case-insensitive substring over `meta.name ?? ""` and `meta.preview`.
  - Render `<HistorySearchBar>` between the top header bar and the `FlatList`
    (only when `metas.length > 0`; hide on empty state).
  - `FlatList data={filtered}`. Add an empty-results message when
    `filtered.length === 0 && query` ("No matches").

## Steps
1. Create `history-search-bar.tsx`.
2. `app/history.tsx`: add `query` state, `useMemo` filter.
3. Insert search bar in list view (not detail view).
4. Swap `FlatList data` to `filtered`; add no-match message.
5. Line-count check: net ~+15. If `app/history.tsx` ≥ 200 → trigger the
   Phase 5 `session-detail-view.tsx` extraction early (the detail branch is the
   largest extractable block). Note dependency.
6. `npx tsc --noEmit` clean.

## Todo
- [ ] `history-search-bar.tsx` created
- [ ] `query` state + `useMemo` case-insensitive filter (name + preview)
- [ ] Search bar rendered above list, hidden on empty history
- [ ] No-match message
- [ ] Typecheck clean; history.tsx < 200 lines

## Success Criteria
- Typing filters list live (case-insensitive, matches name OR preview).
- Empty query shows all.
- No-match shows a message, not a blank screen.
- No storage reads/writes triggered by typing.
- `app/history.tsx` < 200 lines.

## Risks
| Risk | L | I | Mitigation |
|---|---|---|---|
| Filter recomputed each keystroke on large list | Low | Low | `useMemo` keyed on `[metas, query]`; max 20 sessions (capped) → trivial. |
| history.tsx exceeds 200 lines | Med | Med | Extract `session-detail-view.tsx` (shared w/ Phase 5) when hit. |
