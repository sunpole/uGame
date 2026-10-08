# Resource Master NPC runtime

Current implementation: **v0.2.25 QA candidate**

## Active resource lines

- Stone Master T1–T4.
- Water Master T1–T4.
- Forest Master T1–T4.

Final names/lore remain placeholders.

## Eligibility

WorldGraph `resourceDirections` controls candidates:

- snow = stone + water
- forest = stone + wood
- sand = stone
- south = stone
- safe city = none

## Shared runtime

All resource Master lines share:

- persistent Encounter identity.
- Tier multipliers.
- module rolling.
- relationship state.
- Event Spot occupancy.
- slow facing/wandering.
- REAL TIME Extraction Process.

## Process profiles

- stone extraction → Stone.
- water extraction → Water.
- wood extraction → Wood.

Process startedAt/endsAt remain REAL TIME, reload-safe, offline-completable and claim through the same Master identity.

## Presentation

- stone uses the Tier-driven neutral palette.
- water uses cyan/blue.
- forest uses green.

## DEV

- 8300 = summary of active Stone / Water / Forest Masters.
- 8302/8303/8304 and 8312/8313/8314 remain Stone-specific QA shortcuts.
- 8399 = candidate pools / rotation summary.


## Current Master rewards and Process (v0.2.25)

Four resource lines now exist: Stone, Water, Forest/Wood, Clay, each with T1–T4. `data/master-processes.json` defines a 60-second REAL TIME nominal Extraction Process per resource (capped at Encounter expiry). `Character↔Master` stores `claimedEncounterIds`, `activeProcess`, and `pendingRewards`. Red world-space Phaser dots belong only to unclaimed current Encounters and are destroyed on claim; legacy pending rewards from other Encounters remain separately collectible.

Live Process modal shows REAL TIME countdown, transitioning directly to the matching claim action on completion. Closing the modal never discards the Process/pending result. DEV 8388 targets the last interacted Master, otherwise nearest. The current baseline tests live in `tests/master-loop.test.mjs` (Node built-in test runner; GitHub Actions).

**QA status:** v0.2.19 was the prior user-tested checkpoint; v0.2.20–v0.2.25 require manual browser QA. See `docs/QA-MASTER-LOOP-v0.2.25.md`.

## v0.2.41: Process / индикатор награды

- До запуска Process у ещё не использованного Encounter — красная точка.
- Во время 60-секундного реального Process — красная точка + оставшиеся мм:сс **над ней**.
- После появления pending текущего Encounter — зелёная точка, таймер удаляется.
- После успешного claim текущего Encounter — точка и таймер полностью удаляются вместе с Phaser GameObject/tween.
- Награда **старого** Encounter не должна делать зелёной точку **нового**. При переходах и повторном входе маркеры вычисляются из сохранённой CharacterMasterRelationships.
- DEV 8388 отображает фазу и наличие таймера. В версии без сервера «забрал кто-то» означает получение данным персонажем; общая multiplayer-награда пока не реализована.
