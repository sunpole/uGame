# UGD-0017 — uGame Simulation Lab: headless-симуляция мира и балансировки

Дата: 2026-10-06  
Тип: tooling  
Статус: accepted  
Flags: needs-prototype, needs-test  
Теги: simulation, balancing, tooling, world, probability, analytics, reports, deterministic

## Контекст

После принятия `UGD-0016` стало ясно, что probability tables, world caps, distance pressure и rotation fairness нельзя надёжно подбирать только вручную. Несколько уровней случайности и ограничений взаимодействуют между собой, поэтому красивый исходный процент может давать совсем другую фактическую статистику мира.

Принято создать отдельный **uGame Simulation Lab** — headless-инструмент, который использует те же data-driven правила, что и игра, прогоняет мир без графической сцены и выдаёт воспроизводимые отчёты, графики и сравнения.

## Принятое направление

- симуляция выполняется без Phaser, Canvas, DOM и рендера игры;
- во время расчёта не строятся графики и не обновляется GUI;
- расчёт должен быть deterministic при фиксированном seed;
- правила мира читаются из JSON/data, а не дублируются числами внутри симулятора;
- результаты расчёта собираются как агрегаты/счётчики, а визуальные отчёты строятся только после завершения прогона;
- обязательны режимы маленькой трассировки, массовой проверки и глубокого прогона;
- отчёты разных запусков должны быть сравнимы между собой;
- сам simulator является dev-инструментом и не меняет gameplay save.

## Режимы

| Режим | Типовой размер | Назначение |
| --- | ---: | --- |
| TRACE | 10–100 world cycles | глазами проверить последовательность решений allocator |
| TEST | 100 000 cycles | быстро сравнивать probability tables / caps / distance rules |
| DEEP | 1 000 000 cycles | финальная статистика редких событий, p95/p99 и устойчивость |

Размеры являются preset, а не жёсткими ограничениями.

## Что симулируется

Минимальная цепочка:

```text
WorldGraph / synthetic world preset
→ peaceful cities
→ safe-hub distance
→ biome/resource eligibility
→ Location Tier roll
→ active spawn target
→ Event/resource allocation
→ master allocator
→ world caps + per-location/resource cap
→ rotation history
→ module availability
→ XP / reward calculation
→ timers / reroll
→ next world state
```

Симулятор должен уметь запускаться как на текущем маленьком мире, так и на synthetic presets `8 / 30 / 50 / 100+` внешних зон.

## Какие метрики обязательны

- фактическое распределение Location Tier по distance band;
- фактическое распределение NPC/master Tier по Location Tier;
- количество и доля spawn каждого resourceDirection;
- среднее / median / p90 / p95 / p99 время ожидания high-tier master;
- blocked high-tier attempts из-за world cap;
- blocked high-tier attempts из-за `max one T2+ per location per resourceDirection`;
- downgrade/fallback counts;
- доля времени, когда T4 master существует / отсутствует;
- распределение T4/T3 между eligible zones и fairness ротации;
- средний, median и хвосты XP/reward multiplier;
- средний reward per cycle / per simulated hour;
- active spawn density;
- sensitivity при разных размерах мира;
- выявленные saturation points, где caps перестают соответствовать масштабу мира.

## Анализ ошибок и предупреждения

Отчёт должен автоматически формировать warnings, например:

```text
T4 master p95 wait > target
>50% T4 attempts blocked by cap
one zone receives high-tier masters disproportionately often
near-city T4 chance exceeds configured safety target
far-zone T4 chance never reaches intended range
world-size growth collapses T3/T4 availability
average reward multiplier grows faster than expected
configured tier exists but almost never appears in actual world
```

Пороговые значения warnings должны быть data-driven и со временем уточняться.

## Единые правила с игрой

Нельзя поддерживать две независимые экономики — одну в Python и другую в JS.

Целевой принцип:

```text
data/*.json = source of balance truth
      ↓                  ↓
Python simulator      uGame runtime
      ↓                  ↓
статистика           gameplay
```

Алгоритм allocator также должен иметь формально описанные шаги и deterministic fixtures, чтобы Python и JS можно было проверять на одинаковых входных данных.

## Запуск без локальной установки Python

Предпочтительный первый способ — **manual GitHub Actions workflow**.

Пользователь открывает GitHub → Actions → uGame Simulation Lab → Run workflow, выбирает preset/число циклов/seed/world size. GitHub runner запускает Python, а результат сохраняется как downloadable artifact.

Преимущества:

- ничего не устанавливать на локальный ПК;
- одинаковая версия Python и зависимостей;
- воспроизводимый clean environment;
- удобно запускать DEEP 1M даже с другого компьютера;
- artifact не изменяет repository working tree;
- можно сохранять metadata Git commit SHA.

Это предпочтительнее browser-Python/Pyodide как основной режим: Pyodide технически возможен, но требует загрузки Python runtime в браузер и менее удобен для тяжёлых миллионных simulation runs.

## Локальный fallback

Второй способ — запуск через существующий `Update-uGame.cmd`.

После реализации updater может получить отдельный безопасный пункт, например:

