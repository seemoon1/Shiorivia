export type AutoSyncInterval = 3 | 4 | 5;
export type LocalSyncPreferences = { autoSync: boolean; autoSyncInterval: AutoSyncInterval };
export const DEFAULT_SYNC_PREFERENCES: LocalSyncPreferences = { autoSync: false, autoSyncInterval: 4 };
export function readLocalSyncPreferences(): LocalSyncPreferences {
  if (typeof window === "undefined") return DEFAULT_SYNC_PREFERENCES;
  try {
    const raw = JSON.parse(localStorage.getItem("shiorivia_sync_preferences_v1") || "null");
    return { autoSync: raw?.autoSync === true, autoSyncInterval: [3, 4, 5].includes(raw?.autoSyncInterval) ? raw.autoSyncInterval : 4 };
  } catch { return DEFAULT_SYNC_PREFERENCES; }
}
