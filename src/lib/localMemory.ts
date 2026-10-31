/**
 * Local Edition memory remains stored as two plain strings (stm / ltm).
 * This deliberately avoids changing the JSON save format or model prompt protocol.
 */
export const LOCAL_STM_SLOTS = 6;

export function parseLocalMemoryEntries(value?: string | null): string[] {
  if (!value) return [];
  // Legacy memories were newline-delimited and may contain preformatted bullets.
  // Keep every nonblank line; never truncate old saves to the six visible slots.
  return String(value).replace(/\r\n?/g, "\n").split("\n").map((s) => s.trim()).filter(Boolean);
}

export function formatLocalMemoryEntries(entries: string[]): string {
  return entries
    .map((entry) => String(entry || "").replace(/\r\n?/g, "\n").trim().replace(/\n+/g, "； "))
    .filter(Boolean)
    .join("\n");
}

export function latestLocalMemoryEntry(value?: string | null): string {
  const entries = parseLocalMemoryEntries(value);
  return entries[entries.length - 1] || "";
}
