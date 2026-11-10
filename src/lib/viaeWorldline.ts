import type { ViaeConversation } from "../types";
import { BANG_DREAM_CANON, parseStoryWorldline, worldlineFor, type StoryWorldline } from "./storyWorldline";

/** Existing VIAE routes predate the shared worldline picker. Leave their saved fields unchanged. */
export function viaeWorldline(group: Pick<ViaeConversation, "storyWorldline" | "reality" | "timeline" | "auContext">): StoryWorldline {
  const parsed = parseStoryWorldline(group.storyWorldline);
  if (parsed) return parsed;
  const p = String(group.timeline || "").replace(/^T-?/i, "");
  const stage = BANG_DREAM_CANON.find(s => s.period === (p.startsWith("T-") ? p : "T-" + p))
    || BANG_DREAM_CANON.find(s => s.period === "T-5-6")!;
  const original = worldlineFor(null);
  if (group.reality === "au") return {
    ...original, kind: "au", era: "AU", period: "AU",
    baseEra: stage.era, basePeriod: stage.period, event: "",
  };
  return { ...original, kind: "canon", era: stage.era, period: stage.period, event: "" };
}
