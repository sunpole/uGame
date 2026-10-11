# Biome ground textures

Runtime path: `assets/textures/biomes/`.

The current development set contains six 1024×1024 PNG textures:

- `grass_1024.png`
- `sand_1024.png`
- `snow_1024.png`
- `city_grass_1024.png`
- `city_sand_1024.png`
- `city_snow_1024.png`

During the current local prototype stage these binary assets are imported from the developer Desktop by `Update-uGame.ps1` (menu item **10**) and are also checked automatically before local RUN. The PNG files are intentionally ignored by Git so local texture files do not block updater fast-forward checks.

The runtime mapping/defaults live in `data/biome-textures.json`. User/admin overrides are stored locally and do not modify the source JSON.

Before public asset release, approved binaries should be promoted into tracked/static deployment assets without changing the GroundTextureSystem API.

## South originals and publishing (v0.2.60)

Updater item 12 reads `ground_1024.jpg` / `city_ground_1024.jpg` from **this folder**, copies their bytes to the original tracked targets `south_256.jpg` and `city_south_512.jpg` in an isolated worktree, and pushes only a review PR. The legacy destination filenames do not dictate image resolution; originals are not compressed or resized. If the original names are not present, the uploader uses the destination-named JPEGs instead. Six ignored PNGs remain local-only. See [`docs/releases/v0.2.60.md`](../../../docs/releases/v0.2.60.md).
