"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Brain, Check, ChevronRight, Compass, Copy,
  GitMerge, MapPin, Pencil, RotateCcw, Route, Search,
  Send, Settings2, Sparkles, Square, Trash2, Users, Volume2, X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { ViaeConversation, Session } from "../types";
import type { PublicLocalProvider, LocalModelGroup } from "../lib/localProviders";
import { MemoryVaultModal } from "./MemoryVaultModal";
import { useViaeEngine } from "../hooks/useViaeEngine";
import { ViaeTimelineSelect } from "./ViaeTimelineSelect";
import { useLanguage } from "../context/LanguageContext";
import { characterDisplayName } from "../lib/characterNames";
import { deepText } from "../lib/i18nDeep";

// Historical Local JSON keeps `limeGroups`, `limeGroupId`, and memoryMode="lime".
// Viae, Semita, and Compitum are presentation names, not a save-format migration.
const GOLD = "#bb9b61";
const makeId = () => typeof crypto !== "undefined" && "randomUUID" in crypto
  ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const asText = (value: unknown): string => typeof value === "string" ? value : String(value ?? "");
const parseSpeakers = (content: string): { charId: string; text: string }[] => {
  const match = content.match(/<(?:viae_chat|lime_chat)>\s*([\s\S]*?)\s*<\/(?:viae_chat|lime_chat)>/i);
  if (!match) return [{ charId: "", text: content }];
  try {
    const decoded: unknown = JSON.parse(match[1]);
    if (!Array.isArray(decoded)) return [{ charId: "", text: content }];
    const segments = decoded.filter(x => x && typeof x === "object" && typeof x.text === "string")
      .map(x => ({ charId: typeof x.charId === "string" ? x.charId : "", text: x.text as string }));
    return segments.length ? segments : [{ charId: "", text: content }];
  } catch { return [{ charId: "", text: content }]; }
};
const kindName = (group: ViaeConversation) => group.type === "direct" ? "Semita · 小径" : "Compitum · 路口";
const routeName = (group: ViaeConversation) => group.reality === "au" ? "AU · 平行歧路" : `Original · T-${group.timeline || "5-6"}`;

function PathEmblem({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <circle cx="22" cy="22" r="20" stroke={GOLD} strokeWidth="0.8" opacity="0.7"/>
      <path d="M8 36 C12 29 22 29 23 20 S30 12 36 7" stroke={GOLD} strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 37 C16 31 27 30 27 20 S30 13 36 7" stroke="#efe4cb" strokeWidth="1" opacity="0.75"/>
      <circle cx="23" cy="20" r="2" fill={GOLD}/>
      <path d="M12 10 L13.3 13.7 L17 15 L13.3 16.3 L12 20 L10.7 16.3 L7 15 L10.7 13.7 Z" fill={GOLD}/>
      <circle cx="32" cy="30" r="1.3" fill={GOLD}/>
    </svg>
  );
}

function RouteIllustration({ compact = false }: { compact?: boolean }) {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 620 128" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
      <path d="M-10 106 C91 106 93 26 203 61 S344 147 427 77 S542 58 647 -6" stroke="#e0c48c" strokeWidth={compact ? 1 : 1.65} opacity="0.7"/>
      <path d="M-15 118 C83 118 101 42 197 79 S333 157 439 91 S540 66 641 7" stroke="#d9c391" strokeWidth="0.8" opacity="0.25"/>
      <path d="M-8 20 Q184 -25 320 31 T640 6" stroke="#b8a37c" strokeWidth="0.8" strokeDasharray="2 8" opacity="0.35"/>
      <g fill="#e6c991"><circle cx="202" cy="61" r="3"/><circle cx="426" cy="78" r="3"/><circle cx="532" cy="57" r="2"/></g>
      <path d="M505 19 L507 24 L512 26 L507 28 L505 33 L503 28 L498 26 L503 24 Z" fill="#f0d7a6" opacity="0.85"/>
    </svg>
  );
}

interface ViaeProps {
  session: Session;
  updateSession: (updater: (current: Session) => Session) => void;
  characters: { id: string; name: string; avatar: string; hex: string; sub?: string }[];
  onExit: () => void;
  onSettings: () => void;
  providers: PublicLocalProvider[];
  provider: string;
  onProviderChange: (next: string) => void;
  model: string;
  customModel: string;
  onModelChange: (next: string) => void;
  onCustomModelChange: (next: string) => void;
  notify: (message: string) => void;
}

