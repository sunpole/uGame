# uGame versions

Current version: **0.2.10**

`version.json` is the machine-readable current version. This file is the human-readable history.

| Version | Main change |
|---|---|
| 0.2.10 | Daylight Vision Architecture: generic flat/multiplier/multiplier-bonus stack, time-of-day vision and map-only tint |
| 0.2.9 | Inspectable Pre-flight: per-test timing, copy-debug text, READY hold screen and explicit Start Game button |
| 0.2.8 | Steps Movement Performance: remove per-frame snapshots/events/DOM writes; exact movement accounting with HUD throttled to 5 Hz |
| 0.2.7 | Steps Capacity/Regen: 10k start, 100M max, visible current/max, city +5 Steps/s formula, automatic 100M→1 Attention |
| 0.2.6 | Steps Economy Audit: accepted source-of-truth docs + Pre-flight validation for Steps formulas and kg/Tier resources |
| 0.2.5 | Clay Master Line: Clay T1–T4 Masters, sand/south clay direction, clay Process validation and palette |
| 0.2.4 | Extraction Rewards in kg/Tier: Master Tier fixes resource Tier and persistent random mass uses accepted kg ranges |
| 0.2.3 | Mass Resource Foundation: Stone/Wood/Water/Clay T1–T4, 0.1kg internal unit, 50kg resource-cell, legacy migration, inactive belt + bag slot |
| 0.2.2 | Attention Exchange + Paid Teleport: 1 Attention→10M Steps, 100M Steps→1 Attention, WorldGraph-priced city teleport |
| 0.2.1 | Steps Movement Cost: actual travelled distance spends Steps outside cities; dash ×2 speed / ×4 rate; movement can create debt |
| 0.2.0 | Steps Economy Core: persistent Steps + StepDebt, city REAL TIME regen target and UI |
| 0.1.28 | Pre-flight Hotfix: support valid `import.meta` during browser-side syntax checking |
| 0.1.27 | Pre-flight / True Diamond Audit: source-of-truth docs and manual QA checklist for v0.1.20–v0.1.26 |
| 0.1.26 | Full Runtime Pre-flight: check every src JS module plus all runtime JSON files, JSON parse integrity and dependency/syntax coverage |
| 0.1.25 | Spawn/Gate Safety Buffer: all 12 field candidate spots are at least 250px from diagonal entries; walls retain ≥100px clearance |
| 0.1.24 | Diagonal Obstacles + 100px Clearance: field walls become ±45° and spots/walls stay clear of entries/gates |
| 0.1.23 | City NPC Scale ×3: Banker/Teleporter/Guard become intentionally large landmark characters with larger interaction radius |
| 0.1.22 | Movement Performance: throttle DOM/SVG and slow Master work; cache HUD/arrows; remove per-frame interaction sort |
| 0.1.21 | True Square Diamond: local world becomes 1920×1920 so the 45° playable diamond is visually square, not flattened |
| 0.1.20 | Pre-flight Loading Gate: validate runtime files/modules/syntax/version/world/Masters/textures/Phaser before revealing gameplay |
| 0.1.19 | Boot Syntax Hotfix: close broken World Map stage string in project-hub-system.js |
| 0.1.18 | Boot Diagnostics: visible global/module/world-init errors replace silent endless loading |
| 0.1.17 | Boot Hotfix: remove fragile cross-module humanoid helper export/import while preserving player-base city NPC visuals |
| 0.1.16 | Local Diamond / Multi-Resource Master Audit: document four diagonal gates, Water/Forest Masters, prompt separation and shared humanoid city NPC |
| 0.1.15 | Diamond Event Spot Clearance: 12 field candidate spots stay evenly spread but now have guaranteed wall clearance |
| 0.1.14 | City NPC Player-Model Redesign: banker/teleporter/guards reuse the same humanoid base as the player with role-specific proportions/accessories |
| 0.1.13 | Water + Forest Masters: T1–T4 lines use the same Master/Process runtime as Stone with water/wood rewards and biome directions |
| 0.1.12 | Interaction Prompt Separation: NPC/object hint occupies a dedicated lane above controls and no longer covers Action |
| 0.1.11 | Local Diamond Geometry: playable area is a rhombus with exactly four real gates NW/NE/SW/SE; N/E/S/W are orientation-only |
| 0.1.10 | Diamond World Series Audit: source-of-truth docs for 25 locations, five safe cities, city services, textures, compass and QA |
| 0.1.09 | First Playable World Migration: Three Fragments/Core content restored in field zones; start-city guide becomes the quest introduction |
| 0.1.08 | World Map Layout Polish: compass gets clear margins and map gains biome/city/current-location legend |
| 0.1.07 | World Map Compass: N/NE/E/SE/S/SW/W/NW labels and arrows surround the 25-location diamond |
| 0.1.06 | Diamond World Map UI: Project Hub renders all 25 locations as rotated squares with names, IDs, biome/city styling and current position |
| 0.1.05 | Five-city Teleport Network: Aster opens all safe cities and teleports to the selected city center |
| 0.1.04 | Working City Banker + Guides: Boris opens the existing bank; five biome guards open city-specific dialogues |
| 0.1.03 | Expanded Biome Textures: forest/stone/south + city variants; south field uses brown sand and south city white marble |
| 0.1.02 | Five-city Service NPC Cast: shared Banker/Teleporter personas plus 5 unique biome city guards with prototype silhouettes |
| 0.1.01 | Safe City Hard Rules: 5 cities force full vision and cannot host Dynamic Events or Master encounters |
| 0.1.00 | 25-location Diamond WorldGraph: logical 5×5 grid, 5 safe cities, 20 fields, 80 directed links and temporary names/IDs |
| 0.0.99 | Four-screen Local World: each zone is 1920×1080 with camera follow while the visible screen remains roughly 960×540 |
| 0.0.98 | Clickable DEV Code Reference: every documented 4-digit code row in Project Hub gets a one-click Execute button |
| 0.0.97 | Event Spot Variety Audit: document 12 candidate spots and weighted anti-repeat placement |
| 0.0.96 | Master Spot Anti-Repeat: persistent weighted random placement reduces recent spot repetition |
| 0.0.95 | Generic Event Spot Anti-Repeat: weighted random selection penalizes recently used candidate spots |
| 0.0.94 | 12 Candidate Event Spots per current map: larger placement pool without increasing active capacity |
| 0.0.93 | Event Spot Exclusivity Audit: document root cause, hard `1 spotId = 1 occupant` rule and QA |
| 0.0.92 | Safe Event Relocation: Master reservation moves an existing generic Event to a free spot without losing id/timer/offer |
| 0.0.91 | Event Spot Exclusive Occupancy: dedupe state, skip Master spots at render, remove duplicate fallback, DEV 8298 conflict check |
| 0.0.90 | EventSpot ↔ WorldSpawn integration fix: EventSpotSystem now sees Location Tier capacity and Master-reserved spots |
| 0.0.89 | First Stone Process Audit: document module menu → persistent REAL TIME Extraction → offline pending reward → claim |
| 0.0.88 | Stone Process Reward Claim: pending result can be collected; QA formula applies Location additive bonus then Master multiplier |
| 0.0.87 | Offline Process Completion: real timestamp completion moves finished Extraction into persistent pendingRewards |
| 0.0.86 | Persistent Stone Extraction Process: start a REAL TIME QA process from Master; startedAt/endsAt persist in Character↔Master state |
| 0.0.85 | Master Module Action Menu: active Encounter modules are explicit InteractionPanel actions; unfinished modules are disabled |
| 0.0.84 | Spawn Zone Render Fix: use ZoneSystem.currentId so enabled DEV circles actually render |
| 0.0.83 | Spawn Zone DEV Default ON: Event Spot radius visualization is visible by default during development |
| 0.0.82 | External Event Capacity Mix: explicit candidate-QA 50/50 Chest/Portal mix after Resource Event retirement |
| 0.0.81 | Retire legacy external Resource Events: external Location Tier resource interaction goes through Master NPC |
| 0.0.80 | Master UX Series Audit: document v0.0.73–v0.0.79 and resolve stale T4-always-present contradiction |
| 0.0.79 | Master Slow Wandering: ~5 px/s movement around Event Spot center using the configured radius |
| 0.0.78 | Master Slow Facing: very slow idle rotation with long pauses and smooth turn speed |
| 0.0.77 | Master NPC Visual Shell: Tier-colored top-down humanoid model replaces the circular marker |
| 0.0.76 | Spawn Zone DEV Controls: Project Hub toggle, center markers and 10–500 px radius control |
| 0.0.75 | Spawn Zone Debug Visual: thin DEV radius circles around existing Event Spot centers |
| 0.0.74 | Biome Texture Baseline 40/40: all current floor defaults use 40% scale and 40% opacity |
| 0.0.73 | Master Live Timer Sync: interaction dialog and world label use the same real-time Encounter expiresAt |
| 0.0.72 | Master Module Availability: Extraction guaranteed, Tier-driven persistent module set per Encounter |
| 0.0.71 | DEV World Analyzer: active masters, Location Tier context, candidate pools, rotation и one-click TP |
| 0.0.70 | Master NPC QA 83xx: registry, Tier filters, rotation summary и teleport/cycle |
| 0.0.69 | Character↔Master Relationship State: встречи persistent и принадлежат персонажу |
| 0.0.68 | Visible Stone Master Encounters: master занимает Event/NPC slot и появляется как Tier-colored NPC |
| 0.0.67 | Stone Master Allocator: 30m persistent encounters, world caps и independent rotation coverage |
| 0.0.66 | Stone Master Registry: четыре постоянные identity T1–T4 + data-driven module metadata |
| 0.0.65 | Persistent Location Tier HUD: LT, distance, chance и bonus всегда видны в Header/Footer |
| 0.0.64 | Location Tier QA: 8400/8401–8404/8499 и защита от старых Quality-кодов |
| 0.0.63 | Location Tier spawn capacity: внешние зоны перешли на 2–6 активных Event/NPC slots |
| 0.0.62 | Location Tier runtime: persistent T1–T4 state, real-time lifetime и candidate distance bands |
| 0.0.61 | Safe-city distance + Stone eligibility: WorldGraph знает расстояние и доступное resourceDirection |
| 0.0.60 | Persistent WorldSpawnState shell: локальная serializable истина будущих Tier/NPC |
| 0.0.59 | Biome texture defaults: утверждённый визуальный baseline 40% |
| 0.0.58 | Biome Visual Lab: DEV/admin редактор texture name/file, scale, opacity и preview |
| 0.0.57 | Biome Ground Texture System: grass/sand/snow + city variants, scale/opacity-ready |
| 0.0.56 | Responsive World Camera: широкий экран показывает больше мира без искажения |
| 0.0.55 | Full Workspace Game Viewport: игровое поле занимает всю центральную область |
| 0.0.54 | Inventory/Bank Normal Size: одинаковые ячейки, без лишнего desktop scale |
| 0.0.53 | Game Clock seconds + visible ×12 speed; UI bounds series complete |
| 0.0.52 | Game Clock phase UX: 🌙 Ночь / 🌅 Утро / ☀️ День / 🌆 Вечер |
| 0.0.51 | Formal Layer/Z Policy: окна одного modal-уровня больше не перекрываются случайно |
| 0.0.50 | Scale-first Window Sizing: единый адаптивный масштаб, scroll только как fallback |
| 0.0.49 | Workspace Window Bounds: игровые окна жёстко ограничены игровым Workspace |
| 0.0.48 | Complete HUD migration + cross-page persistent project chrome |
| 0.0.47 | Project Hub interface settings with text selection disabled by default |
| 0.0.46 | Mouse / AnyDesk controls use the same contextual Action path |
| 0.0.45 | Unified contextual Action Router for primary/back/arrow navigation |
| 0.0.44 | Live character/resource header with material wealth and storage summary |
| 0.0.43 | Informational Game Clock: 1 game minute = 5 real seconds, four day phases |
| 0.0.42 | Build/environment, session, location duration and real clock context |
| 0.0.41 | Persistent Game Chrome shell: Header / Workspace / Footer boundaries |
| 0.0.40 | Simulation results archive + Attention cadence guardrail + next implementation plan |
| 0.0.39 | Simulation Lab v0.2: per-master rotation coverage + Player Effort/click analytics |
| 0.0.38 | Local /journal/ fix + beginner Simulation Lab quickstart in Project Hub |
| 0.0.37 | Headless Simulation Lab: deterministic world calculations, reports, Actions runner and local launcher |
| 0.0.36 | In-game Project Hub: navigation, embedded docs/Journal and GitHub links |
| 0.0.35 | Modular ContainerSystem: Backpack, Bank, Equipment, Resource Pouch, weight and stacks |
| 0.0.34 | Blind restricted reward choices + optional reveal of missed rewards after selection |
| 0.0.33 | Remote-friendly controls: Enter interaction key + always-visible mouse buttons |
| 0.0.32 | Dynamic Event Spots, timed zone quality, reusable reward-choice UI and persistent generated offers |
| 0.0.31 | First Playable content slice: four-zone loop, guide, three fragments and final core objective |
| 0.0.30 | WorldGraph with stable zone/transition ids and legacy save migration |
| 0.0.29 | Persistent Game State schema v1 + local SaveSystem |
| 0.0.28 | Head and torso centered at idle; forward lean only during movement |
| 0.0.27 | Stronger visual contrast between upright idle and forward-leaning movement |
| 0.0.26 | Upright idle pose with movement-driven forward lean |
| 0.0.25 | Vision overlay and Phaser canvas forced to exactly the same playfield bounds |
| 0.0.24 | LAN/Wi-Fi dev-server access for phones and laptops |
| 0.0.23 | Quest/HUD clarity and small temporary-character polish |
| 0.0.22 | Vision overlay locked to exact 960×540 playfield |
| 0.0.21 | Explicit linked portal entry/exit sides |
| 0.0.20 | Mobile controls and pre.by deployment preparation |
| 0.0.19 | DialogueSystem + QuestSystem |
| 0.0.18 | InventorySystem |
| 0.0.17 | ResourceSystem |
| 0.0.16 | Zone rules |
| 0.0.15 | EventSystem |
| 0.0.14 | AudioSystem |
| 0.0.13 | CharacterView and art pipeline |
| 0.0.12 | PlayerController, dash and stamina |
| 0.0.11 | InteractableSystem |
| 0.0.10 | DEV focus fix and arrow indicator |
| 0.0.9 | ClassSystem |
| 0.0.8 | ZoneSystem and real transitions |
| 0.0.7 | VisionSystem |
| 0.0.6 | DEV console and code registry |
| 0.0.5 | Visibility follow/full-black fix |
| 0.0.4 | DOM visibility overlay |
| 0.0.3 | First visibility pass |
| 0.0.2 | One-screen shell |
| 0.0.1 | First playable prototype |

