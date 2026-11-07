"use client";
import { useState } from "react";
import { Plus, Save, Trash2, Globe2, X } from "lucide-react";
import { newChartaWorld, parseChartaWorld, type ChartaWorld } from "../lib/chartaWorld";
import type { useChartaWorlds } from "../hooks/useChartaWorlds";

export function ChartaWorldPanel({ worlds, loaded, error, saveWorld, removeWorld }: ReturnType<typeof useChartaWorlds>) {
  const [draft, setDraft] = useState<ChartaWorld | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const edit = (world: ChartaWorld | null) => {
    if (dirty && !window.confirm("放弃未保存的世界观修改吗？")) return;
    setDraft(world ? { ...world, canonTimeline: world.canonTimeline.map(stage => ({ ...stage })) } : null);
    setDirty(false); setMessage("");
  };
  const update = (next: ChartaWorld) => { setDraft(next); setDirty(true); setMessage(""); };
  const save = async () => {
    if (!draft || busy) return;
    setBusy(true);
    try {
      const world = parseChartaWorld(draft);
      if (await saveWorld(world)) { setDraft(world); setDirty(false); setMessage("世界观已保存"); }
      else setMessage("保存失败，请检查字段和本地服务");
    } catch (e) { setMessage(e instanceof Error ? e.message : "保存失败"); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!draft || busy || !worlds.some(world => world.id === draft.id)) return;
    if (!window.confirm("确定删除此世界观？已有故事的世界线快照将保留。")) return;
    setBusy(true);
    try { if (await removeWorld(draft.id)) { setDraft(null); setDirty(false); setMessage("已删除世界观"); } }
    finally { setBusy(false); }
  };
  return <div className="mt-6 grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
    <aside className="rounded-2xl border border-[#dce4dc] bg-white/85 p-4 shadow-sm">
      <div className="flex items-center justify-between text-xs font-semibold tracking-widest text-[#697e70]"><span>WORLD · 世界观</span><span>{worlds.length}</span></div>
      <p className="mt-2 text-xs leading-6 text-[#819588]">每条星路，都可以通往不同的世界。</p>
      <button type="button" disabled={!loaded || busy} onClick={() => edit(newChartaWorld())} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#456b57] px-3 py-3 text-sm font-medium text-white disabled:opacity-40"><Plus size={16}/>创建世界观</button>
      <div className="mt-4 space-y-2">
        {worlds.map(world => <button key={world.id} type="button" onClick={() => edit(world)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${draft?.id === world.id ? "border-[#9bbb9d] bg-[#f1f6ef]" : "border-transparent hover:bg-[#f8faf7]"}`}>
          <Globe2 size={16} className="shrink-0 text-[#6c9076]"/><span className="min-w-0 flex-1"><span className="block truncate text-sm">{world.name}</span><span className="block text-[10px] text-[#91a398]">{world.canonTimeline.length} 个原作时期</span></span>
        </button>)}
      </div>
      {!worlds.length && <p className="py-5 text-center text-xs text-[#9aab9e]">还没有自定义世界观</p>}
      <p className="mt-4 text-[11px] leading-5 text-[#92a395]">内置 BanG Dream! 世界观无需创建，已在故事世界线中提供。</p>
    </aside>
    <section className="rounded-2xl border border-[#dce4dc] bg-white/90 p-5 shadow-sm sm:p-8">
      {!draft ? <div className="flex min-h-[440px] flex-col items-center justify-center gap-3 text-[#91a595]"><Globe2 size={42} strokeWidth={1}/><p className="text-sm">选择或创建一个世界观</p></div> : <div className="space-y-6">
        <header className="border-b border-[#edf0e9] pb-5"><span className="text-[10px] font-semibold tracking-widest text-[#799682]">CHARTA · WORLD PROFILE</span><h2 className="mt-1 font-serif text-2xl">{draft.name || "未命名的世界"}</h2></header>
        <label className="block text-xs text-[#6e8472]">世界观名称 *<input maxLength={100} value={draft.name} onChange={e => update({ ...draft, name: e.target.value })} placeholder="例如：某部作品、原创世界……" className="mt-2 w-full rounded-xl border border-[#d7e0d6] bg-[#fbfcf9] px-3 py-3 text-sm"/></label>
        <section className="space-y-3 rounded-xl border border-[#dce6dc] bg-[#fcfdfa] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-xs font-bold text-[#53745e]">原作时间线 · ERA / PERIOD</h3><button type="button" disabled={draft.canonTimeline.length >= 80} onClick={() => update({ ...draft, canonTimeline: [...draft.canonTimeline, { era: "", period: "" }] })} className="flex items-center gap-1 rounded-lg border border-[#b6cdbb] px-3 py-1.5 text-xs text-[#557765] disabled:opacity-40"><Plus size={12}/>添加时期</button></div>
          <p className="text-[11px] leading-6 text-[#849b8a]">每行建立一个 ERA 与 PERIOD 的对应关系。相同 ERA 可以对应多个 PERIOD；PERIOD 不可重复。故事中选择任一项时，另一项自动筛选。此项可留空，只使用 AU 时间线。</p>
          {draft.canonTimeline.map((stage, i) => <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
            <input aria-label={`ERA ${i+1}`} maxLength={100} placeholder="ERA：高一春夏季" value={stage.era} onChange={e=>update({...draft,canonTimeline:draft.canonTimeline.map((s,j)=>j===i?{...s,era:e.target.value}:s)})} className="min-w-0 rounded-lg border border-[#d7e0d6] px-3 py-2 text-xs"/>
            <input aria-label={`PERIOD ${i+1}`} maxLength={100} placeholder="PERIOD：T-5-6" value={stage.period} onChange={e=>update({...draft,canonTimeline:draft.canonTimeline.map((s,j)=>j===i?{...s,period:e.target.value}:s)})} className="min-w-0 rounded-lg border border-[#d7e0d6] px-3 py-2 text-xs"/>
            <button type="button" aria-label={`移除时期 ${i+1}`} onClick={()=>update({...draft,canonTimeline:draft.canonTimeline.filter((_,j)=>j!==i)})} className="rounded-lg p-2 text-[#a98585] hover:bg-rose-50"><X size={14}/></button>
          </div>)}
        </section>
        <label className="block text-xs text-[#6e8472]">世界观具体设定（可选）<textarea rows={9} maxLength={20000} value={draft.description} onChange={e=>update({...draft,description:e.target.value})} placeholder="时代、人物关系、历史事件、世界规则……" className="mt-2 w-full resize-y rounded-xl border border-[#d7e0d6] p-3 text-sm leading-7"/></label>
        <p className="text-[11px] leading-6 text-[#809687]">较老、热门的作品世界观，模型可能已有较多知识，可简略填写；较新、冷门或原创世界观建议提供详细设定。模型对作品的熟悉程度并无保证。</p>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0e9] pt-5"><button type="button" disabled={busy || !worlds.some(world => world.id === draft.id)} onClick={remove} className="flex items-center gap-2 text-xs text-[#bd7777] disabled:opacity-30"><Trash2 size={14}/>删除世界观</button><button type="button" disabled={busy} onClick={save} className="flex items-center gap-2 rounded-xl bg-[#456b57] px-4 py-2 text-xs text-white disabled:opacity-40"><Save size={14}/>保存世界观</button></div>
      </div>}
      {(message || error) && <p role="status" className="mt-4 text-xs text-[#9a6e54]">{message || error}</p>}
    </section>
  </div>;
}
