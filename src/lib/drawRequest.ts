import { parseDrawTag } from "./parseDraw";
import type { ImageSettings } from "./imageSettings";

export function buildDrawRequest(content: string, options: {
  activeCharacterId: string;
  manualOutfitId?: string;
  characters?: { id: string; name: string }[];
  charStatus?: unknown;
  settings?: ImageSettings;
}) {
  const command = parseDrawTag(content);
  if (!command?.trigger) return null;
  const charId = command.charId || options.activeCharacterId;
  const character = options.characters?.find(item => item.id === charId);
  const name = character?.name || charId;
  const statusList = Array.isArray(options.charStatus) ? options.charStatus : [options.charStatus];
  const status = statusList.find((item: any) => item?.name === name) || statusList[0];
  const state = [status?.clothing, status?.bodyState, status?.innerState]
    .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
    .join('; ').slice(0, 600);
  const outfit = command.outfitId || options.manualOutfitId || 'default';
  const description = [command.description, `character: ${name}`, `outfit: ${outfit}`,
    state ? `current state: ${state}` : ''].filter(Boolean).join(', ');
  return {
    charId, outfitId: outfit, description,
    provider: options.settings?.provider || 'comfyui',
    model: options.settings?.model || '',
    positive: options.settings?.positive || '',
    negative: options.settings?.negative || '',
    width: options.settings?.width, height: options.settings?.height,
    steps: options.settings?.steps, cfg: options.settings?.cfg,
  };
}
