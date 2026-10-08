# Audit — v0.1.20–v0.1.27 Boot / True Diamond / Spatial Safety

Дата: 2026-10-08

## Static checks already confirmed

- version/package/manifest synchronized before documentation bump;
- changed JS files pass syntax parse;
- local world size = 1920×1920;
- Event Spot minimum distance to diagonal entry ≈ 288.8 px;
- all field walls use ±45° rotation;
- minimum wall-to-protected-point clearance >124 px;
- city fields remain separated: safe cities have no field Event Spots.

## Manual QA after Update

1. Loading screen appears before gameplay.
2. All rows become green; game remains hidden until READY.
3. A failed file/test leaves the loader visible and blocks gameplay.
4. Local map visually reads as a square rotated exactly 45°, not a flattened rhombus.
5. NW/NE/SW/SE gates work; N/E/S/W are only labels.
6. Movement feels smooth during normal walk and camera follow.
7. Banker / Teleporter / Guard are clearly much larger than the player.
8. Field walls are diagonal and do not crowd entrances.
9. Spawn Zone Debug shows 12 spots distributed away from diagonal entries.
10. Stone/Water/Forest Master and First Playable regressions remain clean.