export function ViaeInterface({ session, updateSession, characters, onExit, onSettings, providers, provider, onProviderChange, model, customModel, onModelChange, onCustomModelChange, notify }: ViaeProps) {
  const { locale } = useLanguage();
  const { activeGroup, input, setInput, isLoading, send, stop, deleteMessage } = useViaeEngine({
    session, updateSession, provider, model: customModel.trim() || model, notify,
  });
  const [creating, setCreating] = useState(false);
  const [kind, setKind] = useState<"direct" | "group">("direct");
  const [selected, setSelected] = useState<string[]>([]);
  const [draftName, setDraftName] = useState("");
  const [reality, setReality] = useState<"canon" | "au">("canon");
  const [timeline, setTimeline] = useState("5-6");
  const [auContext, setAuContext] = useState("");
  const [pov, setPov] = useState<"outsider" | "insider">("outsider");
  const [openMemory, setOpenMemory] = useState(false);
  const [showModels, setShowModels] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [showRouteEditor, setShowRouteEditor] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [search, setSearch] = useState("");
  const [modelGroups, setModelGroups] = useState<LocalModelGroup[]>([]);
  const [copyIndex, setCopyIndex] = useState<number | null>(null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [routeDraft, setRouteDraft] = useState({ reality: "canon" as "canon" | "au", timeline: "5-6", auContext: "" });
  const currentAudio = useRef<HTMLAudioElement | null>(null);
  const bottom = useRef<HTMLDivElement | null>(null);
  const conversations = session.limeGroups || [];
  const providerConfigured = providers.some(p => p.id === provider);
  const who = (id: string) => {
    const c = characters.find(c => c.id === id);
    return c ? { ...c, name: characterDisplayName(c.id, c.name, locale) } : undefined;
  };
  const time = (value?: number) => mounted && value ? new Date(value).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) : "";

  useEffect(() => { setMounted(true); return () => currentAudio.current?.pause(); }, []);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [activeGroup?.id, activeGroup?.messages.length]);
  useEffect(() => {
    let alive = true;
    if (!provider) { setModelGroups([]); return; }
    fetch(`/api/providers?models=${encodeURIComponent(provider)}`, { cache: "no-store" })
      .then(r => r.json()).then(data => { if (alive) setModelGroups(Array.isArray(data.groups) ? data.groups : []); })
      .catch(() => { if (alive) setModelGroups([]); });
    return () => { alive = false; };
  }, [provider]);

  const updateGroup = (id: string, update: (group: ViaeConversation) => ViaeConversation) => {
    updateSession(current => ({ ...current, updatedAt: Date.now(), limeGroups: (current.limeGroups || []).map(g => g.id === id ? update(g) : g) }));
  };
  const chooseGroup = (id: string | null) => {
    if (isLoading) { notify("请先完成或停止当前回复"); return; }
    updateSession(current => ({ ...current, limeGroupId: id, updatedAt: Date.now() }));
    setCreating(false); setOpenMemory(false); setShowModels(false); setShowManage(false); setShowRouteEditor(false); setShowDetails(false);
  };
  const resetCreate = (nextKind: "direct" | "group") => {
    setKind(nextKind); setSelected([]); setDraftName(""); setAuContext(""); setReality("canon"); setTimeline("5-6"); setPov(nextKind === "direct" ? "insider" : "outsider"); setCreating(true);
  };
  const create = () => {
    const expected = kind === "direct" ? (pov === "outsider" ? 2 : 1) : 2;
    if (kind === "direct" ? selected.length !== expected : selected.length < expected) {
      notify(kind === "direct" ? (pov === "outsider" ? "旁观小径必须选择恰好两位角色" : "参与小径只能选择一位角色") : "路口至少需要两位角色");
      return;
    }
    const name = draftName.trim().slice(0, 70) || (kind === "direct"
      ? (pov === "outsider" ? selected.map(id => who(id)?.name || id).join(" · ") : who(selected[0])?.name || deepText(locale, "viae.untitledDirect"))
      : deepText(locale, "viae.untitledGroup"));
    const group: ViaeConversation = {
      id: makeId(), name, type: kind, members: [...selected], pov,
      defaultPovChar: selected[0], reality, timeline: reality === "canon" ? timeline.trim() || "5-6" : "AU",
      auContext: reality === "au" ? auContext.trim() : "", messages: [],
      stm: "", ltm: "", turnCount: 0, updatedAt: Date.now(),
    };
    updateSession(current => ({ ...current, limeGroups: [group, ...(current.limeGroups || [])], limeGroupId: group.id, updatedAt: Date.now() }));
    setCreating(false); setSelected([]); setDraftName(""); setAuContext("");
  };
  const removeGroup = (id: string) => {
    if (isLoading || !window.confirm("删除这条道路及其中的消息和记忆？此操作无法撤销。")) return;
    updateSession(current => ({ ...current, limeGroups: (current.limeGroups || []).filter(g => g.id !== id), limeGroupId: current.limeGroupId === id ? null : current.limeGroupId, updatedAt: Date.now() }));
  };
  const rename = (group: ViaeConversation) => {
    const name = window.prompt("为这段道路重新命名", group.name)?.trim();
    if (name) updateGroup(group.id, g => ({ ...g, name: name.slice(0, 70), updatedAt: Date.now() }));
  };
  const toggleMember = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (kind === "group") return [...prev, id];
      const limit = pov === "outsider" ? 2 : 1;
      return prev.length >= limit ? (limit === 1 ? [id] : prev) : [...prev, id];
    });
  };
  const changeDraftPov = (next: "outsider" | "insider") => {
    setPov(next);
    if (kind === "direct" && next === "insider") setSelected(prev => prev.slice(0, 1));
  };
  const changeViewpoint = (id: string) => {
    if (!activeGroup || isLoading || !activeGroup.members.includes(id)) return;
    updateGroup(activeGroup.id, group => ({ ...group, defaultPovChar: id, updatedAt: Date.now() }));
  };
  const changeExistingMode = (next: "outsider" | "insider") => {
    if (!activeGroup || isLoading || next === activeGroup.pov) return;
    if (activeGroup.type === "direct" && activeGroup.messages.length > 0) {
      notify("已有消息的小径不能直接转换参与方式，请新建一条小径以保留原有对话语境");
      return;
    }
    if (activeGroup.type === "direct") {
      const required = next === "outsider" ? 2 : 1;
      if (activeGroup.members.length !== required) { notify(next === "outsider" ? "先添加第二位角色，再切换为旁观" : "先保留一位角色，再切换为参与"); return; }
    }
    updateGroup(activeGroup.id, group => ({ ...group, pov: next, updatedAt: Date.now() }));
  };
  const editRoute = () => {
    if (!activeGroup) return;
    setRouteDraft({ reality: activeGroup.reality, timeline: activeGroup.timeline, auContext: activeGroup.auContext || "" });
    setShowRouteEditor(true); setShowModels(false); setShowManage(false); setShowDetails(false);
  };
  const saveRoute = () => {
    if (!activeGroup || isLoading) return;
    updateGroup(activeGroup.id, g => ({ ...g, reality: routeDraft.reality, timeline: routeDraft.reality === "canon" ? routeDraft.timeline.trim() || "5-6" : "AU", auContext: routeDraft.reality === "au" ? routeDraft.auContext.trim() : "", updatedAt: Date.now() }));
    setShowRouteEditor(false); notify("新的路线已保存");
  };
  const playVoice = async (text: string, id: string) => {
    if (voiceBusy || !text.trim() || !id) return;
    setVoiceBusy(true);
    let url: string | null = null;
    try {
      currentAudio.current?.pause();
      const response = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, characterId: id, variant: "default" }) });
      if (!response.ok) throw new Error("TTS 未配置或暂时无法连接");
      url = URL.createObjectURL(await response.blob());
      const audio = new Audio(url);
      currentAudio.current = audio;
      const release = () => { if (url) URL.revokeObjectURL(url); setVoiceBusy(false); };
      audio.onended = release;
      audio.onerror = () => { release(); notify("语音播放失败"); };
      await audio.play();
    } catch (error) {
      if (url) URL.revokeObjectURL(url);
      setVoiceBusy(false);
      notify(error instanceof Error ? error.message : "语音生成失败");
    }
  };
  const availableModels = useMemo(() => modelGroups.flatMap(group => group.models || []), [modelGroups]);
  const filtered = useMemo(() => conversations.filter(g => g.name.toLowerCase().includes(search.trim().toLowerCase())), [conversations, search]);
  const memberLabel = activeGroup?.members.map(id => who(id)?.name || id).join("、") || "";
  const isObserving = activeGroup?.pov === "outsider";
  const viewChar = activeGroup ? who(activeGroup.members.includes(activeGroup.defaultPovChar || "") ? activeGroup.defaultPovChar! : activeGroup.members[0]) : undefined;

  return (
    <div className="flex h-[100dvh] min-h-0 w-full overflow-hidden bg-[#fafaf9] font-sans text-[#1b2e48]">
      {/* Shared Viae directory — deliberately separate from the Engineering/Story/Chat explorer. */}
      <aside className={`relative z-20 flex w-full shrink-0 flex-col border-r border-[#e5e8eb] bg-white sm:w-[318px] lg:w-[340px] ${activeGroup || creating ? "hidden sm:flex" : "flex"}`}>
        <div className="flex items-center gap-3 border-b border-[#e9edf0] px-5 py-5">
          <button type="button" onClick={onExit} title={deepText(locale, "viae.choosePath")} aria-label={deepText(locale, "viae.choosePath")} className="rounded-xl p-2 text-[#586d81] transition hover:bg-[#f2f5f7]"><ArrowLeft size={18}/></button>
          <img src="/shiorivia-app-icon.png" alt="Shiorivia" className="h-10 w-10 rounded-xl object-cover"/>
          <div className="min-w-0 flex-1"><h1 className="font-semibold tracking-[0.18em] text-[#162942]">VIAE</h1><p className="text-[10px] tracking-wide text-[#8994a1]">SHIORIVIA · CHARACTER MESSAGING</p></div>
          <button type="button" onClick={onSettings} title={deepText(locale, "common.settings")} aria-label={deepText(locale, "common.settings")} className="rounded-xl p-2 text-[#718095] hover:bg-[#f3f5f7]"><Settings2 size={18}/></button>
        </div>
        <div className="px-5 pb-3 pt-6">
          <div className="mb-4 flex items-center justify-between"><span className="text-[10px] font-semibold tracking-[0.18em] text-[#8290a0]">YOUR PATHS / {deepText(locale, "viae.paths")}</span><span className="text-xs text-[#b49a6c]">{conversations.length.toString().padStart(2, "0")}</span></div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => resetCreate("direct")} className="flex items-center justify-center gap-2 rounded-xl border border-[#e4e8eb] bg-[#f9fafb] px-2 py-3 text-xs font-semibold text-[#253c59] transition hover:border-[#c8b58f] hover:bg-[#fffdf8]"><Route size={16} color={GOLD}/> 小径 <span className="font-normal text-[#8e9aaa]">Semita</span></button>
            <button type="button" onClick={() => resetCreate("group")} className="flex items-center justify-center gap-2 rounded-xl border border-[#e4e8eb] bg-[#f9fafb] px-2 py-3 text-xs font-semibold text-[#253c59] transition hover:border-[#c8b58f] hover:bg-[#fffdf8]"><GitMerge size={16} color={GOLD}/> 路口 <span className="font-normal text-[#8e9aaa]">Compitum</span></button>
          </div>
          <label className="mt-4 flex items-center gap-2 rounded-xl border border-[#e8ebed] bg-[#fbfbfb] px-3 py-2.5 text-[#a2abb6]"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder={deepText(locale, "viae.search")} className="w-full bg-transparent text-xs text-[#263a51] outline-none placeholder:text-[#a2abb6]"/></label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-5">
          {filtered.length === 0 && <p className="px-4 py-12 text-center text-xs leading-7 text-[#99a4b0]">{deepText(locale, "viae.empty")}</p>}
          {filtered.map(g => {
            const last = g.messages?.[g.messages.length - 1];
            const participant = who(g.members[0]);
            return <div key={g.id} className={`group mb-1 flex items-center rounded-xl border px-2 py-1.5 transition ${g.id === session.limeGroupId ? "border-[#dce5ef] bg-[#f4f7fa]" : "border-transparent hover:bg-[#f8f9fa]"}`}>
              <button type="button" onClick={() => chooseGroup(g.id)} className="flex min-w-0 flex-1 items-center gap-3 p-1.5 text-left">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg ${g.type === "direct" ? "bg-[#f4f3ee]" : "bg-[#eaf0f5] text-[#49617c]"}`}>{g.type === "direct" ? participant?.avatar || "✦" : <GitMerge size={21}/>}</span>
                <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-1"><span className="truncate text-[13px] font-semibold">{g.name}</span><span className="shrink-0 text-[10px] text-[#a6afba]">{time(g.updatedAt)}</span></span><span className="mt-1 block truncate text-[11px] text-[#8995a3]">{last ? (last.role === "user" ? `你：${asText(last.content)}` : (parseSpeakers(asText(last.content))[0]?.text || "新消息")) : kindName(g)}</span></span>
              </button>
              <button type="button" title={`删除 ${g.name}`} aria-label={`删除 ${g.name}`} disabled={isLoading} onClick={() => removeGroup(g.id)} className="rounded-lg p-1.5 text-[#a5afba] opacity-60 transition hover:bg-rose-50 hover:text-rose-600 sm:opacity-0 sm:group-hover:opacity-100"><Trash2 size={14}/></button>
            </div>;
          })}
        </div>
        <div className="relative overflow-hidden bg-[#152841] px-5 py-5 text-[#e8d3aa]"><RouteIllustration compact/><div className="relative z-10 flex items-center gap-3"><PathEmblem size={35}/><div><p className="font-serif text-sm italic">Where stories find their way.</p><p className="mt-1 text-[9px] tracking-widest text-[#9baabe]">SHIORIVIA / VIAE</p></div></div></div>
      </aside>

      {/* The center panel keeps the content almost entirely white. */}
      <main className={`flex min-w-0 flex-1 flex-col bg-[#fcfcfb] ${activeGroup || creating ? "flex" : "hidden sm:flex"}`}>
        {creating ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <header className="flex items-center gap-3 border-b border-[#e9edf0] bg-white px-5 py-5"><button onClick={() => setCreating(false)} aria-label={deepText(locale, "viae.paths")} className="rounded-lg p-2 text-[#64758c] hover:bg-[#f4f6f8]"><ArrowLeft size={18}/></button><PathEmblem size={30}/><div><h2 className="text-base font-semibold">{deepText(locale, kind === "direct" ? "viae.startDirect" : "viae.startGroup")}</h2><p className="text-xs text-[#96a1ad]">{kind === "direct" ? "Semita" : "Compitum"} · {deepText(locale, kind === "direct" ? "viae.directDesc" : "viae.groupDesc")}</p></div></header>
            <div className="mx-auto w-full max-w-2xl space-y-6 px-5 py-8 sm:px-8">
              <div className="grid grid-cols-2 gap-3">{(["direct", "group"] as const).map(choice => <button key={choice} type="button" onClick={() => { setKind(choice); setSelected([]); setPov(choice === "direct" ? "insider" : "outsider"); }} className={`rounded-2xl border p-4 text-left transition ${kind === choice ? "border-[#bdad91] bg-[#fffdfa]" : "border-[#e4e9ef] bg-white hover:border-[#bdad91]"}`}><span className="mb-3 inline-flex rounded-xl bg-[#edf2f6] p-2 text-[#29415e]">{choice === "direct" ? <Route size={21}/> : <GitMerge size={21}/>}</span><span className="block text-sm font-semibold">{choice === "direct" ? "Semita · 小径" : "Compitum · 路口"}</span><span className="mt-1 block text-xs leading-5 text-[#8e9aaa]">{choice === "direct" ? "参与时一位角色，旁观时两位角色" : "多条道路在这里交会"}</span></button>)}</div>
              <label className="block space-y-2"><span className="text-xs font-semibold text-[#52667f]">{deepText(locale, "viae.name")}</span><input maxLength={70} value={draftName} onChange={e => setDraftName(e.target.value)} placeholder={deepText(locale, kind === "direct" ? "viae.nameDefault" : "viae.nameExample")} className="w-full rounded-xl border border-[#e2e7eb] bg-white px-4 py-3 text-sm outline-none focus:border-[#bba26d]"/></label>
              <div className="space-y-3"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-[#52667f]">{deepText(locale, "viae.members")}</span><span className="text-xs text-[#9fa9b5]">{deepText(locale, "viae.selected")} {selected.length}{kind === "direct" ? ` / ${pov === "outsider" ? 2 : 1}` : ""}</span></div><div className="grid max-h-[240px] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">{characters.map(c => <button type="button" key={c.id} onClick={() => toggleMember(c.id)} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${selected.includes(c.id) ? "border-[#bba26d] bg-[#fffaf0]" : "border-[#e9edf0] bg-white hover:border-[#cdd7e0]"}`}><span className="text-xl">{c.avatar}</span><span className="min-w-0 flex-1 truncate text-xs font-medium">{characterDisplayName(c.id, c.name, locale)}</span>{selected.includes(c.id) && <Check size={14} color={GOLD}/>}</button>)}</div></div>
              <div className="space-y-2"><span className="text-xs font-semibold text-[#52667f]">{deepText(locale, "viae.mode")}</span><div className="flex flex-wrap gap-2">{(["outsider", "insider"] as const).map(value => <button key={value} type="button" onClick={() => changeDraftPov(value)} className={`rounded-lg border px-4 py-2 text-xs ${pov === value ? "border-[#bba26d] bg-[#fffaf0] text-[#6f5b36]" : "border-[#e4e9ee] text-[#718296]"}`}>{deepText(locale, value === "outsider" ? "viae.outsider" : "viae.insider")}</button>)}</div><p className="text-[11px] leading-5 text-[#8a98a8]">{deepText(locale, pov === "outsider" ? (kind === "direct" ? "viae.observeDirect" : "viae.observeGroup") : (kind === "direct" ? "viae.joinDirect" : "viae.joinGroup"))}</p></div>
              {pov === "outsider" && selected.length > 0 && <label className="block space-y-2"><span className="text-xs font-semibold text-[#52667f]">{deepText(locale, "viae.viewpoint")} / Viewpoint</span><p className="text-[11px] text-[#8a98a8]">{deepText(locale, "viae.viewHelp")}</p><span className="block rounded-xl border border-[#e2e7eb] bg-white px-3"><select value={selected[0]} onChange={e => setSelected(prev => [e.target.value, ...prev.filter(id => id !== e.target.value)])} className="w-full bg-transparent py-3 text-sm text-[#263a51] outline-none">{selected.map(id => <option key={id} value={id}>{who(id)?.name || id}</option>)}</select></span></label>}
              <div className="space-y-3"><span className="text-xs font-semibold text-[#52667f]">{deepText(locale, "viae.world")}</span><div className="flex gap-2">{(["canon", "au"] as const).map(value => <button key={value} onClick={() => setReality(value)} type="button" className={`rounded-xl border px-4 py-2 text-xs ${reality === value ? "border-[#bba26d] bg-[#fffaf0] text-[#6f5b36]" : "border-[#e4e9ee] bg-white text-[#718296]"}`}>{value === "canon" ? `Original · ${deepText(locale, "viae.canon")}` : `AU · ${deepText(locale, "viae.au")}`}</button>)}</div>{reality === "canon" ? <ViaeTimelineSelect value={timeline} onChange={setTimeline} className="w-full rounded-xl border border-[#e4e9ee] bg-white px-4 py-3 text-sm outline-none focus:border-[#bba26d]"/> : <textarea rows={4} value={auContext} onChange={e => setAuContext(e.target.value)} placeholder={deepText(locale, "viae.auPlaceholder")} className="w-full resize-y rounded-xl border border-[#e4e9ee] bg-white px-4 py-3 text-sm outline-none focus:border-[#bba26d]"/>}</div>
              <button type="button" onClick={create} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#182e49] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#294562]"><Sparkles size={16} color="#e8cc97"/> {deepText(locale, kind === "direct" ? "viae.createDirect" : "viae.createGroup")}</button>
            </div>
          </div>
        ) : activeGroup ? (
          <>
            <header className="flex min-h-[76px] items-center gap-3 border-b border-[#e9edf0] bg-white px-4 sm:px-6">
              <button type="button" onClick={() => chooseGroup(null)} aria-label="返回道路列表" title="返回道路列表" className="rounded-lg p-2 text-[#667b91] hover:bg-[#f4f6f8] sm:hidden"><ArrowLeft size={18}/></button>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#edf2f6] text-[#29415e]">{activeGroup.type === "direct" ? who(activeGroup.members[0])?.avatar || <Route size={21}/> : <GitMerge size={21}/>}</span>
              <div className="min-w-0 flex-1"><h2 className="truncate text-sm font-semibold text-[#1e3048]">{activeGroup.name}</h2><p className="mt-1 flex items-center gap-1.5 truncate text-[11px] text-[#8493a4]"><MapPin size={11} color={GOLD}/>{kindName(activeGroup)} <span className="text-[#c4cad1]">·</span> {routeName(activeGroup)}</p></div>
              {isObserving && <label className="flex shrink-0 items-center gap-1.5 rounded-xl border border-[#e8e1d4] bg-[#fffdf8] px-2 py-1.5 text-[11px] text-[#7b6849]"><Compass size={14}/><span className="hidden md:inline">手机视角</span><select disabled={isLoading} value={activeGroup.members.includes(activeGroup.defaultPovChar || "") ? activeGroup.defaultPovChar : activeGroup.members[0]} onChange={e => changeViewpoint(e.target.value)} aria-label="切换旁观角色视角" className="max-w-[100px] bg-transparent text-xs font-medium text-[#334b66] outline-none disabled:opacity-50">{activeGroup.members.map(id => <option key={id} value={id}>{who(id)?.name || id}</option>)}</select></label>}
              <button type="button" onClick={() => setShowDetails(v => !v)} title="道路详情" aria-label="道路详情" className="rounded-xl p-2 text-[#5f7085] hover:bg-[#f4f6f8] xl:hidden"><Compass size={19}/></button>
              <button type="button" onClick={() => { setShowModels(v => !v); setShowManage(false); setShowRouteEditor(false); }} title="模型与供应商" aria-label="模型与供应商" className="rounded-xl p-2 text-[#61738a] hover:bg-[#f4f6f8]"><Settings2 size={19}/></button>
            </header>
            {showModels && <div className="z-10 space-y-3 border-b border-[#e7eaee] bg-white px-5 py-4 shadow-sm"><div className="flex items-center justify-between text-xs font-semibold"><span>模型与供应商</span><button type="button" onClick={() => setShowModels(false)} title="关闭模型设置"><X size={16}/></button></div><div className="grid grid-cols-2 gap-3"><label className="text-[11px] text-[#8492a2]">Provider<select value={provider} onChange={e => onProviderChange(e.target.value)} className="mt-1 block w-full rounded-lg border border-[#e0e6eb] bg-white p-2 text-xs">{providers.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label><label className="text-[11px] text-[#8492a2]">Model<select value={availableModels.some(m => m.id === model) ? model : ""} onChange={e => onModelChange(e.target.value)} className="mt-1 block w-full rounded-lg border border-[#e0e6eb] bg-white p-2 text-xs"><option value="">手动输入模型 ID</option>{availableModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label></div><input value={customModel} onChange={e => onCustomModelChange(e.target.value)} placeholder="Custom Model ID（可选）" className="w-full rounded-lg border border-[#e0e6eb] px-3 py-2 text-xs outline-none focus:border-[#bba26d]"/><p className="text-[11px] text-[#8391a2]">与 Shiorivia 其他模式共享服务端供应商配置。</p></div>}
            <div className="relative mx-4 mt-4 overflow-hidden rounded-2xl bg-[#172b46] px-5 py-4 text-white sm:mx-6"><RouteIllustration/><div className="relative flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><PathEmblem size={34}/><div className="min-w-0"><p className="text-xs font-semibold tracking-wide text-[#f0dcb7]">{activeGroup.reality === "canon" ? "Original Timeline" : "Alternate Route"}</p><p className="mt-1 truncate text-[11px] text-[#aab8cb]">{activeGroup.reality === "au" ? activeGroup.auContext || "沿着另一条可能的道路…" : `T-${activeGroup.timeline}`}</p></div></div><button type="button" onClick={editRoute} className="shrink-0 rounded-xl border border-[#bca778]/70 bg-[#172b46]/70 px-3 py-2 text-[11px] text-[#f3dbaa] transition hover:bg-white/10"><Route size={14} className="mr-1 inline"/> 路线</button></div></div>
            {showRouteEditor && <div className="z-10 mx-4 mt-2 space-y-3 rounded-2xl border border-[#e7dfce] bg-[#fffdf8] p-4 sm:mx-6"><div className="flex items-center justify-between text-xs font-semibold"><span>编辑这条道路</span><button type="button" onClick={() => setShowRouteEditor(false)} title="关闭路线编辑"><X size={16}/></button></div><div className="flex gap-2">{(["canon", "au"] as const).map(value => <button type="button" key={value} onClick={() => setRouteDraft(d => ({ ...d, reality: value }))} className={`rounded-lg border px-3 py-1.5 text-xs ${routeDraft.reality === value ? "border-[#bea776] bg-white text-[#7d663e]" : "border-[#e4e6e8] text-[#8390a0]"}`}>{value === "canon" ? "原作" : "AU"}</button>)}</div>{routeDraft.reality === "canon" ? <ViaeTimelineSelect value={routeDraft.timeline} onChange={v => setRouteDraft(d => ({ ...d, timeline: v }))} className="w-full rounded-lg border border-[#e1e3e8] bg-white px-3 py-2 text-sm"/> : <textarea value={routeDraft.auContext} onChange={e => setRouteDraft(d => ({ ...d, auContext: e.target.value }))} rows={3} placeholder="这条歧路的世界背景…" className="w-full rounded-lg border border-[#e1e3e8] bg-white px-3 py-2 text-sm"/>}<button type="button" disabled={isLoading} onClick={saveRoute} className="rounded-lg bg-[#1a314c] px-4 py-2 text-xs text-white disabled:opacity-50">保存路线</button></div>}
            {showManage && <div className="z-10 mx-4 mt-2 space-y-3 rounded-xl border border-[#e5e9ed] bg-white p-4 shadow-sm sm:mx-6"><div className="flex items-center justify-between text-xs font-semibold"><span>道路与同行者</span><button type="button" onClick={() => setShowManage(false)} title="关闭管理"><X size={16}/></button></div><button onClick={() => rename(activeGroup)} type="button" className="flex items-center gap-2 rounded-lg border border-[#e0e4e8] px-3 py-2 text-xs"><Pencil size={14}/> 重新命名</button><p className="text-xs text-[#718195]">{memberLabel}</p><div className="flex flex-wrap items-center gap-2"><span className="text-[11px] text-[#8390a0]">交流方式</span>{(["outsider", "insider"] as const).map(value => <button key={value} type="button" disabled={isLoading || activeGroup.pov === value} onClick={() => changeExistingMode(value)} className={`rounded-lg border px-3 py-1.5 text-xs disabled:opacity-60 ${activeGroup.pov === value ? "border-[#baa573] bg-[#fffaf0] text-[#695836]" : "border-[#e4e9ee] bg-white text-[#748395]"}`}>{value === "outsider" ? "旁观" : "参与"}</button>)}</div><p className="text-[11px] leading-5 text-[#96a1ad]">{activeGroup.type === "direct" ? "小径更换交流方式需满足对应人数；有历史消息时请新建小径。" : "路口可在旁观和参与之间切换。"}</p>{activeGroup.type === "direct" && activeGroup.messages.length === 0 && <div className="flex flex-wrap gap-2">{characters.filter(c => !activeGroup.members.includes(c.id)).map(c => <button key={c.id} type="button" disabled={isLoading || activeGroup.members.length >= 2} onClick={() => updateGroup(activeGroup.id, g => ({ ...g, members: [...g.members, c.id], updatedAt: Date.now() }))} className="rounded-full border border-[#e4e9ee] px-2 py-1 text-[11px] text-[#748395] disabled:opacity-40">+ {c.name}</button>)}{activeGroup.members.length > 1 && <button type="button" disabled={isLoading} onClick={() => updateGroup(activeGroup.id, g => ({ ...g, members: g.members.slice(0, 1), defaultPovChar: g.members[0], updatedAt: Date.now() }))} className="rounded-full border border-[#e5d8d8] px-2 py-1 text-[11px] text-rose-600">移除第二位角色</button>}</div>}{activeGroup.type === "group" && <div className="flex flex-wrap gap-2">{characters.map(c => <button key={c.id} type="button" disabled={isLoading} onClick={() => { const included = activeGroup.members.includes(c.id); if (included && activeGroup.members.length <= 2) { notify("路口至少需要两位角色"); return; } updateGroup(activeGroup.id, g => ({ ...g, members: included ? g.members.filter(id => id !== c.id) : [...g.members, c.id], updatedAt: Date.now() })); }} className={`rounded-full border px-3 py-1 text-xs disabled:opacity-50 ${activeGroup.members.includes(c.id) ? "border-[#baa573] bg-[#fffaf0] text-[#695836]" : "border-[#e4e9ee] text-[#748395]"}`}>{c.avatar} {c.name}</button>)}</div>}</div>}
            <section className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-6 sm:px-8" aria-label="Viae 对话消息">
              <div className="flex items-center gap-3 text-[10px] text-[#9eabb7]"><div className="h-px flex-1 bg-[#e6e9eb]"/><Sparkles size={13} color={GOLD}/> WAYPOINT · 此刻 <div className="h-px flex-1 bg-[#e6e9eb]"/></div>
              {isObserving && <div className="mx-auto flex max-w-2xl items-center justify-center gap-2 rounded-xl border border-[#e7ddcb] bg-[#fffdf8] px-4 py-2 text-[11px] text-[#806944]"><Compass size={14}/><span>旁观 · 当前以 <strong>{viewChar?.name || "角色"}</strong> 的手机视角观察；你的输入只会作为剧情提示。</span></div>}
              {activeGroup.messages.length === 0 && <div className="mx-auto max-w-md py-16 text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f1f4f6]"><PathEmblem size={42}/></div><h3 className="font-serif text-lg text-[#2a3d58]">{activeGroup.name}</h3><p className="mt-3 text-xs leading-7 text-[#8996a5]">{activeGroup.type === "direct" ? `在这条小径上，和${who(activeGroup.members[0])?.name || "角色"}聊聊吧。` : "在这个路口，让不同的声音自然交会。"}<br/>每条道路都有自己独立的回忆。</p></div>}
              {activeGroup.messages.map((message, index) => {
                const isUser = message.role === "user";
                const isDirection = isUser && (message.kind === "director" || (isObserving && !message.kind));
                const text = asText(message.content);
                const partial = !isUser && isLoading && index === activeGroup.messages.length - 1 && !/<\/(?:viae_chat|lime_chat)>/i.test(text);
                const segments = isUser ? [{ charId: "", text }] : partial ? [{ charId: "", text: "角色正在回复…" }] : parseSpeakers(text);
                return <div key={message.id || index} className={`group flex flex-col gap-2 ${isDirection ? "items-center" : isUser ? "items-end" : "items-start"}`}>
                  {isDirection ? <div className="max-w-[94%] rounded-xl border border-[#e9dfcb] bg-[#fffdf8] px-5 py-3 text-center shadow-[0_2px_12px_rgba(172,140,88,0.05)] sm:max-w-[80%]"><div className="mb-1 flex items-center justify-center gap-2 text-[10px] font-semibold tracking-widest text-[#aa8b50]"><Sparkles size={13}/> SCENE DIRECTION / 剧情提示 <span className="font-normal text-[#ac9d82]">{time(message.createdAt)}</span></div><p className="whitespace-pre-wrap break-words text-left text-[13px] leading-6 text-[#685a45]">{text}</p></div> : segments.map((part, i) => {
                    const char = who(part.charId);
                    const content = part.text.replace(/<\/?(?:viae_chat|lime_chat)>/gi, "");
                    const isPhoneOwner = isObserving && !isUser && part.charId === (viewChar?.id || activeGroup.members[0]);
                    const isOutgoing = isUser || isPhoneOwner;
                    return <div key={i} className={`flex max-w-[94%] items-end gap-2 sm:max-w-[80%] ${isOutgoing ? "flex-row-reverse" : "flex-row"} ${isPhoneOwner ? "self-end" : ""}`}>
                      {!isUser && !isPhoneOwner && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#e1e7ea] bg-white text-lg">{char?.avatar || "✦"}</span>}
                      <div className="min-w-0"><div className={`mb-1 flex items-center gap-2 text-[10px] text-[#93a0ac] ${isOutgoing ? "justify-end" : ""}`}><span>{isUser ? "你" : char?.name || (partial ? "正在回复" : "Viae")}</span><span>{time(message.createdAt)}</span></div><div className={`prose prose-sm max-w-none break-words rounded-2xl border px-4 py-3 text-[13px] leading-6 shadow-[0_3px_12px_rgba(24,42,63,0.03)] ${isOutgoing ? "prose-invert border-[#1b324f] bg-[#1a314f] text-white" : "border-[#e8ecef] bg-white text-[#2b4058]"}`}>{isUser ? content : <ReactMarkdown>{content || (partial ? "角色正在回复…" : "")}</ReactMarkdown>}</div></div>
                    </div>;
                  })}
                  <div className={`flex items-center gap-3 text-[#9ca7b5] opacity-70 transition group-hover:opacity-100 ${isDirection ? "justify-center" : isUser ? "pr-1" : "pl-11"}`}>
                    {!isUser && !partial && parseSpeakers(text).some(p => p.charId) && <button type="button" disabled={voiceBusy} onClick={() => { const part = parseSpeakers(text).find(p => p.charId); if (part) void playVoice(part.text, part.charId); }} title="语音播放" aria-label="语音播放"><Volume2 size={14}/></button>}
                    {!isUser && !isLoading && index === activeGroup.messages.length - 1 && <button type="button" onClick={() => void send(true)} title={deepText(locale, "common.retry")} aria-label={deepText(locale, "common.retry")}><RotateCcw size={14}/></button>}
                    <button type="button" onClick={() => { void navigator.clipboard.writeText(text); setCopyIndex(index); }} title={deepText(locale, "common.copy")} aria-label={deepText(locale, "common.copy")}>{copyIndex === index ? <Check size={14}/> : <Copy size={14}/>}</button>
                    {!isLoading && <button type="button" onClick={() => { if (window.confirm(deepText(locale, "viae.deleteMessage"))) deleteMessage(index); }} title={deepText(locale, "common.delete")} aria-label={deepText(locale, "common.delete")}><Trash2 size={14}/></button>}
                  </div>
                </div>;
              })}
              <div ref={bottom}/>
            </section>
            <form onSubmit={e => { e.preventDefault(); void send(); }} className="border-t border-[#e9ecef] bg-white px-4 py-4 sm:px-7"><div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-[#e1e7eb] bg-[#fdfdfc] px-3 py-2 transition focus-within:border-[#bba573] focus-within:shadow-[0_0_0_3px_rgba(187,165,115,0.09)]"><textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} rows={2} placeholder={isObserving ? "输入场外剧情提示（角色不会直接回复你）…" : activeGroup.type === "direct" ? "在小径上说点什么…" : "在路口留下你的消息…"} className="min-h-11 max-h-36 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-[#243850] outline-none placeholder:text-[#a1adb7]"/><button type={isLoading ? "button" : "submit"} disabled={!isLoading && (!input.trim() || !providerConfigured || !(customModel.trim() || model))} onClick={isLoading ? stop : undefined} aria-label={isLoading ? "停止生成" : "发送消息"} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white disabled:opacity-40 ${isLoading ? "bg-rose-500" : "bg-[#172d49] hover:bg-[#274461]"}`}>{isLoading ? <Square size={17}/> : <Send size={17}/>}</button></div><p className="mx-auto mt-2 max-w-3xl truncate text-[10px] text-[#9aa6b1]">{providerConfigured ? `${providers.find(p => p.id === provider)?.label || provider} · ${customModel.trim() || model}` : "请先在设置中配置 API 供应商"} · {isObserving ? "旁观剧情提示" : "参与消息"} · Enter 发送 / Shift+Enter 换行</p></form>
            <MemoryVaultModal open={openMemory} onClose={() => setOpenMemory(false)} sessionId={`${session.id}:${activeGroup.id}`} stm={activeGroup.stm} ltm={activeGroup.ltm} tone="story" onSave={({ stm, ltm }) => { updateGroup(activeGroup.id, g => ({ ...g, stm, ltm, turnCount: stm.split(/\n/).filter(Boolean).length, updatedAt: Date.now() })); notify("Viae Memory Vault 已保存"); }}/>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-[#8b9ba9]"><PathEmblem size={70}/><h2 className="font-serif text-xl text-[#344d67]">Every path leads to a story.</h2><p className="text-xs">{deepText(locale, "viae.choosePath")}</p></div>
        )}
      </main>

      {/* Route information is a quiet contextual panel on desktop and a toggle on mobile. */}
      {activeGroup && <>
        {showDetails && <button type="button" onClick={() => setShowDetails(false)} title="关闭详情" aria-label="关闭详情" className="fixed inset-0 z-30 bg-[#152840]/30 xl:hidden"/>}
        <aside className={`z-40 min-h-0 w-[300px] shrink-0 flex-col overflow-y-auto border-l border-[#ebedef] bg-white px-5 py-6 xl:flex ${showDetails ? "fixed inset-y-0 right-0 flex w-[min(320px,90vw)] shadow-xl xl:static xl:shadow-none" : "hidden"}`}>
          <div className="flex items-center justify-between text-[10px] font-semibold tracking-[0.16em] text-[#8592a1]"><span>PATH DETAILS / 道路详情</span><button type="button" onClick={() => setShowDetails(false)} title="关闭详情" aria-label="关闭详情" className="xl:hidden"><X size={17}/></button></div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-[#e6e9eb]"><div className="relative h-20 bg-[#192e4b]"><RouteIllustration/></div><div className="p-4"><div className="flex items-center justify-between gap-2"><h3 className="truncate text-sm font-semibold">{activeGroup.name}</h3><button type="button" onClick={() => rename(activeGroup)} aria-label="重命名" title="重命名" className="text-[#8291a1] hover:text-[#2b4666]"><Pencil size={15}/></button></div><p className="mt-1 text-[11px] text-[#8695a5]">{kindName(activeGroup)} · {activeGroup.members.length} 位同行者</p><div className="mt-3 flex flex-wrap gap-1">{activeGroup.members.map(id => <span key={id} title={who(id)?.name || id} className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e5e8eb] bg-[#f8f8f6] text-base">{who(id)?.avatar || "✦"}</span>)}</div></div></div>
          <div className="mt-7"><p className="mb-3 text-[10px] font-semibold tracking-[0.15em] text-[#8592a1]">ROUTE / TIMELINE</p><button type="button" onClick={editRoute} className="flex w-full items-center gap-3 rounded-xl border border-[#e4e8eb] bg-[#fcfcfb] p-3 text-left transition hover:border-[#cbb58d]"><span className="rounded-lg bg-[#e9eef3] p-2 text-[#3b5371]"><Compass size={19}/></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{activeGroup.reality === "canon" ? "Original Timeline" : "Alternate Route"}</span><span className="mt-0.5 block truncate text-[10px] text-[#8593a2]">{routeName(activeGroup)}</span></span><ChevronRight size={15} className="text-[#99a4af]"/></button></div>
          <div className="mt-7"><p className="mb-3 text-[10px] font-semibold tracking-[0.15em] text-[#8592a1]">TOOLS / 工具</p><div className="space-y-2"><button type="button" onClick={() => setOpenMemory(true)} className="flex w-full items-center gap-3 rounded-xl border border-[#e4e8eb] bg-white px-3 py-3 text-left transition hover:bg-[#f7f9fa]"><Brain size={18} className="text-[#49617c]"/><span className="flex-1 text-xs font-semibold">Memory Vault <span className="mt-0.5 block text-[10px] font-normal text-[#93a0ad]">这条道路的专属记忆</span></span><ChevronRight size={15} className="text-[#a6b0b9]"/></button><button type="button" onClick={() => { setShowManage(true); setShowDetails(false); }} className="flex w-full items-center gap-3 rounded-xl border border-[#e4e8eb] bg-white px-3 py-3 text-left transition hover:bg-[#f7f9fa]"><Users size={18} className="text-[#49617c]"/><span className="flex-1 text-xs font-semibold">同行者管理</span><ChevronRight size={15} className="text-[#a6b0b9]"/></button><button type="button" onClick={() => { setShowModels(true); setShowDetails(false); }} className="flex w-full items-center gap-3 rounded-xl border border-[#e4e8eb] bg-white px-3 py-3 text-left transition hover:bg-[#f7f9fa]"><Settings2 size={18} className="text-[#49617c]"/><span className="flex-1 text-xs font-semibold">模型与供应商</span><ChevronRight size={15} className="text-[#a6b0b9]"/></button></div></div>
          {isObserving && <div className="mt-7 rounded-xl border border-[#e9dfcb] bg-[#fffdf8] p-3"><p className="mb-2 text-[10px] font-semibold tracking-[0.15em] text-[#a18a62]">CURRENT VIEWPOINT / 当前视角</p><select disabled={isLoading} value={activeGroup.members.includes(activeGroup.defaultPovChar || "") ? activeGroup.defaultPovChar : activeGroup.members[0]} onChange={e => changeViewpoint(e.target.value)} aria-label="右侧切换旁观角色视角" className="w-full rounded-lg border border-[#e3dccd] bg-white px-3 py-2 text-xs text-[#324961] outline-none">{activeGroup.members.map(id => <option key={id} value={id}>{who(id)?.name || id} · 手机</option>)}</select></div>}
          <div className="mt-7"><p className="mb-3 text-[10px] font-semibold tracking-[0.15em] text-[#8592a1]">TRAVELERS / 同行者</p><div className="space-y-3">{activeGroup.members.map(id => { const c = who(id); return <div key={id} className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f3f4f5] text-lg">{c?.avatar || "✦"}</span><span className="min-w-0"><span className="block truncate text-xs font-semibold">{c?.name || id}</span><span className="block truncate text-[10px] text-[#95a0aa]">{c?.sub || "Shiorivia"}</span></span></div>; })}</div></div>
          <div className="mt-auto pt-8 text-center"><div className="mx-auto mb-2 h-px w-16 bg-[#d8c59f]"/><p className="font-serif text-xs italic text-[#a18a63]">Where paths meet.</p></div>
        </aside>
      </>}
    </div>
  );
}
