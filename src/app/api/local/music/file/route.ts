import { NextRequest } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname } from "node:path";
import { Readable } from "node:stream";
import { resolveLocalAsset } from "../../../../../lib/localMusicServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mime: Record<string, string> = {
  ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".aac": "audio/aac",
  ".ogg": "audio/ogg", ".wav": "audio/wav", ".flac": "audio/flac", ".lrc": "text/plain; charset=utf-8",
};

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") || "";
  const kind = req.nextUrl.searchParams.get("kind");
  if (!/^local_[a-f0-9]{20}$/.test(id) || (kind !== "audio" && kind !== "lrc")) return new Response("Invalid media identifier", { status: 400 });
  const full = await resolveLocalAsset(id, kind);
  if (!full) return new Response("File not found in scanned library", { status: 404 });
  const size = (await stat(full)).size;
  const headers = new Headers({
    "Content-Type": mime[extname(full).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "private, no-store",
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
  });
  if (kind === "audio") {
    const range = req.headers.get("range");
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
      let start = match[1] ? Number(match[1]) : 0;
      let end = match[2] ? Number(match[2]) : size - 1;
      if (!match[1] && match[2]) { start = Math.max(0, size - Number(match[2])); end = size - 1; }
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || end < start) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
      end = Math.min(end, size - 1);
      headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
      headers.set("Content-Length", String(end - start + 1));
      return new Response(Readable.toWeb(createReadStream(full, { start, end })) as ReadableStream, { status: 206, headers });
    }
  }
  headers.set("Content-Length", String(size));
  return new Response(Readable.toWeb(createReadStream(full)) as ReadableStream, { headers });
}
