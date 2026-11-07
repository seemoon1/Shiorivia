export type ChartaTimelineStage = { era: string; period: string };
export type ChartaWorld = {
  id: string;
  name: string;
  canonTimeline: ChartaTimelineStage[];
  description: string;
  createdAt: number;
  updatedAt: number;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

export const newChartaWorld = (): ChartaWorld => ({
  id: `world-${crypto.randomUUID()}`, name: "", canonTimeline: [], description: "",
  createdAt: Date.now(), updatedAt: Date.now(),
});

/** User-authored setting data; keep it separate from Charta character profiles. */
export function parseChartaWorld(value: unknown): ChartaWorld {
  if (!isObject(value)) throw new Error("无效的世界观资料");
  const id = value.id;
  const name = value.name;
  const description = value.description;
  if (typeof id !== "string" || !/^world-[a-zA-Z0-9-]{8,90}$/.test(id)) throw new Error("无效的世界观 ID");
  if (typeof name !== "string" || !name.trim() || name.trim().length > 100) throw new Error("世界观名称不能为空（最多 100 字）");
  if (typeof description !== "string" || description.length > 20000) throw new Error("世界观设定过长");
  if (!Array.isArray(value.canonTimeline) || value.canonTimeline.length > 80) throw new Error("原作时间线最多 80 个时期");
  const canonTimeline = value.canonTimeline.map(entry => {
    if (!isObject(entry) || typeof entry.era !== "string" || typeof entry.period !== "string"
      || !entry.era.trim() || !entry.period.trim() || entry.era.trim().length > 100 || entry.period.trim().length > 100) {
      throw new Error("原作时间线的 ERA 和 PERIOD 必须填写（各最多 100 字）");
    }
    return { era: entry.era.trim(), period: entry.period.trim() };
  });
  // Each period should map to exactly one era; the same era may cover several periods.
  const periods = new Set(canonTimeline.map(stage => stage.period));
  if (periods.size !== canonTimeline.length) throw new Error("原作时间线的 PERIOD 不能重复");
  return {
    id, name: name.trim(), description,
    canonTimeline,
    createdAt: typeof value.createdAt === "number" && Number.isFinite(value.createdAt) ? value.createdAt : Date.now(),
    updatedAt: Date.now(),
  };
}
