# uGame — Daylight / Vision Architecture

Current implementation: **v0.2.11**

## Goal

Game time changes world tint, visibility radius and darkness without hard-coding final values into classes or equipment.

The modifier architecture is shared by future systems:

- daylight;
- class;
- equipment;
- buffs/debuffs;
- skills and temporary effects.

## Modifier formula

For both radius and darkness the engine exposes three modifier types:

1. `flat` — direct flat addition;
2. `multiplier` — independent multiplicative factor;
3. `multiplierBonus` — additive contribution to the shared multiplier bonus pool.

Radius:

`(base + flatSum) × product(multiplier) × (1 + multiplierBonusSum)`

Darkness:

`clamp((base + flatSum) × product(multiplier) × (1 + multiplierBonusSum), 0, 1)`

Example future sources:

- class: `radiusFlat: +40`;
- helmet: `radiusMultiplier: 1.10`;
- passive: `radiusMultiplierBonus: +0.15`;
- torch: `darknessMultiplier: 0.80`;
- curse: `darknessFlat: +0.08`.

## Accepted daylight table

| Phase | World tint | City radius | City darkness | Field radius | Field darkness |
|---|---|---:|---:|---:|---:|
| Утро | 20% yellow + 5% red | ×3.0 | ×0.30 | ×1.0 | ×0.76 |
| День | 10% ochre-yellow + 5% warm red | ×2.5 | ×0.50 | ×1.2 | ×0.88 |
| Вечер | 10% blue + 5% black | ×2.0 | ×0.60 | ×1.1 | ×0.94 |
| Ночь | 25% black | ×1.5 | ×0.80 | ×0.8 | ×1.05 |

The tint is applied only inside `#game` between the Phaser canvas and Vision overlay. Header, footer and UI windows are not tinted.

The tint RGB values are prototype art values; their percentages and gameplay multipliers are the accepted mechanics.

## Cities

The old rule `city = full vision` is superseded.

Cities now use normal Vision geometry with daylight modifiers. This allows future classes/equipment to affect city visibility too.

## Vision shape

Current default shape remains `circle`.

Existing cone behavior is preserved. The engine now exposes:

- `coneHalfAngleDeg`;
- `coneDistanceMultiplier`.

Narrow/wide cone presets are deliberately deferred until gameplay requires them.

Daylight changes radius/darkness only and does not force a Vision shape.

## DEV phase overrides

- `1301` — Утро
- `1302` — День
- `1303` — Вечер
- `1304` — Ночь
- `1399` — return to actual Game Clock phase

Overrides are DEV-only and do not change the persistent Game Clock.
