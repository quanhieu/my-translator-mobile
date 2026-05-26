# EAS Update (OTA) — Workflow & Compliance Guide

Ship JavaScript/asset changes to installed apps **without** an App Store re-review
or an APK rebuild. Configured via `expo-updates` + EAS Update on Expo SDK 54.

- Update URL: `https://u.expo.dev/260fa91a-49c1-44ae-b96a-f3de65e64e1f`
- runtimeVersion policy: `{ "policy": "appVersion" }` (keyed off `expo.version`)
- Channels: `development`, `preview`, `production` (wired in `eas.json`)

---

## 1. What OTA can and cannot do

| ✅ OTA can deliver | ❌ OTA CANNOT deliver (needs full rebuild + re-release) |
| --- | --- |
| JS bundle, React components, business logic | New native dependency / native module |
| Assets bundled through Metro (images, fonts) | Permission, `Info.plist`, `AndroidManifest` change |
| JS-level config, copy, UI tweaks, bug fixes | Adding/removing an Expo config plugin |
| Engine/logic tuning within the reviewed purpose | Expo SDK bump, RN upgrade |
| | Native app icon / splash assets |

If a change touches any of the right column, it is **not** an OTA — it is a new
build that goes through TestFlight/App Store (iOS) and a new GitHub Release (Android).

---

## 2. Publish workflow

```bash
# Ship a JS/asset fix to production installs
eas update --channel production --message "fix: <short description>"

# Ship to the preview/test channel first (recommended before production)
eas update --channel preview --message "test: <short description>"
```

**Runtime gating:** an installed build only accepts an update whose target
runtimeVersion matches the build's embedded runtimeVersion. With the `appVersion`
policy that value is `expo.version` (currently **`0.4.3`**). Builds with a different
`expo.version` will NOT receive the update (`updateRejectedBySelectionPolicy`).
Bump `expo.version` only when you intend to cut a fresh runtime channel
(e.g. shipping a native change).

Apps fetch the update on cold start and apply it on the **next** launch.

---

## 3. The native-change rule (the one that bites people)

> **Any native-affecting change must bump `expo.version` AND ship as a full
> rebuild + re-release in the same change. Never publish an OTA expecting it to
> deliver native code.**

Pre-publish checklist — if you answer "yes" to ANY, it is a rebuild, not an OTA:

- [ ] Added or upgraded any `expo-*` / native dependency?
- [ ] Changed `app.json` native keys, plugins, or permissions?
- [ ] Bumped Expo SDK or React Native?
- [ ] Changed native icon/splash assets?

---

## 4. runtimeVersion ↔ appVersionSource interaction

- `appVersion` policy keys runtimeVersion off `expo.version` (`0.4.3`).
- `eas.json` has `appVersionSource: "remote"` + `autoIncrement` on production.
  Those only bump iOS `buildNumber` / Android `versionCode` on EAS servers —
  they do **not** touch `expo.version`.
- Therefore plain rebuilds keep the same runtimeVersion, and OTA updates keep
  reaching prior installs of the same `expo.version`. The two systems are
  orthogonal — no conflict.
- To intentionally cut a new runtime (e.g. after a native change): bump
  `expo.version` in `app.json` and rebuild. Old installs stop getting new OTAs
  (correct — they have stale native code).

---

## 5. Existing-build caveat

The iOS build already on TestFlight/App Store and the current Android APK on
GitHub Releases were built **before** `expo-updates` was added. They are
permanently OTA-incapable. The **first OTA-capable release is the next
production build** after this setup. Do not expect current installs to update.

---

## 6. Apple Guideline 3.3.2 compliance

Apple explicitly permits OTA JavaScript updates **provided they do not change
the app's core purpose or add features outside the originally-reviewed scope**
(App Store Review Guideline 3.3.2 / Developer Program License Agreement).

My Translator stays a live speech-translation tool (Soniox / OpenAI Realtime,
bring-your-own-key). OTA usage is limited to: bug fixes, copy, UI polish, and
engine/logic tuning **within that reviewed purpose**. No new feature category,
no payment, no native-capability changes are delivered via OTA.

> **Rule:** anything that would warrant a NEW App Review (new purpose, new
> feature class, new data handling) goes through a normal build + submission —
> never OTA. This is standard React Native / Expo practice, not a workaround.

---

## 7. Rollback

If a bad update ships:

- **CLI:** republish a known-good bundle to the channel —
  `eas update --channel production --message "rollback: revert to <good-id>"`
  (re-point the branch to the prior good commit and publish).
- **Dashboard:** expo.dev → project → **Updates** → select the branch →
  promote/roll back to a previous update. This is the fastest path for an
  already-published bundle.

Always test on the `preview` channel before `production` to avoid needing this.
