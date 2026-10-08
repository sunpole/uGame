# Resource Master NPC runtime

Current implementation: **v0.1.16**

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
