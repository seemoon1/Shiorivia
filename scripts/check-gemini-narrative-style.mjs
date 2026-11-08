// Run: node --experimental-strip-types scripts/check-gemini-narrative-style.mjs
import assert from "node:assert/strict";
import {
  GEMINI_NARRATIVE_STYLE_PROMPT,
  shouldApplyGeminiNarrativeStyle,
} from "../src/lib/geminiNarrativeStyle.ts";

assert.ok(GEMINI_NARRATIVE_STYLE_PROMPT.includes("【克制意象与反矫情引擎"));
assert.ok(GEMINI_NARRATIVE_STYLE_PROMPT.includes("【服务于人设的潜台词与直球机制"));
assert.ok(GEMINI_NARRATIVE_STYLE_PROMPT.includes("【情绪起伏与镜头优先级机制"));
assert.ok(GEMINI_NARRATIVE_STYLE_PROMPT.includes("【黄金校准范例"));
assert.ok(GEMINI_NARRATIVE_STYLE_PROMPT.includes("【交互叙事边界】"));
for (const example of ["范例一", "范例二", "范例三"]) {
  assert.ok(GEMINI_NARRATIVE_STYLE_PROMPT.includes(example), "Missing example: " + example);
}
assert.ok(!GEMINI_NARRATIVE_STYLE_PROMPT.includes("Shiorivia"),
  "The model-facing style guide must not reference project internals");
assert.equal(shouldApplyGeminiNarrativeStyle({
  enabled: true, memoryMode: "sliding", stateRepair: false,
}), true);
for (const memoryMode of ["chat", "lime", "infinite", "novel"]) {
  assert.equal(shouldApplyGeminiNarrativeStyle({
    enabled: true, memoryMode, stateRepair: false,
  }), false, "Style must not leak into " + memoryMode);
}
assert.equal(shouldApplyGeminiNarrativeStyle({
  enabled: true, memoryMode: "sliding", stateRepair: true,
}), false, "State recovery must remain a structured task");
assert.equal(shouldApplyGeminiNarrativeStyle({
  enabled: false, memoryMode: "sliding", stateRepair: false,
}), false, "Default-off must not inject the style guide");
console.log("PASS: 5 literary laws, 3 examples, isolated story-only toggle, and structured-repair protection.");
