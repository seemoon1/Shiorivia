"use client";

/** Original-stage labels adapted from the Tsukinomiya timeline selector.
 *  Descriptions are intentionally visible ONLY within this select control.
 *  Persist just the timeline ID (for example "5-6").
 */
export const VIAE_TIMELINES = [
  { value: "0-1", description: "早年 · 童年时期" },
  { value: "1-2", description: "CRYCHIC · 活跃时期" },
  { value: "2-3", description: "CRYCHIC · 解散之后（雨）" },
  { value: "3-4", description: "MyGO!!!!! · 结成时期" },
  { value: "4-5", description: "MyGO!!!!! · 矛盾与暂时分离" },
  { value: "5-6", description: "MyGO!!!!! · 重聚之后（诗超绊）" },
  { value: "6-7", description: "Ave Mujica · 成立与出道" },
  { value: "7-8", description: "Ave Mujica · 假设的解散时期" },
  { value: "8-9", description: "Ave Mujica · 重组与和解" },
  { value: "9-10", description: "Future · 后日谈与未来" },
] as const;

/** Legacy or manually entered IDs remain selectable without rewriting stored data. */
export function ViaeTimelineSelect({ value, onChange, className = "" }: {
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  const known = VIAE_TIMELINES.some(item => item.value === value);
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={className} aria-label="选择原作时间线">
      {!known && <option value={value}>T-{value} · 已保存的自定义时间线</option>}
      {VIAE_TIMELINES.map(item => (
        <option key={item.value} value={item.value}>T-{item.value} · {item.description}</option>
      ))}
    </select>
  );
}
