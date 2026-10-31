"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type RefObject } from "react";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft, Check, Copy, FileText, Menu, MessageCircle,
  Paperclip, Plus, RefreshCw, Send, Settings2, Square, Trash2, X,
} from "lucide-react";
import type { Session } from "../types";
import type { LocalModelGroup, PublicLocalProvider } from "../lib/localProviders";

interface ChatAttachment { url: string; type: "image" | "video" | "text"; name: string }

interface PureChatProps {
  sessions: Session[];
  currentSession: Session;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, title: string) => void;
  onHome: () => void;
  onOpenSettings: () => void;
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onRegenerate: (index: number) => void;
  isLoading: boolean;
  selectedFile: ChatAttachment | null;
  onClearFile: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  providers: PublicLocalProvider[];
  apiProvider: string;
  onProviderChange: (id: string) => void;
  selectedModel: string;
  customModelId: string;
  onSelectModel: (id: string) => void;
  onCustomModelChange: (id: string) => void;
}

function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part: any) => part?.type === "text" && typeof part.text === "string" ? part.text : "").filter(Boolean).join("\n");
  }
  return typeof content === "number" ? String(content) : "";
}

function messageImages(content: unknown): string[] {
  if (!Array.isArray(content)) return [];
  return content.filter((part: any) => part?.type === "image_url" && typeof part.image_url?.url === "string")
    .map((part: any) => part.image_url.url);
}

