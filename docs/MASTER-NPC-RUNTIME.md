# Stone Master NPC runtime

Current implementation: **v0.0.89**

## Scope

This document describes the first live Stone-only prototype based on accepted UGD-0015 and UGD-0016.

Source files:

- `data/master-npcs.json`
- `src/master-catalog.js`
- `src/world-spawn-state-system.js`
- `src/master-encounter-system.js`
- `src/character-master-relationship-system.js`
- `src/master-process-system.js`
- `data/master-processes.json`
- `src/interactable-system.js`

## Identity vs Encounter vs Relationship

Three layers stay separate.

### Master definition

Persistent world/content identity:

```text
stone-master-t1
stone-master-t2
stone-master-t3
stone-master-t4
```

Names are neutral placeholders until Lore is approved.

Tier is permanent for the identity. Current multipliers:

- T1 ×1.00
- T2 ×1.20
- T3 ×1.40
- T4 ×1.60

### Encounter

Temporary real-time spawn instance stored inside WorldSpawnState:

- encounterId;
- masterId;
- zoneId / spotId;
- requestedTier / final Tier;
- spawnedAt / expiresAt;
- efficiencyMultiplier;
- activeModules / moduleCount.

Current lifetime is ~30 real minutes.

Reload does not freely reroll an unexpired Encounter.

### Character↔Master relationship

Stored separately in `characterMasterRelationships`:

- firstMetAt / lastMetAt;
- encountersCount;
- relationshipXp / relationshipLevel placeholders;
- dialogue/special flags;
- pendingRewards placeholder;
- seenEncounterIds.

Repeated clicks on the same Encounter do not increment encountersCount.

## Allocator

The current external prototype has one Stone Master Encounter per eligible external zone.

Candidate master Tier is selected from the current Location Tier candidate matrix. High-tier caps:

```text
Stone T4 <= 1
Stone T3 <= 2
Stone T2 <= 3
```

Caps are maxima, not targets.

If a high-tier candidate cannot be allocated because its cap is full, allocation falls back through lower tiers instead of leaving the master slot empty.

Each `stone:T2`, `stone:T3` and `stone:T4` has independent rotation state:

- round;
- visitedZoneIds;
- lastPickedZoneIds.

The runtime prefers not-yet-visited eligible candidate zones inside the current round.

## Event/NPC capacity

A Master Encounter occupies one of the same Location Tier spawn-capacity slots.

Example:

```text
Location capacity = 5
active Stone Master = 1
generic Dynamic Events target = 4
total Event/NPC = 5
```

The master spot is excluded from generic Resource/Chest/Portal placement.

## Module availability

Each Encounter stores a module set once.

- Extraction is guaranteed.
- T1 = 2–3 total modules.
- T2 = 3–4.
- T3 = 4–6.
- T4 = all 6.

Current neutral module ids:

- extraction;
- dialogue;
- quest;
- analytics;
- training;
- special-event.

At v0.0.72 these started as availability metadata. Since v0.0.85–v0.0.88 **Extraction is the first functional module**; Dialogue / Quest / Analytics / Training / Special Event are still availability-only placeholders.

## Persistent UI / QA

Game Chrome always shows Location Tier context:

```text
LT Tn · Dn · P n% · +bonus%
```

DEV codes:

- 8300 registry;
- 8302/8303/8304 Tier lists;
- 8312/8313/8314 teleport/cycle;
- 8399 candidate pools / rotation;
- 8400/8401–8404/8499 Location Tier QA.

Project Hub → Tools → DEV World Analyzer shows the same runtime state with filters, candidate pools, rotation and teleport.

Since v0.0.73 the visible countdown above a master and the InteractionPanel countdown are driven by the same real-time `Encounter.expiresAt`. The panel refreshes while open and closes when the Encounter expires.

## Balance status

Distance→Location Tier and Location Tier→Master Tier values remain `candidate-balance`.

No TEST/MATRIX/DEEP run was added in v0.0.65–v0.0.72. The runtime implementation must not be interpreted as final probability approval.

## Visual shell

Since v0.0.77 Stone Masters render as a lightweight top-down humanoid vector shell instead of a single circle. Tier colors, label, glow and the real-time Encounter countdown remain independent presentation layers; final NPC art is still deferred.

Since v0.0.78 the temporary vector shell has a slow idle-facing controller. Rotation is presentation-only and is not persisted in Game State.

## Wandering movement

Since v0.0.79 the rendered master has ephemeral local movement around its Event Spot center. Default speed is about 5 world-px/s. The current Spawn Zone Debug radius (150 px by default) is also the wandering boundary; this does not alter allocator probabilities or the persisted Encounter identity. Movement pauses while an InteractionPanel is open, while the real-time Encounter timer continues normally.


## First functional Extraction Process — v0.0.85–v0.0.88

Master interaction now renders module actions explicitly. Extraction starts a persistent REAL TIME Process stored inside Character↔Master state.

Current QA profile:

```text
duration <= 60 s and <= remaining Encounter lifetime
base = Stone ×10
final = round(base × (1 + LocationBonus) × MasterMultiplier)
```

The values are `candidate-QA`. The architecture is the part being tested.

A finished Process is converted to `pendingRewards` even after reload/offline. The result belongs to the same Master identity and can be claimed on a later suitable encounter. Grant failure does not delete it.
