# UGD-0020 — Attention cadence guardrail и пауза балансировочных прогонов

Дата: 2026-10-07  
Тип: economy / policy  
Статус: accepted  
Flags: needs-implementation, needs-telemetry, needs-later-test  
Теги: attention, economy, cadence, anti-grind, telemetry, simulation, qa

## Контекст

После Simulation Lab TEST/MATRIX стало ясно, что прямой Stone-value equivalent полезен как аналитика, но не должен автоматически определять способ получения «Внимания».

Одновременно сформулирован желаемый человеческий темп получения «Внимания».

## Принятый ориентир

Базовый балансировочный ориентир:

```text
≈ 1 Attention / неделю
→ хороший нормальный результат

≈ 1 Attention / день
→ очень интенсивная / hardcore активность

> 10 Attention / неделю
→ необычно высокий результат
→ требуется проверка источников и логов
```

Это **guardrail**, а не жёсткий недельный лимит и не обещание игроку гарантированной выдачи.

## Что означает >10 / неделю

Превышение порога само по себе не является доказательством нарушения и не должно автоматически наказывать игрока.

Нужно проверить:

- из каких игровых источников пришло Attention;
- не было ли специального World/Event override;
- не сработал ли duplicate/reward exploit;
- не ошиблась ли экономика multiplier;
- сколько было активного времени/сессий;
- не произошло ли повторной выдачи после reconnect/save/reload;
- не является ли высокий результат намеренной наградой режиссуры/ЛОРа.

То есть:

```text
>10/week
→ anomaly flag
→ logs / source breakdown
→ review
→ только потом решение
```

## Account scope

«Внимание» остаётся account-bound согласно UGD-0001.

Поэтому недельная аналитика Attention в первую очередь считается по аккаунту, даже если позже на аккаунте будет несколько персонажей.

Character/source breakdown всё равно нужен для диагностики.

## Текущий конфликт прототипа

В текущем playable prototype Dynamic Resource Event может напрямую выдать:

`Unique → Attention ×1`

Это QA/prototype reward mapping из раннего Dynamic Event слоя.

Оно **не соответствует** принятому недельному cadence guardrail и не должно использоваться как доказательство финальной экономики Attention.

До реализации настоящей Attention-системы это считается временной тестовой наградой.

Когда будем подключать реальную экономику Attention, direct prototype reward нужно либо удалить/заменить, либо явно перевести в отдельный dev-only режим.

## Simulation Lab

Run #20 остаётся последним текущим балансировочным baseline.

На этом активные ручные TEST / MATRIX / DEEP прогоны **приостанавливаются**.

Автоматический маленький smoke workflow остаётся: он проверяет, что tooling технически не сломан, но не считается новым балансировочным исследованием.

Новые большие simulation runs запускаются только если произошло одно из событий:

1. изменена формула Location Tier / master probabilities / caps / rotation;
2. изменена реальная Attention economy;
3. изменены resource reward cadence/values;
4. появился live WorldGraph/WorldSpawnState, который нужно сравнить с synthetic model;
5. есть конкретный вопрос, который нельзя решить обычным reasoning/QA.

## Что логировать позже

Минимальная будущая Attention telemetry:

```text
accountId
characterId
attentionDelta
sourceType
sourceId
eventId / npcId / questId
worldStateId
zoneId
locationTier
masterTier
timestamp
sessionId
reason / overrideId
```

Дополнительно weekly aggregation:

- Attention earned;
- Attention spent;
- source distribution;
- active session time;
- number of Attention-producing interactions;
- anomaly flags.

## Связь с Player Effort

UGD-0019 продолжает измерять clicks/time как аналитический слой.

Но `1 Attention-equivalent = 5000 Stone-value` остаётся только бухгалтерской сравнительной единицей.

Реальный gameplay cadence Attention теперь задаётся этим guardrail:

- около 1/неделю — нормальный ориентир;
- около 1/день — hardcore;
- >10/неделю — review/logging threshold.

## Статус

Cadence guardrail принят как текущее направление. Конкретная механика выдачи Attention, связь с Импульсом и точные вероятности остаются отдельной будущей реализацией.
