# Audit — v0.0.99–v0.1.10 Diamond World / Safe Cities

Дата: 2026-10-08

## Scope

- local map expansion ×4;
- 25-location WorldGraph;
- 5 safe cities / 20 fields;
- 12 candidate Event Spots per field;
- safe-city no-event/full-vision rules;
- 15 city service NPC;
- Bank / Teleport / Guide functions;
- expanded biome texture slots;
- South field/city textures;
- 25-tile World Map + compass;
- First Playable migration.

## Static checks completed

Confirmed:

- zones = 25;
- unique stable zone ids = 25;
- directed transitions = 80;
- safe cities = 5;
- field zones = 20;
- every field zone has exactly 12 Event Spots;
- every safe city has 0 Event Spots;
- every safe city has exactly 3 city-service NPC;
- every safe city has full vision / darkness 0;
- all four direct field neighbors of loc-00013 are snow;
- 12 biome/city texture slots exist;
- no current Event Spot center lies inside a configured wall rectangle.

## Manual QA required

Static review does not replace browser gameplay.

### Local maps / transitions

1. Walk across a 1920×1080 field and confirm camera follow.
2. Enter zones from left/right/top/bottom and confirm spawn near the matching edge.
3. Confirm walls and portals remain aligned while camera scrolls.

### Safe cities

Test loc-00001 / 00005 / 00013 / 00021 / 00025:

1. full vision;
2. no Event Spots / Dynamic Event / Master;
3. exactly Boris, Aster and the unique guard.

### NPC services

1. Boris opens Bank.
2. Aster lists 5 cities.
3. Current city is disabled.
4. Another city teleports to its center.
5. Each guard opens its own dialogue.

### Textures

1. South field = brown sand.
2. South city = white marble.
3. snow/forest/stone/sand resolve without missing floor.
4. camera scrolling never exposes an uncovered floor area.

### World Map

1. Project Hub → Карта мира shows 25 tiles.
2. N/E/S/W cities and center city are in expected places.
3. current location is highlighted.
4. IDs/names/biomes are readable.
5. compass does not overlap outer city tiles.
6. clicking a tile only selects detail; it does not teleport.

### Existing runtime

1. field capacity still comes from Location Tier;
2. DEV 8298 reports occupancy conflicts 0;
3. no legacy external «Неизвестный ресурс»;
4. Master wandering remains bounded;
5. First Playable fragments/core work with stable IDs.

## Deferred

- final names/lore;
- city NPC routes/wandering;
- final art/animation;
- dedicated forest/stone textures;
- world-map route artwork;
- biome distribution tuning.
