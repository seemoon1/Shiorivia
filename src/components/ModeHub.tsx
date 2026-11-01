"use client";

import {
  ArrowRight, BookOpen, Hammer, House, TreeDeciduous, Settings2,
  Route, Sparkles, FilePenLine,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import type { TranslationKey } from "../lib/i18n";
import { localText } from "../lib/i18nLocal";
import { chartaText } from "../lib/chartaText";

type ReadyMode = "infinite" | "sliding" | "novel" | "chat" | "lime";

type ModeHubProps = {
  onEnter: (mode: ReadyMode) => void;
  onResume: () => void;
  onOpenSettings: () => void;
  onOpenCharta: () => void;
  hasSession: boolean;
  loading?: boolean;
  syncStatus?: "idle" | "syncing" | "error" | "success" | "unsaved";
};

const buildModes = (t: (key: TranslationKey) => string) => [
  {
    id: "infinite", title: "Officina", subtitle: t("mode.officina.subtitle"),
    description: t("mode.officina.description"),
    icon: Hammer, color: "text-sky-800", background: "bg-slate-50", border: "hover:border-sky-300",
    ready: true,
  },
  {
    id: "sliding", title: "Via Lata", subtitle: t("mode.vialata.subtitle"),
    description: t("mode.vialata.description"),
    icon: Route, color: "text-[#486e60]", background: "bg-[#eaf2eb]", border: "hover:border-[#92b29d]",
    ready: true,
  },
  {
    id: "chat", title: "Umbra", subtitle: t("mode.umbra.subtitle"),
    description: t("mode.umbra.description"),
    icon: TreeDeciduous, color: "text-[#4f7a63]", background: "bg-[#eef5ed]", border: "hover:border-[#9abda2]",
    ready: true,
  },
  {
    id: "novel", title: "Tela", subtitle: t("mode.tela.subtitle"),
    description: t("mode.tela.description"),
    icon: BookOpen, color: "text-emerald-700", background: "bg-emerald-50", border: "hover:border-emerald-300",
    ready: true,
  },
  {
    id: "lime", title: "VIAE", subtitle: t("mode.viae.subtitle"),
    description: t("mode.viae.description"),
    icon: Route, color: "text-[#9e8050]", background: "bg-[#f7f3e9]", border: "hover:border-[#c3ad85]",
    ready: true,
  },
] as const;

export function ModeHub({ onEnter, onResume, onOpenSettings, onOpenCharta, hasSession, loading = false, syncStatus = "idle" }: ModeHubProps) {
  const { t, locale } = useLanguage();
  const modes = buildModes(t);
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
          <button type="button" onClick={onOpenSettings} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white" aria-label={t("settings.title")}>
            <Settings2 size={16} /> {t("home.settings")}
          </button>
        </header>
        <div role="status" aria-live="polite" className="mt-5 inline-flex w-fit items-center gap-2 self-start rounded-full border border-[#dbe6df] bg-white/80 px-3 py-1.5 text-[11px] text-[#567462]">
          <span className={`h-1.5 w-1.5 rounded-full ${loading || syncStatus === "syncing" ? "bg-amber-400" : syncStatus === "error" ? "bg-rose-500" : syncStatus === "unsaved" ? "bg-amber-500" : "bg-emerald-500"}`} />
          <span>{localText(locale, "sync.title")} · {loading ? localText(locale, "sync.loading") : localText(locale, `sync.${syncStatus}`)}</span>
        </div>

        <div className="mx-auto w-full max-w-3xl pb-8 pt-12 text-center sm:pt-16">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/75 px-4 py-1.5 text-[11px] font-semibold tracking-wider text-emerald-700"><House size={13} /> WHERE STORIES FIND THEIR WAY</p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#243b33] sm:text-5xl">{t("home.heading")}</h1>
          <p className="mt-4 text-sm leading-7 text-slate-500">{t("home.description")}</p>
          {hasSession && !loading && (
            <button type="button" onClick={onResume} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#355d50] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#284c41]">
              {t("home.resume")} <ArrowRight size={16} />
            </button>
          )}
        </div>

        <section aria-label={t("home.navigation")} className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modes.map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                type="button"
                disabled={!mode.ready || loading}
                onClick={() => { if (mode.ready && !loading) onEnter(mode.id as ReadyMode); }}
                className={`group flex min-h-[180px] flex-col items-start rounded-2xl border border-slate-200 bg-white/90 p-5 text-left shadow-sm transition ${mode.border} ${mode.ready ? "hover:-translate-y-0.5 hover:shadow-md" : "cursor-not-allowed opacity-65"}`}
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${mode.background} ${mode.color}`}><Icon size={22} /></div>
                <div className="mt-4 flex w-full items-baseline justify-between gap-2">
                  <h2 className="text-lg font-bold text-slate-800">{mode.title} <span className="text-xs font-normal text-slate-500">{mode.subtitle}</span></h2>
                  {!mode.ready && <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{t("home.developing")}</span>}
                  {mode.ready && <ArrowRight size={16} className="shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-600" />}
                </div>
                <p className="mt-2 text-xs leading-6 text-slate-500">{mode.description}</p>
              </button>
            );
          })}
          <button type="button" disabled={loading} onClick={onOpenCharta}
            className="group flex min-h-[180px] flex-col items-start rounded-2xl border border-[#e2ded3] bg-[#fffdfa] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#c7b899] hover:shadow-md disabled:opacity-50">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f1eada] text-[#8d7856]"><FilePenLine size={22}/></div>
            <div className="mt-4 flex w-full items-baseline justify-between gap-2"><h2 className="text-lg font-bold">Charta <span className="text-xs font-normal text-slate-500">· {({ "zh-CN": "纸", "zh-TW": "紙", en: "Paper", ja: "紙", ko: "종이" } as const)[locale]}</span></h2><ArrowRight size={16} className="text-slate-300 group-hover:text-slate-600"/></div>
            <p className="mt-2 text-xs leading-6 text-slate-500">{chartaText(locale, "intro")}</p>
          </button>
        </section>
        <p className="mt-auto pt-10 text-center text-[11px] text-slate-400">Shiorivia · Local-first, your stories stay yours.</p>
      </div>
    </main>
  );
}
