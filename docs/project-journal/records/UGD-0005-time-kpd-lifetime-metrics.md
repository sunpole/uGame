# UGD-0005 — Время, КПД и сквозные/сезонные метрики

- Date: 2026-09-16
- Status: discussing
- Flags: needs-calculation, needs-test, return-later
- Tags: attention, rating, seasons, progression, philosophy

## Source / context

A later planning note introduced a distinction between time invested and how effectively that time was used. Two players may spend the same active time but make very different progress.

## Idea

Track at least two different concepts:

1. **Time invested** — a lifetime or long-term measure related to real active presence, potentially connected to «Внимание».
2. **Efficiency / КПД** — a ratio or score describing how much meaningful progression was achieved per unit of active time.

A separate lifetime metric may survive seasons/wipes even if seasonal progression resets.

The final names, formulas and whether «Внимание» itself is the lifetime metric remain unresolved.

## Why it matters

Time and skill/effectiveness are not the same. A system that only rewards hours can encourage grind; a system that only rewards efficiency can discourage slower or less skilled players.

## Benefits

- Makes it possible to recognize both dedication and efficient play.
- Can support optional ladders, seasonal comparisons and personal improvement tracking.
- A permanent account metric can preserve long-term history even when seasonal systems reset.

## Risks / contradictions

- Public efficiency rankings may discourage players who progress slowly.
- Rewarding high КПД directly could make the game stressful and optimization-heavy.
- Progress is not yet defined, so any formula would be premature.
- Different play styles may produce incomparable forms of progress.
- A lifetime score may become misleading if game systems change between seasons.

## Alternatives

- Keep lifetime active time visible but do not rank it.
- Keep КПД private as a personal analytics stat.
- Rank seasonal outcomes but preserve only account history across seasons.
- Create a separate permanent legacy/account resource instead of using «Внимание» itself.
- Use multiple category-specific efficiency metrics instead of one global score.

## Current direction

Preserve the conceptual distinction between **how much real time was invested** and **what was achieved with that time**. Do not yet decide which of these belongs in a competitive leaderboard.

At least one long-term account-level measure that does not reset with seasons is considered desirable, but is not yet accepted as a specific resource.

## What to test / calculate later

- Definition of meaningful progression.
- Whether KPI/KPD should affect rewards or only statistics/rating.
- Fairness across different player skill levels and play styles.
- Seasonal reset model.
- Which metrics remain permanent across wipes/seasons.
- Whether «Внимание» is spendable, historical, or represented by separate current/lifetime counters.

## Relations

- related: UGD-0001, UGD-0006

## Change history

### 2026-09-16
Created from the discussion of equal play time producing unequal progress, lifetime account history and future seasonal/wipe systems.
