# uGame — Audit: Location Tier / Biome / NPC World Spawn / Reward Stack

Дата: 2026-10-06
Статус: OPEN — архитектура в целом совместима, баланс/spawn formula требует уточнений

## Проверено

Сверены UGD-0004, UGD-0010, UGD-0011, UGD-0013, UGD-0015, новый UGD-0016, CURRENT, ACTIVE-IDLE-CORE, `data/reward-rules.json`, `data/world.json`, текущий Event/Save/Container фундамент.

## Итог

Новая модель **не конфликтует с базовой архитектурой uGame**. Её можно реализовать без переписывания Interactable/Event/Container принципов, но текущий playable prototype содержит старые QA-числа и не имеет нескольких необходимых data layers.

Полную реализацию spawn/balance пока лучше не начинать до закрытия нескольких правил. При этом data schema, WorldGraph metadata и симулятор вероятностей можно проектировать уже сейчас.

## Закрытые вопросы старого NPC-аудита

1. Tier постоянен у master identity — закрыто.
2. Location Tier влияет на шансы NPC Tier — закрыто концептуально; точная conditional matrix перенесена в этот аудит.
3. Master multiplier умножает XP и награду только этого NPC — закрыто.
4. Все Stone-master дают доступ к одному Character Stone/Quarry tree — закрыто.
5. Relationship state принадлежит персонажу, не аккаунту — закрыто.
6. Просмотр skill/progression доступен всегда; обучение/трата очков только через выпавший Training module — закрыто.
7. Process/quest не может быть длиннее оставшегося lifetime NPC; после despawn незавершённое закрывается — закрыто.
8. Resource interaction представлен wandering NPC; Bank/service — resident NPC мирного города — закрыто.
9. Mixed resource specialization отсутствует — закрыто.
10. Respec по умолчанию отсутствует; возможен будущий особый quest — закрыто.

## Найденные расхождения с текущим прототипом

### C1 — Active Event count

Сейчас UGD-0013/code data: `1 / 2 / 3 / 5` active slots.

Новая модель: `2–4 / 2–5 / 3–6 / 5–6`.

Это **осознанная смена тестового баланса**, не архитектурный конфликт.

### C2 — Event Spot capacity

Сейчас каждая существующая зона имеет ровно **5 Event Spots**.

Новая модель допускает **6 одновременно активных** Event/NPC. Следовательно, текущих координат физически недостаточно для T3/T4 max.

Перед playable-реализацией нужно добавить минимум 6 eligible spots либо перейти к генерации/пулу spawn positions.

### C3 — Location Tier duration

Сейчас:

```text
T1 150–180 min
T2 120–160
T3 75–120
T4 60–90
```

Новая модель:

```text
T1 120–180 min
T2 90–150
T3 60–120
T4 60–90
```

T4 совпадает; остальные расширены/ускорены.

### C4 — Uniform location rarity

Сейчас все зоны используют одну таблицу `80 / 15 / 3.5 / 1.5`.

Новая модель требует spatial pressure: шанс Location Tier зависит от расстояния до безопасного города.

### C5 — World metadata отсутствует

`world.json` пока не хранит:

- `zoneKind` / peaceful-city vs outside;
- `biomeId`;
- resource weights by biome;
- distance / distance band from safe city;
- location tier rules;
- NPC spawn pools;
- resourceDirection eligibility.

Это можно добавить data-driven без ломки WorldGraph.

### C6 — Bank пока объект, не resident NPC

Текущий `city-bank-prototype` имеет `type: bank`. Будущая концепция требует resident NPC, который открывает Bank module/service. ContainerSystem менять не требуется — изменится entry point.

### C7 — Pending reward persistence

Сейчас pending dynamic Reward хранится на Event Spot/offer. Новая механика требует дополнительного состояния `Character↔Master pendingRewards`, чтобы завершённый результат переживал despawn и выдавался при будущей встрече с тем же master при наличии нужного модуля.

## Математический sanity check

### Baseline без distance pressure

Если 8 внешних зон независимо имеют T4 chance `1.5%`:

- ни одной T4: ~88.61%;
- ровно одна T4: ~10.80%;
- хотя бы одна T4: ~11.39%;
- две или больше T4: ~0.59%.

То есть интуиция «две T4 при baseline редки» верна. Но после повышения дальних зон до 10–20% эта статистика станет другой и должна рассчитываться по реальному WorldGraph.

### Плотность Event и lifetime

Если `2–4 / 2–5 / 3–6 / 5–6` — это simultaneous active spawn, а отдельный Event всё ещё живёт 30 минут, средние значения дают:

