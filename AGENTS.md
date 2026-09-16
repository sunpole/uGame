# uGame agent guide

This file is the map for project knowledge. It is not the full project history.

## Before changing a game mechanic

1. Read `README.md` for the current implemented prototype.
2. Read `docs/project-journal/README.md` for documentation rules.
3. Search `docs/project-journal/index.json` and `docs/project-journal/records/` by mechanic name, tag and status.
4. Distinguish implemented code, accepted decisions, working hypotheses and brainstorms.
5. If an older idea was replaced, keep it in history and link it through `supersedes` / `superseded_by` instead of deleting it.

## Project journal

Location: `docs/project-journal/`

- `README.md` — rules, statuses, tags and record format.
- `CURRENT.md` — concise map of what is currently accepted or treated as the active working direction.
- `index.json` — machine-readable metadata for future GitHub Pages search/filter UI.
- `records/` — substantial idea / decision records. Do not create one file for every chat message.

## Statuses

Use only the smallest useful set and extend it when needed:

- `idea` — raw idea worth preserving.
- `hypothesis` — plausible working direction, not accepted.
- `question` — unresolved design question.
- `discussing` — actively being explored.
- `accepted` — explicitly accepted decision.
- `deferred` — intentionally postponed.
- `rejected` — considered and intentionally not used.
- `superseded` — replaced by a newer record or decision.
- `needs-test` — needs gameplay/user testing.
- `needs-prototype` — needs implementation experiment.
- `needs-calculation` — needs balance/math work.
- `return-later` — intentionally parked for a later project phase.

A record may have one primary status plus optional flags when useful.

## Tags

Tags are lowercase kebab-case and grow only when needed. Examples currently relevant to uGame include `gameplay`, `platformer`, `idle`, `economy`, `attention`, `impulse`, `progression`, `rewards`, `loot`, `combat`, `world`, `locations`, `portals`, `procedural-generation`, `npc`, `quests`, `seasons`, `rating`, `multiplayer`, `ui`, `technical`, `lore`, `philosophy`, `sunday`, and `monetization`.

Do not create tags merely because they might be useful someday.

## Updating documentation

Update the journal when a discussion produces a meaningful new hypothesis, explicit decision, rejection, contradiction, change of direction, or important design rationale.

Do not interrupt brainstorming to document every intermediate thought. Summarize only durable information that will help future development answer questions such as:

- Why is this mechanic designed this way?
- Did we already discuss a similar idea?
- What alternatives were rejected or deferred?
- What is currently accepted about this mechanic?

When a decision changes:

1. keep the old record;
2. mark it `superseded` when appropriate;
3. create or update the newer record;
4. add the reason for the change;
5. update `CURRENT.md` and `index.json`.

## Authority rule

Brainstorming is never automatically an accepted decision. A decision is `accepted` only when the project owner explicitly accepts it or clearly asks to proceed with it as the project direction.

Implementation does not automatically prove a permanent design decision either: prototypes may exist to test a hypothesis.