## 0.2.10
Daylight/Vision modifier stack: radius/darkness support flat, independent multiplier and additive multiplier bonus by named source for future daylight/class/equipment/buffs. Morning field radius is ×1.0. City full-vision is replaced by circle so time-of-day can affect cities. Tint layers live inside #game between canvas and Vision, leaving header/footer/UI unchanged. Cone geometry remains available and its angle/distance are now explicit variables for future narrow/wide modes.

## 0.2.9
Pre-flight now records elapsed time for every check, including game-module import and world READY. After all checks pass, the screen stays open until the user presses `Начать играть`. A small `Копировать отладку` button copies version, boot phase, browser, every green/red row and summary as plain text for pasting into ChatGPT; it remains usable on failures too.

## 0.2.8
Movement cost still accumulates from actual travelled pixels every frame, but ordinary walk/dash no longer clones Step state, emits Step change events or rewrites DOM at frame rate. The Steps HUD is refreshed at most 5 times/sec and save persistence remains throttled to once/sec. This specifically targets the small walking stutters observed after v0.2.x.

## 0.2.7
Steps display now shows current/max. Starting baseline remains 10,000; visible maximum is 100,000,000. City regeneration is formula-driven (`flat + max×percent`) with current baseline +5 Steps/s and 0% component. At 100,000,000 positive Steps the game automatically purchases 1 Attention and subtracts the threshold. Manual Attention→Steps remains for debt repayment.

## 0.2.6
Зафиксирован UGD-0032 и полный Steps/Resource Economy source of truth. Pre-flight получает отдельные зелёные строки для Steps formulas и Mass-resources/Tiers: 10k reserve, 1.2px/Step, 1%/min, dash 2×/4×, Attention rates, teleport 1000×0.60, Stone/Wood/Water/Clay ranges, 0.1kg unit, 50kg cell, T1–T4 и inactive belt pouch + bag slot.

## 0.2.5
Глина стала полностью добываемым четвёртым базовым материалом: `Мастер глины T1–T4`, Process profile уже использует accepted 0.3–15.0 кг range. Sand и South field zones получают resourceDirection `clay` вместе с прежними направлениями. Добавлена clay palette и Pre-flight теперь требует T1–T4 + Process для Stone/Water/Wood/Clay.

