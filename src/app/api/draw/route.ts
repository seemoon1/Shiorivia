import { NextResponse } from "next/server";
import { generateImage } from "../../../lib/imageGeneration";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(req: Request) {
  try {
    if (Number(req.headers.get('content-length') || 0) > 128 * 1024) return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    const body = await req.json();
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    const result = await generateImage(body);
    return NextResponse.json({ success: true, ...result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Image generation failed' }, { status: 502 });
  }
}
