import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { parseChartaSelf, type ChartaSelf } from "../../../../../lib/chartaSelf";
import { parseChartaWorld } from "../../../../../lib/chartaWorld";
import { parseChartaCharacter } from "../../../../../lib/charta";
import { validateChartaTimelineLinks, validateChartaRelationshipTargets } from "../../../../../lib/chartaLore";
import { BANG_DREAM_CANON, BANG_DREAM_WORLD_ID } from "../../../../../lib/storyWorldline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const FILE = path.join(process.cwd(), "data_storage", "charta", "selves.json");
const ROOT = path.dirname(FILE);

async function readProfiles(): Promise<{ selves: ChartaSelf[]; activeId: string | null }> {
  try {
    const value = JSON.parse(await fs.readFile(FILE, "utf8"));
    if (!Array.isArray(value?.selves) || value.selves.length > 40) throw new Error("Invalid self library");
    const selves = value.selves.map(parseChartaSelf);
    const activeId = selves.some(self => self.id === value.activeId) ? value.activeId as string : null;
    return { selves, activeId };
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return { selves: [], activeId: null };
    throw error;
  }
}
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function GET() {
  try { return json(await readProfiles()); }
  catch { return json({ error: "Unable to read Charta self profiles" }, 500); }
}
export async function PUT(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return json({ error: "Invalid origin" }, 403);
    const body = await request.json();
    if (!body || !Array.isArray(body.selves) || body.selves.length > 40) return json({ error: "Invalid profile library" }, 400);
    const selves = body.selves.map(parseChartaSelf);
    if (new Set(selves.map((s: ChartaSelf) => s.id)).size !== selves.length) return json({ error: "Duplicate ID" }, 400);
    if (body.activeId != null && !selves.some((s: ChartaSelf) => s.id === body.activeId)) return json({ error: "Unknown active profile" }, 400);
    let worlds: ReturnType<typeof parseChartaWorld>[] = [];
    let characters: ReturnType<typeof parseChartaCharacter>[] = [];
    try {
      const rawWorlds = JSON.parse(await fs.readFile(path.join(ROOT, "worlds.json"), "utf8"));
      worlds = rawWorlds.map(parseChartaWorld);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    try {
      const rawCharacters = JSON.parse(await fs.readFile(path.join(ROOT, "characters.json"), "utf8"));
      characters = rawCharacters.map(parseChartaCharacter);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    for (const self of selves) {
      if (!self.profile) continue; // Existing legacy self documents stay readable.
      const stages = self.worldId === BANG_DREAM_WORLD_ID ? BANG_DREAM_CANON
        : worlds.find(world => world.id === self.worldId)?.canonTimeline || [];
      const error = validateChartaTimelineLinks(self.profile, stages)
        || validateChartaRelationshipTargets(self.profile, self.worldId, [...characters, ...selves]);
      if (error) return json({ error: error + "：" + (self.names[self.primaryLanguage] || self.id) }, 400);
    }
    const activeId = typeof body.activeId === "string" ? body.activeId : null;
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    const temporary = `${FILE}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporary, JSON.stringify({ selves, activeId }, null, 2), { flag: "wx" });
      await fs.rename(temporary, FILE);
    } finally { await fs.rm(temporary, { force: true }).catch(() => {}); }
    return json({ selves, activeId });
  } catch { return json({ error: "Unable to save Charta self profiles" }, 500); }
}
