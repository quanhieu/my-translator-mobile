# Phase 03 — eas.json channel wiring

## Overview
- Priority: P2 | Status: pending | Blocked by: 02 | Blocks: 05
- Subscribe build profiles to update channels so OTA reaches the right builds.

## Key insights
- A build profile's `channel` binds builds made with it to updates published to
  the same-named channel/branch. No channel key → build cannot receive OTA.
- `development` profile: leave WITHOUT a channel — dev-client builds load
  updates via the Extensions tab / `--branch` flag manually; a fixed channel
  would interfere with local iteration. (YAGNI: no dev OTA channel.)
- `preview` → channel `preview` (internal test APK / sideload validation).
- `production` → channel `production` (TestFlight + App Store IPA, GH-release APK).
- Channel ≠ branch but default 1:1 link. We publish via `--channel` (auto-binds
  to like-named branch) — keeps mental model flat (KISS).

## Target eas.json `build` block (additions only — keep all existing keys)
```jsonc
"build": {
  "development": { "developmentClient": true, "distribution": "internal",
                   "ios": { "simulator": true } },
  "preview":     { "distribution": "internal", "channel": "preview",
                   "ios": { "simulator": false }, "android": { "buildType": "apk" } },
  "production":  { "autoIncrement": true, "channel": "production",
                   "ios": {}, "android": { "buildType": "apk" } }
}
```
- Do NOT change `cli.appVersionSource`, `submit`, or `autoIncrement` (orthogonal
  per phase-02 analysis).

## Files
- Modify: `eas.json`

## Todo
- [ ] Add `"channel": "preview"` to preview profile
- [ ] Add `"channel": "production"` to production profile
- [ ] Leave development profile channel-less
- [ ] `eas.json` parses (`eas build:configure` dry / json lint)

## Success criteria
- `eas config` (or `eas build --profile production --dry-run`-equivalent) shows
  production bound to channel `production`, preview to `preview`.

## Risk assessment
| Risk | L×I | Mitigation |
|------|-----|------------|
| Existing production builds (already on TestFlight) have NO channel embedded | High×High | Those binaries can NEVER receive OTA — a NEW build after this change is required before OTA works for prod. Documented in phase-04 + phase-05. |
| Channel/branch name typo | Low×High | Use exact lowercase `preview`/`production` everywhere |
| Mismatched channel between build & publish | Med×Med | Single source: channel == branch == profile name |

## Backwards compatibility / migration
- The iOS build already on TestFlight + App Store has no embedded channel and
  no expo-updates → it will keep working but is OTA-incapable. First OTA-capable
  release = next production build after phases 01-03. State this in the guide so
  the team does not expect existing installs to receive OTA.

## Rollback
`git checkout eas.json`. Channel keys are build-time only; reverting before a
new build = no effect on anything shipped.

## Next: phase-04
