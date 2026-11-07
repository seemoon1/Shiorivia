import type { Session } from "../types";

/** Snapshots are attached to the assistant message, not the session head:
 * removing the latest answer or its preceding user request can restore the
 * state that existed BEFORE that generation. They survive Local JSON saves.
 */
const STATE_FIELDS = [
  "stm", "ltm", "stmBackup", "turnCount", "protagonist", "charStatus",
  "plotSuggestions", "timeline", "sceneCastIds", "storyNextCastIds", "storyAllowCrossWorld", "lastDanmaku",
  "currentBackground", "live2dCharId", "currentEmotion", "currentOutfitId",
  "storyPovId", "storyPovLocked",
] as const;

type StateField = typeof STATE_FIELDS[number];
export type StoryStateSnapshot = {
  fields: Partial<Pick<Session, StateField>>;
  worldlineEvent: string;
};

function copy<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value)) as T;
}

export function snapshotStoryState(session: Session): StoryStateSnapshot {
  const fields: Record<string, unknown> = {};
  for (const key of STATE_FIELDS) fields[key] = copy(session[key]);
  return { fields: fields as StoryStateSnapshot["fields"], worldlineEvent: session.storyWorldline?.event || "" };
}

/** A brand-new story keeps its selected world/ERA/PERIOD and chosen role/self,
 * but has no AI-generated state, memories, cast, POV or event. */
export function emptyStoryState(session: Session): Session {
  return {
    ...session,
    stm: "", ltm: "", stmBackup: undefined, turnCount: 0,
    protagonist: undefined, charStatus: undefined, plotSuggestions: undefined,
    timeline: undefined, sceneCastIds: [], storyNextCastIds: [], lastDanmaku: [],
    currentBackground: undefined, live2dCharId: undefined,
    currentEmotion: undefined, currentOutfitId: undefined,
    storyPovId: null, storyPovLocked: false,
    storyWorldline: session.storyWorldline
      ? { ...session.storyWorldline, event: "" } : undefined,
  };
}

export function restoreStoryState(session: Session, snapshot: StoryStateSnapshot | undefined): Session {
  if (!snapshot || !snapshot.fields || typeof snapshot.fields !== "object") {
    // Old saves did not contain per-turn checkpoints. Better to clear stale
    // state than pretend it still belongs to the shortened conversation.
    return emptyStoryState(session);
  }
  const fields: Record<string, unknown> = {};
  for (const key of STATE_FIELDS) fields[key] = copy(snapshot.fields[key]);
  return {
    ...session,
    ...fields,
    storyWorldline: session.storyWorldline
      ? { ...session.storyWorldline, event: snapshot.worldlineEvent || "" } : undefined,
  } as Session;
}

/** A model can return syntactically valid JSON that is not a usable story state.
 * Validate the essential contract BEFORE using it to replace sidebar fields.
 */
export function isUsableStoryProtocol(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const state = value as Record<string, unknown>;
  if (!("protagonist" in state) || !Array.isArray(state.character) || !Array.isArray(state.sceneCastIds)) return false;
  if (!state.suggestions || typeof state.suggestions !== "object" || Array.isArray(state.suggestions)) return false;
  const suggestions = state.suggestions as Record<string, unknown>;
  return ["fun", "rational", "radical"].every(key => typeof suggestions[key] === "string");
}
