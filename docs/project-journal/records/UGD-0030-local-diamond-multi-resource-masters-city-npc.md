# UGD-0030 — Local diamond gates, multi-resource Masters and shared humanoid city NPC

Дата: 2026-10-08  
Тип: world / npc-runtime / ui-ux  
Статус: accepted  
Flags: needs-test  
Теги: diamond-zone, diagonal-gates, master-water, master-forest, city-npc, action-ui

## Accepted

- local playable area = diamond.
- only four real gates: NW / NE / SW / SE.
- N / E / S / W are orientation-only.
- target entry is the opposite diagonal gate.
- every field keeps 12 candidate Event Spots inside the diamond with wall clearance.
- interaction hint has its own lane and must not cover Action.
- Water Master T1–T4 added.
- Forest Master T1–T4 added.
- city NPC reuse the player's humanoid visual base.
- banker wider, teleporter taller/thinner, guard larger with cape/sword/shield.

## Version series

- v0.1.11 — local diamond + four diagonal gates.
- v0.1.12 — interaction hint separation.
- v0.1.13 — Water + Forest Master lines.
- v0.1.14 — city NPC player-model redesign.
- v0.1.15 — Event Spot wall-clearance repair.
- v0.1.16 — docs/audit.

## Preserved

- 25-location WorldGraph.
- five hard safe cities.
- REAL TIME gameplay timers.
- Location Tier capacity rules.
- `1 spotId = 1 active occupant`.
- First Playable stable ids.
