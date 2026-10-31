"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  BookOpen, Bug, Globe2, Image as ImageIcon, Mic, Music2,
  Settings2, Sparkles, X,
} from "lucide-react";
import type { PublicLocalProvider } from "../lib/localProviders";

export type SettingKey = "webSearch" | "imageGen" | "tts" | "musicControl";
export type StoryTheme = "sky" | "sage" | "rose";

type Props = {
  open: boolean;
  onClose: () => void;
  values: Record<SettingKey, boolean>;
  onToggle: (key: SettingKey) => void;
  debugMode: boolean;
  onToggleDebug: () => void;
  engineeringTransitionEnabled: boolean;
  onToggleEngineeringTransition: () => void;
  onTestEffect: (name: "rain" | "curtain" | "math" | "glitch") => void;
  isStory: boolean;
  storyTheme: StoryTheme;
  onStoryThemeChange: (value: StoryTheme) => void;
  activeProvider: string;
  providers: PublicLocalProvider[];
  disabledProviders: string[];
  onToggleProvider: (id: string) => void;
};

type Tab = "general" | "ai" | "media" | "developer";

const tabs = [
  { id: "general", label: "通用设置", icon: Settings2 },
  { id: "ai", label: "AI 与模型", icon: Globe2 },
  { id: "media", label: "媒体与声音", icon: Music2 },
  { id: "developer", label: "开发工具", icon: Bug },
] as const;

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="h-px w-5 bg-[#91a79c]" />
      <h3 className="shrink-0 text-xs font-bold tracking-widest text-[#3d6657]">{children}</h3>
      <div className="h-px flex-1 bg-[#dce5df]" />
    </div>
  );
}

