# uGame DEV codes

DEV codes are four-digit test commands entered in the footer console. They are for development/testing only and are not part of normal gameplay.

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

Normal controls: WASD or arrows to move, `E` / Space to interact, Shift to dash.

## Items / Inventory

| Code | Action |
|---|---|
| `5001` | Add one `test-item` |
| `5099` | Show inventory summary |

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
| `8001` | Restart the first quest and clear its recorded test signals |
| `8099` | Show current quest status |

## Dev / Service

| Code | Action |
|---|---|
| `9999` | Open this DEV code reference |

## Reserved

`2xxx` Player and `4xxx` Combat remain reserved for later systems.

## Rules

- Codes are exactly four decimal digits.
- Existing assigned codes should not be silently reused for another meaning.
- New systems should use their reserved thousand-range.
- A code should be documented here before it becomes active.
- DEV codes must not execute arbitrary shell commands or updater commands.
- DEV console routes commands to game systems; it should not duplicate the systems' gameplay logic.
