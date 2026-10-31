"use client";

import { useRef, useState } from "react";
import { Download, FileJson2, Upload } from "lucide-react";
import type { NovelDraft, Session } from "../types";

const FORMAT = "shiorivia-novel-session";
const MAX_IMPORT_BYTES = 20 * 1024 * 1024;

/** A single, self-contained Novel session. This never overwrites the main backup. */
export function NovelArchiveActions({ session, draft, onImport, disabled = false, className = "" }: {
  session: Session;
  draft: NovelDraft;
  onImport: (imported: Session, draft?: NovelDraft) => void;
  disabled?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");

  const exportNovel = () => {
    const payload = { format: FORMAT, version: 1, exportedAt: new Date().toISOString(), session, draft };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Shiorivia-Novel-${session.title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 50) || "Dream"}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    setMessage("已导出当前小说会话（不含 API 密钥）");
  };

  const importNovel = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error("文件超过 20 MB 限制");
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("JSON 格式无效");
      const envelope = parsed as Record<string, unknown>;
      if (envelope.format !== FORMAT || envelope.version !== 1) throw new Error("只支持 Shiorivia 小说会话 JSON v1");
      const data = envelope.session;
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("缺少小说会话");
      const candidate = data as Partial<Session>;
      if (candidate.memoryMode !== "novel" || typeof candidate.title !== "string" || !Array.isArray(candidate.messages)) {
        throw new Error("文件不是有效的小说会话");
      }
      if (candidate.messages.length > 30000 || !candidate.messages.every(m =>
        m && typeof m === "object" && ["assistant", "user", "system"].includes(m.role) &&
        (typeof m.content === "string" || Array.isArray(m.content)))) {
        throw new Error("小说消息结构无效");
      }
      const rawDraft = envelope.draft;
      const validDraft = rawDraft && typeof rawDraft === "object" && !Array.isArray(rawDraft) &&
        Array.isArray((rawDraft as NovelDraft).selectedCharIds) &&
        ["scenario", "action", "style", "outline"].every(k => typeof (rawDraft as unknown as Record<string, unknown>)[k] === "string")
        ? rawDraft as NovelDraft : undefined;
      onImport(candidate as Session, validDraft);
      setMessage("已作为新的小说会话导入，原有会话未被覆盖");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "导入失败，请检查文件");
    }
  };

  return (
    <section className={className} aria-label="小说 JSON 导入导出">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold"><FileJson2 size={15} /> 小说 JSON 存档</div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={disabled} onClick={exportNovel} className="flex items-center justify-center gap-1.5 rounded-lg border border-current/20 px-2 py-2 text-xs transition hover:opacity-70 disabled:opacity-40"><Download size={14}/> 导出当前小说</button>
        <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()} className="flex items-center justify-center gap-1.5 rounded-lg border border-current/20 px-2 py-2 text-xs transition hover:opacity-70 disabled:opacity-40"><Upload size={14}/> 导入小说 JSON</button>
      </div>
      <input ref={inputRef} type="file" accept=".json,application/json" className="hidden" onChange={e => { const f = e.currentTarget.files?.[0]; e.currentTarget.value = ""; void importNovel(f); }}/>
      {message && <p role="status" className="mt-2 text-[11px] leading-5 opacity-70">{message}</p>}
      <p className="mt-2 text-[10px] leading-5 opacity-50">导入将创建新会话；全局备份请继续使用 Explorer。</p>
    </section>
  );
}
