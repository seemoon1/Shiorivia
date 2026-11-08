// Run with Node >=22: node --experimental-strip-types scripts/check-novel-state.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { extractNovelState, parseNovelState, stripNovelState } from "../src/lib/novelState.ts";

const previous = { environment: "傍晚的排练室，微凉", event: "少女们还在争论", nextSceneCastIds: ["sakiko"] };
assert.deepEqual(parseNovelState(previous), previous);
assert.equal(parseNovelState({ environment:"", event:"开始", nextSceneCastIds:[] }), null);
assert.equal(parseNovelState({ environment:"场景", event:"", nextSceneCastIds:[] }), null);
assert.equal(parseNovelState({ environment:"场景", event:"剧情", nextSceneCastIds:"sakiko" }), null);
assert.equal(parseNovelState({ environment:"场景", event:"剧情", nextSceneCastIds:["a",42] }), null);
assert.deepEqual(parseNovelState({ environment:"车站", event:"分别", nextSceneCastIds:["anon","anon","soyo"] })?.nextSceneCastIds, ["anon","soyo"]);
const valid = '<meta title="小说" chapter="第一章" />\n正文\n> **Option 1**: 继续\n<novel_state>' +
  JSON.stringify({ environment:"雨后的车站，气温偏低", event:"两个人道别后走向不同站台", nextSceneCastIds:["anon","soyo"] }) +
  '</novel_state>';
assert.equal(extractNovelState(valid)?.environment, "雨后的车站，气温偏低");
assert.ok(!stripNovelState(valid).includes("novel_state"));
assert.ok(stripNovelState(valid).includes("正文"));
assert.equal(extractNovelState('<novel_state>{"environment":"无效"}</novel_state>'), null);
assert.equal(stripNovelState("正文\n<novel_state>{未结束"), "正文");
assert.deepEqual(extractNovelState(valid + '\n<novel_state>{"bad":true}</novel_state>')?.nextSceneCastIds, ["anon","soyo"]);

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const novel = read("src/components/NovelInterface.tsx");
const api = read("src/app/api/chat/route.ts");
const hook = read("src/hooks/useChatEngine.ts");
const modal = read("src/components/StoryWorldlineFateModal.tsx");
const picker = read("src/components/StoryCastPicker.tsx");
const archive = read("src/components/NovelArchiveActions.tsx");
const docx = read("src/lib/novelDocx.ts");

assert.ok(modal.includes('showEvent?: boolean;') && novel.includes('showEvent={false}'));
assert.ok(novel.includes('Environment · 环境 *') && novel.includes('Event · 当前事件 *'));
assert.ok(!novel.includes('>Scenario</label>') && !novel.includes('>Action / Play</label>'));
assert.ok(novel.includes('readOnly={inputsLocked}') && novel.includes('window.confirm('));
assert.ok(novel.includes('if (!environment.trim() || !event.trim())'));
assert.ok(api.includes('**NOVEL STATE — REQUIRED**'));
assert.ok(api.includes('novelStateRepair === true'));
assert.ok(!api.includes('Worldline event:'));
assert.ok(hook.includes('extractNovelState(fullText)') && hook.includes('stripNovelState(currentText)'));
assert.ok(hook.includes('novelDraft: {') && hook.includes('storyNextCastIds: novelState.nextSceneCastIds'));
assert.ok(picker.includes('AI 会预测下一章登场角色'));
assert.ok(archive.includes('["environment", "event"]') && archive.includes('["scenario", "action"]'));
assert.ok(docx.includes('novel_state'));
console.log("PASS: novel_state parsing, repair isolation, scene/editor sync, chapter cleanup and legacy archive imports.");
