# UGD-0028 — 12 candidate Event Spots + weighted anti-repeat

Дата: 2026-10-07  
Тип: world-runtime / placement  
Статус: accepted  
Flags: needs-test, candidate-balance  
Теги: event-spots, placement, anti-repeat, master, dynamic-events, worldspawn

## Принятое правило

Каждая текущая карта имеет **12 candidate Event Spot**. Это пул возможных мест появления, а не число одновременно активных объектов.

Одновременно активная capacity остаётся отдельным правилом:

- внешняя зона: Location Tier задаёт 2–6 active Event/NPC;
- safe city: пока legacy active-slot model;
- hard invariant `1 spotId = 1 active occupant` сохраняется.

## Выбор spot

При новом появлении игра выбирает свободный candidate spot случайно, но недавно использованные точки имеют пониженный вес.

Текущий candidate-QA профиль anti-repeat:

```text
последний использованный spot     → 0.15 обычного веса
предыдущий                        → 0.30
ещё один назад                    → 0.50
четвёртый                         → 0.70
пятый                             → 0.85
более старые / неиспользованные   → 1.00
```

Это **не запрет повторов**. Повтор возможен, но статистически менее вероятен.

## Реализация

- **v0.0.94** — все 4 текущие карты имеют `spot-1…spot-12`; старые `spot-1…spot-6` сохранены по id.
- **v0.0.95** — generic Chest/Portal placement хранит последние 6 spots в Dynamic Event zone state и использует weighted random. DEV `8297` показывает recent generic history.
- **v0.0.96** — Master placement хранит последние 6 Master spots в WorldSpawnState и использует тот же weighted anti-repeat профиль.

## Что не меняется

- Location Tier capacity;
- Master Tier probability/caps/rotation;
- Event/Master lifetime;
- REAL TIME timers;
- Game Clock;
- Process economy;
- Event Spot exclusivity.

## Статус чисел

`12 spots` принимается как текущий prototype baseline для существующих карт. Точные anti-repeat веса пока `candidate-QA` и могут быть скорректированы после визуального теста.
