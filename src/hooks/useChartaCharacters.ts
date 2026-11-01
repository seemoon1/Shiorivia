"use client";
import { useCallback, useEffect, useState } from "react";
import { CHARTA_STORAGE_KEY, parseChartaCharacter, type ChartaCharacter } from "../lib/charta";

/** Separate character library. This does not touch session sync or lore_library. */
export function useChartaCharacters() {
  const [characters, setCharacters] = useState<ChartaCharacter[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHARTA_STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (!Array.isArray(parsed)) throw new Error("Invalid Charta library.");
        setCharacters(parsed.slice(0, 100).map(parseChartaCharacter));
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to read Charta library."); }
    setLoaded(true);
  }, []);

  const save = useCallback((item: ChartaCharacter): boolean => {
    if (!loaded) return false;
    try {
      const valid = parseChartaCharacter(item);
      const next = [valid, ...characters.filter(c => c.id !== valid.id)];
      if (next.length > 100) throw new Error("Charta supports up to 100 characters.");
      localStorage.setItem(CHARTA_STORAGE_KEY, JSON.stringify(next));
      setCharacters(next); setError(""); return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Local save failed."); return false; }
  }, [characters, loaded]);

  const remove = useCallback((id: string): boolean => {
    if (!loaded) return false;
    try {
      const next = characters.filter(c => c.id !== id);
      localStorage.setItem(CHARTA_STORAGE_KEY, JSON.stringify(next));
      setCharacters(next); setError(""); return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Local save failed."); return false; }
  }, [characters, loaded]);
  return { characters, save, remove, loaded, error };
}
