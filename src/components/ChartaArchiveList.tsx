"use client";

import { BookUser, Check, Globe2, Plus, Star, UserRound, Sparkles } from "lucide-react";
import type { ChartaCharacter } from "../lib/charta";
import { nameForCharta } from "../lib/charta";
import { selfName, type ChartaSelf } from "../lib/chartaSelf";
import type { ChartaWorld } from "../lib/chartaWorld";
import { ChartaPortrait } from "./ChartaPortrait";

type CabinetKind = "characters" | "self" | "worlds";
export function ChartaArchiveList({ characters, selves, worlds, activeSelfId, selection,
  locale, onChoose, onCreate, onActivate }: {
  characters: ChartaCharacter[];
  selves: ChartaSelf[];
  worlds: ChartaWorld[];
  activeSelfId: string | null;
  selection: { kind: CabinetKind; id: string | null };
  locale: string;
  onChoose: (kind: CabinetKind, id: string) => void;
  onCreate: (kind: CabinetKind) => void;
  onActivate: (id: string) => void;
}) {
  const entries = [
    ...characters.map(character => ({ kind: "characters" as const, id: character.id, title: nameForCharta(character, locale), detail: "CHARACTER / 角色", tint: "#668879", character })),
    ...selves.map(self => ({ kind: "self" as const, id: self.id, title: selfName(self, locale), detail: "SELF / 自设", tint: self.hex, self })),
    ...worlds.map(world => ({ kind: "worlds" as const, id: world.id, title: world.name, detail: "WORLD / 世界观", tint: "#b0996f", world })),
  ];
  return <aside className="self-start rounded-[22px] border border-[#dce5db] bg-white/90 p-4 shadow-[0_14px_50px_rgba(50,75,55,.05)]">
    <header className="flex items-center justify-between gap-2 border-b border-[#ecf0e9] pb-4">
      <div className="flex items-center gap-2 text-[#506c5c]"><BookUser size={17}/><h2 className="text-xs font-bold tracking-[.18em]">档案柜</h2></div>
      <span className="rounded-full bg-[#eef3ed] px-2.5 py-1 text-[10px] font-semibold text-[#78917e]">{entries.length}</span>
    </header>
    <p className="mt-3 text-[11px] leading-5 text-[#8fa393]">角色、自设与世界观，悉数收藏于此。</p>
    <div className="mt-4 space-y-2">
      {([
        { kind:"characters" as const, icon: UserRound, label:"创建角色", cls:"bg-[#406956] text-white hover:bg-[#315843]" },
        { kind:"self" as const, icon: Star, label:"创建自设", cls:"bg-[#e5e9f6] text-[#5d648a] hover:bg-[#d8dff0]" },
        { kind:"worlds" as const, icon: Globe2, label:"创建世界观", cls:"bg-[#f3ead8] text-[#8d7448] hover:bg-[#eddfc5]" },
      ]).map(button => <button key={button.kind} type="button" onClick={()=>onCreate(button.kind)} className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-xs font-semibold transition ${button.cls}`}>
        <span className="flex items-center gap-2"><button.icon size={16}/>{button.label}</span><Plus size={15}/>
      </button>)}
    </div>
    <div className="mt-5 flex items-center justify-between text-[10px] font-semibold tracking-[.13em] text-[#7f9585]"><span>ARCHIVES · 档案</span><Sparkles size={12}/></div>
    <div className="mt-2 max-h-[60vh] space-y-1.5 overflow-y-auto pr-0.5">
      {entries.length === 0 && <p className="rounded-xl bg-[#f8faf6] px-3 py-8 text-center text-xs text-[#9fb0a1]">档案柜还是空的 ✧</p>}
      {entries.map(entry => {
        const selected = selection.kind === entry.kind && selection.id === entry.id;
        return <div key={`${entry.kind}:${entry.id}`} className={`group flex items-center gap-2 rounded-xl border p-2 transition ${selected ? "border-[#aec5af] bg-[#f0f5ee]" : "border-transparent hover:border-[#e1e9df] hover:bg-[#f7faf6]"}`}>
          <button type="button" onClick={()=>onChoose(entry.kind,entry.id)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left" aria-pressed={selected}>
            {entry.kind === "characters" && entry.character ? <ChartaPortrait character={entry.character} className="h-9 w-9 shrink-0 rounded-lg"/> :
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/80" style={{backgroundColor:`${entry.tint}1a`, color:entry.tint}}>{entry.kind==="self"?<Star size={18}/>:<Globe2 size={18}/>}</span>}
            <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-[#345143]">{entry.title}</span><span className="mt-0.5 block truncate text-[9px] font-medium tracking-[.08em]" style={{color:entry.tint}}>{entry.detail}</span></span>
          </button>
          {entry.kind==="self" && <button type="button" onClick={()=>onActivate(entry.id)}
            aria-label={activeSelfId === entry.id ? "正在使用这个自设" : `将${entry.title}设为当前自设`}
            title={activeSelfId===entry.id?"正在使用":"设为当前使用"}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition ${activeSelfId===entry.id?"bg-[#dceadb] text-[#456e52]":"text-[#b2bdb0] hover:bg-[#e5eee4] hover:text-[#587c64]"}`}>
            {activeSelfId===entry.id?<Check size={14}/>:<Star size={14}/>}</button>}
        </div>;
      })}
    </div>
  </aside>;
}
