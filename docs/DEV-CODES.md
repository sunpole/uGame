# DEV-коды uGame / uGame DEV codes

**RU:** В нижней DEV-консоли можно вводить **четырёхзначный код или полное название команды из колонки «Русский» или «English»**. Все 71 действующих кодов принимают оба языка; при вводе доступны подсказки. Например: `тп` / `tp` → **2399**, `зрп +5%` / `xp +5%` → **2101**, `уровень +1` / `level +1` → **2201**, `сохранить` / `save` → **9001**, `помощь` / `help` → **9999**. В Project Hub → «DEV-коды» кнопки «Выполнить» продолжают посылать исходный номер. Это **только тестовые команды**, часть изменяет локальное сохранение. Неизвестные имена или неполные фразы не исполняются. Команда удаления сейва `9002` распознаётся **только по точному совпадению** номера, полного названия или короткого `удалить сохранение` / `delete save`; не использовать на нужном сохранении.

**EN:** In the DEV footer, enter **four digits or any full Russian/English command name shown below**. Autocomplete suggestions cover all 71 current codes. Short equivalents include `tp` / `тп`, `xp +5%` / `зрп +5%`, `level +1` / `уровень +1`, `save` / `сохранить`, and `help` / `помощь`. Project Hub Run buttons still send the original numeric ID. DEV-only; certain commands change the browser save. Unknown or partial names never run.

## Диапазоны / Ranges

| Код / Range | Русский | English |
|---|---|---|
| `1xxx` | Видимость и освещение | Vision and daylight |
| `2xxx` | Персонаж, ЗРЛ, ЗРП, ОТВ, DEV-телепорт | Character, maturity, XP, responsibility, city TP |
| `3xxx` | Движение и Stamina | Movement and stamina |
| `4xxx` | Резерв боевой системы | Reserved for combat |
| `5xxx` | Инвентарь | Inventory |
| `6xxx` | Мир, ресурсы, Шаги | World, resources, steps |
| `7xxx` | Классы | Classes |
| `8xxx` | События, мастера, навыки QA | Events, Masters, skills QA |
| `9xxx` | Сохранение и справочник | Save and reference |

## Персонаж, ЗРЛ, ЗРП, ОТВ / Character, maturity, XP, responsibility

| Код / Code | Русский | English |
|---|---|---|
| `2101` | +5% **текущих** накопленных ЗРП | +5% of **currently held** ZRP |
| `2102` | +10% текущих ЗРП | +10% of held ZRP |
| `2103` | +50% текущих ЗРП | +50% of held ZRP |
| `2111` | −5% текущих ЗРП | −5% of held ZRP |
| `2112` | −10% текущих ЗРП | −10% of held ZRP |
| `2113` | −50% текущих ЗРП | −50% of held ZRP |
| `2201` | +1 ЗРЛ, максимум 65 | +1 maturity level, cap 65 |
| `2202` | −1 ЗРЛ, минимум 1 | −1 maturity level, floor 1 |
| `2299` | Панель персонажа: задать точное ЗРП, ЗРЛ **1–65**, ОТВ (в том числе отрицательное), кнопки ±% | Character control panel: set exact ZRP, maturity **1–65**, OTV (including negative); percentage buttons |
| `2399` | Бесплатный DEV-телепорт: список **всех 5 мирных городов**, выбор одного из любой локации | Free DEV teleport: choose any of **5 safe cities** from anywhere |

**RU:** ЗРП в процентах = изменение текущего числа накопленных очков, **не** процентов заполнения уровня. Если ЗРП = 0, кнопки ±% оставляют 0 — сначала установите начальную величину через `2299`. Таблица порогов ЗРП 1–65 утверждена. Начиная с v0.2.74, DEV-задание ЗРП повышает ЗРЛ при достижении порога, переносит остаток и выдаёт свободные очки характеристик; ручные DEV-коды ±ЗРЛ сохранены. ОТВ хранится отдельно; влияние на производные показатели сейчас рассчитано по **кандидатным формулам Character Balance Lab**, не по окончательному игровому балансу. Повышение через DEV не выдаёт автоматически распределённые очки навыков/пассивов.

