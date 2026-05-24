# App Store Submission — Copy & Metadata

All text to paste into App Store Connect when submitting My Translator for public App Store release. The `.ipa` already on TestFlight is reused — no rebuild needed.

The product positioning, repeated consistently across every field below:

- **Purpose:** a live translation companion for conferences and lectures — a lightweight stand-in for a human cabin (booth) interpreter when none is available. It translates the spoken language into the language you choose, shown on screen in real time (not same-language captioning).
- **Why the UI is intentionally minimal:** during a live talk the user is listening and cannot fiddle with controls. Fewer options = less distraction = the app stays out of the way.
- **Why Bring-Your-Own-Key (BYOK):** we run no backend and do not track users. Audio goes directly from the device to the one speech provider the user chose — it does not pass through our servers or any intermediary. The user's voice is never relayed through a third party we operate.

---

## App Information

| Field | Value |
| --- | --- |
| **Name** | `My Translator Mobile` |
| **Subtitle** (30 chars max) | `Conference live translation` |
| **Primary Category** | Productivity |
| **Secondary Category** | Utilities (optional) |
| **Bundle ID** | `com.phucnt.mytranslator` |
| **Content Rights** | Does not contain third-party content |
| **Age Rating** | 4+ (no objectionable content; see questionnaire notes below) |

---

## Promotional Text (170 chars, editable anytime without review)

```
Live translation for conferences and lectures when there's no interpreter booth. Your audio goes straight to the engine you pick — no tracking, no middleman, bring your own key.
```

---

## Description (full)

```
My Translator turns your phone into a live translation companion for conferences, lectures, and talks — a lightweight stand-in for a human cabin (booth) interpreter when one isn't available. It listens to the speaker and shows the talk translated into the language you pick, on screen, in real time.

WHAT IT DOES
Point your phone's microphone at the speaker. The app streams the audio to a speech engine you choose and shows the translation on screen in real time, in large readable text, so you can follow a talk in a language you don't speak.

DELIBERATELY SIMPLE
This app does one thing. When you're sitting in a live session you're listening, not configuring — so there are no menus to get lost in, no modes to second-guess. You pick a target language (the spoken language is auto-detected), tap Start, and read. That's the whole app, on purpose.

PRIVACY BY DESIGN — BRING YOUR OWN KEY
We do not run a server. We do not track you. We have no analytics and keep no transcript history.

You bring your own API key for the speech engine (Soniox or OpenAI). Your audio is sent directly from your device to that one provider — it never passes through our servers or any middleman. Your spoken voice is not relayed through a company you didn't choose. Your API key is stored only in your device's secure keychain and is never uploaded anywhere we control.

ENGINES
- Soniox — low cost, on-screen translated text only.
- OpenAI Realtime — higher cost, adds optional spoken translation (muted by default; tap to enable).

GOOD TO KNOW
- Source language is auto-detected; you only choose the target.
- Transcripts live only in memory during a session and are cleared when you stop or tap Clear.
- Requires an internet connection and your own provider API key.

My Translator is intended as an accessibility/comprehension aid, not a certified interpretation service.
```

---

## Keywords (100 chars max, comma-separated, no spaces after commas)

```
translate,translation,live,conference,lecture,interpreter,speech,realtime,talk,seminar,language
```

(94 chars — fits.)

---

## What's New in This Version (release notes)

### v0.4.1 (build 6, OTA 2026-05-24) — TestFlight

```
Settings UI is now engine-aware, and spoken voice is disabled to fix a
translation loop.

- Settings: picking an engine now hides the irrelevant API key / language /
  assistant model — you see only what each engine needs
- Qwen now has its own assistant model list (qwen-plus / qwen-max /
  qwen-turbo) and routes summary / chat / auto-name through DashScope
- Spoken voice disabled on OpenAI and Qwen: the speaker was echoing back
  into the mic and creating an infinite translation loop. Translations
  are read on screen
- Qwen session also drops audio modality server-side to save tokens
```

(updates delivered as an OTA bundle — same build 6, runtime 0.4.1)

### v0.4.1 (build 6) — TestFlight (initial)

```
Qwen-Omni Realtime engine is now stable.

- Added third engine: Alibaba Cloud Qwen-Omni Realtime (text + optional voice, free preview)
- Fixed Qwen content-loss: switched to client-side silence detection, full translations restored
- Qwen first-token latency now ~2s (faster than OpenAI)
- Better pronoun continuity across turns
```

(286 chars.)

### v0.4.0 — first public release

```
First public release.

- Live on-screen translation for talks and lectures
- Auto-detected source language; pick your target
- Soniox (text) or OpenAI Realtime (text + optional voice) engines
- Bring your own API key — no tracking, no backend, audio goes straight to the engine you choose
```

---

## URLs

| Field | Value |
| --- | --- |
| **Support URL** (required) | `https://github.com/phuc-nt/my-translator-mobile/issues` |
| **Marketing URL** (optional) | `https://github.com/phuc-nt/my-translator-mobile` |
| **Privacy Policy URL** (required) | `https://github.com/phuc-nt/my-translator-mobile/blob/main/PRIVACY.md` |

---

## App Privacy (nutrition labels)

Already declared for TestFlight. Confirm the same for App Store:

