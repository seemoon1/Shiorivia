import { NextResponse } from "next/server";
import { fallbackModelGroups, type LocalModel } from "../../../lib/localProviders";
import { getServerLocalProvider, publicLocalProviders } from "../../../lib/localProviderServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(req: Request) {
  const providerId = new URL(req.url).searchParams.get("models");
  if (!providerId) return json({ providers: publicLocalProviders() });
  const provider = getServerLocalProvider(providerId);
  if (!provider) return json({ error: "Provider not configured" }, 400);

  try {
    const endpoint = provider.id === "google"
      ? "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000"
      : `${provider.baseURL}/models`;
    const response = await fetch(endpoint, {
      headers: provider.id === "google" ? { "x-goog-api-key": provider.apiKey } : { Authorization: `Bearer ${provider.apiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`Provider models HTTP ${response.status}`);
    const data = await response.json();
    const records: any[] = provider.id === "google" ? (data.models || []) : (data.data || []);
    const models: LocalModel[] = records
      .filter((m: any) => provider.id !== "google" || m.supportedGenerationMethods?.includes("generateContent"))
      .filter((m: any) => !Array.isArray(m.architecture?.output_modalities) || m.architecture.output_modalities.includes("text"))
      .map((m: any) => ({
        id: String(m.id || m.name || "").replace(/^models\//, ""),
        name: String(m.displayName || m.name || m.id || "").replace(/^models\//, ""),
      }))
      .filter((m: LocalModel) => m.id && m.id.length <= 160)
      .slice(0, 200);
    if (!models.length) throw new Error("Empty model catalog");
    return json({ groups: [{ groupName: "Live Provider Models", models }], source: "live" });
  } catch {
    return json({ groups: fallbackModelGroups(providerId), source: "fallback" });
  }
}
