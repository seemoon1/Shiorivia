import { CHARTA_LANGUAGES, type ChartaGender } from "./charta";
import { parseChartaIdentityExtras, parseChartaLoreProfile, type ChartaIdentityExtras, type ChartaLoreProfile, formatChartaLore } from "./chartaLore";

export type ChartaSelf = ChartaIdentityExtras & {
  id: string;
  primaryLanguage: string;
  names: Record<string, string>;
  gender: ChartaGender;
  genderCustom?: string;
  hex: string;
  description: string;
  worldId?: string;
  profile?: ChartaLoreProfile;
  createdAt: number;
  updatedAt: number;
};

export const newChartaSelf = (language = "zh-CN"): ChartaSelf => ({
  id: `self-${crypto.randomUUID()}`, primaryLanguage: language,
  names: { [language]: "" }, gender: "undisclosed", hex: "#799783",
  description: "", profile: { intro:"", personality:"", relationshipNotes:"", relationships:[], experienceNotes:"", experiences:[], guidance:"" }, createdAt: Date.now(), updatedAt: Date.now(),
});

export function parseChartaSelf(input: unknown): ChartaSelf {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid self profile");
  const data = input as Record<string, unknown>;
  const validLanguage = (lang: string) => /^[a-z]{2,3}(?:-[a-zA-Z0-9]{2,8}){0,3}$/.test(lang);
  if (typeof data.primaryLanguage !== "string" || !validLanguage(data.primaryLanguage)) throw new Error("Invalid language");
  if (!data.names || typeof data.names !== "object" || Array.isArray(data.names)) throw new Error("Names are required");
  const names: Record<string, string> = {};
  for (const [language, value] of Object.entries(data.names as Record<string, unknown>)) {
    if (!validLanguage(language) || typeof value !== "string" || value.length > 100) throw new Error("Invalid name");
    if (value.trim()) names[language] = value.trim();
  }
  if (!names[data.primaryLanguage] || Object.keys(names).length > 12) throw new Error("A primary name is required (up to 12 languages)");
  const genders: ChartaGender[] = ["male", "female", "undisclosed", "custom"];
  const gender = data.gender as ChartaGender;
  if (!genders.includes(gender)) throw new Error("Invalid gender");
  const genderCustom = typeof data.genderCustom === "string" ? data.genderCustom.trim() : "";
  if (genderCustom.length > 100 || (gender === "custom" && !genderCustom)) throw new Error("Please describe the custom gender");
  if (typeof data.hex !== "string" || !/^#[0-9a-fA-F]{6}$/.test(data.hex)) throw new Error("Invalid theme color");
  if (data.description !== undefined && (typeof data.description !== "string" || data.description.length > 20000)) throw new Error("Description too long");
  const description = typeof data.description === "string" ? data.description : "";
  const profile = parseChartaLoreProfile(data.profile) || (description.trim()
    ? { intro:description, personality:"", relationshipNotes:"", relationships:[], experienceNotes:"", experiences:[], guidance:"" }
    : undefined);
  if (data.profile !== undefined && !profile?.intro.trim()) throw new Error("自设的简介为必填项");
  const identity = parseChartaIdentityExtras(data);
  const worldId = data.worldId == null || data.worldId === "" ? undefined : data.worldId;
  if (worldId !== undefined && (typeof worldId !== "string" || !/^(?:bang-dream|world-[a-zA-Z0-9-]{8,90})$/.test(worldId))) throw new Error("自设所属世界观无效");
  if (typeof data.id !== "string" || !/^self-[a-zA-Z0-9-]{8,90}$/.test(data.id)) throw new Error("Invalid self ID");
  return {
    id: data.id, primaryLanguage: data.primaryLanguage, names, gender,
    ...(gender === "custom" ? { genderCustom } : {}), hex: data.hex,
    description, profile, ...identity, ...(worldId ? { worldId } : {}),
    createdAt: typeof data.createdAt === "number" && Number.isFinite(data.createdAt) ? data.createdAt : Date.now(),
    updatedAt: Date.now(),
  };
}

export function selfName(self: ChartaSelf, locale: string): string {
  return self.names[locale] || self.names[self.primaryLanguage] || Object.values(self.names)[0] || "";
}

export function selfGenderLabel(gender: ChartaGender, custom?: string): string {
  return gender === "male" ? "男" : gender === "female" ? "女" : gender === "custom" ? (custom || "自定义") : "未透露";
}

export function asChartaSelfPromptData(self: ChartaSelf) {
  return {
    id: self.id, names: self.names, primaryLanguage: self.primaryLanguage,
    gender: self.gender, genderCustom: self.genderCustom || "",
    hex: self.hex, description: self.description, worldId: self.worldId || null,
    profile: self.profile, aliases: self.aliases || [], hairColor: self.hairColor || "",
    eyeColor: self.eyeColor || "", height: self.height || "", birthday: self.birthday || "",
    zodiac: self.zodiac || "", moeTags: self.moeTags || [],
  };
}

export const SELF_LANGUAGES = CHARTA_LANGUAGES;

/** Build an accurate, period-limited participant profile from user-authored Charta data. */
export function formatChartaSelfLore(self: ChartaSelf, period: string | null, stages: {era:string;period:string}[] = []) {
  return formatChartaLore({
    ...self, name: selfName(self, self.primaryLanguage),
  }, period, stages, period === null);
}
