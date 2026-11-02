export type ImageSettings = {
  provider: string; model: string; positive: string; negative: string;
  width: number; height: number; steps: number; cfg: number;
};
export type ProviderCapability = { llm: boolean; image: boolean };
export const DEFAULT_IMAGE_SETTINGS: ImageSettings = {
  provider: "comfyui", model: "", positive: "masterpiece, high quality illustration",
  negative: "low quality, blurry, text, watermark", width: 768, height: 1024, steps: 24, cfg: 7,
};
export const capabilityFor = (id: string, map: Record<string, ProviderCapability>): ProviderCapability =>
  map[id] || { llm: true, image: false };
