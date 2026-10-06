# uGame — ContainerSystem

Implemented prototype: **v0.0.35**.

## Files

- `src/item-catalog.js` — unified item/resource metadata.
- `src/container-system.js` — slots, stacks, weight, transfer, equipment and persistence snapshot.
- `src/inventory-panel-system.js` — UI for Backpack, Resource Pouch, Equipment and Bank.
- `data/items.json` — non-resource item definitions.
- `data/resources.json` — resources, value, weight, stack and storage mode.
- `data/containers.json` — container definitions.
- `data/world.json` — prototype Bank interactable on zone-001.

## Current prototype containers

| Container | Slots | Weight | Access |
| --- | ---: | ---: | --- |
| Backpack | 12 | 30 kg | global |
| Resource Pouch | 1 | 15 kg | global; Stone only |
| Equipment | 10 named slots | no container limit | global |
| Bank | 60 | unlimited | only while opened from Bank interactable |

These are test values, not final balance.

## Storage rules

Physical resources/items use slots and weight. Account/intangible resources do not.

Resource auto-placement currently tries:

```text
physical resource
→ Resource Pouch if allowed
→ Backpack
```

Non-resource item:

```text
item
→ Backpack
```

Bank is never used as automatic overflow during normal rewards. It is only automatic overflow during legacy-save migration so existing data is not lost.

## Equipment

Named slots:

`helmet, chest, pants, boots, gloves, ring1, ring2, amulet, cloak, belt`.

DEV code `5011` adds a test helmet and belt. Equip them from the Backpack UI, then remove them from the Equipment tab.

## Bank

The Bank object is on `zone-001` (Перекрёсток). The Bank tab is disabled when the regular Inventory button opens the panel. Interacting with the Bank enables the Bank tab for that panel session.

While Bank access is active, stacks can be transferred to/from Bank.

## Persistence / migration

Container state is stored inside Game State schema 1 as an additive field.

On the first load with no container snapshot:

- old flat `inventory` items migrate to Backpack, overflow to Bank;
- old physical `stone/wood/water` resource counts migrate to Resource Pouch/Backpack, overflow to Bank;
- account resource Attention remains only in the resource ledger.

After migration the new container snapshot becomes authoritative for item placement.

## QA

1. Update and run v0.0.35.
2. Open **Инвентарь**: Backpack/Resources/Equipment are accessible; Bank is disabled.
3. Enter DEV `5001` several times: test items should stack instead of consuming one slot each.
4. Enter DEV `5011`: test helmet and belt should appear in Backpack.
5. Equip both and verify named Equipment slots.
6. Remove one item back to Backpack.
7. On Перекрёсток, interact with **Банк**. Bank tab should now be enabled.
8. Move a stack Backpack → Bank → carried inventory.
9. Obtain Stone from a dynamic reward. It should prefer Resource Pouch while allowed/capacity remains.
10. Obtain Wood/Water. They should use Backpack in the current starter rules.
11. Attention should change the resource counter without adding weight or occupying a slot.
12. Reload and confirm all container positions remain.
13. DEV `5099` should show Backpack/Resource Pouch slot and weight summary.

## Known prototype limitations

- no drag-and-drop;
- no stack split UI;
- no sorting;
- no actual Skill/Profession tree yet;
- no shared carry-weight formula across equipped gear and all portable containers;
- Bank is a prototype service on Перекрёсток, because final city/lore layout is not defined;
- old `InventorySystem` file remains in repository history but runtime uses `ContainerSystem`.
