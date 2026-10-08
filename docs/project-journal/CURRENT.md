# uGame — текущее состояние концепции

Обновлено: 2026-10-08

Этот файл специально короткий. Он показывает текущее состояние важных тем; подробности и история находятся в `records/`. Общая структура последних Active/Idle-идей собрана в `ACTIVE-IDLE-CORE.md`.

## Явно принято на данный момент

- Система Project Journal является частью документационного процесса uGame.
- Мозговой штурм не считается принятым решением, пока решение явно не подтверждено.
- Рабочее название ресурса/валюты **«Внимание» ⚠** связано с реальным активным временем человека в игре; название временное.
- «Внимание» привязано к аккаунту и не передаётся другим игрокам.
- Ранняя активная часть uGame строится как **top-down** со свободным непосредственным движением персонажа.
- Мир состоит из отдельных связанных зон; обычные переходы через двери/порталы могут позже дополняться переносом из NPC/событий/интерфейса в отдельные локации.
- NPC, двери, сундуки, ресурсы, порталы и механизмы развиваются поверх общей системы **Interactable**, а не как полностью независимые системы.
- Основное взаимодействие: подойти → увидеть действие → нажать кнопку; auto-trigger разрешён для подходящих случаев.
- Сохраняются значимые последствия действий и изменения мира, а не каждая временная деталь сцены.
- Квесты сначала строятся на условиях/событиях и допускают действия не строго по порядку; архитектура должна позволять будущие ветвления и последствия.
- Состояние мира сначала охватывает значимые изменения; архитектура не должна закрывать возможность будущей более живой симуляции NPC/процессов.
- Рабочее направление игрового цикла — связанные active и idle части; точная пропорция и экономика ещё не определены.
- После базового технического фундамента разработка переходит в **content-first** режим: сначала playable-контент, затем только реально понадобившиеся расширения архитектуры.
- Для следующего playable-слоя принято направление `UGD-0013`: каждая зона имеет набор возможных Dynamic Event Spots; качество зоны определяет число активных слотов, события и качество меняются по независимым таймерам, а Resource/Chest/Portal взаимодействия используют сохраняемую генерацию наград и переиспользуемый Interaction UI. Конкретные вероятности и цены пока прототипные.
- Принято `UGD-0014`: хранение строится поверх единого ContainerSystem; Backpack, Bank, Equipment и Resource Pouch отличаются конфигурацией/доступом, а slots/weight/stack/allowed-items должны позже расширяться навыками и профессиями.
- Принято `UGD-0015`: ресурсные взаимодействия строятся через master NPC; Tier постоянен у master identity, Relationship/skill progression принадлежат конкретному персонажу, все master одного resourceDirection работают с единым деревом направления, а master multiplier `×1.00/1.20/1.40/1.60` умножает XP/reward этого NPC.
- Принято `UGD-0016`: внешние зоны имеют Location Tier T1–T4; Tier-state живёт отдельно от зоны, задаёт `2–4 / 2–5 / 3–6 / 5–6` одновременно активных spawn, lifetime `2–3h / 1.5–2.5h / 1–2h / 1–1.5h` и bonus `×1.00 / ×1.20 / ×1.40 / ×1.60`. Biome определяет resourceDirection, distance from city меняет шанс Location Tier, а редкие master распределяются через world caps и rotation.
- Master T2/T3/T4 появляются только если текущий random/eligibility создаёт подходящие candidate. Caps `T4=1 / T3=2 / T2=3` на resourceDirection — только максимумы одновременных instance, не targetCount.
- Для каждого `resourceDirection + masterTier` ведётся независимый rotation coverage: среди актуально допустимых зон сначала покрываются ещё не посещённые зоны текущего круга; candidate pool может измениться после world reroll.
- Принято `UGD-0017`: probability tables и world caps перед игровой реализацией проверяются отдельным headless Simulation Lab. Он работает deterministic по seed, имеет TRACE / TEST 100k / DEEP 1M / MATRIX, формирует JSON/CSV/self-contained HTML+SVG отчёты и умеет сравнивать runs. В `v0.0.37` реализованы manual GitHub Actions no-install runner и local updater option 9; candidate tables пока не являются live gameplay balance.
- Принято `UGD-0018`: игра получает единый Project Hub в topbar. Внутренние документы/Project Journal читаются в том же browser tab через overlay/navigation stack; внешние GitHub repository/Actions ссылки открываются отдельно. Hub должен одинаково работать на GitHub Pages и localhost через relative paths и станет входом для будущих Simulation Lab/World Analyzer инструментов.
- Принято `UGD-0019`: Player Effort измеряется отдельно от внутренней экономики — клики/действия на поиск master и добычу, interaction cadence time и Attention-equivalent через текущий `resources.json`. `1 Attention-equivalent = 5000 Stone-value` используется только для аналитики, не как игровой обмен.
- Принято `UGD-0020`: Attention cadence guardrail — около 1/неделю normal, около 1/день hardcore, >10/неделю anomaly/log review. Текущий `Attention ×1` из Dynamic Resource Event — QA placeholder, не финальная экономика.
- Принято и реализовано `UGD-0021`: persistent Game Chrome. Header/Footer находятся вне Workspace overlay, Game Clock display-only, real-time gameplay timers не изменены, E/Space/Enter идут через Action Router, mouse/AnyDesk — равноправный input, text selection default OFF.
- Принято и реализовано `UGD-0022`: runtime-окна обязаны оставаться внутри Workspace; при нехватке места используется scale-first до читаемого минимума 82%, затем scroll fallback; окна одного game-modal уровня не перекрываются случайно; Game Clock показывает фазу суток, секунды и ×12.
- Принято и реализовано `UGD-0023`: Inventory/Bank сохраняют нормальный размер ячеек; игровой viewport занимает весь Workspace; responsive camera показывает дополнительную ширину мира без растяжения объектов; floor выбирается по `biome + isCity`; Biome Visual Lab является временным DEV/admin UI и отделён от runtime GroundTextureSystem.
- Принято и реализовано как prototype `UGD-0024`: Location Tier/distance/chance/bonus всегда видны в Game Chrome; Stone Master T1–T4 имеют persistent Encounter, caps/rotation и character-scoped relationship history; DEV World Analyzer читает тот же WorldSpawnState; module availability persistent per Encounter.
- Принято и реализовано `UGD-0025`: live REAL TIME countdown, biome default 40/40, Spawn Zone DEV controls, temporary humanoid Master shell, slow facing и slow wandering в пределах Event Spot radius. Внешний legacy `resource` Event удалён: resourceDirection идёт через Master NPC; остальные generic slots используют временный candidate-QA Chest/Portal mix. На этапе разработки Spawn Zone Debug default ON.
- Принято и реализовано `UGD-0026`: первый functional Stone Extraction Process — REAL TIME, persistent startedAt/endsAt, duration ≤ Encounter remainder, offline completion → Character↔Master pending reward → claim через ту же Master identity. QA duration/base reward пока не финальный баланс.
- Принято и реализовано `UGD-0027`: один Event Spot одновременно имеет ровно одного active owner. Master и generic Event не могут делить один `spotId`; при Master reservation существующий Chest/Portal безопасно переносится на другой свободный spot.
- Принято и реализовано `UGD-0029`: world baseline = 25 локаций в логической сетке 5×5 с ромбической World Map; 5 safe cities + 20 fields, local world 1920×1080, 15 service NPC, working Bank/Teleport/Guide, 12 texture slots и N/NE/E/SE/S/SW/W/NW compass.
- Принято и реализовано `UGD-0030`: local playable area = ромб; реальные gates только NW/NE/SW/SE, N/E/S/W orientation-only; добавлены Water/Forest Master T1–T4, отдельная lane interaction hint и city NPC на общей модели игрока.
- Принято и реализовано `UGD-0031`: blocking pre-flight перед gameplay, true-square local diamond `1920×1920`, performance pass, city NPC landmark scale ×3, ±45° field walls, ≥100 px wall clearance и ≥250 px Event Spot distance от diagonal entries.

