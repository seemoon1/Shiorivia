import type { ChartaTimelineStage } from "./chartaWorld";
import { CHAR_DATA } from "../data/char_config";

export type ChartaRelationship = {
  id: string;
  targetName: string;
  targetId?: string;
  content: string;
  /** Ordered period labels in the character's own world, optionally empty (always active). */
  periods: string[];
};
export type ChartaExperience = {
  id: string;
  content: string;
  periods: string[];
};
export type ChartaLoreProfile = {
  intro: string;
  personality: string;
  /** Always available even when no relationship entries have been made. */
  relationshipNotes: string;
  relationships: ChartaRelationship[];
  /** Main freeform unbound experiences editor. */
  experienceNotes: string;
  experiences: ChartaExperience[];
  guidance: string;
};
export type ChartaIdentityExtras = {
  aliases?: string[];
  hairColor?: string;
  eyeColor?: string;
  height?: string;
  birthday?: string;
  zodiac?: string;
  moeTags?: string[];
};

const record = (x: unknown): x is Record<string, unknown> => Boolean(x && typeof x === "object" && !Array.isArray(x));
const idRule = /^(?:charta|self)-[a-zA-Z0-9-]{8,90}$/;
const builtinIds = new Set(CHAR_DATA.map(char => char.id));
const validTargetId = (id: string) => idRule.test(id) || builtinIds.has(id);
const entryId = /^[a-zA-Z0-9_-]{1,100}$/;
const stageName = (x: unknown): x is string => typeof x === "string" && x.length > 0 && x.length <= 100;
const checkText = (x: unknown, limit: number, name: string): string => {
  if (x === undefined || x === null) return "";
  if (typeof x !== "string" || x.length > limit) throw new Error(`${name}不能超过${limit}字`);
  return x;
};

export const emptyChartaLore = (): ChartaLoreProfile => ({
  intro: "", personality: "", relationshipNotes: "", relationships: [],
  experienceNotes: "", experiences: [], guidance: "",
});

/** Allow missing profile for v1 characters; validate real v2 entries strictly. */
export function parseChartaLoreProfile(value: unknown): ChartaLoreProfile | undefined {
  if (value === undefined || value === null) return undefined;
  if (!record(value)) throw new Error("无效的分段人物设定");
  const rawRel = value.relationships ?? [];
  const rawExp = value.experiences ?? [];
  if (!Array.isArray(rawRel) || rawRel.length > 100 || !Array.isArray(rawExp) || rawExp.length > 100)
    throw new Error("每个角色最多可建立100条关系、100段经历");
  const periods = (value: unknown): string[] => {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > 80 || !value.every(stageName))
      throw new Error("关联时间线数据无效");
    const unique = value.map((s: string) => s.trim());
    if (!unique.every(Boolean) || new Set(unique).size !== unique.length) throw new Error("关联时间线不能重复或为空");
    return unique;
  };
  const relationships: ChartaRelationship[] = rawRel.map((raw, i) => {
    if (!record(raw)) throw new Error("无效的人物关系");
    const targetName = checkText(raw.targetName, 100, "关系对象名称").trim();
    if (!targetName) throw new Error(`第${i + 1}条人物关系必须填写对应角色名称`);
    const targetId = typeof raw.targetId === "string" && validTargetId(raw.targetId) ? raw.targetId : undefined;
    return {
      id: typeof raw.id === "string" && entryId.test(raw.id) ? raw.id : `relation-${i}`,
      targetName, ...(targetId ? { targetId } : {}),
      content: checkText(raw.content, 12000, "人物关系描述"),
      periods: periods(raw.periods),
    };
  });
  const experiences: ChartaExperience[] = rawExp.map((raw, i) => {
    if (!record(raw)) throw new Error("无效的经历条目");
    return {
      id: typeof raw.id === "string" && entryId.test(raw.id) ? raw.id : `experience-${i}`,
      content: checkText(raw.content, 12000, "主要经历描述"), periods: periods(raw.periods),
    };
  });
  const idUnique = (items: Array<{id:string}>, label: string) => {
    if (new Set(items.map(item => item.id)).size !== items.length) throw new Error(label + "的条目ID不能重复");
  };
  idUnique(relationships, "人物关系"); idUnique(experiences, "经历");
  return {
    intro: checkText(value.intro, 20000, "简介"),
    personality: checkText(value.personality, 20000, "性格与行为逻辑"),
    relationshipNotes: checkText(value.relationshipNotes, 20000, "无关联人物关系"),
    relationships,
    experienceNotes: checkText(value.experienceNotes, 20000, "无关联经历"),
    experiences,
    guidance: checkText(value.guidance, 20000, "AI还原注意事项"),
  };
}

