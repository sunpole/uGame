# Audit — v0.0.85–v0.0.89 First Stone Extraction Process

Дата: 2026-10-07

## Static scope review

Reviewed files:

- src/interaction-panel-system.js
- src/master-encounter-system.js
- src/master-process-system.js
- src/character-master-relationship-system.js
- src/main.js
- data/master-npcs.json
- data/master-processes.json

JSON parse was confirmed for master process/catalog and version metadata before this documentation commit.

This audit does **not** claim browser gameplay execution. Manual QA is required.

## Architecture checks

- Process state is character/master-owned, not stored inside NPC Definition.
- Encounter remains world state; Process references encounterId but survives its disappearance once completed.
- REAL TIME timestamps are authoritative.
- Game Clock is not consulted.
- start duration is capped by Encounter `expiresAt - now`.
- completed active Process moves to pending reward.
- pending reward stores modifier inputs captured from the original Process.
- reward deletion happens only after successful grant.
- no Relationship XP or Mastery number was invented.
- other master modules remain disabled placeholders.

## Candidate-QA balance

Current values intentionally exist only for fast vertical-loop testing:

```text
duration = up to 60 s
base = Stone ×10
final = round(base × (1 + LocationBonus) × MasterMultiplier)
```

Do not treat these as final economy.

## Manual QA checklist

1. Update/run v0.0.89 and meet any Stone Master.
2. Confirm active modules are buttons; unfinished modules are disabled with `· позже`.
3. Press **Добыча** and confirm REAL TIME Process countdown starts.
4. Reopen the Master during the countdown: same Process, not a duplicate.
5. F5 before completion: Process should remain with original endsAt.
6. Close/reload after >60 real seconds: completed result should become pending.
7. If the original Encounter disappeared, later find the **same Master identity** and confirm pending result remains.
8. Claim reward and compare amount with stored Location/Master multipliers.
9. Verify successful claim removes pending reward only once.
10. Create insufficient container/weight condition if practical; failed grant must keep pending reward.
11. Start near Encounter expiry and verify Process duration never extends beyond Encounter.
12. Confirm changing Game Clock does not alter Process timing.
13. Recheck Encounter timer, wandering and Spawn Zone visualization for regressions.

## Remaining debts after QA

- Dialogue functional module;
- Analytics;
- Quest;
- Training/Stone skill tree;
- Special Event;
- Relationship XP / Mastery values and progression;
- final Process durations/economy/rounding;
- generic Event displacement risk noted in earlier audit.
