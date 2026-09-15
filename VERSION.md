# uGame versions

Current version: **0.0.9**

`version.json` is the machine-readable project version. `package.json` mirrors the same version for tooling. This file is the human-readable change history.

## 0.0.9 — ClassSystem + Vision profiles

- Added the separate `ClassSystem` module.
- Added three test classes selected through `7xxx` DEV codes.
- Class profiles apply Vision settings through the public `VisionSystem` profile API instead of duplicating visibility logic.
- `7001` selects Странник: circle, radius 165, darkness 100%.
- `7002` selects Разведчик: circle, radius 235, darkness 90%.
- `7003` selects Следопыт: cone, radius 220, darkness 100%.
- `7099` reports the current class.
- Direct `1xxx` Vision commands can still override Vision values temporarily; selecting a class again reapplies its complete profile.

## 0.0.8 — ZoneSystem + real zone transitions

- Added the separate `ZoneSystem` module.
- Added two different test zones with their own wall layouts and spawn points.
- Reaching an exit now moves the player into the next zone instead of only changing status text.
- Zone 1 exits to the right; Zone 2 exits to the left.
- Footer status updates to the active zone and exit direction.
- The same player object and `VisionSystem` continue working across zone changes, so Vision DEV settings are preserved.

## 0.0.7 — VisionSystem + active Vision DEV codes

- Moved visibility logic into the separate `VisionSystem` module.
- Connected DEV console commands to game-system handlers instead of putting gameplay logic in the console.
- Activated Vision modes: circle, cone/flashlight, full visibility and no visibility.
- Added DEV controls for visibility radius and darkness strength.
- Cone mode follows the player's last movement direction.
- Updated `docs/DEV-CODES.md` with the active Vision command set.

## 0.0.6 — Dev console infrastructure

- Added `version.json` and this version history.
- Added a compact four-digit DEV console in the footer.
- Added `docs/DEV-CODES.md` as the DEV code reference.
- Added active code `9999` to open the DEV code reference.
- Reserved numbered ranges for future gameplay systems.
- Vision commands were documented as reserved, but were not connected to gameplay yet.

## 0.0.5 — Visibility fix

- Fixed the visibility hole so it follows the player.
- Darkness outside the visible area reaches full black.

## 0.0.4 — Visibility prototype

- Reworked darkness to a DOM overlay after the first mask approach failed.

## 0.0.3 — First visibility pass

- Added a circular visibility area around the player.

## 0.0.2 — One-screen game layout

- Restored the header and footer.
- Added permanent movement help and clearer zone/exit information.

## 0.0.1 — First playable prototype

- One top-down zone.
- Square player.
- WASD and arrow-key movement.
- Collision walls and one exit.
