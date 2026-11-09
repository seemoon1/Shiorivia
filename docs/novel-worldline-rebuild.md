# Novel mode · worldline and chapter editor integration (Local)

This change updates **Shiorivia Local**, not Shiorivia_Cloud.

## Novel worldline and cast

- Novel uses the same WORLD / ERA / PERIOD chooser as Story, including mandatory AU baseline ERA/PERIOD.
- Choose the worldline from the novel sidebar, directly above the next-chapter cast selector.
- Next-chapter cast reuses Story's picker, the maximum of six full character biographies, same-world filtering, and optional cross-world setting.
- Novel does **not** emit Story `<game_state>`. Instead, the novelist ends each chapter with `<novel_state>` containing `environment`, `event`, and `nextSceneCastIds`. AI predicts the next chapter cast; the shared picker shows its prediction and requires confirmation before a manual override after the novel has started.
- The selected cast and worldline are saved on the novel session. Replacing the world with a different world clears the old cast selection and the optional self protagonist.
- Built-in BanG Dream character biographies and Charta's five-section profiles are injected through the same period-aware logic as Story. In AU, the baseline period is the knowledge cutoff.
- The **Story Role** card offers Observer (default; user is an outside director) and Participant. Participant is available only with a currently active Charta self compatible with the chosen world; the selected self is snapshotted in the novel session before writing begins and never added as an ordinary cast member. A world-neutral self receives unscoped data. The role locks after writing starts; unlike Via Lata, Tela has no selectable POV. Legacy novel drafts with a `selfId` continue to load as Participant when `storyRole` was not saved.
- No worldline means no chapter generation. Older novel saves can still open; they require a worldline selection before a new chapter can be generated.
- Invalid or omitted `<novel_state>` triggers one *state-only* recovery request. On failure, the finished prose and last valid state are preserved; the app warns instead of silently corrupting scene context. New state values and selected cast persist in the session JSON. Legacy `scenario` / `action` values still import as initial Environment / Event.

## Editor and appearance

- Default novel body length is **roughly 1000–2000 Chinese characters for Chinese prose, or comparable length in the selected UI language**. An explicit character/word count in Style overrides the default.
- **Environment** (location, weather, temperature, surroundings) and **Event** (what is currently happening) are required before chapter one; Style is optional. When a chapter completes, the AI updates both fields from the completed prose and predicts `nextSceneCastIds`. After the first chapter, manual changes require explicit confirmation.
- Novel worldlines only choose WORLD / ERA / PERIOD / AU baseline: the worldline Event field is hidden for novels; Story mode retains its own worldline Event.
- Six plot presets: two everyday, two melancholy, and two emotionally heavy. Presets update Environment/Event/Style only, not the worldline or cast. Once the novel has started, confirm an override before applying a preset.
- Novel archive JSON/DOCX import/export is an **independent card below** the complete AI Architect / Shared Model card. The JSON archive retains session role and self snapshots; old exports keep their legacy self ID fallback.
- Default theme for new novels is parchment; older saves explicitly using sage retain it. The sage palette now uses a warm off-white reading surface, restrained green panels and higher-contrast text/buttons.
- The mini music player's sage theme now uses muted green controls, progress bar and album ring. The Auto DJ toggle has been removed from the novel sidebar; the global Settings music control remains authoritative.
- Until WORLD / ERA / PERIOD (and AU baseline where applicable) is configured, Tela disables its director input, Continue and new-chapter generation and offers a direct link to the worldline editor. Both the chat hook and server also refuse generation without a valid worldline.
- The same optional writing-style optimization now applies to both Via Lata story prose and Tela novel prose, while state-only repairs, summaries, and non-story modes remain excluded. It must never rewrite `<novel_state>` or `<game_state>`.
- Participant self names render in the novel reading view with the same Charta theme-color logic as Via Lata.
- Completed chapters contain one `<novel_choices>{"fun":"...","rational":"...","radical":"..."}</novel_choices>` block before the final `<novel_state>`. The reading view removes the JSON block and shows three clickable suggestions for the latest chapter; older `> **Option 1**:` format also remains readable. DOCX exports remove these choices.
- Every generation saves a per-turn `novelStateBefore` checkpoint of the scene, selected next cast and STM/LTM memory. Deleting or rewriting the latest chapter restores that checkpoint while preserving the user-selected WORLD/ERA/PERIOD, story identity, outline and **Style**. The original scene is also saved in `novelInitialScene` for initial-chapter/old-format fallback. Old archives without snapshots cannot reconstruct arbitrary past AI states.
- `useImageGen=false` suppresses visualizer guidance and explicitly forbids model-produced draw tags; the reading view also hides the drawing action when image generation is disabled.
- The system prompt emphasizes novelistic momentum, non-OOC characterization and scene-based storytelling. Both regular chapter generation and state-only repair explicitly demand user-visible Environment/Event VALUES in the selected UI language; JSON keys and IDs stay stable.

## Local checks

```bash
node scripts/check-novel-mode.mjs
node --experimental-strip-types scripts/check-novel-state.mjs
node --experimental-strip-types scripts/check-tela-novel-improvements.mjs
node --experimental-strip-types scripts/check-tela-story-role.mjs
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
13. On a new novel with no worldline, verify the director input and both generation controls are disabled. Setting a valid worldline unlocks them.
14. In Story Role, Observer has no self injected; Participant is unavailable until a compatible Charta self is active. Select Participant, generate, switch Charta's active self, and verify the novel continues with its snapshotted identity and correct name color. Neither role can be changed after writing begins.
15. Import an older novel archive containing `novelDraft.selfId` but no `storyRole`; verify its selected self is still used and shown if available.
16. Verify style optimization changes the novel's prose instructions without contaminating its `<novel_state>` response or one-shot repair.
17. Confirm the Archive card is visually separate and below the complete AI Architect / Shared Model card.
18. Start with a custom worldline/Environment/Event and selected cast, generate two chapters, delete the latest assistant chapter and verify Environment/Event, next cast, memory and saved draft rewind to their PREVIOUS values. Repeat for the first chapter; the original scene must survive. Style must remain unchanged.
19. Regenerate the last chapter after its state changed and verify the next AI request uses the restored scene rather than the deleted chapter's scene.
20. With image generation OFF, generate with Gemini: verify the model does not emit image control JSON and the reading pane shows no image action. Re-enable and confirm optional on-demand illustration remains available.
21. Switch UI locale among zh-CN/zh-TW/en/ja/ko and verify Environment/Event, three choices and chapter text follow it, while `novel_state` JSON keys remain English.
22. Generate a chapter with three `novel_choices`: cards should be clickable and hidden from literary prose and DOCX. Import an older archive with the three legacy Option lines and verify cards also appear.
23. Compare sage and parchment themes for reading contrast, action controls, chapter list and mobile sidebars.
