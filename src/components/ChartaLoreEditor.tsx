"use client";

import { useMemo } from "react";
import { Plus, Trash2, Clock3, Users, BookOpen, Feather, Sparkles } from "lucide-react";
import type { ChartaCharacter } from "../lib/charta";
import type { ChartaTimelineStage } from "../lib/chartaWorld";
import {
  type ChartaLoreProfile, type ChartaRelationship, type ChartaExperience,
  validateChartaTimelineLinks,
} from "../lib/chartaLore";

const field = "mt-2 w-full rounded-xl border border-[#d7e0d6] bg-[#fbfcf9] px-3 py-3 text-sm leading-6 text-[#2d4739] outline-none focus:border-[#789e83]";
const head = "flex flex-wrap items-center justify-between gap-2 text-xs font-bold tracking-[.08em] text-[#547562]";
const panel = "space-y-3 rounded-2xl border border-[#dce6dc] bg-[#fcfdfa] p-4";
const uid = (prefix: string) => prefix + "-" + (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

export function ChartaTimelineRangePicker({ periods, stages, onChange }: {
  periods: string[]; stages: readonly ChartaTimelineStage[]; onChange: (value: string[]) => void;
}) {
  const start = periods.length ? stages.findIndex(s => s.period === periods[0]) : -1;
  const end = periods.length ? stages.findIndex(s => s.period === periods[periods.length - 1]) : -1;
  const chosen = start >= 0 && end >= start;
  const setRange = (a: number, b: number) => onChange(a < 0 || b < 0 ? [] : stages.slice(Math.min(a,b), Math.max(a,b) + 1).map(s => s.period));
  return <div className="space-y-2 rounded-xl border border-[#dbe6dc] bg-white px-3 py-3">
    <div className="flex items-center gap-2 text-xs text-[#5c7b65]"><Clock3 size={14}/>关联时间线 · 可选</div>
    {!stages.length
      ? <p className="text-[11px] leading-5 text-amber-700">所属世界观尚未创建时间线。请先完善世界观；暂时只能使用默认全时期内容。</p>
      : <>
        <label className="flex items-center gap-2 text-xs text-[#637e6a]"><input type="checkbox" checked={chosen} onChange={e=>onChange(e.target.checked ? [stages[0].period] : [])}/>仅在指定时期及其以后生效（推荐）</label>
        {chosen && <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[11px] text-[#65806d]">起始时期
            <select value={stages[start]?.period || ""} onChange={e=>setRange(stages.findIndex(s=>s.period===e.target.value),end)} className={field}>{stages.map(s=><option key={s.period} value={s.period}>{s.era} · {s.period}</option>)}</select>
          </label>
          <label className="text-[11px] text-[#65806d]">结束时期
            <select value={stages[end]?.period || ""} onChange={e=>setRange(start,stages.findIndex(s=>s.period===e.target.value))} className={field}>{stages.map(s=><option key={s.period} value={s.period}>{s.era} · {s.period}</option>)}</select>
          </label>
        </div>}
        {chosen ? <p className="text-[11px] leading-5 text-[#77907d]">已选择 {periods.length} 个连续时期；从起始时期开始注入，之后的时间线也会记得这段经历。</p>
          : <p className="text-[11px] leading-5 text-amber-700">未关联时间线：这一条会在所有时期都注入。</p>}
      </>}
  </div>;
}

export function ChartaLoreEditor({ value, onChange, stages, characters, currentId }: {
  value: ChartaLoreProfile;
  onChange: (next: ChartaLoreProfile) => void;
  stages: readonly ChartaTimelineStage[];
  characters: ChartaCharacter[];
  currentId: string;
}) {
  // Relationship targets can come from ANY project world; ONLY the linked
  // timeline is constrained to the character's own world.
  const eligible = useMemo(() => characters
    .filter(c=>c.id!==currentId)
    .map(c=>({ id:c.id, name:c.names[c.primaryLanguage] || Object.values(c.names)[0] || c.id })),
    [characters,currentId]);
  const patch = (key: keyof ChartaLoreProfile, content: string) => onChange({ ...value, [key]: content });
  const newRelation = () => onChange({...value, relationships:[...value.relationships,{
    id:uid("relation"), targetName:"", content:"", periods:[]
  }]});
  const newExperience = () => onChange({...value, experiences:[...value.experiences,{
    id:uid("experience"),content:"",periods:[]
  }]});
  const updateRelation = (id: string, diff: Partial<ChartaRelationship>) =>
    onChange({...value, relationships:value.relationships.map(r=>r.id===id?{...r,...diff}:r)});
  const updateExperience = (id: string, diff: Partial<ChartaExperience>) =>
    onChange({...value, experiences:value.experiences.map(e=>e.id===id?{...e,...diff}:e)});
  const timelineError = validateChartaTimelineLinks(value, stages);
  return <section className="space-y-7" aria-label="角色五段式设定">
    <div className="space-y-2"><h3 className={head}><span><BookOpen size={15} className="mr-2 inline"/>03 · 简介 *</span></h3>
      <textarea value={value.intro} onChange={e=>patch("intro",e.target.value)} maxLength={20000} rows={6} placeholder="这是唯一必填的角色设定。她是谁？生活在怎样的世界？有什么值得一提的故事？" className={field}/>
    </div>
    <div className="space-y-2"><h3 className={head}><span><Feather size={15} className="mr-2 inline"/>04 · 主要性格与行为逻辑</span><span className="font-normal text-[#8aa18d]">选填</span></h3>
      <textarea value={value.personality} onChange={e=>patch("personality",e.target.value)} maxLength={20000} rows={7} placeholder="性格、动机、价值观、冲突、成长弧光……" className={field}/>
    </div>
    <div className="space-y-3">
      <div className={head}><span><Users size={15} className="mr-2 inline"/>05 · 人物关系</span><button type="button" onClick={newRelation} disabled={value.relationships.length>=100} className="inline-flex items-center gap-1 rounded-xl border border-[#b8cdbb] px-3 py-2 text-xs font-medium text-[#567960] disabled:opacity-40"><Plus size={14}/>创建新关系</button></div>
      <textarea value={value.relationshipNotes} onChange={e=>patch("relationshipNotes",e.target.value)} maxLength={20000} rows={4} placeholder="默认人物关系（选填）。未设置时间线，这些内容将始终注入。" className={field}/>
      {value.relationships.map((rel,i)=><div key={rel.id} className={panel}>
        <div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold text-[#53785f]">关系 #{i+1}</p><button type="button" aria-label={"删除关系 "+(i+1)} onClick={()=>onChange({...value,relationships:value.relationships.filter(r=>r.id!==rel.id)})} className="rounded-lg p-2 text-[#b17c77] hover:bg-rose-50"><Trash2 size={15}/></button></div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <label className="text-xs text-[#65806d]">关系对应角色名称 *
            <input value={rel.targetName} maxLength={100} onChange={e=>updateRelation(rel.id,{targetName:e.target.value,targetId:undefined})} placeholder="可自行填写角色名称" className={field}/>
          </label>
          <label className="text-xs text-[#65806d]">或选择项目中已有角色
            <select value={rel.targetId || ""} onChange={e=>{const target=eligible.find(item=>item.id===e.target.value);updateRelation(rel.id,{targetId:target?.id,targetName:target?.name||rel.targetName});}} className={field}>
              <option value="">手动填写</option>{eligible.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
        </div>
        <label className="block text-xs text-[#65806d]">这一段关系如何变化？
          <textarea value={rel.content} onChange={e=>updateRelation(rel.id,{content:e.target.value})} maxLength={12000} rows={5} placeholder="例如：从刚认识到渐渐信任；也可以原汁原味写梗（笑）" className={field}/>
        </label>
        <ChartaTimelineRangePicker periods={rel.periods} stages={stages} onChange={periods=>updateRelation(rel.id,{periods})}/>
      </div>)}
      {!value.relationships.length && <p className="text-[11px] text-[#91a392]">尚未创建独立人物关系。可以点击「创建新关系」，逐条绑定时期。</p>}
    </div>
    <div className="space-y-3">
      <div className={head}><span><BookOpen size={15} className="mr-2 inline"/>06 · 主要经历</span><button type="button" onClick={newExperience} disabled={value.experiences.length>=100} className="inline-flex items-center gap-1 rounded-xl border border-[#b8cdbb] px-3 py-2 text-xs font-medium text-[#567960] disabled:opacity-40"><Plus size={14}/>创建关联时间线</button></div>
      <textarea value={value.experienceNotes} onChange={e=>patch("experienceNotes",e.target.value)} maxLength={20000} rows={9} placeholder="默认的大段经历输入区（选填）。这些内容将在所有时期都注入；建议为有明确发生时间的情节创建关联时间线。" className={field}/>
      {value.experiences.map((exp,i)=><div key={exp.id} className={panel}>
        <div className="flex justify-between"><p className="text-xs font-semibold text-[#53785f]">关联经历 #{i+1}</p><button type="button" aria-label={"删除关联经历 "+(i+1)} onClick={()=>onChange({...value,experiences:value.experiences.filter(e=>e.id!==exp.id)})} className="p-2 text-[#b17c77] hover:bg-rose-50"><Trash2 size={15}/></button></div>
        <textarea value={exp.content} onChange={e=>updateExperience(exp.id,{content:e.target.value})} maxLength={12000} rows={7} placeholder="这一阶段发生了什么？写下完整剧情，不必为了省字删掉重要细节。" className={field}/>
        <ChartaTimelineRangePicker periods={exp.periods} stages={stages} onChange={periods=>updateExperience(exp.id,{periods})}/>
      </div>)}
    </div>
    <div className="space-y-2"><h3 className={head}><span><Sparkles size={15} className="mr-2 inline"/>07 · AI还原角色注意事项</span><span className="font-normal text-[#8aa18d]">选填</span></h3>
      <textarea value={value.guidance} onChange={e=>patch("guidance",e.target.value)} maxLength={20000} rows={6} placeholder="口癖、称呼演变、容易误读的性格、需要坚守的行为边界……" className={field}/>
    </div>
    {timelineError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{timelineError}</p>}
    <p className="text-[11px] leading-6 text-[#889d8d]">关联只允许选择角色所属世界观内的连续时期；未关联的内容默认注入。已发生过的关联经历，在更晚的时期依然可被角色回忆。</p>
  </section>;
}
