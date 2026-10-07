# Audit — v0.0.90–v0.0.93 Event Spot exclusivity

Дата: 2026-10-07

## Trigger

Manual QA on v0.0.89 showed two active objects on one Event Spot: Stone Master plus generic «Неизвестный ресурс».

## Root cause

`EventSpotSystem` referenced `this.worldSpawnStateSystem`, but its constructor did not accept/store that dependency even though `main.js` passed it.

Consequences: external tier detection false, Master reserved spots invisible, external capacity unavailable, legacy event pool still possible.

## Fix chain

- v0.0.90 — wire WorldSpawnStateSystem into EventSpotSystem.
- v0.0.91 — dedupe generic spot state, render guard against Master spots, remove unsafe replacement fallback, DEV 8298.
- v0.0.92 — preserve Chest/Portal state by relocating it when Master reserves its old spot.
- v0.0.93 — documentation/audit only.

## Invariant

```text
for every zone:
  for every spotId:
    activeOwnerCount <= 1
```

## Capacity

```text
generic target = Location spawnCapacity - active Master count
total active = generic + Master
total active <= Location spawnCapacity
```

## Manual QA

1. Update/run v0.0.93.
2. Keep Spawn Zone Debug ON.
3. Visually inspect all visible circles: no circle may contain two active entities.
4. Enter DEV 8298 in several external zones → expect конфликтов 0.
5. Enter 8299 → generic count should match desired slots; total generic + master must fit Location capacity.
6. Wait for/reroll Master Encounter if practical and watch occupied spots change.
7. A Chest/Portal displaced by a Master may move to another spot but should keep countdown/offer.
8. Confirm external «Неизвестный ресурс» does not return.
9. Continue Extraction QA after occupancy is clean.

## Not changed

- Location Tier probabilities;
- Master Tier caps/rotation;
- Encounter lifetime;
- Game Clock;
- Process timing/economy;
- save schema.
