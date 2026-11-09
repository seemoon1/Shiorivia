import type { PlotSuggestions } from "../types";

export type NovelSuggestions = PlotSuggestions;
const KEYS = ["fun", "rational", "radical"] as const;
const BLOCK = /<novel_choices\b[^>]*>([\s\S]*?)<\/novel_choices\s*>/gi;
const OPEN = /<novel_choices\b[^>]*>[\s\S]*$/gi;
const LEGACY_LINE = /^\s*(?:>\s*)?(?:\*\*)?(?:Option|选项|選項|選擇|選択肢|선택지)\s*([123一二三])(?:\*\*)?\s*[：:.)、-]\s*(.+?)\s*$/i;
const NUMBER: Record<string, number> = { "1": 0, "2": 1, "3": 2, "一": 0, "二": 1, "三": 2 };

export function parseNovelSuggestions(value: unknown): NovelSuggestions | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const obj = value as Record<string, unknown>;
  if (!KEYS.every(key => typeof obj[key] === "string" && !!String(obj[key]).trim() && String(obj[key]).length <= 600)) return null;
  return {
    fun: String(obj.fun).trim(),
    rational: String(obj.rational).trim(),
    radical: String(obj.radical).trim(),
  };
}

export function extractNovelSuggestions(text: string): NovelSuggestions | null {
  let found: NovelSuggestions | null = null;
  for (const match of text.matchAll(BLOCK)) {
    try {
      const candidate = parseNovelSuggestions(JSON.parse(match[1]));
      if (candidate) found = candidate;
    } catch { /* Other text providers sometimes emit invalid blocks. */ }
  }
  return found || parseLegacyNovelSuggestions(text);
}

/** Older Tela chapters used three prose lines such as > **Option 1**: ... */
export function parseLegacyNovelSuggestions(text: string): NovelSuggestions | null {
  const found: string[] = ["", "", ""];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(LEGACY_LINE);
    if (match) found[NUMBER[match[1]]] = match[2].trim();
  }
  return found.every(Boolean)
    ? { fun: found[0], rational: found[1], radical: found[2] }
    : null;
}

export function stripNovelSuggestions(text: string): string {
  let clean = text.replace(BLOCK, "").replace(OPEN, "");
  if (parseLegacyNovelSuggestions(clean)) {
    clean = clean.split(/\r?\n/).filter(line => !LEGACY_LINE.test(line)).join("\n");
  }
  return clean.trim();
}
