"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Brain, Check, ChevronLeft, CirclePlus, Copy, MessageCircle, Pencil, Plus, RotateCcw, Send, Settings2, Smartphone, Square, Trash2, Users, Volume2, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { LimeConversation, Session } from "../types";
import type { PublicLocalProvider, LocalModelGroup } from "../lib/localProviders";
import { MemoryVaultModal } from "./MemoryVaultModal";
import { useLimeEngine } from "../hooks/useLimeEngine";

const newId = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const normalizeText = (content: unknown): string => typeof content === "string" ? content : String(content ?? "");
const chatOutput = (content: string): { charId: string; text: string }[] => {
  const match = content.match(/<lime_chat>\s*([\s\S]*?)\s*<\/lime_chat>/i);
  if (!match) return [{ charId: "", text: content }];
  try {
    const data: unknown = JSON.parse(match[1]);
    if (!Array.isArray(data)) return [{ charId: "", text: content }];
    const entries = data.filter(x => x && typeof x === "object" && typeof x.text === "string")
      .map(x => ({ charId: typeof x.charId === "string" ? x.charId : "", text: x.text }));
    return entries.length ? entries : [{ charId: "", text: content }];
  } catch { return [{ charId: "", text: content }]; }
};

interface LimeInterfaceProps {
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

export function LimeInterface({ session, updateSession, characters, onExit, onSettings, providers, provider, onProviderChange, model, customModel, onModelChange, onCustomModelChange, notify }: LimeInterfaceProps) {
  const { activeGroup, input, setInput, isLoading, send, stop, deleteMessage } = useLimeEngine({
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
  const [search, setSearch] = useState("");
  const [modelGroups, setModelGroups] = useState<LocalModelGroup[]>([]);
  const [copyIndex, setCopyIndex] = useState<number | null>(null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const currentAudio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => currentAudio.current?.pause(), []);
  const conversations = session.limeGroups || [];
  const hasConfiguredProvider = providers.some(p => p.id === provider);

  useEffect(() => {
    let alive = true;
    if (!provider) { setModelGroups([]); return; }
    fetch(`/api/providers?models=${encodeURIComponent(provider)}`, { cache: "no-store" })
      .then(r => r.json()).then(data => { if (alive) setModelGroups(Array.isArray(data.groups) ? data.groups : []); })
      .catch(() => { if (alive) setModelGroups([]); });
    return () => { alive = false; };
  }, [provider]);

  const updateGroup = (groupId: string, update: (g: LimeConversation) => LimeConversation) => {
    updateSession(current => ({ ...current, updatedAt: Date.now(), limeGroups: (current.limeGroups || []).map(g => g.id === groupId ? update(g) : g) }));
  };
  const chooseGroup = (groupId: string | null) => {
    if (isLoading) { notify("请先完成或停止当前回复"); return; }
    updateSession(current => ({ ...current, limeGroupId: groupId, updatedAt: Date.now() }));
    setOpenMemory(false);
    setShowModels(false);
    setShowManage(false);
  };
  const create = () => {
    const limit = kind === "direct" ? 1 : 2;
    if (selected.length < limit) { notify(kind === "direct" ? "请选择一位聊天对象" : "群聊至少需要两位角色"); return; }
    const name = draftName.trim().slice(0, 70) || (kind === "direct" ? `${characters.find(c => c.id === selected[0])?.name || "角色"} · 私聊` : "新的群聊");
    const group: LimeConversation = {
      id: newId(), name, type: kind, members: [...selected], pov: kind === "direct" ? "insider" : pov,
      defaultPovChar: selected[0], reality, timeline: reality === "canon" ? timeline.trim() || "5-6" : "AU",
      auContext: reality === "au" ? auContext.trim() : "", messages: [],
      stm: "", ltm: "", turnCount: 0, updatedAt: Date.now(),
    };
    updateSession(current => ({ ...current, limeGroups: [group, ...(current.limeGroups || [])], limeGroupId: group.id, updatedAt: Date.now() }));
    setCreating(false); setSelected([]); setDraftName(""); setAuContext("");
  };
  const removeGroup = (groupId: string) => {
    if (isLoading || !window.confirm("删除这个 LIME 对话及其全部消息和记忆？此操作不可撤销。")) return;
    updateSession(current => ({ ...current, limeGroups: (current.limeGroups || []).filter(g => g.id !== groupId), limeGroupId: current.limeGroupId === groupId ? null : current.limeGroupId, updatedAt: Date.now() }));
  };
  const renameGroup = (group: LimeConversation) => {
    const result = window.prompt("修改聊天名称", group.name)?.trim();
    if (result) updateGroup(group.id, g => ({ ...g, name: result.slice(0, 70), updatedAt: Date.now() }));
  };
  const toggleMember = (id: string) => {
    if (kind === "direct") { setSelected([id]); return; }
    setSelected(prev => prev.includes(id) ? prev.filter(member => member !== id) : [...prev, id]);
  };
  const who = (id: string) => characters.find(c => c.id === id);
  const playVoice = async (text: string, charId: string) => {
    if (voiceBusy || !text.trim() || !charId) return;
    setVoiceBusy(true);
    try {
      currentAudio.current?.pause();
      const response = await fetch("/api/tts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, characterId: charId, variant: "default" }),
      });
      if (!response.ok) throw new Error("TTS 未配置或无法连接");
      const audioURL = URL.createObjectURL(await response.blob());
      const audio = new Audio(audioURL);
      currentAudio.current = audio;
      audio.onended = () => { URL.revokeObjectURL(audioURL); setVoiceBusy(false); };
      audio.onerror = () => { URL.revokeObjectURL(audioURL); setVoiceBusy(false); notify("语音播放失败"); };
      await audio.play();
    } catch (error) {
      setVoiceBusy(false);
      notify(error instanceof Error ? error.message : "语音生成失败");
    }
  };
  const availableModels = useMemo(() => modelGroups.flatMap(g => g.models || []), [modelGroups]);
  const filtered = conversations.filter(g => g.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="flex h-[100dvh] min-h-0 w-full bg-[#f2f7ed] text-slate-800">
      <aside className={`flex w-full shrink-0 flex-col border-r border-lime-200 bg-[#e9f2de] sm:w-[340px] ${activeGroup || creating ? "hidden sm:flex" : "flex"}`}>
        <div className="flex items-center gap-3 border-b border-lime-200 px-4 py-4">
          <button type="button" onClick={onExit} title="返回五模式导航" className="rounded-xl p-2 text-lime-900 hover:bg-white/70"><ArrowLeft size={19}/></button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-500 text-white"><Smartphone size={23}/></div>
          <div className="min-w-0 flex-1"><h1 className="font-black tracking-wide">LIME</h1><p className="text-[11px] text-lime-700">私聊 · 群聊 · 独立空间</p></div>
          <button type="button" title="全局设置" onClick={onSettings} className="rounded-lg p-2 text-lime-800 hover:bg-white/75"><Settings2 size={18}/></button>
        </div>
        <div className="space-y-2 p-4">
          <button type="button" onClick={() => { setCreating(true); setSelected([]); }} className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-lime-700"><Plus size={17}/> 新建 LIME 聊天</button>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索私聊与群聊…" className="w-full rounded-xl border border-lime-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-500"/>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          {filtered.map(g => <div key={g.id} className={`group mb-1 flex items-center gap-2 rounded-xl p-2 ${g.id === session.limeGroupId ? "bg-white shadow-sm" : "hover:bg-white/60"}`}>
            <button type="button" onClick={() => chooseGroup(g.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-lime-100 text-lime-700">{g.type === "direct" ? (who(g.members[0])?.avatar || "💬") : <Users size={21}/>}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{g.name}</span><span className="block text-[11px] text-slate-500">{g.type === "direct" ? "私聊" : `${g.members.length} 人群聊`} · {g.reality === "au" ? "AU" : `T-${g.timeline}`}</span></span>
            </button>
            <button type="button" title="删除聊天" aria-label={`删除 ${g.name}`} onClick={() => removeGroup(g.id)} className="rounded p-1.5 text-slate-400 opacity-60 hover:bg-red-50 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100"><Trash2 size={14}/></button>
          </div>)}
          {filtered.length === 0 && <p className="px-4 py-8 text-center text-xs text-lime-700/70">这里还没有聊天，创建一个吧。</p>}
        </div>
        <p className="border-t border-lime-200 p-3 text-center text-[10px] text-lime-700/70">LIME 对话保存在独立工作区，不会混入 Explorer。</p>
      </aside>

      <main className={`flex min-w-0 flex-1 flex-col ${!activeGroup && !creating ? "hidden sm:flex" : "flex"}`}>
        {creating ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-8">
            <div className="mx-auto max-w-2xl space-y-5 rounded-3xl border border-lime-200 bg-white p-5 shadow-sm sm:p-8">
              <div className="flex items-center gap-3"><button type="button" onClick={() => setCreating(false)} className="rounded-lg p-2 hover:bg-slate-100"><ChevronLeft size={19}/></button><div><h2 className="text-lg font-bold">新建 LIME 对话</h2><p className="text-xs text-slate-500">参考 Tsukinomiya 的私聊／群聊设定</p></div></div>
              <div className="grid grid-cols-2 gap-2">{([{ value: "direct", label: "私聊", icon: <MessageCircle size={18}/> }, { value: "group", label: "群聊", icon: <Users size={18}/> }] as const).map(item => <button key={item.value} type="button" onClick={() => { setKind(item.value); setSelected([]); }} className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${kind === item.value ? "border-lime-500 bg-lime-50 text-lime-800" : "border-slate-200"}`}>{item.icon}{item.label}</button>)}</div>
              <label className="block space-y-1"><span className="text-xs font-bold text-slate-600">名称（可留空）</span><input maxLength={70} value={draftName} onChange={e=>setDraftName(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-lime-400" placeholder={kind === "direct" ? "例如：和睦的私聊" : "例如：Ave Mujica 练习室"}/></label>
              <div><p className="mb-2 text-xs font-bold text-slate-600">选择成员 · {kind === "direct" ? "1 位" : "至少 2 位"}</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{characters.map(c => <button key={c.id} type="button" onClick={()=>toggleMember(c.id)} className={`flex min-w-0 items-center gap-2 rounded-xl border p-2 text-left text-xs ${selected.includes(c.id) ? "border-lime-500 bg-lime-50" : "border-slate-200 hover:bg-slate-50"}`}><span className="text-xl">{c.avatar}</span><span className="min-w-0 flex-1 truncate">{c.name}</span>{selected.includes(c.id) && <Check size={14} className="text-lime-700"/>}</button>)}</div></div>
              {kind === "group" && <label className="block space-y-1"><span className="text-xs font-bold text-slate-600">聊天视角</span><select value={pov} onChange={e => setPov(e.target.value as "insider" | "outsider")} className="w-full rounded-xl border border-slate-200 px-3 py-2"><option value="outsider">旁观者 · 不作为成员发言</option><option value="insider">参与者 · 以所选第一位角色的手机视角</option></select></label>}
              <div className="grid grid-cols-2 gap-2">{(["canon", "au"] as const).map(value => <button key={value} type="button" onClick={()=>setReality(value)} className={`rounded-xl border p-3 text-sm font-semibold ${reality===value ? "border-lime-500 bg-lime-50 text-lime-800" : "border-slate-200"}`}>{value === "canon" ? "原作时间线" : "AU 平行世界"}</button>)}</div>
              {reality === "canon" ? <label className="block space-y-1"><span className="text-xs font-bold text-slate-600">时间线标记</span><input value={timeline} onChange={e=>setTimeline(e.target.value)} maxLength={40} className="w-full rounded-xl border border-slate-200 px-3 py-2" placeholder="5-6"/></label> : <label className="block space-y-1"><span className="text-xs font-bold text-slate-600">AU 世界设定</span><textarea rows={4} value={auContext} onChange={e=>setAuContext(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3" placeholder="描述这段平行世界的背景与角色关系…"/></label>}
              <button type="button" onClick={create} className="w-full rounded-xl bg-lime-600 px-4 py-3 font-bold text-white hover:bg-lime-700"><CirclePlus size={16} className="mr-2 inline"/>开始聊天</button>
            </div>
          </div>
        ) : activeGroup ? (
          <>
            <header className="relative flex flex-wrap items-center gap-2 border-b border-lime-200 bg-white/90 px-3 py-3 sm:px-5">
              <button type="button" onClick={()=>chooseGroup(null)} title="返回聊天列表" className="rounded-lg p-2 text-lime-700 hover:bg-lime-50"><ArrowLeft size={18}/></button>
              <div className="min-w-0 flex-1"><h2 className="truncate text-sm font-bold">{activeGroup.name}</h2><p className="text-[10px] text-slate-500">{activeGroup.type === "direct" ? "LIME 私聊" : `${activeGroup.members.length} 位成员 · ${activeGroup.pov === "outsider" ? "旁观" : "参与"}`} · {activeGroup.reality === "au" ? "AU" : `T-${activeGroup.timeline}`}</p></div>
              <button type="button" onClick={()=>{setShowManage(!showManage);setShowModels(false);}} title="管理成员与会话" className="rounded-lg p-2 text-lime-800 hover:bg-lime-50"><Users size={18}/></button>
              <button type="button" onClick={()=>{setOpenMemory(true);setShowModels(false);}} title="LIME Memory Vault" className="rounded-lg p-2 text-lime-800 hover:bg-lime-50"><Brain size={18}/></button>
              <button type="button" onClick={()=>{setShowModels(!showModels);setShowManage(false);}} title="模型与供应商" className="rounded-lg p-2 text-lime-800 hover:bg-lime-50"><Settings2 size={18}/></button>
            </header>
            {showManage && <div className="space-y-3 border-b border-lime-200 bg-white p-4 text-sm shadow-sm"><div className="flex items-center justify-between"><strong>聊天管理</strong><button onClick={()=>setShowManage(false)}><X size={16}/></button></div><button type="button" onClick={()=>renameGroup(activeGroup)} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs"><Pencil size={14}/> 重命名</button><p className="text-xs text-slate-600">成员：{activeGroup.members.map(id=>who(id)?.name || id).join("、")}</p>{activeGroup.type === "group" && <div className="flex flex-wrap gap-2">{characters.map(c => <button key={c.id} type="button" disabled={isLoading} onClick={() => { const includes=activeGroup.members.includes(c.id); if(includes && activeGroup.members.length<=2){notify("群聊至少保留两位角色");return;} updateGroup(activeGroup.id,g=>({...g,members:includes?g.members.filter(id=>id!==c.id):[...g.members,c.id],updatedAt:Date.now()})); }} className={`rounded-full border px-3 py-1 text-xs ${activeGroup.members.includes(c.id)?"border-lime-500 bg-lime-50 text-lime-700":"border-slate-200 text-slate-500"}`}>{c.avatar} {c.name}</button>)}</div>}{activeGroup.reality === "au" && <label className="block space-y-1"><span className="text-xs font-semibold">平行世界设定</span><textarea value={activeGroup.auContext || ""} onChange={e=>updateGroup(activeGroup.id,g=>({...g,auContext:e.target.value}))} rows={3} className="w-full rounded-lg border p-2"/></label>}</div>}
            {showModels && <div className="space-y-2 border-b border-lime-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between text-xs font-bold"><span>模型设置 · LIME</span><button onClick={()=>setShowModels(false)}><X size={16}/></button></div><div className="grid grid-cols-2 gap-2"><label className="text-xs text-slate-500">Provider<select value={provider} onChange={e=>onProviderChange(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs">{providers.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label><label className="text-xs text-slate-500">Model<select value={availableModels.some(m=>m.id===model)?model:""} onChange={e=>onModelChange(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs"><option value="">手动输入模型 ID</option>{availableModels.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label></div><input value={customModel} onChange={e=>onCustomModelChange(e.target.value)} placeholder="Custom Model ID（可选）" className="w-full rounded-lg border border-slate-200 p-2 text-xs"/><p className="text-[11px] text-slate-500">与其他模式共享 API 供应商配置，密钥仍保留在服务端。</p></div>}
            <section className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-5 sm:px-6" aria-label="LIME 对话消息">
              {!activeGroup.messages.length && <div className="mx-auto max-w-lg space-y-3 py-12 text-center"><Smartphone className="mx-auto text-lime-500" size={42}/><h3 className="font-bold">{activeGroup.name}</h3><p className="text-sm leading-7 text-slate-500">{activeGroup.type === "direct" ? `和${who(activeGroup.members[0])?.name || "角色"}开始聊天吧。` : "发送消息，让群里的成员各自回复。"} 每段对话的记忆相互独立。</p></div>}
              {activeGroup.messages.map((message,index)=>{
                const isUser = message.role === "user";
                const incomplete = !isUser && isLoading && index === activeGroup.messages.length - 1 && !/<\/lime_chat>/i.test(normalizeText(message.content));
                const segments = isUser ? [{ charId: "", text: normalizeText(message.content) }] : incomplete ? [{ charId: "", text: "角色正在回复…" }] : chatOutput(normalizeText(message.content));
                return <div key={message.id || index} className={`group flex flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
                  {segments.map((part,i)=>{
                    const char = who(part.charId);
                    const content = part.text.replace(/<lime_chat>|<\/lime_chat>/gi, "");
                    return <div key={i} className={`flex max-w-[92%] items-end gap-2 sm:max-w-[78%] ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                      {!isUser && <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-sm" style={{border:`1px solid ${char?.hex || "#a4bc85"}`}}>{char?.avatar || "💬"}</div>}
                      <div className="min-w-0"><div className="mb-1 text-[10px] text-slate-500">{isUser ? "你" : (char?.name || (incomplete ? "正在回复" : "LIME"))}</div><div className={`prose prose-sm max-w-none break-words rounded-2xl px-4 py-3 text-sm leading-7 shadow-sm ${isUser ? "bg-lime-600 text-white prose-invert" : "bg-white text-slate-800"}`}>{isUser ? content : <ReactMarkdown>{content || (incomplete ? "正在回复…" : "")}</ReactMarkdown>}</div></div>
                    </div>;
                  })}
                  <div className={`flex gap-2 opacity-60 group-hover:opacity-100 ${isUser ? "pr-1" : "pl-11"}`}>
                    {!isUser && chatOutput(message.content).some(p=>p.charId) && <button type="button" disabled={voiceBusy} onClick={()=>{const p=chatOutput(message.content).find(p=>p.charId);if(p)void playVoice(p.text,p.charId);}} title="生成语音"><Volume2 size={14}/></button>}
                    {!isUser && !isLoading && index === activeGroup.messages.length - 1 && <button type="button" onClick={()=>void send(true)} title="重新生成"><RotateCcw size={14}/></button>}
                    <button type="button" onClick={()=>{void navigator.clipboard.writeText(message.content);setCopyIndex(index);}} title="复制消息">{copyIndex===index?<Check size={14}/>:<Copy size={14}/>}</button>
                    {!isLoading && <button type="button" onClick={()=>{if(window.confirm("删除这条消息？"))deleteMessage(index);}} title="删除消息"><Trash2 size={14}/></button>}
                  </div>
                </div>;
              })}
            </section>
            <form className="border-t border-lime-200 bg-white/85 p-3 sm:p-4" onSubmit={e=>{e.preventDefault();void send();}}>
              <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-lime-200 bg-white px-3 py-2 focus-within:border-lime-500"><textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void send();}}} rows={2} placeholder="发送一条 LIME 消息…" className="min-h-12 max-h-36 min-w-0 flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none"/><button type={isLoading?"button":"submit"} disabled={!isLoading && (!input.trim() || !hasConfiguredProvider || !(customModel.trim() || model))} onClick={isLoading?stop:undefined} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white disabled:opacity-40 ${isLoading?"bg-rose-500":"bg-lime-600 hover:bg-lime-700"}`}>{isLoading?<Square size={17}/>:<Send size={17}/>}</button></div>
              <p className="mx-auto mt-2 max-w-3xl text-[10px] text-slate-500">{hasConfiguredProvider ? `${providers.find(p=>p.id===provider)?.label || provider} · ${customModel.trim()||model}` : "请先在设置中配置 API 供应商"} · Enter 发送 / Shift+Enter 换行</p>
            </form>
            <MemoryVaultModal open={openMemory} onClose={()=>setOpenMemory(false)} sessionId={`${session.id}:${activeGroup.id}`} stm={activeGroup.stm} ltm={activeGroup.ltm} tone="story" onSave={({stm,ltm})=>{updateGroup(activeGroup.id,g=>({...g,stm,ltm,turnCount:stm.split(/\n/).filter(Boolean).length,updatedAt:Date.now()}));notify("LIME Memory Vault 已保存");}}/>
          </>
        ) : (
          <div className="hidden flex-1 flex-col items-center justify-center gap-3 text-lime-700 sm:flex"><Smartphone size={50}/><p className="text-sm">选择左侧的私聊或群聊，或者创建新对话。</p></div>
        )}
      </main>
    </div>
  );
}
