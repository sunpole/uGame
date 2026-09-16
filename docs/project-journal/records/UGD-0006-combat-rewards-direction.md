# UGD-0006 — Направления боя и системы наград

- Date: 2026-09-16
- Status: deferred
- Flags: return-later, needs-prototype, needs-calculation
- Tags: combat, rewards, loot, gameplay, progression

## Source / context

Combat is intentionally not being designed as a full real-time platformer combat system yet. Rewards are expected to be broad and data-driven, but their economy is still undefined.

## Combat ideas under consideration

- simple timing/indicator mini-game;
- automatic combat;
- turn-based combat;
- special event interactions such as chase, escape, hiding, traps or concentration challenges;
- real-time combat remains possible later but is currently considered substantially more complex.

## Current combat direction

Do not force a final combat system into the current movement/world prototype. Prefer simple experiments first. Combat remains a separate future design problem.

## Reward-system idea

A future reward system may use containers/chests/cases or lore-appropriate equivalents generated from data tables.

Possible generated contents include:

- currencies;
- equipment;
- materials;
- valuables;
- trade/sale items;
- special resources;
- other content-specific rewards.

Different reward tables may eventually exist for events, seasons, achievements, chests, mode-specific outcomes and other contexts.

## Why it matters

Combat complexity and reward economy can dominate the whole game if fixed too early. Both systems should remain modular enough to evolve after the core movement, interaction and world loop is proven.

## Benefits

- Keeps the early prototype focused.
- Allows later comparison of multiple combat models.
- Data-driven loot tables are compatible with rotating activities and many reward sources.
- Reward generation can later integrate Impulse/Attention without hard-coding those relationships now.

## Risks / contradictions

- Random rewards can become excessive or feel casino-like if not carefully framed and balanced.
- Too many reward types can create currency clutter.
- Automatic combat may weaken the active layer.
- Timing mini-games may become repetitive.
- Rewarding daily login would conflict with the no-FOMO/rest philosophy if implemented as mandatory collection.

## Alternatives

Combat alternatives remain open and may coexist in different activity types.

Reward alternatives include deterministic progression rewards, choice-based rewards, crafting materials, milestone unlocks and reduced reliance on random containers.

## What to test later

- Minimum viable combat interaction.
- Whether different activities can use different encounter mechanics.
- Data schema for reward tables.
- Randomness vs deterministic guarantees.
- Relationship between rewards, Impulse, Attention and session length.
- Whether login-based rewards should be replaced by automatic rested-state benefits.

## Relations

- related: UGD-0001, UGD-0003, UGD-0004, UGD-0005

## Change history

### 2026-09-16
Created as a deferred design record. No combat model or loot economy is accepted yet.
