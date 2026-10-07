# UGD-0027 — Event Spot exclusive occupancy

Дата: 2026-10-07  
Тип: system / world-runtime  
Статус: accepted  
Flags: needs-test  
Теги: event-spots, occupancy, master, dynamic-events, worldspawn, capacity

## Принятое правило

Один `Event Spot / spotId` в один момент времени может иметь ровно одного активного владельца.

Допустимые владельцы текущего prototype:

- один Master Encounter;
- один generic Dynamic Event (Chest / Event Portal);
- в future — другой один Event/NPC type.

Недопустимо:

```text
Master + Chest на одном spot
Master + Portal на одном spot
два generic Event на одном spot
два Master на одном spot
```

Spawn Zone circle — это визуализация Event Spot и не является отдельным occupant.

## Причина исправления

В v0.0.89 ручной QA показал Master и legacy generic Resource Event в одном spot.

Корневая причина: `main.js` передавал `worldSpawnStateSystem` в `EventSpotSystem`, но конструктор EventSpotSystem не принимал и не сохранял этот dependency. Поэтому generic-event runtime не видел Master-reserved spotId, Location Tier capacity и external Tier rules.

## Исправления

- **v0.0.90** — EventSpotSystem реально подключён к WorldSpawnStateSystem.
- **v0.0.91** — hard exclusivity: dedupe state, render guard, безопасный expiration replacement, DEV `8298`.
- **v0.0.92** — existing Chest/Portal при Master reservation переносится на свободный spot с сохранением id/timer/offer.

## Приоритет владельца

В текущем prototype Master reservation имеет приоритет при пересчёте world/master state. Generic Event адаптируется к оставшимся свободным spots, а total occupancy не превышает Location Tier capacity.

Master не получает дополнительный слот: он занимает один слот из общей capacity.

## QA

- визуально на каждой окружности не более одного active object;
- DEV `8298` → конфликтов 0;
- `8299` → generic + master соответствует total Location capacity;
- при Master reroll существующий Chest/Portal может сменить spot, но не должен потерять timer/offer;
- external «Неизвестный ресурс» больше не появляется.
