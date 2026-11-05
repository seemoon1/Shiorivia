import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { readLocalMusic } from "../../../../../lib/localMusicServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const DIR = path.resolve(process.cwd(), "data_storage", "music-covers");

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") || "";
  if (!/^local_[a-f0-9]{20}$/.test(id)) return new Response("Invalid cover ID", { status: 400 });
  const track = readLocalMusic().find(t => t.id === id);
  if (!track?.cover) return new Response("Cover unavailable", { status: 404 });
  const extension = track.cover.endsWith("ext=png") ? ".png" : ".jpg";
  const candidate = path.join(DIR, id + extension);
  try {
    const [root, file] = await Promise.all([realpath(DIR), realpath(candidate)]);
    if (!file.startsWith(root + path.sep)) return new Response("Cover unavailable", { status: 404 });
    if ((await stat(file)).size > 2 * 1024 * 1024) return new Response("Cover unavailable", { status: 404 });
    const bytes = await readFile(file);
    return new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": extension === ".png" ? "image/png" : "image/jpeg",
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    } });
  } catch { return new Response("Cover unavailable", { status: 404 }); }
}
