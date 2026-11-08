"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, LockKeyhole, UsersRound, X } from "lucide-react";
import { CHAR_DATA } from "../data/char_config";
import type { ChartaCharacter } from "../lib/charta";
import type { ChartaWorld } from "../lib/chartaWorld";
import { nameForCharta } from "../lib/charta";
import { BANG_DREAM_WORLD_ID, BANG_DREAM_WORLD_NAME, parseStoryWorldline } from "../lib/storyWorldline";
import { MAX_STORY_CAST, selectStoryCastIds, storyCastAllowed, storyCastOrigin } from "../lib/storyCast";
import type { Session } from "../types";
import { useLanguage } from "../context/LanguageContext";

type CastOption = { id: string; name: string; origin: string | null; color: string };

export function StoryCastPicker({ session, worlds, customCharacters, busy, onApply, mode = "story", tone = "sage" }: {
  session: Session;
  worlds: ChartaWorld[];
  customCharacters: ChartaCharacter[];
  busy: boolean;
  onApply: (ids: string[], allowCrossWorld: boolean) => void;
  mode?: "story" | "novel";
  tone?: "sage" | "paper";
}) {
  const { locale } = useLanguage();
  const [open, setOpen] = useState(false);
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [cross, setCross] = useState(false);
  const world = parseStoryWorldline(session.storyWorldline);
  const started = session.messages.some(message => message.role === "user");
  const registeredIds = useMemo(() => worlds.map(item => item.id), [worlds]);
  const catalog = useMemo<CastOption[]>(() => [
    ...CHAR_DATA.map(char => ({ id: char.id, name: char.name, color: char.hex, origin: BANG_DREAM_WORLD_ID })),
    ...customCharacters.map(char => ({ id: char.id, name: nameForCharta(char, locale), color: char.hex, origin: storyCastOrigin(char) })),
  ], [customCharacters, locale]);
  const currentIds = session.storyNextCastIds ?? (mode === "novel" ? session.novelDraft?.selectedCharIds : session.sceneCastIds) ?? [];
  const available = catalog.filter(char => world && storyCastAllowed({ id: char.id, worldId: char.origin }, world.worldId, cross, registeredIds));
  const allowedIds = new Set(available.map(char => char.id));
  const chosen = selectStoryCastIds(currentIds, new Set(catalog.map(char => char.id)));
  const names = chosen.map(id => catalog.find(char => char.id === id)?.name).filter(Boolean);
  useEffect(() => { setOpen(false); }, [session.id]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const begin = () => {
    if (!world || busy) return;
    setCross(session.storyAllowCrossWorld === true);
    setDraftIds([...chosen]);
    setOpen(true);
  };
  const toggle = (id: string) => {
    setDraftIds(current => current.includes(id) ? current.filter(item => item !== id)
      : current.length < MAX_STORY_CAST ? [...current, id] : current);
  };
  const apply = () => {
    const selected = selectStoryCastIds(draftIds, allowedIds);
    if (started && !window.confirm(mode === "novel" ? "小说已开始，确定覆盖 AI 预测的下一章登场角色吗？" : "故事已开始。确认手动覆盖 AI 对下一轮登场角色的预选吗？")) return;
    onApply(selected, cross);
    setOpen(false);
  };
  const worldTitle = (id: string | null) => !id ? "通用 · 未绑定" : id === BANG_DREAM_WORLD_ID
    ? BANG_DREAM_WORLD_NAME : worlds.find(item => item.id === id)?.name || "未知世界观";

  return <>
    <section className={`rounded-xl border p-3 ${tone === "paper" ? "border-[#d6c29b] bg-[#fffaf0]" : "border-[#dce6dc] bg-[#fbfcfa]"}`}>
      <button type="button" disabled={!world || busy} onClick={begin}
        className="flex w-full items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="选择下一轮登场角色">
        <span className={`flex min-w-0 items-center gap-2 text-xs font-semibold ${tone === "paper" ? "text-[#765b36]" : "text-[#486b56]"}`}>
          {world && !started ? <UsersRound size={15} /> : <LockKeyhole size={15} />}
          下一轮登场 · CAST
        </span>
        <span className="flex items-center gap-1 text-[11px] text-[#7a9582]">{chosen.length} / {MAX_STORY_CAST}<ChevronRight size={13}/></span>
      </button>
      <p className="mt-2 text-[11px] leading-5 text-[#849588]">
        {!world ? "请先配置世界线以解锁" : names.length ? names.join(" · ") : "尚未预选角色 · 建议选择，亦可直接开始故事"}
      </p>
      {world && started && mode === "story" && <p className="mt-1 text-[10px] text-[#a28c6f]">AI 会预测下一轮阵容；手动修改需要确认</p>}
      {world && mode === "novel" && <p className="mt-1 text-[10px] text-[#927b57]">{started ? "AI 会预测下一章登场角色；手动覆盖时需要确认。" : "第一章可以手动选角；之后由 AI 根据剧情预测下章阵容。"}</p>}
    </section>
    {typeof document !== "undefined" && createPortal(<AnimatePresence>
      {open && world && <motion.div className={`fixed inset-0 ${mode === "novel" ? "z-[800]" : "z-[200]"} flex items-center justify-center bg-[#152a20]/35 p-4`}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
          <motion.div initial={{ y: 10, scale: .98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 8, scale: .98 }}
            role="dialog" aria-modal="true" aria-label="下一轮登场角色"
            className="flex max-h-[85vh] w-full max-w-[430px] flex-col overflow-hidden rounded-2xl border border-[#dfe8dd] bg-[#fcfdfb] shadow-2xl">
            <header className="flex items-center justify-between border-b border-[#e7ede5] px-5 py-4">
              <div><p className="text-[10px] font-semibold tracking-[.16em] text-[#93a797]">{mode === "novel" ? "TELA · CAST" : "VIA LATA · CAST"}</p>
                <h2 className="mt-1 font-serif text-lg text-[#345340]">下一轮登场角色</h2></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="关闭" className="rounded-lg p-2 text-[#8ba090] hover:bg-[#edf3ed]"><X size={17}/></button>
            </header>
            <div className="border-b border-[#edf0eb] px-5 py-3">
              <label className="flex items-center justify-between gap-3 text-xs text-[#526e59]">
                <span>允许跨世界观 <span className="text-[10px] text-[#94a597]">（仅限已绑定世界观）</span></span>
                <input type="checkbox" checked={cross} onChange={event => { setCross(event.target.checked); }}
                  className="h-4 w-4 accent-[#5b8268]" />
              </label>
              <p className="mt-2 text-[10px] leading-5 text-[#91a394]">仅当前世界观与未绑定角色默认可选。跨世界角色会额外注入其原世界设定。</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {available.map(char => <label key={char.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-[#f1f6f0]">
                <input type="checkbox" checked={draftIds.includes(char.id)} disabled={!draftIds.includes(char.id) && draftIds.filter(id => allowedIds.has(id)).length >= MAX_STORY_CAST}
                  onChange={() => toggle(char.id)} className="h-4 w-4 shrink-0 accent-[#5b8268]" />
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: char.color }} />
                <span className="min-w-0 flex-1 truncate text-xs text-[#3e5b47]">{char.name}</span>
                <span className="max-w-[115px] truncate text-[10px] text-[#9aa99a]">{worldTitle(char.origin)}</span>
              </label>)}
              {!available.length && <p className="p-4 text-center text-xs text-[#9ba99e]">暂无可选角色，请先在 Charta 创建档案</p>}
            </div>
            <footer className="flex items-center justify-between border-t border-[#e7ede5] px-5 py-4">
              <span className="text-[11px] text-[#8da18f]">已选择 {draftIds.filter(id => allowedIds.has(id)).length} / {MAX_STORY_CAST}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-[#d7e3d7] px-4 py-2 text-xs text-[#6a806e]">取消</button>
                <button type="button" onClick={apply} className="inline-flex items-center gap-1.5 rounded-lg bg-[#4d7459] px-4 py-2 text-xs text-white hover:bg-[#3d6048]"><Check size={13}/>应用</button>
              </div>
            </footer>
          </motion.div>
        </motion.div>}
    </AnimatePresence>, document.body)}
  </>;
}
