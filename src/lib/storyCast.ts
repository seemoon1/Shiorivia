import { CHAR_DATA } from "../data/char_config";
import { BANG_DREAM_WORLD_ID, enabledWorldIds, type StoryWorldline } from "./storyWorldline";

/** Limit full character biographies per request to control prompt size. */
export const MAX_STORY_CAST = 6;
const builtinIds = new Set(CHAR_DATA.map(character => character.id));

export type StoryCastIdentity = { id: string; worldId?: string | null };

export function storyCastOrigin(character: StoryCastIdentity): string | null {
  return builtinIds.has(character.id) ? BANG_DREAM_WORLD_ID : character.worldId || null;
}

/** Only explicitly configured worlds can contribute characters; universal cast is opt-in. */
export function storyCastAllowed(character: StoryCastIdentity, worldline: StoryWorldline): boolean;
/** Compatibility overload for legacy callers; no longer allows arbitrary foreign worlds. */
export function storyCastAllowed(character: StoryCastIdentity, worldId: string, allowCrossWorld: boolean, registeredWorldIds: readonly string[]): boolean;
export function storyCastAllowed(
  character: StoryCastIdentity, world: StoryWorldline | string,
  _legacyCross?: boolean, _legacyWorlds?: readonly string[],
): boolean {
  const origin = storyCastOrigin(character);
  if (typeof world === "string") return origin === world;
  if (!origin) return world.crossWorld?.enabled === true && world.crossWorld.includeUniversal === true;
  return enabledWorldIds(world).includes(origin);
}

export function selectStoryCastIds(value: unknown, allowed: ReadonlySet<string>): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === "string" && allowed.has(id)))].slice(0, MAX_STORY_CAST);
}
