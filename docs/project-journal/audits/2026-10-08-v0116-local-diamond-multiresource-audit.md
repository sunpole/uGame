# Audit — v0.1.11–v0.1.16 Diamond Local Maps / Resource Masters

Дата: 2026-10-08

## Static result

- directed transitions = 80.
- transition sides = NW / NE / SW / SE only.
- bad opposite-entry pairs = 0.
- maximum exits per zone = 4.
- N/E/S/W real portals = 0.
- field zones = 20.
- city zones = 5.
- every field = 12 Event Spots.
- every city = 0 Event Spots.
- Event Spots outside playable diamond = 0.
- Event Spot / wall-clearance conflicts = 0.
- Stone Master identities = T1/T2/T3/T4.
- Water Master identities = T1/T2/T3/T4.
- Forest Master identities = T1/T2/T3/T4.
- Process profiles = stone / water / wood.
- every city still has banker + teleporter + guide/guard.

## Manual QA

1. Walk into each masked corner; player must remain inside diamond.
2. Verify only NW/NE/SW/SE gates are interactive.
3. Cross all four gate types and verify opposite-side spawn.
4. Verify N/E/S/W markers are orientation only.
5. Enable Spawn Zone Debug and inspect all 12 spots across the diamond.
6. Run DEV 8298 and expect 0 occupancy conflicts.
7. Approach NPC/Master and confirm hint never covers Action.
8. In snow fields verify Water Master candidates.
9. In forest fields verify Forest Master candidates.
10. Start water/forest extraction and confirm REAL TIME persistence and correct Water/Wood reward.
11. Verify Banker/Teleporter/Guard all resemble the player base with role-specific proportions.