- **Data collection:** No data collected.
- Rationale: no backend, no analytics, no telemetry. Audio is streamed by the user directly to a provider the user configured with the user's own key; the developer is not a party to that data and stores nothing. API keys are kept in the device keychain only.

If App Store Connect asks per-provider: this is third-party processing initiated by the user with the user's own account/key, not data collected by the app developer. Declare **Data Not Collected**.

---

## Age Rating Questionnaire

Answer **None / No** to all content categories (violence, sexual content, profanity, gambling, etc.). Result: **4+**.

One nuance: the app provides unfiltered live translation of whatever is being spoken nearby. This is user-generated/ambient audio, not app content. Standard for transcription/translation utilities — still 4+.

---

## Review Notes (the most important field — paste in "App Review Information → Notes")

```
WHAT THIS APP IS
My Translator is a live translation tool for conferences and lectures. It translates the spoken language into a target language the user picks and displays it on screen in real time. It is meant as a lightweight, low-distraction stand-in for a human cabin (booth) interpreter when one is not available. The minimal single-screen UI is intentional: a user attending a live talk is listening and must not be distracted by configuration.

WHY THERE IS NO ACCOUNT AND WHY THE APP ASKS FOR AN API KEY (please read before testing)
This is a privacy decision, not an incomplete feature. We deliberately run NO backend server and collect NO user data. To achieve that, the app does not proxy anyone's audio: instead the user supplies their own API key for a speech provider, and the device streams audio DIRECTLY to that provider. This guarantees the user's voice/audio is never relayed through our servers or any intermediary the user did not choose. The key is stored only in the iOS keychain and is never transmitted anywhere we control.

HOW TO TEST (the app needs a provider key to function)
Either provider works. Soniox is the cheapest and offers free trial credit:

1. Open https://console.soniox.com and create a free account.
2. Create an API key (the free trial credit is sufficient to exercise the app).
3. In the app, you are taken to Settings on first launch. Paste the Soniox key.
4. Pick any target language (source language is auto-detected).
5. Return to the main screen, tap Start, allow the microphone prompt.
6. Speak toward the device (or play any speech audio). The translated text appears on screen within a second or two.

If the review team would prefer we supply a temporary test key directly instead of creating one, please reply to this submission and we will provide one through the Resolution Center.

PERMISSIONS
- Microphone: used only while a translation session is active (between Start and Stop). Audio is not recorded to a file and not retained after the session.

ENCRYPTION
Uses only standard HTTPS/WSS. ITSAppUsesNonExemptEncryption = false is set; the app is exempt from export-compliance documentation.

CONTACT
GitHub issues: https://github.com/phuc-nt/my-translator-mobile/issues
```

---

## Screenshots (captured — ready to upload)

Captured at the iPhone 6.9" spec (1320 × 2868 px), in `docs/app-store-screenshots/`. Upload all three into the iPhone 6.9" slot in App Store Connect.

| File | Story |
| --- | --- |
| `01-live-translation-6.9.jpeg` | Main screen mid-session — dual panel, source + translated text. Upscaled from an app screenshot (slightly soft but readable). |
| `02-settings-byok-6.9.png` | Settings — engine picker (Soniox), target language, both API keys configured. The BYOK story. Native simulator capture. |
| `03-empty-state-6.9.png` | Empty Translate screen, "Tap Start to begin translating." Native simulator capture. |

Portrait only (app is portrait-locked). All meet the 6.9" requirement.

---

## Submission Checklist

- [ ] App Privacy labels confirmed (Data Not Collected)
- [ ] Age rating questionnaire completed (→ 4+)
- [ ] Name, subtitle, description, keywords, promo text filled
- [ ] Support + Privacy Policy URLs set
- [ ] Screenshots uploaded (6.9" set, 3 images ready in `docs/app-store-screenshots/`)
- [ ] Build selected in Distribution tab (reuse the TestFlight `.ipa`)
- [ ] Review Notes pasted (the BYOK explanation + Soniox test steps)
- [ ] Export compliance answered (exempt)
- [ ] Submit for Review

---

## Known Reject Risks & Preemptive Answers

| Likely reviewer concern | Preemptive answer (already in Review Notes) |
| --- | --- |
| Guideline 4.2 — app too minimal / "not enough features" | The minimalism is the feature: a low-distraction aid for live listening, explicitly positioned as an interpreter-booth substitute. |
| Guideline 2.1 — app requires an external API key the reviewer must obtain | Explained as a privacy architecture (no backend, no proxying of audio). Step-by-step free Soniox key instructions provided; offer to supply a key via Resolution Center. |
| Microphone usage unclear | NSMicrophoneUsageDescription set; Review Notes state mic is active only between Start/Stop, nothing recorded or retained. |
| Privacy labels vs. actual data flow | Audio is user-initiated third-party processing with the user's own key; developer collects nothing → Data Not Collected is accurate. |

## Unresolved

- Whether to proactively supply a reviewer key vs. wait for them to ask (current choice: instruct them to self-serve a free Soniox key; revisit if rejected on 2.1).
- `01-live-translation-6.9.jpeg` is upscaled (slightly soft). Acceptable for submission; could be replaced with a native-resolution capture during a real session later.
