---
title: "EAS Update (OTA) Setup for My Translator Mobile"
description: "Enable OTA JS/asset updates via expo-updates + EAS Update on Expo SDK 54"
status: pending
priority: P2
effort: 3h
branch: feature/openai-realtime
tags: [expo, eas-update, ota, mobile, ci]
created: 2026-05-16
---

# EAS Update (OTA) Setup — My Translator Mobile

Enable shipping JS/asset updates without App Store re-review or APK rebuild.
Expo SDK 54 (`~54.0.33`), RN 0.81, Expo Router v6, projectId `260fa91a-49c1-44ae-b96a-f3de65e64e1f`.

## Recommended runtimeVersion policy

`{ "policy": "appVersion" }` — see phase-02 rationale. Safest given dual-platform
native builds, simple native surface (mic + secure-store only), and no Play Store
AAB (the SDK 54 AAB runtimeVersion bug does NOT apply — Android ships APK).

## Phases

| # | Phase | Status | Blocks |
|---|-------|--------|--------|
| 01 | Install + configure expo-updates | pending | — |
| 02 | app.json updates block + runtimeVersion | pending | 01 |
| 03 | eas.json channel wiring | pending | 02 |
| 04 | Workflow + compliance guide doc | pending | 02,03 |
| 05 | Verification / OTA test on preview build | pending | 01-04 |

## Dependency graph

```
01 install ──> 02 app.json ──> 03 eas.json ──┐
                          └────> 04 docs ─────┴──> 05 verify
```

## Critical rules (carried into every phase)

- OTA covers JS + assets ONLY. New native dep, permission change, plugin change,
  or SDK bump → full rebuild + re-release (TestFlight/App Store, APK on Releases).
- `runtimeVersion` MUST match exactly between an installed build and a published
  update, else the update is rejected (`updateRejectedBySelectionPolicy`).
- `appVersionSource: "remote"` + `autoIncrement` bump iOS buildNumber / Android
  versionCode automatically, NOT `expo.version`. `appVersion` policy keys off
  `expo.version` (`0.1.0`) — see phase-02 for the conflict analysis & rule.

## Out of scope (YAGNI)

- Staged rollouts / rollback automation, CI auto-publish, custom Updates API UI,
  Play Store AAB. Manual `eas update` from local for now.

## Files touched (ownership — no overlap)

- phase-01/02: `app.json`, `package.json`
- phase-03: `eas.json`
- phase-04: `docs/eas-update-guide.md` (new)
- phase-05: read-only verification

## Success criteria

A preview build installed on device pulls a published `eas update --branch
preview` change on second cold start, with no rebuild. Guide doc committed.

## Unresolved questions

See phase-05 + end of this plan's parent report.
