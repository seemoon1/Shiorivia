"use client";
import { useCallback, useEffect, useState } from "react";
import { parseChartaWorld, type ChartaWorld } from "../lib/chartaWorld";

export function useChartaWorlds() {
  const [worlds, setWorlds] = useState<ChartaWorld[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let mounted = true;
    fetch("/api/local/charta/worlds", { cache: "no-store" })
      .then(async response => { if (!response.ok) throw new Error("世界观资料读取失败"); return response.json(); })
      .then(data => { if (mounted) { setWorlds((data.worlds || []).map(parseChartaWorld)); setLoaded(true); setError(""); } })
      .catch(e => { if (mounted) setError(String(e?.message || e)); });
    return () => { mounted = false; };
  }, []);
  const persist = useCallback(async (items: ChartaWorld[]) => {
    if (!loaded) return false;
    try {
      const validated = items.map(parseChartaWorld);
      const response = await fetch("/api/local/charta/worlds", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validated),
      });
      if (!response.ok) throw new Error("世界观资料保存失败");
      const data = await response.json();
      setWorlds(data.worlds.map(parseChartaWorld)); setError(""); return true;
    } catch (e) { setError(e instanceof Error ? e.message : "保存失败"); return false; }
  }, [loaded]);
  const saveWorld = useCallback((entry: ChartaWorld) => {
    const validated = parseChartaWorld(entry);
    return persist([validated, ...worlds.filter(world => world.id !== validated.id)]);
  }, [worlds, persist]);
  const removeWorld = useCallback((id: string) => persist(worlds.filter(world => world.id !== id)), [worlds, persist]);
  return { worlds, loaded, error, saveWorld, removeWorld };
}
