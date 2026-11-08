# Novel mode · worldline and chapter editor integration (Local)

This change updates **Shiorivia Local**, not Shiorivia_Cloud.

## Novel worldline and cast

- Novel uses the same WORLD / ERA / PERIOD chooser as Story, including mandatory AU baseline ERA/PERIOD.
- Choose the worldline from the novel sidebar, directly above the next-chapter cast selector.
- Next-chapter cast reuses Story's picker, the maximum of six full character biographies, same-world filtering, and optional cross-world setting.
- Novel does **not** emit Story `<game_state>`. Instead, the novelist ends each chapter with `<novel_state>` containing `environment`, `event`, and `nextSceneCastIds`. AI predicts the next chapter cast; the shared picker shows its prediction and requires confirmation before a manual override after the novel has started.
- The selected cast and worldline are saved on the novel session. Replacing the world with a different world clears the old cast selection and the optional self protagonist.
- Built-in BanG Dream character biographies and Charta's five-section profiles are injected through the same period-aware logic as Story. In AU, the baseline period is the knowledge cutoff.
- A selected optional Charta self protagonist is scoped to the current worldline/baseline; the self is not added as an ordinary cast member. An unbound self receives only unscoped data.
- No worldline means no chapter generation. Older novel saves can still open; they require a worldline selection before a new chapter can be generated.
- Invalid or omitted `<novel_state>` triggers one *state-only* recovery request. On failure, the finished prose and last valid state are preserved; the app warns instead of silently corrupting scene context. New state values and selected cast persist in the session JSON. Legacy `scenario` / `action` values still import as initial Environment / Event.

## Editor and appearance

- Default novel body length is **1000–2000 Chinese characters**. An explicit character count written in Style overrides that default.
- **Environment** (location, weather, temperature, surroundings) and **Event** (what is currently happening) are required before chapter one; Style is optional. When a chapter completes, the AI updates both fields from the completed prose and predicts `nextSceneCastIds`. After the first chapter, manual changes require explicit confirmation.
- Novel worldlines only choose WORLD / ERA / PERIOD / AU baseline: the worldline Event field is hidden for novels; Story mode retains its own worldline Event.
- Six plot presets: two everyday, two melancholy, and two emotionally heavy. Presets update Environment/Event/Style only, not the worldline or cast. Once the novel has started, confirm an override before applying a preset.
- Novel archive JSON/DOCX import/export lives immediately beneath model selection, with a more legible themed card.
- Default theme for new novels is parchment; older saves explicitly using sage retain it.
- The mini music player's sage theme now uses muted green controls, progress bar and album ring. The Auto DJ toggle has been removed from the novel sidebar; the global Settings music control remains authoritative.

## Local checks

```bash
node scripts/check-novel-mode.mjs
node --experimental-strip-types scripts/check-novel-state.mjs
npm run build
```

Manual smoke test matrix:
1. Novel without a worldline refuses generation with a helpful message.
2. Select BanG Dream T-3-4, choose one character, generate and check the terminal request for the time-limited full biography.
3. Set AU current period to an imagined future and baseline to T-3-4; late-canon facts must not appear as existing knowledge.
4. Add a custom Charta world, linked Charta character and linked self; verify their timeline-gated details enter the model prompt.
5. Change worlds; stale cast and self selections should be cleared. Cross-world cast selection requires an explicit opt-in.
6. Generate a chapter and check that <novel_state> is not printed in the reading pane, that Environment/Event update, and that the selected next-chapter cast becomes the AI prediction.
7. Try manually editing the two fields or the predicted cast after the first chapter: each route must require a confirmation.
8. Break the JSON or omit <novel_state> with a model and verify state-only recovery. If repair fails, the previous state must remain intact.
9. Export a novel JSON, import into a new session, verify worldline, novelState, cast, Style, theme and self draft selection. Also import an older JSON with scenario/action.
10. Try a Style field with `3000字` and another with no explicit count; check the two different length instructions.
11. Confirm six presets, archive contrast and miniature player colors under parchment and sage.
12. Check global Auto DJ setting remains available although the novel-specific toggle is absent.
