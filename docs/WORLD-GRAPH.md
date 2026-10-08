# WorldGraph

Current implementation: **v0.1.16**

## Current graph

- 25 stable location ids.
- 5 safe cities.
- 20 field locations.
- 80 directed transitions.
- logical 5×5 adjacency.
- local diamond presentation.

## Transition rule

A local zone has at most four real transition sides: `NW / NE / SW / SE`.
`N / E / S / W` are orientation-only and never create portals.

Opposite-entry invariant:

- NW → SE
- NE → SW
- SW → NE
- SE → NW

Rotated logical-grid mapping:

- col + 1 → SE
- col - 1 → NW
- row + 1 → SW
- row - 1 → NE

## Legacy entry aliases

For save migration only:

- left → NW
- right → SE
- top → NE
- bottom → SW

These aliases do not create extra exits.

## ZoneSystem runtime

ZoneSystem masks the four non-playable canvas corners, draws the diamond border, shows N/E/S/W orientation markers, creates only diagonal portals, places the player at the resolved diagonal entry, then loads walls and interactables.

Movement also checks the diamond boundary, so the player cannot walk into the masked corners.

## QA invariants

- transition sides are only NW/NE/SW/SE.
- target entry is always the opposite diagonal.
- max four exits per location.
- field Event Spots stay inside the diamond.
- city Event Spot count stays zero.
