# Novel mode · worldline and chapter editor integration (Local)

This change updates **Shiorivia Local**, not Shiorivia_Cloud.

## Novel worldline and cast

- Novel uses the same WORLD / ERA / PERIOD chooser as Story, including mandatory AU baseline ERA/PERIOD.
- Choose the worldline from the novel sidebar, directly above the next-chapter cast selector.
- Next-chapter cast reuses Story's picker, the maximum of six full character biographies, same-world filtering, and optional cross-world setting.
- Novel does **not** emit the Story `<game_state>` protocol. Cast selections remain user-controlled between chapters; no claim is made that the model automatically predicted the next cast.
- The selected cast and worldline are saved on the novel session. Replacing the world with a different world clears the old cast selection and the optional self protagonist.
- Built-in BanG Dream character biographies and Charta's five-section profiles are injected through the same period-aware logic as Story. In AU, the baseline period is the knowledge cutoff.
- A selected optional Charta self protagonist is scoped to the current worldline/baseline; the self is not added as an ordinary cast member. An unbound self receives only unscoped data.
- No worldline means no chapter generation. Older novel saves can still open; they require a worldline selection before a new chapter can be generated.

## Editor and appearance

- Default novel body length is **1000–2000 Chinese characters**. An explicit character count written in Style overrides that default.
- Six plot presets: two everyday, two melancholy, and two emotionally heavy. Presets update scenario/action/style only, not the worldline or cast.
- Novel archive JSON/DOCX import/export lives immediately beneath model selection, with a more legible themed card.
- Default theme for new novels is parchment; older saves explicitly using sage retain it.
- The mini music player's sage theme now uses muted green controls, progress bar and album ring. The Auto DJ toggle has been removed from the novel sidebar; the global Settings music control remains authoritative.

## Local checks

```bash
node scripts/check-novel-mode.mjs
npm run build
```

Manual smoke test matrix:
1. Novel without a worldline refuses generation with a helpful message.
2. Select BanG Dream T-3-4, choose one character, generate and check the terminal request for the time-limited full biography.
3. Set AU current period to an imagined future and baseline to T-3-4; late-canon facts must not appear as existing knowledge.
4. Add a custom Charta world, linked Charta character and linked self; verify their timeline-gated details enter the model prompt.
5. Change worlds; stale cast and self selections should be cleared. Cross-world cast selection requires an explicit opt-in.
6. Export novel JSON, import into a new session, verify worldline, cast, Style, theme and self draft selection.
7. Try a Style field with `3000字` and another with no explicit count; check the two different length instructions.
8. Confirm six presets, archive contrast and miniature player colors under parchment and sage.
9. Check global Auto DJ setting remains available although the novel-specific toggle is absent.