**EN:** Percent codes change held experience points, **not** percent-to-next-level. If current XP is zero, use `2299` to set a starting value. The 1–65 XP threshold table is approved; DEV XP changes now level up and carry overflow. Character points can be manually allocated; the passive tree is not live. OTV is saved separately; candidate Lab formulas may show projected stat changes, not final game balance.

**RU:** Телепорт `2399` использует стандартный переход WorldGraph/ZoneSystem и сохраняет позицию; при этом **Шаги и Внимание не расходуются**. Обычный городской телепортер по-прежнему платный. **EN:** DEV teleport uses the normal zone transition/save hooks, but spends no Steps or Attention; normal teleporter costs are unchanged.

## Видимость / Vision

| Код / Code | Русский | English |
|---|---|---|
| `1001` | Круговая видимость | Circle vision |
| `1002` | Конусная видимость | Cone / flashlight |
| `1003` | Полная видимость | Full vision |
| `1004` | Без видимости | No vision |
| `1101` | Уменьшить радиус видимости на 25 | Reduce vision radius by 25 |
| `1102` | Увеличить радиус видимости на 25 | Increase vision radius by 25 |
| `1103` | Сбросить радиус | Reset vision radius |
| `1201` | Темнота вне поля видимости 100% | Darkness outside vision 100% |
| `1202` | Темнота 90% | Darkness 90% |
| `1203` | Темнота 75% | Darkness 75% |
| `1399` | Текущая фаза дневного освещения | Current daylight / game clock phase |

## Движение / Movement

| Код / Code | Русский | English |
|---|---|---|
| `3001` | Восполнить Stamina для рывка | Refill dash stamina |
| `3099` | Показать скорость и Stamina | Show speed and stamina |

## Инвентарь / Inventory

| Код / Code | Русский | English |
|---|---|---|
| `5001` | Добавить тестовый предмет (stack) | Add a stackable test item |
| `5011` | Выдать тестовый шлем и ремень | Grant DEV training helmet and belt |
| `5099` | Слоты/вес рюкзака и сумки ресурсов | Show bag/resource pouch slots and weight |

## Ресурсы, Шаги / Resources, Steps

| Код / Code | Русский | English |
|---|---|---|
| `6001` | Добавить осколок | Add a shard |
| `6099` | Показать осколки | Show shard count |
| `6401` | Добавить 1 000 Шагов | Add 1,000 Steps |
| `6402` | Списать 1 000 Шагов, долг возможен | Spend 1,000 Steps; debt permitted |
| `6499` | Показать баланс Шагов / Внимания | Show Steps and Attention status |

## Классы / Classes

| Код / Code | Русский | English |
|---|---|---|
| `7001` | Странник | Wanderer class |
| `7002` | Разведчик | Scout class |
| `7003` | Следопыт | Tracker class |
| `7099` | Текущий класс | Current class |

## События и квесты / Events and quests

| Код / Code | Русский | English |
|---|---|---|
| `8001` | Перезапустить первый квест | Restart first quest |
| `8099` | Статус квестов | Quest status |
| `8201` | Пересоздать события текущей зоны | Recreate current-zone events |
| `8202` | Перебросить качество Q безопасного прототипа зоны | Reroll prototype safe-zone quality |
| `8211` | Установить качество Q1 (только прототип города) | Set Q1 (city prototype only) |
| `8212` | Установить качество Q2 | Set Q2 |
| `8213` | Установить качество Q3 | Set Q3 |
| `8214` | Установить качество Q4 | Set Q4 |
| `8297` | История размещения событий | Event placement history |
| `8298` | Проверить конфликты заполнения спотов | Check event-spot occupancy conflicts |
| `8299` | Статус динамических событий | Dynamic events status |

## Мастера NPC / Masters

