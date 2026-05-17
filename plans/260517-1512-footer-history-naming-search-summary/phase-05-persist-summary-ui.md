# Phase 05 — Persist & View Summary in History Detail

## Overview
- Priority: P2 | Status: pending | Effort: ~1h15m
- Show a saved summary in the History detail view (read-only, no OpenAI call);
  allow (re)generate if an OpenAI key exists, persisting the result.
- **Depends on Phase 2** (`saveSummary`, `SavedSession.summary`) and runs after
  Phase 4 (last writer of `app/history.tsx`).
- **Live screen unchanged** (correlation decision — see plan.md).

## Correlation Decision (recap)
Persist summary ONLY from History detail. Live `SessionSummary` stays
ephemeral. No `session-context.tsx` change. Justification: avoids cross-screen
last-saved-id coupling + stale-id edge cases for a one-extra-tap cost. (Full
rationale in `plan.md` → Summary-Correlation Decision.)

## Files
- MODIFY `src/components/session-summary.tsx` → make reusable:
  - Add props `{ rows, initialSummary?, onSaved?(text) }`.
  - Source rows from prop, NOT `useSession()` directly. Provide a thin wrapper
    for the live screen (`<SessionSummary />` keeps current behavior by reading
    `useSession()` and passing rows in — keep one default export + a presentational
    inner, OR add a `LiveSessionSummary` wrapper. KISS: rename inner to
    `SummaryPanel(props)`, keep `SessionSummary` as the live wrapper using
    `useSession()`; new History usage imports `SummaryPanel` directly.)
  - Seed `summary` state from `initialSummary`.
  - On successful generate: call `onSaved?.(text)`.
  - File currently 88 lines → stays < 200 after split (or split into
    `summary-panel.tsx` + keep `session-summary.tsx` wrapper if > 150).
- CREATE `src/components/session-detail-view.tsx` (~80 lines): extract the
  `selected` branch JSX from `app/history.tsx` (header w/ Back, lines count,
  Rename from Phase 3, `TranscriptStream`, and the new `SummaryPanel`). This
  extraction keeps `app/history.tsx` < 200 lines after all of 3+4+5.
- MODIFY `app/history.tsx`:
  - Replace inline `selected` branch with `<SessionDetailView session={selected}
    onBack onRenamed onSummarySaved />`.
  - On `onSummarySaved(text)` → `await saveSummary(selected.meta.id, text)`;
    update local `selected.summary`.
  - Final line-count verification < 200.

## Steps
1. Refactor `session-summary.tsx`: extract `SummaryPanel(props: { rows,
   initialSummary?, onSaved? })`; keep `SessionSummary` live wrapper.
2. `SummaryPanel`: if `initialSummary` present, render it immediately (no
   button auto-run); "Summarize again" still available when `openaiKey` set.
   When no key AND a saved summary exists → show summary read-only (no
   key-required message). When no key AND no summary → existing
   "Add an OpenAI key…" message.
3. Create `session-detail-view.tsx`: move detail JSX out of `app/history.tsx`;
   include Phase 3 Rename trigger + `SummaryPanel` with
   `initialSummary={session.summary}` and `onSaved`.
4. `app/history.tsx`: use `SessionDetailView`; wire `saveSummary` on save;
   keep `getSession` (now returns `summary`) feeding `selected`.
5. Verify `app/history.tsx`, `session-summary.tsx`, `session-detail-view.tsx`
   all < 200 lines.
6. `npx tsc --noEmit` clean.

## Todo
- [ ] `SummaryPanel` reusable (rows/initialSummary/onSaved props)
- [ ] `SessionSummary` live wrapper preserves current behavior
- [ ] `session-detail-view.tsx` extracted (Back, Rename, transcript, summary)
- [ ] Saved summary shown read-only without OpenAI key
- [ ] (Re)generate persists via `saveSummary`, updates local state
- [ ] All touched files < 200 lines; typecheck clean

## Success Criteria
- Generate summary in detail view → persists; reopen session (even offline /
  no key) shows it without an OpenAI request.
- "Summarize again" only shown when an OpenAI key exists.
- Live screen summary behavior **unchanged** (regression check).
- Old sessions (array blob, no summary) → no summary shown, generate works.
- `app/history.tsx` < 200 lines.

## Risks
| Risk | L | I | Mitigation |
|---|---|---|---|
| Refactor breaks live `SessionSummary` | Med | High | Keep `SessionSummary` wrapper w/ identical behavior; manual test live Stop→summary. |
| history.tsx still > 200 after wiring | Med | Med | `session-detail-view.tsx` extraction is the primary lever — mandatory this phase. |
| Saved summary lost on re-save of rows | Low | Med | `saveSession` (live stop) only writes fresh sessions; `saveSummary` preserves rows via `normalizeBlob`. No path overwrites summary except explicit regenerate. |

## Unresolved Questions
- Q5.1: Should regenerating overwrite an existing saved summary silently, or
  confirm? Recommend silent overwrite (KISS; user explicitly tapped
  "Summarize again"). Confirm with user.
- Q5.2: `formatTranscript(rows)` is used by live path. Detail view has
  `selected.rows` — confirm same `formatTranscript` import is fine (it is;
  pure fn). No action unless user wants different formatting in history.
