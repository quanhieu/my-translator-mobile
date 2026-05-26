# iOS Release Guide — TestFlight via EAS Build

Mobile project: this repository (`my-translator-mobile`). Commands below run from the repo root.

> Related: [eas-vs-app-store-connect.md](eas-vs-app-store-connect.md) explains how EAS and App Store Connect fit together.

## Prerequisites (one-time)

1. **Apple Developer account** ($99/yr) enrolled.
2. **App Store Connect**: create an app record.
   - Name: `My Translator`
   - Bundle ID: `com.phucnt.mytranslator` (must match `app.json` → `ios.bundleIdentifier`)
   - SKU: any unique string (e.g. `mytranslator-ios`)
   - Primary language: English
3. **Expo account** — `eas login`
4. **EAS CLI** — `npm i -g eas-cli` (verify with `eas --version`)
5. Link project (run once, from the repo root):
   ```bash
   eas init
   ```
   Pick the existing Expo project or let EAS create one. This writes `extra.eas.projectId` into `app.json`.

## Files already configured

- `app.json`
  - `expo.ios.bundleIdentifier = com.phucnt.mytranslator`
  - `expo.ios.buildNumber = "1"` (auto-increments via EAS)
  - `expo.ios.infoPlist.ITSAppUsesNonExemptEncryption = false` (skips TestFlight encryption questionnaire — app uses only HTTPS/WSS)
  - `expo.ios.infoPlist.NSMicrophoneUsageDescription` — required for mic permission prompt
- `eas.json` → `build.production` with `autoIncrement: true`
- Icon + splash sourced from desktop `src-tauri/icons/icon.png`

## Build + submit flow

```bash
# from the repo root

# 1. Bump app.json `expo.version` if this is a user-facing release
#    (also cuts a new OTA runtime — old installs stop receiving OTA updates).
#    Skip if you're just shipping a buildNumber bump (autoIncrement handles it).

# 2. Build production .ipa on EAS cloud (non-interactive once credentials cached)
eas build --platform ios --profile production --non-interactive
```

First run prompts (subsequent builds reuse cached credentials, hence `--non-interactive`):
- **Apple ID** — sign in
- **Team** — pick your team
- **Distribution certificate** — let EAS create + manage (recommended)
- **Provisioning profile** — let EAS create + manage
- **Push Notifications key** — skip (app doesn't use push)

Build takes ~15–25 min. EAS prints a URL to monitor. When done, you get a downloadable `.ipa`.

```bash
# 3. Submit to TestFlight (ascAppId already pinned in eas.json)
eas submit --platform ios --id <BUILD_ID> --non-interactive
# or simply --latest if you trust the most recent build is the right one
eas submit --platform ios --latest --non-interactive
```

Prompts (first time only):
- **App Store Connect API key** — generate at https://appstoreconnect.apple.com/access/integrations/api → "App Manager" role → download `.p8`. Provide key ID, issuer ID, and `.p8` path. EAS caches it after first use.

Upload takes ~1–2 min. Apple then processes the build ~5–10 min before it appears in TestFlight as "Ready to Submit".

## TestFlight: distribute to testers

After Apple processing finishes (you get an email):

1. App Store Connect → your app → **TestFlight** tab
2. Pick **Public Beta** (or your group) → **Builds** → "Select a Build to Test"
3. Pick the new build (e.g. version `0.4.3`, build `9`)
4. Fill **"What to Test"** (visible to all testers — include changelog + things to verify)
5. **Submit for Review** (external) or just **Distribute** (internal)
6. Testers see the new build in their TestFlight app within minutes after approval

## TestFlight setup (App Store Connect)

1. Go to your app → TestFlight tab.
2. **Test Information** (required before any tester can install):
   - Beta App Description (1 paragraph)
   - Feedback Email
   - Marketing URL (can be a placeholder)
3. **Internal Testing** group → add tester Apple IDs (up to 100, no Apple review required).
4. **External Testing** group → up to 10k testers, but requires a one-time Apple beta review (~24h).
5. Testers install TestFlight app on iPhone, accept invite → install.

## Updating after first release

Two paths depending on what changed:

### Path A — OTA (JS/asset only, no native change)

```bash
eas update --channel production --message "fix: <short description>"
```

Reaches installed devices on next cold start. No App Store re-review.
See [eas-update-guide.md](eas-update-guide.md) for what counts as native.

### Path B — Native rebuild (new dep, permission, native module, SDK bump)

```bash
# 1. Bump expo.version in app.json (e.g. 0.4.3 → 0.4.4)
# 2. Build + submit (buildNumber auto-increments)
eas build --platform ios --profile production --non-interactive
eas submit --platform ios --latest --non-interactive
# 3. After processing, distribute via TestFlight UI (see flow above)
```

> Bumping `expo.version` also cuts a new OTA runtime — old installs on the
> previous version won't receive OTAs targeting the new version. That's intended:
> they have stale native code.

## Troubleshooting

- **"Invalid bundle ID"** — ensure App Store Connect app record's bundle ID exactly matches `app.json`.
- **Microphone permission missing on install** — verify `NSMicrophoneUsageDescription` is set in `app.json` and the new build was actually used (check buildNumber in TestFlight matches the latest upload).
- **Encryption questionnaire keeps appearing** — `ITSAppUsesNonExemptEncryption: false` not picked up. Confirm it's under `ios.infoPlist`, then rebuild.
- **Crash on launch after install** — likely a native module that wasn't compiled. Run `eas build` again, never use `expo start` outputs for distribution.

## Current state (as of 2026-05-26)

- Latest TestFlight build: **v0.4.3 build #9** (Qwen LiveTranslate Flash engine + dropdown picker for 60+ languages)
- ascAppId `6769454461` pinned in `eas.json` → no interactive prompts for `eas submit`
- API key cached on EAS servers → `--non-interactive` flag works for both build + submit
- OTA channel `production` is live for v0.4.3 installs

## Unresolved

- Privacy nutrition labels (App Store Connect → App Privacy) must be filled in before any external testers can install. Mic data is processed live by Soniox/OpenAI/Qwen and not stored by us — declare accordingly.
- App icon currently borrows desktop icon. Confirm it renders cleanly at 1024×1024 (App Store Connect requirement) and consider a dedicated mobile-shaped icon if it looks cramped.
