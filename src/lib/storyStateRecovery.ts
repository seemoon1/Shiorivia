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

/** Model responses from different gateways can use equivalent, but not identical,
 * names/shapes. Normalize only well-defined aliases, without inventing missing
 * required story data or treating every syntactically valid JSON as usable.
 */
type StoryObject = Record<string, unknown>;
const isRecord = (v: unknown): v is StoryObject =>
  !!v && typeof v === "object" && !Array.isArray(v);

const SUGGESTION_TYPES = ["fun", "rational", "radical"] as const;
const TIMELINE_TYPES = ["major", "medium", "minor"] as const;

/** Returns a new value; never mutates the untrusted model response. */
export function normalizeStoryProtocol(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const state: StoryObject = { ...value };

  // Common alternative: [{ tag:"fun", text:"..." }, ...] instead of
  // { fun:"...", rational:"...", radical:"..." }.
  if (Array.isArray(state.suggestions)) {
    const normalized: StoryObject = {};
    for (const entry of state.suggestions) {
      if (!isRecord(entry)) continue;
      const tag = entry.tag ?? entry.type;
      const text = entry.text ?? entry.description;
      if (SUGGESTION_TYPES.some(key => key === tag) && typeof text === "string") {
        normalized[String(tag)] = text;
      }
    }
    state.suggestions = normalized;
  }

  // Common alternative: [{type:"minor",description:"..."}].
  // Unknown levels are ignored, and absent levels remain empty strings.
  if (Array.isArray(state.timeline)) {
    const normalized: StoryObject = { major:"", medium:"", minor:"" };
    for (const entry of state.timeline) {
      if (!isRecord(entry)) continue;
      const type = entry.type ?? entry.tag;
      const description = entry.description ?? entry.text;
      if (TIMELINE_TYPES.some(key => key === type) && typeof description === "string") {
        normalized[String(type)] = description;
      }
    }
    state.timeline = normalized;
  }

  // The model may use charId/characterName rather than id/name, and
  // favorability rather than affection. Do not guess how "trust" maps to
  // another score; retain it as additional text/state data.
  if (Array.isArray(state.character)) {
    state.character = state.character.map(value => {
      if (!isRecord(value)) return value;
      const entry: StoryObject = { ...value };
      if (typeof entry.id !== "string" && typeof entry.charId === "string") entry.id = entry.charId;
      if (typeof entry.name !== "string" && typeof entry.characterName === "string") entry.name = entry.characterName;
      if (typeof entry.innerState !== "string" && typeof entry.innerPsychology === "string") {
        entry.innerState = entry.innerPsychology;
      }
      if (typeof entry.bodyState !== "string" && typeof entry.status === "string") {
        entry.bodyState = entry.status;
      }
      if (typeof entry.affection !== "number" && typeof entry.favorability === "number"
          && Number.isFinite(entry.favorability)) {
        entry.affection = entry.favorability;
      }
      return entry;
    });
  }
  return state;
}

/** Strict structural errors, primarily for useful diagnostics after a repair. */
export function storyProtocolIssues(value: unknown): string[] {
  if (!isRecord(value)) return ["game_state 必须为 JSON 对象"];
  const issues: string[] = [];
  if (!("protagonist" in value)) issues.push("缺少 protagonist");
  if (!Array.isArray(value.character)) issues.push("character 必须为数组");
  if (!Array.isArray(value.sceneCastIds)) issues.push("sceneCastIds 必须为数组");
  if (!isRecord(value.suggestions)) {
    issues.push("suggestions 必须为包含 fun / rational / radical 的对象");
  } else {
    for (const key of SUGGESTION_TYPES) {
      if (typeof value.suggestions[key] !== "string") issues.push("suggestions." + key + " 必须为字符串");
    }
  }
  return issues;
}

/** Validate AFTER normalizeStoryProtocol. Keep this narrow to avoid turning
 * harmless missing optional details into extra costly model repair calls.
 */
export function isUsableStoryProtocol(value: unknown): boolean {
  return storyProtocolIssues(value).length === 0;
}
