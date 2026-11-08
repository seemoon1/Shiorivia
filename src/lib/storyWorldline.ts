import type { ChartaWorld, ChartaTimelineStage } from "./chartaWorld";

export const BANG_DREAM_WORLD_ID = "bang-dream";
export const BANG_DREAM_WORLD_NAME = "BanG Dream!";

/** Same T-x-y stages used by VIAE, grouped into the requested ERA periods. */
export const BANG_DREAM_CANON: ChartaTimelineStage[] = [
  { era: "早年", period: "T-0-1" },
  { era: "初三春夏季", period: "T-1-2" },
  { era: "初三、毕业后的暑假", period: "T-2-3" },
  { era: "高一秋冬季", period: "T-3-4" },
  { era: "高一秋冬季", period: "T-4-5" },
  { era: "高一春夏季", period: "T-5-6" },
  { era: "高一春夏季", period: "T-6-7" },
  { era: "高一春夏季", period: "T-7-8" },
  { era: "高一春夏季", period: "T-8-9" },
  { era: "未来", period: "T-9-10" },
];

export type StoryWorldline = {
  worldId: string;
  worldName: string;
  worldDescription: string;
  canonTimeline: ChartaTimelineStage[];
  kind: "canon" | "au";
  /** AU-only required reference into the selected world\x27s canonical stages. */
  baseEra?: string;
  basePeriod?: string;
  era: string;
  period: string;
  event: string;
};

export const worldlineFor = (world: ChartaWorld | null): StoryWorldline => ({
  worldId: world?.id || BANG_DREAM_WORLD_ID,
  worldName: world?.name || BANG_DREAM_WORLD_NAME,
  worldDescription: world?.description || "",
  canonTimeline: world?.canonTimeline || BANG_DREAM_CANON,
  kind: "canon", era: "", period: "", event: "",
});

/** Validate a snapshot from a save or request; never trust client-supplied world data blindly. */
export function parseStoryWorldline(input: unknown): StoryWorldline | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const value = input as Record<string, unknown>;
  if (typeof value.worldId !== "string" || !/^(?:bang-dream|world-[a-zA-Z0-9-]{8,90})$/.test(value.worldId)) return null;
  const text = (field: string, max = 100) => typeof value[field] === "string" && (value[field] as string).length <= max
    ? (value[field] as string).trim() : null;
  const worldName = text("worldName"); const worldDescription = text("worldDescription", 20000);
  const era = text("era"); const period = text("period"); const event = text("event", 500);
  if (!worldName || worldDescription === null || !era || !period || event === null) return null;
  const kind = value.kind === "au" ? "au" : value.kind === "canon" ? "canon" : null;
  if (!kind) return null;
  const rawStages = value.worldId === BANG_DREAM_WORLD_ID ? BANG_DREAM_CANON : value.canonTimeline;
  if (!Array.isArray(rawStages) || rawStages.length > 80) return null;
  const stages: ChartaTimelineStage[] = [];
  for (const stage of rawStages) {
    if (!stage || typeof stage !== "object" || typeof stage.era !== "string" || typeof stage.period !== "string"
      || stage.era.length > 100 || stage.period.length > 100 || !stage.era.trim() || !stage.period.trim()) return null;
    stages.push({ era: stage.era.trim(), period: stage.period.trim() });
  }
  if (kind === "canon" && !stages.some(stage => stage.era === era && stage.period === period)) return null;
  // For AU, the story's creative ERA/PERIOD remains free-form, while the
  // baseline MUST reference an actual canonical period of this world.
  // Legacy AU saves without a baseline remain readable if their old period
  // happens to match a canonical period; otherwise they require reselection.
  const baseEra = text("baseEra");
  const basePeriod = text("basePeriod");
  const legacyBase = stages.find(stage => stage.period === period);
  const reference = kind === "au"
    ? stages.find(stage => stage.period === (basePeriod || legacyBase?.period)
        && stage.era === (baseEra || legacyBase?.era))
    : undefined;
  if (kind === "au" && !reference) return null;
  return {
    worldId: value.worldId, worldName, worldDescription, canonTimeline: stages,
    kind, era, period, event,
    ...(kind === "au" ? { baseEra: reference!.era, basePeriod: reference!.period } : {}),
  };
}

/** An existing legacy timeline is never silently discarded or rewritten. */
export function describeStoryWorldline(value: StoryWorldline): string {
  return `${value.worldName} · ${value.kind === "canon" ? "原作" : "AU"} · ${value.era} / ${value.period}${value.kind === "au" && value.basePeriod ? ` · 基准：${value.baseEra || ""} / ${value.basePeriod}` : ""}${value.event ? ` · ${value.event}` : ""}`;
}
