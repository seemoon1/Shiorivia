"use client";
import { useCallback, useEffect, useState } from "react";

const KEY = "shiorivia_saved_models_v1";
const EVENT = "shiorivia:saved-models";
type SavedModels = Record<string, string[]>;

function readSavedModels(): SavedModels {
  if (typeof window === "undefined") return {};
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(KEY) || "{}");
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const clean: SavedModels = {};
    for (const [provider, list] of Object.entries(raw)) {
      if (!/^(deepseek|openrouter|google|custom_[1-4])$/.test(provider)) continue;
      if (!Array.isArray(list)) continue;
      clean[provider] = Array.from(new Set(list.filter((id): id is string =>
        typeof id === "string" && id.trim() === id && id.length > 0 && id.length <= 200))).slice(0, 80);
    }
    return clean;
  } catch { return {}; }
}

function writeSavedModels(value: SavedModels): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(value));
    window.dispatchEvent(new Event(EVENT));
  } catch { /* Browser storage may be disabled. */ }
}

/** A shared provider-scoped model collection across Officina, Via Lata, Umbra, Tela and VIAE. */
export function useSavedModels() {
  const [savedModels, setSavedModels] = useState<SavedModels>({});
  useEffect(() => {
    const sync = () => setSavedModels(readSavedModels());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);

  const saveModel = useCallback((provider: string, model: string) => {
    const id = model.trim();
    if (!provider || !/^(deepseek|openrouter|google|custom_[1-4])$/.test(provider) || !id || id.length > 200) return;
    const all = readSavedModels();
    const current = all[provider] || [];
    if (current.includes(id) || current.length >= 80) return;
    writeSavedModels({ ...all, [provider]: [...current, id] });
    setSavedModels(readSavedModels());
  }, []);
  const forgetModel = useCallback((provider: string, model: string) => {
    const all = readSavedModels();
    writeSavedModels({ ...all, [provider]: (all[provider] || []).filter(id => id !== model) });
    setSavedModels(readSavedModels());
  }, []);
  return { savedModels, saveModel, forgetModel };
}
