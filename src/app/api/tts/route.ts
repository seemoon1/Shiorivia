import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "TTS adapters are in development" }, { status: 503 });
}
