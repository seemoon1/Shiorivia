// Run: node scripts/check-tela-interaction-title-transition.mjs
// Source-wiring guard. Full browser smoke tests and tsc/build are still required.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const novel = read("src/components/NovelInterface.tsx");
const story = read("src/components/SidebarRight.tsx");
const page = read("src/app/page.tsx");
const settings = read("src/components/SettingsCenter.tsx");
const engine = read("src/hooks/useChatEngine.ts");
const summarizer = read("src/app/api/summarize/route.ts");
const review = read("src/lib/titleReview.ts");
const mobile = read("src/components/TransitionEffectsMobile.tsx");
const desktop = read("src/components/TransitionEffectsPC.tsx");

assert.ok(novel.includes("编织新篇章"));
assert.ok(!novel.includes("生成新梦境 (New)"));
assert.ok(novel.includes("setPendingNovelChoice(opt)"));
assert.ok(novel.includes('onConfirm={() => {\n                    const choice = pendingNovelChoice;'));
assert.ok(novel.includes('if (choice && !isLoading) handleGenerate("continue", choice)'));
assert.ok(novel.includes("onOptionInsert={(opt: string) => { setDirectorInput(opt)"));
assert.ok(novel.includes('mode="send"'));
assert.ok(story.includes('onClick={() => setConfirmModal({ isOpen: true, text: suggestion })}'));
assert.ok(story.includes('mode="send"'));
assert.ok(story.includes('void handleSend(confirmModal.text)'));
assert.ok(story.includes('onClick={() => setInput?.(suggestion)}'));

assert.ok(novel.includes("!novelWorldline || !activeNovelSelf.worldId"));
assert.ok(novel.includes("storySelfSnapshot: self"));
assert.ok(novel.includes('novelSelf.worldId !== next.worldId'));
assert.ok(novel.includes("保存并锁定"));
assert.ok(novel.includes("saveDraft(); setManualStateEdit(false)"));
assert.ok(novel.includes("disabled={isLoading || !environment.trim() || !event.trim()}"));

assert.ok(review.includes('(userTurns - 1) % 5 === 0'));
assert.ok(review.includes('TITLE_REVIEW_MODES = ["infinite", "sliding", "chat", "novel"]'));
assert.ok(review.includes("session.titleAutoManaged === false"));
assert.ok(engine.includes("mayReviewSessionTitle(currentSession, mode)"));
assert.ok(engine.includes("shouldReviewTitleAtTurn(userTurns)"));
assert.ok(engine.includes("currentTitle: originalTitle"));
assert.ok(engine.includes('session.title !== originalTitle'));
assert.ok(engine.includes('title === "KEEP"'));
assert.ok(summarizer.includes("return exactly KEEP"));
assert.ok(summarizer.includes("[Current title]"));
assert.ok(page.includes('nextMode === "novel"'));
assert.ok(!novel.includes("isUntitledNovel(currentSession.title)"));

assert.ok(page.includes("curtainTransition: true"));
assert.ok(page.includes("curtainTransition: saved.curtainTransition !== false"));
assert.ok(page.includes("setCurtainCycle(value => value + 1)"));
assert.ok(page.includes('if (mode === "novel") triggerCurtain()'));
assert.ok(page.includes("setShowModeHub(true); triggerCurtain()"));
assert.ok(page.includes("onComplete={handleEffectComplete}"));
assert.equal((page.match(/<TransitionEffects key=\{curtainCycle\}/g) || []).length, 3);
assert.ok(settings.indexOf('title={t("settings.transition")}') < settings.indexOf('title="Tela 幕布转场"'));
assert.ok(settings.includes("curtainTransitionEnabled"));
assert.ok(mobile.includes('initial={{ x: "-100%" }}'));
assert.ok(mobile.includes("exit={{ opacity: 1, transition: { duration: 0.75 } }}"));
assert.ok(desktop.includes("exit={{ opacity: 1, transition: { duration: 0.85 } }}"));

console.log("PASS: Tela/story suggestion confirmation, role selection, scene re-lock, title review and curtain controls.");
