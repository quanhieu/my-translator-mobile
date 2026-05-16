# Phase 05 — Verification / OTA test on a preview build

## Overview
- Priority: P2 | Status: pending | Blocked by: 01-04
- Prove an OTA update reaches a build with NO App Store re-review / rebuild.

## Strategy
Use the `preview` channel + a fresh preview APK (Android, fastest — no Apple
review, sideload directly). iOS path noted as optional.

## Test matrix
| Layer | What | Method | Pass signal |
|-------|------|--------|-------------|
| Build embeds runtime | preview build has runtimeVersion `0.1.0` + channel `preview` | `eas build --profile preview` then check build metadata / `Updates.runtimeVersion` at runtime | values present |
| Publish | update lands on `preview` branch | `eas update --channel preview --message "ota smoke test"` | EAS dashboard shows update, matching runtime+platform |
| Delivery | installed preview app fetches update | Make a visible JS-only change (e.g. settings screen footer text), publish, cold-start app twice | new text appears on 2nd launch |
| Runtime gate (negative) | mismatched runtime rejected | bump `expo.version` locally, publish to preview, old build must NOT pick it up | old build stays unchanged (expected reject) |
| Native-change guard | confirm native dep change NOT delivered via OTA | reason about it / dashboard only — do NOT actually ship | documented, no OTA attempt |

## Steps
1. Complete phases 01-03, commit.
2. `eas build --profile preview --platform android`; install APK on device.
3. Launch once (baseline). Note current footer text.
4. Edit a JS-only string, `eas update --channel preview --message "smoke"`.
5. Cold-start app twice (first launch downloads in background, second applies —
   matches `fallbackToCacheTimeout: 0` behaviour).
6. Confirm new string visible → OTA delivery proven.
7. Optional dev-build path: `eas update --branch preview` + Extensions tab in a
   dev-client build for faster iteration.

## Files
- Read-only. No code/config edits in this phase.

## Success criteria
- JS change appears on a real installed build via OTA, no rebuild, no store
  submission. Negative runtime-gate test behaves as expected.

## Risk assessment
| Risk | L×I | Mitigation |
|------|-----|------------|
| Update not picked up | Med×Med | Verify channel match, 2 cold starts, check EAS dashboard runtime/platform match |
| Tester expects instant in-session update | Med×Low | Document: applies on next cold start by design (no custom Updates UI — YAGNI) |
| First prod build still OTA-incapable | High×Med | Re-state existing-build caveat; only NEW builds receive OTA |

## Rollback
None needed — verification only. If smoke update is bad: republish prior bundle
on `preview` (does not affect production channel).

## Unresolved questions
- Do we want CI to auto-publish OTA on merge to a release branch? (Deferred —
  YAGNI; manual local `eas update` for now.)
- Staged rollout / rollback automation needed before first prod OTA? (Deferred.)
- iOS OTA smoke test required pre-launch, or is Android proof sufficient given
  shared JS bundle + identical appVersion runtime? (Recommend Android proof
  sufficient; flag for user decision.)
