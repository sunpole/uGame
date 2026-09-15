# uGame DEV codes

DEV codes are four-digit test commands entered in the footer console. They are for development/testing only and are not part of normal gameplay.

## Ranges

| Range | System |
|---|---|
| `1xxx` | Vision |
| `2xxx` | Player |
| `3xxx` | Movement |
| `4xxx` | Combat |
| `5xxx` | Items |
| `6xxx` | World |
| `7xxx` | Classes |
| `8xxx` | Events |
| `9xxx` | Dev / Service |

## Active Vision codes

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

The cone follows the last movement direction. Radius commands affect circle and cone modes. Darkness commands affect the hidden area while preserving the active visibility shape.

## Dev / Service codes

| Code | Action |
|---|---|
| `9999` | Open this DEV code reference |

## Rules

- Codes are exactly four decimal digits.
- Existing assigned codes should not be silently reused for another meaning.
- New systems should use their reserved thousand-range.
- A code should be documented here before it becomes active.
- DEV codes must not execute arbitrary shell commands or updater commands.
- DEV console routes commands to game systems; it should not duplicate the systems' gameplay logic.