| Tier | mean active | mean tier-state | пример slot-cycles |
| --- | ---: | ---: | ---: |
| T1 | 3.0 | 2.5 h | 15.0 |
| T2 | 3.5 | 2.0 h | 14.0 |
| T3 | 4.5 | 1.5 h | 13.5 |
| T4 | 5.5 | 1.25 h | 13.75 |

Интересный эффект: более высокий Tier плотнее, но короче, поэтому общее количество slot-cycle за одно состояние неожиданно близко. Это хороший кандидат для дальнейшего баланса, но расчёт зависит от подтверждения 30-минутного Event lifetime.

### Reward multiplier

При отсутствии других bonus:

| Location \ Master | T1 ×1.0 | T2 ×1.2 | T3 ×1.4 | T4 ×1.6 |
| --- | ---: | ---: | ---: | ---: |
| T1 ×1.0 | 1.00 | 1.20 | 1.40 | 1.60 |
| T2 ×1.2 | 1.20 | 1.44 | 1.68 | 1.92 |
| T3 ×1.4 | 1.40 | 1.68 | 1.96 | 2.24 |
| T4 ×1.6 | 1.60 | 1.92 | 2.24 | 2.56 |

То есть T4 zone + T4 master уже даёт `×2.56` base до прочих additive bonus. Это существенно, но соответствует заявленной цели: master multiplier должен быть наиболее ценным внешним множителем.

## Что рекомендуется хранить отдельно

```text
zone.biomeId
zone.zoneKind
zone.safeHubDistance / distanceBand

locationTierState:
  tier
  rolledAt
  expiresAt
  activeSpawnTarget

masterDefinition:
  masterId
  resourceDirectionId
  tier
  professionId
  modulePool

masterSpawnInstance:
  spawnId
  masterId
  zoneId
  eventSpotId
  spawnedAt
  expiresAt
  activeModules

characterMasterState:
  characterId
  masterId
  relationship...
  pendingRewards...

characterDirectionProgression:
  characterId
  resourceDirectionId
  skill tree / mastery...
```

## Остались блокирующие уточнения

### B1. Семантика «жизнь локации»

Это lifetime текущего **Tier-state** постоянной зоны, после чего она reroll T1–T4, или сама зона физически исчезает/перегенерируется?

Для текущего авторского WorldGraph логичнее Tier-state lifetime.

### B2. Значение диапазона Event spawn

`2–4 / 2–5 / 3–6 / 5–6` — число **одновременно активных** точек или всего Event за lifetime Tier-state?

Контекст предыдущей механики указывает на simultaneous active, но это нужно подтвердить.

### B3. Distance curve

Нужно выбрать точную таблицу или формулу `distance → P(Location Tier)`.

Рекомендуется не зашивать формулу в код на первом шаге, а хранить probability table по `distanceBand`, а затем подобрать её симуляцией.

### B4. Conditional NPC Tier matrix

Нужно определить `P(Master Tier | Location Tier)`. Принцип уже ясен: high-tier location повышает high-tier master, но конкретные проценты ещё не приняты.

### B5. World caps

`T4=1 / T3=2 / T2=3` на один resourceDirection — финальное правило или пример для мира примерно из 40 eligible resource spawns?

Если мир увеличится в 10 раз, фиксированный cap даст совершенно другую редкость.

### B6. Cap fallback

Если roll выбрал T4, но T4 cap уже занят, что происходит:

- weighted reroll только среди разрешённых tiers;
- downgrade T4→T3→T2→T1;
- spawn T1;
- слот остаётся пустым?

Это сильно влияет на реальную статистику.

### B7. One high-tier per location

Правило `max 1 NPC T2+ в локации` действует на **все ресурсы вместе** или отдельно на каждый resourceDirection?

### B8. Event lifetime

Сохраняем ли отдельному wandering NPC/Event текущие **30 минут** жизни внутри более длинного Location Tier-state?

## Неблокирующие вопросы

- округление fractional XP/resources;
- визуальное название `Tier` после появления ЛОРа;
- допустимость нескольких spawn-instance одного и того же named T2/T3 master одновременно;
- точные веса ресурсов внутри каждого биома;
- как будет масштабироваться система при сотнях зон.

## Вердикт

**Архитектуру уже можно проектировать. Финальную игровую реализацию spawn/balance — пока нет.**

Наиболее полезный следующий технический шаг после ответов B1/B2/B5–B8 — отдельный deterministic simulation script, который по WorldGraph, городам, биомам, distance tables, caps и conditional Tier matrix прогоняет десятки/сотни тысяч циклов и показывает фактическую частоту T1–T4, blocked/rerolled spawn, средний reward/XP и время ожидания редких master.
