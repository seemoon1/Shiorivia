import { NextResponse } from "next/server";
import { BGM_LIBRARY } from "../../../data/bgm_library";

export const dynamic = 'force-dynamic'; 

export async function GET() {
  const hasValidMusic = BGM_LIBRARY.length > 1 || (BGM_LIBRARY.length === 1 && BGM_LIBRARY[0].id !== "demo_silence");

  return NextResponse.json({
    hasOpenRouter: !!process.env.OPENROUTER_API_KEY,
    hasGoogle: !!process.env.GOOGLE_API_KEY,
    hasTavily: !!process.env.TAVILY_API_KEY,
    
    hasComfy: Boolean(process.env.COMFYUI_URL),
    hasFal: Boolean(process.env.FAL_KEY),
    hasSdUrl: Boolean(process.env.COMFYUI_URL), // compatibility with older callers
    hasTtsUrl: false, // TTS adapters are paused

    hasMusic: hasValidMusic
  });
}