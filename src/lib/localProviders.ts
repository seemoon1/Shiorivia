/** Safe, browser-readable provider metadata. Never put API credentials here. */
export type LocalProviderId = "deepseek" | "openrouter" | "google" | `custom_${1 | 2 | 3 | 4}`;
export type LocalModel = { id: string; name: string };
export type LocalModelGroup = { groupName: string; models: LocalModel[] };
export type PublicLocalProvider = {
  id: LocalProviderId;
  label: string;
  configured: boolean;
  custom: boolean;
};

export const DEFAULT_LOCAL_PROVIDERS: PublicLocalProvider[] = [
  { id: "deepseek", label: "DeepSeek", configured: false, custom: false },
  { id: "openrouter", label: "OpenRouter", configured: false, custom: false },
  { id: "google", label: "Google", configured: false, custom: false },
];

// Safe fallbacks while offline or before the provider's live /models request completes.
// Actual model availability is determined by the selected provider's API.
export function fallbackModelGroups(id: string): LocalModelGroup[] {
  if (id === "deepseek") return [{ groupName: "DeepSeek", models: [
    { id: "deepseek-flash", name: "DeepSeek Flash" },
    { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro" },
  ] }];
  if (id === "google") return [{ groupName: "Gemini", models: [
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
  ] }];
  if (id === "openrouter") return [{ groupName: "OpenRouter · Fallback", models: [
    { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
    { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    { id: "deepseek/deepseek-v3.2", name: "DeepSeek V3.2" },
  ] }];
  return [{ groupName: "Custom Models", models: [] }];
}

export function defaultModelForProvider(id: string): string {
  return fallbackModelGroups(id)[0]?.models[0]?.id || "";
}

/** Custom providers take priority. Only four provider buttons are visible at once. */
export function getVisibleLocalProviders(providers: PublicLocalProvider[], disabled: string[]): PublicLocalProvider[] {
  return [...providers]
    .filter((p) => p.configured && !disabled.includes(p.id))
    .sort((a, b) => Number(b.custom) - Number(a.custom))
    .slice(0, 4);
}
