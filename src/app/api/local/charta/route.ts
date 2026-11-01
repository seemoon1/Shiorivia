import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { parseChartaCharacter, type ChartaCharacter } from "../../../../lib/charta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Local Edition only: never expose this server on the public Internet.
const ROOT = path.join(process.cwd(), "data_storage", "charta");
const PORTRAITS = path.join(ROOT, "portraits");
const DATABASE = path.join(ROOT, "characters.json");
const idPattern = /^charta-[a-zA-Z0-9-]{8,90}$/;
const noCache = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: noCache });

async function readCharacters(): Promise<ChartaCharacter[]> {
  try {
    const data = JSON.parse(await fs.readFile(DATABASE, "utf8"));
    if (!Array.isArray(data)) throw new Error("Corrupt Charta library");
    return data.map(parseChartaCharacter);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

const formats = [
  { ext: "png", mime: "image/png" },
  { ext: "jpg", mime: "image/jpeg" },
  { ext: "webp", mime: "image/webp" },
] as const;

function detectFormat(bytes: Uint8Array): (typeof formats)[number] | null {
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b)) return formats[0];
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return formats[1];
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return formats[2];
  return null;
}

export async function GET(request: Request) {
  try {
    const portraitId = new URL(request.url).searchParams.get("portrait");
    if (portraitId !== null) {
      if (!idPattern.test(portraitId)) return json({ error: "Invalid character ID" }, 400);
      for (const format of formats) {
        try {
          const bytes = await fs.readFile(path.join(PORTRAITS, `${portraitId}.${format.ext}`));
          return new Response(new Uint8Array(bytes), { headers: { ...noCache, "Content-Type": format.mime } });
        } catch (e) {
          if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
        }
      }
      return json({ error: "Portrait not found" }, 404);
    }
    return json({ characters: await readCharacters() });
  } catch { return json({ error: "Unable to read local Charta data" }, 500); }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const id = form.get("id");
    const image = form.get("image");
    if (typeof id !== "string" || !idPattern.test(id) || !(image instanceof File)) return json({ error: "Invalid upload" }, 400);
    if (image.size === 0 || image.size > 8 * 1024 * 1024) return json({ error: "Portrait must be 8 MB or less" }, 413);
    const bytes = new Uint8Array(await image.arrayBuffer());
    const format = detectFormat(bytes);
    if (!format) return json({ error: "Use PNG, JPEG or WebP" }, 415);
    await fs.mkdir(PORTRAITS, { recursive: true });
    const destination = path.join(PORTRAITS, `${id}.${format.ext}`);
    const temporary = `${destination}.${randomUUID()}.tmp`;
    try { await fs.writeFile(temporary, bytes, { flag: "wx" }); await fs.rename(temporary, destination); }
    finally { await fs.rm(temporary, { force: true }).catch(() => {}); }
    for (const other of formats) if (other.ext !== format.ext) {
      await fs.rm(path.join(PORTRAITS, `${id}.${other.ext}`), { force: true });
    }
    return json({ portrait: `/api/local/charta?portrait=${id}&v=${Date.now()}` });
  } catch { return json({ error: "Portrait upload failed" }, 500); }
}

export async function PUT(request: Request) {
  try {
    if (Number(request.headers.get("content-length")) > 40 * 1024 * 1024) return json({ error: "Library too large" }, 413);
    const body: unknown = await request.json();
    if (!Array.isArray(body) || body.length > 100) return json({ error: "Invalid character library" }, 400);
    const characters = body.map(parseChartaCharacter);
    if (new Set(characters.map(c => c.id)).size !== characters.length) return json({ error: "Duplicate character ID" }, 400);
    await fs.mkdir(ROOT, { recursive: true });
    const tmp = path.join(ROOT, `characters.${randomUUID()}.tmp`);
    try {
      await fs.writeFile(tmp, JSON.stringify(characters, null, 2), { flag: "wx" });
      try { await fs.copyFile(DATABASE, `${DATABASE}.bak`); }
      catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
      await fs.rename(tmp, DATABASE);
    } finally { await fs.rm(tmp, { force: true }).catch(() => {}); }
    return json({ success: true });
  } catch { return json({ error: "Unable to save Charta library" }, 500); }
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !idPattern.test(id)) return json({ error: "Invalid character ID" }, 400);
  try {
    const characters = await readCharacters();
    if (!characters.some(c => c.id === id)) return json({ error: "Character not found" }, 404);
    const reply = await PUT(new Request(request.url, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(characters.filter(c => c.id !== id)),
    }));
    if (!reply.ok) return reply;
    for (const format of formats) await fs.rm(path.join(PORTRAITS, `${id}.${format.ext}`), { force: true });
    return json({ success: true });
  } catch { return json({ error: "Unable to delete character" }, 500); }
}
