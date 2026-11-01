"use client";
import { useCallback, useEffect, useState } from "react";
import { CHARTA_STORAGE_KEY, parseChartaCharacter, type ChartaCharacter } from "../lib/charta";

/** Charta lives in data_storage/charta, independently of session sync. */
export function useChartaCharacters() {
  const [characters, setCharacters] = useState<ChartaCharacter[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/local/charta", { cache: "no-store" });
        if (!response.ok) throw new Error("Cannot load disk-backed Charta library.");
        const json = await response.json();
        let entries: ChartaCharacter[] = (json.characters || []).map(parseChartaCharacter);
        // One-time migration for characters created before disk storage was introduced.
        const legacy = localStorage.getItem(CHARTA_STORAGE_KEY);
        if (legacy && entries.length === 0) {
          const parsed: unknown = JSON.parse(legacy);
          if (!Array.isArray(parsed)) throw new Error("Invalid legacy Charta library.");
          entries = parsed.slice(0, 100).map(parseChartaCharacter);
          const migrated = await fetch("/api/local/charta", {
            method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(entries),
          });
          if (!migrated.ok) throw new Error("Legacy Charta migration failed; browser copy was retained.");
        }
        if (cancelled) return;
        localStorage.removeItem(CHARTA_STORAGE_KEY);
        setCharacters(entries);
        setError("");
        setLoaded(true);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unable to load Charta library.");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const save = useCallback(async (item: ChartaCharacter): Promise<boolean> => {
    if (!loaded) return false;
    try {
      const valid = parseChartaCharacter(item);
      const next = [valid, ...characters.filter(c => c.id !== valid.id)];
      if (next.length > 100) throw new Error("Charta supports up to 100 characters.");
      const response = await fetch("/api/local/charta", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next),
      });
      if (!response.ok) throw new Error("Disk save failed.");
      setCharacters(next); setError(""); return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Local save failed."); return false; }
  }, [characters, loaded]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    if (!loaded) return false;
    try {
      const response = await fetch(`/api/local/charta?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Disk delete failed.");
      setCharacters(prev => prev.filter(c => c.id !== id)); setError(""); return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Local delete failed."); return false; }
  }, [loaded]);
  return { characters, save, remove, loaded, error };
}
