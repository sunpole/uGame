# uGame DEV codes

DEV codes are four-digit test commands entered in the footer console. They are for development/testing only and are not part of normal gameplay.

Inside Project Hub → DEV-коды, every active four-digit code row also has a **Выполнить** button. The button submits the code through the same footer DEV console handler; manual entry remains available as a keyboard fallback.

## Ranges

| Range | System |
|---|---|
| `1xxx` | Vision |
| `2xxx` | Player |
| `3xxx` | Movement |
| `4xxx` | Combat |
| `5xxx` | Items / Inventory |
| `6xxx` | World / Resources |
| `7xxx` | Classes |
| `8xxx` | Events / Quests |
| `9xxx` | Dev / Service |

## Vision

| Code | Action |
|---|---|
| `1001` | Vision mode: circle |
| `1002` | Vision mode: cone / flashlight |
| `1003` | Vision mode: full visibility |
| `1004` | Vision mode: no visibility |
| `1101` | Vision radius: decrease by 25 |
| `1102` | Vision radius: increase by 25 |
| `1103` | Vision radius: reset to default |
| `1201` | Darkness outside visible area: 100% |
| `1202` | Darkness outside visible area: 90% |
| `1203` | Darkness outside visible area: 75% |

Zone Vision rules are applied as an override layer. Direct Vision and Class codes still change the underlying player/class profile.

## Movement

| Code | Action |
|---|---|
| `3001` | Refill dash stamina |
| `3099` | Show current movement speed and stamina |

Normal controls: WASD or arrows to move, `E` / Space / Enter to interact, Shift to dash. The footer also duplicates directions, Action and Dash as mouse-clickable controls for remote testing.

## Items / Inventory

| Code | Action |
|---|---|
| `5001` | Add one stackable `test-item` through ContainerSystem |
| `5011` | Add DEV training helmet + belt to Backpack |
| `5099` | Show Backpack / Resource Pouch slot and weight summary |

## World / Resources

| Code | Action |
|---|---|
| `6001` | Add one `shard` resource |
| `6099` | Show shard count |

## Classes

| Code | Class | Test profile |
|---|---|---|
| `7001` | Странник | circle, radius 165, darkness 100% |
| `7002` | Разведчик | circle, radius 235, darkness 90% |
| `7003` | Следопыт | cone, radius 220, darkness 100% |
| `7099` | Current class | Show the currently selected class |

## Events / Quests

| Code | Action |
|---|---|
| `8001` | Restart the first quest and reuse already recorded test signals |
| `8099` | Show current quest status |
| `8201` | Recreate dynamic Event Spots in the current zone without changing zone quality |
| `8202` | Reroll current zone quality and recreate its dynamic Event Slots |
| `8211` | Force current zone to Q1 for QA |
| `8212` | Force current zone to Q2 for QA |
| `8213` | Force current zone to Q3 for QA |
| `8214` | Force current zone to Q4 for QA |
| `8297` | Show recent generic Event Spot placement history |
| `8298` | Check current-zone Event Spot occupancy conflicts |
| `8299` | Show Dynamic Event Spot status |

## Location Tier QA

| Code | Action |
|---|---|
| `8400` | Reroll current external zone Location Tier using the candidate distance band |
| `8401` | Force current external zone to T1 |
| `8402` | Force current external zone to T2 |
| `8403` | Force current external zone to T3 |
| `8404` | Force current external zone to T4 |
| `8499` | Show current Location Tier, safe-city distance, spawn capacity and remaining lifetime |

These codes change the persisted `WorldSpawnState`, so reload keeps the forced/rerolled Tier until its real-time lifetime expires. They are QA controls, not player-facing mechanics.

The old `8202/8211–8214` quality controls now apply only to the safe-city prototype. In external zones the console points to the 84xx Location Tier controls.

## Master NPC QA — active

These codes are active against the persistent resource-Master runtime. `8300` summarizes Stone/Water/Forest; the existing Tier-list and teleport codes remain Stone-specific QA shortcuts.

| Code | Action |
|---|---|
| `8300` | Show active Master summary: Stone / Water / Forest |
| `8302` | List active T2 Stone master zones |
| `8303` | List active T3 Stone master zones |
| `8304` | List active T4 Stone master zones |
| `8312` | Teleport/cycle to next active T2 Stone master |
| `8313` | Teleport/cycle to next active T3 Stone master |
| `8314` | Teleport/cycle to next active T4 Stone master |
| `8388` | Read-only last-interacted Master diagnostic (fallback: nearest): claimed state, cached eligibility, Phaser marker object/visibility, red circle count (also logs to browser console) |
| `8399` | Show candidate pool sizes and independent rotation round/coverage summary |

The preferred UX later is a clickable **DEV World Analyzer** inside Project Hub with a list of active masters and TP buttons. Console codes remain a fast keyboard fallback.

## Dev / Service

| Code | Action |
|---|---|
| `9001` | Save the current persistent game state immediately |
| `9002` | Delete the local save and pause autosave until page reload |
| `9099` | Show local save status / last save time |
| `9999` | Open this DEV code reference |

`9002` is intentionally non-destructive to the running scene: it removes the browser save, then pauses autosave until the page is reloaded. Reload immediately if the goal is to start from a clean state.

## Reserved

`2xxx` Player and `4xxx` Combat remain reserved for later systems.

## Rules

- Codes are exactly four decimal digits.
- Existing assigned codes should not be silently reused for another meaning.
- New systems should use their reserved thousand-range.
- A code should be documented here before it becomes active.
- DEV codes must not execute arbitrary shell commands or updater commands.
- DEV console routes commands to game systems; it should not duplicate the systems' gameplay logic.
