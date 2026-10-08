# UGD-0033 — Daylight / Vision modifier stack

Дата: 2026-10-08  
Тип: gameplay / vision / architecture  
Статус: accepted  
Flags: needs-test  
Теги: daylight, vision, time, modifiers, cone, city

## Accepted

- Morning field radius corrected to ×1.0.
- Time-of-day effects are modifiers, not replacement hard-coded final profiles.
- Radius and darkness support flat, multiplier and multiplier-bonus layers.
- Future class/equipment/buffs may use the same named-source stack.
- Old city full-vision rule is superseded.
- Daylight never forces circle/cone; it modifies whichever Vision geometry is active.
- Existing cone geometry remains available; narrow/wide presets are deferred.
- World tint affects game canvas only, not header/footer/UI.

## Implemented

- v0.2.10 — modifier stack + phase tint/vision runtime.
- v0.2.11 — Pre-flight invariants, DEV overrides and documentation.
