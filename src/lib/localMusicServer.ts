import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import path from "node:path";
import type { BGMTrack } from "../data/bgm_library";

export type LocalTrack = BGMTrack & { audioFile: string; lyricFile?: string };
export const MUSIC_DIRECTORY = path.resolve(process.cwd(), "music");
const INDEX_FILE = path.resolve(process.cwd(), "data_storage", "music-library.json");
const EXTENSIONS = new Set([".mp3", ".m4a", ".aac", ".ogg", ".wav", ".flac"]);
const LIMIT = 800;

const inside = (root: string, full: string) => full.startsWith(root + path.sep);
const safeName = (s: string) => s.replace(/[\r\n<>\u0000-\u001f]/g, " ").trim().slice(0, 160);
export const localMusicPublic = (tracks: LocalTrack[]): BGMTrack[] => tracks.map(
  ({ id, name, artist, src, lrc, cover, is_bgm, category, groups }) =>
    ({ id, name, artist, src, lrc, cover, is_bgm, category, groups })
);

export function readLocalMusic(): LocalTrack[] {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(INDEX_FILE, "utf8"));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is LocalTrack => Boolean(v && typeof v.id === "string" && /^local_[a-f0-9]{20}$/.test(v.id)
      && typeof v.audioFile === "string" && typeof v.name === "string" && typeof v.artist === "string"
      && v.audioFile.length < 512 && (v.lyricFile === undefined || typeof v.lyricFile === "string")));
  } catch { return []; }
}

export async function resolveLocalAsset(id: string, kind: "audio" | "lrc"): Promise<string | null> {
  const track = readLocalMusic().find(item => item.id === id);
  if (!track) return null;
  const relative = kind === "audio" ? track.audioFile : track.lyricFile;
  if (!relative) return null;
  const absolute = path.resolve(MUSIC_DIRECTORY, relative);
  if (!inside(MUSIC_DIRECTORY, absolute)) return null;
  try {
    const [root, full] = await Promise.all([fsp.realpath(MUSIC_DIRECTORY), fsp.realpath(absolute)]);
    if (!inside(root, full)) return null;
    const stat = await fsp.stat(full);
    if (!stat.isFile()) return null;
    return full;
  } catch { return null; }
}

/** Rebuild the index only when the user confirms a scan in the music player. */
export async function scanLocalMusic(): Promise<{ tracks: BGMTrack[]; count: number }> {
  await fsp.mkdir(MUSIC_DIRECTORY, { recursive: true });
  const audio: string[] = [];
  async function visit(directory: string, depth: number): Promise<void> {
    if (depth > 4 || audio.length >= LIMIT) return;
    const entries = await fsp.readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (entry.isSymbolicLink() || entry.name.startsWith(".")) continue;
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(full, depth + 1);
      else if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name).toLowerCase())) audio.push(full);
      if (audio.length >= LIMIT) break;
    }
  }
  await visit(MUSIC_DIRECTORY, 0);
  const tracks: LocalTrack[] = [];
  for (const full of audio) {
    const rel = path.relative(MUSIC_DIRECTORY, full).split(path.sep).join("/");
    if (!inside(MUSIC_DIRECTORY, full)) continue;
    const base = path.basename(full, path.extname(full));
    const sep = base.indexOf(" - ");
    const artist = safeName(sep > 0 ? base.slice(0, sep) : "Unknown Artist");
    const name = safeName(sep > 0 ? base.slice(sep + 3) : base);
    if (!name) continue;
    const id = "local_" + createHash("sha256").update(rel).digest("hex").slice(0, 20);
    const lrcCandidate = path.join(path.dirname(full), base + ".lrc");
    let lyricFile: string | undefined;
    try { if ((await fsp.lstat(lrcCandidate)).isFile()) lyricFile = path.relative(MUSIC_DIRECTORY, lrcCandidate).split(path.sep).join("/"); }
    catch { /* Lyrics are optional. */ }
    tracks.push({ id, name, artist, audioFile: rel, ...(lyricFile ? { lyricFile } : {}),
      src: `/api/local/music/file?id=${id}&kind=audio`,
      ...(lyricFile ? { lrc: `/api/local/music/file?id=${id}&kind=lrc` } : {}),
      is_bgm: false, category: "solo", groups: ["Local Library"] });
  }
  await fsp.mkdir(path.dirname(INDEX_FILE), { recursive: true });
  const tempFile = INDEX_FILE + "." + process.pid + ".tmp";
  try { await fsp.writeFile(tempFile, JSON.stringify(tracks, null, 2) + "\n", "utf8"); await fsp.rename(tempFile, INDEX_FILE); }
  finally { await fsp.rm(tempFile, { force: true }).catch(() => {}); }
  return { tracks: localMusicPublic(tracks), count: tracks.length };
}
