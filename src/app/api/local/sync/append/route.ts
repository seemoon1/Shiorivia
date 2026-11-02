import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import type { AppendDelta } from "../../../../../lib/appendSync";
import type { Session } from "../../../../../types";
export const runtime = "nodejs";
const file = path.join(process.cwd(), "data_storage", "shiorivia_save.json");
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
let pending: Promise<void> = Promise.resolve();
export async function POST(req: Request) {
  let unlock!: () => void;
  const previous = pending;
  pending = new Promise<void>(resolve => { unlock = resolve; });
  await previous;
  try {
    const { deltas }: { deltas?: AppendDelta[] } = await req.json();
    if (!Array.isArray(deltas) || deltas.length < 1 || deltas.length > 50) return json({ error: "Invalid append delta" }, 400);
    const disk = await fs.readFile(file, "utf8").then(JSON.parse).catch((e: NodeJS.ErrnoException) => {
      if (e.code !== 'ENOENT') throw e;
      return { sessions: [], folders: [], globalWorldInfo: "", bgImage: null };
    });
    if (!Array.isArray(disk.sessions)) return json({ error: "Invalid disk save" }, 409);
    const sessions: Session[] = disk.sessions;
    // Validate every append before modifying the on-disk snapshot.
    for (const delta of deltas) {
      if (delta?.kind === 'createSession') {
        if (!delta.session || typeof delta.session.id !== 'string' || sessions.some(s => s.id === delta.session.id)) return json({ error: 'Duplicate or invalid session' }, 409);
        continue;
      }
      if (delta?.kind === 'createGroup') {
        const target = sessions.find(s => s.id === delta.sessionId);
        if (!target || !delta.group?.id || target.limeGroups?.some(g => g.id === delta.group.id)) return json({ error: 'Invalid new VIAE group' }, 409);
        continue;
      }
      if (!delta || typeof delta.sessionId !== "string" || !Number.isInteger(delta.expectedLength) || delta.expectedLength < 0 || !Array.isArray(delta.messages) || !delta.messages.length || delta.messages.length > 20) return json({ error: "Invalid delta" }, 400);
      const session = sessions.find(s => s.id === delta.sessionId);
      if (!session) return json({ error: "New sessions need a manual save" }, 409);
      const target = delta.kind === "chat" ? session.messages : delta.kind === "viae" ? session.limeGroups?.find(g => g.id === delta.groupId)?.messages : null;
      if (!target || target.length !== delta.expectedLength) return json({ error: "Disk data changed; manual sync required" }, 409);
      if (!delta.messages.every(m => m && (m.role === "assistant" || m.role === "user") && typeof m.content === "string" && m.content.length < 1000000)) return json({ error: "Unsupported message" }, 400);
    }
    for (const delta of deltas) {
      if (delta.kind === 'createSession') { sessions.push(delta.session); continue; }
      const session = sessions.find(s => s.id === delta.sessionId)!;
      if (delta.kind === 'createGroup') { session.limeGroups = [...(session.limeGroups || []), delta.group]; continue; }
      if (delta.kind === "chat") session.messages.push(...delta.messages);
      else session.limeGroups!.find(g => g.id === delta.groupId)!.messages.push(...(delta.messages as any));
      session.updatedAt = Date.now();
    }
    await fs.mkdir(path.dirname(file), {recursive: true});
    await fs.copyFile(file, file + ".bak.append").catch((e: NodeJS.ErrnoException) => { if (e.code !== 'ENOENT') throw e; });
    const tmp = file + ".append.tmp";
    try { await fs.writeFile(tmp, JSON.stringify(disk, null, 2)); await fs.rename(tmp, file); }
    finally { await fs.rm(tmp, { force: true }).catch(() => {}); }
    return json({ success: true, data: disk, lastModified: (await fs.stat(file)).mtimeMs });
  } catch { return json({ error: "Unable to append local save" }, 500); }
  finally { unlock(); }
}
