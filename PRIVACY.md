# Privacy Policy — My Translator

_Last updated: 2026-05-15_

My Translator is a live translation companion for events and lectures. It is designed to collect as little data as possible.

## What we collect

**Nothing.** The developer of My Translator does not collect, store, or transmit any user data. There is no backend server operated by us, no analytics, no telemetry, and no advertising SDKs. Finished sessions are saved to a transcript history that lives **only on your device** — it is never uploaded, synced, or visible to us.

## How the app works

1. The app captures audio from your device microphone only while you tap **Start** and stops when you tap **Stop**.
2. The captured audio is streamed directly from your device to the speech-to-text provider you choose:
   - **Soniox** (<https://soniox.com>), or
   - **OpenAI** (<https://openai.com>)
3. The translated text returned by the provider is displayed on screen and discarded when you clear the screen, close the app, or stop the session.

We are not a party to the connection between your device and these providers. Their handling of audio and text is governed by their own privacy policies:

- Soniox Privacy Policy: <https://soniox.com/privacy>
- OpenAI Privacy Policy: <https://openai.com/policies/privacy-policy>

You bring your own API key for each provider. We never see or transmit your key to any server we control.

## API keys

Your Soniox and/or OpenAI API keys are stored **only on your device**, in the platform's secure keystore:

- iOS: Keychain (via `expo-secure-store`)
- Android: Keystore (via `expo-secure-store`)

Keys never leave your device except as the Authorization header on requests to the respective provider's API.

## Microphone permission

The microphone is used only while a translation session is active. Audio is not recorded to a file, not buffered for replay, and not retained after the session ends.

## Transcripts

Transcripts and translations exist in app memory during a session. Tapping **Clear** removes the current session from memory.

When a session ends (you tap **Stop**), it is saved to an on-device history so you can review it later. This history is stored **only on your device** using the platform secure store — there is no cloud sync and no export to our servers. You can delete any saved session, or clear all history, from the History screen at any time; the most recent sessions are kept and older ones are automatically discarded.

The optional **Summarize** feature sends the session transcript to OpenAI (using your own API key) to generate a summary. This happens only when you tap **Summarize**, goes directly from your device to OpenAI, and is governed by OpenAI's privacy policy. **Share** / **Copy** place the transcript on the OS share sheet or clipboard at your request only.

## Data sharing

We do not share data with anyone because we do not collect any.

## Children

The app is not directed at children under 13.

## Changes

Material changes to this policy will be reflected in the app's release notes and by updating the date above.

## Contact

For questions about this policy, file an issue at:
<https://github.com/phuc-nt/my-translator-mobile/issues>
