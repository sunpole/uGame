# uGame — 25-location Diamond World

Current implementation: **v0.1.16**

## Local location geometry

Each local location is a 1920×1080 **playable diamond**.
The rectangular canvas still exists technically, but the four outer corner triangles are masked and blocked.

- `N / E / S / W` = orientation markers only.
- `NW / NE / SW / SE` = the only four real transition directions.
- There are no N/E/S/W portals.

### Opposite-entry rule

- NW → target SE
- NE → target SW
- SW → target NE
- SE → target NW

Logical 5×5 adjacency maps to the rotated diamond as:

- logical east → local SE
- logical west → local NW
- logical south → local SW
- logical north → local NE

## Safe cities

Five safe cities remain hard-safe: full vision, darkness 0, no Event Spots, no Dynamic Events, no resource Masters.

## City NPC

Every city has Banker Boris, Teleporter Aster and one unique Guide/Guard.
From v0.1.14 all city NPC reuse the player's humanoid visual base.

- Banker = wider/heavier.
- Teleporter = taller/thinner.
- Guard = larger + cape + sword + shield.
- Guard palette remains biome-specific.

## Resource Masters

Field Master runtime supports three directions:

- stone → Мастер камня T1–T4
- water → Мастер воды T1–T4
- wood → Мастер леса T1–T4

Snow fields expose stone + water. Forest fields expose stone + wood. Sand/South currently expose stone.

All three lines use the same Encounter / Relationship / Module / REAL TIME Extraction Process runtime.

## Event Spots

Every field location has exactly 12 candidate Event Spots.
v0.1.15 repositions them across the full diamond and guarantees playable-area margin plus wall clearance.
Safe cities keep 0 Event Spots.

Existing rules remain:

- Location Tier controls active capacity, not candidate count.
- weighted anti-repeat remains active.
- `1 spotId = 1 active occupant` remains hard.

## Orientation

World Map still displays N / NE / E / SE / S / SW / W / NW.
All eight are useful orientation terms for quests and player communication.
Only the four diagonal terms correspond to real local gates.
