# Phase 02 — app.json updates block + runtimeVersion policy

## Overview
- Priority: P2 | Status: pending | Blocked by: 01 | Blocks: 03, 04, 05
- Lock the `expo.updates` block and the runtimeVersion policy.

## Recommended policy: `{ "policy": "appVersion" }`

### Rationale (researched, SDK 54)
- **appVersion**: runtime version = `expo.version`. Predictable, human-readable,
  one runtime per released app version. Risk: if native code changes WITHOUT
  bumping `expo.version`, an OTA update can land on an incompatible binary.
- **fingerprint**: auto-hashes the native layer; near-zero incompatible-update
  risk but forces a new build on ANY native-affecting change and is still
  flagged experimental by Expo. Overkill for this app's tiny native surface
  (mic permission + secure-store + splash; no custom native modules).
- This app's native surface is small and changes rarely → `appVersion` is the
  KISS choice. Discipline rule (below) closes the only real risk.

### Discipline rule (MANDATORY, document in guide)
> Any native-affecting change (new native dep, plugin, permission, SDK bump,
> app.json native key) → bump `expo.version` in the SAME commit as the rebuild.
> This rotates runtimeVersion so old binaries never receive an incompatible OTA.

### Interaction with `appVersionSource: "remote"` + `autoIncrement`
- `appVersionSource: "remote"` + `autoIncrement` (production) auto-increments
  iOS `buildNumber` / Android `versionCode` on EAS servers — it does NOT touch
  `expo.version`. So `expo.version` (`0.1.0`) is stable across rebuilds of the
  same release → runtimeVersion stays stable → OTA keeps working across those
  rebuilds. This is the desired behaviour, NOT a conflict.
- Implication: bumping build number alone (a plain rebuild/resubmit) keeps the
  SAME runtimeVersion, so a JS-only fix can ship via OTA OR rebuild — both reach
  the same runtime. Only a deliberate `expo.version` bump rotates the runtime.
- No change needed to `appVersionSource`/`autoIncrement`. They are orthogonal.

## Target app.json (expo.* additions/edits)
```jsonc
"runtimeVersion": { "policy": "appVersion" },
"updates": {
  "url": "https://u.expo.dev/260fa91a-49c1-44ae-b96a-f3de65e64e1f",
  "enabled": true,
  "fallbackToCacheTimeout": 0,
  "checkAutomatically": "ON_LOAD"
}
```
- Keep existing `extra.eas.projectId` untouched (already correct).
- `fallbackToCacheTimeout: 0` = launch instantly from cache, fetch update in
  background, apply on next cold start (best UX for a single-screen tool app).
- Do NOT add a top-level `channel` in app.json — channel is bound via eas.json
  build profiles (phase-03). app.json `runtimeVersion` must NOT be per-platform
  string-mismatched; keep it a single shared policy object.

## Files
- Modify: `app.json`

## Todo
- [ ] Set `expo.runtimeVersion = { policy: "appVersion" }`
- [ ] Add/normalize `expo.updates` block to target above
- [ ] Verify `extra.eas.projectId` unchanged
- [ ] `npx expo-doctor` clean

## Success criteria
- app.json validates; runtimeVersion resolves to `0.1.0` for current version;
  updates.url points at the correct project UUID.

## Risk assessment
| Risk | L×I | Mitigation |
|------|-----|------------|
| Native change w/o version bump → bad OTA | Med×High | Discipline rule + guide doc + checklist in phase-04 |
| Per-platform runtimeVersion drift | Low×High | Single shared policy object only |
| Wrong project UUID in url | Low×High | Pin exact UUID from app.json extra |

## Rollback
`git checkout app.json`. If a bad OTA already shipped: `eas update --branch
<b> --message rollback --republish` to a known-good update (covered in guide).

## Next: phase-03
