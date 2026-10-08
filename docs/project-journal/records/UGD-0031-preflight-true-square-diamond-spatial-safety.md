# UGD-0031 — Pre-flight boot gate, true square diamond and spatial safety

Дата: 2026-10-08  
Тип: architecture / world / performance / qa  
Статус: accepted  
Flags: needs-test  
Теги: preflight, boot, diamond, performance, walls, spawn-clearance, city-npc

## Accepted

- game screen is hidden until pre-flight checks are green;
- pre-flight covers all runtime JS modules and JSON data files;
- local world canvas = 1920×1920;
- playable map = true square rotated 45°;
- real gates remain NW / NE / SW / SE only;
- N / E / S / W remain orientation-only;
- field walls use ±45° rotation;
- walls keep ≥100 px geometric clearance from entries and Event Spots;
- Event Spots keep ≥250 px from diagonal entries;
- city NPC visual scale is intentionally about ×3 from the previous prototype;
- movement loop reduces unnecessary per-frame DOM/SVG/work allocations.

## Version series

- v0.1.20 — blocking pre-flight loading gate;
- v0.1.21 — true 1920×1920 square diamond;
- v0.1.22 — movement/runtime performance pass;
- v0.1.23 — city NPC landmark scale ×3;
- v0.1.24 — ±45° walls + 100 px clearance;
- v0.1.25 — Event Spot / gate buffer increased to 250 px;
- v0.1.26 — pre-flight expanded to every runtime JS/JSON file;
- v0.1.27 — docs/audit.

## Preserved

- 25-location world;
- five hard safe cities;
- four diagonal gates only;
- REAL TIME gameplay timers;
- Stone / Water / Forest Masters;
- 12 candidate spots per field;
- 1 spotId = 1 active occupant;
- First Playable stable ids.
