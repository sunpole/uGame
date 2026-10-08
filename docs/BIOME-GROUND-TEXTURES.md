# Biome Ground Texture System

Current implementation: **v0.1.10**

## Purpose

- `GroundTextureSystem` renders the floor in gameplay.
- `BiomeTextureSettingsSystem` owns defaults and browser-local overrides.
- `Biome Visual Lab · DEV` edits the same slots without changing WorldGraph.

## Source configuration

`data/biome-textures.json` defines **12 slots**:

| Slot | Biome | City | Current asset |
|---|---|---:|---|
| grass | grass | no | grass_1024.png |
| sand | sand | no | sand_1024.png |
| snow | snow | no | snow_1024.png |
| forest | forest | no | grass_1024.png prototype fallback |
| stone | stone | no | grass_1024.png prototype fallback |
| south | south | no | south_256.jpg |
| city-grass | grass | yes | city_grass_1024.png |
| city-sand | sand | yes | city_sand_1024.png |
| city-snow | snow | yes | city_snow_1024.png |
| city-forest | forest | yes | city_grass_1024.png prototype fallback |
| city-stone | stone | yes | city_grass_1024.png prototype fallback |
| city-south | south | yes | city_south_512.jpg |

Default baseline remains **40% scale + 40% opacity** unless a browser-local override exists.

## Tiling

Texture pixels repeat in world space; sources are not stretched to the browser viewport.

At scale 100% a 1024 source repeats every 1024 world units, the south city 512 source every 512, and the south field 256 source every 256.

## Current world mapping

The 25-location world uses `snow`, `forest`, `stone`, `sand`, `south` plus matching city slots.

South is the first newly tracked dedicated pair:

- south field — user-provided brown sandy/stone reference;
- south city — user-provided white marble reference.

Forest and Stone deliberately reuse existing assets as prototype fallbacks until dedicated textures are approved.

## Asset workflow

The original six development PNGs remain supported by the local updater import workflow.

The approved South prototype JPEGs are tracked with the project because the current 25-zone world depends on them.

## QA

1. all 12 slots appear in Biome Visual Lab;
2. all five field biome ids resolve without missing texture;
3. all five city biome ids resolve a city slot;
4. South city visibly uses white marble;
5. South fields visibly use brown sandy ground;
6. scale changes do not alter player/NPC proportions;
7. Apply/Reset still work;
8. camera movement across 1920×1080 keeps the tile floor continuous.
