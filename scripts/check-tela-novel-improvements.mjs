// Run with Node 24: node --experimental-strip-types scripts/check-tela-novel-improvements.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { extractNovelSuggestions, stripNovelSuggestions, parseNovelSuggestions } from "../src/lib/novelSuggestions.ts";
import { snapshotNovelState, restoreNovelState } from "../src/lib/novelStateRecovery.ts";

const scene = { environment: "傍晚的排练室", event: "祥子正在整理乐谱", nextSceneCastIds: ["sakiko", "mutsu"] };
const session = {
  id: "tela-test", title: "Original story", memoryMode: "novel",
  storyWorldline: { worldId: "bang-dream", era: "ERA", period: "PERIOD" },
  storyRole: "observer", messages: [],
  storyNextCastIds: ["sakiko", "mutsu"], storyAllowCrossWorld: false,
  novelDraft: { selectedCharIds: ["sakiko", "mutsu"], environment: scene.environment,
    event: scene.event, style: "慢热、心理细腻", outline: "原创剧情", themeMode: "sage" },
  stm: "记忆", ltm: "长记忆", turnCount: 2,
};
const before = snapshotNovelState(session, scene);
const advanced = {
  ...session, novelState: { environment: "雨后的街道", event: "告别", nextSceneCastIds: ["mutsu"] },
  storyNextCastIds: ["mutsu"], stm: "新记忆", ltm: "新长记忆", turnCount: 3,
  novelDraft: { ...session.novelDraft, environment: "雨后的街道", event: "告别", style: "保留这段全局风格" },
};
const restored = restoreNovelState(advanced, before);
assert.deepEqual(restored.storyWorldline, session.storyWorldline, "User worldline must survive rewind");
assert.equal(restored.novelState, undefined);
assert.equal(restored.novelDraft.environment, scene.environment);
assert.equal(restored.novelDraft.event, scene.event);
assert.deepEqual(restored.storyNextCastIds, ["sakiko", "mutsu"]);
assert.equal(restored.novelDraft.style, "保留这段全局风格", "Style must never rewind");
assert.equal(restored.novelDraft.outline, "原创剧情");
assert.equal(restored.stm, "记忆");
assert.equal(restored.ltm, "长记忆");
assert.equal(restored.turnCount, 2);
const legacy = restoreNovelState({ ...advanced, novelInitialScene: scene }, undefined);
assert.equal(legacy.novelDraft.environment, scene.environment);
assert.equal(legacy.novelDraft.event, scene.event);
assert.equal(legacy.novelState, undefined);
assert.equal(legacy.novelDraft.style, "保留这段全局风格");

const options = { fun: "祥子发现了一个荒唐但可行的线索", rational: "先检查排练记录", radical: "直接当面质问" };
const block = "<meta title=\"故事\" chapter=\"第一章\" />\n真实正文\n<novel_choices>" + JSON.stringify(options) + "</novel_choices>";
assert.deepEqual(extractNovelSuggestions(block), options);
assert.ok(!stripNovelSuggestions(block).includes("novel_choices"));
assert.ok(stripNovelSuggestions(block).includes("真实正文"));
assert.equal(parseNovelSuggestions({ ...options, radical: "" }), null);
const old = "真实正文\n> **Option 1**: 意料之外\n> **Option 2**: 冷静规划\n> **Option 3**: 冒险尝试";
assert.deepEqual(extractNovelSuggestions(old), { fun: "意料之外", rational: "冷静规划", radical: "冒险尝试" });
assert.equal(stripNovelSuggestions(old), "真实正文");

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const tela = read("src/components/NovelInterface.tsx");
const hook = read("src/hooks/useChatEngine.ts");
const api = read("src/app/api/chat/route.ts");
const docx = read("src/lib/novelDocx.ts");
assert.ok(tela.includes("extractNovelSuggestions(clean)"));
assert.ok(tela.includes("disabled={disabled}"));
assert.ok(tela.includes("useImageGen && parseDrawTag"));
assert.ok(tela.includes("bg-[#f1f4ee]"));
assert.ok(hook.includes("novelStateBefore: snapshotNovelState"));
assert.ok(hook.includes("restoreNovelState(s, fallback)"));
assert.ok(hook.includes("rewindNovelTurn(keptMessages"));
assert.ok(hook.includes('s.memoryMode === "novel"'));
assert.ok(hook.includes('s.messages.some((message: any) => message.storyGenerationId === generationId)'));
assert.ok(api.includes("finalSystemPrompt = useImageGen ? VISUAL_INSTRUCTION"));
assert.ok(api.includes("Image generation is DISABLED"));
assert.ok(api.includes("[ROLE / NARRATIVE CRAFT]"));
assert.ok(api.includes("OUTPUT_LANGUAGE_NAME[normalizeLocale(body.uiLanguage)]"));
assert.ok(api.includes("<novel_choices>"));
assert.ok(api.includes("All user-visible JSON string VALUES"));
assert.ok(docx.includes("stripNovelSuggestions(source)"));
console.log("PASS: Tela rewind, Style preservation, multilingual protocol, image gate, structured/legacy choices, DOCX cleanup.");
