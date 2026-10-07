# Audit — v0.0.94–v0.0.97 Event Spot placement variety

Дата: 2026-10-07

## Scope

- v0.0.94 — 12 candidate spots on every current map;
- v0.0.95 — generic Event weighted anti-repeat;
- v0.0.96 — Master weighted anti-repeat;
- v0.0.97 — documentation/audit.

## Static world-data check

All four current zones contain exactly 12 Event Spot ids. No duplicate spot ids were found. No candidate spot center lies inside a configured wall rectangle.

## Active capacity remains separate

12 candidate spots do not mean 12 active objects. External active count remains Location Tier capacity 2–6, including Master occupants.

## Anti-repeat profile

Recent history length: 6. Weights from newest to older recent entries: 0.15 / 0.30 / 0.50 / 0.70 / 0.85, then 1.00.

This is probabilistic. A repeated spot is allowed and therefore one repeat is not a bug.

## Manual QA

1. Update/run v0.0.97 with Spawn Zone Debug ON.
2. Visually confirm 12 candidate circles on the map.
3. DEV 8298 → expect occupancy conflicts 0.
4. DEV 8297 → inspect recent generic spot history.
5. Rebuild/wait through several generic Event refreshes; expect varied spot ids with occasional repeats possible.
6. Observe several Master Encounter replacements over time/DEV workflow; expect lower immediate spot repetition.
7. Confirm active object count still matches Location Tier capacity, not 12.
8. Confirm no Master and generic Event share the same circle.

## Candidate status

12 spots is the current prototype baseline. Anti-repeat weights are candidate-QA and may be tuned after visual observation.
