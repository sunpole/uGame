# UGD-0029 — 25-location diamond world and five safe cities

Дата: 2026-10-08  
Тип: world / ui-ux / npc-runtime  
Статус: accepted  
Flags: needs-test, temporary-names  
Теги: world-map, 25-locations, safe-city, city-npc, teleporter, banker, biome, compass

## Принято

1. World baseline = 25 locations.
2. Logical topology = 5×5; World Map renders it as a 45° diamond.
3. Five safe cities: center + N/E/S/W outer tips.
4. Center start city = stone; four directly adjacent field zones = snow.
5. Local location world = 1920×1080, camera viewport ≈ 960×540.
6. Every field map = 12 candidate Event Spots distributed across the expanded area.
7. Safe city = no Event Spot / Dynamic Event / Master, full vision.
8. Every city has Banker + Teleporter + unique biome Guide/Guard.
9. Banker/Teleporter identities are shared across all city copies.
10. Teleporter connects all five cities immediately.
11. World Map shows all 25 rotated tiles, IDs/names/biomes/current location and 8 compass directions.
12. Names are temporary until lore.
13. South field uses brown sand; South city uses white marble.
14. City NPC movement is explicitly deferred; current city NPC are static.

## Version series

- v0.0.99 — local map area ×4 / following camera;
- v0.1.00 — 25-zone WorldGraph;
- v0.1.01 — hard safe-city rules;
- v0.1.02 — 15 city NPC visuals;
- v0.1.03 — expanded texture slots + south assets;
- v0.1.04 — real Bank + five city-guide dialogues;
- v0.1.05 — real five-city teleporter;
- v0.1.06 — 25-tile World Map;
- v0.1.07 — 8-direction compass;
- v0.1.08 — World Map spacing/legend;
- v0.1.09 — First Playable migration;
- v0.1.10 — documentation/audit.

## Invariants preserved

- gameplay timers remain REAL TIME;
- Game Clock remains display-only;
- Location Tier capacity is independent from 12 candidate spots;
- one Event Spot = one active occupant;
- Master caps/rotation/probability are not changed by this world-layout series;
- city service NPC are not Dynamic Event occupants.
