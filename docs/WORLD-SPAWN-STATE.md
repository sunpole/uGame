# WorldSpawnState / Location Tier runtime

Current implementation: **v0.0.64**

## Scope

This is Stage C from `docs/NEXT-IMPLEMENTATION-PLAN.md`.

The prototype now has a local serializable `WorldSpawnState` for world-level state that must survive reload and zone travel. It is deliberately local/single-player; no backend is introduced.

Source files:

- `src/world-spawn-state-system.js`
- `data/world-spawn-config.json`
- `data/world.json`
- `src/world-graph.js`
- `src/event-spot-system.js`

Persistent snapshot is stored as additive `worldSpawnState` inside Game State schema v1.

## Location Tier

External zones receive persistent Tier-state:

| Tier | Active spawn capacity | Tier-state lifetime | Location bonus |
|---|---:|---:|---:|
| T1 | 2–4 | 120–180 min | +0% |
| T2 | 2–5 | 90–150 min | +20% |
| T3 | 3–6 | 60–120 min | +40% |
| T4 | 5–6 | 60–90 min | +60% |

The Tier-state clock uses **REAL TIME**. Game Clock remains display-only.

Each state stores at least:

- zone id;
- tier / level;
- spawnedAt / expiresAt;
- chosen spawnCapacity;
- locationBonus;
- distanceFromSafeCity;
- biome;
- current resourceDirections;
- balance-status/source.

Reload keeps an unexpired state. It does not provide a free reroll.

## Distance and eligibility

`WorldGraph.distanceFromSafeCity(zoneId)` performs shortest-path distance over graph connections to the nearest zone marked `isSafeCity`.

Current prototype:

- zone-001 Перекрёсток = safe city, distance 0;
- zone-002 Галерея = external, distance 1;
- zone-003 Тёмный сад = external, distance 1;
- zone-004 Сердце руин = external, distance 2.

The next master prototype intentionally starts with one resourceDirection: `stone`. All three external zones currently declare `resourceDirections: ["stone"]`.

## Candidate balance

`data/world-spawn-config.json` contains the currently used distance-band → Location Tier weights.

They are explicitly marked `candidate-balance`. They come from the Simulation Lab v0.2 candidate baseline and are **not final balance**.

No new TEST/MATRIX/DEEP run was started for v0.0.64.

## Dynamic Event capacity migration

External zones now expose six eligible Event/NPC spots and derive desired active slots from Location Tier:

- old Q1/Q2/Q3/Q4 external capacity `1/2/3/5` is no longer authoritative;
- new external capacity comes from the persisted Tier-state;
- each encounter keeps its own ~30-minute Event lifetime;
- a longer Tier-state can contain several encounter refresh cycles.

The safe-city prototype keeps its old event-quality behavior for now because Location Tier applies to external zones.

## DEV QA

- `8400` — reroll current external Location Tier using candidate distance weights;
- `8401` — force T1;
- `8402` — force T2;
- `8403` — force T3;
- `8404` — force T4;
- `8499` — show Tier, graph distance, spawn capacity and remaining lifetime.

These commands modify/persist WorldSpawnState.

## Next accepted stage

Stage C is implemented as a prototype and now requires browser QA.

The next accepted implementation stage is **Stage D — Stone Master NPC runtime** from UGD-0015/UGD-0016. It must not silently invent final NPC probability balance: the current candidate tables remain candidate inputs.
