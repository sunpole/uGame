# uGame Project Journal

Purpose: preserve the evolution of uGame's design without turning development into bureaucracy.

The journal records important ideas, hypotheses, decisions, rejected directions, unresolved questions, test requirements and the reasons behind changes. It is intentionally separate from gameplay code and from technical implementation docs.

## What belongs here

Create or update a record when an idea is likely to matter later because it changes or constrains one of these areas:

- core gameplay loop;
- economy or progression;
- time / attention systems;
- world structure;
- combat or interaction model;
- rewards / loot;
- multiplayer / seasons / rating;
- major UI philosophy;
- monetization boundaries;
- project philosophy;
- architectural decisions that materially affect mechanics.

Do not create a record for repeated thoughts, tiny tuning numbers, temporary wording, or every chat message.

## Record shape

Each substantial record should contain:

- id;
- title;
- date;
- status;
- optional flags;
- tags;
- source / context summary;
- idea;
- why it matters;
- benefits;
- risks / contradictions;
- alternatives;
- current direction;
- open questions / what to test later;
- relations to other records;
- change history.

Numbers used during brainstorming are examples unless explicitly accepted.

## Status meanings

- `idea` — worth preserving, not yet evaluated enough to be a working direction.
- `hypothesis` — plausible working direction, still reversible.
- `question` — unresolved question worth tracking.
- `discussing` — current active design discussion.
- `accepted` — explicit project decision.
- `deferred` — intentionally postponed because another area has priority.
- `rejected` — considered and intentionally not used.
- `superseded` — replaced by a newer decision or concept.
- `needs-test` — should be validated through gameplay or user testing.
- `needs-prototype` — should be validated through implementation.
- `needs-calculation` — requires balance / numerical modelling.
- `return-later` — useful, but intentionally parked for a future stage.

Records may use one primary status and optional flags.

## Relations

Use stable record ids such as `UGD-0001`.

Relations in record metadata and `index.json` may use:

- `related`;
- `depends_on`;
- `blocks`;
- `supersedes`;
- `superseded_by`.

Never delete an old concept merely because the direction changed. Preserve the old reasoning and connect the replacement.

## Tags

Tags are lowercase kebab-case. Add them gradually, only when a real record needs them. Avoid prebuilding a giant taxonomy.

## Current truth vs history

`CURRENT.md` is the fast answer to "what do we currently believe / accept?" It must stay short.

`records/` stores the deeper history and alternatives.

`index.json` stores machine-readable metadata so a later static GitHub Pages interface can search and filter records without a server.

## Future GitHub Pages viewer

The intended viewer is static HTML/CSS/JavaScript. It should read `index.json`, fetch Markdown records when opened, and support:

- full-text search;
- filters by status, flag, tag and date;
- combinations such as `economy + accepted` or `combat + idea`;
- links between superseded and replacement records;
- quick display of the current direction.

No CMS or database is required for the first version.