## 0.2.4
Extraction Process теперь фиксирует reward при старте: Resource ID + Master Tier + random mass с шагом 0.1 кг. Диапазоны: Water 0.1–5.0, Wood 0.2–10.0, Stone 0.5–25.0, Clay 0.3–15.0 кг. Reload не reroll-ит pending reward. Physical reward кладётся как tier-specific mass stack и больше не дублируется count-значением в ResourceSystem. Header/HUD агрегируют переносимую массу из containers и показывают только кг.

## 0.2.3
Physical resource catalog переведён на mass-resource foundation. Stone/Wood/Water/Clay имеют T1–T4 generated item identities, internal unit 0.1 кг и default 50.0 кг per resource-cell; Resource+Tier не смешиваются. Old count stacks автоматически мигрируют в T1 с сохранением приблизительной массы. UI больше не показывает граммы. Resource Pouch отключён до реального экипированного belt; в equipment добавлен пустой future slot `bag`. Backpack carry baseline временно 600 кг, чтобы 12×50 кг resource cells были физически достижимы до отдельного bag balance pass.

## 0.2.2
Кнопка Шагов открывает экономическое окно. `1 Attention → 10 000 000 Steps` является special payment: сначала гасит StepDebt, остаток попадает в balance. Обратный обмен `100 000 000 Steps → 1 Attention` доступен только без debt и из положительного balance. City Teleporter теперь рассчитывает цену через `shortestDistance × 1000 × 0.60`; teleport — service spend и никогда не создаёт debt.

## 0.2.1
Movement подключён к StepSystem. Расход считается по фактически изменившейся world-position, а не по времени клавиши: baseline `1 Step ≈ 1.2 px`. Safe city movement бесплатно. Dash теперь ровно ×2 speed; при ×4 spend-rate та же дистанция стоит примерно ×2 Steps. При исчерпании balance движение не блокируется и создаёт StepDebt; при первом уходе в долг показывается объясняющее окно.

## 0.2.0
Добавлен persistent StepSystem: Steps, отдельный StepDebt, natural reserve target 10 000, city REAL TIME regen +1% reserve/minute только при debt=0, service/movement spend contracts и DEV 6401/6402/6499. Save schema остаётся backward-compatible.

## 0.1.28
Исправлен ложный красный флаг Pre-flight для валидного ES-module выражения `import.meta.url` в `project-page-chrome.js`. Best-effort syntax checker больше не пытается парсить `import.meta` как обычный script-код через `new Function`; перед проверкой module-only выражение безопасно нормализуется. Игровой код `project-page-chrome.js` не изменялся.

## 0.1.27
Закрыта документационная серия `UGD-0031`: pre-flight boot gate, true-square `1920×1920` local diamond, movement performance pass, city NPC ×3, diagonal field walls и spatial safety buffers. Добавлены `PREFLIGHT-BOOT.md` и отдельный audit/manual-QA checklist; CURRENT/NEXT/World docs обновлены.

## 0.1.26
Pre-flight manifest расширен до всех runtime `src/*.js` модулей и всех runtime JSON data files. Loading screen отдельно подтверждает: доступность файлов, JSON parse integrity, version consistency, named import/export dependencies и syntax parse для всего JS-набора, даже если модуль не попадает в main import graph. Исправлен parser для `export async function`. Gameplay открывается только после зелёных проверок и подтверждения `worldReady`.

## 0.1.25
Усилено правило «не спавнить рядом со входом»: Event Spot теперь валидируется минимум на 250 px от любого `NW/NE/SW/SE` entry. 12 candidate spots переразложены по true-square diamond, сохраняя использование верхней/центральной/нижней частей карты. Wall patterns обновлены так, чтобы сохранять ≥100 px geometric clearance от всех entries и Event Spots.

## 0.1.24
Старые axis-aligned obstacles удалены из field data и заменены четырьмя детерминированными pattern-вариантами из трёх стен, каждая стена повёрнута на `+45°` или `-45°`. Rotated collision теперь считается в локальных координатах стены, а не через axis-aligned bounding box. Все 12 candidate Event Spots переразложены по true-square diamond. Минимальный clearance от Event Spot до entry/gate >100 px; стены валидируются с ≥100 px clearance от всех Event Spots и четырёх entries. Safe cities остаются без полевых стен/спавнов.

## 0.1.23
Городские сервисные NPC увеличены примерно в 3 раза относительно v0.1.22. Banker использует scale 3×, Teleporter сохраняет вытянутую форму (`3×3.66`), Guard умножает прежний 1.28-scale до `3.84×3.84`. Их подписи подняты выше и увеличены до 16 px, default interaction radius расширен до 150 px. Функции Bank/Teleport/Guide не менялись.

## 0.1.22
Оптимизирован игровой update-loop после появления большого diamond world. Vision SVG теперь обновляется максимум ~30 FPS вместо DOM mutation каждый frame; slow Master wandering считается с шагом 50 ms; HUD stamina и keyboard indicators пишутся в DOM только при изменении; nearest interactable выбирается одним проходом без создания/sort временных массивов. World Spawn/Event/Process timers остаются REAL TIME и не меняют частоту логики.

## 0.1.21
Локальный world canvas изменён с `1920×1080` на `1920×1920`. Поэтому вершины playable diamond теперь лежат на одинаковом расстоянии по X/Y от центра: это настоящий квадрат, повёрнутый на 45°, а не широкий плоский ромб. Все entry points, walls, interactables и Event Spots мигрированы по Y пропорционально старой нормализованной позиции. Camera viewport остаётся 960×540 и продолжает следовать за персонажем.

## 0.1.20
Добавлен отдельный blocking Pre-flight screen. До показа игрового экрана проверяются manifest/core files, version consistency, рекурсивный ES-module dependency graph, named imports/exports, best-effort syntax parse, WorldGraph invariants, Stone/Water/Forest Master + Process data, texture assets и Phaser runtime. `main.js` больше не стартует автоматически при import: launcher импортирует модуль только после зелёного pre-flight, вызывает `bootGame()`, ждёт `worldReady`, и только затем открывает gameplay. При красном флаге игра не запускается и причина остаётся на loading screen.

## 0.1.19
Исправлена точная причина падения boot по ручному QA: в `src/project-hub-system.js` строка открытия `world-map-stage` была оборвана без закрывающей кавычки, из-за чего браузер выдавал `Invalid or unexpected token` на строке 467 и не запускал весь ES-module graph. Механики не менялись.

## 0.1.18
Добавлена ранняя boot-диагностика до загрузки Phaser/main module. Глобальные `error` и `unhandledrejection` выводятся прямо в `quest-status`; если основной модуль вообще не стартовал за 8 секунд, вместо вечного `Загрузка квеста…` появляется явное сообщение. `main.js` дополнительно отмечает фазы `scene-create / world-init / ready / world-error`. Gameplay не менялся.

## 0.1.17
Hotfix после ручного QA: локальная v0.1.16 могла остаться на статическом HTML-экране до запуска Phaser/runtime. Убрана новая межфайловая именованная зависимость `InteractableSystem -> CharacterView.createHumanoidVisual`, появившаяся в v0.1.14. Player CharacterView и city NPC теперь имеют самостоятельный локальный helper с одной и той же геометрией, поэтому смешанный/stale module при обновлении не может остановить весь ES-module graph из-за отсутствующего named export. Визуальные пропорции Banker/Teleporter/Guard и gameplay v0.1.11–v0.1.16 не откатывались.

## 0.1.16
Документирована серия `UGD-0030`. Источник истины фиксирует: local playable area = diamond; реальные gates только `NW/NE/SW/SE`; `N/E/S/W` orientation-only; target entry всегда противоположная диагональ. Master runtime расширен до Stone/Water/Forest T1–T4 с общим REAL TIME Process. City NPC используют player humanoid base. Static audit: 80 transitions, 0 non-diagonal gates, 0 bad opposite-entry pairs, 12 spots на каждом field, 0 spots outside diamond, 0 wall-clearance conflicts, 5 cities × 3 service NPC.

## 0.1.15
Статический аудит v0.1.14 обнаружил, что часть candidate Event Spot после ромбизации находилась слишком близко к configured walls. Все field zones получили единый проверенный 12-point layout, равномерно использующий верх, середину, левую/правую части и низ ромба. Для каждой точки подтверждены playable-diamond margin и wall clearance ≥55 px. Active placement/anti-repeat/occupancy rules не менялись.

