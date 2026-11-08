import { parseChartaSelf, type ChartaSelf } from "./chartaSelf";
import { parseChartaWorld, type ChartaWorld } from "./chartaWorld";

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

// Charta character exports remain in charta.ts (format v1/v2).
// Self and world exports use separate strict envelopes to prevent accidentally
// importing a session JSON or the wrong type of archive.
export const CHARTA_SELF_FORMAT = "shiorivia-self";
export const CHARTA_WORLD_FORMAT = "shiorivia-world";

export function encodeChartaSelfExport(self: ChartaSelf): string {
  return JSON.stringify({
    format: CHARTA_SELF_FORMAT,
    version: 1,
    self: parseChartaSelf(self),
  }, null, 2);
}

export function decodeChartaSelfImport(value: unknown): ChartaSelf {
  if (!record(value) || value.format !== CHARTA_SELF_FORMAT || value.version !== 1) {
    throw new Error("不是有效的 Charta 自设 JSON 文件（应为 shiorivia-self）");
  }
  return parseChartaSelf(value.self);
}

export function encodeChartaWorldExport(world: ChartaWorld): string {
  return JSON.stringify({
    format: CHARTA_WORLD_FORMAT,
    version: 1,
    world: parseChartaWorld(world),
  }, null, 2);
}

export function decodeChartaWorldImport(value: unknown): ChartaWorld {
  if (!record(value) || value.format !== CHARTA_WORLD_FORMAT || value.version !== 1) {
    throw new Error("不是有效的 Charta 世界观 JSON 文件（应为 shiorivia-world）");
  }
  return parseChartaWorld(value.world);
}

export function saveChartaJsonFile(filename: string, json: string): void {
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    // Defer revocation until after the browser has handled the click.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
