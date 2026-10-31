import { DEFAULT_LOCAL_PROVIDERS, type LocalProviderId, type PublicLocalProvider } from "./localProviders";

type ServerLocalProvider = PublicLocalProvider & { apiKey: string; baseURL: string };

const CUSTOM_IDS = ["custom_1", "custom_2", "custom_3", "custom_4"] as const;

function normalizeBaseURL(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (!(["http:", "https:"].includes(url.protocol)) || url.username || url.password || url.search || url.hash) return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function serverLocalProviders(): ServerLocalProvider[] {
  const defaults = DEFAULT_LOCAL_PROVIDERS.map((p) => {
    const apiKey = (p.id === "deepseek" ? process.env.DEEPSEEK_API_KEY
      : p.id === "google" ? process.env.GOOGLE_API_KEY
      : process.env.OPENROUTER_API_KEY) || "";
    const baseURL = p.id === "deepseek" ? "https://api.deepseek.com"
      : p.id === "openrouter" ? "https://openrouter.ai/api/v1" : "";
    return { ...p, configured: Boolean(apiKey), apiKey, baseURL };
  });
  const custom = CUSTOM_IDS.map((id, index) => {
    const number = index + 1;
    // Explicit keys prevent dynamic environment variable access in edge builds.
    const keys = [process.env.SHIORIVIA_CUSTOM_1_API_KEY, process.env.SHIORIVIA_CUSTOM_2_API_KEY, process.env.SHIORIVIA_CUSTOM_3_API_KEY, process.env.SHIORIVIA_CUSTOM_4_API_KEY];
    const urls = [process.env.SHIORIVIA_CUSTOM_1_BASE_URL, process.env.SHIORIVIA_CUSTOM_2_BASE_URL, process.env.SHIORIVIA_CUSTOM_3_BASE_URL, process.env.SHIORIVIA_CUSTOM_4_BASE_URL];
    const apiKey = (keys[index] || "").trim();
    const baseURL = normalizeBaseURL((urls[index] || "").trim()) || "";
    return { id: id as LocalProviderId, label: `Custom_${number}`, configured: Boolean(apiKey && baseURL), custom: true, apiKey, baseURL };
  });
  return [...custom, ...defaults];
}

export function getServerLocalProvider(id: unknown): ServerLocalProvider | null {
  if (typeof id !== "string") return null;
  return serverLocalProviders().find((p) => p.id === id && p.configured) || null;
}

export function publicLocalProviders(): PublicLocalProvider[] {
  return serverLocalProviders().map(({ id, label, custom, configured }) => ({ id, label, custom, configured }));
}
