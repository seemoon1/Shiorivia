// Run with: node --experimental-strip-types scripts/check-lore-timeline.mjs
// Self-contained regression test for the four-section lore format and period-gated extraction.
import assert from "node:assert/strict";
import { LORE_LIBRARY } from "../src/data/lore_library.ts";
import { bangDreamPeriodIndex, loreForBangDreamPeriod } from "../src/lib/loreTimeline.ts";

assert.equal(bangDreamPeriodIndex("T-0-1"), 0);
assert.equal(bangDreamPeriodIndex("5-6"), 5);
assert.equal(bangDreamPeriodIndex("T-9-10"), 9);
assert.equal(bangDreamPeriodIndex("T-10-11"), null);
assert.equal(bangDreamPeriodIndex("T-7-9"), null);

const ids = ["tomori", "anon", "soyo", "taki", "rana", "uika", "mutsu", "umiri", "nyamu", "sakiko", "mana"];
for (const id of ids) {
  const source = LORE_LIBRARY[id];
  assert.ok(source, `Missing biography: ${id}`);
  for (let stage = 0; stage <= 9; stage++) {
    const result = loreForBangDreamPeriod(source, `T-${stage}-${stage + 1}`);
    assert.ok(result.includes("### 【基础身份与称呼】"), `${id} identity missing`);
    assert.ok(result.includes("### 一、主要性格与行为逻辑"), `${id} personality missing`);
    assert.ok(result.includes("### 四、AI还原角色注意事项"), `${id} guidance missing`);
    const history = result.split("### 三、主要经历")[1]?.split("### 四、")[0] || "";
    for (let previous = 0; previous <= stage; previous++) {
      assert.ok(history.includes(`[T-${previous}-${previous + 1}]`),
        `${id} at stage ${stage}: missing history for stage ${previous}`);
    }
    for (let future = stage + 1; future <= 9; future++) {
      assert.ok(!history.includes(`[T-${future}-${future + 1}]`),
        `${id} at stage ${stage}: future history ${future} leaked`);
    }
  }
}

const headings = [
  "### 【基础身份与称呼】\nProfile",
  "### 一、主要性格与行为逻辑\nPersonality",
  "### 二、核心人物关系（随时间线动态变化）\n#### A\n[T-0-6] **Early**：childhood memory\n[T-6-8] **Later**：future relationship",
  "### 三、主要经历（按时间线严格对应）\n[T-0-1] **Childhood**\n[T-8-9] **Reunion**",
  "### 四、AI还原角色注意事项（情境化倾向指南）\nStyle",
].join("\n\n");

const early = loreForBangDreamPeriod(headings, "T-1-2");
assert.ok(early.includes("childhood memory"));
assert.ok(!early.includes("future relationship"));
assert.ok(!early.includes("**Reunion**"));

const late = loreForBangDreamPeriod(headings, "T-8-9");
assert.ok(late.includes("childhood memory"), "Past relationships do not expire");
assert.ok(late.includes("future relationship"));
assert.ok(late.includes("**Reunion**"));

const invalid = loreForBangDreamPeriod(headings, "wrong");
assert.ok(!invalid.includes("childhood memory"));
assert.ok(!invalid.includes("**Reunion**"));
assert.ok(invalid.includes("Profile") && invalid.includes("Style"));

console.log("Lore timeline check passed: 11 characters × 10 stages, cumulative relations and future-event gating.");
