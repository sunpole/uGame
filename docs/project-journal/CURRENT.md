# uGame — current design directions

Updated: 2026-09-16

This file is intentionally short. It points to the current state of important design topics; details and history live in `records/`.

## Explicitly accepted so far

- The project journal system itself is part of the repository documentation workflow.
- Brainstorming is not an accepted decision unless explicitly confirmed.
- The working resource/currency name **«Внимание» ⚠** is associated with real active human play time; the name is temporary.
- «Внимание» is account-bound / non-transferable.

## Active working hypotheses

- uGame should respect player time and avoid designing progression around mandatory multi-hour daily grind.
- Short meaningful sessions should usually be more efficient than very long repetitive sessions.
- **«Импульс»** is a working concept for a recoverable account resource/state that regulates effective use of active play and possibly the generation/use of «Внимание».
- Rest duration, previous session duration and a special weekly rest cycle may affect Impulse recovery and capacity.
- Sunday is being explored as a rest/recovery-oriented day. Important unresolved tension: it should remain safe to skip entirely, while an optional idle/preparation layer may still exist.
- The broader game direction currently combines an active platformer/RPG exploration layer with an idle/economic automation layer.
- Static locations may coexist with dynamic routes, portals and rotating activity points.
- Combat is deliberately not fixed yet; simpler systems are preferred for early prototypes.
- Rewards/loot are expected to become table-driven and probabilistic, but the economy is not yet designed.
- A future efficiency/KPD metric may compare progression achieved against active time, but fairness risks are unresolved.

## Priority now

Current implementation work remains much earlier than these economy/meta systems. The journal preserves these directions so future mechanics do not accidentally contradict them.

## Relevant records

- `UGD-0001` — Attention, Impulse and short-session economy.
- `UGD-0002` — Sunday as rest/recovery design.
- `UGD-0003` — active platformer + idle economy hybrid.
- `UGD-0004` — world, locations, portals and rotating activities.
- `UGD-0005` — time history, KPD and seasonal/lifetime metrics.
- `UGD-0006` — combat and reward-system directions.