```text
9. Simulation Lab
```

Он не должен автоматически устанавливать Python или зависимости. Он только обнаруживает доступный trusted local Python и после явного подтверждения запускает repository-owned simulator с выбранным preset.

Если Python отсутствует, updater должен показать понятное сообщение и предложить использовать GitHub Actions web-run, а не пытаться что-либо ставить сам.

## Почему не запускать через обычную игру

Внутриигровой DEV Analyzer полезен позже для проверки текущего `WorldSpawnState`, но он не заменяет массовую симуляцию.

Разделение:

```text
Python Simulation Lab
→ 100k / 1M cycles
→ статистика / тренды / comparison

uGame DEV World Analyzer
→ посмотреть один реальный текущий world state
→ reroll / trace / registry / timers
```

## Формат результата одного запуска

Каждый run получает стабильный `runId` и manifest.

Рекомендуемая структура artifact/local report:

```text
SIM-20261006-203800-deep-seed42/
  manifest.json
  summary.json
  summary.csv
  warnings.json
  report.html
  tables/
    location-tier-by-distance.csv
    master-tier-by-location-tier.csv
    world-caps.csv
    reward-multipliers.csv
    rotation-fairness.csv
  charts/
    location-tier-by-distance.svg
    master-tier-distribution.svg
    t4-wait-time.svg
    cap-block-rate.svg
    reward-multiplier.svg
  trace.txt              # TRACE only
```

## Manifest

`manifest.json` должен минимум содержать:

```text
runId
createdAt
simulatorVersion
gitCommit
configHash
seed
mode
cycles
worldPreset
externalZoneCount
cityCount
inputFiles[]
durationMs
pythonVersion
```

Без manifest сравнение двух отчётов недостоверно.

## Report HTML

`report.html` должен быть самодостаточным и открываться двойным кликом без сервера.

Первый экран:

- verdict: OK / REVIEW / BAD;
- параметры run;
- 5–10 ключевых KPI;
- список warnings;
- отличие от выбранного baseline run.

Дальше:

- таблицы распределений;
- графики;
- p50/p95/p99;
- world-size sensitivity;
- подробный allocator diagnostics.

Графики строятся **после** simulation loop. Для первой версии предпочтительно генерировать SVG/HTML средствами Python standard library, чтобы не требовать pandas/matplotlib только ради просмотра отчёта. Если позже matplotlib действительно даст ценность, его можно сделать optional/report dependency.

## Сравнение отчётов

Simulation Lab должен поддерживать compare mode:

```text
baseline run A
vs
candidate run B
```

Сравнение показывает:

- абсолютное значение A/B;
- delta;
- delta %;
- направление улучшения/ухудшения;
- новые warnings;
- исчезнувшие warnings;
- config diff;
- одинаковый ли seed/world preset или сравнение статистическое.

Желательно поддерживать сравнение 3–5 run одновременно для trend table, но pairwise A/B является обязательным MVP.

## Хранение результатов

Результаты не должны загрязнять Git working tree и блокировать безопасный updater.

- GitHub web-run: reports хранятся как Actions artifacts;
- local run: `simulation-reports/` должна быть gitignored либо reports выводятся во внешний user-data directory;
- в Git коммитятся только simulator code, configs, docs и при необходимости вручную выбранные benchmark/baseline fixtures;
- миллионные raw event logs не сохраняются; используются агрегаты;
- TRACE может сохранять подробные шаги, потому что он маленький.

## Производительность

Simulation loop должен быть максимально вычислительным:

- никаких sleep/timers;
- никаких изображений/GUI;
- никаких per-cycle файловых записей;
- минимальный объектный churn в горячем цикле;
- счётчики и агрегаты в памяти;
- запись файлов только после run;
- фиксируем elapsed time и cycles/sec;
- сначала standard library, затем оптимизация только по профилированию.

## Determinism

Каждый run обязан иметь seed.

Одинаковые:

```text
git commit + config hash + seed + world preset + cycles + simulator version
```

должны давать одинаковый summary.

Это нужно для regression tests и честного сравнения алгоритмов.

## Первая реализация

MVP Simulation Lab должен содержать:

1. shared simulation config;
2. synthetic world presets 8 / 30 / 50 / 100 external zones;
3. deterministic Python engine;
4. TRACE / TEST / DEEP;
5. JSON + CSV summaries;
6. self-contained HTML report + SVG charts;
7. warnings;
8. A/B report comparison;
9. GitHub Actions manual run;
10. затем local updater launcher;
11. позже DEV World Analyzer внутри игры.

## Что специально не делаем в первой версии

- backend/server world;
- live multiplayer simulation;
- графический realtime renderer;
- сложный dashboard framework;
- database service;
- автоматическую установку Python updater-ом;
- коммит каждого generated report в Git.

## Связи

- UGD-0013 — Dynamic Event Spots.
- UGD-0015 — resource master NPC.
- UGD-0016 — Location Tier / biome / distance / world caps.

## Статус

Решение использовать отдельный headless Simulation Lab перед фиксацией probability tables **принято**. Конкретные probability tables остаются предметом расчёта, а не частью этой записи.
