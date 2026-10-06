# uGame — предварительный план реализации после Simulation Lab

Дата: 2026-10-07  
Статус: рабочий план, должен быть объединён с пользовательским пакетом патчей перед началом следующего большого gameplay-патча.

## Цель

После Project Hub, Simulation Lab и первой серии расчётов проект возвращается к **content-first gameplay development**.

Тестирование вероятностей на этом этапе останавливается. Дальше сначала реализуются конкретные игровые системы и пользовательские правки, а Simulation Lab используется только когда появляется новый вопрос, требующий массового расчёта.

## Вход перед началом

Перед следующим gameplay-патчем нужно получить и разобрать пользовательский пакет правок/пожеланий.

Процесс:

```text
пакет пользователя
↓
сопоставить с CURRENT / UGD-0015..0020
↓
найти конфликты / дубли / зависимости
↓
перестроить приоритеты этого плана
↓
только потом код
```

Этот документ не должен отменять более свежие решения пользователя.

## Этап A — закрепить текущую основу

Состояние после v0.0.40:

- Project Hub;
- встроенная документация/Journal;
- Simulation Lab v0.2;
- публичный архив ключевых Simulation runs;
- Attention cadence guardrail;
- текущий gameplay v0.0.35–0.0.39 foundation;
- combat по-прежнему отложен.

Никакой новой большой механики на этом этапе не добавлять.

## Этап B — принять пользовательский пакет патчей

Для каждого пункта:

- gameplay / UI / docs / balance / tooling;
- срочность;
- влияет ли на save schema;
- пересекается ли с World/NPC architecture;
- можно ли сделать отдельным маленьким patch;
- нужен ли backup/migration;
- QA-критерий.

Результат — конкретная patch queue.

## Этап C — WorldSpawnState / Location Tier runtime

Перенести принятые идеи UGD-0016 из Simulation Lab в реальный gameplay **без лишнего контента**.

Минимум:

- persistent Location Tier-state для каждой внешней зоны;
- отдельный lifetime Tier-state;
- расчёт distance-from-safe-city через WorldGraph;
- biome/resource eligibility data;
- active Event/NPC spawn capacity до 6;
- local serializable WorldSpawnState;
- отсутствие backend на этом этапе;
- save/reload не даёт бесплатный reroll.

Важно: candidate probability tables из Simulation Lab не копируются автоматически как финальный баланс. Они являются starting candidates.

## Этап D — Master NPC runtime

После WorldSpawnState:

- master definition;
- encounter/spawn instance;
- character↔master relationship state;
- постоянный Tier master identity;
- один resourceDirection на master;
- caps T4=1 / T3=2 / T2=3 на resourceDirection;
- отсутствие candidate = отсутствие соответствующего Tier;
- independent rotation coverage для каждого `resourceDirection + masterTier`;
- Encounter lifetime ~30 min;
- active Process/Quest не выходит за lifetime Encounter;
- completed pending reward сохраняется по правилам UGD-0015.

Начать с одного resourceDirection — Stone.

## Этап E — DEV World Analyzer

Сделать до массового контента, чтобы мир можно было проверять без ручного бега.

Project Hub → DEV World Analyzer:

- список всех active master;
- фильтр resource/Tier;
- zone / biome / Location Tier;
- remaining lifetime;
- candidate pool;
- current rotation round;
- visited/unvisited;
- Next / Previous;
- Teleport.

Подключить зарезервированные DEV 83xx как клавиатурный fallback.

Это обязательный QA-инструмент перед расширением количества зон/NPC.

## Этап F — Resource master modules

После стабильного WorldSpawnState:

- гарантированный модуль Добыча;
- случайные modules по Tier;
- Dialogue;
- Quest;
- Analytics;
- Training/Skill Tree;
- special Event module.

Правило модулей:

```text
T1 → 2–3
T2 → 3–4
T3 → 4–6
T4 → все гарантированы
```

Extraction гарантирован всегда.

Master multiplier:

```text
T1 ×1.00
T2 ×1.20
T3 ×1.40
T4 ×1.60
```

Применяется к XP/reward этого master после обычных additive bonus.

## Этап G — Character resource progression

Для Stone prototype:

- Stone resource-direction skill tree;
- progression хранится у персонажа;
- все Stone master работают с одним Stone/Quarry tree;
- просмотр изученного доступен всегда;
- обучение/трата points — только у NPC с выпавшим Training module;
- без respec в baseline;
- Relationship character-scoped.

Не создавать отдельное огромное дерево для каждого NPC.

## Этап H — Attention / Impulse

Только после того, как resource/master loop реально играется.

Нужно:

- убрать/заменить prototype direct `Attention ×1` reward;
- определить реальные источники Attention;
- связать или не связать с Импульсом;
- держать cadence guardrail UGD-0020;
- логировать Attention source;
- >10/week → anomaly review;
- special World/Event overrides разрешены отдельными правилами.

До этого текущая Attention в Dynamic Event — dev/prototype placeholder.

## Этап I — повторный Simulation Lab

Запускать только после реального изменения системы.

Минимальный следующий meaningful test:

- live WorldSpawnState snapshot;
- candidate vs actual probabilities;
- master search effort;
- Attention cadence, когда появится настоящая формула.

DEEP 1M не является обязательным ритуалом. Он запускается только для конкретного вопроса.

## Отложено

Пока не входят в эту очередь:

- combat;
- enemies;
- server-authoritative MMORPG backend;
- multiplayer sync;
- большая Lore-база;
- финальные имена/портреты master;
- сложная telemetry infrastructure;
- monetization.

## Правило размера патчей

Предпочтительно:

```text
одна проверяемая игровая цель
→ один patch
→ QA
→ документация
→ следующий patch
```

Большой пакет пользователя сначала разбивается на независимые куски, кроме случаев, где разделение технически создаёт больше риска.

## Следующее действие

Не начинать Этап C автоматически.

Сначала пользователь передаёт свой пакет правок/большого патча. После анализа пакет объединяется с этим планом и формируется конкретная очередь версий.
