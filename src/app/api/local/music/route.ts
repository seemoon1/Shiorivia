import { NextRequest, NextResponse } from "next/server";
import { localMusicPublic, readLocalMusic, scanLocalMusic } from "../../../../lib/localMusicServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ tracks: localMusicPublic(readLocalMusic()) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  // A browser-only, explicit action. Prevent other sites from triggering filesystem scans.
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Cross-origin scan denied" }, { status: 403 });
  }
  try {
    const library = await scanLocalMusic();
    return NextResponse.json(library, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cannot scan music" }, { status: 500 });
  }
}
