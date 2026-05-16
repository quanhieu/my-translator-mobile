# Phase 5 — OpenAI session summary

**OTA: SAFE** — plain `fetch` to OpenAI HTTPS endpoint, no native module, no
permission. Network already used by engines.

## Context links
- `src/state/settings-context.tsx` (`openaiKey`, `targetLang`)
- `src/state/session-context.tsx` (`rows`, `status`)
- `src/lib/transcript-format.ts` (from P4 — reuse, DRY)
- `app/index.tsx` (post-Stop UI area)
- NON-GOAL: do NOT touch `src/engines/openai-realtime-client.ts` (websocket,
  unrelated — summary is a separate REST call).

## Overview
Priority P2 · Status pending. After Stop, show a "Summarize" button; tapping it
POSTs the transcript to OpenAI Chat Completions (`gpt-5-mini`) and shows the
returned summary in the session's target language.

## Key insights
- Decoupled from engine: works after a Soniox session too, **iff** an OpenAI
  key exists. If `openaiKey` empty → show helpful inline message, no call.
- Plain `fetch` POST to `https://api.openai.com/v1/chat/completions`. No SDK
  dep (YAGNI, and a dep would break OTA).
- Truncate transcript to ~12k chars before sending (cost/latency/context guard).
- Output language = `targetLang` (from settings) — instruct the model in the
  system prompt to summarize in that language.

## Requirements
Functional: button visible when `status==="idle"` and `rows` has final content;
on press → loading → summary text shown (scrollable) or error. No key → message
pointing to Settings. Non-functional: single in-flight request; cancel/replace
on new press; errors surfaced, never crash.

## Architecture / data flow
```
buildPrompt(transcript, targetLang)
fetch POST api.openai.com/v1/chat/completions
  headers: Authorization Bearer <openaiKey>, content-type json
  body: { model:"gpt-5-mini", messages:[{role:system,...},{role:user, transcript}] }
-> resp.choices[0].message.content -> summary state
errors: !openaiKey -> guidance msg; !res.ok -> show status+message; network -> catch
```

## Related code files
- Create: `src/lib/openai-summary.ts` — `summarizeTranscript({ apiKey, text,
  targetLang }): Promise<string>` (throws on failure with readable message).
- Create: `src/components/session-summary.tsx` — button + loading + result +
  error UI block (<200 lines).
- Modify: `app/index.tsx` — render `<SessionSummary />` below transcript when
  `status==="idle" && rows has finals`. SINGLE-WRITER: P5 edits index.tsx LAST.

## Implementation steps
1. `src/lib/openai-summary.ts`:
   - Build messages: system = "You summarize meeting/lecture transcripts.
     Respond ONLY in language code `<targetLang>`. Be concise: key points +
     decisions/action items." user = truncated transcript.
   - `fetch` POST with model `"gpt-5-mini"`; parse `choices[0].message.content`;
     non-2xx → throw `Error` with `OpenAI <status>: <body.error.message>`.
2. `src/components/session-summary.tsx`:
   - Reads `useSettings()` (openaiKey, targetLang) + `useSession()` (rows).
   - If `!openaiKey`: render muted text "Add an OpenAI key in Settings to
     summarize." (link to /settings).
   - Else "Summarize" Pressable → local state `loading|summary|error`; calls
     `summarizeTranscript` with `formatTranscript(rows)` (reuse P4 helper).
   - Show result in a bordered scrollable box; allow re-run.
3. `app/index.tsx`: render `<SessionSummary />` in the bottom area, only when
   `status==="idle"` and there are final rows (so it appears post-Stop).

## Todo
- [ ] `openai-summary.ts` fetch client (model `gpt-5-mini`, target-lang prompt)
- [ ] `session-summary.tsx` with no-key / loading / result / error states
- [ ] Reuses `formatTranscript` (DRY, no second formatter)
- [ ] Wired into `app/index.tsx` post-Stop only
- [ ] `openai-realtime-client.ts` untouched (verified)
- [ ] `expo install --check` shows NO new native module → OTA confirmed
- [ ] `tsc --noEmit` + lint pass

## Success criteria
- Soniox session + OpenAI key set → Summarize returns summary in target lang.
- No OpenAI key → guidance message, no network call.
- Invalid key → readable error, app stable.
- `package.json` unchanged → OTA publishable.

## Risk assessment
| Risk | L×I | Mitigation |
|------|-----|------------|
| `gpt-5-mini` model name/endpoint wrong | M×M | Surface OpenAI error verbatim; document model is caller-config assumption (see unresolved) |
| Huge transcript → cost/context overflow | M×M | Truncate to ~12k chars before send |
| Double submit / race | M×L | Disable button while loading; replace state on completion |
| Leaking key in logs | L×H | Never log headers/body; only log status code |

## Rollback
Remove `<SessionSummary />` from index.tsx; delete the two new files. No other
feature depends on them.

## Next
Final phase. After all phases: `eas update --channel preview` to validate OTA,
then `production`.
