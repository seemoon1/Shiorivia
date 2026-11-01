"use client";

import { useRef, useState } from "react";
import { Download, FileJson2, Upload } from "lucide-react";
import { createNovelDocx, extractNovelChapters } from "../lib/novelDocx";
import type { NovelDraft, Session } from "../types";
import { useLanguage } from "../context/LanguageContext";
import { deepText } from "../lib/i18nDeep";

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
  const { locale } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [exportFormat, setExportFormat] = useState<"json" | "docx">("json");

  const exportNovel = () => {
    try {
      const basename = `Shiorivia-Novel-${session.title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 50) || "Dream"}`;
      let blob: Blob;
      if (exportFormat === "docx") {
        const chapters = extractNovelChapters(session.messages);
        if (!chapters.length) throw new Error(deepText(locale, "archive.noChapters"));
        const docx = createNovelDocx(session.title || deepText(locale, "archive.untitled"), chapters);
        // Make an ordinary ArrayBuffer to satisfy DOM BlobPart types on TS 5.x.
        const buffer = new ArrayBuffer(docx.byteLength);
        new Uint8Array(buffer).set(docx);
        blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      } else {
        const payload = { format: FORMAT, version: 1, exportedAt: new Date().toISOString(), session, draft };
        blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${basename}.${exportFormat}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      setMessage(deepText(locale, exportFormat === "docx" ? "archive.docxSuccess" : "archive.jsonSuccess"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : deepText(locale, "archive.exportFailed"));
    }
  };

  const importNovel = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error(deepText(locale, "archive.tooLarge"));
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(deepText(locale, "archive.invalidJson"));
      const envelope = parsed as Record<string, unknown>;
      if (envelope.format !== FORMAT || envelope.version !== 1) throw new Error(deepText(locale, "archive.invalidVersion"));
      const data = envelope.session;
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error(deepText(locale, "archive.missing"));
      const candidate = data as Partial<Session>;
      if (candidate.memoryMode !== "novel" || typeof candidate.title !== "string" || !Array.isArray(candidate.messages)) {
        throw new Error(deepText(locale, "archive.invalidSession"));
      }
      if (candidate.messages.length > 30000 || !candidate.messages.every(m =>
        m && typeof m === "object" && ["assistant", "user", "system"].includes(m.role) &&
        (typeof m.content === "string" || Array.isArray(m.content)))) {
        throw new Error(deepText(locale, "archive.invalidMessages"));
      }
      const rawDraft = envelope.draft;
      const validDraft = rawDraft && typeof rawDraft === "object" && !Array.isArray(rawDraft) &&
        Array.isArray((rawDraft as NovelDraft).selectedCharIds) &&
        ["scenario", "action", "style", "outline"].every(k => typeof (rawDraft as unknown as Record<string, unknown>)[k] === "string")
        ? rawDraft as NovelDraft : undefined;
      onImport(candidate as Session, validDraft);
      setMessage(deepText(locale, "archive.importSuccess"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : deepText(locale, "archive.importFailed"));
    }
  };

  return (
    <section className={className} aria-label={deepText(locale, "archive.title")}>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold"><FileJson2 size={15} /> {deepText(locale, "archive.title")} · Archive</div>
      <label className="mb-3 block text-[11px] leading-5 opacity-80">
        <span className="mb-1 block">{deepText(locale, "archive.format")}</span>
        <select aria-label={deepText(locale, "archive.format")} value={exportFormat} onChange={e => setExportFormat(e.target.value as "json" | "docx")}
          disabled={disabled} className="w-full rounded-lg border border-current/20 bg-transparent px-2 py-2 text-xs outline-none">
          <option value="json">JSON · {deepText(locale, "archive.jsonOption")}</option>
          <option value="docx">DOCX · {deepText(locale, "archive.docxOption")}</option>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={disabled} onClick={exportNovel} className="flex items-center justify-center gap-1.5 rounded-lg border border-current/20 px-2 py-2 text-xs transition hover:opacity-70 disabled:opacity-40"><Download size={14}/> {deepText(locale, "archive.export")} {exportFormat.toUpperCase()}</button>
        <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()} className="flex items-center justify-center gap-1.5 rounded-lg border border-current/20 px-2 py-2 text-xs transition hover:opacity-70 disabled:opacity-40"><Upload size={14}/> {deepText(locale, "archive.import")} JSON</button>
      </div>
      <input ref={inputRef} type="file" accept=".json,application/json" className="hidden" onChange={e => { const f = e.currentTarget.files?.[0]; e.currentTarget.value = ""; void importNovel(f); }}/>
      {message && <p role="status" className="mt-2 text-[11px] leading-5 opacity-70">{message}</p>}
      <p className="mt-2 text-[10px] leading-5 opacity-50">{deepText(locale, "archive.hint")}</p>
    </section>
  );
}
