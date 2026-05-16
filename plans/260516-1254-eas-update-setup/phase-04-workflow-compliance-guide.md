# Phase 04 — Workflow + compliance guide doc

## Overview
- Priority: P2 | Status: pending | Blocked by: 02,03 | Blocks: 05
- Single guide: `docs/eas-update-guide.md` (workflow + compliance, KISS).

## Deliverable: docs/eas-update-guide.md (outline to write)

### 1. What OTA can / cannot do
- CAN: JS bundle, React components, assets bundled via Metro, JS-level config.
- CANNOT: new native dep, native module, permission/Info.plist/AndroidManifest
  change, plugin add/remove, Expo SDK bump, app icon/splash native assets.
  → Those need full rebuild + re-release.

### 2. Publish workflow
```
# JS/asset fix for production builds
eas update --channel production --message "fix: <desc>"
# Test channel
eas update --channel preview --message "test: <desc>"
```
- Runtime gating: only builds whose embedded runtimeVersion (== `expo.version`,
  appVersion policy) matches the update's target runtime receive it.

### 3. The native-change rule (the one that bites people)
> Native-affecting change → bump `expo.version` + rebuild + re-release in the
> SAME change. Never publish OTA expecting it to deliver native code.
- Include a pre-publish checklist: "Did I add/upgrade any `expo-*`/native dep?
  Touch app.json native keys/plugins/permissions? If yes → rebuild, not OTA."

### 4. runtimeVersion / appVersionSource interaction (summarize phase-02)
- `appVersion` policy keys off `expo.version` (`0.1.0`).
- `appVersionSource: remote` + `autoIncrement` only bump build number /
  versionCode, NOT `expo.version` → runtime stable across plain rebuilds → OTA
  continues to reach prior installs of the same `expo.version`.

### 5. Existing-build caveat
- iOS build already on TestFlight/App Store + current APK predate expo-updates →
  cannot receive OTA. First OTA-capable release is the next prod build.

### 6. Apple Guideline 3.3.2 compliance (keep SHORT)
- Apple permits OTA JS updates when they do not alter the app's core purpose or
  add features outside the originally-reviewed scope. My Translator stays a live
  speech-translation tool (Soniox / OpenAI Realtime, BYOK). OTA usage limited
  to bug fixes, copy, UI polish, and engine-tuning within the reviewed purpose.
  No new feature category, no payment/native-capability changes via OTA.
- Rule: anything that would need a NEW App Review (new purpose/feature class)
  goes through a normal build + submission, never OTA.

### 7. Rollback
- Republish a known-good update: `eas update --channel production
  --message "rollback to <id>"` (re-point branch to prior bundle) or use the
  EAS dashboard to roll back the branch. Document the dashboard path.

## Files
- Create: `/Users/phucnt/workspace/my-translator-mobile/docs/eas-update-guide.md`

## Todo
- [ ] Write guide per outline (concise, no fluff)
- [ ] Cross-link from README mobile docs index if one exists
- [ ] Commit: `docs: add EAS Update OTA + compliance guide`

## Success criteria
- Guide covers: capability matrix, publish cmds, native-change rule, runtime
  interaction, existing-build caveat, 3.3.2 note, rollback. < ~120 lines.

## Risk assessment
| Risk | L×I | Mitigation |
|------|-----|------------|
| Team OTAs a native change | Med×High | Bold native-change rule + checklist |
| Misreads 3.3.2 scope | Low×High | Explicit "needs new review → rebuild" rule |

## Rollback
Delete/revert the doc file. Documentation-only, no runtime impact.

## Next: phase-05
