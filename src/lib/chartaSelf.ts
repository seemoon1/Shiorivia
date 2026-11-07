import { CHARTA_LANGUAGES, type ChartaGender } from "./charta";

export type ChartaSelf = {
  id: string;
  primaryLanguage: string;
  names: Record<string, string>;
  gender: ChartaGender;
  genderCustom?: string;
  hex: string;
  description: string;
  createdAt: number;
  updatedAt: number;
};

export const newChartaSelf = (language = "zh-CN"): ChartaSelf => ({
  id: `self-${crypto.randomUUID()}`, primaryLanguage: language,
  names: { [language]: "" }, gender: "undisclosed", hex: "#799783",
  description: "", createdAt: Date.now(), updatedAt: Date.now(),
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
  if (typeof data.description !== "string" || data.description.length > 20000) throw new Error("Description too long");
  if (typeof data.id !== "string" || !/^self-[a-zA-Z0-9-]{8,90}$/.test(data.id)) throw new Error("Invalid self ID");
  return {
    id: data.id, primaryLanguage: data.primaryLanguage, names, gender,
    ...(gender === "custom" ? { genderCustom } : {}), hex: data.hex,
    description: data.description,
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
    hex: self.hex, description: self.description,
  };
}

export const SELF_LANGUAGES = CHARTA_LANGUAGES;
