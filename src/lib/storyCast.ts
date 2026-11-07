import { CHAR_DATA } from "../data/char_config";
import { BANG_DREAM_WORLD_ID } from "./storyWorldline";

/** Limit full character biographies per request to control prompt size. */
export const MAX_STORY_CAST = 6;
const builtinIds = new Set(CHAR_DATA.map(character => character.id));

export type StoryCastIdentity = { id: string; worldId?: string | null };

export function storyCastOrigin(character: StoryCastIdentity): string | null {
  return builtinIds.has(character.id) ? BANG_DREAM_WORLD_ID : character.worldId || null;
}

/** Unbound Charta characters are world-neutral; foreign-world ones need opt-in. */
export function storyCastAllowed(character: StoryCastIdentity, worldId: string, allowCrossWorld: boolean, registeredWorldIds: readonly string[]): boolean {
  const origin = storyCastOrigin(character);
  if (!origin || origin === worldId) return true;
  return allowCrossWorld && (origin === BANG_DREAM_WORLD_ID || registeredWorldIds.includes(origin));
}

export function selectStoryCastIds(value: unknown, allowed: ReadonlySet<string>): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === "string" && allowed.has(id)))].slice(0, MAX_STORY_CAST);
}
