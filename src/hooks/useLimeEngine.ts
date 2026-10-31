"use client";

import { useEffect, useRef, useState } from "react";
import type { LimeConversation, LimeMessage, Session } from "../types";
import { formatLocalMemoryEntries, LOCAL_STM_SLOTS, parseLocalMemoryEntries } from "../lib/localMemory";

const newId = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Viae messages live *inside* the Viae workspace; they never enter normal chat history. */
export function useLimeEngine({ session, updateSession, provider, model, notify }: {
  session: Session;
  updateSession: (updater: (current: Session) => Session) => void;
  provider: string;
  model: string;
  notify?: (message: string) => void;
}) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  useEffect(() => () => abortRef.current?.abort(), []);
  const activeGroup = (session.limeGroups || []).find(g => g.id === session.limeGroupId);

  const patchGroup = (id: string, mapper: (group: LimeConversation) => LimeConversation) => {
    updateSession(current => ({
      ...current,
      updatedAt: Date.now(),
      limeGroups: (current.limeGroups || []).map(group => group.id === id ? mapper(group) : group),
    }));
  };

  const stop = () => abortRef.current?.abort();

  const send = async (regenerate = false) => {
    if (busyRef.current || !activeGroup || !provider || !model) return;
    if (activeGroup.type === "direct" && activeGroup.members.length !== (activeGroup.pov === "outsider" ? 2 : 1)) {
      notify?.(activeGroup.pov === "outsider" ? "旁观小径需要两位角色" : "参与小径需要一位角色");
      return;
    }
    if (activeGroup.type === "group" && activeGroup.members.length < 2) { notify?.("路口至少需要两位角色"); return; }
    const text = input.trim();
    const previous = activeGroup.messages || [];
    const isReplace = regenerate && previous[previous.length - 1]?.role === "assistant";
    const preceding = isReplace ? previous.slice(0, -1) : previous;
    if (!regenerate && !text) return;
    if (regenerate && !preceding.some(msg => msg.role === "user")) return;

    const requestId = newId();
    const userMessage: LimeMessage | null = regenerate ? null : { id: newId(), role: "user", kind: activeGroup.pov === "outsider" ? "director" : "chat", content: text, createdAt: Date.now() };
    const context = userMessage ? [...preceding, userMessage] : preceding;
    const assistant: LimeMessage = { id: requestId, role: "assistant", content: "", createdAt: Date.now(), modelName: model };
    const groupId = activeGroup.id;
    const controller = new AbortController();
    abortRef.current = controller;
    busyRef.current = true;
    setIsLoading(true);
    if (!regenerate) setInput("");
    patchGroup(groupId, group => ({ ...group, messages: [...context, assistant], updatedAt: Date.now() }));

    let fullText = "";
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          memoryMode: "lime", provider, model,
          messages: context.map(msg => ({ role: msg.role, content: msg.content, kind: msg.kind })),
          stm: activeGroup.stm || "", ltm: activeGroup.ltm || "",
          limeGroup: {
            name: activeGroup.name,
            type: activeGroup.type,
            members: activeGroup.members,
            pov: activeGroup.pov,
            defaultPovChar: activeGroup.defaultPovChar,
            reality: activeGroup.reality,
            auContext: activeGroup.auContext,
            timeline: activeGroup.timeline,
          },
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error || `Viae API HTTP ${response.status}`);
      }
      if (!response.body) throw new Error("Viae API response has no stream");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        const currentText = fullText;
        patchGroup(groupId, group => ({
          ...group,
          messages: group.messages.map(message => message.id === requestId ? { ...message, content: currentText } : message),
        }));
      }
      fullText += decoder.decode();
      if (!fullText.trim()) throw new Error("模型没有返回内容");
      patchGroup(groupId, group => ({
        ...group,
        messages: group.messages.map(message => message.id === requestId ? { ...message, content: fullText } : message),
      }));

      // Memory is per LIME conversation. A failure to summarize never loses chat messages.
      // Do not append a duplicate memory slot when replacing the last answer.
      if (!regenerate) try {
        const memo = await fetch("/api/summarize", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: `${activeGroup.pov === "outsider" ? "Scene direction" : "User"}: ${text || '(regenerated reply)'}\nViae: ${fullText}`, mode: "micro", provider, model }),
        });
        if (!memo.ok) throw new Error("Viae micro-memory unavailable");
        const data = await memo.json();
        const summary = typeof data.summary === "string" ? data.summary.trim() : "";
        if (summary) {
          const stmEntries = [...parseLocalMemoryEntries(activeGroup.stm), `• ${summary}`];
          let consolidated: string | null = null;
          if (stmEntries.length >= LOCAL_STM_SLOTS) {
            const macro = await fetch("/api/summarize", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: formatLocalMemoryEntries(stmEntries), previousLtm: activeGroup.ltm || "", mode: "macro", provider, model }),
            });
            if (macro.ok) {
              const value = await macro.json();
              if (typeof value.summary === "string" && value.summary.trim()) consolidated = value.summary.trim();
            }
          }
          patchGroup(groupId, group => {
            // Don't overwrite manually edited memory or another in-flight update.
            if ((group.stm || "") !== (activeGroup.stm || "") || (group.ltm || "") !== (activeGroup.ltm || "")) {
              const latest = [...parseLocalMemoryEntries(group.stm), `• ${summary}`];
              return { ...group, stm: formatLocalMemoryEntries(latest), turnCount: latest.length };
            }
            return consolidated
              ? { ...group, stm: "", ltm: consolidated, turnCount: 0 }
              : { ...group, stm: formatLocalMemoryEntries(stmEntries), turnCount: stmEntries.length };
          });
        }
      } catch (error) { console.warn("Viae memory summary skipped", error); }
    } catch (error) {
      if (controller.signal.aborted) {
        if (!fullText.trim()) patchGroup(groupId, group => ({ ...group, messages: group.messages.filter(msg => msg.id !== requestId) }));
        notify?.("已停止生成");
      } else {
        const message = error instanceof Error ? error.message : "Viae 请求失败";
        notify?.(message);
        // Keep the user's text but drop an empty assistant placeholder.
        if (!fullText.trim()) patchGroup(groupId, group => ({ ...group, messages: group.messages.filter(msg => msg.id !== requestId) }));
      }
    } finally {
      busyRef.current = false;
      abortRef.current = null;
      setIsLoading(false);
    }
  };

  const deleteMessage = (index: number) => {
    if (!activeGroup || busyRef.current) return;
    patchGroup(activeGroup.id, group => ({ ...group, messages: group.messages.filter((_, i) => i !== index) }));
  };
  return { activeGroup, input, setInput, isLoading, send, stop, deleteMessage };
}
