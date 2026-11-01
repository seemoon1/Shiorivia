"use client";

import { useEffect, useRef, useState } from "react";
import { Archive, Brain, Check, LockKeyhole, Plus, Save, Trash2, X } from "lucide-react";
import { formatLocalMemoryEntries, latestLocalMemoryEntry, LOCAL_STM_SLOTS, parseLocalMemoryEntries } from "../lib/localMemory";
import { useLanguage } from "../context/LanguageContext";
import { localText } from "../lib/i18nLocal";

export type MemoryTone = "engineering" | "story" | "novel" | "novel-sage" | "novel-paper";

type MemoryDraft = { stm: string; ltm: string };

type MemoryVaultProps = {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  stm?: string;
  ltm?: string;
  onSave: (next: MemoryDraft) => void;
  tone?: MemoryTone;
};

const tones = {
  engineering: { accent: "text-[#3e6b8e]", border: "border-[#d2e1ec]", tag: "bg-[#edf4fa]", button: "bg-[#557d9d] hover:bg-[#406887]" },
  story: { accent: "text-[#527b63]", border: "border-[#d3e6d7]", tag: "bg-[#eff7ef]", button: "bg-[#648e71] hover:bg-[#527b61]" },
  novel: { accent: "text-[#806c47]", border: "border-[#e7dcc3]", tag: "bg-[#f8f3e7]", button: "bg-[#967e54] hover:bg-[#806c47]" },
};

export function MemoryPreviewButton({ stm, ltm, onOpen, tone = "story" }: {
  stm?: string;
  ltm?: string;
  onOpen: () => void;
  tone?: MemoryTone;
}) {
  const { locale } = useLanguage();
  const style = tones[tone === "novel-sage" ? "story" : tone === "novel-paper" ? "novel" : tone];
  const stmCount = parseLocalMemoryEntries(stm).length;
  const ltmCount = parseLocalMemoryEntries(ltm).length;
  const latestStm = latestLocalMemoryEntry(stm);
  const latestLtm = latestLocalMemoryEntry(ltm);

  return (
    <button type="button" onClick={onOpen} className={`w-full rounded-xl border ${style.border} bg-white/85 p-3 text-left shadow-sm transition hover:bg-white`} aria-label={localText(locale, "memory.open")}>
      <div className={`mb-3 flex items-center justify-between gap-2 text-xs font-bold ${style.accent}`}>
        <span className="flex items-center gap-2"><Brain size={15} /> Memory Vault / 记忆档案</span>
        <span className={`rounded-md px-2 py-1 text-[10px] ${style.tag}`}>OPEN</span>
      </div>
      <div className="space-y-2 text-[11px] leading-5 text-slate-600">
        <div className="rounded-lg bg-slate-50 p-2"><span className="font-semibold text-slate-400">STM · {stmCount}</span><p className="mt-0.5 line-clamp-2 break-words">{latestStm || localText(locale, "memory.emptyStm")}</p></div>
        <div className="rounded-lg bg-slate-50 p-2"><span className="font-semibold text-slate-400">LTM · {ltmCount}</span><p className="mt-0.5 line-clamp-2 break-words">{latestLtm || localText(locale, "memory.emptyLtm")}</p></div>
      </div>
    </button>
  );
}

