# Cross-worldline architecture · Shiorivia Local

This applies to **seemoon1/Shiorivia** (Local Edition), not Shiorivia_Cloud.

## Worldline and cast boundaries

- Each Via Lata / Tela session and each new VIAE road has ONE primary WORLD and its current ORIGINAL (canonical) ERA/PERIOD or AU ERA/PERIOD with an explicit original-canon baseline.
- The cross-world switch is **off by default**, now located directly under the primary WORLD selector. Enabling it makes up to THREE other registered worlds available, each with its own required canonical baseline ERA/PERIOD to prevent characters knowing future events from their own lore. The primary world's ERA/PERIOD governs the scene.
- The separate "enable universal characters" switch is only shown within cross-world. It is **off by default**; unbound Charta characters are never added to the eligible cast without it. When enabled, their complete context is included in Story/Tela prompt context even if not part of the six manually chosen next-turn character biographies.
- The NEXT CAST picker no longer owns any cross-world toggle. It displays only characters permitted by the worldline.
- Worldline parsing checks unique world IDs, at most three secondary worlds, and that every secondary ERA/PERIOD baseline is one of that world's canonical stages. Old single-world snapshots remain readable.

## Charta character IDs

- The Charta character form now includes a required **Character ID** directly beneath character naming. It validates the format and case-insensitive uniqueness against built-in and other Charta character IDs, with live availability feedback.
- Character ID is persisted as **characterCode** (human-facing ID). The original immutable **id** (e.g. `charta-...`) remains the machine key in existing session relationships, portraits, archives and message protocols. AI prompts receive both the public character code and the stable machine ID; don't change existing machine references when editing the public character code.
- Previous local JSON files lacking `characterCode` inherit their former stable `id` as a compatible public code. Both client and server validate duplicates on save.

## VIAE routes

- The new VIAE route creation layout is **road type → road name → worldline editor → communication role → world-filtered travelers**. The inline editor uses a minimalist white, slate and warm-gold palette.
- Participant mode is unavailable without the currently active Charta self. Observer can be selected independently.
- VIAE uses the same main/secondary worldline rules; when multiple worlds are enabled, the traveler picker offers an **all worlds** default and per-world filtering. Each traveler shows their origin world. The route-management member add/remove interface also respects world eligibility.
- Each new VIAE `limeGroups[]` entry records `storyWorldline`. The legacy `reality` / `timeline` / `auContext` keys are kept in place for older readers and older saves; a legacy road without a full worldline receives an in-memory Bang Dream fallback instead of a destructive migration.
- On EVERY VIAE AI request, only the group's **fixed member IDs** receive character biographies, scoped to their OWN world's selected canon/AU baseline. VIAE does not depend on Via Lata/Tela next-cast prediction, and receives **no color map**. When in Participant mode, the active Charta self is available as identity context, not a newly invented cast ID.

## Novel behavior

- The novel system prompt requires first-line `<meta title="..." chapter="..." />` on **every chapter**. Similar scene/theme can keep the prior chapter title; a material focus change should use a different chapter title.
- If the provider omits that tag, the chapter engine makes a focused `chapter_title` comparison request and inserts a valid title header, falling back to the previous title/numbered chapter if recovery fails.
- Participant self is a fully narratable character: AI writes natural in-scene speech/actions/reactions/character interiority; user's three next-step suggestions are higher-level editorial direction and must not be required to authorize ordinary exchanges. Keep all reactions in character.

## Suggested local checks

```powershell
git switch main
git pull --ff-only origin main
node scripts/check-cross-world-viae.mjs
node scripts/check-novel-mode.mjs
npx tsc --noEmit
npm run build
```

Manual acceptance: create an original world with two characters, add three secondary worlds with differing cutoffs; verify a fourth cannot be added; switch the universal toggle and check available cast and prompt lore. In VIAE verify world filter and badges, direct/group traveler counts, no-participant-without-self, per-route memory and fixed-member AI lore. Import an old Charta archive and an old VIAE road to confirm they load without changing internal IDs. Re-run a two-chapter DeepSeek novel in Participant mode with an in-scene interaction and confirm title and self reaction.
