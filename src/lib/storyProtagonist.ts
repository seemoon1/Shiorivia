import type { ProtagonistState } from "../types";

type RecordLike = Record<string, unknown>;
const record = (value: unknown): RecordLike => value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as RecordLike : {};
const present = (...values: unknown[]): string => {
    for (const value of values) {
        if (typeof value === "string" && value.trim()) return value.trim();
        if (typeof value === "number" && Number.isFinite(value)) return String(value);
    }
    return "—";
};

/** Complete a POV/self status using only confirmed scene data, never invented facts.
 * Reuse previous status only when it belongs to the same named person.
 */
export function completeStoryProtagonist({
    raw, previous, currentCharacter, environment, name, era, period,
}: {
    raw: unknown; previous: unknown; currentCharacter?: unknown; environment?: unknown;
    name: string; era?: string; period?: string;
}): ProtagonistState {
    const state = record(raw);
    const other = record(currentCharacter);
    const old = record(previous);
    const env = record(environment);
    const previousSameIdentity = typeof old.name === "string" && old.name.trim() === name;
    const earlier = previousSameIdentity ? old : {};
    return {
        name: present(name, state.name),
        timeDesc: present(state.timeDesc, earlier.timeDesc, [era, period].filter(Boolean).join(" · ")),
        environment: present(state.environment, env.location, earlier.environment),
        temperature: present(state.temperature, earlier.temperature),
        clothing: present(state.clothing, other.clothing, earlier.clothing),
        sensation: present(state.sensation, other.bodyState, earlier.sensation),
        innerState: present(state.innerState, other.innerState, earlier.innerState),
    };
}
