# Phase 4 — Export / share current session

**OTA: SAFE** — uses RN core `Share` API + `@react-native-clipboard` ONLY if
already present; default to RN `Share` (core, no dep). NO new native module.

## Context links
- `app/index.tsx` (Stop/Clear controls area, lines 53–89 toolbar)
- `src/state/session-context.tsx` (`rows`)

## Overview
Priority P2 · Status pending. A button to share/copy the current session's
transcript as plain text via the OS share sheet.

## Key insights
- React Native's built-in `Share.share({ message })` needs **no dependency** and
  no native config change → OTA-safe. Avoid `expo-sharing`/clipboard deps
  (would be a rebuild). Clipboard: RN core `Share` covers the share-sheet need;
  skip a dedicated copy button unless trivially free (YAGNI).
- Format transcript: one line per final row, `source` (if any) then translation.

## Requirements
Functional: when rows exist and not live, a "Share" button opens the OS share
sheet with the transcript text. Non-functional: disabled when no rows or while
streaming/connecting.

## Architecture / data flow
```
formatTranscript(rows) -> string
  rows.filter(final & translation)
      .map(r => r.source ? `${r.source}\n${r.translation}` : r.translation)
      .join("\n\n")
onPress -> Share.share({ message: text })  (RN core)
```

## Related code files
- Modify: `app/index.tsx` — add Share `Pressable` in the existing toolbar Row
  (next to Clear). SINGLE-WRITER: P4 edits index.tsx AFTER P3.
- Optional helper: inline `formatTranscript` in index.tsx (small) OR
  `src/lib/transcript-format.ts` if reused by P5 (DRY — P5 also needs plain
  text). **Recommended: create `src/lib/transcript-format.ts` and share with P5.**

## Implementation steps
1. Create `src/lib/transcript-format.ts` exporting
   `formatTranscript(rows: TranscriptRow[]): string` (final rows only).
2. In `app/index.tsx` import `Share` from `react-native` and `formatTranscript`.
3. Add a "Share" Pressable in the left toolbar group (mirror Clear styling),
   `disabled` when `rows.length===0 || isLive`; onPress →
   `Share.share({ message: formatTranscript(rows) })` wrapped in try/catch.

## Todo
- [ ] `src/lib/transcript-format.ts` created (shared with P5)
- [ ] Share button added, correct disabled states
- [ ] No new dependency added (verified in package.json diff = none)
- [ ] `tsc --noEmit` + lint pass

## Success criteria
- Share button opens OS share sheet with readable transcript text.
- Disabled with 0 rows or while live.
- `git diff package.json` empty → OTA-safe confirmed.

## Risk assessment
| Risk | L×I | Mitigation |
|------|-----|------------|
| Temptation to add expo-sharing/clipboard | M×H | Spec mandates RN core `Share`; reject deps in review |
| Empty/huge message | L×L | Disabled when empty; transcript already capped by MAX_ROWS upstream |

## Rollback
Remove Share button + import in index.tsx; `transcript-format.ts` harmless if
P5 still uses it, else delete.

## Next
P5 reuses `formatTranscript`.
