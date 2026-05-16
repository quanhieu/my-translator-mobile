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

# 1. Build production .ipa on EAS cloud
eas build --platform ios --profile production
```

First run prompts:
- **Apple ID** — sign in
- **Team** — pick your team
- **Distribution certificate** — let EAS create + manage (recommended)
- **Provisioning profile** — let EAS create + manage
- **Push Notifications key** — skip (app doesn't use push)

Build takes ~15–25 min. EAS prints a URL to monitor. When done, you get a downloadable `.ipa`.

```bash
# 2. Submit to TestFlight
eas submit --platform ios --latest
```

Prompts:
- **App Store Connect API key** — first time: generate one at https://appstoreconnect.apple.com/access/integrations/api → "App Manager" role → download `.p8`. Provide key ID, issuer ID, and `.p8` path. EAS caches it after first use.

Upload takes ~5 min. Apple then processes the build ~10–30 min before it appears in TestFlight.

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

```bash
# bump app version in app.json when user-facing changes warrant it (optional)
# buildNumber auto-increments — no manual edit needed

eas build --platform ios --profile production
eas submit --platform ios --latest
```

## Troubleshooting

- **"Invalid bundle ID"** — ensure App Store Connect app record's bundle ID exactly matches `app.json`.
- **Microphone permission missing on install** — verify `NSMicrophoneUsageDescription` is set in `app.json` and the new build was actually used (check buildNumber in TestFlight matches the latest upload).
- **Encryption questionnaire keeps appearing** — `ITSAppUsesNonExemptEncryption: false` not picked up. Confirm it's under `ios.infoPlist`, then rebuild.
- **Crash on launch after install** — likely a native module that wasn't compiled. Run `eas build` again, never use `expo start` outputs for distribution.

## Unresolved

- Privacy nutrition labels (App Store Connect → App Privacy) must be filled in before any external testers can install. Mic data is processed live by Soniox/OpenAI and not stored by us — declare accordingly.
- App icon currently borrows desktop icon. Confirm it renders cleanly at 1024×1024 (App Store Connect requirement) and consider a dedicated mobile-shaped icon if it looks cramped.