## 0.1.14
Городские NPC пересобраны на общей визуальной базе игрового персонажа: те же голова/лицо/тело/руки/ноги теперь создаются через shared `createHumanoidVisual()`, который использует и `CharacterView` игрока. Банкир шире и массивнее, но остаётся тем же типом человека; телепортер выше и тоньше, со звездой/магическим glow; городской страж увеличен и получает простой плащ, меч и щит. Пять стражей сохраняют собственные biome palettes: snow / forest / stone / sand / south.

## 0.1.13
Добавлены полноценные линии `Мастер воды T1–T4` и `Мастер леса T1–T4`. Они используют тот же Master allocator, Encounter lifetime, Relationship state, modules и REAL TIME Extraction Process, что и Stone Master. Snow field zones теперь имеют направления `stone + water`, forest field zones — `stone + wood`; остальные сохраняют stone. Water Process выдаёт `water`, Forest Process — `wood`. Визуально Water Master получает cyan/blue palette, Forest Master — green palette, при сохранении Tier-индикации. DEV `8300` теперь показывает суммарные количества камень/вода/лес.

## 0.1.12
Interaction prompt вынесен выше постоянной нижней панели управления. Кнопка `Действие` остаётся видимой всегда, а подсказка вида `ДЕЙСТВИЕ · ... · E / Space / Enter` занимает отдельную строку над controls. На touch layout сохранён дополнительный отступ над крупными мобильными кнопками.

## 0.1.11
Локальная игровая зона стала ромбической. За пределы ромба игрок выйти не может, внешние углы визуально затемнены. Реальных переходов ровно четыре: `NW / NE / SW / SE`; `N / E / S / W` отображаются только как ориентиры. Existing 5×5 logical adjacency remapped to diagonal gates: old east→SE, west→NW, south→SW, north→NE. Spawn в следующей локации происходит с противоположной диагональной стороны. Все 12 Event Spot каждой field zone перераспределены по всей площади ромба и валидированы как находящиеся внутри playable area.

## 0.1.10
Закрыта документационная серия перестройки мира. Добавлены `UGD-0029`, `WORLD-MAP-25-LOCATIONS.md` и отдельный QA audit; обновлены CURRENT / NEXT / README / Biome Ground docs / Project Hub. Статически подтверждены 25 unique zones, 80 directed transitions, 5 safe cities, 20 fields, 12 Event Spots на каждом field, 0 Event Spots в city, 3 service NPC в каждом city, четыре snow-соседа стартового города и отсутствие Event Spot внутри configured walls. Ручной browser/gameplay QA всё ещё обязателен.

## 0.1.09
После перехода на 25-zone WorldGraph восстановлен старый playable slice «Три фрагмента», не нарушая safe-city rule. Маршал Гранит в стартовом городе использует стабильный dialogue signal `guide_first_playable`, а `fragment-blue-node`, `fragment-amber-node`, `fragment-violet-node`, `garden-secret-cache` и `first-core` перенесены в field zones с прежними stable interactable IDs. Это сохраняет совместимость с уже использованными one-time IDs в старых save. В город не возвращались полевые Resource/Chest/Event объекты.

## 0.1.08
World Map получил дополнительный вертикальный запас: северный и южный compass-marker больше не должны накладываться на крайние city tiles. Добавлена компактная легенда цветов `snow / forest / sand / stone / south`, отдельное обозначение мирного города и маркер текущей позиции. Геометрия WorldGraph и переходы не менялись.

## 0.1.07
На World Map добавлена восьминаправленная ориентация по пользовательскому референсу: `N / NE / E / SE / S / SW / W / NW`, русские подписи и стрелки. Цветовая группировка повторяет принятую схему: север/NW — синий, восток/NE — зелёный, юг/SE — красный, запад/SW — золотой. Маркеры являются UI-навигацией и не влияют на WorldGraph.

## 0.1.06
Project Hub получил отдельный экран **Карта мира**. Все 25 зон читаются напрямую из WorldGraph и отображаются как квадратные tiles, повёрнутые на 45° в общий ромб. Tile показывает временное название, `loc-xxxxx`, biome и `Location Tier` для field zones; пять safe cities имеют отдельные рамки по направлению. Текущая зона выделяется ярким контуром. Клик по tile пока только выбирает локацию для просмотра деталей и не телепортирует персонажа.

## 0.1.05
Все копии **Астэра Звездочёта** теперь являются одним functional city-teleporter service. InteractionPanel показывает пять safe cities в порядке их world ID; текущий город помечается `вы здесь` и недоступен для повторного выбора. Выбор другого города вызывает существующий `ZoneSystem.travel()` с `entryId=center`, поэтому это настоящий переход мира, а не отдельная копия сцены. После телепорта обновляется Vision и проигрывается portal sound.

## 0.1.04
Городские service NPC получили первый functional layer. Любая копия **Бориса Хранильщика** (`city-banker`) открывает уже существующий реальный Bank UI с `bankAccess=true`. Пять уникальных `city-guide` запускают собственные простые диалоги: Северин, Рейнар, Маршал Гранит, Хасим и Аврелий. Новых параллельных банков/диалоговых движков не создавалось — используются существующие InventoryPanel и DialogueSystem.

## 0.1.03
Biome Texture Runtime расширен слотами `forest`, `stone`, `south`, `city-forest`, `city-stone`, `city-south`. Южные field zones используют пользовательскую коричнево-песчаную текстуру, а `Беломраморный Двор` — пользовательскую белую мраморную текстуру. Forest/Stone пока используют существующие grass/city-grass assets как явный prototype fallback и могут быть заменены позже через Biome Visual Lab без изменения WorldGraph.

## 0.1.02
Во всех 5 safe cities добавлены три статичных сервисных NPC. **Борис Хранильщик** — одна banker-persona с копиями в каждом городе; **Астэр Звездочёт** — одна teleporter-persona с копиями; третий NPC уникален для города: Северин Белый Щит (snow knight), Рейнар Дубовый Страж (forest ranger), Маршал Гранит (start/stone marshal), Хасим Песчаный Венец (sand pharaoh), Аврелий Белый Легат (south/marble). `InteractableSystem` получил отдельные prototype silhouettes для banker, mage/astrologer teleporter и пяти guide styles. Перемещение городских NPC пока намеренно не реализовано.

## 0.1.01
Safe-city правило стало системным, а не только data-настройкой: `EventSpotSystem.desiredSlots()` для города всегда возвращает 0, city event-state очищается, status явно показывает `dynamic events OFF`, а WorldSpawnState по-прежнему пропускает safe cities для Master allocation. Все 5 city-зон в `world.json` имеют `vision.mode = full`, поэтому тень/ограниченная видимость в городе отключены.

## 0.1.00
WorldGraph заменён новой сеткой **25 локаций**: логический `5×5` квадрат, который на мировой карте предназначен для отображения ромбом с поворотом 45°. Пять safe city: север `loc-00001`, восток `loc-00005`, стартовый центр `loc-00013`, запад `loc-00021`, юг `loc-00025`; остальные 20 — field zones. Всем выданы порядковые ID `loc-00001…loc-00025` и временные названия. Старые `zone-001…004` сохранены как legacy aliases к новым зонам для миграции save. В каждой field zone уже 12 candidate spots, распределённых по всей площади 1920×1080; в city zones Event Spot отсутствуют.

## 0.0.99
Локальная карта увеличена по площади ×4: world bounds теперь `1920×1080` (2× ширина и 2× высота), а камера показывает примерно один прежний экран `960×540` и следует за игроком. Вход с left/right/top/bottom начинает игрока у соответствующей границы, поэтому первое видимое пространство естественно зависит от стороны входа. Vision overlay переведён на camera worldView; старые 4 тестовые зоны временно масштабированы ×2, чтобы этот фундамент оставался запускаемым до замены WorldGraph.

## 0.0.98
В Project Hub → `DEV-коды` рядом с каждой строкой, где первый столбец содержит конкретный четырёхзначный код, автоматически появляется кнопка **«Выполнить»** и локальный статус результата. Кнопка не дублирует routing: она подставляет код в существующий footer DEV input и отправляет ту же форму, поэтому используется прежний `executeDevCode()`/DEV-console handler. Ручной ввод кодов сохранён. Справочник также дополнен активными `8297` и `8298`.

## 0.0.97
Добавлен `UGD-0028` и аудит новой placement-модели: 12 candidate spots на каждой текущей карте, active capacity остаётся отдельной, generic Event и Master используют weighted anti-repeat. Статически подтверждено: во всех 4 зонах ровно 12 уникальных spot id и ни один центр spot не лежит внутри wall rectangle. Anti-repeat веса остаются `candidate-QA`.

