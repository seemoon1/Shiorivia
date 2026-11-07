"use client";
import { useState } from "react";
import { Check, Plus, Save, Trash2 } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { type ChartaGender } from "../lib/charta";
import { newChartaSelf, parseChartaSelf, selfGenderLabel, selfName, SELF_LANGUAGES, type ChartaSelf } from "../lib/chartaSelf";

const genders: { value: ChartaGender; label: string }[] = [
  { value: "male", label: "男" }, { value: "female", label: "女" },
  { value: "undisclosed", label: "不愿透露" }, { value: "custom", label: "自定义" },
];

export function ChartaSelfPanel({ selves, activeId, loaded, error, saveSelf, removeSelf, selectSelf }: {
  selves: ChartaSelf[];
  activeId: string | null;
  loaded: boolean;
  error: string;
  saveSelf: (entry: ChartaSelf) => Promise<boolean>;
  removeSelf: (id: string) => Promise<boolean>;
  selectSelf: (id: string | null) => Promise<boolean>;
}) {
  const { locale } = useLanguage();
  const [draft, setDraft] = useState<ChartaSelf | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [newLanguage, setNewLanguage] = useState("en");
  const [otherLanguage, setOtherLanguage] = useState("");
  const update = (value: ChartaSelf) => { setDraft(value); setDirty(true); setMessage(""); };
  const choose = (value: ChartaSelf | null) => {
    if (dirty && !window.confirm("放弃未保存的修改吗？")) return;
    setDraft(value ? { ...value, names: { ...value.names } } : null);
    setDirty(false); setMessage("");
  };
  const save = async () => {
    if (!draft || busy) return;
    setBusy(true);
    try {
      const parsed = parseChartaSelf(draft);
      if (await saveSelf(parsed)) { setDraft(parsed); setDirty(false); setMessage("已保存自设资料"); }
    } catch (e) { setMessage(e instanceof Error ? e.message : "保存失败"); }
    finally { setBusy(false); }
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
  return <div className="mt-6 grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
    <aside className="rounded-2xl border border-[#dce4dc] bg-white/85 p-4 shadow-sm">
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
    </aside>
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
        <label className="block text-xs text-[#6e8472]">具体设定<textarea rows={8} maxLength={20000} value={draft.description} onChange={e => update({ ...draft, description:e.target.value })} placeholder="身份、性格、经历、习惯、与故事世界的关系……" className="mt-2 w-full resize-y rounded-xl border border-[#d7e0d6] p-3 text-sm leading-7"/></label>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0e9] pt-5"><button type="button" disabled={busy || !selves.some(s => s.id === draft.id)} onClick={remove} className="flex items-center gap-2 text-xs text-[#bd7777] disabled:opacity-30"><Trash2 size={14}/>删除</button><div className="flex gap-2"><button type="button" disabled={busy || dirty || !selves.some(s => s.id === draft.id)} onClick={async () => {setBusy(true); if(await selectSelf(draft.id)) setMessage("现在使用这个自设啦");setBusy(false);}} className="rounded-xl border border-[#9fbaa3] px-4 py-2 text-xs text-[#41694d] disabled:opacity-40">{activeId===draft.id ? "正在使用 ✓" : "设为当前使用"}</button><button type="button" disabled={busy} onClick={save} className="flex items-center gap-2 rounded-xl bg-[#456b57] px-4 py-2 text-xs text-white disabled:opacity-40"><Save size={14}/>保存自设</button></div></div>
      </div>}
      {(message || error) && <p role="status" className="mt-4 text-xs text-[#9a6e54]">{message || error}</p>}
    </section>
  </div>;
}
