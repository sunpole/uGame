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


## Compatibility note v0.2.14

Pending rewards created before v0.2.13 may not contain a direct `encounterId`. The runtime reconstructs it from the stable `process:<encounterId>:<timestamp>` id before using the current Encounter as a final fallback. Old pending rewards are also offered before the current-Encounter claimed lock, so historical results remain collectible.


## Implementation QA note v0.2.16

A QA report found an already-claimed Master Encounter (`Добыча · получено`) with its red Phaser marker still visible. Marker visibility now reconciles from `claimedEncounterIds` during the existing throttled Master NPC update, as well as on relationship state changes. The rule remains one free Extraction per Encounter; no new currency, timer, or claim/reset semantics were introduced. PRE-FLIGHT runs a headless runtime regression for stale marker recovery. Browser/Phaser visual confirmation is pending.


## Implementation QA note v0.2.17
Repeated real-browser QA in v0.2.16 still showed a red dot after collecting an Encounter's free reward. Instead of another visibility-only fix, the marker now has a strict create/destroy lifecycle: unclaimed Encounters own a Phaser marker; claimed Encounters own none. The infinite pulse tween is killed when the marker is destroyed. DEV 8388 displays nearest-Master live state for diagnosing any remaining inconsistency. The underlying one-reward-per-Encounter economy, claims and saves remain unchanged. Root cause of prior browser behavior has not yet been directly observed.
