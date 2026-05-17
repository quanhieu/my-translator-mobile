---
title: "Settings footer + history naming, search & persisted summary"
description: "Four OTA-safe mobile features: PR footer, session rename, history search, persisted OpenAI summary"
status: pending
priority: P2
effort: 5h
branch: main
tags: [mobile, expo, history, settings, ota]
created: 2026-05-17
---

# Settings Footer + History Naming, Search & Persisted Summary

Four small JS/asset-only features for the Expo mobile app at
`/Users/phucnt/workspace/my-translator-mobile`. All four ship via `eas update`
(no rebuild). No new native deps, no `app.json`/`package.json`/permission edits.

## OTA-Safety Summary (HARD CONSTRAINT — all PASS)

| Feature | Native touch? | OTA-safe | Note |
|---|---|---|---|
| 1 Settings footer | none | YES | `Linking` (RN core) + `expo-constants` (already dep `~18.0.13`, bundled w/ SDK 54 — no native change). No `expo-web-browser`. |
| 2 Session naming | none | YES | JS-only type field + store mutator + UI. `Alert.prompt` (RN core, iOS-only) w/ cross-platform fallback. |
| 3 History search | none | YES | Pure client-side in-memory filter. Zero storage change. |
| 4 Persist summary | none | YES | JS-only blob field + store mutator + UI. Reuses existing `fetch` summary path. |

`expo-constants` confirmed in `package.json` (`~18.0.13`). It ships with Expo
SDK 54; reading `Constants.expoConfig?.version` is a pure-JS API call — **no
native change, fully OTA-safe** per `docs/eas-update-guide.md` §3 checklist
(no new dep, no app.json, no SDK bump).

## Summary-Correlation Decision (Feature 4 nuance)

**Chosen: persist summary ONLY from the History detail view. Live screen stays
ephemeral (unchanged).**

Justification (YAGNI / KISS):
- The live `SessionSummary` reads `useSession()` rows; the just-persisted
  session id is generated inside `session-context.tsx` `stop()` and is *not*
  exposed. Wiring last-saved-id through context = cross-screen state + a new
  failure mode (id stale if user starts a new session) for marginal value.
- A finished session is always reachable in History within seconds. Letting the
  user generate+save the summary there is one extra tap, fully correct, and
  needs **zero** session-context changes.
- Net: feature 4 touches only `history-store.ts`, `types`, `app/history.tsx`,
  `session-summary.tsx` (made reusable). Live screen behavior unchanged → no
  regression risk on the hot translation path.

Rejected alternatives: (a) expose `lastSavedSessionId` from session-context —
adds cross-screen coupling, stale-id edge cases; (b) match by rows/timestamp —
fragile heuristic. Both violate KISS for no real user gain.

## Phases

| # | Phase | Status | One-line |
|---|---|---|---|
| 1 | [phase-01-settings-footer.md](phase-01-settings-footer.md) | pending | New `settings-footer.tsx` component; render below Clear-all. Independent file owner. |
| 2 | [phase-02-history-store-extensions.md](phase-02-history-store-extensions.md) | pending | Add `name?`/`summary?` to types + `renameSession`/`saveSummary` store mutators (shared foundation for 3–5). |
| 3 | [phase-03-session-naming-ui.md](phase-03-session-naming-ui.md) | pending | List item shows name; detail view rename affordance (cross-platform). |
| 4 | [phase-04-history-search.md](phase-04-history-search.md) | pending | Search bar component + client-side filter in `app/history.tsx`. |
| 5 | [phase-05-persist-summary-ui.md](phase-05-persist-summary-ui.md) | pending | Reusable summary component; show saved summary in detail view, save on generate. |

## Single-Writer Sequencing (shared files)

- `app/history.tsx` is touched by phases 3, 4, 5 → **must run sequentially in
  that order** (no parallel). Each phase ends with file < 200 lines via
  extraction.
- `src/types/index.ts` + `src/lib/history-store.ts` touched by phase 2 only
  (foundation), then read-only consumers in 3 & 5.
- `app/settings.tsx` + new `settings-footer.tsx` touched by phase 1 only →
  **phase 1 is fully independent**, may run in parallel with phase 2.
- `src/components/session-summary.tsx` touched by phase 5 only.

Dependency graph:
```
Phase 1 (settings)        ── independent ──┐
Phase 2 (store+types) ──┬─ Phase 3 (naming UI) ──┐
                        │                        ├─ Phase 4 (search) ── Phase 5 (summary UI)
                        └────────────────────────┘   (history.tsx single-writer chain: 3→4→5)
```

## Global Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `app/history.tsx` exceeds 200 lines after 3 features | High | Med | Extract `history-search-bar.tsx`, `session-detail-view.tsx`; phase 4/5 budget the line count, verify after each. |
| Corrupt SecureStore index breaks new mutators | Med | High | New mutators reuse `readIndex()` try/catch pattern; never throw, return boolean. |
| `Alert.prompt` is iOS-only → Android rename broken | High | Med | Platform-branched: `Alert.prompt` (iOS) vs inline modal `TextInput` (Android). Phase 3 spec'd. |
| OTA rejected if a phase sneaks a native change | Low | High | Each phase has an explicit OTA-safety statement + pre-publish checklist gate. |

## Rollback

Per `docs/eas-update-guide.md` §7: republish prior good bundle to channel, or
expo.dev dashboard promote previous update. All four are additive (optional
fields, new components) — reverting the bundle fully reverts behavior; persisted
`name`/`summary` fields are simply ignored by older code (forward-compatible).

## Test Matrix

| Layer | What |
|---|---|
| Unit (logic) | `renameSession`/`saveSummary` corrupt-index tolerance; search filter case-insensitive substring. |
| Integration | Rename persists across History re-focus; saved summary survives app restart (SecureStore). |
| Manual E2E | iOS + Android: footer links open external browser; rename on both platforms; search filters live; summary saved then viewed offline (no OpenAI call). |

## Unresolved Questions

See end of `phase-03` and `phase-05`.
