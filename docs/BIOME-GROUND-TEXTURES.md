# Biome Ground Texture System

Current implementation: **v0.0.58**

## Purpose

The runtime floor and the temporary admin editor are intentionally separate:

- `GroundTextureSystem` renders the floor in gameplay.
- `BiomeTextureSettingsSystem` owns defaults and browser-local overrides.
- `Biome Visual Lab · DEV` is temporary Project Hub tooling and may later be hidden without changing runtime behavior.

## Source configuration

`data/biome-textures.json` defines six slots:

| Slot | Biome | City |
|---|---|---|
| grass | grass | no |
| sand | sand | no |
| snow | snow | no |
| city-grass | grass | yes |
| city-sand | sand | yes |
| city-snow | snow | yes |

Each slot has `enabled`, `textureName`, `textureFile`, `scalePercent` and `opacityPercent`.

Ranges:

- scale: 1–10 000%;
- opacity: 0–100%.

At 100% one source texture spans 1024 world units. The image repeats in world space; it is not stretched to the browser viewport.

## Current prototype zone mapping

- zone-001 Перекрёсток → grass + city;
- zone-002 Галерея → sand;
- zone-003 Тёмный сад → grass;
- zone-004 Сердце руин → sand.

Snow slots are already available in the system and Visual Lab but are not assigned to the four current zones.

## Local texture import

Development PNGs live locally at `assets/textures/biomes/` and are ignored by Git.

The updater recognizes exactly:

- grass_1024.png
- sand_1024.png
- snow_1024.png
- city_grass_1024.png
- city_sand_1024.png
- city_snow_1024.png

`Update-uGame.cmd → 10` copies/updates those files from `%USERPROFILE%\Desktop`. Local RUN performs the same check automatically before starting the dev server.

This is a prototype asset workflow. Before public deployment, approved binaries must be promoted into tracked or otherwise deployed static assets.

## QA

Check:

1. all six files are available locally after updater import;
2. city and non-city slots select the expected texture;
3. changing scale does not change player/NPC proportions;
4. opacity 0 hides the texture and 100 shows it fully;
5. Apply updates the active floor immediately;
6. Reset restores JSON defaults;
7. a missing texture does not break the game;
8. responsive viewport resizing keeps the floor covering all visible world space.