export function parseChartaIdentityExtras(value: Record<string, unknown>): ChartaIdentityExtras {
  const tokens = (x: unknown, label: string): string[] => {
    if (x === undefined || x === null) return [];
    if (!Array.isArray(x) || x.length > 50 || !x.every(v => typeof v === "string" && v.length <= 100))
      throw new Error(label + "格式不正确（最多50个，每个100字）");
    return [...new Set((x as string[]).map(v => v.trim()).filter(Boolean))];
  };
  return {
    aliases: tokens(value.aliases, "别号"),
    hairColor: checkText(value.hairColor, 100, "发色"),
    eyeColor: checkText(value.eyeColor, 100, "瞳色"),
    height: checkText(value.height, 100, "身高"),
    birthday: checkText(value.birthday, 100, "生日"),
    zodiac: checkText(value.zodiac, 100, "星座"),
    moeTags: tokens(value.moeTags, "萌点"),
  };
}

/** Enforced in the editor AND during disk saves (with authoritative world stages). */
export function validateChartaTimelineLinks(
  profile: ChartaLoreProfile, stages: readonly ChartaTimelineStage[],
): string | null {
  const positions = new Map(stages.map((s, i) => [s.period, i]));
  const entries = [...profile.relationships, ...profile.experiences];
  for (const entry of entries) {
    if (!entry.periods.length) continue;
    const indices = entry.periods.map(p => positions.get(p));
    if (indices.some(p => p === undefined)) return "关联时间线必须属于角色绑定的世界观";
    const ordered = indices as number[];
    if (!ordered.every((position, i) => i === 0 || position === ordered[i - 1] + 1)) return "关联的时间线必须按时间顺序连续，不能跳过中间时期";
  }
  return null;
}

/** A picked relationship target must belong to the editing character's world.
 * User-entered names without targetId remain valid for unknown characters. */
export function validateChartaRelationshipTargets(
  profile: ChartaLoreProfile,
  worldId: string | undefined,
  custom: readonly { id: string; worldId?: string }[],
): string | null {
  for (const relation of profile.relationships) {
    if (!relation.targetId) continue;
    const targetWorld = builtinIds.has(relation.targetId) ? "bang-dream"
      : custom.find(char => char.id === relation.targetId)?.worldId;
    if (!worldId || !targetWorld || targetWorld !== worldId)
      return "关联角色必须属于当前角色的世界观；如需跨世界的人物，请手动填写名称";
  }
  return null;
}

export type ChartaPromptCharacter = {
  id: string;
  name: string;
  names: Record<string, string>;
  gender?: string;
  genderCustom?: string;
  worldId?: string | null;
  description?: string;
  profile?: ChartaLoreProfile;
} & ChartaIdentityExtras;

/** The only Charta biography formatter used for story mode and other character chats. */
export function formatChartaLore(
  char: ChartaPromptCharacter,
  period: string | null,
  stages: readonly ChartaTimelineStage[] = [],
  includeAllWhenUnscoped = false,
): string {
  const data = char.profile || { ...emptyChartaLore(), intro: char.description || "" };
  const activeIndex = period === null ? -1 : stages.findIndex(stage => stage.period === period);
  const index = new Map(stages.map((stage, i) => [stage.period, i]));
  const visible = (periods: string[]) => {
    if (!periods.length) return true;
    if (period === null && includeAllWhenUnscoped) return true;
    if (activeIndex < 0) return false;
    // Completed events remain part of a character's memory. A range never expires.
    return periods.some(value => {
      const start = index.get(value);
      return start !== undefined && start <= activeIndex;
    });
  };
  const base: string[] = [`名称：${char.name}`];
  const uniqueNames = Object.values(char.names || {}).filter((v, i, a) => a.indexOf(v) === i);
  if (uniqueNames.length > 1) base.push("其他名称：" + uniqueNames.join("、"));
  if (char.aliases?.length) base.push("别号：" + char.aliases.join("、"));
  const extras = [["性别", char.gender === "custom" ? char.genderCustom : char.gender],
    ["发色", char.hairColor], ["瞳色", char.eyeColor], ["身高", char.height],
    ["生日", char.birthday], ["星座", char.zodiac],
    ["萌点", char.moeTags?.join("、")]];
  for (const [name, content] of extras) if (content && content !== "undisclosed") base.push(name + "：" + content);
  const relationships = data.relationships.filter(entry => visible(entry.periods) && entry.content.trim())
    .map(entry => `对${entry.targetName}：${entry.content}`);
  const experiences = data.experiences.filter(entry => visible(entry.periods) && entry.content.trim())
    .map(entry => entry.content);
  const parts: Array<[string, string]> = [
    ["【角色身份】", base.join("\n")],
    ["一、简介", data.intro],
    ["二、主要性格与行为逻辑", data.personality],
    ["三、人物关系", [data.relationshipNotes, ...relationships].filter(Boolean).join("\n\n")],
    ["四、主要经历", [data.experienceNotes, ...experiences].filter(Boolean).join("\n\n")],
    ["五、AI还原角色注意事项", data.guidance],
  ];
  return parts.filter(([, v]) => v.trim()).map(([title, v]) => title + "\n" + v.trim()).join("\n\n");
}
