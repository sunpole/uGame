# uGame — предварительный план реализации после Simulation Lab

Дата: 2026-10-07  
Статус: Stage C–E и module availability реализованы до v0.0.72; v0.0.73–v0.0.79 закрывают Master UX/DEV presentation series; v0.0.81–v0.0.83 убирают parallel Resource Event и усиливают DEV spawn-zone QA. Текущая точка — ручной QA v0.0.83, затем функциональная Добыча/Process.

## Цель

После Project Hub, Simulation Lab и первой серии расчётов проект возвращается к **content-first gameplay development**.

Тестирование вероятностей на этом этапе останавливается. Дальше сначала реализуются конкретные игровые системы и пользовательские правки, а Simulation Lab используется только когда появляется новый вопрос, требующий массового расчёта.

## Вход перед началом

Перед следующим gameplay-патчем нужно получить и разобрать пользовательский пакет правок/пожеланий.

Процесс:

```text
пакет пользователя
↓
сопоставить с CURRENT / UGD-0015..0021
↓
найти конфликты / дубли / зависимости
↓
перестроить приоритеты этого плана
↓
только потом код
```

Этот документ не должен отменять более свежие решения пользователя.

## Этап A — закрепить текущую основу

Состояние после v0.0.80:

- Project Hub;
- встроенная документация/Journal;
- Simulation Lab v0.2;
- публичный архив ключевых Simulation runs;
- Attention cadence guardrail;
- текущий gameplay v0.0.35–0.0.39 foundation;
- Persistent Game Chrome v0.0.41–v0.0.48: Header/Workspace/Footer, build/session/location/real/game clocks, live character/resources header, Action Router, AnyDesk controls, text-selection settings, shared Journal/Simulation chrome;
- Workspace Window Policy v0.0.49–v0.0.53: bounded runtime windows, scale-first fallback, formal layers and visible Game Clock seconds/phase;
- Responsive Workspace + Biome Visual Layer v0.0.54–v0.0.58: normal-size Bank/Inventory, full Workspace game viewport, responsive non-stretch camera, six biome/city floor slots and temporary Biome Visual Lab;
- WorldSpawnState / Location Tier Stage C v0.0.60–v0.0.64: persistent local world state, safe-city graph distance, Stone eligibility, external T1–T4 real-time Tier-state, 2–6 capacity and 84xx QA;
- Persistent Location Intel v0.0.65: LT / distance / current-tier chance / location bonus always visible in Header/Footer;
- Stone Master Stage D v0.0.66–v0.0.70: four identities, persistent 30m Encounter, candidate allocator, caps/rotation, visible Tier NPC, character relationship history and active 83xx QA;
- DEV World Analyzer Stage E v0.0.71;
- Stage F availability v0.0.72: Extraction guaranteed, Tier-driven module set persisted per Encounter;
- Master UX/DEV v0.0.73–v0.0.79: live Encounter timer, biome 40/40, Spawn Zone Debug controls, temporary humanoid shell, slow facing/wandering;
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

**Prototype implemented: v0.0.60–v0.0.64. Manual QA pending.**

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

**Prototype implemented: v0.0.66–v0.0.70. Manual QA pending.**

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

**Implemented: v0.0.71. Manual QA pending.**

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

**Availability layer implemented in v0.0.72; first functional Extraction implemented in v0.0.85–v0.0.88. Other module actions are still pending.**

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

1. Провести ручной QA v0.0.93: Event Spot exclusivity + Stone runtime + Spawn Zone + module action menu + persistent Extraction + offline pending reward + claim.
2. После успешного QA считать первый Process vertical slice подтверждённым.
3. Затем отдельными маленькими версиями подключать Dialogue → Analytics → Quest → Training → special Event по фактической игровой необходимости.
