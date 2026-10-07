# UGD-0026 — First functional Stone Extraction Process

Дата: 2026-10-07  
Тип: system / gameplay / idle  
Статус: accepted  
Flags: needs-test, candidate-balance  
Теги: master, process, extraction, idle, offline, pending-reward, stone, real-time

## Контекст

После реализации Stone Master identity/Encounter/module availability следующим принятым content-first шагом был один настоящий Process, чтобы проверить всю вертикальную цепочку:

```text
Master Encounter
→ module Добыча
→ persistent REAL TIME Process
→ offline completion
→ pending reward
→ повторная встреча с тем же Master
→ получение Stone
```

## Реализованная серия v0.0.85–v0.0.88

### v0.0.85 — Master Module Action Menu

`InteractionPanel.showActions()` показывает фактические `activeModules` встречи кнопками. Не реализованные модули остаются disabled и помечаются `· позже`.

### v0.0.86 — Persistent Stone Extraction

Добавлен `MasterProcessSystem` и `data/master-processes.json`.

Первый QA profile:

```text
stone-extraction-basic
duration = 60 real seconds max
base reward = Stone ×10
status = candidate-QA
```

Process сохраняет:

- processId / profileId;
- masterId / encounterId;
- startedAt / endsAt;
- Encounter expiresAt;
- resourceDirection;
- base reward inputs;
- Location bonus на момент запуска;
- Master multiplier на момент запуска.

Duration никогда не превышает оставшееся время текущего Encounter.

### v0.0.87 — Offline completion / pending reward

Завершение определяется по REAL TIME timestamp, а не по Game Clock и не по открытому браузеру.

Если `endsAt` наступил, результат переносится из `activeProcess` в `pendingRewards` Character↔Master state. Поэтому завершённый результат переживает F5, закрытие браузера и исчезновение конкретного Encounter.

### v0.0.88 — Claim

Pending reward выдаётся только при взаимодействии с **той же Master identity** через Extraction.

Текущий prototype stacking:

```text
baseReward
× (1 + LocationBonus)
× MasterMultiplier
→ round to nearest whole resource
```

Сейчас единственный additive bonus в этом Process — LocationBonus. Формула следует принятому порядку UGD-0016, но base amount/duration/rounding являются **candidate-QA**, а не финальной экономикой.

Pending reward удаляется только после успешного `grantResource`. Если не хватает container capacity/weight, результат остаётся pending.

## Инварианты

- Game Clock display-only.
- Process использует REAL TIME.
- Process не может быть длиннее оставшегося Encounter lifetime.
- Завершённый результат не теряется вместе с despawn Encounter.
- Pending reward принадлежит Character↔Master state.
- Master multiplier применяется только к награде этого Master.
- Dialogue / Quest / Analytics / Training / Special Event пока не считаются функциональными.
- Relationship XP / Mastery пока не начисляются: числовая прогрессия требует отдельного решения, её не следует скрытно изобретать внутри первого Process.

## Что пока candidate-QA

- 60 секунд;
- Stone ×10 base;
- округление итогового resource amount;
- один одновременно active Process на одну Master identity в текущем прототипе.

## Следующий шаг

Сначала ручной QA v0.0.89. После подтверждения loop следующий маленький функциональный master-module может быть Dialogue, затем Analytics/Quest/Training по отдельным патчам.