## 0.0.96
Master allocator получил ту же anti-repeat идею: для каждой зоны хранится история последних 6 Master spots, переживающая reload в `WorldSpawnState`. Последняя точка имеет около `15%` обычного веса, затем `30% / 50% / 70% / 85%`; старые точки снова имеют полный вес. Повтор **разрешён**, но статистически менее вероятен. Active occupancy по-прежнему жёстко исключает уже занятые spots.

## 0.0.95
Generic Dynamic Events теперь выбирают свободный candidate spot не равномерно, а weighted-random с памятью последних 6 использованных точек. Самый последний spot имеет около `15%` обычного веса, затем `30% / 50% / 70% / 85%`, более старые снова имеют полный вес. Это **не запрет повтора**: повтор остаётся возможным, но вероятность заметно ниже. История хранится в zone Dynamic Event state и переживает reload. DEV `8297` показывает recent generic spot history.

## 0.0.94
Все четыре текущие карты получили по **12 candidate Event Spot**. Это расширяет набор возможных мест появления, но **не увеличивает одновременно активную capacity**: Location Tier по-прежнему задаёт 2–6 active Event/NPC во внешних зонах, а город сохраняет свою legacy active-slot модель. `spot-1…spot-6` сохранены по id, чтобы существующие save/Encounter ссылки не ломались; добавлены `spot-7…spot-12`.

## 0.0.93
Добавлен `UGD-0027` и отдельный аудит Event Spot exclusivity. Явно зафиксировано правило `1 spotId = 1 active occupant`, причина бага v0.0.89, приоритет Master reservation, safe relocation Chest/Portal и DEV `8298`. Gameplay/balance в этом патче не менялись.

## 0.0.92
Закрыт связанный риск потери generic Event при появлении Master. Если Master резервирует уже занятый generic spot, существующий Chest/Portal теперь переносится на свободный разрешённый `spotId` с сохранением `event.id`, `spawnedAt/expiresAt`, `kind`, `offer` и consumed-state. Legacy external `resource` по-прежнему удаляется намеренно. Если свободного spot действительно нет из-за capacity, лишний Event удаляется как превышающий допустимую вместимость.

## 0.0.91
Закреплён жёсткий runtime-инвариант: один `Event Spot / spotId` одновременно имеет только одного активного владельца. `refreshEvents()` удаляет generic Event с Master-reserved spot и дубликаты generic spot, expiration больше не имеет fallback на уже занятый `spots[0]`, а `renderCurrentZone()` дополнительно не рисует stale-конфликт даже до следующего persist-refresh. Добавлен DEV `8298`: проверка конфликтов occupancy текущей зоны.

## 0.0.90
Исправлена корневая интеграционная ошибка: `main.js` передавал `worldSpawnStateSystem` в `EventSpotSystem`, но конструктор его не принимал и не сохранял. Из-за этого generic Event не видел Location Tier, Master-reserved `spotId` и external-event rules. Теперь `EventSpotSystem` использует реальный WorldSpawnState: external capacity, запрет legacy Resource Event и исключение Master spots снова работают по задуманной архитектуре.

## 0.0.89
Закрыта документационная серия первого функционального Stone Process: добавлен `UGD-0026`, обновлены CURRENT / Stage F / Master runtime и QA audit. Текущие 60 секунд, Stone ×10 и округление явно закреплены как `candidate-QA`, а не финальный баланс. Relationship XP/Mastery намеренно не начисляются до отдельного решения.

## 0.0.88
Завершённый Stone Extraction теперь можно забрать через того же Master. Prototype formula следует принятому порядку: `base × (1 + LocationBonus) × MasterMultiplier`, затем округление до ближайшего целого. Текущий QA base = `Stone ×10`; это `candidate-QA`, не финальная экономика. Pending reward удаляется **только после успешной выдачи**: если контейнер/вес не позволяют принять Stone, результат остаётся у Master.

## 0.0.87
Persistent Process теперь завершается по REAL TIME даже после reload/offline. `CharacterMasterRelationshipSystem.syncProcesses()` переводит завершённый `activeProcess` в `pendingRewards`; если Process теоретически вышел за сохранённый Encounter expiry, он отменяется вместо выдачи результата. Pending reward хранит base reward и modifier inputs, но фактическая выдача ресурса подключается следующим патчем.

## 0.0.86
Добавлен первый functional `Добыча / Process`: Master module `extraction` включён, а `MasterProcessSystem` запускает persistent REAL TIME process через Character↔Master state. QA profile пока один: Stone, до 60 секунд, при этом duration автоматически не превышает оставшееся время Encounter. `startedAt`, `endsAt`, Encounter expiry и reward inputs сохраняются. Числа процесса помечены `candidate-QA`, не финальный баланс.

## 0.0.85
InteractionPanel получил reusable `showActions()`. Встреча с Master теперь показывает фактические `activeModules` отдельными кнопками вместо одного текстового списка. Пока модуль не имеет functional implementation, кнопка явно disabled и подписана `· позже`. Это UI/API-подготовка к первому Extraction Process; gameplay balance не менялся.

## 0.0.84
Исправлен баг DEV-визуализации: `SpawnZoneDebugSystem` обращался к несуществующему `ZoneSystem.currentZoneId`, поэтому при `ВКЛ` и любом radius ничего не рисовалось. Теперь используется реальный `ZoneSystem.currentId` (с fallback через `current.id`). Механики spawn/allocator/wandering не менялись.

## 0.0.83
`Spawn Zone Debug` теперь включён по умолчанию на этапе активной разработки: center markers ON, radius 150 px. Это делает Event Spot / wandering boundary сразу видимыми после чистого запуска. Явная сохранённая browser-local настройка остаётся сильнее default. Перед production слой можно вернуть в default OFF.

## 0.0.82
После удаления external Resource Event оставшиеся generic slots больше не наследуют старое соотношение 30:10 как скрытый перекос 75% сундуков. Для внешних Location Tier-зон введён явный **candidate-QA** mix `Chest 50% / Event Portal 50%`. Capacity по-прежнему заполняется до `Location capacity - active masters`, пока хватает Event Spot; это не финальный баланс и не меняет Master probability/caps/rotation.

## 0.0.81
Во внешних Location Tier-зонах больше не создаётся legacy generic `resource` Event («Неизвестный ресурс»). Сохранённые resource-events таких зон удаляются при refresh и свободные Event Spot снова заполняются допустимыми generic Event. Ресурсное направление внешнего мира теперь представлено Master NPC; chest/portal остаются отдельными world Event. Safe-city legacy layer этим патчем не меняется.

## 0.0.80
Документирована серия v0.0.73–v0.0.79, добавлены UGD-0025 и QA-аудит. Устаревшее правило «T4 всегда существует где-то» удалено: актуально random candidate → cap, поэтому T4 может отсутствовать. Нового gameplay/balance в v0.0.80 нет.

## 0.0.79
Stone Master теперь очень медленно блуждает вокруг своего Event Spot: паузы между короткими маршрутами, скорость около `5 px/s`, плавный предварительный разворот и граница по radius из `Spawn Zone Debug` (default 150 px). Перед шагом используется текущая world collision-проверка; при препятствии маршрут отменяется и выбирается позже. Пока открыт InteractionPanel, перемещение NPC приостанавливается, но REAL TIME Encounter countdown продолжает идти. DEV teleport по возможности ставит игрока рядом с текущей позицией NPC, а не только рядом с исходным центром.

## 0.0.78
Stone Master получил лёгкое idle-поведение направления взгляда. Мастер выбирает новый угол с длинными случайными паузами и очень медленно доворачивается к нему (`~0.22 rad/s`), без резких snap-поворотов. Движения по карте в этом патче ещё нет; изменяется только ориентация временной top-down модели.

## 0.0.77
Stone Master больше не отображается одним круглым маркером. В `InteractableSystem` добавлена лёгкая top-down humanoid модель из простых Phaser shapes: тень, ноги, корпус, плечи, голова и маркер направления. Tier-цвет, label, glow и Encounter countdown сохранены. Это всё ещё временный procedural/vector shell без финального арта и ЛОР-портрета.

## 0.0.76
Project Hub → Инструменты получил `Spawn Zone Debug · DEV`. Можно независимо включать/выключать окружности, показывать центры Event Spot и задавать radius 10–500 px; настройки сохраняются локально. Default остаётся OFF / center ON / 150 px. DEV-контур не меняет реальный spawn, probability, capacity или rotation.

## 0.0.75
Добавлен отдельный `SpawnZoneDebugSystem`. Он умеет рисовать тонкие DEV-окружности вокруг существующих `eventSpots`, отмечать их центры и хранит локальные настройки `enabled/showCenters/radiusPx`. Базовый радиус — 150 world-px, допустимый диапазон 10–500. По умолчанию слой выключен и никак не меняет фактический allocator/spawn logic; это только QA-визуализация перед будущим wandering NPC.

