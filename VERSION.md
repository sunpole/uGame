# uGame versions

Current version: **0.0.27**

`version.json` is the machine-readable current version. This file is the human-readable history.

| Version | Main change |
|---|---|
| 0.0.27 | Stronger visual contrast between upright idle and forward-leaning movement |
| 0.0.26 | Upright idle pose with movement-driven forward lean |
| 0.0.25 | Vision overlay and Phaser canvas forced to exactly the same playfield bounds |
| 0.0.24 | LAN/Wi-Fi dev-server access for phones and laptops |
| 0.0.23 | Quest/HUD clarity and small temporary-character polish |
| 0.0.22 | Vision overlay locked to exact 960×540 playfield |
| 0.0.21 | Explicit linked portal entry/exit sides |
| 0.0.20 | Mobile controls and pre.by deployment preparation |
| 0.0.19 | DialogueSystem + QuestSystem |
| 0.0.18 | InventorySystem |
| 0.0.17 | ResourceSystem |
| 0.0.16 | Zone rules |
| 0.0.15 | EventSystem |
| 0.0.14 | AudioSystem |
| 0.0.13 | CharacterView and art pipeline |
| 0.0.12 | PlayerController, dash and stamina |
| 0.0.11 | InteractableSystem |
| 0.0.10 | DEV focus fix and arrow indicator |
| 0.0.9 | ClassSystem |
| 0.0.8 | ZoneSystem and real transitions |
| 0.0.7 | VisionSystem |
| 0.0.6 | DEV console and code registry |
| 0.0.5 | Visibility follow/full-black fix |
| 0.0.4 | DOM visibility overlay |
| 0.0.3 | First visibility pass |
| 0.0.2 | One-screen shell |
| 0.0.1 | First playable prototype |

## 0.0.27
The previous posture difference was too subtle at normal gameplay scale. Idle is now much more compact in top-down projection: the head, face, arms and torso overlap more closely around the character centre. Walking moves the upper body forward by roughly 5–9 pixels while the legs trail behind, and dashing increases that projection further. The shadow stretches slightly during movement to help the posture change read immediately without changing the established character style.

## 0.0.26
The temporary top-down character now has two clearer posture states. While idle, the body is more upright and compact, with the head and face pulled back toward the body so the character feels as if they are standing tall. While walking, the upper body, head and face smoothly shift forward; dashing increases that lean a little more. The transition is interpolated instead of snapping, while the existing arm/leg walk cycle and facing direction are preserved.

## 0.0.25
The previous playfield fix was not strict enough: Phaser could still render its canvas at a different CSS size than the DOM Vision layer. The canvas and Vision SVG are now both forced to fill exactly the same `#game` rectangle. The Vision SVG also declares `width="100%"` and `height="100%"`, while its mask continues to use the same 960×540 world coordinates as the player.

## 0.0.24
The development server now listens on the local network and prints private IPv4 URLs for same-network testing. See `docs/LAN-TESTING.md`.

## 0.0.23
Quest status now shows title, current step and progress. Completed status remains visible. The temporary character was slightly straightened without changing its overall visual direction.

## 0.0.22
The visible game field is fitted to a single 16:9 rectangle. Vision, canvas and HUD share those bounds, and Vision uses world coordinates directly.

## 0.0.21
Portals now carry a target zone and target entry side. Zone 1 right exit leads to Zone 2 left entry; Zone 2 left exit leads to Zone 1 right entry.
