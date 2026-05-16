# Android Release Guide — APK via GitHub Release

Mobile project: this repository (`my-translator-mobile`). Commands below run from the repo root.

Distribution: signed `.apk` attached to a GitHub Release. No Play Store, no review, no developer account fee. End users download the `.apk`, allow "Install unknown apps", install.

## Prerequisites (one-time)

1. **Expo account + EAS CLI** — already done for iOS, nothing new needed.
2. **GitHub CLI** (`gh`) — to upload APK to a release. `brew install gh` if missing.
3. **No Google Play Console account required** (skipping that path entirely).

## Files already configured

- `app.json`
  - `expo.android.package = com.phucnt.mytranslator`
  - `expo.android.versionCode = 1` (auto-increments via EAS, but explicit baseline)
  - `expo.android.permissions = ["android.permission.RECORD_AUDIO"]` — mic
  - `expo.android.adaptiveIcon.*` — regenerated with 25% safe-zone padding from desktop icon
  - `expo.android.edgeToEdgeEnabled = true`
- `eas.json` → `build.production.android.buildType = "apk"` (NOT "aab" — `aab` is for Play Store)

## Build flow

```bash
# from the repo root

# 1. Build production .apk on EAS cloud
eas build --platform android --profile production
```

First run prompts:
- **Android Keystore** — let EAS create + manage (recommended). EAS stores it on their servers; you can download it later via `eas credentials`.
- No Apple-style account login is needed.

Build takes ~10–15 min. Shorter than iOS because no Apple signing/notarization. EAS prints a URL with the artifact:

```
🤖 Android app:
https://expo.dev/artifacts/eas/XXXXX.apk
```

## Publish to GitHub Release

```bash
# Download the APK from the EAS URL to local first (or use curl)
curl -L -o my-translator-0.1.0.apk "https://expo.dev/artifacts/eas/XXXXX.apk"

# Create a release with the APK attached
gh release create v0.1.0-android my-translator-0.1.0.apk \
  --repo phuc-nt/my-translator-mobile \
  --title "v0.1.0 — Android beta" \
  --notes "First Android build. See README for install instructions."
```

Or via the GitHub web UI: **Releases → Draft a new release → upload `.apk` as binary asset**.

The release page gives a permanent URL like:
```
https://github.com/phuc-nt/my-translator-mobile/releases/download/v0.1.0-android/my-translator-0.1.0.apk
```

Share that. End users do not need to interact with EAS.

## End-user install instructions (Android)

Already in mobile `README.md`. Summary:

1. On Android phone, open the release page in a browser → tap the `.apk` link.
2. When the OS asks, allow the browser to "install unknown apps" (Settings → Apps → Browser → Install unknown apps).
3. Tap the downloaded file → **Install**.
4. Open the app → it will route you to Settings on first launch since no API key is saved.

Modern Android (12+) shows a Play Protect warning ("This app wasn't checked by Play Protect"). User taps **Install anyway**. Not a blocker, just informational.

## Updating

```bash
# Bump version in app.json if user-facing changes warrant it
# versionCode auto-increments via EAS — no manual edit needed

eas build --platform android --profile production
# Download new .apk → upload to a NEW GitHub Release (v0.1.1-android, etc.)
```

Users will not auto-update — they need to download the new APK and reinstall. (Android allows in-place upgrades from a higher versionCode, so settings/data persist.)

If auto-update is wanted later → switch to Play Store distribution (separate guide).

## Avoiding the pitfalls we hit on iOS

| iOS pitfall                                         | Android equivalent / how it's avoided                  |
| --------------------------------------------------- | ------------------------------------------------------ |
| `ITSAppUsesNonExemptEncryption` prompt at submit    | N/A — Android has no encryption questionnaire          |
| `buildNumber` warning ("ignored when version source is remote") | Same warning applies to `versionCode`. Harmless — ignore. |
| `eas submit` requires Apple ID + 2FA + API key      | No submit needed; we just upload an APK file ourselves |
| Apple Beta Review ~24h before public install        | No review for direct-install APKs                      |
| TestFlight 90-day build expiry                      | APK never expires                                      |
| External tester limit (10k)                         | No limit                                               |
| Apple Developer fee ($99/yr)                        | $0                                                     |

Trade-off: end users see "unknown sources" warning + manual install dance. iOS TestFlight has a smoother install UX, but you pay for that smoothness in money + time + review cycles.

## Optional later: Play Store

If wanting Play Store distribution down the line:

1. **Google Play Console** — $25 one-time registration fee.
2. Change `eas.json` → `build.production.android.buildType = "app-bundle"` (`.aab` is required by Play Store).
3. `eas submit --platform android --profile production` (needs service account JSON from Play Console).
4. Play has its own internal/closed/open testing tracks — closest analog to TestFlight is "Internal Testing".
5. Initial app review ~3-7 days. Updates usually <24h.

Not doing this now because the indie-share-an-APK flow is enough for this app's audience.

## Troubleshooting

- **"App not installed" on user device** — usually a previous install with a different signing key. Tell user to uninstall the old version first. EAS-managed keystore is stable across builds, so won't recur after first install.
- **"Parse error: There was a problem parsing the package"** — APK corrupted in download, or user's Android version too old. Min SDK in Expo SDK 54 is Android 7.0+.
- **Permission denied for mic at runtime** — verify `RECORD_AUDIO` is in `app.json` permissions array; rebuild.
- **Adaptive icon looks cropped** — foreground PNG needs ~25% safe-zone padding. Already done; only re-check if icon is changed.

## Unresolved

- Whether to also publish to Play Store later (cost/benefit unclear given small audience).
- App size: Android APKs include native code for all architectures by default — file may be 50-80MB. Could split per ABI to reduce, but adds release-management complexity.