## Активные рабочие гипотезы

- uGame должна уважать время игрока и не строить прогрессию вокруг обязательного многочасового ежедневного гринда.
- Короткие осмысленные сессии обычно должны быть эффективнее очень долгого повторяющегося фарма.
- **«Импульс»** — рабочая концепция восстанавливаемого ресурса/состояния аккаунта, которое регулирует эффективность активной игры и, возможно, получение/использование «Внимания».
- На восстановление и ёмкость Импульса могут влиять длительность отдыха, длительность предыдущей сессии и специальный недельный цикл отдыха.
- Воскресенье/выходные рассматриваются как возможный период отдыха, но реальный календарь пока не принят: альтернативой могут быть персональные «дни отдыха» аккаунта.
- Постоянные локации могут сочетаться с динамическими маршрутами, порталами и меняющимися точками активности.
- Боевая система сознательно пока не зафиксирована и остаётся отложенной.
- Награды/лут предполагаются управляемыми таблицами и вероятностями, но экономика ещё не определена.
- Рассматривается **событийно-модульная модель**: взаимодействие/встреча создаёт Event, который может запускать один или несколько последующих игровых модулей — Dialogue, Reward, Travel, Shop, Training, Process/Idle, Unlock и другие. Точная схема маршрутизации Event → modules пока не принята.
- Рассматривается **контекстный Idle**: Idle-процессы живут в состоянии игры/времени, но доступ к ним может открываться через NPC, объекты, места и события мира, а не через постоянно доступную отдельную вкладку. Конкретные способы доступа (`local`, `zone`, `unlocked`, `global`, `temporary`) пока только варианты для обсуждения.
- Категория инфраструктуры — таверны, магазины, библиотеки, обучение, телепорты, банки и другие сервисы — пока не определена архитектурно: это может быть отдельный слой либо композиция более простых модулей.
- Рассматривается **ресурсный профиль/резонанс**: найденные в мире источники открывают Process, а добываемые направления влияют не только на экономику, но и на характеристики персонажа, свойства навыков и доступы.
- Игрок не обязательно свободно выбирает идеальный ресурс из меню: часть развития может зависеть от того, **какие источники удалось найти**. Редкость и вероятность находок должны создавать хардкорность, но не лишать игрока осмысленного выбора.
- Один ресурс может давать специализацию, сочетание двух — отдельное гибридное свойство, сочетание трёх и более — дополнительные явные слои. Комбинации не обязаны быть простой суммой процентов.
- Ресурсное развитие может иметь ранги/уровни, качество/редкость источника и другие явные слои зависимости. Точные пороги и бонусы пока только примеры.
- Для будущего дизайна предлагается различать `resource stock`, `mastery`, `active resonance` и `daily efficiency`, а не смешивать их в один показатель.
- Рассматривается **поддержание активного резонанса**: исторически достигнутый прогресс может сохраняться, а текущая применяемая сила со временем ослабевать без поддержки. Более жёсткая идея потери самих уровней тоже зафиксирована, но не принята из-за риска FOMO.
- Рассматривается **diminishing daily efficiency**: первые условные ~2 часа могут давать полную эффективность, затем отдача постепенно снижается вплоть до очень малого коэффициента. Числа `2 часа / 10 минут / -10 п.п. / 0.1%` пока только модель для обсуждения, не баланс.
- Для `UGD-0016` архитектурная модель подтверждена MATRIX #20: random candidate + caps + independent rotation coverage. Точные probability tables остаются candidate balance и не переносятся в gameplay автоматически.
- Для prototype world-state достаточно локального serializable `WorldSpawnState`; backend нужен позже, когда один мир станет общей server-authoritative истиной для многих игроков.
- Simulation Lab сначала проверяет `distance → Location Tier`, `Location Tier → NPC/Event Tier`, caps/rotation и reward multipliers на synthetic мирах 8/30/50/100+ зон; только после отчётов эти таблицы переносятся в gameplay.

