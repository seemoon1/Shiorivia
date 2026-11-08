/**
 * Novel-only chapter state. Unlike Story's <game_state>, this tracks the
 * narrative setting/active event and predicts who needs a FULL profile in the
 * following chapter. The WORLD / ERA / PERIOD is never inferred or overwritten.
 */
export type NovelState = {
  environment: string;
  event: string;
  nextSceneCastIds: string[];
};

const MAX_FIELD_LENGTH = 2000;
const MAX_CAST_IDS = 6;

export function parseNovelState(value: unknown): NovelState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.environment !== "string" || typeof record.event !== "string"
    || !record.environment.trim() || !record.event.trim()
    || record.environment.length > MAX_FIELD_LENGTH || record.event.length > MAX_FIELD_LENGTH
    || !Array.isArray(record.nextSceneCastIds) || record.nextSceneCastIds.length > 30
    || !record.nextSceneCastIds.every(id => typeof id === "string" && id.length <= 100)) return null;
  return {
    environment: record.environment.trim(),
    event: record.event.trim(),
    nextSceneCastIds: [...new Set(record.nextSceneCastIds)].slice(0, MAX_CAST_IDS),
  };
}

/** Choose the LAST valid completed state to avoid stale state from a model retry. */
export function extractNovelState(output: string): NovelState | null {
  const expression = /<novel_state\s*>([\s\S]*?)<\/novel_state\s*>/gi;
  let found: NovelState | null = null;
  for (const match of output.matchAll(expression)) {
    try {
      const state = parseNovelState(JSON.parse(match[1]));
      if (state) found = state;
    } catch { /* Ignore malformed JSON, never overwrite established state. */ }
  }
  return found;
}

/** Strip internal protocol from chapters, live previews, summaries and exports. */
export function stripNovelState(output: string): string {
  return output
    .replace(/<novel_state\s*>[\s\S]*?<\/novel_state\s*>/gi, "")
    .replace(/<novel_state\b[^>]*>[\s\S]*$/gi, "")
    .trim();
}
