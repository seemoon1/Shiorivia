import type { Locale } from "./locale";
import type { CharConfig } from "../data/char_config";
import { formatChartaLore, parseChartaIdentityExtras, parseChartaLoreProfile, type ChartaIdentityExtras, type ChartaLoreProfile } from "./chartaLore";

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

export type ChartaGender = "male" | "female" | "undisclosed" | "custom";
export type ChartaCharacter = ChartaIdentityExtras & {
  id: string;
  /** Optional existing world ID; undefined means a world-neutral character. */
  worldId?: string;
  primaryLanguage: string;
  names: Record<string, string>;
  hex: string;
  avatar: string; // Emoji preset or validated, resized data:image/png/jpeg/webp
  portrait?: string; // Local-only, disk-backed full-body illustration URL
  description: string; // Legacy v1 notes, retained for compatibility.
  profile?: ChartaLoreProfile;
  gender?: ChartaGender;
  genderCustom?: string;
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
  if (input.description !== undefined && (typeof input.description !== "string" || input.description.length > 20000)) throw new Error("Character notes exceed the limit.");
  const description = typeof input.description === "string" ? input.description : "";
  const profile = parseChartaLoreProfile(input.profile) || { intro: description, personality: "", relationshipNotes: "", relationships: [], experienceNotes: "", experiences: [], guidance: "" };
  if (!profile.intro.trim()) throw new Error("请先填写角色简介（必填）；其他四类设定均为选填");
  const identity = parseChartaIdentityExtras(input);
  const gender = ["male", "female", "undisclosed", "custom"].includes(String(input.gender)) ? input.gender as ChartaGender : "undisclosed";
  const genderCustom = typeof input.genderCustom === "string" ? input.genderCustom.trim().slice(0, 100) : "";
  if (gender === "custom" && !genderCustom) throw new Error("A custom gender description is required.");
  const worldId = input.worldId === undefined || input.worldId === "" || input.worldId === null ? undefined : input.worldId;
  if (worldId !== undefined && (typeof worldId !== "string" || !/^(?:bang-dream|world-[a-zA-Z0-9-]{8,90})$/.test(worldId))) {
    throw new Error("Invalid character world binding.");
  }
  const id = typeof input.id === "string" && /^charta-[a-zA-Z0-9-]{8,90}$/.test(input.id) ? input.id : makeChartaId();
  const portrait = typeof input.portrait === "string" && new RegExp(`^/api/local/charta\\?portrait=${id}&v=[0-9]{1,14}$`).test(input.portrait)
    ? input.portrait : undefined;
  return { id, ...(worldId ? { worldId } : {}), primaryLanguage: input.primaryLanguage, names, hex: input.hex, avatar: input.avatar, portrait, description, profile, ...identity, gender, ...(gender === "custom" ? { genderCustom } : {}),
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
    keys: [...new Set([...Object.values(char.names), ...(char.aliases || [])])], lore: formatChartaLore({ ...char, name }, null, [], true), baseStats: { Obsession: 0 } };
}

export function asChartaPromptData(char: ChartaCharacter) {
  return { id: char.id, name: char.names[char.primaryLanguage], names: char.names, description: char.description, profile: char.profile, aliases: char.aliases, hairColor: char.hairColor, eyeColor: char.eyeColor, height: char.height, birthday: char.birthday, zodiac: char.zodiac, moeTags: char.moeTags, hex: char.hex, worldId: char.worldId || null, gender: char.gender || "undisclosed", genderCustom: char.genderCustom || "" };
}

export function decodeChartaImport(value: unknown): ChartaCharacter {
  if (!isRecord(value) || value.format !== CHARTA_FORMAT || ![1, 2].includes(Number(value.version))) throw new Error("Not a Charta character JSON v1/v2 file.");
  return parseChartaCharacter(value.character);
}

export function encodeChartaExport(char: ChartaCharacter): string {
  return JSON.stringify({ format: CHARTA_FORMAT, version: 2, character: char }, null, 2);
}
