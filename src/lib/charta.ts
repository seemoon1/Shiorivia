import type { Locale } from "./locale";
import type { CharConfig } from "../data/char_config";

export const CHARTA_STORAGE_KEY = "shiorivia_charta_characters_v1";
export const CHARTA_FORMAT = "shiorivia-character";
export const CHARTA_PRESET_AVATARS = ["🌱", "🌙", "✦", "🌸", "🍃", "📜", "🦋", "🐈", "☁️", "🎨", "🌊", "⭐"] as const;
export const CHARTA_LANGUAGES = [
  { code: "zh-CN", label: "简体中文" },
  { code: "zh-TW", label: "繁體中文" },
  { code: "en", label: "English / Romanization" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "other", label: "Other language" },
] as const;

export type ChartaCharacter = {
  id: string;
  primaryLanguage: string;
  names: Record<string, string>;
  hex: string;
  avatar: string; // Emoji preset or validated, resized data:image/png/jpeg/webp
  portrait?: string; // Local-only, disk-backed full-body illustration URL
  description: string;
  createdAt: number;
  updatedAt: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));
const isHex = (value: unknown): value is string => typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
const allowedImage = /^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/;
const isAvatar = (value: unknown): value is string => typeof value === "string" &&
  ((CHARTA_PRESET_AVATARS as readonly string[]).includes(value) || (value.length <= 350_000 && allowedImage.test(value)));
const isLang = (value: unknown): value is string => typeof value === "string" && /^(?:[a-z]{2,3})(?:-[a-zA-Z0-9]{2,8}){0,3}$/.test(value);

/** Validate untrusted imported data; never merge with lore_library or session JSON. */
export function parseChartaCharacter(input: unknown): ChartaCharacter {
  if (!isRecord(input) || !isRecord(input.names) || !isLang(input.primaryLanguage)) throw new Error("Invalid character names or language.");
  const names: Record<string, string> = {};
  for (const [lang, name] of Object.entries(input.names)) {
    if (!isLang(lang) || typeof name !== "string" || name.trim().length > 100) throw new Error("Invalid language entry.");
    if (name.trim()) names[lang] = name.trim();
  }
  if (!names[input.primaryLanguage] || Object.keys(names).length > 12) throw new Error("A primary name is required.");
  if (!isHex(input.hex) || !isAvatar(input.avatar)) throw new Error("A theme color and avatar are required.");
  if (typeof input.description !== "string" || input.description.length > 20000) throw new Error("Character notes exceed the limit.");
  const id = typeof input.id === "string" && /^charta-[a-zA-Z0-9-]{8,90}$/.test(input.id) ? input.id : makeChartaId();
  const portrait = typeof input.portrait === "string" && new RegExp(`^/api/local/charta\\?portrait=${id}&v=[0-9]{1,14}$`).test(input.portrait)
    ? input.portrait : undefined;
  return { id, primaryLanguage: input.primaryLanguage, names, hex: input.hex, avatar: input.avatar, portrait, description: input.description,
    createdAt: Number.isFinite(input.createdAt) ? Number(input.createdAt) : Date.now(), updatedAt: Date.now() };
}

export function makeChartaId(): string {
  return `charta-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

export function nameForCharta(char: ChartaCharacter, locale: Locale | string): string {
  return char.names[locale] || char.names[char.primaryLanguage] || Object.values(char.names)[0] || "";
}

export function toChartaCharConfig(char: ChartaCharacter, locale: Locale): CharConfig {
  const name = nameForCharta(char, locale);
  return { id: char.id, name, sub: "Charta", hex: char.hex,
    // Legacy controls expect an emoji here; uploaded images render in Charta and the custom portrait stage.
    avatar: char.avatar.startsWith("data:") ? "✦" : char.avatar,
    keys: [...new Set(Object.values(char.names))], lore: char.description, baseStats: { Obsession: 0 } };
}

export function asChartaPromptData(char: ChartaCharacter) {
  return { id: char.id, name: char.names[char.primaryLanguage], names: char.names, description: char.description, hex: char.hex };
}

export function decodeChartaImport(value: unknown): ChartaCharacter {
  if (!isRecord(value) || value.format !== CHARTA_FORMAT || value.version !== 1) throw new Error("Not a Charta character JSON v1 file.");
  return parseChartaCharacter(value.character);
}

export function encodeChartaExport(char: ChartaCharacter): string {
  return JSON.stringify({ format: CHARTA_FORMAT, version: 1, character: char }, null, 2);
}
