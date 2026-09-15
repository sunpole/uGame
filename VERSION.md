# uGame versions

Current version: **0.0.20**

`version.json` is the machine-readable project version. `package.json` mirrors the same version for tooling. This file is the human-readable change history.

## 0.0.20 — Mobile foundation + pre.by deployment preparation

- Added touch controls for movement, action and dash.
- Added responsive HUD/dialogue layouts for smaller screens and coarse-pointer devices.
- Added `docs/PREBY-DEPLOY.md` describing the static deployment shape for a dedicated `pre.by` development hostname.
- Added cache-busting query strings for the current CSS/JS entry points.

## 0.0.19 — DialogueSystem + QuestSystem

- Added JSON-driven dialogue content in `data/dialogues.json`.
- Added JSON-driven quest content in `data/quests.json`.
- Added a dialogue panel with keyboard/button progression.
- Added the first test quest, `Первый осколок`.
- Quest signals are remembered so the test quest cannot become impossible if the player performs steps out of order.

## 0.0.18 — InventorySystem

- Added a minimal stack-based inventory module.
- Added HUD inventory output.
- The starter chest now produces an inventory item.
- Added DEV codes `5001` and `5099` for inventory testing.

## 0.0.17 — ResourceSystem

- Added a minimal resource counter system.
- Added collectible shard interactables.
- Added HUD resource output.
- Added DEV codes `6001` and `6099` for resource/world testing.

## 0.0.16 — Zone rules

- Zones now contain their own `rules` data.
- Added `ZoneRulesSystem`.
- Zone rules can modify player speed and provide non-destructive Vision overrides.
- Zone 2 currently demonstrates slower movement and 90% darkness without replacing the selected class profile.

## 0.0.15 — EventSystem

- Added a small event bus used by interactables, zones, dialogue, quests, resources and inventory.
- Systems can react to events without importing one another directly.

## 0.0.14 — AudioSystem

- Added a central audio module.
- Added temporary procedural signals for interaction, portal, chest, resource, dash and quest events.
- Audio is deliberately replaceable later with authored sound assets.

## 0.0.13 — CharacterView + art pipeline

- Replaced the visible square with a temporary layered top-down character while keeping the existing collision body.
- Added directional facing and a simple walking/dashing limb animation.
- Added `docs/CHARACTER-ASSET-GUIDE.md` with a 64×64 layered sprite workflow for future authored character art.

## 0.0.12 — PlayerController

- Moved player input/movement out of the scene into `PlayerController`.
- Added dash on Shift and a simple stamina model.
- Added virtual-control support for later mobile controls.
- Added DEV codes `3001` and `3099`.

## 0.0.11 — InteractableSystem

- Added a reusable world-interaction module.
- Portal/exit, chest, resource and NPC are now variants of the same interactable concept.
- Interactables support `auto` and `action` triggers, prompts, one-time use and events.
- Existing zone exits were migrated to portal interactables.

## 0.0.10 — DEV focus fix + arrow indicator

- Fixed keyboard control after entering DEV codes: successful/reserved commands now release focus from the DEV input back to the game.
- Added a live footer indicator for the physical arrow keys `← ↑ ↓ →`.
- Each arrow lights while that arrow key is held.

## 0.0.9 — ClassSystem + Vision profiles

- Added the separate `ClassSystem` module.
- Added three test classes selected through `7xxx` DEV codes.
- Class profiles apply Vision settings through the public `VisionSystem` profile API.
- `7001` selects Странник: circle, radius 165, darkness 100%.
- `7002` selects Разведчик: circle, radius 235, darkness 90%.
- `7003` selects Следопыт: cone, radius 220, darkness 100%.
- `7099` reports the current class.

## 0.0.8 — ZoneSystem + real zone transitions

- Added the separate `ZoneSystem` module.
- Added two different test zones with their own wall layouts and spawn points.
- Reaching an exit moves the player into the next zone.

## 0.0.7 — VisionSystem + active Vision DEV codes

- Moved visibility logic into the separate `VisionSystem` module.
- Activated circle, cone/flashlight, full visibility and no visibility.
- Added DEV controls for visibility radius and darkness strength.

## 0.0.6 — Dev console infrastructure

- Added `version.json` and this version history.
- Added a compact four-digit DEV console in the footer.
- Added `docs/DEV-CODES.md`.
- Added active code `9999` to open the DEV code reference.

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
