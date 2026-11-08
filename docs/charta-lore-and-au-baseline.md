# Charta structured lore + AU baseline (Local Edition)

This feature belongs to **Shiorivia local**. It does not update Shiorivia_Cloud.

## Authoring workflow

1. Create a world in **Charta → World**, then add its ordered ERA/PERIOD timeline. Each PERIOD name is unique within the world.
2. Create a character, bind that character to the correct world, and fill their required **简介**. Original v1 `description` notes are migrated into the new `profile.intro` and are not silently discarded.
3. Optional identity fields include repeatable aliases, hair/eye colors, height, birthday, zodiac sign and repeatable 萌点. Aliases and moe tags are not translated or language-specific.
4. Optional lore fields: personality/behavior, relationships, experiences, and AI portrayal guidelines.
5. Relationships can reference another saved Charta character by ID/name or specify an arbitrary name. Each independent relationship entry can be time-scoped.
6. Experiences offer a large default unscoped text area and additional time-scoped entry cards.
7. For either entry type, an optional start/end picker selects a **consecutive** range in the character's own world's canonical timeline. The editor and local API validate continuity and world membership.

## Runtime semantics

- Stable identity, the introductory biography, personality, AI portrayal guidelines, unscoped relationship notes and unscoped experiences are always sent for selected cast members.
- Scoped relationships and experiences first become available in their **start** period, and remain available as memories in **every later** period. The selected end period describes the authored range, **not** a forgetting date.
- No worldline selected in standalone chat / VIAE means all Charta entries are available; in story mode, unrecognized foreign-origin periods fail closed and omit time-scoped Charta entries.
- Only the selected next-turn cast, maximum six, receives full character biographies in story mode.
- BanG Dream built-in characters continue using the existing four-part `lore_library.ts` and `loreTimeline.ts` approach. Their writing is untouched by this feature.

## AU in story worldline

The story worldline distinguishes **AU current ERA / PERIOD** from mandatory **baseline ERA / PERIOD**.

- The AU current labels and optional event are creative authoring context.
- The baseline must exactly match one entry in the selected world's ordered canonical timeline.
- The baseline, not the creative AU period string, is used to scope built-in BanG Dream histories and Charta character relationships/experiences.
- Original-canon events **after** the baseline are not facts of the AU unless established by ongoing story.
- Worlds without a canonical timeline must create one before an AU baseline can be chosen.
- Older AU snapshots without a baseline remain preserved as saved data. When they cannot be mapped unambiguously, the worldline selector requires the user to select a valid baseline before another story response. The code does not silently invent one.

## Export and migration

- Charta JSON exports are now `version: 2`.
- Imports accept `version: 1` and `version: 2`.
- Legacy profiles' single `description` field maps into `profile.intro`.
- Existing empty legacy records remain readable; the editor requires an intro when a structured profile is edited/saved.
- All character and world data still reside in `data_storage/charta`, separate from session saves.

## Local verification

```bash
node --experimental-strip-types scripts/check-lore-timeline.mjs
node --experimental-strip-types scripts/check-charta-worldline.mjs
npm run build
```

Suggested manual cases: AU baseline at T-3-4 and AU current time labeled “十年后” must still omit T-8-9 original-canon revelations; selecting T-8-9 as the baseline should include the previously authored relationship history. Create a custom-world character with an unscoped intro and two relationship/experience entries, verify that early and late worldline selections change the supplied lore without dropping the default content. Finally, re-open a v1 character and export its structured v2 data.
