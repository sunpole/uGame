# UGD-0034 — Master free-reward marker

Дата: 2026-10-08  
Тип: gameplay / npc / reward UX  
Статус: accepted  
Flags: needs-test  
Теги: master, npc, reward, marker, encounter, process

## Accepted rule

One active Master Encounter gives one free Extraction reward.

The reward remains logically available until the generated pending reward is successfully placed into inventory and claimed.

## Visual language

A Master with an unclaimed free reward has a small red pulsing dot above the head.

- world-space Phaser object;
- follows the wandering NPC;
- does not use DOM;
- is naturally hidden outside the current Vision mask;
- disappears immediately after successful claim.

No other marker colors are introduced yet.

## State source

The marker does not own gameplay state.

Source of truth:

`Character↔Master.claimedEncounterIds`

The same state also disables the Extraction action and prevents starting a second free Process in the same Encounter.

## Compatibility

Existing saves receive `claimedEncounterIds: []` lazily through `ensureMaster()`.

Pending rewards now persist `encounterId`; legacy pending rewards use the current Encounter as fallback when claimed.
