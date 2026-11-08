/**
 * Timeline-aware BanG Dream! lore selection.
 *
 * Canon stages are T-0-1 ... T-9-10. A record [T-a-b] becomes known at
 * the start of stage a, remains available through stage b, and is retained
 * as historical memory for every later stage. Untagged relationship prose
 * is unconditional. No substring/character limit truncates an individual
 * section or event.
 *
 * The identity/personality/style sections deliberately use an editorial
 * (all-era) point of view; they are not necessarily the character's present
 * knowledge. The selected historical events and relationship records define
 * what the character has actually experienced in the current period.
 */

const LORE_HEADINGS = [
  "### 【基础身份与称呼】",
  "### 一、主要性格与行为逻辑",
  "### 二、核心人物关系（随时间线动态变化）",
  "### 三、主要经历（按时间线严格对应）",
  "### 四、AI还原角色注意事项（情境化倾向指南）",
] as const;

const TIMELINE_RECORD = /^\[T-(\d+)-(\d+)\]\s*/gm;
const RELATIONSHIP_HEADING = /^####\s+/gm;

export function bangDreamPeriodIndex(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = /^(?:T-)?(\d+)-(\d+)$/.exec(value.trim());
  if (!match) return null;
  const start = Number(match[1]);
  const end = Number(match[2]);
  return Number.isInteger(start) && start >= 0 && start <= 9 && end === start + 1
    ? start : null;
}

function timelineRecords(text: string): Array<{ from: number; to: number; text: string }> {
  const tags = [...text.matchAll(TIMELINE_RECORD)];
  if (!tags.length) return [{ from: 0, to: 10, text: text.trim() }];
  const output: Array<{ from: number; to: number; text: string }> = [];
  if (tags[0].index && text.slice(0, tags[0].index).trim()) {
    output.push({ from: 0, to: 10, text: text.slice(0, tags[0].index).trim() });
  }
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    const from = Number(tag[1]);
    const to = Number(tag[2]);
    // A malformed range must not silently release future story information.
    if (!Number.isInteger(from) || from < 0 || from > 9 || !Number.isInteger(to)
      || to <= from || to > 10) continue;
    const end = tags[i + 1]?.index ?? text.length;
    const body = text.slice(tag.index! + tag[0].length, end).trim();
    if (body) output.push({ from, to, text: tag[0].trim() + " " + body });
  }
  return output;
}

function arrived(record: { from: number }, period: number): boolean {
  // The 'to' field describes the range of relevance, NOT a memory expiry.
  // At any later period the character still remembers the past event.
  return record.from <= period;
}

function selectRelationships(source: string, period: number): string {
  const headers = [...source.matchAll(RELATIONSHIP_HEADING)];
  if (!headers.length) {
    return timelineRecords(source).filter(record => arrived(record, period))
      .map(record => record.text).join("\n\n");
  }
  const output: string[] = [];
  const prefix = source.slice(0, headers[0].index).trim();
  if (prefix) output.push(prefix);
  for (let i = 0; i < headers.length; i++) {
    const start = headers[i].index!;
    const end = headers[i + 1]?.index ?? source.length;
    const section = source.slice(start, end).trim();
    const lineBreak = section.indexOf("\n");
    const title = lineBreak < 0 ? section : section.slice(0, lineBreak);
    const body = lineBreak < 0 ? "" : section.slice(lineBreak + 1);
    const selected = timelineRecords(body).filter(record => arrived(record, period))
      .map(record => record.text).join("\n\n");
    if (selected) output.push(title + "\n" + selected);
  }
  return output.join("\n\n");
}

function selectExperience(source: string, period: number): string {
  return timelineRecords(source).filter(record => arrived(record, period))
    .map(record => record.text).join("\n\n");
}

export function loreForBangDreamPeriod(
  lore: string,
  period: string | null | undefined,
): string {
  const at = bangDreamPeriodIndex(period);
  if (!lore.trim()) return "";
  const cuts = LORE_HEADINGS.map(title => lore.indexOf(title));
  if (cuts.some(index => index < 0) || cuts.some((index, i) => i > 0 && index <= cuts[i - 1])) {
    // Older or custom biographies have no time-aware schema.
    // Avoid cutting arbitrary prose in half. This fallback is only for
    // unstructured content, not a claim that the text obeys canon gating.
    return lore;
  }
  const sections = cuts.map((start, index) =>
    lore.slice(start + LORE_HEADINGS[index].length, cuts[index + 1] ?? lore.length).trim());
  // With an invalid period, never fall back to the latest character history.
  const relations = at === null ? "" : selectRelationships(sections[2], at);
  const experiences = at === null ? "" : selectExperience(sections[3], at);
  const parts = [
    LORE_HEADINGS[0] + "\n" + sections[0],
    LORE_HEADINGS[1] + "\n" + sections[1],
    relations ? LORE_HEADINGS[2] + "\n" + relations : "",
    experiences ? LORE_HEADINGS[3] + "\n" + experiences : "",
    LORE_HEADINGS[4] + "\n" + sections[4],
  ];
  return "[TIME-SCOPED CHARACTER LORE]\n"
    + "基础资料、性格分析与还原指南为编辑视角，不等于角色已知未来事实；当前可回忆的经历及关系，以所选PERIOD之前已发生的记录为准。"
    + (at === null ? "\n未提供有效BanG Dream原作时期：不注入任何带日期的剧情和关系。" : "\n当前原作时间线：" + "T-" + at + "-" + (at + 1))
    + "\n\n" + parts.filter(Boolean).join("\n\n")
    + "\n[END TIME-SCOPED CHARACTER LORE]";
}
