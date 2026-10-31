"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  BookOpen, Bug, Globe2, Image as ImageIcon, Mic, Music2,
  Settings2, Sparkles, X,
} from "lucide-react";
import type { PublicLocalProvider } from "../lib/localProviders";
import { useLanguage } from "../context/LanguageContext";
import { LANGUAGE_OPTIONS, type Locale } from "../lib/locale";

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
  { id: "general", labelKey: "settings.general", icon: Settings2 },
  { id: "ai", labelKey: "settings.ai", icon: Globe2 },
  { id: "media", labelKey: "settings.media", icon: Music2 },
  { id: "developer", labelKey: "settings.developer", icon: Bug },
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
  const { t, locale, setLocale } = useLanguage();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/50 p-2 backdrop-blur-sm sm:p-5" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={t("settings.title")} className="flex max-h-[calc(100dvh-1rem)] w-full max-w-[960px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[#fbfcfb] text-slate-700 shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3"><Settings2 size={20} className="text-[#517d69]" /><div><h2 className="text-lg font-bold">{t("settings.title")}</h2><p className="text-[11px] text-slate-400">Shiorivia · Local</p></div></div>
          <button type="button" onClick={onClose} aria-label={t("settings.close")} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <nav aria-label={t("settings.categories")} className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-[#f5f8f6] p-2 md:w-[216px] md:flex-col md:border-b-0 md:border-r md:p-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition md:w-full ${activeTab === tab.id ? "bg-white text-[#376c54] shadow-sm ring-1 ring-emerald-100" : "text-slate-500 hover:bg-white/60"}`}>
                  <Icon size={16} /> {t(tab.labelKey)}
                </button>
              );
            })}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7 sm:py-7">
            {activeTab === "general" && (
              <section>
                <h2 className="mb-2 text-xl font-bold">{t("settings.general")}</h2>
                <p className="mb-5 text-sm text-slate-400">{t("settings.general.description")}</p>
                <div className="mb-7 rounded-xl border border-slate-200 bg-white p-4">
                  <label htmlFor="shiorivia-language" className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#376c54]"><Globe2 size={16} />{t("settings.language")}</label>
                  <select id="shiorivia-language" value={locale} onChange={e => setLocale(e.target.value as Locale)} className="w-full rounded-lg border border-slate-200 bg-[#fbfcfb] px-3 py-2 text-sm text-slate-700 focus:border-[#81a58f] focus:outline-none">
                    {LANGUAGE_OPTIONS.map(item => <option key={item.code} value={item.code}>{item.label}</option>)}
                  </select>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{t("settings.language.description")}</p>
                </div>
                {isStory ? (
                  <>
                    <SectionTitle>{t("settings.storyTheme")}</SectionTitle>
                    <p className="mb-3 text-xs text-slate-500">{t("settings.storyTheme.description")}</p>
                    <div className="mb-8 flex flex-wrap gap-3">
                      {([
                        { id: "sky", name: t("settings.sky"), swatch: "bg-[#e0f2fe]" },
                        { id: "sage", name: t("settings.sage"), swatch: "bg-[#b7d3b0]" },
                        { id: "rose", name: t("settings.rose"), swatch: "bg-[#f4c6d2]" },
                      ] as const).map((option) => (
                        <button key={option.id} type="button" aria-pressed={storyTheme === option.id} onClick={() => onStoryThemeChange(option.id)} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${storyTheme === option.id ? "border-[#65927c] bg-[#edf6ef] text-[#366b54]" : "border-slate-200 bg-white text-slate-500"}`}>
                          <span className={`h-4 w-4 rounded-full border border-black/5 ${option.swatch}`} /> {option.name}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="mb-7 rounded-xl border border-slate-200 bg-white p-4 text-xs leading-6 text-slate-500">{t("settings.storyTheme.unavailable")}</div>
                )}
                <SectionTitle>{t("settings.data")}</SectionTitle>
                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-xs leading-6 text-slate-500">
                  <BookOpen size={17} className="mt-0.5 shrink-0 text-[#65927c]" />
                  <span>{t("settings.data.description")}</span>
                </div>
              </section>
            )}

            {activeTab === "ai" && (
              <section>
                <h2 className="mb-2 text-xl font-bold">{t("settings.ai")}</h2>
                <p className="mb-8 text-sm text-slate-400">{t("settings.ai.description")}</p>
                <SectionTitle>{t("settings.providers")}</SectionTitle>
                <div className="mb-7 space-y-2">
                  {providers.map((provider) => (
                    <div key={provider.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm">
                      <div className="min-w-0">
                        <p className="font-semibold">{provider.label} {activeProvider === provider.id && <span className="ml-1 text-[10px] text-emerald-600">{t("settings.active")}</span>}</p>
                        <p className="mt-1 text-xs text-slate-400">{provider.configured ? t("settings.configured") : t("settings.unconfigured")}{" · "}{provider.custom ? t("settings.custom") : t("settings.default")}</p>
                      </div>
                      <button type="button" disabled={!provider.configured} aria-pressed={!disabledProviders.includes(provider.id)} onClick={() => onToggleProvider(provider.id)}
                        className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold ${disabledProviders.includes(provider.id) ? "border-slate-200 bg-slate-50 text-slate-400" : "border-emerald-200 bg-emerald-50 text-emerald-700"} disabled:opacity-40`}>
                        {disabledProviders.includes(provider.id) ? t("settings.disabled") : t("settings.enabled")}
                      </button>
                    </div>
                  ))}
                </div>
                <p className="mb-6 text-xs leading-6 text-slate-500">{t("settings.providers.description")}</p>
                <SectionTitle>{t("settings.extensions")}</SectionTitle>
                <SwitchRow title={t("settings.webSearch")} description={t("settings.webSearch.description")} checked={values.webSearch} onClick={() => onToggle("webSearch")} icon={Globe2} />
                <SwitchRow title={t("settings.imageGen")} description={t("settings.imageGen.description")} checked={values.imageGen} onClick={() => onToggle("imageGen")} icon={ImageIcon} />
              </section>
            )}

            {activeTab === "media" && (
              <section>
                <h2 className="mb-2 text-xl font-bold">{t("settings.media")}</h2>
                <p className="mb-8 text-sm text-slate-400">{t("settings.media.description")}</p>
                <SectionTitle>{t("settings.voiceAndMusic")}</SectionTitle>
                <SwitchRow title={t("settings.tts")} description={t("settings.tts.description")} checked={values.tts} onClick={() => onToggle("tts")} icon={Mic} />
                <SwitchRow title={t("settings.autoDJ")} description={t("settings.autoDJ.description")} checked={values.musicControl} onClick={() => onToggle("musicControl")} icon={Music2} />
              </section>
            )}

            {activeTab === "developer" && (
              <section>
                <h2 className="mb-2 text-xl font-bold">{t("settings.developer")}</h2>
                <p className="mb-8 text-sm text-slate-400">{t("settings.developer.description")}</p>
                <SectionTitle>{t("settings.debugging")}</SectionTitle>
                <SwitchRow title="Debug Mode" description={t("settings.debug.description")} checked={debugMode} onClick={onToggleDebug} icon={Bug} />
                <SwitchRow title={t("settings.transition")} description={t("settings.transition.description")} checked={engineeringTransitionEnabled} onClick={onToggleEngineeringTransition} icon={Sparkles} />
                <SectionTitle>{t("settings.preview")}</SectionTitle>
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
