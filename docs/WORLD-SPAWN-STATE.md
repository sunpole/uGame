# WorldSpawnState / Location Tier runtime

Current implementation: **v0.0.72**

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

No new TEST/MATRIX/DEEP run was started for v0.0.64–v0.0.72. Candidate Location/Master tier tables remain prototype inputs, not final balance.

## Dynamic Event capacity migration

External zones now expose six eligible Event/NPC spots and derive desired active slots from Location Tier:

- old Q1/Q2/Q3/Q4 external capacity `1/2/3/5` is no longer authoritative;
- new external capacity comes from the persisted Tier-state;
- each encounter keeps its own ~30-minute Event lifetime;
- a longer Tier-state can contain several encounter refresh cycles.

The safe-city prototype keeps its old event-quality behavior for now because Location Tier applies to external zones.

## Stone Master registry since v0.0.66

Current Stone prototype defines four persistent master identities:

- Stone Master T1 → ×1.00;
- Stone Master T2 → ×1.20;
- Stone Master T3 → ×1.40;
- Stone Master T4 → ×1.60.

Every external Stone-eligible zone can hold one current Stone Master Encounter inside the same total Event/NPC capacity. Encounter lifetime is ~30 real minutes and is independent from the longer Location Tier-state.

High-tier allocator rules:

- T4 ≤ 1 active Stone instance world-wide;
- T3 ≤ 2;
- T2 ≤ 3;
- caps are maxima, not target counts;
- failed high-tier allocation falls back instead of leaving the encounter slot empty;
- each `stone:T2/T3/T4` has independent rotation round/visited coverage;
- spawn instance, spot, requested/final Tier, active modules and allocation audit are persisted.

## Persistent location intelligence

Since v0.0.65 Game Chrome always exposes the current zone's Location Tier, graph distance from safe city, probability of the currently rolled Location Tier and location bonus. Full T1–T4 distance-band weights remain available as tooltip/DEV data.

## DEV QA

- `8400` — reroll current external Location Tier using candidate distance weights;
- `8401` — force T1;
- `8402` — force T2;
- `8403` — force T3;
- `8404` — force T4;
- `8499` — show Tier, graph distance, spawn capacity and remaining lifetime.

These commands modify/persist WorldSpawnState.

## Master QA

- `8300` — Stone Master registry/counts;
- `8302/8303/8304` — active T2/T3/T4 zone lists;
- `8312/8313/8314` — teleport/cycle to active T2/T3/T4;
- `8399` — candidate pools and rotation coverage.

`Project Hub → Инструменты → DEV World Analyzer` exposes the same runtime registry with filters, Location context, candidate pools, rotation and one-click teleport.

## Current next stage

Stages C, D and E now have live prototypes. v0.0.72 also persists Tier-driven module availability (`Extraction` guaranteed; 2–3 / 3–4 / 4–6 / all).

The next accepted content-first step is a real **Stone Extraction / Process** module. Module availability is not the same as functional implementation.
