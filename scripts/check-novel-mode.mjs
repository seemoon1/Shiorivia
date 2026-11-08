// Run: node scripts/check-novel-mode.mjs
// Static wiring regression check. npm run build + browser interaction are still required.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const novel = read("src/components/NovelInterface.tsx");
const api = read("src/app/api/chat/route.ts");
const engine = read("src/hooks/useChatEngine.ts");
const page = read("src/app/page.tsx");
const cast = read("src/components/StoryCastPicker.tsx");
const archive = read("src/components/NovelArchiveActions.tsx");
const player = read("src/components/MiniPlayer.tsx");

assert.match(novel, /<StoryWorldlineFateModal elevated/);
assert.match(novel, /<StoryCastPicker session=\{currentSession\}/);
assert.match(novel, /mode="novel" tone=\{themeMode\}/);
assert.match(novel, /customSelves\.filter/);
assert.match(novel, /selfId:novelSelfId/);
assert.equal((novel.match(/\{ name: "/g) || []).length, 6, "Six balanced plot presets are required");
assert.ok(!novel.includes("Auto DJ"));
assert.ok(!novel.includes("setUseMusicControl"));
assert.match(novel, /useState<'sage' \| 'paper'>\('paper'\)/);
assert.ok(novel.indexOf("<NovelArchiveActions") > novel.indexOf("AI Architect · Shared Model"));
assert.ok(novel.indexOf("世界线 · WORLDLINE") < novel.indexOf("<StoryCastPicker"));
assert.ok(novel.includes("onBlur={() => saveDraft()}"));
assert.match(archive, /tone\?: "paper" \| "sage"/);
assert.match(archive, /actionStyle/); // themed import/export contrast
assert.match(player, /discStyle/);

assert.ok(cast.includes('mode?: "story" | "novel"'));
assert.ok(page.includes("storyWorlds={worldLibrary.worlds}"));
assert.ok(page.includes("customSelves={selfLibrary.selves}"));
assert.ok(engine.includes('currentSession.memoryMode === "novel") && !parseStoryWorldline'));
assert.ok(engine.includes('novelSelf: typeof configOverride?.novelConfig?.selfId'));
assert.ok(engine.includes('storyNextCastIds: currentSession.storyNextCastIds ?? currentSession.novelDraft?.selectedCharIds ?? []'));
assert.ok(api.includes("const novelWorldline = parseStoryWorldline(body.storyWorldline)"));
assert.ok(api.includes("memoryMode === \"sliding\" || memoryMode === \"novel\""));
assert.ok(api.includes("const basePeriod = worldline.kind === \"au\" ? worldline.basePeriod"));
assert.ok(api.includes("[NOVEL PROTAGONIST — user-authored character data]"));
assert.ok(api.includes("Default: approximately 1000–2000 Chinese characters"));
assert.ok(api.includes("Follow the user's explicit word-count instruction in Style"));
assert.ok(!api.includes('profiles || "${memoryMode')); // no accidental literal template
console.log("PASS: Novel worldline/cast/self lore, archive, theme, presets and chapter-length wiring.");