export function PureChatInterface(props: PureChatProps) {
  const {
    sessions, currentSession, onSelectSession, onCreateSession, onDeleteSession,
    onRenameSession, onHome, onOpenSettings, input, onInputChange,
    onSend, onStop, onRegenerate, isLoading, selectedFile, onClearFile,
    fileInputRef, onFileSelect, providers, apiProvider, onProviderChange,
    selectedModel, customModelId, onSelectModel, onCustomModelChange,
  } = props;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [catalog, setCatalog] = useState<LocalModelGroup[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<"loading" | "live" | "fallback">("loading");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatSessions = useMemo(() => sessions.filter(s => s.memoryMode === "chat")
    .sort((a, b) => b.updatedAt - a.updatedAt), [sessions]);
  const filteredSessions = useMemo(() => chatSessions.filter(s =>
    s.title.toLowerCase().includes(search.trim().toLowerCase())), [chatSessions, search]);
  const activeModel = customModelId.trim() || selectedModel;

  useEffect(() => {
    const controller = new AbortController();
    setCatalog([]);
    setCatalogStatus("loading");
    if (!apiProvider) return () => controller.abort();
    fetch(`/api/providers?models=${encodeURIComponent(apiProvider)}`, {
      signal: controller.signal, cache: "no-store",
    }).then(async r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }).then(data => {
      if (controller.signal.aborted) return;
      setCatalog(Array.isArray(data.groups) ? data.groups : []);
      setCatalogStatus(data.source === "live" ? "live" : "fallback");
    }).catch(() => { if (!controller.signal.aborted) setCatalogStatus("fallback"); });
    return () => controller.abort();
  }, [apiProvider]);

  const lastMessage = currentSession.messages[currentSession.messages.length - 1];
  const lastText = contentToText(lastMessage?.content);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: isLoading ? "instant" : "smooth", block: "end" });
  }, [currentSession.id, currentSession.messages.length, lastText, isLoading]);

  const rename = (session: Session) => {
    const title = window.prompt("重命名这段对话", session.title)?.trim();
    if (title) onRenameSession(session.id, title.slice(0, 80));
  };
  const copyMessage = async (text: string, index: number) => {
    try { await navigator.clipboard.writeText(text); setCopiedIndex(index); }
    catch { /* Clipboard permission may be unavailable outside secure contexts. */ }
  };
  const modelList = catalog.flatMap(group => group.models);
  const knownModel = modelList.some(model => model.id === selectedModel) && !customModelId;

  return (
    <div className="flex h-[100dvh] min-h-0 w-full overflow-hidden bg-[#f6f7f3] text-[#30443a]">
      {sidebarOpen && <button type="button" aria-label="关闭会话侧栏" className="fixed inset-0 z-30 bg-slate-900/35 md:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[270px] shrink-0 flex-col border-r border-[#d7e2d9] bg-[#edf2ec] transition-transform md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between gap-2 border-b border-[#d7e2d9] p-4">
          <button type="button" className="flex items-center gap-2 text-xs font-bold text-[#527363] hover:text-[#30443a]" onClick={onHome}>
            <ArrowLeft size={15} /> 模式导航
          </button>
          <button type="button" aria-label="关闭侧栏" className="rounded-lg p-2 text-slate-500 hover:bg-white md:hidden" onClick={() => setSidebarOpen(false)}><X size={17}/></button>
        </div>
        <div className="px-4 pb-3 pt-5">
          <div className="mb-4 flex items-center gap-2">
            <img src="/shiorivia-app-icon.png" width={30} height={30} alt="" className="h-[30px] w-[30px] rounded-lg" />
            <div><p className="text-sm font-bold tracking-wider">Shiorivia Chat</p><p className="text-[10px] text-[#82968a]">Just conversation, no roleplay engine</p></div>
          </div>
          <button type="button" onClick={() => { onCreateSession(); setSidebarOpen(false); }} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#517d69] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#406956]">
            <Plus size={16} /> 新建 Chat 对话
          </button>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="查找聊天记录…" aria-label="查找聊天记录" className="mt-3 w-full rounded-lg border border-[#d5e0d7] bg-white/75 px-3 py-2 text-xs outline-none focus:border-[#7da38c]" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-5">
          {filteredSessions.length === 0 && <p className="px-2 py-5 text-xs text-[#8c9d92]">还没有匹配的 Chat 对话。</p>}
          {filteredSessions.map(session => (
            <div key={session.id} className={`group mb-1 flex items-center gap-1 rounded-xl border px-2 py-1.5 ${session.id === currentSession.id ? "border-[#bfd4c5] bg-white text-[#315d46] shadow-sm" : "border-transparent hover:bg-white/65"}`}>
              <button type="button" onClick={() => { onSelectSession(session.id); setSidebarOpen(false); }} className="min-w-0 flex-1 px-1.5 py-1.5 text-left">
                <span className="block truncate text-xs font-medium">{session.title}</span>
                <span className="mt-0.5 block text-[10px] text-[#97a69a]">{new Date(session.updatedAt).toLocaleDateString()}</span>
              </button>
              <button type="button" onClick={() => rename(session)} title="重命名" aria-label={`重命名 ${session.title}`} className="rounded p-1 text-[#91a398] hover:bg-[#e2eee5] hover:text-[#456e59]">✎</button>
              <button type="button" disabled={isLoading && session.id === currentSession.id} onClick={() => onDeleteSession(session.id)} title="删除对话" aria-label={`删除 ${session.title}`} className="rounded p-1 text-[#91a398] hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"><Trash2 size={14}/></button>
            </div>
          ))}
        </div>
        <div className="border-t border-[#d7e2d9] px-4 py-3 text-[10px] text-[#83998b]">独立 Chat 会话 · 存储于 Local JSON</div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-[64px] shrink-0 items-center justify-between gap-2 border-b border-[#e0e8df] bg-white/80 px-3 py-3 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" aria-label="打开会话侧栏" onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-[#6d8875] hover:bg-[#edf4ed] md:hidden"><Menu size={19}/></button>
            <div className="flex min-w-0 items-center gap-2"><MessageCircle className="shrink-0 text-[#65947c]" size={20}/><div className="min-w-0"><p className="truncate text-sm font-semibold">{currentSession.title}</p><p className="text-[10px] text-[#93a499]">Chat · 普通对话模式</p></div></div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="新建 Chat 对话" title="新建对话" className="rounded-lg p-2 text-[#698975] hover:bg-[#edf4ed]" onClick={onCreateSession}><Plus size={18}/></button>
            <button type="button" aria-label="设置中心" title="设置中心" className="rounded-lg p-2 text-[#698975] hover:bg-[#edf4ed]" onClick={onOpenSettings}><Settings2 size={18}/></button>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b border-[#e0e8df] bg-[#f8faf7] px-4 py-2.5 sm:px-6">
          <select aria-label="供应商" value={apiProvider} onChange={e => onProviderChange(e.target.value)} className="max-w-[145px] rounded-lg border border-[#d4e1d5] bg-white px-2 py-2 text-xs outline-none focus:border-[#80a28d]">
            {providers.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            {providers.length === 0 && <option value="">未配置供应商</option>}
          </select>
          <select aria-label="模型" value={knownModel ? selectedModel : ""} onChange={e => { if (e.target.value) onSelectModel(e.target.value); }} className="max-w-[225px] min-w-0 flex-1 rounded-lg border border-[#d4e1d5] bg-white px-2 py-2 text-xs outline-none focus:border-[#80a28d]">
            <option value="">{catalogStatus === "loading" ? "获取模型中…" : "手动模型 / 当前选择"}</option>
            {catalog.map(group => <optgroup key={group.groupName} label={group.groupName}>{group.models.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}</optgroup>)}
          </select>
          <label className="flex min-w-[130px] flex-1 items-center gap-2 rounded-lg border border-[#d4e1d5] bg-white px-2 py-1.5 text-xs text-[#8fa198] sm:max-w-[255px]">
            <span className="shrink-0">ID</span><input aria-label="自定义模型 ID" className="min-w-0 w-full bg-transparent py-0.5 text-[#42624d] outline-none" value={customModelId} onChange={e => onCustomModelChange(e.target.value)} placeholder={activeModel || "手动输入模型 ID"}/>
          </label>
          <span className="hidden text-[10px] text-[#98aaa0] lg:inline">{catalogStatus === "live" ? "Live catalog" : catalogStatus === "loading" ? "Loading…" : "Offline fallback"}</span>
        </div>

        <section aria-label="聊天消息" className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto w-full max-w-3xl space-y-6">
            {currentSession.messages.length === 0 && <div className="mx-auto max-w-md py-12 text-center"><div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e5eee6] text-[#5f896b]"><MessageCircle size={27}/></div><h2 className="text-xl font-semibold">想聊些什么？</h2><p className="mt-3 text-sm leading-7 text-[#7d9184]">纯粹的聊天空间，没有预设的角色扮演，也不会自动启动小说或工程工作流。</p></div>}
            {currentSession.messages.map((msg, index) => {
              const text = contentToText(msg.content);
              const images = messageImages(msg.content);
              const isUser = msg.role === "user";
              return (
                <article key={`${currentSession.id}-${index}`} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
                  {!isUser && <img alt="Shiorivia" src="/shiorivia-app-icon.png" className="mt-1 h-8 w-8 shrink-0 rounded-lg" />}
                  <div className={`min-w-0 max-w-[88%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[85%] ${isUser ? "bg-[#517d69] text-white" : "border border-[#e0e8de] bg-white text-[#34483d]"}`}>
                    <div className={`break-words text-[14px] leading-7 ${isUser ? "whitespace-pre-wrap" : "prose prose-sm max-w-none prose-p:my-2 prose-pre:overflow-x-auto"}`}>
                      {isUser ? text : <ReactMarkdown>{text || (isLoading && index === currentSession.messages.length - 1 ? "正在思考…" : "")}</ReactMarkdown>}
                    </div>
                    {images.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{images.map((url, i) => <img key={i} src={url} alt="聊天附件" className="max-h-44 max-w-full rounded-lg object-contain" />)}</div>}
                    {!isUser && text && <div className="mt-2 flex items-center gap-2 border-t border-[#edf1ec] pt-2 text-[#8fa49a]">
                      <button type="button" title="复制回复" aria-label="复制回复" onClick={() => void copyMessage(text, index)} className="rounded p-1 hover:bg-[#f2f6f1]">{copiedIndex === index ? <Check size={13}/> : <Copy size={13}/>}</button>
                      {index === currentSession.messages.length - 1 && !isLoading && <button type="button" onClick={() => onRegenerate(index)} title="重新生成" aria-label="重新生成" className="rounded p-1 hover:bg-[#f2f6f1]"><RefreshCw size={13}/></button>}
                      {msg.modelName && <span className="ml-auto truncate text-[10px]">{msg.modelName}</span>}
                    </div>}
                  </div>
                </article>
              );
            })}
            <div ref={bottomRef}/>
          </div>
        </section>

        <footer className="shrink-0 border-t border-[#e3eae2] bg-white/90 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-8">
          <div className="mx-auto max-w-3xl">
            {selectedFile && <div className="mb-2 flex items-center gap-2 rounded-lg bg-[#edf4ed] px-3 py-2 text-xs text-[#648172]"><FileText size={14}/><span className="min-w-0 flex-1 truncate">{selectedFile.name}</span><button onClick={onClearFile} title="移除附件" aria-label="移除附件"><X size={15}/></button></div>}
            <div className="flex items-end gap-2 rounded-2xl border border-[#ccdace] bg-white px-2 py-2 shadow-sm focus-within:border-[#72a18a]">
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*,text/plain,.txt" onChange={onFileSelect}/>
              <button type="button" title="添加附件" aria-label="添加附件" onClick={() => fileInputRef.current?.click()} className="rounded-lg p-2 text-[#75917d] hover:bg-[#edf5ec]"><Paperclip size={19}/></button>
              <textarea aria-label="聊天输入" rows={1} value={input} onChange={e => onInputChange(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (!isLoading && (input.trim() || selectedFile)) onSend(); } }} placeholder="输入消息…（Shift + Enter 换行）" className="max-h-40 min-h-[40px] min-w-0 flex-1 resize-none bg-transparent px-1 py-2.5 text-sm leading-5 outline-none" />
              {isLoading ? <button type="button" onClick={onStop} aria-label="停止生成" className="rounded-xl bg-rose-500 p-2.5 text-white"><Square size={17}/></button> : <button type="button" onClick={onSend} disabled={!apiProvider || (!input.trim() && !selectedFile)} aria-label="发送" className="rounded-xl bg-[#517d69] p-2.5 text-white hover:bg-[#406956] disabled:opacity-40"><Send size={17}/></button>}
            </div>
            <p className="mt-2 text-center text-[10px] text-[#9eada3]">Enter 发送 · Shift + Enter 换行 · 与工程／故事模式的会话独立</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