## 0.0.74
Все шесть текущих biome/city floor texture defaults закреплены на `scale 40%` и `opacity 40%`. Runtime fallback нормализации также использует 40/40. Явные локальные overrides из Biome Visual Lab по-прежнему имеют приоритет, поэтому пользовательская настройка не стирается автоматически.

## 0.0.73
Таймер Stone Master в InteractionPanel теперь обновляется в реальном времени от того же `Encounter.expiresAt`, что и таймер над NPC. Оба представления используют одинаковое округление до секунд; окно автоматически закрывается после истечения Encounter, чтобы устаревшее взаимодействие не оставалось открытым. Game Clock по-прежнему display-only и не влияет на этот таймер.

## 0.0.72
Каждый новый Stone Master Encounter теперь получает persistent `activeModules`. `Добыча` гарантирована всегда; T1 показывает 2–3 модуля, T2 3–4, T3 4–6, T4 все 6. Набор генерируется один раз на Encounter и сохраняется, поэтому reload не меняет доступные возможности. Interaction и World Analyzer показывают текущий набор. Это именно availability layer: Process/Quest/Training/Analytics ещё не объявлены функционально реализованными.

## 0.0.71
Project Hub → Инструменты получил принятый Stage E `DEV World Analyzer`. Он показывает список active Stone master, фильтр Tier, zone/biome/Location Tier/distance/current Location chance/bonus, Encounter lifetime, requested/final Tier, multiplier, candidate pool, rotation round и visited coverage. Есть Previous/Next/Refresh и Teleport к выбранному Encounter; UI читает live WorldSpawnState и не дублирует allocator logic.

## 0.0.70
Ранее зарезервированные 83xx активированы. `8300` показывает Stone master registry/counts, `8302/03/04` — зоны active T2/T3/T4, `8399` — candidate pool/rotation coverage. `8312/13/14` циклически телепортируют QA-персонажа к следующему active master соответствующего Tier и ставят рядом с его Event Spot. DEV teleport не меняет master allocation и не делает reroll.

## 0.0.69
Добавлен отдельный character-scoped Relationship System. Для каждой постоянной master identity сохраняются first/last met, encountersCount, relationship XP/level placeholders, flags, pendingRewards и seen Encounter ids. Повторное нажатие на одного и того же Encounter не увеличивает encountersCount; новый 30-минутный spawn той же identity считается новой встречей. Это персональное состояние персонажа, а не состояние общего NPC/аккаунта.

## 0.0.68
Persistent master spawn-instance теперь реально отображается в своей external zone на выбранном Event Spot. Мастер занимает один slot общей Location Tier capacity, поэтому generic Resource/Chest/Portal не наслаивается на ту же точку и суммарный Event/NPC count не превышает capacity. T1/T2/T3/T4 имеют нейтральную серую/синюю/фиолетовую/золотую визуальную кодировку, 30-минутный countdown и базовое Interaction окно с multiplier.

## 0.0.67
WorldSpawnState теперь поддерживает по одному Stone master Encounter на текущую external zone/resourceDirection, живущему ~30 минут по REAL TIME. Candidate tier берётся из `P(masterTier | LocationTier)`, high-tier caps применяются глобально на Stone (`T4≤1/T3≤2/T2≤3`), проигравшие cap не оставляют слот пустым и понижаются. Для каждого `stone:T2/T3/T4` ведётся независимый rotation round/visited coverage. Spawn-instance, spot, requested/final tier, multiplier и allocation audit сохраняются, поэтому F5 не даёт бесплатный master reroll.

## 0.0.66
Добавлен `data/master-npcs.json` и `MasterCatalog`. Для Stone существуют четыре постоянные master identity `T1/T2/T3/T4` с multiplier `×1.00/1.20/1.40/1.60`, гарантированной Добычей и data-driven module pool. Имена специально нейтральные placeholders до Lore. В world-spawn config добавлены candidate `P(masterTier | LocationTier)`, caps `T2=3/T3=2/T4=1`, максимум один T2+ Stone в зоне и 30-минутный Encounter lifetime; всё это остаётся candidate/prototype balance.

## 0.0.65
Ключевая информация UGD-0016 вынесена из DEV-кодов в постоянный Game Chrome. Во внешней зоне Header показывает `LT Tn · Dn · P n% · +bonus%`; Footer показывает Location Tier, distance, вероятность именно текущего Tier, location bonus, capacity и biome. Tooltip Footer/Header содержит полный T1–T4 probability profile текущего distance band. В safe city явно показывается `Город · D0`.

## 0.0.64
Добавлены persistent QA hooks для новой модели: 8400 reroll Location Tier, 8401–8404 force T1–T4, 8499 status. Старые 8202/8211–8214 больше не создают второй конфликтующий quality-state во внешних зонах и направляют тестировщика к 84xx. Forced/rerolled Tier сохраняется через WorldSpawnState и живёт по REAL TIME.

## 0.0.63
External Dynamic Event слой теперь берёт desired active slots из persistent Location Tier-state, а не из старых QA `1/2/3/5`. Во все три внешние зоны добавлен шестой eligible Event Spot. При смене Tier-state события сохраняют собственный ~30-минутный lifetime, а система расширяет/сокращает число активных slots до текущей capacity. Городской Перекрёсток пока сохраняет старый prototype event behavior.

## 0.0.62
WorldSpawnState теперь реально создаёт и хранит Location Tier-state для каждой внешней зоны: T1–T4, lifetime 2–3h / 1.5–2.5h / 1–2h / 1–1.5h, spawn capacity 2–4 / 2–5 / 3–6 / 5–6 и location bonus 0/20/40/60%. Distance bands взяты как явно помеченный `candidate-balance` из Simulation Lab v0.2: это starting candidate, не финальный баланс. Tier-state живёт по REAL TIME и сохраняется, поэтому F5 не переролливает активное состояние.

## 0.0.61
WorldGraph получил undirected shortest-distance по связям, поиск ближайшего `isSafeCity` и data-driven `resourceDirectionsFor(zone)`. Перекрёсток отмечен safe city; три внешние зоны — текущий Stone-only prototype согласно плану UGD-0015/0016. Это не вводит новые resource probability weights и не затрагивает финальный баланс.

## 0.0.60
Добавлен отдельный WorldSpawnStateSystem и additive поле `worldSpawnState` в Game State schema v1. Состояние зон, будущих master spawn/count/rotation сохраняется через тот же SaveSystem. Это foundation для UGD-0016: reload/F5 не должен становиться бесплатным reroll мира, а backend пока не вводится.

## 0.0.59
После ручной проверки всех шести floor textures пользователь подтвердил, что scale 40% выглядит нормально как текущий baseline. Defaults всех шести biome/city slots синхронизированы на 40%; индивидуальная настройка 1–10 000% через Biome Visual Lab сохраняется.

## 0.0.58
В Project Hub → Игра добавлен временный `Biome Visual Lab · DEV`, архитектурно отделённый от runtime GroundTextureSystem. Для каждого из шести biome/city slots можно выбрать файл из набора текстур, менять отображаемое имя, scale 1–10000%, opacity 0–100%, enabled, Reset/Apply. 16:9 preview тайлит текстуру с теми же scale/opacity правилами. Apply сохраняет локальные overrides и через settings subscription сразу обновляет активный floor, если редактируется используемый слот.

## 0.0.57
Добавлен отдельный GroundTextureSystem и централизованный `data/biome-textures.json` для шести 1024×1024 floor textures. Выбор выполняется по `zone.biome + zone.isCity`; текстура тайлится как world floor, 100% означает исходный 1024-unit масштаб, допустимы 1–10000% scale и 0–100% opacity. Для локального прототипа updater автоматически копирует точные PNG с Desktop в `assets/textures/biomes/`; они игнорируются Git, поэтому не мешают Update/Rollback. При отсутствии локального файла игра сохраняет тёмный fallback вместо падения.

## 0.0.56
Phaser переведён с FIT на RESIZE, а ResponsiveViewportSystem сохраняет базовую высоту мира 540 units и рассчитывает единый camera zoom по высоте. Дополнительная ширина превращается в дополнительные world units слева/справа, а не в растяжение. Старый 960-wide layout центрируется внутри расширенного мира; boundaries/portals следуют краям viewport, Vision SVG получает тот же world size, dynamic Event Spots корректно remap-ятся при relayout.

