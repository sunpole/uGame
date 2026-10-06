# UGD-0019 — Player Effort: клики, поиск master и Attention-equivalent

Дата: 2026-10-06  
Тип: system / analytics  
Статус: accepted  
Flags: needs-test, needs-calculation  
Теги: player-effort, clicks, attention, resources, npc, simulation, analytics, qa

## Контекст

Для uGame важно измерять не только внутриигровую награду, но и реальное усилие игрока: сколько действий/кликов и минимального времени требуется, чтобы найти нужного master NPC и получить заданный объём прогресса.

Это соответствует общей философии uGame: короткие осмысленные сессии и прозрачная цена действий вместо скрытого многочасового гринда.

## Что считаем действием

Для первой аналитической модели:

```text
выход из города                  = 1 действие
диалог/взаимодействие с NPC      = 1 действие
поиск/переход к следующему NPC   = 1 действие
получение одной ресурсной порции = 1 действие
```

Пример поиска:

```text
1. выйти из города
2. открыть/проверить первого NPC
3. искать следующего NPC
4. открыть/проверить второго NPC
...
```

При N проверенных NPC базовая модель даёт примерно `2 × N` действий.

Это именно аналитическая единица UX-нагрузки. Позже одно действие может быть разбито на движение, меню, подтверждение и т.п.

## Добыча у resource master

Первая тестовая модель:

- одна ресурсная порция = случайно 1–10 единиц базового ресурса;
- одно reward-действие возможно раз в 3 минуты;
- wandering NPC живёт максимум 30 минут;
- свежий Encounter даёт максимум 10 reward-действий;
- master multiplier и Location Tier применяются по уже принятой формуле награды.

## 1 Attention-equivalent

Текущий `data/resources.json` содержит:

```text
Stone baseValue     = 1
Attention baseValue = 5000
```

Поэтому Simulation Lab использует:

```text
1 Attention-equivalent = 5000 Stone-value
```

Это **не игровой обмен** и не утверждение, что игрок сможет обменивать Камень на Внимание. Это единица аналитического сравнения затрат игрока.

Если resource values позже изменятся, Simulation Lab должен читать их из общего `resources.json`, а не хранить отдельную копию курса.

## Какие сценарии считаем

### 1. Поиск конкретного master Tier

Для каждой Location Tier T1–T4 считаем:

- фактическую вероятность увидеть T1/T2/T3/T4 master после world caps/rotation;
- expected NPC checks;
- median NPC checks;
- p95 NPC checks;
- expected / median / p95 clicks.

### 2. Накопление 1 Attention-equivalent

Для игрока, который фармит только в Location Tier T1, T2, T3 или T4, считаем:

- expected master multiplier;
- expected Stone per reward action;
- сколько reward-actions нужно для 5000 Stone-value;
- минимальное interaction time при интервале 3 минуты;
- сколько Encounter потребуется;
- сколько total clicks потребуется.

Два сценария Encounter:

```text
Fresh
→ игрок получил полный 30-минутный Encounter
→ до 10 reward-actions

Random arrival
→ игрок нашёл NPC уже во время его жизни
→ среднее доступное окно меньше
```

## Что пока НЕ входит во время

Первый анализ времени считает interval между reward-actions, но **не знает реальную длительность перемещения по карте**.

Поэтому отчёт должен разделять:

```text
click/action cost
interaction cadence time
world travel/wait time — future
```

Когда появятся реальные размеры зон, скорость движения, portal time и NPC positions, travel time добавится отдельным слоем.

## Master rotation — подтверждение модели

Для каждого `resourceDirection + masterTier` существует отдельная rotation history.

Caps:

```text
T4 max simultaneous = 1
T3 max simultaneous = 2
T2 max simultaneous = 3
T1 = остальные
```

Это только максимумы, не обязательные targetCount.

Если current random candidate pool пуст — соответствующего master Tier нет.

Если candidate pool содержит несколько зон, master сначала покрывает ещё не посещённые зоны текущего круга. После покрытия текущего eligible pool начинается новый круг.

Пулы и круги независимы:

```text
Stone T4 ≠ Water T4
Stone T4 ≠ Stone T3
Wood T2 ≠ Water T2
```

World reroll может изменить candidate pool. Повтор одной зоны подряд разрешён, если после нового расчёта она снова является допустимой и rotation state это позволяет.

## DEV / QA навигация

Когда master NPC и WorldSpawnState будут реализованы в gameplay, разработчику необходим быстрый способ проверить весь мир без ручного бега.

Требование:

- список active T2/T3/T4 master instance;
- resourceDirection;
- master identity;
- zone id/name;
- Location Tier;
- оставшийся lifetime;
- rotation round / visited state;
- кнопка/команда Teleport;
- переход Next/Previous между instance одного Tier.

В Project Hub будущий **DEV World Analyzer** должен давать кликабельный список с TP-кнопками.

Также резервируется console-range `83xx` под Master NPC QA (см. DEV-CODES.md).

## Реализация Simulation Lab v0.2

Добавлено:

- явный per-master rotation coverage allocator;
- отсутствие candidate означает отсутствие high-tier master;
- world caps остаются максимумами;
- analytical Attention-equivalent из общего resources.json;
- таблица click-cost по Location Tier;
- таблица поиска T1/T2/T3/T4 master;
- CSV/SVG/HTML секции effort;
- rotation coverage statistics.

## Статус

Метрика Player Effort и первая модель click/time анализа **приняты как инструмент балансировки**, но сами числа наград 1–10, интервал 3 минуты и эквивалент через текущий baseValue остаются кандидатами для расчётов и не считаются финальной экономикой.
