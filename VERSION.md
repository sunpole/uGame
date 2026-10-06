# uGame versions

Current version: **0.0.36**

`version.json` is the machine-readable current version. This file is the human-readable history.

| Version | Main change |
|---|---|
| 0.0.36 | In-game Project Hub: navigation, embedded docs/Journal and GitHub links |
| 0.0.35 | Modular ContainerSystem: Backpack, Bank, Equipment, Resource Pouch, weight and stacks |
| 0.0.34 | Blind restricted reward choices + optional reveal of missed rewards after selection |
| 0.0.33 | Remote-friendly controls: Enter interaction key + always-visible mouse buttons |
| 0.0.32 | Dynamic Event Spots, timed zone quality, reusable reward-choice UI and persistent generated offers |
| 0.0.31 | First Playable content slice: four-zone loop, guide, three fragments and final core objective |
| 0.0.30 | WorldGraph with stable zone/transition ids and legacy save migration |
| 0.0.29 | Persistent Game State schema v1 + local SaveSystem |
| 0.0.28 | Head and torso centered at idle; forward lean only during movement |
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

## 0.0.36
Added the first Project Hub UI directly inside the game shell. The top bar now has one Hub entry instead of scattering project/dev links across the playfield. The Hub uses one responsive overlay shell with root sections and a navigation stack, so documents and Project Journal records can open in the same browser tab with Back/Close/Escape navigation. Internal Markdown is fetched through relative same-origin paths and rendered with a lightweight safe viewer supporting headings, lists, code, quotes and tables. The Hub exposes CURRENT, VERSION, README, Active/Idle Core, Simulation Lab docs, DEV codes and Project Journal search/listing. External GitHub repository/Actions and Pages links open separately. Opening the Hub now participates in the shared input-lock rule with Dialogue, Interaction and Inventory overlays, so player movement does not resume until every blocking overlay is closed. No save schema or gameplay-world rules changed.

## 0.0.35
Runtime inventory is moved from the old flat InventorySystem into a modular ContainerSystem. Backpack, Resource Pouch, Equipment and Bank are now configurations of one storage engine with slots, per-item stack limits, weight limits, transfer rules and persistent state. The starter Backpack has 12 slots / 30 kg. Resource Pouch has one slot / 15 kg and currently accepts only Stone, proving the future skill-driven specialization model without implementing the Skill tree yet. Equipment has named helmet/chest/pants/boots/gloves/ring1/ring2/amulet/cloak/belt slots. A prototype Bank interactable on Перекрёсток opens a 60-slot weight-unlimited local Bank; the Bank tab is not available from the ordinary global inventory button. Resources now carry test weights and stack limits: Stone 1 kg, Wood 0.5 kg, Water 0.1 kg, Attention weightless/account-bound. Physical dynamic rewards must fit portable storage or the reward choice remains pending. Old flat inventory and physical resource placement migrate into new containers; migration overflow goes to Bank to avoid data loss. DEV 5011 adds test helmet/belt for equipment QA. See docs/CONTAINER-SYSTEM.md and UGD-0014.

## 0.0.34
Reward-choice presentation now follows one general rule. If the player can take every generated option, rewards are shown immediately because there is no meaningful choice to protect. If the player may take only part of the generated set, all options are hidden before selection so the interaction behaves as a lottery instead of a value-comparison menu. After the allowed choices are taken, unchosen rewards can be revealed as informational feedback; this behavior is controlled by `choicePresentation.revealUnchosenAfterComplete` in `data/reward-rules.json` and is enabled by default. The same rule applies to resource and chest reward offers.

## 0.0.33
Remote testing through desktop-control apps no longer depends on sending the E or Space key. Enter is now a third interaction key alongside E and Space. The bottom bar also contains persistent clickable controls for left/up/down/right, Action and Dash, so the prototype can be operated with a mouse cursor. Direction buttons support press-and-hold. The mouse Dash button uses a short queued pulse, making it possible to click Dash and then a movement direction without needing two simultaneous mouse presses. Existing touch controls remain unchanged for direct mobile play.

## 0.0.32
Each current zone now contains five possible Dynamic Event Spots. Zone quality Q1–Q4 is rolled from the prototype 80% / 15% / 3.5% / 1.5% rarity profile and controls 1 / 2 / 3 / 5 active event slots. Quality rerolls independently per zone on quality-dependent real-time windows (Q1 roughly 150–180 minutes down to Q4 roughly 60–90 minutes), while each dynamic event has its own 30-minute lifetime and visible countdown. Resource, chest and placeholder event-portal encounters are generated from data-driven rules. A reusable InteractionPanel supports reward-choice and message interactions; resource events show 2–3 generated options, while chest events separately roll how many closed chests appear and how many may be selected. Chest contents are generated in advance but hidden until selection. Resource definitions and relative values moved to `data/resources.json`, reward/event rules to `data/reward-rules.json`. Dynamic event state and pending reward offers are saved in Game State so zone changes/F5 do not become free rerolls. DEV codes `8201`, `8202`, `8299` speed up QA. Event portals are intentionally placeholders and do not yet travel to event zones.

## 0.0.31
The project switches from infrastructure-first work to the first content-first playable slice. `data/world.json` now contains four connected zones — Перекрёсток, Галерея, Тёмный сад and Сердце руин — arranged as a small loop with labeled exits and two possible routes toward the final area. A new quest, `q002` «Три фрагмента», asks the player to speak with the Guide, find three uniquely tracked fragments and activate the first core. Quest signals remain order-tolerant through the existing seen-signal behavior, so exploration does not have to follow one strict route. The Dark Garden contains an optional one-time cache. Chest definitions can now provide their own item id and optional quest signal, and the HUD shows First Playable fragment progress. Old q001 saves do not block the new auto-start quest: when restored quest content no longer has an active quest, the first pending auto-start quest begins. No combat, enemy or large new framework was added.

## 0.0.30
World identity and connectivity moved out of `ZoneSystem` into a data-driven WorldGraph. `data/world.json` now defines stable string zone ids (`zone-001`, `zone-002`), explicit stable transition ids, entries, current zone geometry/rules and interactable definitions. Portals travel through a transition id instead of embedding duplicated destination links. WorldGraph accepts legacy numeric zone ids `1`/`2`, so a v0.0.29 save can restore normally and is rewritten with the canonical stable id on the next `zone:enter` autosave. The Game State schema stays at version 1 because string zone ids were already valid. Existing interactable ids remain unchanged in this release to preserve one-time-object save compatibility. See `docs/WORLD-GRAPH.md`.

## 0.0.29
Added the first accepted persistence foundation: a versioned serializable Game State (`schemaVersion: 1`) and a browser-local SaveSystem adapter. The prototype now restores selected class, current zone/entry context, resource counters, inventory stacks, quest progress/completion/seen signals and used one-time interactables. Autosave is triggered by significant state changes rather than movement. Unsupported save schemas are not silently overwritten. DEV codes `9001`, `9002` and `9099` provide save-now, clear-for-reload and status checks. Exact player position and other transient scene details remain runtime-only by design. See `docs/SAVE-SYSTEM.md`.

## 0.0.28
Idle now has no forward body projection: the head overlaps the torso around the same center footprint, with only a small face marker showing facing direction. Walking alone moves the torso and head forward, while the legs trail slightly behind. Dash increases the same movement projection. The existing smooth transition, walk cycle and facing rotation are preserved.

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
