# uGame — Persistent Game State + SaveSystem

Current prototype schema: **1**.

The persistence layer stores significant game consequences, not every transient scene detail. This follows the accepted Project Journal direction in `UGD-0008`.

## Source model

`src/game-state.js` owns the serializable game-state shape.

Schema v1 stores:

- selected class id;
- current zone id and entry side;
- ids of used one-time interactables;
- resource counters;
- inventory stacks;
- active quest id and step;
- completed quests;
- already seen quest signals;
- last completed quest title;
- Dynamic Event Spot state: zone quality, quality expiry, active slots, event expiry/consumed state and pending reward choices.

Exact player coordinates, stamina, animation phase, temporary dialogue UI state and other transient scene details are intentionally not saved.

## Persistence adapter

`src/save-system.js` is the browser persistence adapter.

Current key:

`ugame.save.v1`

Storage is browser `localStorage`. The adapter rejects unsupported schema versions instead of silently overwriting them.

A save belongs to the browser origin. For example, `http://127.0.0.1:5173`, `http://192.168.x.x:5173` and GitHub Pages are different origins and therefore have separate local saves.

## Autosave triggers

The prototype saves after significant state changes:

- class change;
- zone entry;
- resource change;
- inventory change;
- quest-state change;
- use of a one-time interactable;
- Dynamic Event Spot reroll, reward-offer generation and reward-choice progress.

Movement by itself does not trigger saves.

## DEV verification

- `9001` — save now.
- `9002` — delete local save and pause autosave until reload.
- `9099` — show save status and last save time.

## Acceptance test

1. Start from a clean save with `9002`, then reload the page.
2. Change class with `7002` or `7003`.
3. Collect the Zone 1 shard.
4. Open the old chest or advance the test quest.
5. Travel to Zone 2.
6. Use `9099` and confirm a save timestamp exists.
7. Reload the browser page.
8. Confirm the selected class profile is restored.
9. Confirm the game starts in the saved zone/entry context.
10. Confirm resource and inventory counters are restored.
11. Confirm previously used one-time objects do not reappear as available objects.
12. Confirm quest progress/completion is restored without granting rewards again.
13. Open a dynamic resource/chest offer, reload before finishing it, and confirm the same generated offer remains instead of rerolling.
14. Confirm zone quality/event timers continue from their saved timestamps.

## Current limitations

This is deliberately a prototype persistence adapter, not an account/cloud save system.

- No server synchronization.
- No cross-device save transfer.
- No schema migrations yet; only schema v1 exists.
- No conflict resolution.
- No trusted/authoritative anti-cheat storage.
- Dynamic Event Spots use real timestamps, but there is still no general Process/Offline Idle progression system.

Future systems should depend on the serializable Game State rather than writing their own unrelated localStorage records.
