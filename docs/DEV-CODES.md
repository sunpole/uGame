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

## Active codes

| Code | Action |
|---|---|
| `9999` | Open this DEV code reference |

## Reserved Vision codes

These numbers are reserved now so they stay stable later. They are **not connected to gameplay yet**.

| Code | Planned action |
|---|---|
| `1001` | Vision mode: circle |
| `1002` | Vision mode: cone / flashlight |
| `1003` | Vision mode: full visibility |
| `1004` | Vision mode: no visibility |
| `1101` | Vision radius: decrease |
| `1102` | Vision radius: increase |
| `1201` | Darkness: 100% |
| `1202` | Darkness: 90% |
| `1203` | Darkness: 75% |

## Rules

- Codes are exactly four decimal digits.
- Existing assigned codes should not be silently reused for another meaning.
- New systems should use their reserved thousand-range.
- A code should be documented here before it becomes active.
- DEV codes must not execute arbitrary shell commands or updater commands.
