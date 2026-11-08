"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Check, CircleDot, Compass, Globe2, Orbit, RotateCcw, Sparkles, X } from "lucide-react";
import type { ChartaWorld } from "../lib/chartaWorld";
import {
  BANG_DREAM_WORLD_ID, BANG_DREAM_WORLD_NAME, describeStoryWorldline,
  parseStoryWorldline, worldlineFor, type StoryWorldline,
} from "../lib/storyWorldline";

const geometric = { fontFamily: 'Bahnschrift, "DIN Alternate", "Arial Narrow", "Yu Gothic", "Noto Sans SC", sans-serif' };
const inputStyle = "mt-2 w-full rounded-xl border border-[#a8baa9]/50 bg-[#f7faf6] px-4 py-3 text-sm font-medium text-[#233c34] outline-none transition focus:border-[#718a78] focus:ring-2 focus:ring-[#a9c9af]/25";

export function StoryWorldlineFateModal({ isOpen, value, legacyTimeline, worlds, onSave, onClose, onOpenCharta }: {
  isOpen: boolean;
  value?: StoryWorldline;
  legacyTimeline?: { major?: string; medium?: string; minor?: string };
  worlds: ChartaWorld[];
  onSave: (worldline: StoryWorldline) => void;
  onClose: () => void;
  onOpenCharta?: () => void;
}) {
  const [draft, setDraft] = useState<StoryWorldline>(() => value || worldlineFor(null));
  const [error, setError] = useState("");
  useEffect(() => {
    if (isOpen) { setDraft(value || worldlineFor(null)); setError(""); }
  }, [isOpen, value]);
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const choices = useMemo(() => {
    const list = [{ id: BANG_DREAM_WORLD_ID, name: BANG_DREAM_WORLD_NAME }, ...worlds];
    if (value && !list.some(world => world.id === value.worldId)) list.push({ id: value.worldId, name: value.worldName });
    return list;
  }, [worlds, value]);
  const stages = draft.canonTimeline || [];
  const eras = [...new Set(stages.filter(s => !draft.period || s.period === draft.period).map(s => s.era))];
  const periods = [...new Set(stages.filter(s => !draft.era || s.era === draft.era).map(s => s.period))];
  const baseEras = [...new Set(stages.map(s => s.era))];
  const basePeriods = stages.filter(s => !draft.baseEra || s.era === draft.baseEra);
  const chooseWorld = (id: string) => {
    const world = worlds.find(item => item.id === id) || null;
    setDraft(worldlineFor(world)); setError("");
  };
  const chooseEra = (era: string) => setDraft(prev => ({ ...prev, era,
    period: !era || prev.canonTimeline.some(stage => stage.era === era && stage.period === prev.period) ? prev.period : "" }));
  const choosePeriod = (period: string) => setDraft(prev => ({ ...prev, period,
    era: !period || prev.canonTimeline.some(stage => stage.era === prev.era && stage.period === period) ? prev.era : "" }));
  const save = () => {
    if (draft.kind === "au" && (!draft.baseEra || !draft.basePeriod)) { setError("AU 必须选择基准 ERA 和 PERIOD。"); return; }
    const next = parseStoryWorldline(draft);
    if (!next) { setError("世界线尚未成立：请填写对应的 ERA 与 PERIOD。"); return; }
    onSave(next); onClose();
  };

  if (typeof document === "undefined") return null;
  return createPortal(<AnimatePresence>
    {isOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-[#101d1d]/75 p-3 backdrop-blur-[8px] sm:p-6"
      onClick={onClose}>
      <motion.section role="dialog" aria-modal="true" aria-label="世界线 · 命运航图"
        initial={{ opacity: 0, scale: .96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: .97, y: 12 }} onClick={e => e.stopPropagation()}
        className="relative flex max-h-[94dvh] w-full max-w-[760px] flex-col overflow-hidden rounded-[28px] border border-[#b9c7b9]/50 bg-[#f7f9f5] text-[#2a4039] shadow-[0_35px_100px_rgba(4,18,18,.55)]">
        <header className="relative isolate shrink-0 overflow-hidden bg-[#182d2c] px-5 pb-7 pt-7 text-[#ecf2e7] sm:px-8 sm:pt-9">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-36 h-[380px] w-[380px] rounded-full border border-[#d9b989]/30" />
          <div aria-hidden className="pointer-events-none absolute -right-12 -top-24 h-[300px] w-[300px] rounded-full border border-[#d9b989]/20" />
          <div aria-hidden className="pointer-events-none absolute right-12 top-7 h-[160px] w-[160px] rounded-full border border-[#d9b989]/15" />
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_85%_15%,rgba(196,175,127,.24),transparent_48%),radial-gradient(ellipse_at_20%_100%,rgba(99,144,124,.25),transparent_60%)]" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#e6d1a6]/45 bg-[#e6d1a6]/10 text-[#e7c992]"><Orbit size={23} strokeWidth={1.2}/></div>
              <div>
                <div className="flex items-center gap-2 text-[10px] font-semibold tracking-[.29em] text-[#e5cf9f]" style={geometric}><Sparkles size={12}/> SHIORIVIA · STAR CHART</div>
                <h2 className="mt-2 text-[25px] font-semibold tracking-[.11em] sm:text-[30px]" style={geometric}>WORLDLINE <span className="text-[#e7c994]">/</span> 世界线</h2>
                <p className="mt-1 text-[11px] tracking-[.12em] text-[#b8c8bc]" style={geometric}>命运并非一条直线，而是无数次选择的回响。</p>
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label="关闭世界线" className="relative rounded-full border border-white/20 p-2 text-[#c7d6cc] transition hover:bg-white/10"><X size={18}/></button>
          </div>
          <div className="relative mt-7 flex items-center gap-3 text-[10px] font-semibold tracking-[.18em] text-[#c6d4c5]" style={geometric}>
            <CircleDot size={13} className="text-[#e3c992]"/><span>WORLD</span><span className="h-px flex-1 bg-gradient-to-r from-[#cfb781]/65 to-[#658777]/20"/><span>ERA</span><span className="h-px flex-1 bg-gradient-to-r from-[#cfb781]/65 to-[#658777]/20"/><span>PERIOD</span><span className="h-px flex-1 bg-gradient-to-r from-[#cfb781]/65 to-[#658777]/20"/><span>EVENT</span>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5 sm:p-8">
          {value && <div className="rounded-xl border-l-[3px] border-[#a68a56] bg-[#e9eee7] px-4 py-3 text-xs leading-6 text-[#496352]"><span className="font-semibold">既定星路</span><span className="mx-2 text-[#a6b5a7]">/</span>{describeStoryWorldline(value)}</div>}
          {!value && legacyTimeline?.major && <div className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">旧时间线仍保留：{legacyTimeline.major} / {legacyTimeline.medium || "未知时期"}。新世界线保存后将优先采用新设定。</div>}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3"><label htmlFor="fate-world-select" className="text-xs font-bold tracking-[.14em]" style={geometric}><Globe2 size={15} className="mr-2 inline text-[#7a956e]"/>01 · WORLD / 世界观</label>{onOpenCharta && <button type="button" onClick={onOpenCharta} className="flex items-center gap-1 text-[11px] font-semibold text-[#667e6c] hover:underline">Charta · 创造世界 <ArrowUpRight size={12}/></button>}</div>
            <select id="fate-world-select" value={draft.worldId} onChange={e=>chooseWorld(e.target.value)} className={inputStyle}>{choices.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <p className="text-[11px] leading-6 text-[#7d9286]">{draft.worldDescription ? `${draft.worldDescription.slice(0,180)}${draft.worldDescription.length>180 ? "…" : ""}` : "世界观未添加补充设定。模型将根据已有知识与剧情上下文理解这一世界。"}</p>
          </section>
          <section className="space-y-3">
            <h3 className="text-xs font-bold tracking-[.14em]" style={geometric}><Compass size={15} className="mr-2 inline text-[#9d8859]"/>02 · DESTINY / 时间线分歧</h3>
            <div className="grid grid-cols-2 gap-3">
              {([{id:"canon",title:"ORIGINAL / 原作",hint:"遵循既定时间轴"},{id:"au",title:"ALTERNATE / AU",hint:"书写另一种可能"}] as const).map(mode=><button key={mode.id} type="button" disabled={!stages.length} onClick={()=>setDraft(p=>({...p,kind:mode.id,era:"",period:"",baseEra:undefined,basePeriod:undefined}))} className={`relative rounded-xl border px-4 py-4 text-left transition disabled:opacity-35 ${draft.kind===mode.id ? "border-[#ab925e] bg-[#f1ede3] shadow-[inset_0_0_0_1px_#d8c79d]" : "border-[#d6dfd5] bg-white hover:border-[#b1c6b4]"}`}><span className="block text-xs font-bold tracking-wider" style={geometric}>{mode.title}</span><span className="mt-1 block text-[10px] text-[#7e9284]">{mode.hint}</span>{draft.kind===mode.id && <CircleDot size={13} className="absolute right-3 top-3 text-[#ae9364]"/>}</button>)}
            </div>
            {!stages.length && <p className="text-[11px] text-[#a17855]">这个世界尚未定义时间线，请先去 Charta 创建。AU 也需要原作基准时间线。</p>}
          </section>
          {draft.kind === "au" && <section className="space-y-3 rounded-2xl border border-[#bed2bf] bg-[#eef5ed] p-4">
            <h3 className="text-xs font-bold tracking-[.12em] text-[#456b57]" style={geometric}>AU ONLY · 基准时间线 *</h3>
            <p className="text-[11px] leading-6 text-[#718c7a]">决定人物从原作继承至哪个时期。AU 自己的 ERA / PERIOD 与此独立，不会提前注入后期经历。</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold">基准 ERA *<select className={inputStyle} value={draft.baseEra || ""} onChange={e=>setDraft(p=>({...p,baseEra:e.target.value,basePeriod:""}))}><option value="">请选择基准 ERA</option>{baseEras.map(era=><option key={era} value={era}>{era}</option>)}</select></label>
              <label className="text-xs font-semibold">基准 PERIOD *<select className={inputStyle} value={draft.basePeriod || ""} onChange={e=>setDraft(p=>({...p,basePeriod:e.target.value,baseEra:p.canonTimeline.find(stage=>stage.period===e.target.value)?.era || p.baseEra}))}><option value="">请选择基准 PERIOD</option>{basePeriods.map(stage=><option key={stage.period} value={stage.period}>{stage.period}</option>)}</select></label>
            </div>
          </section>}
          <section className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold tracking-[.12em]" style={geometric}>03 · ERA / 时代 *
              {draft.kind==="canon" ? <select value={draft.era} onChange={e=>chooseEra(e.target.value)} className={inputStyle}><option value="">请选择 ERA</option>{eras.map(era=><option key={era} value={era}>{era}</option>)}</select> : <input value={draft.era} maxLength={100} placeholder="另一条时间轴中的时代" onChange={e=>setDraft(p=>({...p,era:e.target.value}))} className={inputStyle}/>}</label>
            <label className="text-xs font-bold tracking-[.12em]" style={geometric}>04 · PERIOD / 时期 *
              {draft.kind==="canon" ? <select value={draft.period} onChange={e=>choosePeriod(e.target.value)} className={inputStyle}><option value="">请选择 PERIOD</option>{periods.map(period=><option key={period} value={period}>{period}</option>)}</select> : <input value={draft.period} maxLength={100} placeholder="另一条时间轴中的时期" onChange={e=>setDraft(p=>({...p,period:e.target.value}))} className={inputStyle}/>}</label>
          </section>
          {draft.kind==="canon" && <button type="button" onClick={()=>setDraft(p=>({...p,era:"",period:""}))} className="flex items-center gap-1 text-[11px] text-[#648370] hover:underline"><RotateCcw size={12}/>重新选择 ERA / PERIOD</button>}
          <label className="block text-xs font-bold tracking-[.12em]" style={geometric}>05 · EVENT / 命运事件（选填）<textarea value={draft.event} maxLength={500} rows={3} onChange={e=>setDraft(p=>({...p,event:e.target.value}))} placeholder="这一刻会发生什么？也可以交给故事本身。" className={`${inputStyle} resize-y leading-6`}/></label>
          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</p>}
        </div>
        <footer className="flex shrink-0 items-center justify-between border-t border-[#dbe3d8] bg-[#f0f4ef] px-5 py-4 sm:px-8"><span className="hidden text-[10px] tracking-[.19em] text-[#879b8b] sm:block" style={geometric}>THE STORY BEGINS WITH A CHOICE.</span><div className="ml-auto flex items-center gap-3"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs text-[#6c8174] hover:bg-[#e1e9e1]">取消</button><button type="button" onClick={save} className="flex items-center gap-2 rounded-xl bg-[#284a3d] px-5 py-3 text-xs font-semibold text-[#f5eccc] shadow-lg shadow-[#284a3d]/20 hover:bg-[#193a30]"><Check size={15}/>铭刻世界线</button></div></footer>
      </motion.section>
    </motion.div>}
  </AnimatePresence>, document.body);
}
