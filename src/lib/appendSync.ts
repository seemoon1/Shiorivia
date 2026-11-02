import type { Session, Message, ViaeMessage } from "../types";
export type AppendDelta =
  | { kind: "chat"; sessionId: string; expectedLength: number; messages: Message[] }
  | { kind: "viae"; sessionId: string; groupId: string; expectedLength: number; messages: ViaeMessage[] }
  | { kind: "createSession"; session: Session }
  | { kind: "createGroup"; sessionId: string; group: NonNullable<Session["limeGroups"]>[number] };
function samePrefix<T>(current: T[], saved: T[]): boolean {
  return current.length >= saved.length && saved.every((m, i) => JSON.stringify(m) === JSON.stringify(current[i]));
}
export function collectAppendDeltas(current: Session[], saved: Session[]): AppendDelta[] {
  const deltas: AppendDelta[] = [];
  for (const session of current) {
    const old = saved.find(s => s.id === session.id);
    if (!old) { deltas.push({ kind: "createSession", session }); continue; }
    if (session.messages.length > old.messages.length && samePrefix(session.messages, old.messages))
      deltas.push({ kind: "chat", sessionId: session.id, expectedLength: old.messages.length, messages: session.messages.slice(old.messages.length) });
    for (const group of session.limeGroups || []) {
      const prev = (old.limeGroups || []).find(g => g.id === group.id);
      if (!prev) { deltas.push({kind:"createGroup",sessionId:session.id,group}); continue; }
      if (group.messages.length > prev.messages.length && samePrefix(group.messages, prev.messages))
        deltas.push({ kind: "viae", sessionId: session.id, groupId: group.id, expectedLength: prev.messages.length, messages: group.messages.slice(prev.messages.length) });
    }
  }
  return deltas;
}
export function completedTurns(deltas: AppendDelta[]): number {
  return deltas.reduce((sum, delta) => {
    const messages = delta.kind === 'createSession' ? [...delta.session.messages, ...(delta.session.limeGroups || []).flatMap(g => g.messages)]
      : delta.kind === 'createGroup' ? delta.group.messages : delta.messages;
    // A system greeting is not a completed turn. Count user→assistant exchanges.
    let hasUser = false;
    let rounds = 0;
    for (const message of messages) {
      if (message.role === "user") hasUser = true;
      else if (hasUser && message.role === "assistant" && typeof message.content === "string" && message.content.trim()) {
        rounds += 1;
        hasUser = false;
      }
    }
    return sum + rounds;
  }, 0);
}
