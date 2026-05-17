# Phase 01 — Settings Footer

## Overview
- Priority: P3 | Status: pending | Effort: ~45m
- Small muted personal/PR footer at bottom of Settings, below "Clear all data".
- **Independent** — only touches `app/settings.tsx` + new component. May run
  parallel to Phase 2.

## OTA-Safety Statement
PASS. Uses `Linking` (RN core) + `Constants.expoConfig?.version` from
`expo-constants` (already `package.json` dep `~18.0.13`, bundled with Expo SDK
54). No new dep, no `app.json`, no permission, no SDK bump → OTA-safe per
eas-update-guide §3 checklist (all four boxes = No).

## Files
- CREATE `src/components/settings-footer.tsx` (~60 lines)
- MODIFY `app/settings.tsx` (currently 203 lines — only ADD an import + render
  `<SettingsFooter />` after the Clear-all `Pressable`; net +2 LOC. Acceptable:
  the new component absorbs the footer JSX so settings.tsx does not grow
  materially. If it tips >210, extract `Section/Row/Choice/LangPicker` helpers
  into `src/components/settings-controls.tsx` — note as fallback only.)

## Steps
1. Create `settings-footer.tsx` exporting `SettingsFooter`.
2. Imports: `Linking, Pressable, Text, View` from `react-native`;
   `Constants` from `expo-constants`.
3. `const version = Constants.expoConfig?.version ?? "—";` (no hardcode).
4. Helper `open(url: string)` → `Linking.openURL(url).catch(() => {})`
   (swallow — no native crash if no handler).
5. Layout (NativeWind, centered, muted):
   - View `mt-8 items-center gap-1 pb-6`
   - Author: Pressable → `https://github.com/phuc-nt`, text
     `text-xs text-zinc-500` "Built by phuc-nt".
   - Star CTA: Pressable → `https://github.com/phuc-nt/my-translator-mobile`,
     `text-xs text-zinc-500` "★ Star on GitHub · open source (MIT)".
   - Blog: Pressable → `https://phucnt.substack.com/`, `text-xs text-zinc-500`
     "Blog".
   - Version: `text-xs text-zinc-500` `v{version}`.
6. In `app/settings.tsx`: import `SettingsFooter`; render it inside the
   `ScrollView`, AFTER the Clear-all `Pressable`, before `</ScrollView>`
   (existing `contentContainerClassName="gap-5 pb-24"` already gives bottom
   space).

## Todo
- [ ] Create `src/components/settings-footer.tsx`
- [ ] Read version via `Constants.expoConfig?.version`
- [ ] Three external links via `Linking.openURL`
- [ ] Wire into `app/settings.tsx` below Clear-all
- [ ] Typecheck (`npx tsc --noEmit`) clean

## Success Criteria
- Footer visible at bottom of Settings, below Clear-all, small + muted +
  centered.
- Version shows `0.2.0` (read dynamically, not hardcoded).
- Tapping each link opens system browser; no crash if no browser.
- `app/settings.tsx` remains ≤ ~205 lines.

## Risks
| Risk | L | I | Mitigation |
|---|---|---|---|
| settings.tsx over 200-line limit | Med | Low | Component absorbs JSX; fallback extract controls if >210. |
| `Linking.openURL` rejects (no handler) | Low | Low | `.catch(() => {})`. |
| `expo-constants` misread as native change | Low | High | Documented: already a dep, JS-only API. |