| Код / Code | Русский | English |
|---|---|---|
| `8300` | Сводка активных мастеров по ресурсам | Active Master summary by resource |
| `8302` | Список каменных мастеров T2 | List active T2 Stone Masters |
| `8303` | Список каменных мастеров T3 | List active T3 Stone Masters |
| `8304` | Список каменных мастеров T4 | List active T4 Stone Masters |
| `8312` | Переход к следующему каменному мастеру T2 | Teleport/cycle to T2 Stone Master |
| `8313` | Переход к следующему каменному мастеру T3 | Teleport/cycle to T3 Stone Master |
| `8314` | Переход к следующему каменному мастеру T4 | Teleport/cycle to T4 Stone Master |
| `8388` | Диагностика последнего/ближайшего мастера и награды | Last/nearest Master reward diagnostic |
| `8399` | Пулы кандидатов и ротация спавна | Candidate pools and spawn rotation |

## Уровни локаций / Location Tiers

| Код / Code | Русский | English |
|---|---|---|
| `8400` | Перебросить Tier внешней зоны | Reroll current external location tier |
| `8401` | Установить T1 | Force T1 |
| `8402` | Установить T2 | Force T2 |
| `8403` | Установить T3 | Force T3 |
| `8404` | Установить T4 | Force T4 |
| `8499` | Текущий Tier, дистанция, лимиты и время | Current Tier, city distance, cap and lifetime |

## Ресурсы навыков / Skill resource QA

| Код / Code | Русский | English |
|---|---|---|
| `8661` | Проверочный расход ХП, ПП, РП, ЖП | Test depletion of HP, PP, RP, JP |
| `8662` | Полное восстановление четырёх запасов | Refill all four character pools |
| `8671` | Без перезарядки навыков (переключатель) | No skill cooldowns (toggle) |
| `8672` | Бессмертие: ХП не ниже 1 (переключатель) | Immortal: HP never below 1 (toggle) |
| `8673` | Навыки без расхода ресурсов (переключатель) | Free skills: no resource costs (toggle) |
| `8674` | Полностью восстановить ХП, ПП, РП, ЖП и Stamina | Fully refill HP, PP, RP, JP and Stamina |

**RU:** Коды `8671`–`8673` включают/выключают временные DEV-аномалии при повторном вводе. Активные бафы появляются в блоке персонажа, `×` снимает каждый отдельно. Режимы действуют **только до F5/закрытия страницы**, не записываются в сейв и не меняют обычный баланс. `8674` — **одноразовое** восполнение, без переключателя или постоянного бафа. `8662` сохраняет старый смысл (4 запаса без Stamina). В мире пока **нет игрового урона по персонажу**: бессмертие реализовано как общий DEV-защитный расчёт ХП и страховка от 0 в runtime, но боевую интеграцию придётся проверить, когда появятся враги.

**EN:** `8671`–`8673` are session-only toggles; repeat the code or click × on its character buff to disable. They reset after F5 and do not persist to saves. `8674` is an instant one-time refill of HP/PP/RP/JP plus Stamina. Original `8662` retains its four-pool-only effect. No real player-damage PvE pipeline exists yet; immortality is a tested central HP-damage guard plus runtime safety floor, not combat-tested.

## Сервис / Service

| Код / Code | Русский | English |
|---|---|---|
| `9001` | Сохранить игру | Save current game state |
| `9002` | Удалить локальный сейв, остановить автосохранение до F5 | Delete local save, pause autosave until reload |
| `9099` | Статус сохранения | Save status |
| `9999` | Открыть этот двуязычный справочник | Open this bilingual code reference |

**RU:** `9002` намеренно не сбрасывает открытую сцену — после удаления сейва перезагрузите страницу для новой игры. **EN:** `9002` deletes the browser save but leaves the current scene running; reload to start fresh.

**RU:** Другие четырёхзначные комбинации — зарезервированы, автоматических действий не выполняют. Старые значения кодов не переназначены.

**EN:** Other four-digit combinations are reserved and perform no game changes. Existing code mappings are preserved.
