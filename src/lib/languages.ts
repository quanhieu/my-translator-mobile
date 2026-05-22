export interface Language {
  code: string;
  name: string;
}

export const SONIOX_LANGS: Language[] = [
  { code: "en", name: "English" },
  { code: "vi", name: "Vietnamese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "ru", name: "Russian" },
  { code: "pt", name: "Portuguese" },
  { code: "it", name: "Italian" },
  { code: "id", name: "Indonesian" },
  { code: "th", name: "Thai" },
  { code: "hi", name: "Hindi" },
  { code: "ar", name: "Arabic" },
];

export const OPENAI_LANGS: Language[] = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "pt", name: "Portuguese" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "ru", name: "Russian" },
  { code: "hi", name: "Hindi" },
  { code: "id", name: "Indonesian" },
  { code: "vi", name: "Vietnamese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
];

// Qwen-Omni-Realtime supports many languages; reuse the OpenAI shortlist for a
// consistent picker. Source is always auto-detected, so only the target matters.
export const QWEN_LANGS: Language[] = OPENAI_LANGS;

export function langName(code: string, list: Language[]): string {
  return list.find((l) => l.code === code)?.name ?? code;
}
