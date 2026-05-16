# Phase 3 — History screen + detail view

**OTA: SAFE** (new JS route + components; Expo Router file-based, no native).

## Context links
- `phase-01` (read path), `phase-02` (data producer)
- `app/_layout.tsx` (Stack registration pattern)
- `app/settings.tsx` (modal screen pattern, SafeAreaView/NativeWind style)
- `src/components/transcript-stream.tsx` (reuse for detail render)
- `app/index.tsx` Header (entry-point button placement)

## Overview
Priority P2 · Status pending. Add `app/history.tsx` (list) and a detail view of
one saved session. Add a History entry point in the main screen header.

## Key insights
- Expo Router: new file in `app/` = new route; register `<Stack.Screen>` in
  `_layout.tsx` (modal like settings or push — use push for drill-down).
- Detail can reuse `TranscriptStream` with `panelMode="single"` and a fixed
  `fontSize` (e.g. settings `fontSize`) since it accepts `TranscriptRow[]`.
- KISS: one screen with two states (list ⇄ selected detail) OR two routes.
  Choose **one route `app/history.tsx`** with local `selectedId` state — fewer
  files, no param plumbing (YAGNI on deep-linking individual sessions).

## Requirements
Functional: list saved sessions newest-first (preview, time, engine, row count);
tap → detail (full transcript, read-only); per-row delete; "Clear all" with
confirm. Empty state when none. Non-functional: list loads on focus; deletes
reflect immediately.

## Architecture / data flow
```
history.tsx mount/useFocusEffect -> listSessions() -> metas state
tap meta -> getSession(id) -> selected {meta, rows} -> render TranscriptStream
delete -> Alert confirm -> deleteSession(id) -> refresh metas
clear all -> Alert confirm -> clearAllHistory() -> metas=[]
```

## Related code files
- Create: `app/history.tsx` (<200 lines; split row item into local component if near limit)
- Modify: `app/_layout.tsx` — add `<Stack.Screen name="history" .../>`
- Modify: `app/index.tsx` — add a 🕘/“History” pressable in `Header` next to ⚙️
  (SINGLE-WRITER: P3 edits index.tsx first per plan.md ownership rule)

## Implementation steps
1. `app/history.tsx`: SafeAreaView + header; `metas` state; load via
   `useFocusEffect(useCallback(...))` calling `listSessions()`.
2. List: `FlatList` of metas → row shows preview, `new Date(createdAt)` time,
   engine, rowCount; trailing delete (🗑) with `Alert` confirm.
3. `selected` state: on tap `getSession(id)`; render `<TranscriptStream rows=
   {selected.rows} fontSize={fontSize} panelMode="single" />` with a Back control.
4. "Clear all" button (red, mirrors settings.tsx destructive style) → confirm →
   `clearAllHistory()`.
5. Empty state text when `metas.length === 0`.
6. `_layout.tsx`: add `<Stack.Screen name="history" options={{ headerShown:
   true, title: "History" }} />`.
7. `app/index.tsx` Header: add `<Link href="/history" asChild><Pressable>…🕘…
   </Pressable></Link>` left of the ⚙️ link (match existing hitSlop/className).

## Todo
- [ ] `app/history.tsx` list + detail + clear-all
- [ ] Route registered in `_layout.tsx`
- [ ] History entry button in `app/index.tsx` Header
- [ ] Reuses `TranscriptStream` (no duplicate render logic — DRY)
- [ ] Empty state present
- [ ] `tsc --noEmit` + `expo lint` pass

## Success criteria
- After a real session (P2), it shows in History list with correct preview/time.
- Tap → full transcript renders read-only via TranscriptStream.
- Delete one → it disappears and stays gone after app restart.
- Clear all → empty state.

## Risk assessment
| Risk | L×I | Mitigation |
|------|-----|------------|
| `history.tsx` exceeds 200 lines | M×M | Extract `<SessionListItem>` to same file or `src/components/history-list-item.tsx` |
| Stale list after returning from detail/Stop | M×M | `useFocusEffect` reload, not mount-only |
| TranscriptStream auto-scroll quirks on static data | L×L | Acceptable; data static so it just pins to bottom once |

## Rollback
Delete `app/history.tsx`; revert the 2 lines in `_layout.tsx` and the Header
button in `index.tsx`. Storage + autosave remain (inert without UI).

## Next
P4 and P5 also edit `app/index.tsx` — must run AFTER P3 per single-writer rule.
