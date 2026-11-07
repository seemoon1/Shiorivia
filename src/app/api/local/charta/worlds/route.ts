import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { parseChartaWorld } from "../../../../../lib/chartaWorld";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const FILE = path.join(process.cwd(), "data_storage", "charta", "worlds.json");
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

async function readWorlds() {
  try {
    const raw = JSON.parse(await fs.readFile(FILE, "utf8"));
    if (!Array.isArray(raw) || raw.length > 60) throw new Error("Corrupt worlds library");
    return raw.map(parseChartaWorld);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
export async function GET() {
  try { return json({ worlds: await readWorlds() }); }
  catch { return json({ error: "世界观资料读取失败" }, 500); }
}
export async function PUT(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return json({ error: "Invalid origin" }, 403);
    const raw = await request.json();
    if (!Array.isArray(raw) || raw.length > 60) return json({ error: "Invalid world library" }, 400);
    const worlds = raw.map(parseChartaWorld);
    if (new Set(worlds.map(world => world.id)).size !== worlds.length) return json({ error: "Duplicate world ID" }, 400);
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    const temporary = `${FILE}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporary, JSON.stringify(worlds, null, 2), { flag: "wx" });
      await fs.rename(temporary, FILE);
    } finally { await fs.rm(temporary, { force: true }).catch(() => {}); }
    return json({ worlds });
  } catch { return json({ error: "世界观资料保存失败" }, 500); }
}
