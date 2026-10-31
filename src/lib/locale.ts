/** Shared language identifiers for the Local UI and API. Do not translate protocol keys. */
export const LANGUAGE_OPTIONS = [
  { code: "zh-CN", label: "简体中文" },
  { code: "zh-TW", label: "繁體中文" },
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
] as const;

export type Locale = (typeof LANGUAGE_OPTIONS)[number]["code"];

export function normalizeLocale(value: unknown): Locale {
  if (typeof value !== "string") return "zh-CN";
  const tag = value.trim().toLowerCase().replace(/_/g, "-");
  if (tag === "zh-tw" || tag.startsWith("zh-hant") || tag.startsWith("zh-hk") || tag.startsWith("zh-mo")) return "zh-TW";
  if (tag === "zh-cn" || tag.startsWith("zh-hans") || tag.startsWith("zh-sg") || tag === "zh") return "zh-CN";
  if (tag === "en" || tag.startsWith("en-")) return "en";
  if (tag === "ja" || tag.startsWith("ja-")) return "ja";
  if (tag === "ko" || tag.startsWith("ko-")) return "ko";
  return "en";
}

export const OUTPUT_LANGUAGE_NAME: Record<Locale, string> = {
  "zh-CN": "Simplified Chinese (简体中文)",
  "zh-TW": "Traditional Chinese (繁體中文, Taiwan orthography)",
  en: "natural English",
  ja: "natural Japanese (日本語)",
  ko: "natural Korean (한국어)",
};

/** Append after mode-specific system instructions for both Google and OpenAI-compatible providers. */
export function outputLanguageInstruction(value: unknown): string {
  const language = OUTPUT_LANGUAGE_NAME[normalizeLocale(value)];
  return `[OUTPUT LANGUAGE / LOCAL PREFERENCE]\nGenerate natural-language output in ${language}. This applies to spoken dialogue, story prose, chapter titles, explanations, and text values in structured responses. Preserve each character's personality and world lore. The system instructions may be written in Chinese; that does NOT make Chinese the output language. Never translate product and space names (Shiorivia, Officina, Via Lata, Umbra, Tela, VIAE, Semita, Compitum), established character names, or brand slogans such as "Where stories find their way." Do not translate JSON property names, role IDs, tags (<viae_chat>, <game_state>, <meta>, etc.), or any machine-readable protocol. Do not translate stored history retroactively. Honor an explicit user request to translate or use another language when appropriate.`;
}