## 0.0.55
Удалено прежнее 16:9 letterbox-вписывание DOM-контейнера. `#game` теперь занимает всю доступную площадь Workspace между постоянными Header/Footer; боковые пустые поля больше не резервируются. Геометрическое сохранение пропорций мира выполняется следующим патчем камерой, а не CSS-stretch.

## 0.0.54
Inventory и Bank больше не уменьшаются общим scale-first механизмом: для этого окна закреплён масштаб 100%, а при нехватке места используется внутренний scroll. Ширина desktop-окна возвращена к 820px. Backpack и Bank используют одну и ту же сетку и один размер ячеек.

## 0.0.53
Game Clock теперь показывает игровые секунды и явную скорость ×12. При принятом правиле 1 игровая минута = 5 реальных секунд время вычисляется непрерывно, а UI обновляется четыре раза в секунду, поэтому движение игровых секунд видно глазами. Серия v0.0.49→v0.0.53 завершает Window Bounds / Scale-first / Layer Policy / Game Clock UX пакет. Все gameplay timers — Dynamic Event, Location, NPC, Process/offline, cooldown, session/location — остаются REAL TIME.

## 0.0.52
Game Clock теперь визуально показывает фазу суток компактной иконкой рядом с названием: 🌙 Ночь, 🌅 Утро, ☀️ День, 🌆 Вечер. Это только представление времени; никакой Event/Location/NPC/Process/cooldown не переведён на Game Clock.

## 0.0.51
Зафиксирована явная Z-policy: world → vision → HUD/touch → controls → game modal → OverlayRoot → Project Hub → persistent chrome. Dialogue, Interaction и Inventory принадлежат одному game-modal level; открытие одного корректно закрывает другое через его собственный close path, поэтому внутреннее состояние и input-lock не рассинхронизируются.

## 0.0.50
Window Manager сначала уменьшает runtime-окно до минимально читаемого масштаба 82%. Только если даже при 82% содержимое не помещается, включается внутренний scroll. Dialogue и Interaction используют единый стандартный preferred width 640px; Inventory — широкий 780px. Это убирает случайно увеличенный вид Chest/Resource окон без превращения текста в микроскопический.

## 0.0.49
Все runtime-окна получили общий Window Manager и единый контракт containment. Dialogue, Interaction/Chest/Resource и Inventory измеряются относительно реального `#game` внутри Workspace и не могут выйти за его границы. Project Hub по-прежнему живёт только внутри OverlayRoot, поэтому Header/Footer остаются физически отдельными областями.

## 0.0.48
Completed the Game Chrome migration. The legacy in-canvas HUD is hidden only after its information has replacements: Stamina/resources/storage/fragments are in the persistent header and live zone-rule context is in the footer; quest/context prompts remain in the Workspace. Remote Action input is hardened so an open modal cannot leak a world interaction. Class changes and initial storage load update the header immediately.

Version and build/source identity are separate movable footer blocks. Journal, Active–Idle and the published Simulation Results pages now load shared always-visible project chrome with version/build/environment, session, saved location, Game Clock and real local date/time/timezone. The persistent text-selection setting applies there as well. This completes the accepted UGD-0021 v0.0.41→v0.0.48 series.

## 0.0.47
Added persistent Interface Settings in Project Hub. Text selection is disabled by default across the application to prevent accidental drag-selection during gameplay/remote control, while input, textarea, select and contenteditable fields remain selectable. The setting can be switched on/off instantly without reload and persists in localStorage.

## 0.0.46
Remote-desktop controls now use the same contextual action path as keyboard input. Visible Action buttons can advance/complete dialogues, select/close InteractionPanel content or interact with the world depending on context. Direction buttons remain hold controls and now light up when driven virtually as well as from physical arrow keys. This preserves mouse/AnyDesk as a first-class QA input adapter rather than a decorative duplicate.

## 0.0.45
Added a unified contextual Action Router. E / Space / Enter now resolve through the active UI first (dialogue advance/complete, InteractionPanel selection/close) and fall back to the world interaction action only when no blocking interaction is open. Escape is the common Back/Cancel path. InteractionPanel options can be moved with arrow keys and show a visible keyboard focus; linear dialogue consumes arrows so character movement cannot leak through while the dialogue is open.

## 0.0.44
The persistent header is now live. It shows the current class, placeholder identity/profession/specialization until those systems exist, Stamina + bar, up to five pinned resources from the resource catalog, a material Stone-equivalent total and storage summary. Attention is visible but intentionally excluded from material wealth because its current baseValue is an analytical comparison value rather than an accepted exchange rate.

## 0.0.43
Added a persistent informational Game Clock. The game calendar starts at 01.01.2026 00:00 on first initialization, continues across reloads/offline time, advances one game minute every five real seconds, and labels Night 00–06, Morning 06–12, Day 12–18 and Evening 18–24. This clock is display-only: all existing gameplay/event/location/process timers remain real-time and are not accelerated.

## 0.0.42
Footer context is now live. It shows version, LOCAL/PAGES environment, a short source SHA when it can be resolved, session duration, current zone id/name, time spent in that zone, available current zone rule details, local real date/time and IANA timezone + UTC offset. Session/location timers use sessionStorage so F5 does not reset them; changing zone resets only the location timer. The local dev server exposes a read-only build metadata endpoint containing the checked-out Git SHA.

## 0.0.41
Introduced the persistent Game Chrome shell. Header and Footer are now structural siblings of the central Workspace; Project Hub lives inside a dedicated Workspace OverlayRoot, so future modals cannot cover the persistent chrome by z-index alone. Desktop layout reserves a larger information header, a compact one-line footer and a remote-control strip inside the Workspace. Existing gameplay HUD values are intentionally kept during migration until their replacements are wired.

## 0.0.40
Published a permanent GitHub Pages archive for the key Simulation Lab runs: #6 TEST, #7 historical MATRIX and #20 current Simulation Lab v0.2 baseline. Project Hub now links directly to the archive and to the new post-simulation implementation plan.

Accepted the first Attention cadence guardrail: about one Attention per week is a healthy normal target, about one per day is hardcore activity, and more than ten per week is an anomaly/review threshold that should trigger source/log inspection rather than automatic punishment. The current Dynamic Resource Event reward `Attention ×1` is explicitly documented as a prototype QA placeholder, not final economy.

Large manual TEST/MATRIX/DEEP runs are paused after #20. Automatic smoke checks remain for tooling health only. The next gameplay patch should wait for the user's pending patch package, then merge it with `docs/NEXT-IMPLEMENTATION-PLAN.md`.

## 0.0.39
Simulation Lab v0.2 corrects the high-tier master model after MATRIX analysis. T2/T3/T4 counts are maximum simultaneous caps, never target counts; if no random candidate exists, that master Tier is absent. A new per-master rotation allocator keeps independent coverage history for each resourceDirection + Tier and prefers unvisited eligible zones until the current coverage round is exhausted.

Added Player Effort analytics. The simulator reads current resource baseValue from `data/resources.json`, treats `1 Attention-equivalent = 5000 Stone-value` strictly as an analytical comparison unit, and reports expected click/action cost, NPC checks, reward actions and interaction time. Reports now include `attention-equivalent-effort.csv`, `master-search-clicks.csv`, `master-rotation-coverage.csv` plus SVG/HTML charts. DEV codes 83xx are reserved for future master registry/list/teleport QA when WorldSpawnState becomes live gameplay. Previous TEST/MATRIX #6/#7 remain useful historical runs but must be rerun for the corrected allocator.

## 0.0.38
Fixed the local Node dev server so directory URLs such as `/journal/` resolve their `index.html` just like GitHub Pages. Bare directory URLs are redirected to a trailing slash so relative CSS/JS paths remain correct. Project Hub no longer sends a first-time user straight into an unexplained GitHub Actions screen: the main Simulation Lab launch card now opens `docs/SIMULATION-LAB-QUICKSTART.md`, which explains what GitHub Actions is, why `Run workflow` is hidden while signed out, the exact first TEST 100k settings, where Artifacts/report.html appear, and the updater option 9 local alternative. A separate card still opens the Actions runner directly.

## 0.0.37
Added the first working uGame Simulation Lab prototype without changing live gameplay balance. A standard-library Python engine reads candidate simulation rules from `data/simulation/simulation-defaults.json`, builds deterministic synthetic worlds and measures Location Tier, biome/resource selection, master Tier allocation, world/per-location caps, rotation fairness and reward/XP multipliers. TRACE, TEST, DEEP and multi-world MATRIX modes generate JSON/CSV summaries plus self-contained HTML/SVG reports; completed runs can also be compared A/B. Generated reports are ignored by Git.

