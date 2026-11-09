import { isDefaultSessionTitle } from "./sessionTitles";

export const TITLE_REVIEW_MODES = ["infinite", "sliding", "chat", "novel"] as const;

/** Review after the first user turn, then after five additional turns: 1, 6, 11, ... */
export function shouldReviewTitleAtTurn(userTurns: number): boolean {
  return Number.isInteger(userTurns) && userTurns >= 1 && (userTurns - 1) % 5 === 0;
}

/** Preserve explicit user titles, including legacy saves without a title-management flag. */
export function mayReviewSessionTitle(
  session: { title: string; titleAutoManaged?: boolean },
  mode: unknown,
): boolean {
  if (typeof mode !== "string" || !TITLE_REVIEW_MODES.some(item => item === mode)) return false;
  if (session.titleAutoManaged === false) return false;
  return session.titleAutoManaged === true || isDefaultSessionTitle(session.title, mode);
}
