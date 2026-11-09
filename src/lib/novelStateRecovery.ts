import type { Session } from "../types";
import type { NovelState } from "./novelState";

/** Persistent, per-turn checkpoint for Tela. The original worldline and Style are intentionally excluded. */
export type NovelStateSnapshot = {
  novelState?: NovelState;
  storyNextCastIds?: string[];
  storyAllowCrossWorld?: boolean;
  sceneCastIds?: string[];
  environment: string;
  event: string;
  selectedCharIds: string[];
  stm?: string;
  ltm?: string;
  stmBackup?: string;
  turnCount?: number;
};

const copy = <T>(v: T): T => v === undefined ? v : JSON.parse(JSON.stringify(v)) as T;

export function snapshotNovelState(
  session: Session,
  opening?: { environment?: string; event?: string },
): NovelStateSnapshot {
  const draft = session.novelDraft;
  return {
    novelState: copy(session.novelState),
    storyNextCastIds: copy(session.storyNextCastIds),
    storyAllowCrossWorld: session.storyAllowCrossWorld,
    sceneCastIds: copy(session.sceneCastIds),
    environment: opening?.environment ?? draft?.environment ?? draft?.scenario ?? session.novelState?.environment ?? "",
    event: opening?.event ?? draft?.event ?? draft?.action ?? session.novelState?.event ?? "",
    selectedCharIds: copy(session.storyNextCastIds ?? draft?.selectedCharIds ?? []),
    stm: session.stm, ltm: session.ltm, stmBackup: session.stmBackup, turnCount: session.turnCount,
  };
}

/** Restore the scene and memory only; keep the user's WORLD/ERA/PERIOD, Style, outline, role and self. */
export function restoreNovelState(session: Session, snapshot?: NovelStateSnapshot): Session {
  if (!snapshot) {
    // Old archives have no checkpoint: clear AI-derived state rather than retaining a deleted chapter's state.
    return {
      ...session, novelState: undefined, storyNextCastIds: [],
      sceneCastIds: [], stm: "", ltm: "", stmBackup: undefined, turnCount: 0,
      novelDraft: {
        selectedCharIds: [], selfId: session.novelDraft?.selfId ?? null,
        environment: session.novelDraft?.environment ?? session.novelDraft?.scenario ?? "",
        event: session.novelDraft?.event ?? session.novelDraft?.action ?? "",
        style: session.novelDraft?.style ?? "", outline: session.novelDraft?.outline ?? "",
        themeMode: session.novelDraft?.themeMode ?? "paper",
      },
    };
  }
  return {
    ...session,
    novelState: copy(snapshot.novelState),
    storyNextCastIds: copy(snapshot.storyNextCastIds),
    storyAllowCrossWorld: snapshot.storyAllowCrossWorld,
    sceneCastIds: copy(snapshot.sceneCastIds),
    stm: snapshot.stm, ltm: snapshot.ltm,
    stmBackup: snapshot.stmBackup, turnCount: snapshot.turnCount,
    novelDraft: {
      ...(session.novelDraft || { selectedCharIds: [], style: "", outline: "", themeMode: "paper" }),
      environment: snapshot.environment,
      event: snapshot.event,
      selectedCharIds: copy(snapshot.selectedCharIds),
    },
  };
}
