# My Translator — Mobile

Minimal iOS + Android companion to [my-translator](https://github.com/phuc-nt/my-translator) (desktop).
Captures phone mic at conferences/lectures and shows live translation.

Two engines:

- **Soniox** (~$0.12/hr, text-only)
- **OpenAI Realtime** (~$4/hr, text + native voice)

Bring-your-own API key — keys are stored locally in iOS Keychain / Android Keystore via `expo-secure-store`. No backend, no telemetry, no transcript history.

---

## Status

Phase 1 — project scaffold (work in progress). See `plans/260514-0049-mobile-app-mvp/plan.md` in the desktop repo.

---

## Stack

- Expo SDK 54 + TypeScript
- Expo Router v4 (file-based)
- NativeWind v4 (Tailwind for RN)
- `react-native-audio-api` 0.11 (mic capture + PCM playback)
- `expo-secure-store` (API keys)
- Distribution: EAS Build → TestFlight (iOS) + APK on GitHub Release (Android)

## Develop

```bash
npm install
npx expo prebuild --clean
npx expo run:ios       # or run:android
```

For dev iteration after the first native build:

```bash
npx expo start --dev-client
```

## Project layout

```
app/                    # Expo Router screens
  _layout.tsx           # Root layout + providers
  index.tsx             # Translate screen
  settings.tsx          # Settings (API keys etc.)
src/
  engines/              # Soniox + OpenAI Realtime clients (phase 2/3)
  lib/                  # audio capture, secure-keys, languages
  state/                # Settings + Session contexts
  types/                # Shared TS types
```

## License

Same as desktop my-translator.