function SwitchRow({ title, description, checked, onClick, icon: Icon }: {
  title: string;
  description: string;
  checked: boolean;
  onClick: () => void;
  icon: typeof Music2;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 py-4 last:border-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Icon size={17} /></div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-700">{title}</div>
        <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
      </div>
      <button type="button" role="switch" aria-checked={checked} aria-label={title} onClick={onClick} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-[#5c927b]" : "bg-slate-200"}`}>
        <span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

export function SettingsCenter({ open, onClose, values, onToggle, debugMode, onToggleDebug, engineeringTransitionEnabled, onToggleEngineeringTransition, onTestEffect, isStory, storyTheme, onStoryThemeChange, activeProvider, providers, disabledProviders, onToggleProvider }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("general");

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/50 p-2 backdrop-blur-sm sm:p-5" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Shiorivia 设置中心" className="flex max-h-[calc(100dvh-1rem)] w-full max-w-[960px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[#fbfcfb] text-slate-700 shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3"><Settings2 size={20} className="text-[#517d69]" /><div><h2 className="text-lg font-bold">设置中心</h2><p className="text-[11px] text-slate-400">Settings · Local Edition</p></div></div>
          <button type="button" onClick={onClose} aria-label="关闭设置中心" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <nav aria-label="设置分类" className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-[#f5f8f6] p-2 md:w-[216px] md:flex-col md:border-b-0 md:border-r md:p-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition md:w-full ${activeTab === tab.id ? "bg-white text-[#376c54] shadow-sm ring-1 ring-emerald-100" : "text-slate-500 hover:bg-white/60"}`}>
                  <Icon size={16} /> {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7 sm:py-7">
            {activeTab === "general" && (
              <section>
                <h2 className="mb-2 text-xl font-bold">通用设置</h2>
                <p className="mb-8 text-sm text-slate-400">设置作用于当前 Shiorivia Local 实例，在 Officina、Via Lata、Umbra、Tela 与 VIAE 间共享。</p>
                {isStory ? (
                  <>
                    <SectionTitle>Via Lata · 故事主题</SectionTitle>
                    <p className="mb-3 text-xs text-slate-500">仅更改故事舞台背景色，不修改角色或会话数据。</p>
                    <div className="mb-8 flex flex-wrap gap-3">
                      {([
                        { id: "sky", name: "晴空蓝", swatch: "bg-[#e0f2fe]" },
                        { id: "sage", name: "鼠尾草", swatch: "bg-[#b7d3b0]" },
                        { id: "rose", name: "玫瑰粉", swatch: "bg-[#f4c6d2]" },
                      ] as const).map((option) => (
                        <button key={option.id} type="button" aria-pressed={storyTheme === option.id} onClick={() => onStoryThemeChange(option.id)} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${storyTheme === option.id ? "border-[#65927c] bg-[#edf6ef] text-[#366b54]" : "border-slate-200 bg-white text-slate-500"}`}>
                          <span className={`h-4 w-4 rounded-full border border-black/5 ${option.swatch}`} /> {option.name}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="mb-7 rounded-xl border border-slate-200 bg-white p-4 text-xs leading-6 text-slate-500">Via Lata 的独立主题色选项将在进入大路模式后显示。</div>
                )}
                <SectionTitle>空间与数据</SectionTitle>
                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-xs leading-6 text-slate-500">
                  <BookOpen size={17} className="mt-0.5 shrink-0 text-[#65927c]" />
                  <span>会话仍沿用本地存档与左侧栏的 JSON 导入 / 导出。导航和设置中心不会迁移或清除现有记录。</span>
                </div>
              </section>
            )}

            {activeTab === "ai" && (
              <section>
                <h2 className="mb-2 text-xl font-bold">AI 与模型</h2>
                <p className="mb-8 text-sm text-slate-400">支持 DeepSeek、OpenRouter、Google 及至多四个本地自定义 OpenAI 兼容接口。所有密钥仅从服务端环境变量读取。</p>
                <SectionTitle>供应商与可见性</SectionTitle>
                <div className="mb-7 space-y-2">
                  {providers.map((provider) => (
                    <div key={provider.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm">
                      <div className="min-w-0">
                        <p className="font-semibold">{provider.label} {activeProvider === provider.id && <span className="ml-1 text-[10px] text-emerald-600">ACTIVE</span>}</p>
                        <p className="mt-1 text-xs text-slate-400">{provider.configured ? "已配置 API 密钥" : "尚未在 .env.local 配置"}{provider.custom ? " · 自定义" : " · 默认供应商"}</p>
                      </div>
                      <button type="button" disabled={!provider.configured} aria-pressed={!disabledProviders.includes(provider.id)} onClick={() => onToggleProvider(provider.id)}
                        className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold ${disabledProviders.includes(provider.id) ? "border-slate-200 bg-slate-50 text-slate-400" : "border-emerald-200 bg-emerald-50 text-emerald-700"} disabled:opacity-40`}>
                        {disabledProviders.includes(provider.id) ? "已禁用" : "已启用"}
                      </button>
                    </div>
                  ))}
                </div>
                <p className="mb-6 text-xs leading-6 text-slate-500">自定义供应商优先显示；模型面板同时最多显示四个供应商。模型列表优先读取供应商实时目录，失败时使用离线备选模型。修改 .env.local 后请重启服务。</p>
                <SectionTitle>扩展能力</SectionTitle>
                <SwitchRow title="Web Search / 联网搜索" description="需要 .env.local 中配置 TAVILY_API_KEY。" checked={values.webSearch} onClick={() => onToggle("webSearch")} icon={Globe2} />
                <SwitchRow title="Image Generation / 图像生成" description="需要配置本地生图服务。" checked={values.imageGen} onClick={() => onToggle("imageGen")} icon={ImageIcon} />
              </section>
            )}

            {activeTab === "media" && (
              <section>
                <h2 className="mb-2 text-xl font-bold">媒体与声音</h2>
                <p className="mb-8 text-sm text-slate-400">媒体功能与侧边栏控制同步；默认不自动播放 AI 指定音乐。</p>
                <SectionTitle>语音与音乐</SectionTitle>
                <SwitchRow title="Voice Module / 语音模块" description="需要配置本地 TTS 后端。" checked={values.tts} onClick={() => onToggle("tts")} icon={Mic} />
                <SwitchRow title="Auto DJ / 自动配乐" description="允许模型在对话过程中指定 BGM，默认关闭。" checked={values.musicControl} onClick={() => onToggle("musicControl")} icon={Music2} />
              </section>
            )}

            {activeTab === "developer" && (
              <section>
                <h2 className="mb-2 text-xl font-bold">开发工具</h2>
                <p className="mb-8 text-sm text-slate-400">保留原先的调试功能，移至独立分组。</p>
                <SectionTitle>调试</SectionTitle>
                <SwitchRow title="Debug Mode" description="显示额外的调试标签和模型输出信息。" checked={debugMode} onClick={onToggleDebug} icon={Bug} />
                <SwitchRow title="Officina 入场转场" description="新建或首次进入工坊时播放 Math 动画；默认关闭，可随时开启。" checked={engineeringTransitionEnabled} onClick={onToggleEngineeringTransition} icon={Sparkles} />
                <SectionTitle>转场预览</SectionTitle>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {([
                    { id: "rain", label: "Rain" },
                    { id: "curtain", label: "Curtain" },
                    { id: "math", label: "Math" },
                    { id: "glitch", label: "Glitch" },
                  ] as const).map((effect) => (
                    <button key={effect.id} type="button" onClick={() => { onClose(); onTestEffect(effect.id); }} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-semibold text-slate-600 hover:border-emerald-200 hover:bg-emerald-50">
                      <Sparkles size={14} /> {effect.label}
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
        <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 text-right text-[11px] text-slate-400 sm:px-6">Shiorivia · Settings</footer>
      </div>
    </div>
  );
}
