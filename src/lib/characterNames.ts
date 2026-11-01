import type { Locale } from "./locale";

/** Official built-in character names only. Never transliterate user-created names. */
export const CHARACTER_NAMES = {
  tomori: { zh: "高松 灯", ja: "高松 燈", romanized: "Takamatsu Tomori" },
  anon: { zh: "千早 爱音", ja: "千早 愛音", romanized: "Chihaya Anon" },
  soyo: { zh: "长崎 素世", ja: "長崎 そよ", romanized: "Nagasaki Soyo" },
  taki: { zh: "椎名 立希", ja: "椎名 立希", romanized: "Shiina Taki" },
  rana: { zh: "要 乐奈", ja: "要 楽奈", romanized: "Kaname Rana" },
  sakiko: { zh: "丰川 祥子", ja: "豊川 祥子", romanized: "Togawa Sakiko" },
  mutsu: { zh: "若叶 睦", ja: "若葉 睦", romanized: "Wakaba Mutsumi" },
  uika: { zh: "三角 初华", ja: "三角 初華", romanized: "Misumi Uika" },
  nyamu: { zh: "祐天寺 若麦", ja: "祐天寺 にゃむ", romanized: "Yutenji Nyamu" },
  umiri: { zh: "八幡 海铃", ja: "八幡 海鈴", romanized: "Yahata Umiri" },
  mana: { zh: "纯田 真奈", ja: "純田 まな", romanized: "Sumita Mana" },
} as const;

export function characterDisplayName(id: string | undefined, original: string | undefined, locale: Locale): string {
  if (!id || !(id in CHARACTER_NAMES)) return original || id || "";
  const name = CHARACTER_NAMES[id as keyof typeof CHARACTER_NAMES];
  return locale === "zh-CN" ? name.zh : (locale === "zh-TW" || locale === "ja") ? name.ja : name.romanized;
}

/** Output-name guidance applies only to built-in IDs, never user-created characters. */
export function characterNameInstruction(locale: Locale): string {
  const column = locale === "zh-CN" ? "zh" : (locale === "zh-TW" || locale === "ja") ? "ja" : "romanized";
  const list = Object.entries(CHARACTER_NAMES).map(([id, names]) => `${id} = ${names[column]}`).join("; ");
  return `[BUILT-IN CHARACTER NAME POLICY] For built-in characters, use these names in newly generated visible dialogue, prose and explanations: ${list}. Keep machine-readable charId values unchanged. This rule does not rename or translate any existing conversation, user text, world book, character lore, or user-created character. If a user explicitly supplies a nickname or alternate form, respect the narrative context.`;
}
