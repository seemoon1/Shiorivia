"use client";
import { Plus, Trash2, Globe2 } from "lucide-react";
import type { ChartaWorld } from "../lib/chartaWorld";
import { BANG_DREAM_WORLD_ID, BANG_DREAM_WORLD_NAME, BANG_DREAM_CANON, worldlineFor, type StoryWorldline } from "../lib/storyWorldline";

const selectStyle = "mt-1 w-full rounded-lg border border-[#dfe6eb] bg-white px-3 py-2.5 text-xs text-[#253f58] outline-none focus:border-[#bfaa7b]";
const rowStyle = "rounded-xl border border-[#e7e9ea] bg-[#fcfcfa] p-3";
const worldsList = (worlds: ChartaWorld[]) => [
  { id: BANG_DREAM_WORLD_ID, name: BANG_DREAM_WORLD_NAME, description: "", canonTimeline: BANG_DREAM_CANON },
  ...worlds,
];

export function ViaeWorldlineEditor({ value, onChange, worlds }: {
  value: StoryWorldline;
  onChange: (next: StoryWorldline) => void;
  worlds: ChartaWorld[];
}) {
  const available = worldsList(worlds);
  const stages = value.canonTimeline || [];
  const cross = value.crossWorld || { enabled: false, includeUniversal: false, secondary: [] };
  const modifyCross = (next: typeof cross) => onChange({ ...value, crossWorld: next });
  const changeWorld = (id: string) => {
    const chosen = available.find(w => w.id === id);
    const next = chosen?.id === BANG_DREAM_WORLD_ID ? worldlineFor(null)
      : worldlineFor(worlds.find(w => w.id === id) || null);
    onChange(next);
  };
  const chooseSecondary = (index: number, id: string) => {
    const w = available.find(item => item.id === id);
    if (!w) return;
    modifyCross({ ...cross, secondary: cross.secondary.map((entry, i) => i === index
      ? { worldId: w.id, worldName: w.name, worldDescription: w.description,
        canonTimeline: w.canonTimeline, baseEra: "", basePeriod: "" } : entry) });
  };
  const addSecondary = () => {
    if (cross.secondary.length >= 3) return;
    const next = available.find(w => w.id !== value.worldId && !cross.secondary.some(c => c.worldId === w.id));
    if (!next) return;
    modifyCross({ ...cross, secondary: [...cross.secondary, {
      worldId: next.id, worldName: next.name, worldDescription: next.description,
      canonTimeline: next.canonTimeline, baseEra: "", basePeriod: "",
    }] });
  };
  const base = stages.filter(s => !value.baseEra || s.era === value.baseEra);
  const periods = stages.filter(s => !value.era || s.era === value.era);
  const eras = [...new Set(stages.map(s => s.era))];
  return (
    <div className="space-y-4 text-[#29445c]">
      <div className="flex items-center gap-2 text-xs font-semibold"><Globe2 size={15} className="text-[#b69a64]"/> WORLDLINE / 道路世界线</div>
      <label className="block text-[11px] font-medium text-[#64788a]">主世界观 · WORLD *
        <select value={value.worldId} onChange={e => changeWorld(e.target.value)} className={selectStyle}>
          {available.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </label>
      <div className="flex gap-2">
        {(["canon", "au"] as const).map(kind =>
          <button key={kind} type="button" aria-pressed={value.kind === kind}
            onClick={() => onChange({ ...value, kind, era: "", period: "", baseEra: undefined, basePeriod: undefined })}
            className={`rounded-lg border px-4 py-2 text-xs ${value.kind === kind ? "border-[#bda475] bg-[#fff8e9] text-[#795e2f]" : "border-[#e1e6eb] bg-white text-[#8090a1]"}`}>
            {kind === "canon" ? "原作 · ORIGINAL" : "平行世界 · AU"}</button>)}
      </div>
      {value.kind === "au" && <div className={rowStyle}>
        <p className="mb-2 text-[11px] text-[#718495]">AU 原作基准 · 角色认知截至这一时期</p>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px]">基准 ERA *<select value={value.baseEra || ""} className={selectStyle}
            onChange={e => onChange({ ...value, baseEra: e.target.value, basePeriod: undefined })}>
            <option value="">选择 ERA</option>{eras.map(v => <option key={v} value={v}>{v}</option>)}</select></label>
          <label className="text-[11px]">基准 PERIOD *<select value={value.basePeriod || ""} className={selectStyle}
            onChange={e => onChange({ ...value, basePeriod: e.target.value, baseEra: stages.find(s => s.period === e.target.value)?.era || value.baseEra })}>
            <option value="">选择 PERIOD</option>{base.map(s => <option key={s.period} value={s.period}>{s.period}</option>)}</select></label>
        </div>
      </div>}
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px]">ERA · 时代 *{value.kind === "canon"
          ? <select value={value.era} className={selectStyle} onChange={e => onChange({ ...value, era: e.target.value, period: "" })}>
              <option value="">选择 ERA</option>{eras.map(v => <option key={v} value={v}>{v}</option>)}</select>
          : <input value={value.era} maxLength={100} onChange={e => onChange({ ...value, era: e.target.value })} className={selectStyle} placeholder="AU 时代"/>}</label>
        <label className="text-[11px]">PERIOD · 时期 *{value.kind === "canon"
          ? <select value={value.period} className={selectStyle} onChange={e => onChange({
              ...value, period: e.target.value, era: stages.find(s => s.period === e.target.value)?.era || value.era })}>
              <option value="">选择 PERIOD</option>{periods.map(s => <option key={s.period} value={s.period}>{s.period}</option>)}</select>
          : <input value={value.period} maxLength={100} onChange={e => onChange({ ...value, period: e.target.value })} className={selectStyle} placeholder="AU 时期"/>}</label>
      </div>
      <div className={rowStyle}>
        <label className="flex items-center justify-between gap-2 text-xs font-semibold">
          跨世界观 · CROSS-WORLD <input type="checkbox" checked={cross.enabled}
            onChange={e => modifyCross({ ...cross, enabled: e.target.checked, includeUniversal: e.target.checked && cross.includeUniversal,
              secondary: e.target.checked ? cross.secondary : [] })} className="h-4 w-4 accent-[#b59b66]"/>
        </label>
        {cross.enabled && <div className="mt-3 space-y-3">
          <p className="text-[11px] leading-5 text-[#8493a1]">至多三个附属世界观。各自设置原作认知截止时期；道路剧情时间以主世界线为准。</p>
          {cross.secondary.map((entry, index) => {
            const eras = [...new Set(entry.canonTimeline.map(s => s.era))];
            const periods = entry.canonTimeline.filter(s => !entry.baseEra || s.era === entry.baseEra);
            return <div key={index} className="space-y-2 rounded-lg border border-[#e4e7e7] bg-white p-3">
              <div className="flex items-center justify-between text-xs font-medium">
                <span>其他世界观 {index + 1}</span>
                <button type="button" aria-label="移除附属世界观" onClick={() => modifyCross({ ...cross, secondary: cross.secondary.filter((_, i) => i !== index) })}><Trash2 size={14}/></button>
              </div>
              <select value={entry.worldId} className={selectStyle} onChange={e => chooseSecondary(index, e.target.value)}>
                {available.filter(w => w.id === entry.worldId || (w.id !== value.worldId && !cross.secondary.some(s => s.worldId === w.id))).map(w =>
                  <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px]">基准 ERA *<select value={entry.baseEra} className={selectStyle}
                  onChange={e => modifyCross({ ...cross, secondary: cross.secondary.map((s, i) => i === index ? { ...s, baseEra: e.target.value, basePeriod: "" } : s) })}>
                  <option value="">选择 ERA</option>{eras.map(era => <option key={era} value={era}>{era}</option>)}</select></label>
                <label className="text-[11px]">基准 PERIOD *<select value={entry.basePeriod} className={selectStyle}
                  onChange={e => modifyCross({ ...cross, secondary: cross.secondary.map((s, i) => i === index
                    ? { ...s, basePeriod: e.target.value, baseEra: s.canonTimeline.find(t => t.period === e.target.value)?.era || s.baseEra } : s) })}>
                  <option value="">选择 PERIOD</option>{periods.map(p => <option key={p.period} value={p.period}>{p.period}</option>)}</select></label>
              </div>
            </div>;
          })}
          <button type="button" onClick={addSecondary} disabled={cross.secondary.length >= 3 ||
            available.every(w => w.id === value.worldId || cross.secondary.some(s => s.worldId === w.id))}
            className="flex items-center gap-1.5 rounded-lg border border-[#d9cead] px-3 py-2 text-xs text-[#8c7547] disabled:opacity-40">
            <Plus size={13}/> 添加世界观 ({cross.secondary.length}/3)
          </button>
          <label className="flex items-center justify-between rounded-lg bg-[#f8fafb] px-3 py-2 text-xs">
            启用通用角色 <input type="checkbox" checked={cross.includeUniversal}
              onChange={e => modifyCross({ ...cross, includeUniversal: e.target.checked })} className="h-4 w-4 accent-[#b59b66]"/>
          </label>
        </div>}
      </div>
    </div>
  );
}