A dedicated `.github/workflows/simulation-lab.yml` provides the preferred no-install browser route through GitHub Actions. Pushes affecting the simulator run compile/config/unit/TRACE smoke verification automatically; the first smoke workflow completed successfully and produced an artifact. Manual Actions runs expose TRACE, TEST 100k, DEEP 1M and MATRIX modes. The Windows updater now has option 9, Simulation Lab: it never installs Python or packages automatically, runs only the checked-out simulator after explicit `SIMULATE` confirmation, and falls back to the GitHub Actions URL when Python is unavailable. Project Hub links directly to the web runner. Candidate probability tables are simulation inputs only and are not yet live game balance.

## 0.0.36
Added the first Project Hub UI directly inside the game shell. The top bar now has one Hub entry instead of scattering project/dev links across the playfield. The Hub uses one responsive overlay shell with root sections and a navigation stack, so documents and Project Journal records can open in the same browser tab with Back/Close/Escape navigation. Internal Markdown is fetched through relative same-origin paths and rendered with a lightweight safe viewer supporting headings, lists, code, quotes and tables. The Hub exposes CURRENT, VERSION, README, Active/Idle Core, Simulation Lab docs, DEV codes and Project Journal search/listing. External GitHub repository/Actions and Pages links open separately. Opening the Hub now participates in the shared input-lock rule with Dialogue, Interaction and Inventory overlays, so player movement does not resume until every blocking overlay is closed. No save schema or gameplay-world rules changed.

## 0.0.35
Runtime inventory is moved from the old flat InventorySystem into a modular ContainerSystem. Backpack, Resource Pouch, Equipment and Bank are now configurations of one storage engine with slots, per-item stack limits, weight limits, transfer rules and persistent state. The starter Backpack has 12 slots / 30 kg. Resource Pouch has one slot / 15 kg and currently accepts only Stone, proving the future skill-driven specialization model without implementing the Skill tree yet. Equipment has named helmet/chest/pants/boots/gloves/ring1/ring2/amulet/cloak/belt slots. A prototype Bank interactable on Перекрёсток opens a 60-slot weight-unlimited local Bank; the Bank tab is not available from the ordinary global inventory button. Resources now carry test weights and stack limits: Stone 1 kg, Wood 0.5 kg, Water 0.1 kg, Attention weightless/account-bound. Physical dynamic rewards must fit portable storage or the reward choice remains pending. Old flat inventory and physical resource placement migrate into new containers; migration overflow goes to Bank to avoid data loss. DEV 5011 adds test helmet/belt for equipment QA. See docs/CONTAINER-SYSTEM.md and UGD-0014.

## 0.0.34
Reward-choice presentation now follows one general rule. If the player can take every generated option, rewards are shown immediately because there is no meaningful choice to protect. If the player may take only part of the generated set, all options are hidden before selection so the interaction behaves as a lottery instead of a value-comparison menu. After the allowed choices are taken, unchosen rewards can be revealed as informational feedback; this behavior is controlled by `choicePresentation.revealUnchosenAfterComplete` in `data/reward-rules.json` and is enabled by default. The same rule applies to resource and chest reward offers.

## 0.0.33
Remote testing through desktop-control apps no longer depends on sending the E or Space key. Enter is now a third interaction key alongside E and Space. The bottom bar also contains persistent clickable controls for left/up/down/right, Action and Dash, so the prototype can be operated with a mouse cursor. Direction buttons support press-and-hold. The mouse Dash button uses a short queued pulse, making it possible to click Dash and then a movement direction without needing two simultaneous mouse presses. Existing touch controls remain unchanged for direct mobile play.

## 0.0.32
Each current zone now contains five possible Dynamic Event Spots. Zone quality Q1–Q4 is rolled from the prototype 80% / 15% / 3.5% / 1.5% rarity profile and controls 1 / 2 / 3 / 5 active event slots. Quality rerolls independently per zone on quality-dependent real-time windows (Q1 roughly 150–180 minutes down to Q4 roughly 60–90 minutes), while each dynamic event has its own 30-minute lifetime and visible countdown. Resource, chest and placeholder event-portal encounters are generated from data-driven rules. A reusable InteractionPanel supports reward-choice and message interactions; resource events show 2–3 generated options, while chest events separately roll how many closed chests appear and how many may be selected. Chest contents are generated in advance but hidden until selection. Resource definitions and relative values moved to `data/resources.json`, reward/event rules to `data/reward-rules.json`. Dynamic event state and pending reward offers are saved in Game State so zone changes/F5 do not become free rerolls. DEV codes `8201`, `8202`, `8299` speed up QA. Event portals are intentionally placeholders and do not yet travel to event zones.

## 0.0.31
The project switches from infrastructure-first work to the first content-first playable slice. `data/world.json` now contains four connected zones — Перекрёсток, Галерея, Тёмный сад and Сердце руин — arranged as a small loop with labeled exits and two possible routes toward the final area. A new quest, `q002` «Три фрагмента», asks the player to speak with the Guide, find three uniquely tracked fragments and activate the first core. Quest signals remain order-tolerant through the existing seen-signal behavior, so exploration does not have to follow one strict route. The Dark Garden contains an optional one-time cache. Chest definitions can now provide their own item id and optional quest signal, and the HUD shows First Playable fragment progress. Old q001 saves do not block the new auto-start quest: when restored quest content no longer has an active quest, the first pending auto-start quest begins. No combat, enemy or large new framework was added.

## 0.0.30
World identity and connectivity moved out of `ZoneSystem` into a data-driven WorldGraph. `data/world.json` now defines stable string zone ids (`zone-001`, `zone-002`), explicit stable transition ids, entries, current zone geometry/rules and interactable definitions. Portals travel through a transition id instead of embedding duplicated destination links. WorldGraph accepts legacy numeric zone ids `1`/`2`, so a v0.0.29 save can restore normally and is rewritten with the canonical stable id on the next `zone:enter` autosave. The Game State schema stays at version 1 because string zone ids were already valid. Existing interactable ids remain unchanged in this release to preserve one-time-object save compatibility. See `docs/WORLD-GRAPH.md`.

## 0.0.29
Added the first accepted persistence foundation: a versioned serializable Game State (`schemaVersion: 1`) and a browser-local SaveSystem adapter. The prototype now restores selected class, current zone/entry context, resource counters, inventory stacks, quest progress/completion/seen signals and used one-time interactables. Autosave is triggered by significant state changes rather than movement. Unsupported save schemas are not silently overwritten. DEV codes `9001`, `9002` and `9099` provide save-now, clear-for-reload and status checks. Exact player position and other transient scene details remain runtime-only by design. See `docs/SAVE-SYSTEM.md`.

## 0.0.28
Idle now has no forward body projection: the head overlaps the torso around the same center footprint, with only a small face marker showing facing direction. Walking alone moves the torso and head forward, while the legs trail slightly behind. Dash increases the same movement projection. The existing smooth transition, walk cycle and facing rotation are preserved.

## 0.0.27
The previous posture difference was too subtle at normal gameplay scale. Idle is now much more compact in top-down projection: the head, face, arms and torso overlap more closely around the character centre. Walking moves the upper body forward by roughly 5–9 pixels while the legs trail behind, and dashing increases that projection further. The shadow stretches slightly during movement to help the posture change read immediately without changing the established character style.

## 0.0.26
The temporary top-down character now has two clearer posture states. While idle, the body is more upright and compact, with the head and face pulled back toward the body so the character feels as if they are standing tall. While walking, the upper body, head and face smoothly shift forward; dashing increases that lean a little more. The transition is interpolated instead of snapping, while the existing arm/leg walk cycle and facing direction are preserved.

## 0.0.25
The previous playfield fix was not strict enough: Phaser could still render its canvas at a different CSS size than the DOM Vision layer. The canvas and Vision SVG are now both forced to fill exactly the same `#game` rectangle. The Vision SVG also declares `width="100%"` and `height="100%"`, while its mask continues to use the same 960×540 world coordinates as the player.

## 0.0.24
The development server now listens on the local network and prints private IPv4 URLs for same-network testing. See `docs/LAN-TESTING.md`.

## 0.0.23
Quest status now shows title, current step and progress. Completed status remains visible. The temporary character was slightly straightened without changing its overall visual direction.

## 0.0.22
The visible game field is fitted to a single 16:9 rectangle. Vision, canvas and HUD share those bounds, and Vision uses world coordinates directly.

## 0.0.21
Portals now carry a target zone and target entry side. Zone 1 right exit leads to Zone 2 left entry; Zone 2 left exit leads to Zone 1 right entry.
