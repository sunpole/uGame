# uGame — Audit: Resource NPC / Relationship / Progression

Дата: 2026-10-06
Статус: OPEN — требует решений перед переводом UGD-0015 в accepted

## Цель аудита

Проверить новую гипотезу ресурсных NPC против существующего Project Journal, реализованных систем и data-конфигураций; найти противоречия, терминологические столкновения и места, которые опасно интерпретировать автоматически при реализации.

## Проверенный охват

Проверено 18 источников проекта:

- Project Journal index;
- CURRENT.md;
- ACTIVE-IDLE-CORE.md;
- 11 связанных UGD-записей: UGD-0001, 0004, 0005, 0008, 0009, 0010–0015;
- CONTAINER-SYSTEM.md;
- SAVE-SYSTEM.md;
- data/resources.json;
- data/reward-rules.json.

## Результат

**Закреплять UGD-0015 как accepted пока рано.** Архитектурное направление в целом совместимо с уже принятыми системами, но осталось несколько важных scope/semantics решений.

### Статистика

- 3 найденных документальных несоответствия/устаревших формулировки;
- 2 терминологических столкновения;
- 2 опасных пересечения data-моделей при будущей реализации;
- 10 открытых проектных вопросов;
- 0 найденных конфликтов с принятым принципом Interactable/Event architecture;
- 0 конфликтов с ContainerSystem как механизмом хранения;
- 0 конфликтов с тем, что ресурсное развитие формирует именно персонажа игрока.

## Что уже согласовано и не конфликтует

### Character-owned progression

Новое уточнение, что реальные улучшения принадлежат персонажу игрока, **согласуется** с UGD-0011: там добыча ресурсов прямо описана как слой, формирующий персонажа и его skill-свойства.

Это также согласуется с UGD-0014: ContainerSystem уже имеет modifiers, которые должны меняться Skill/Profession-прогрессией. Правильный источник этих modifiers — Character Progression, а не изменяемая характеристика NPC.

### NPC как Event → Modules entry point

UGD-0010 уже допускает NPC как источник Dialogue, Training/Development, Process/Idle, Unlock и других модулей. Новый NPC Encounter не ломает эту модель, а конкретизирует один playable use case.

### 30-минутный Event

UGD-0013 уже имеет 30-минутный Dynamic Event lifecycle. NPC Encounter может жить внутри этого слоя без необходимости создавать отдельный второй таймерный framework.

### Account-bound Attention

UGD-0001 и текущие resource data фиксируют Внимание как account-bound/intangible. Новая character progression не должна менять этот scope.

## Исправленные несоответствия

### A1. T3 module count

Ранее UGD-0015 и ACTIVE-IDLE-CORE содержали `4–5 или 4–6`. Пользователь уточнил: **T3 = 4–6**. T3 может случайно показать полный набор; T4 отличается гарантией всех модулей и максимальным коэффициентом.

### A2. Кому принадлежит прогресс

Ранее UGD-0015 использовал формулировки вроде `unlockedNpcSkills` и «дерево NPC» как будто прокачивается сам NPC. Это неверно.

Правильное разделение:

```text
NPC Definition = общий мировой контент
NPC Encounter = временное появление
Character↔NPC Relationship = персональные отношения
Character Resource/Skill Progression = реальные улучшения персонажа
```

NPC может определять шаблон обучения/ветки, но unlocked nodes и modifiers принадлежат персонажу игрока.

### A3. CURRENT.md positioning

UGD-0015 был визуально расположен в секции после `Реализованный фундамент`, что могло создать впечатление реализованной системы. Это должно быть перенесено в `Активные рабочие гипотезы`.

## Терминологические столкновения

### T1. «КПД» означает уже несколько разных вещей

UGD-0005: КПД = результативность значимого прогресса на единицу активного времени.

UGD-0012: daily efficiency = дневной коэффициент, который снижается после длительной активной игры.

UGD-0015: `×1.00 / ×1.20 / ×1.40 / ×1.60` = локальный коэффициент текущей встречи с NPC.

Это три разных понятия. Если оставить всем имя «КПД», код, аналитика и UI будут двусмысленными.

Рабочая рекомендация для технического слоя:

```text
lifetime / analytic efficiency   — глобальная метрика (UGD-0005)
dailyEfficiency                  — anti-grind коэффициент времени (UGD-0012)
npcEfficiencyMultiplier          — локальный multiplier Encounter (UGD-0015)
```

В пользовательском UI позже можно использовать более красивое lore-название.

### T2. Одинаковый rarity profile используется в трёх местах

`80 / 15 / 3.5 / 1.5` сейчас применяется или обсуждается для:

1. Reward rarity;
2. Zone Quality Q1–Q4;
3. NPC Tier.

