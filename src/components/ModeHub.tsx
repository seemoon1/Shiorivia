"use client";

import {
  ArrowRight, BookOpen, Guitar, House, MessageCircle, Settings2,
  Route, Sparkles, Terminal,
} from "lucide-react";

type ReadyMode = "infinite" | "sliding" | "novel" | "chat" | "lime";

type ModeHubProps = {
  onEnter: (mode: ReadyMode) => void;
  onResume: () => void;
  onOpenSettings: () => void;
  hasSession: boolean;
};

const modes = [
  {
    id: "infinite", title: "Engineering", subtitle: "工程模式",
    description: "代码、推理与日常任务的工作空间。",
    icon: Terminal, color: "text-sky-700", background: "bg-sky-50", border: "hover:border-sky-300",
    ready: true,
  },
  {
    id: "sliding", title: "Story", subtitle: "故事模式",
    description: "角色、世界书与沉浸式对话。",
    icon: Guitar, color: "text-rose-700", background: "bg-rose-50", border: "hover:border-rose-300",
    ready: true,
  },
  {
    id: "chat", title: "Chat", subtitle: "聊天模式",
    description: "角色陪伴、Live2D 与记忆相伴的日常对话。",
    icon: MessageCircle, color: "text-violet-700", background: "bg-violet-50", border: "hover:border-violet-300",
    ready: true,
  },
  {
    id: "novel", title: "Novel", subtitle: "小说模式",
    description: "章节式写作与梦境叙事。",
    icon: BookOpen, color: "text-emerald-700", background: "bg-emerald-50", border: "hover:border-emerald-300",
    ready: true,
  },
  {
    id: "lime", title: "VIAE", subtitle: "道路通讯",
    description: "Semita 小径 · Compitum 路口。每一次相遇都是新的故事。",
    icon: Route, color: "text-[#9e8050]", background: "bg-[#f7f3e9]", border: "hover:border-[#c3ad85]",
    ready: true,
  },
] as const;

export function ModeHub({ onEnter, onResume, onOpenSettings, hasSession }: ModeHubProps) {
  return (
    <main className="relative isolate min-h-[100dvh] overflow-y-auto bg-[#f6f8f7] text-slate-800">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_15%_15%,#dceae4_0%,transparent_50%),radial-gradient(ellipse_at_90%_85%,#e7e8f5_0%,transparent_48%)]" />
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-4 pb-10 pt-6 sm:px-8 sm:pt-10">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/shiorivia-app-icon.png" alt="Shiorivia official icon" width={48} height={48} className="h-12 w-12 rounded-2xl shadow-sm" />
            <div>
              <p className="text-sm font-black tracking-[0.17em]">SHIORIVIA</p>
              <p className="text-[11px] text-slate-500">Local Edition</p>
            </div>
          </div>
          <button type="button" onClick={onOpenSettings} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white" aria-label="打开设置中心">
            <Settings2 size={16} /> 设置
          </button>
        </header>

        <div className="mx-auto w-full max-w-3xl pb-8 pt-12 text-center sm:pt-16">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/75 px-4 py-1.5 text-[11px] font-semibold tracking-wider text-emerald-700"><House size={13} /> WHERE STORIES FIND THEIR WAY</p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#243b33] sm:text-5xl">从这里，开启你的故事。</h1>
          <p className="mt-4 text-sm leading-7 text-slate-500">选择一个空间。你的本地对话与故事会继续留在原来的存档中。</p>
          {hasSession && (
            <button type="button" onClick={onResume} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#355d50] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#284c41]">
              继续上次的会话 <ArrowRight size={16} />
            </button>
          )}
        </div>

        <section aria-label="模式导航" className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modes.map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                type="button"
                disabled={!mode.ready}
                onClick={() => { if (mode.ready) onEnter(mode.id as ReadyMode); }}
                className={`group flex min-h-[180px] flex-col items-start rounded-2xl border border-slate-200 bg-white/90 p-5 text-left shadow-sm transition ${mode.border} ${mode.ready ? "hover:-translate-y-0.5 hover:shadow-md" : "cursor-not-allowed opacity-65"}`}
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${mode.background} ${mode.color}`}><Icon size={22} /></div>
                <div className="mt-4 flex w-full items-baseline justify-between gap-2">
                  <h2 className="text-lg font-bold text-slate-800">{mode.title} <span className="text-xs font-normal text-slate-500">{mode.subtitle}</span></h2>
                  {!mode.ready && <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">开发中</span>}
                  {mode.ready && <ArrowRight size={16} className="shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-600" />}
                </div>
                <p className="mt-2 text-xs leading-6 text-slate-500">{mode.description}</p>
              </button>
            );
          })}
        </section>
        <p className="mt-auto pt-10 text-center text-[11px] text-slate-400">Shiorivia · Local-first, your stories stay yours.</p>
      </div>
    </main>
  );
}
