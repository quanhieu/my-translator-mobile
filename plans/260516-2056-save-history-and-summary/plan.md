---
title: "Session history (auto-save + export) and OpenAI summary"
description: "Persist translation sessions to device, add history screen + share/export, and an end-of-session OpenAI summary button."
status: pending
priority: P2
effort: 9h
branch: feature/openai-realtime
tags: [mobile, expo, history, openai, ota-safe]
created: 2026-05-16
---

# Session History + OpenAI Summary

Two JS-only features for the Expo RN app, designed to ship via **EAS Update (OTA)** —
zero new native deps, no `app.json` native-key/permission changes.

## Persistence decision (OTA-critical)

`package.json` has **no** AsyncStorage and **no** expo-file-system. Only
`expo-secure-store` is present (already used by `src/lib/secure-keys.ts` for
keys + prefs).

- Adding AsyncStorage or expo-file-system = **new native module → full rebuild +
  `expo.version` bump, NOT OTA** (eas-update-guide.md §3).
- Reusing the already-linked `expo-secure-store` from JS is **OTA-safe**.

**Chosen approach:** store history in `expo-secure-store` using a chunked
scheme — one key per session (`history.session.<id>`) plus one index key
(`history.index`). Hard caps keep each value under the iOS Keychain
per-item limit: max **20 sessions**, max **120 rows/session**, oldest evicted
first. This honours YAGNI/DRY (one storage layer, mirrors existing
`secure-keys.ts` pattern) and is 100% OTA-safe. See
`reports/persistence-decision.md` for the size math and the rejected
alternatives.

## Phases

| # | Phase | OTA | Effort | Status |
|---|-------|-----|--------|--------|
| 1 | [History storage layer](phase-01-history-storage.md) — types + secure-store CRUD + caps | OTA-safe | 2h | pending |
| 2 | [Auto-save on Stop](phase-02-autosave-on-stop.md) — hook session-context cleanup→persist | OTA-safe | 1.5h | pending |
| 3 | [History screen + detail](phase-03-history-screen.md) — `app/history.tsx` list + detail, route wiring | OTA-safe | 2.5h | pending |
| 4 | [Export / share current session](phase-04-export-share.md) — RN Share + clipboard, no new dep | OTA-safe | 1h | pending |
| 5 | [OpenAI summary](phase-05-openai-summary.md) — fetch client + Summarize UI on Stop | OTA-safe | 2h | pending |

## Dependency graph

```
P1 (storage) ──> P2 (autosave) ──> P3 (history screen)
   └────────────────────────────> P3 (detail reuses transcript-stream)
P4 (export) ── independent, depends only on existing rows ──┐
P5 (summary) ── independent (settings.openaiKey + rows) ────┤
                                                            P3/P4/P5 all touch app/index.tsx
```

**Serialization constraint:** P3, P4, P5 each add UI to `app/index.tsx`. To
avoid edit collisions do them sequentially (P3 → P4 → P5) OR have one owner for
`app/index.tsx`. P1, P2 do not touch `app/index.tsx` and can precede freely.

## File ownership (no parallel collisions)

| File | Owned by phase |
|------|----------------|
| `src/types/index.ts` | P1 (append only) |
| `src/lib/history-store.ts` (new) | P1 |
| `src/state/session-context.tsx` | P2 |
| `app/history.tsx` (new), `app/_layout.tsx` | P3 |
| `src/components/session-summary.tsx` (new) | P5 |
| `src/lib/openai-summary.ts` (new) | P5 |
| `app/index.tsx` | P3 then P4 then P5 (sequential single-writer) |

## Global success criteria

- Sessions auto-persist on Stop; survive app restart; visible in History.
- Caps enforced (≤20 sessions, ≤120 rows); no SecureStore size errors.
- Export produces shareable plain text of current transcript.
- Summarize button: with OpenAI key → summary in target language; without key →
  helpful message. Works regardless of which engine ran the session.
- `expo install --check` reports no new native module; OTA publishable.

## Cross-cutting risks

| Risk | L×I | Mitigation |
|------|-----|------------|
| SecureStore value exceeds Keychain item limit | M×H | Hard row/char caps + try/catch + truncation fallback (P1) |
| Accidental new native dep slips in | L×H | Per-phase OTA gate + `expo install --check` in P5 success criteria |
| `app/index.tsx` triple-edit conflict | M×M | Single-writer sequential rule above |
| Auto-save fires on empty/aborted session | M×L | Skip persist when 0 final rows (P2) |
| Summary cost / latency on huge transcript | M×M | Truncate transcript to ~12k chars before send (P5) |

See per-phase files for detailed steps, todos, and rollback.
