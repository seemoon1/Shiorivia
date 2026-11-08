"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Download, Plus, Save, Trash2 } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { type ChartaGender } from "../lib/charta";
import { newChartaSelf, parseChartaSelf, selfGenderLabel, selfName, SELF_LANGUAGES, type ChartaSelf } from "../lib/chartaSelf";
import { encodeChartaSelfExport, saveChartaJsonFile } from "../lib/chartaJson";
import { type ChartaCharacter } from "../lib/charta";
import { type ChartaWorld } from "../lib/chartaWorld";
import { ChartaLoreEditor } from "./ChartaLoreEditor";
import { emptyChartaLore, validateChartaTimelineLinks, validateChartaRelationshipTargets } from "../lib/chartaLore";
import { BANG_DREAM_CANON, BANG_DREAM_WORLD_ID, BANG_DREAM_WORLD_NAME } from "../lib/storyWorldline";

const genders: { value: ChartaGender; label: string }[] = [
  { value: "male", label: "男" }, { value: "female", label: "女" },
  { value: "undisclosed", label: "不愿透露" }, { value: "custom", label: "自定义" },
];

export function ChartaSelfPanel({ selves, activeId, loaded, error, saveSelf, removeSelf, selectSelf, embedded = false, selectedId = null, requestVersion = 0, onDirtyChange, onSaved, characters = [], worlds = [] }: {
  selves: ChartaSelf[];
  activeId: string | null;
  loaded: boolean;
  error: string;
  saveSelf: (entry: ChartaSelf) => Promise<boolean>;
  removeSelf: (id: string) => Promise<boolean>;
  selectSelf: (id: string | null) => Promise<boolean>;
  embedded?: boolean; selectedId?: string | null; requestVersion?: number;
  onDirtyChange?: (dirty: boolean) => void;
  onSaved?: (id: string) => void;
  characters?: ChartaCharacter[];
  worlds?: ChartaWorld[];
}) {
  const { locale } = useLanguage();
  const [draft, setDraft] = useState<ChartaSelf | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [newLanguage, setNewLanguage] = useState("en");
  const [otherLanguage, setOtherLanguage] = useState("");
  const lastExternalRequest = useRef(0);
  useEffect(() => {
    if (!embedded || requestVersion === lastExternalRequest.current) return;
    lastExternalRequest.current = requestVersion;
    const entry = selectedId ? selves.find(self => self.id === selectedId) : null;
    setDraft(entry ? { ...entry, names: { ...entry.names } } : selectedId ? null : newChartaSelf(locale));
    setDirty(false); setMessage("");
  }, [embedded, requestVersion, selectedId, selves, locale]);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  const update = (value: ChartaSelf) => { setDraft(value); setDirty(true); setMessage(""); };
  const profileFor = (self: ChartaSelf) => self.profile || {...emptyChartaLore(),intro:self.description || ""};
  const timelineFor = (id?: string) => id === BANG_DREAM_WORLD_ID
    ? BANG_DREAM_CANON : worlds.find(w=>w.id===id)?.canonTimeline || [];
  const choose = (value: ChartaSelf | null) => {
    if (dirty && !window.confirm("放弃未保存的修改吗？")) return;
    setDraft(value ? { ...value, names: { ...value.names } } : null);
    setDirty(false); setMessage("");
  };
  const save = async () => {
    if (!draft || busy) return;
    if (draft.worldId && draft.worldId !== BANG_DREAM_WORLD_ID && !worlds.some(world => world.id === draft.worldId)) {
      setMessage("所属世界观不存在，请先创建世界观"); return;
    }
    const warning = validateChartaTimelineLinks(profileFor(draft), timelineFor(draft.worldId))
      || validateChartaRelationshipTargets(profileFor(draft), draft.worldId, [...characters, ...selves]);
    if (warning) { setMessage(warning); return; }
    setBusy(true);
    try {
      const parsed = parseChartaSelf(draft);
      if (await saveSelf(parsed)) { setDraft(parsed); setDirty(false); setMessage("已保存自设资料"); onSaved?.(parsed.id); }
    } catch (e) { setMessage(e instanceof Error ? e.message : "保存失败"); }
    finally { setBusy(false); }
  };
  const exportSelf = () => {
    if (!draft) return;
    try {
      const parsed = parseChartaSelf(draft);
      saveChartaJsonFile(`charta-self-${parsed.id}.json`, encodeChartaSelfExport(parsed));
      setMessage("自设 JSON 已导出");
    } catch (e) { setMessage(e instanceof Error ? e.message : "自设导出失败"); }
  };
  const remove = async () => {
    if (!draft || busy || !selves.some(s => s.id === draft.id)) return;
    if (!window.confirm("确定删除这个自设吗？已有故事会保留其身份快照，但无法再选择已删除的自设。")) return;
    setBusy(true);
    try { if (await removeSelf(draft.id)) { setDraft(null); setDirty(false); setMessage("已删除自设"); } }
    finally { setBusy(false); }
  };
  const addLanguage = () => {
    if (!draft) return;
    const language = (newLanguage === "other" ? otherLanguage : newLanguage).trim();
    if (!/^[a-z]{2,3}(?:-[a-zA-Z0-9]{2,8}){0,3}$/.test(language) || language in draft.names || Object.keys(draft.names).length >= 12) {
      setMessage("语言代码不正确、已存在，或已达到 12 种语言上限"); return;
    }
    update({ ...draft, names: { ...draft.names, [language]: "" } }); setOtherLanguage("");
  };
  return <div className={embedded ? "min-w-0 w-full" : "mt-6 grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]"}>
    {!embedded && <aside className="rounded-2xl border border-[#dce4dc] bg-white/85 p-4 shadow-sm">
      <div className="flex items-center justify-between text-xs font-semibold tracking-widest text-[#697e70]"><span>SELF · 自设</span><span>{selves.length}</span></div>
      <p className="mt-2 text-xs leading-6 text-[#819588]">不是故事的必然主角，而是你愿意以什么身份参与星路。</p>
      <button disabled={!loaded || busy} type="button" onClick={() => choose(newChartaSelf(locale))} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#456b57] px-3 py-3 text-sm font-medium text-white disabled:opacity-40"><Plus size={16}/>创建自设</button>
      <div className="mt-4 space-y-2">
        {selves.map(self => <button type="button" key={self.id} onClick={() => choose(self)} className={`flex w-full items-center gap-2 rounded-xl border p-3 text-left ${draft?.id === self.id ? "border-[#9bbb9d] bg-[#f1f6ef]" : "border-transparent hover:bg-[#f8faf7]"}`}>
          <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: self.hex }}/>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm">{selfName(self, locale)}</span><span className="block text-[10px] text-[#91a398]">{selfGenderLabel(self.gender, self.genderCustom)}</span></span>
          {activeId === self.id && <Check size={15} className="text-[#567e63]"/>}
        </button>)}
        {!selves.length && <p className="py-5 text-center text-xs text-[#9aab9e]">还没有自设 · 每个人都可以是 Star</p>}
      </div>
      {activeId && <button type="button" disabled={busy} onClick={async () => { setBusy(true); await selectSelf(null); setBusy(false); }} className="mt-4 w-full text-xs text-[#8a9b90] underline">取消当前使用的自设</button>}
    </aside>}
    <section className="rounded-2xl border border-[#dce4dc] bg-white/90 p-5 shadow-sm sm:p-8">
      {!draft ? <div className="flex min-h-[440px] flex-col items-center justify-center gap-3 text-[#91a595]"><span className="font-serif text-5xl">✧</span><p className="text-sm">选择或创建一位故事参与者</p></div> : <div className="space-y-6">
        <div className="border-b border-[#edf0e9] pb-5"><span className="text-[10px] font-semibold tracking-widest text-[#799682]">CHARTA · SELF PROFILE</span><h2 className="mt-1 font-serif text-2xl">{draft.names[draft.primaryLanguage] || "未命名的星"}</h2></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs text-[#6e8472]">名称 *<input maxLength={100} value={draft.names[draft.primaryLanguage] || ""} onChange={e => update({ ...draft, names: { ...draft.names, [draft.primaryLanguage]: e.target.value } })} className="mt-2 w-full rounded-xl border border-[#d7e0d6] bg-[#fbfcf9] px-3 py-3 text-sm"/></label>
          <label className="text-xs text-[#6e8472]">名称语言 *<select value={draft.primaryLanguage} onChange={e => update({ ...draft, primaryLanguage: e.target.value, names: { ...draft.names, [e.target.value]: draft.names[e.target.value] || "" } })} className="mt-2 w-full rounded-xl border border-[#d7e0d6] bg-[#fbfcf9] px-3 py-3 text-sm">{[...new Set([draft.primaryLanguage, ...SELF_LANGUAGES.filter(x => x.code !== "other").map(x => x.code), ...Object.keys(draft.names)])].map(lang => <option key={lang} value={lang}>{SELF_LANGUAGES.find(x => x.code === lang)?.label || lang}</option>)}</select></label>
        </div>
        {Object.entries(draft.names).filter(([lang]) => lang !== draft.primaryLanguage).map(([lang, name]) => <div key={lang} className="flex items-center gap-2"><span className="w-16 text-xs text-[#809587]">{lang}</span><input value={name} maxLength={100} onChange={e => update({ ...draft, names: { ...draft.names, [lang]: e.target.value } })} className="min-w-0 flex-1 rounded-xl border border-[#d7e0d6] px-3 py-2 text-sm"/><button type="button" onClick={() => {const names = { ...draft.names };delete names[lang];update({...draft,names});}} className="p-2 text-[#839587]">删除</button></div>)}
        <div className="flex flex-wrap items-end gap-2"><label className="text-xs text-[#6e8472]">其他语言<select value={newLanguage} onChange={e => setNewLanguage(e.target.value)} className="mt-2 block rounded-xl border border-[#d7e0d6] px-3 py-2 text-sm">{SELF_LANGUAGES.map(x => <option key={x.code} value={x.code}>{x.label}</option>)}</select></label>{newLanguage === "other" && <input aria-label="语言代码" placeholder="fr / de / es" value={otherLanguage} onChange={e => setOtherLanguage(e.target.value)} className="rounded-xl border border-[#d7e0d6] px-3 py-2 text-sm"/>}<button type="button" onClick={addLanguage} className="rounded-xl border border-[#b6cdbb] px-3 py-2 text-xs text-[#557765]"><Plus size={14} className="inline"/> 增加译名</button></div>
        <fieldset className="space-y-2"><legend className="text-xs text-[#6e8472]">性别设定</legend><div className="flex flex-wrap gap-2">{genders.map(item => <button key={item.value} type="button" aria-pressed={draft.gender===item.value} onClick={() => update({ ...draft, gender:item.value })} className={`rounded-xl border px-3 py-2 text-xs ${draft.gender===item.value ? "border-[#60856a] bg-[#edf5ec] text-[#345443]" : "border-[#d8e4d8] text-[#819588]"}`}>{item.label}</button>)}</div>{draft.gender === "custom" && <input maxLength={100} value={draft.genderCustom || ""} onChange={e => update({ ...draft, genderCustom:e.target.value })} placeholder="写下你自己的性别设定" className="w-full rounded-xl border border-[#d7e0d6] px-3 py-2 text-sm"/>}</fieldset>
        <div className="flex flex-wrap items-center gap-3"><label className="text-xs text-[#6e8472]">主题色 <input type="color" value={draft.hex} onChange={e => update({ ...draft, hex:e.target.value })} className="ml-2 h-9 w-12 cursor-pointer align-middle"/></label><input aria-label="主题色 HEX" maxLength={7} value={draft.hex} onChange={e => update({ ...draft, hex:e.target.value })} className="w-28 rounded-xl border border-[#d7e0d6] p-2 font-mono text-xs"/></div>
        <section className="space-y-5 rounded-2xl border border-[#e0e9df] bg-[#fcfdfa] p-4">
          <h3 className="text-xs font-semibold text-[#52715e]">自设身份 · 扩展资料（均选填）</h3>
          <label className="block text-xs text-[#6e8472]">所属世界观
            <select value={draft.worldId || ""} onChange={e=>update({...draft,worldId:e.target.value || undefined})} className="mt-2 w-full rounded-xl border border-[#d7e0d6] bg-white px-3 py-3 text-sm">
              <option value="">未绑定 · 通用自设</option>
              <option value={BANG_DREAM_WORLD_ID}>{BANG_DREAM_WORLD_NAME}（内置）</option>
              {worlds.map(world=><option key={world.id} value={world.id}>{world.name}</option>)}
              {draft.worldId && draft.worldId!==BANG_DREAM_WORLD_ID&&!worlds.some(world=>world.id===draft.worldId)&&<option value={draft.worldId}>原世界观已删除，请重新选择</option>}
            </select>
          </label>
          <p className="text-[11px] leading-5 text-[#8aa08d]">建议先在 Charta 创建世界观与时间线，再绑定自设，以便关系和经历随时期变化。</p>
          <div className="space-y-2"><div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#64836b]">外号／别号<button type="button" disabled={(draft.aliases||[]).length>=50} onClick={()=>update({...draft,aliases:[...(draft.aliases||[]),""]})} className="flex items-center gap-1 rounded-lg border border-[#c8d9ca] p-2 disabled:opacity-40"><Plus size={13}/>添加别号</button></div>
            {(draft.aliases||[]).map((alias,i)=><div key={i} className="flex gap-2"><input value={alias} maxLength={100} onChange={e=>update({...draft,aliases:(draft.aliases||[]).map((x,j)=>i===j?e.target.value:x)})} placeholder="例如：小月、月月" className="min-w-0 flex-1 rounded-lg border border-[#d7e0d6] px-3 py-2 text-sm"/><button type="button" aria-label="移除别号" onClick={()=>update({...draft,aliases:(draft.aliases||[]).filter((_,j)=>i!==j)})} className="px-2 text-[#a17979]">删除</button></div>)}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">{([{key:"hairColor",label:"发色"},{key:"eyeColor",label:"瞳色"},{key:"height",label:"身高"},{key:"birthday",label:"生日"},{key:"zodiac",label:"星座"}] as const).map(({key,label})=>
            <label key={key} className="text-xs text-[#6e8472]">{label}<input maxLength={100} value={draft[key]||""} onChange={e=>update({...draft,[key]:e.target.value})} placeholder={label} className="mt-2 w-full rounded-xl border border-[#d7e0d6] bg-white px-3 py-2 text-sm"/></label>)}</div>
          <div className="space-y-2"><div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#64836b]">萌点（笑）<button type="button" disabled={(draft.moeTags||[]).length>=50} onClick={()=>update({...draft,moeTags:[...(draft.moeTags||[]),""]})} className="flex items-center gap-1 rounded-lg border border-[#c8d9ca] p-2 disabled:opacity-40"><Plus size={13}/>添加萌点</button></div>
            {(draft.moeTags||[]).map((tag,i)=><div key={i} className="flex gap-2"><input value={tag} maxLength={100} onChange={e=>update({...draft,moeTags:(draft.moeTags||[]).map((x,j)=>i===j?e.target.value:x)})} placeholder="猫系、认真、中二病……" className="min-w-0 flex-1 rounded-lg border border-[#d7e0d6] px-3 py-2 text-sm"/><button type="button" aria-label="移除萌点" onClick={()=>update({...draft,moeTags:(draft.moeTags||[]).filter((_,j)=>i!==j)})} className="px-2 text-[#a17979]">删除</button></div>)}
          </div>
        </section>
        <ChartaLoreEditor value={profileFor(draft)}
          onChange={profile=>update({...draft,profile})}
          stages={timelineFor(draft.worldId)}
          worldId={draft.worldId} currentId={draft.id} selfId={draft.id}
          selves={selves} characters={characters}/>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0e9] pt-5"><button type="button" disabled={busy || !selves.some(s => s.id === draft.id)} onClick={remove} className="flex items-center gap-2 text-xs text-[#bd7777] disabled:opacity-30"><Trash2 size={14}/>删除</button><div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={exportSelf} className="inline-flex items-center gap-2 rounded-xl border border-[#cbdacc] px-4 py-2 text-xs text-[#456b57]"><Download size={14}/>导出 JSON</button><button type="button" disabled={busy || dirty || !selves.some(s => s.id === draft.id)} onClick={async () => {setBusy(true); if(await selectSelf(draft.id)) setMessage("现在使用这个自设啦");setBusy(false);}} className="rounded-xl border border-[#9fbaa3] px-4 py-2 text-xs text-[#41694d] disabled:opacity-40">{activeId===draft.id ? "正在使用 ✓" : "设为当前使用"}</button><button type="button" disabled={busy} onClick={save} className="flex items-center gap-2 rounded-xl bg-[#456b57] px-4 py-2 text-xs text-white disabled:opacity-40"><Save size={14}/>保存自设</button></div></div>
      </div>}
      {(message || error) && <p role="status" className="mt-4 text-xs text-[#9a6e54]">{message || error}</p>}
    </section>
  </div>;
}
