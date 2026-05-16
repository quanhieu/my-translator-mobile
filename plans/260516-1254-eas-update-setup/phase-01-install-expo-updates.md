# Phase 01 — Install + configure expo-updates

## Overview
- Priority: P2 | Status: pending | Blocks: all later phases
- Install `expo-updates` for SDK 54 the Expo-managed way.

## Key insights
- MUST use `npx expo install expo-updates` (resolves SDK-54-compatible version),
  NOT `npm i expo-updates` (risks version skew with RN 0.81 / SDK 54).
- `eas update:configure` is the canonical bootstrap — it writes app.json
  (`expo.updates`, `runtimeVersion`, confirms `extra.eas.projectId`) and eas.json
  (`channel` on preview/production). We let it write, then hand-tune in 02/03.
- projectId already present (`260fa91a-...`) so configure won't re-create it.

## Implementation steps
1. From repo root: `npx expo install expo-updates`
2. Run `eas update:configure` (interactive — confirm project `phuc-nt/my-translator-mobile`).
3. Inspect git diff on `app.json` + `eas.json`; do NOT accept blindly — phases
   02/03 define the exact desired end state, reconcile against them.
4. Confirm `package.json` now lists `expo-updates` with a `~54`-compatible range.
5. Run `npx expo-doctor` — expect no expo-updates config errors.

## Files
- Modify: `package.json`, `app.json`, `eas.json` (configure auto-writes; tune later)

## Todo
- [ ] `npx expo install expo-updates`
- [ ] `eas update:configure`
- [ ] Review diff, run expo-doctor
- [ ] Commit: `feat: add expo-updates + EAS Update bootstrap`

## Success criteria
- `expo-updates` in package.json (SDK-54 range), expo-doctor clean,
  app.json has an `expo.updates` block with the EAS update URL.

## Risk assessment
| Risk | L×I | Mitigation |
|------|-----|------------|
| `npm i` wrong version | Med×High | Enforce `npx expo install` in step 1 |
| configure overwrites tuned values | Med×Med | Run configure FIRST, tune in 02/03 |
| expo-doctor flags newArch mismatch | Low×Med | SDK54 + RN0.81 + expo-updates all support newArch; verify |

## Rollback
`git checkout app.json eas.json package.json` + `npm i` to restore lockfile.
No native binary shipped yet → zero blast radius.

## Next: phase-02