export function MemoryVaultModal({ open, onClose, sessionId, stm = "", ltm = "", onSave, tone = "engineering" }: MemoryVaultProps) {
  const { locale } = useLanguage();
  const style = tones[tone === "novel-sage" ? "story" : tone === "novel-paper" ? "novel" : tone];
  const [stmSlots, setStmSlots] = useState<string[]>([]);
  const [ltmSlots, setLtmSlots] = useState<string[]>([]);
  const [error, setError] = useState("");
  const original = useRef<MemoryDraft>({ stm: "", ltm: "" });

  useEffect(() => {
    if (!open) return;
    original.current = { stm, ltm };
    setStmSlots(parseLocalMemoryEntries(stm));
    setLtmSlots(parseLocalMemoryEntries(ltm));
    setError("");
    // Take a snapshot on opening or switching the session; don't discard an in-progress
    // edit if the chat engine updates memory while this window is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sessionId]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const visibleStmCount = Math.max(LOCAL_STM_SLOTS, stmSlots.length);
  const filledStm = stmSlots.filter((entry) => entry.trim()).length;

  const save = () => {
    if (stm !== original.current.stm || ltm !== original.current.ltm) {
      setError(localText(locale, "memory.changed"));
      return;
    }
    if (!window.confirm(localText(locale, "memory.confirm"))) return;
    onSave({ stm: formatLocalMemoryEntries(stmSlots), ltm: formatLocalMemoryEntries(ltmSlots) });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/50 p-2 backdrop-blur-sm sm:p-5" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Memory Vault 记忆档案" className={`flex max-h-[calc(100dvh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border ${style.border} ${tone === "novel-paper" ? "bg-[#fdf6e3]" : tone === "novel-sage" ? "bg-[#edf2ea]" : "bg-[#fbfcfb]"} text-slate-700 shadow-2xl sm:max-h-[calc(100dvh-3rem)]`}>
        <header className={`flex shrink-0 items-start justify-between gap-3 border-b ${style.border} ${tone === "novel-paper" ? "bg-[#f8efd9]" : tone === "novel-sage" ? "bg-[#e4eee3]" : "bg-white"} px-4 py-4 sm:px-6`}>
          <div>
            <p className={`mb-1 text-[10px] font-bold uppercase tracking-[0.2em] ${style.accent}`}>Shiorivia · Local Memory</p>
            <h2 className="flex items-center gap-2 text-lg font-bold sm:text-xl"><Brain size={21} className={style.accent} /> Memory Vault / 记忆档案</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">{localText(locale, "memory.description")}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={localText(locale, "memory.close")} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={19} /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <div className={`rounded-xl border ${style.border} ${style.tag} p-3`}>
              <div className={`mb-1 flex items-center gap-1.5 text-xs font-bold ${style.accent}`}><Brain size={14} /> Latest STM</div>
              <p className="line-clamp-3 min-h-10 break-words text-xs leading-6 text-slate-600">{latestLocalMemoryEntry(stm) || localText(locale, "memory.emptyStm")}</p>
            </div>
            <div className={`rounded-xl border ${style.border} ${style.tag} p-3`}>
              <div className={`mb-1 flex items-center gap-1.5 text-xs font-bold ${style.accent}`}><Archive size={14} /> Latest LTM</div>
              <p className="line-clamp-3 min-h-10 break-words text-xs leading-6 text-slate-600">{latestLocalMemoryEntry(ltm) || localText(locale, "memory.emptyLtm")}</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <section>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className={`flex items-center gap-2 text-sm font-bold ${style.accent}`}><Brain size={16} /> STM · {localText(locale, "memory.stm")}</h3>
                <span className={`rounded-md px-2 py-1 text-[10px] ${style.tag}`}>{filledStm} 条 · 基础 {LOCAL_STM_SLOTS} 格</span>
              </div>
              {visibleStmCount > LOCAL_STM_SLOTS && <p className="mb-3 text-xs leading-5 text-amber-700">检测到旧存档或自动摘要产生的额外短期记忆；已保留全部 {visibleStmCount} 格，不会截断。</p>}
              <div className="space-y-3">
                {Array.from({ length: visibleStmCount }, (_, index) => (
                  <div key={index} className="rounded-xl border border-slate-200 bg-white p-3">
                    <label htmlFor={`shiorivia-stm-${index}`} className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono">STM {index + 1}</span>
                      {index >= LOCAL_STM_SLOTS && <span className="text-amber-700">旧记录保留</span>}
                    </label>
                    <textarea id={`shiorivia-stm-${index}`} rows={3} value={stmSlots[index] || ""}
                      onChange={(e) => setStmSlots((prev) => Array.from({ length: Math.max(index + 1, prev.length) }, (_, i) => i === index ? e.target.value : prev[i] || ""))}
                      placeholder="当前剧情、人物关系、近期任务……"
                      className={`w-full resize-y rounded-lg border border-slate-100 bg-white/70 p-2 text-xs leading-6 outline-none ${tone === "novel-paper" ? "focus:border-[#967e54]" : "focus:border-[#7ba18e]"}`} />
                  </div>
                ))}
              </div>
            </section>
            <section>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className={`flex items-center gap-2 text-sm font-bold ${style.accent}`}><Archive size={16} /> LTM · {localText(locale, "memory.ltm")}</h3>
                <button type="button" onClick={() => setLtmSlots((prev) => [...prev, ""])} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white ${style.button}`}><Plus size={14} /> {localText(locale, "memory.add")}</button>
              </div>
              <div className="space-y-3">
                {ltmSlots.length === 0 && <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-xs text-slate-400">{localText(locale, "memory.emptyList")}</div>}
                {ltmSlots.map((entry, index) => (
                  <div key={index} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <label htmlFor={`shiorivia-ltm-${index}`} className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-500">LTM {index + 1}</label>
                      <button type="button" aria-label={`删除长期记忆 ${index + 1}`} onClick={() => { if (window.confirm(`删除第 ${index + 1} 条长期记忆？保存后生效。`)) setLtmSlots((prev) => prev.filter((_, i) => i !== index)); }} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 size={15} /></button>
                    </div>
                    <textarea id={`shiorivia-ltm-${index}`} rows={3} value={entry}
                      onChange={(e) => setLtmSlots((prev) => prev.map((item, i) => i === index ? e.target.value : item))}
                      placeholder="长期设定、人物关系、重要事件……"
                      className={`w-full resize-y rounded-lg border border-slate-100 bg-white/70 p-2 text-xs leading-6 outline-none ${tone === "novel-paper" ? "focus:border-[#967e54]" : "focus:border-[#7ba18e]"}`} />
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <footer className={`flex shrink-0 flex-col gap-3 border-t ${style.border} ${tone === "novel-paper" ? "bg-[#f8efd9]" : tone === "novel-sage" ? "bg-[#e4eee3]" : "bg-white"} px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6`}>
          <div className="flex items-start gap-2 text-[11px] leading-5 text-slate-500"><LockKeyhole size={15} className="mt-0.5 shrink-0" /> 保存回原有 STM/LTM 字段，不会改变旧存档格式。自动摘要流程保持原有行为。</div>
          <div className="flex shrink-0 items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">{localText(locale, "memory.cancel")}</button>
            <button type="button" onClick={save} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white ${style.button}`}><Save size={15} /> {localText(locale, "memory.save")} <Check size={13} /></button>
          </div>
          {error && <p role="alert" className="text-xs text-red-600 sm:basis-full">{error}</p>}
        </footer>
      </div>
    </div>
  );
}
