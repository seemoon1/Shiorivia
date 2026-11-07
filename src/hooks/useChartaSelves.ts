"use client";
import { useCallback, useEffect, useState } from "react";
import { parseChartaSelf, type ChartaSelf } from "../lib/chartaSelf";

export function useChartaSelves() {
  const [selves, setSelves] = useState<ChartaSelf[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let mounted = true;
    fetch("/api/local/charta/selves", { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("Unable to load Charta self profiles");
      return response.json();
    }).then(data => {
      if (!mounted) return;
      setSelves(Array.isArray(data.selves) ? data.selves.map(parseChartaSelf) : []);
      setActiveId(typeof data.activeId === "string" ? data.activeId : null);
      setLoaded(true);
    }).catch(e => { if (mounted) setError(String(e?.message || e)); });
    return () => { mounted = false; };
  }, []);
  const persist = useCallback(async (next: ChartaSelf[], active: string | null): Promise<boolean> => {
    if (!loaded) return false;
    try {
      const response = await fetch("/api/local/charta/selves", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selves: next, activeId: active }),
      });
      if (!response.ok) throw new Error("Saving self profiles failed");
      const data = await response.json();
      setSelves(data.selves); setActiveId(data.activeId); setError("");
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save self profiles"); return false; }
  }, [loaded]);
  const saveSelf = useCallback((entry: ChartaSelf) => {
    const parsed = parseChartaSelf(entry);
    return persist([parsed, ...selves.filter(s => s.id !== parsed.id)], activeId);
  }, [selves, activeId, persist]);
  const removeSelf = useCallback((id: string) => persist(selves.filter(s => s.id !== id), activeId === id ? null : activeId), [selves, activeId, persist]);
  const selectSelf = useCallback((id: string | null) => persist(selves, id), [selves, persist]);
  const activeSelf = selves.find(s => s.id === activeId) || null;
  return { selves, activeId, activeSelf, loaded, error, saveSelf, removeSelf, selectSelf };
}
