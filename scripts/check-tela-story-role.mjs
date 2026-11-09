// Tela identity and worldline safeguards. Run: node --experimental-strip-types scripts/check-tela-story-role.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { shouldApplyGeminiNarrativeStyle } from "../src/lib/geminiNarrativeStyle.ts";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const tela = read("src/components/NovelInterface.tsx");
const engine = read("src/hooks/useChatEngine.ts");
const api = read("src/app/api/chat/route.ts");
const page = read("src/app/page.tsx");

// Only the two prose-producing modes receive narrative direction.
for (const mode of ["sliding", "novel"]) {
  assert.equal(shouldApplyGeminiNarrativeStyle({ enabled: true, memoryMode: mode }), true);
  assert.equal(shouldApplyGeminiNarrativeStyle({ enabled: true, memoryMode: mode, stateRepair: true }), false);
  assert.equal(shouldApplyGeminiNarrativeStyle({ enabled: true, memoryMode: mode, novelStateRepair: true }), false);
}
for (const mode of ["chat", "lime", "infinite", "novel_chapter"]) {
  assert.equal(shouldApplyGeminiNarrativeStyle({ enabled: true, memoryMode: mode }), false);
}
assert.equal(shouldApplyGeminiNarrativeStyle({ enabled: false, memoryMode: "novel" }), false);
assert.ok(api.includes("novelStateRepair: body.novelStateRepair"));
assert.ok(api.includes("novelParticipant && body.novelSelf == null"));
assert.ok(api.includes("[NOVEL STORY ROLE — OBSERVER]"));
assert.ok(api.includes("[NOVEL STORY ROLE — PARTICIPANT]"));

// Worldline gate exists in UI AND engine AND server; not merely visual.
assert.ok(tela.includes("disabled={isLoading || !novelWorldline}"));
assert.ok(tela.includes("请先设定世界线，才能开始或续写小说"));
assert.ok(engine.includes('currentSession.memoryMode === "novel") && !parseStoryWorldline'));
assert.ok(api.includes("if (!novelWorldline) return new Response("));

// Identity: chosen BEFORE starting, fixed for a session, inherited from active Charta self.
assert.ok(tela.includes("故事身份 · STORY ROLE"));
assert.ok(tela.includes('updateNovelRole("observer")') && tela.includes('updateNovelRole("participant")'));
assert.ok(tela.includes("disabled={isLoading || novelStarted || !canParticipate}"));
assert.ok(tela.includes("storySelfSnapshot: self"));
assert.ok(!tela.includes('htmlFor="novel-self-select"'));
assert.ok(page.includes("activeNovelSelf={selfLibrary.activeSelf}"));
assert.ok(engine.includes("storySelfSnapshot || customSelves.find"));
assert.ok(engine.includes('novelSelf: storyRole === "participant"'));
assert.ok(tela.includes("smartColorize(part, selfColors)"));
assert.ok(tela.includes("selfColors={selfColors}"));
assert.ok(tela.includes("currentSession.novelDraft?.selfId")); // legacy import

// The archive is a sibling *after* the shared model card.
const model = tela.indexOf("AI Architect · Shared Model");
const saveToDisk = tela.indexOf("onClick={onManualSync}", model);
const archive = tela.indexOf("<NovelArchiveActions", model);
const worldline = tela.indexOf("世界线 · WORLDLINE", model);
assert.ok(model >= 0 && model < saveToDisk && saveToDisk < archive && archive < worldline);
console.log("PASS: Tela worldline gate, story role, identity, archive layout, narrative style and legacy self ID.");