Одинаковые числа допустимы, но сущности должны оставаться независимыми, если специально не принято обратное.

## Опасные пересечения data-моделей

### D1. resource tierHint ≠ NPC Tier

`data/resources.json` пока содержит:

```text
stone → tierHint normal
wood → tierHint rare
water → tierHint magic
attention → tierHint unique
```

Это прототипный preset наград, а не утверждение, что Камень всегда T1, а Внимание всегда T4.

Если добавить NPC Tier с теми же словами normal/rare/magic/unique и переиспользовать `tierHint`, Stone NPC T4 может ошибочно начать трактоваться как Attention/unique reward.

Следствие: NPC Tier должен иметь собственное поле/таблицу и не использовать resource `tierHint` как источник истины.

### D2. Reward rarity сейчас временно выбирает ResourceType

UGD-0013 и reward-rules связывают normal→stone, rare→wood, magic→water, unique→attention только как временный preset.

Будущий ресурсный NPC должен сначала иметь `resourceDirectionId` независимо от своего Tier. Например, T4 NPC Камня остаётся NPC Камня, а не становится NPC Внимания.

## Неясности, которые блокируют закрепление

### Q1. Tier identity

Tier — постоянное свойство конкретной NPC-личности или свойство каждого Encounter?

Вариант `NPC Definition.tier` лучше поддерживает идею, что игроки учат имена/звания редких NPC. Тогда spawn делает roll Tier → выбирает NPC из соответствующего пула.

### Q2. Независимость rarity-roll

NPC Tier бросается независимо от Zone Quality и Reward Rarity или наследуется от одного из них?

Рекомендация аудита: независимый roll с теми же шансами, чтобы не сцеплять разные системы скрыто.

### Q3. Что именно умножает npcEfficiencyMultiplier

Нужно перечислить точный scope. Кандидаты: Relationship XP, Mastery, Process progress, Training progress, resource output.

Без этого `×1.60` нельзя корректно реализовать и балансировать.

### Q4. Где живёт Skill Tree template

Первоначальная формулировка: у каждого NPC своя ветка.

Возможные модели:

- NPC-specific tree template, эффекты записываются Character State;
- один Resource Direction tree, разные NPC открывают разные ветки/узлы.

### Q5. Relationship scope при нескольких персонажах аккаунта

Пользователь уточнил, что разные игроки имеют отдельную прогрессию. Но если один аккаунт имеет несколько персонажей, Relationship является `character` или `account` state?

### Q6. Доступ к уже изученному дереву/аналитике

Если модуль Skill Tree/Analytics не выпал в текущем Encounter, можно ли всё равно:

- видеть уже изученные узлы;
- видеть статистику;
- тратить накопленные skill points?

Пассивные уже изученные эффекты в любом случае не должны исчезать вместе с модулем.

### Q7. Process после despawn

Если NPC существует 30 минут, а запущенный Process длится дольше, продолжает ли Process работать после исчезновения NPC?

Рекомендация аудита: уже запущенный Process продолжает жить независимо; NPC нужен для открытия/запуска/обслуживания, но не должен обрывать прогресс.

### Q8. NPC заменяет Resource Event или является вариантом

Текущий UGD-0015 говорит «часть Resource Events». В исходном обсуждении звучало ближе к «Resource Event — это живой NPC». Нужно выбрать.

### Q9. Resource specialization

Один NPC всегда имеет одно `resourceDirectionId`, или будущий NPC может иметь смешанную специализацию?

### Q10. Skill point respec

Можно ли перераспределять вложенные Character skill points, и если да — свободно, платно, через NPC или отдельный Process?

## Дополнительное наблюдение: два разных вида progression

Чтобы избежать смешения, полезно хранить отдельно:

```text
relationship progression
= насколько персонаж знаком/доверен конкретному NPC

resource/skill progression
= насколько персонаж развил ресурсное направление и навыки
```

Relationship может быть условием доступа к nodes/modules, но не должна автоматически быть самим Skill Tree.

## Рекомендуемая минимальная схема данных

```text
NPC Definition (global content)
  npcId, name, title, profession, type, tier, resourceDirectionId, modulePool...

Encounter (temporary world state)
  encounterId, npcId, zoneId, expiresAt, activeModules, npcEfficiencyMultiplier...

CharacterNpcRelationship (player state)
  characterId, npcId, relationshipXp, level, flags...

CharacterDirectionProgression (player state)
  characterId, resourceDirectionId, mastery, skillPoints, unlockedNodes, modifiers...
```

## Решение аудита

UGD-0015 **не переводить в accepted и не реализовывать**, пока не закрыты как минимум Q1–Q4 и Q7–Q8.

Остальные вопросы можно частично оставить data-driven/future-compatible, но они должны иметь явный default перед кодом.