## Реализованный фундамент

- Persistent Game State + локальный SaveSystem реализованы в `v0.0.29` и подтверждены ручным QA.
- WorldGraph + стабильные id зон/переходов реализованы в `v0.0.30`.
- `v0.0.31` собирает эти системы в первый маленький игровой кусок: четыре зоны, Проводник, три фрагмента, необязательный тайник и финальное ядро.
- `v0.0.32` добавляет первый динамический слой мира: по 5 Event Spots на зону, Q1–Q4 с 1/2/3/5 активными слотами, 30-минутные события с таймерами, Resource/Chest/Event Portal, RewardGenerator, InteractionPanel и сохранение pending-наград/таймеров.
- `v0.0.33` добавляет Enter и постоянные мышиные органы управления для удалённого QA.
- `v0.0.34` уточняет выбор наград: ограниченный выбор скрыт до решения; при полном доступе содержимое видно сразу; после выбора непринятые варианты по флагу раскрываются только для информации.
- `v0.0.35` добавляет ContainerSystem: рюкзак 12 слотов/30 кг, ресурсный пояс 1 слот/15 кг (пока только Камень), именованные слоты экипировки, городской Банк 60 слотов без лимита веса, stack/weight правила и сохранение/миграцию.
- `v0.0.36` добавляет Project Hub: единый overlay из игры, встроенное чтение README/VERSION/Journal/docs, Back/Close/Escape, поиск UGD и внешние ссылки GitHub/Actions/Pages.
- `v0.0.37` добавляет Simulation Lab dev-tooling: deterministic Python engine, candidate tables, TRACE/TEST/DEEP/MATRIX, JSON/CSV/HTML/SVG отчёты, A/B compare, GitHub Actions no-install runner и updater option 9. Candidate probabilities пока не являются live gameplay balance.
- `v0.0.38` исправляет локальный путь `/journal/` в dev-server и добавляет beginner quickstart для Simulation Lab в Project Hub: сначала понятная инструкция, затем отдельная ссылка на GitHub Actions runner.
- `v0.0.39` обновляет Simulation Lab до v0.2: random high-tier caps без targetCount, независимый rotation coverage для каждого master, click/search/Attention-equivalent analytics и новые CSV/SVG/HTML отчёты.
- `v0.0.40` публикует Simulation Results archive (#6/#7/#20), фиксирует Attention cadence guardrail и предварительный `NEXT-IMPLEMENTATION-PLAN.md`; большие ручные simulation runs поставлены на паузу.
- `v0.0.41–v0.0.48` реализуют Game Chrome series: persistent Header/Workspace/Footer, build/session/location/real clock, informational Game Clock, live character/resources header, Action Router, AnyDesk controls, text-selection settings и shared chrome на Journal/Simulation pages.
- `v0.0.49–v0.0.53` реализуют Workspace Window Policy: общий Window Manager, scale-first fit с scroll fallback, формальную layer/Z policy и Game Clock UX с 🌙/🌅/☀️/🌆, секундами и ×12.
- `v0.0.54–v0.0.58` реализуют Responsive Workspace + Biome Visual Layer: Bank/Inventory без лишнего scale, full-Workspace viewport, responsive world camera без искажений, шесть biome/city floor slots и временный Biome Visual Lab с scale 1–10 000% / opacity 0–100%.
- `v0.0.59–v0.0.64` реализуют Stage C WorldSpawnState / Location Tier runtime: texture baseline 40%, persistent local WorldSpawnState, shortest distance to safe city, Stone-only eligibility для текущих внешних зон, persistent T1–T4 real-time Tier-state, external spawn capacity 2–6 и DEV 84xx QA.
- `v0.0.65–v0.0.72` реализуют persistent Location Intel + Stone Master prototype: LT/D/P/bonus в Header/Footer, 4 Stone master identity, 30m Encounter allocator, T2/T3/T4 caps, independent rotation, visible master NPC, character relationships, active 83xx QA, DEV World Analyzer и persistent module availability.
- `v0.0.73–v0.0.79` реализуют Master UX/DEV series: live timer, biome 40/40, Spawn Zone Debug + controls, humanoid shell, slow facing и wandering.
- `v0.0.85–v0.0.88` реализуют первый vertical Process loop: module action menu → persistent Stone Extraction → offline pending reward → claim.
- `v0.0.90–v0.0.92` исправляют EventSpot↔WorldSpawn integration и закрепляют hard occupancy invariant `1 spotId = 1 occupant` с safe relocation generic Event.
- `v0.0.94–v0.0.96` расширяют каждую текущую карту до 12 candidate Event Spot и добавляют weighted anti-repeat для generic Event и Master placement.
- `v0.0.99–v0.1.09` перестраивают playable world: local area ×4, 25-zone WorldGraph, 5 hard safe cities, 15 city service NPC, southern textures, real Bank/Teleport/Guide, interactive diamond World Map + compass и миграция First Playable.
- `v0.0.81–v0.0.83` убирают внешний legacy Resource Event, вводят отдельный candidate-QA Chest/Portal mix и включают Spawn Zone Debug по умолчанию на время разработки.
- В коде уже существуют Interactable, EventSystem, DialogueSystem, QuestSystem, ресурсы, инвентарь и базовые переходы.
- Project Hub → DEV-коды теперь добавляет рядом с каждой документированной 4-значной командой кнопку «Выполнить», которая использует тот же footer DEV-console handler; ручной ввод сохранён.
- Первый Stone Extraction / Offline Process vertical slice уже реализован как prototype; ещё не реализованы полноценные Event Router/Actions, Resource Profile/Resonance, ранги добычи, комбинации ресурсов, Mastery/Active Resonance, дневной КПД и стабилизация.

## Текущий приоритет

- Выполнить ручной desktop QA v0.1.27: Pre-flight all-green gate, true-square 45° diamond, smooth movement/camera, oversized city NPC, diagonal walls/clearances, затем regression NW/NE/SW/SE / safe-city / 12 spots / Masters / First Playable.
- Никакой gameplay timer не переводить на Game Clock: Event/Location/NPC/Process/cooldown/Location Tier/Master Encounter остаются REAL TIME до отдельного решения.
- После успешного QA первый Extraction loop считается вертикально проверенным; следующие Dialogue/Analytics/Quest/Training/Event подключать отдельными маленькими патчами, не объявляя placeholders готовой механикой.
- Большие Simulation Lab runs по-прежнему остановлены после #20; automatic smoke — только техническая проверка.

## Связанные записи

- `UGD-0001` — «Внимание», «Импульс» и экономика коротких сессий.
- `UGD-0002` — воскресенье как день отдыха и восстановления.
- `UGD-0003` — гибрид active и idle.
- `UGD-0004` — мир, локации, порталы и меняющиеся активности.
- `UGD-0005` — история времени, КПД и сезонные/сквозные метрики.
- `UGD-0006` — направления боя и системы наград.
- `UGD-0007` — минимальный архитектурный фундамент раннего uGame.
- `UGD-0008` — принятые базовые правила игрового слоя v1.
- `UGD-0009` — content-first разработка: сначала playable-контент, архитектура по необходимости.
- `UGD-0010` — событийно-модульная архитектура и контекстный Idle.
- `UGD-0011` — ресурсный резонанс, найденные источники, комбинации и многослойное развитие.
- `UGD-0012` — КПД времени, закрепление и ослабление активного бонуса.
- `UGD-0013` — Interaction UI, генерация наград и динамические Event Spots; прототип начат в `v0.0.32`, правило слепого ограниченного выбора уточнено в `v0.0.34`.
- `UGD-0014` — ContainerSystem: рюкзак, Банк, экипировка, ресурсный пояс, вес, stack и будущие progression hooks; реализовано как прототип `v0.0.35`.
- `UGD-0015` — ресурсные master NPC, отношения и character-owned progression; Stone Master identity/Encounter/relationship/module-availability prototype реализован v0.0.66–v0.0.72; реальный Process/Quest/Training и resource progression ещё впереди.
- `UGD-0016` — Location Tier, биомы, distance pressure и world caps master NPC; Stage C реализован v0.0.60–v0.0.64, Stone allocator/caps/rotation prototype реализован v0.0.67+, candidate balance остаётся не финальным.
- `UGD-0017` — Simulation Lab: headless расчёты, отчёты, графики и сравнение run; v0.2 baseline #20 зафиксирован, большие ручные прогоны поставлены на паузу.
- `UGD-0018` — Project Hub: in-game навигация, документация и dev-инструменты через единый overlay; MVP реализован в `v0.0.36`.
- `UGD-0019` — Player Effort: клики, поиск master, Attention-equivalent и QA-навигация; принято, baseline #20 зафиксирован.
- `UGD-0020` — Attention cadence guardrail + пауза больших simulation runs; принято.
- `UGD-0021` — Persistent Game Chrome / clocks / input UX; реализовано v0.0.41–v0.0.48.
- `UGD-0022` — Workspace Window Policy + Game Clock UX; реализовано v0.0.49–v0.0.53; визуальная desktop-проверка пройдена, а выявленное уменьшение Bank/Inventory исправлено в v0.0.54.
- `UGD-0023` — Responsive Workspace + Biome Ground Texture / Visual Lab; реализовано v0.0.54–v0.0.58; визуально подтверждён текущий texture scale baseline 40% и закреплён в v0.0.59.
- `UGD-0024` — Persistent Location Intel + Stone Master Runtime + DEV World Analyzer; реализовано prototype v0.0.65–v0.0.72, требуется ручной gameplay QA.
- `UGD-0025` — live timer, biome 40/40, Spawn Zone DEV и wandering/presentation Stone Master; реализовано v0.0.73–v0.0.84, требуется ручной browser QA.
- `UGD-0026` — первый functional Stone Extraction Process с offline completion / pending reward / claim; реализовано v0.0.85–v0.0.88, требуется ручной gameplay QA.
- `UGD-0027` — hard Event Spot exclusivity `1 spotId = 1 occupant`; реализовано v0.0.90–v0.0.92, требуется ручной gameplay QA.
- `UGD-0028` — 12 candidate Event Spots + weighted anti-repeat placement; реализовано v0.0.94–v0.0.96, веса требуют визуального QA.
- `UGD-0029` — 25-location diamond world + five safe cities + city services + compass; реализовано v0.0.99–v0.1.10, требуется ручной browser/gameplay QA.
- `UGD-0030` — local diamond + four diagonal gates + Water/Forest Masters + shared humanoid city NPC; реализовано v0.1.11–v0.1.16, требуется ручной browser/gameplay QA.
- `UGD-0031` — pre-flight boot + true square diamond + performance/spatial safety; реализовано v0.1.20–v0.1.27, требуется ручной browser/gameplay QA.


## Economy v0.2.x — accepted / needs manual QA

- Stable rollback checkpoint before economy: `release/v0.1.28-stable` @ `3b7d112`.
- `UGD-0032`: Steps/StepDebt, city REAL TIME regen, Attention exchange, paid city teleport, Stone/Wood/Water/Clay kg+Tier storage and Master rewards.
- Current immediate priority: manual QA v0.2.6 before Trader or random Step rewards.
