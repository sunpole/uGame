## v0.2.48 — массовый перенос и защита удаления

Исправлено переполнение последнего фильтра. У банкира появились «Поместить всё в банк», «Поместить все ресурсы в сундук», «Забрать всё» и перенос между хранилищами с сохранением непоместившихся предметов. Удаление дорогих (от стоимости 1 Внимания), квестовых вещей и предметов без известной цены требует ввода **УДАЛИТЬ**. Сортировка пяти видов проверяется на сохранность ресурсов. [Подробности и QA](docs/releases/v0.2.48.md).

---

## v0.2.47 — серверная модель общих экспедиций (разработка, без подключения Phaser)

Добавлен отдельный Node.js-сервис **на localhost**: одна общая добыча, максимум 12 участников, server-side верификация ручных ударов, автоциклы, рейтинг, разовые награды и хранение состояния вне GitHub. Для запуска требуется локальный админ-секрет; сервис не открывается в интернет и **пока не подключён к игровому интерфейсу**. Обычная игра продолжает использовать локальную экспедицию. Подробности и ограничения: [v0.2.47 QA](docs/releases/v0.2.47.md).

---

## v0.2.46 — управление рюкзаком, банком и ресурсным сундуком

Появились **поиск, фильтрация T1–T8, сортировка с объединением стопок, перенос мышью и кнопками, безопасное удаление с подтверждением**. У банкира доступен отдельный ресурсный сундук на 48 ячеек. Все изменения отражаются в настоящем сохранении контейнеров. Релиз QA: [v0.2.46](docs/releases/v0.2.46.md).

---

## uGame v0.2.45 — шесть действующих активностей Мастеров

**Квест**: принять поручение и добыть 2 кг в текущей экспедиции; **особое событие**: три точных ручных удара и награда; **аналитика**: дополнительный бонус после развития навыка и выполнения норматива. Процесс бесплатной награды, экспедиция и тренировка уже работают. Каждая награда строго одна на Encounter. По-прежнему **только локальный один игрок**, не настоящий мультиплеер. Подробнее: [v0.2.45 QA](docs/releases/v0.2.45.md).

---

## uGame v0.2.44 — реальные профессии добычи T1–T8

Добавлены четыре сохраняемых дерева навыков ресурсных профессий (камень/дерево/вода/глина), отдельная репутация конкретного Мастера и практические тренировки через случайный модуль «Репутация и навыки». Появились рабочие «Аналитика», расходуемые еда и настой, инструмент/экипируемые перчатки и выбор Resource Tier T1–T8 с требованиями к профессии и репутации. **Сейчас 1/12 локальный прототип; 12 настоящих игроков, сетевой сервер, квесты и specials ещё не реализованы**. См. [QA v0.2.44](docs/releases/v0.2.44.md).

---

## v0.2.43 — новый экран ресурсной экспедиции

Ресурсная добыча через Мастера теперь открывается в отдельном **полноэкранном визуальном инстансе** (шахта/лес/источник/карьер). Старый мир скрыт, на поверхность персонаж возвращается в исходную точку. **Когда весь источник полностью добыт, Мастер исчезает спустя 30 секунд**; над NPC появляется красный таймер в формате 00:30. Эта версия — локальный прототип для одного игрока, полноценная совместная серверная шахта ещё не внедрена. См. [релиз и QA](docs/releases/v0.2.43.md).

---

## v0.2.42 — ресурсная экспедиция у Мастеров (локальный QA, без настоящего мультиплеера)

Первый мини-прототип UGD-0036: у каждого Мастера доступна **экспедиция**; T1 добывает ограниченный камень/дерево/воду/глину T1 в отдельной лёгкой панели. Auto считает REAL TIME даже после закрытия браузера до окончания Encounter; ручная мини-игра награждает больше Relationship XP. Персонаж занят экспедицией, возобновление доступно с нижней панели. Предусмотрены 12 мест, но присутствует пока **только один настоящий локальный персонаж**. T2–T4 открывают экспедицию-предпросмотр, T3–T8 ресурсы ещё заблокированы до будущего дерева навыков. Текущая бесплатная добыча сохранена как случайно доступный отдельный модуль. Подробности: [QA v0.2.42](docs/releases/v0.2.42.md).

**Ветка реализации является отдельным PR поверх документационного PR #2. Код main пока v0.2.41.**

---

## v0.2.41 — Master Process indicators and first crafting action (QA)

- Existing real-time Process stays 60 seconds.
- Master marker statuses: idle (red), running (red plus mm:ss above), ready (green), claimed (no marker/timer). Source of truth is persisted CharacterMasterRelationships; old Encounter rewards do not unlock the current dot.
- First real craft: 0.4 kg stone T1 + 0.2 kg wood T1 -> one "Простой полевой инструмент" in backpack. Temporary "Мастерская" button in bottom and touch controls, without city/class lock.
- One atomic ContainerSystem inventory commit for costs/output. Insufficient materials or inventory slots do not consume anything; only one saved container-change event on success.
- Local browser saves only; no multiplayer server-side ownership/claim guarantee. See docs/CRAFTING-VERTICAL-SLICE.md and docs/releases/v0.2.41.md.
- Regression: `npm test`. Browser smoke test still required.

# uGame

Latest QA checkpoint: **v0.2.33** (eight mini-patches v0.2.26–v0.2.33). Master marker identity fix and 4+1 city preview are ready for browser QA. Materials/first craft remain design-only. GitHub code snapshots and rollback instructions: [Release Rollback](docs/RELEASE-ROLLBACK.md).

Windows entry point: **Update-uGame.cmd**. Uses its own checkout directory,
including `C:\!CODE_CLUB\new 2026\011_uGame`, regardless of the terminal's current folder.
Requires Windows PowerShell 5.1 and Git for Windows. No administrator rights.

| Number | Action |
|---|---|
| 1 | Download GitHub main and fast-forward |
| 2 | Show local status, commit and log path |
| 3 | Open a temporary ChatGPT report |
| 4 | Run local npm dev after typing RUN |
| 5 | Open GitHub |
| 6 | Open project folder |
| 7 | Restore pre-update files after typing ROLLBACK |
| 8 | Return from rollback to main |
| 9 | Simulation Lab: TRACE / TEST / DEEP / MATRIX |
| 10 | Import/update six local biome texture PNGs from Desktop |
| 11 | Quick Run local npm dev immediately, without typing RUN (explicit menu choice) |
| 0 | Exit |

## Project Journal

Project decisions, hypotheses and design history are stored under
`docs/project-journal/`.

- `docs/project-journal/CURRENT.md` — short map of the currently accepted direction and active hypotheses.
- `docs/project-journal/index.json` — machine-readable metadata for all UGD records.
- `docs/project-journal/records/` — detailed history, alternatives and reasons behind decisions.
- `AGENTS.md` — rules for agents working with project knowledge.

GitHub Pages exposes a read-only view at:

`https://sunpole.github.io/uGame/journal/`

The Pages interface reads `CURRENT.md`, `index.json` and record Markdown directly. It is not a separate source of truth.

## Game prototype v0.1.16 — local diamond maps + multi-resource Masters + city services

uGame keeps the First Playable slice and changing-world/container layers, and now adds an in-game Project Hub for project navigation and documentation.
The current prototype includes:

- 25 connected top-down locations loaded from `data/world.json` through WorldGraph: 5 safe cities + 20 field zones;
- each local world is 1920×1080 (2× width × 2× height / area ×4) with a following camera and diamond playable boundary;
- real local transitions exist only at NW/NE/SW/SE gates; N/E/S/W are orientation terms only;
- every field zone has 12 candidate Event Spots spread across the expanded map; safe cities have zero Event Spots;
- persistent external Location Tier T1–T4 with real-time Tier-state lifetime, safe-city distance and 2–6 active spawn capacity;
- 30-minute Dynamic Event encounters continue to live independently inside the longer Location Tier-state;
- generic field events currently use Chest / placeholder Event Portal; resource-direction gameplay is routed through Master NPC;
- a reusable InteractionPanel for reward choice and informational event windows;
- data-driven resource catalog and reward/event generation rules;
- persistent pending reward offers so reload/zone travel cannot freely reroll them;
- restricted reward choices are hidden until selection; if every option can be taken, rewards are shown immediately;
- missed rewards can be revealed after the choice through a data flag, enabled by default;
- a small loop with two routes toward the final area and labeled exits;
- stable string zone ids and stable transition ids, with migration from the old numeric save ids;
- the Guide NPC and the quest «Три фрагмента»;
- three one-time fragments placed in different zones;
- a final objective in «Сердце руин» and an optional cache in «Тёмный сад»;
- order-tolerant quest signals, so exploration does not have to follow one strict route;
- modular Vision, Class, WorldGraph, Zone, Player, Interactable, Event and Zone Rules systems;
- a temporary layered top-down character with distinct centered idle and forward-leaning movement poses;
- WASD/arrow movement, Shift dash and stamina;
- interaction by E / Space / Enter;
- always-visible footer mouse controls for directions, Action and Dash during remote testing;
- NPC, resource, chest and portal variants built on one Interactable system;
- temporary procedural sounds routed through one Audio system;
- ResourceSystem counters plus a modular ContainerSystem for physical item placement;
- Backpack with slots, stack limits and weight;
- Resource Pouch with starter Stone-only storage;
- named Equipment slots for helmet/chest/pants/boots/gloves/rings/amulet/cloak/belt;
- a local prototype Bank service on Перекрёсток with large storage and no weight limit;
- persistent container placement and legacy inventory/resource migration;
- JSON-driven dialogue and quest data;
- versioned Persistent Game State schema v1 plus browser-local SaveSystem;
- restoration of class, stable zone/entry context, resources, inventory, quest state and used one-time interactables;
- mobile touch controls for movement, action and dash;
- Vision overlay locked to the same playfield bounds as Phaser;
- local-network dev-server access for phones and laptops on the same Wi-Fi/LAN;
- the four-digit DEV console and live physical-arrow indicator;
- an in-game Project Hub with embedded README/VERSION/Project Journal/document viewing plus GitHub/Actions/Pages links;
- a headless Simulation Lab developer tool with deterministic TRACE/TEST/DEEP/MATRIX runs, reports and comparison tooling.
- Simulation Lab v0.2 Player Effort analytics: click cost to find T1–T4 masters, Attention-equivalent effort and per-master rotation coverage.
- a published Simulation Results archive under `reports/simulation/`, with #20 as the current v0.2 baseline and #6/#7 retained as historical benchmarks;
- an Attention cadence guardrail: ~1/week normal, ~1/day hardcore, >10/week anomaly/log review;
- a provisional `docs/NEXT-IMPLEMENTATION-PLAN.md` that must be reconciled with the user's next patch package before new gameplay work starts.
- persistent desktop Game Chrome with a non-overlappable Header / Workspace / Footer shell;
- version/build/environment, session time, location/time-in-zone, Game Clock and real local clock/timezone always visible;
- live character class/Stamina/resources/material wealth/storage summary in the header;
- unified contextual E/Space/Enter action routing plus mouse/AnyDesk parity;
- text selection disabled by default with a Project Hub setting to re-enable it;
- shared project chrome on Journal / Active–Idle / Simulation Results HTML pages;
- scale-first bounded runtime windows with fixed-size Inventory/Bank slots and scroll fallback;
- a full-Workspace responsive Phaser viewport: wide screens reveal more world instead of stretching sprites or vision;
- biome/city ground texture slots for grass, sand, snow, forest, stone and south through a dedicated GroundTextureSystem;
- dedicated tracked South prototype textures: brown sandy field ground + white marble city ground;
- five safe cities with full vision, no Dynamic Events/Masters, and three service NPC each;
- shared Banker Boris opens the existing Bank, shared Teleporter Aster connects all five cities, and each city has a unique biome guide/guard; all city NPC reuse the player's humanoid visual base with role-specific proportions/accessories;
- Project Hub World Map renders all 25 locations as a 45° diamond with temporary names/IDs/biomes/current position and N/NE/E/SE/S/SW/W/NW compass;
- per-texture enabled, name/file, scale 1–10,000% and opacity 0–100% settings;
- a temporary Project Hub `Biome Visual Lab · DEV` with a live tiled preview and local Apply/Reset overrides;
- local serializable `WorldSpawnState` persisted inside Game State so reload/zone travel cannot freely reroll Location Tier;
- WorldGraph shortest-distance to `isSafeCity` plus Stone-only resource eligibility for the current external-zone prototype;
- Location Tier QA codes `8400`, `8401–8404`, `8499` for controlled testing without waiting hours;
- persistent Header/Footer location intelligence: current Location Tier, graph distance, current-tier probability and location bonus are always visible;
- three resource Master lines — Stone / Water / Forest, each T1–T4 — with persistent Encounter instances, shared REAL TIME Process runtime, Tier multipliers, caps and per-resource rotation coverage;
- master encounters occupy the same Location Tier Event/NPC capacity as generic events and render as Tier-colored NPCs;
- character-scoped persistent Master relationship history: first/last meeting and unique Encounter count without click-spam growth;
- active Master QA codes `8300`, `8302–8304`, `8312–8314`, `8399` for registry/filter/rotation/teleport testing;
- Project Hub `DEV World Analyzer` for active masters, Location context, candidate pools, rotation coverage and one-click teleport;
- persistent per-Encounter module availability: Extraction is guaranteed; T1 2–3, T2 3–4, T3 4–6, T4 all six modules.

The original First Playable quest remains available inside the expanded world: speak with start-city Marshal Granit, explore the field zones, find the blue, amber and violet fragments, then activate the extinguished core.
On top of that static loop, v0.0.32 tests whether changing Event Spots make revisiting zones
more interesting. v0.0.35 adds the first inventory/storage gameplay layer: physical rewards now
need portable container capacity, while Attention remains intangible/account storage. v0.0.36 adds
the Project Hub so project documentation, Journal records and project/tool links can be reached
without leaving or reloading the current game session. v0.0.37 adds the first working Simulation
Lab developer tool: it can model synthetic worlds at 8/30/50/100 zones, enforce candidate master
caps, produce analysis reports and run either from GitHub Actions or locally through updater option
9 when Python is already available. These simulation probability tables are candidates only and do
not alter the current gameplay rules. v0.0.41–v0.0.48 then rebuild the permanent application chrome:
Header/Footer remain outside every Workspace overlay, current build/session/location/clocks are always
visible, the old duplicate HUD is migrated only after replacement data exists, and keyboard/mouse
actions share one contextual route. v0.0.49–v0.0.53 add bounded scale-first windows and visible Game Clock seconds/phase. v0.0.54–v0.0.58 then keep Bank/Inventory at normal slot size, expand the game to the full Workspace, add a non-stretch responsive camera and introduce biome floor textures plus the temporary Biome Visual Lab. v0.0.59 fixes the approved 40% texture baseline; v0.0.60–v0.0.64 implement Stage C WorldSpawnState/Location Tier runtime, including persistent Tier-state, graph distance, Stone eligibility, 2–6 external spawn capacity and QA controls. v0.0.65–v0.0.72 expose Location intelligence in persistent chrome, implement the first Stone Master runtime with caps/rotation/relationships, activate 83xx QA, add DEV World Analyzer and persist the Tier-driven module availability set. Event Portal
encounters are placeholders only; they do not travel anywhere yet.

World identity and connections live in `data/world.json`. `src/world-graph.js`
resolves stable ids and transitions; `ZoneSystem` renders the selected zone rather than
owning the authoritative zone list. Existing v0.0.29 saves containing numeric zone ids
`1`/`2` are resolved through legacy aliases and rewritten with canonical ids after the
next zone entry/save. See `docs/WORLD-GRAPH.md`.

Persistent state intentionally stores significant consequences rather than every
runtime detail. Container placement, Bank, Equipment and Resource Pouch state are now part of the
same Game State. Exact player coordinates, animation phase and temporary UI state are not saved.
See `docs/SAVE-SYSTEM.md` and `docs/CONTAINER-SYSTEM.md` for schema, limitations and QA.
Browser saves are origin-local, so localhost, a LAN address and GitHub Pages each have
their own separate save.

Combat/enemies are intentionally deferred. New architecture should now be added mainly
when a concrete playable feature requires it, rather than being completed in advance.

`docs/CHARACTER-ASSET-GUIDE.md` describes the first authored character spritesheet/layer
workflow. `docs/PREBY-DEPLOY.md` describes the intended static deployment to a dedicated
`pre.by` development hostname. Hosting is prepared/documented but is not deployed by
this repository itself yet.

`version.json` is the machine-readable project version. `package.json` mirrors the
same version for tooling. `VERSION.md` is the human-readable version history.

`docs/SIMULATION-LAB.md` describes the headless balancing tool, report formats and web/local launch paths. The preferred no-install runner is GitHub Actions; generated local reports live under ignored `simulation-reports/`.
`docs/SIMULATION-LAB-QUICKSTART.md` is the short first-run guide used by Project Hub. The local dev server supports directory index routes such as `/journal/`, matching GitHub Pages behavior.

Option 4 runs the prototype through the local Node dev server. No npm package
installation is required. Phaser is loaded by the browser from its CDN, so the
prototype needs an internet connection while running.

The dev server also prints private IPv4 URLs such as `http://192.168.x.x:5173` for
same-network testing. If Windows Firewall asks, allow Node.js on Private networks only.

## DEV console

Code `9999` opens `docs/DEV-CODES.md`. Active groups currently include Vision `1xxx`,
Movement `3xxx`, Items/Inventory `5xxx`, World/Resources `6xxx`, Classes `7xxx`,
Events/Quests `8xxx` and Save/Service `9xxx`. `2xxx` Player and `4xxx` Combat remain reserved.

Save verification codes: `9001` save now, `9002` clear the local save and pause autosave
until reload, `9099` show save status. `8001` restarts the current first quest for testing.
Dynamic Event QA: `8201` recreates current-zone events and `8299` shows status. In the safe-city prototype, `8202` and `8211–8214` still control the legacy city quality layer. External zones use Location Tier QA: `8400` rerolls the current Tier, `8401–8404` force T1–T4, and `8499` shows distance/capacity/lifetime. Stone Master QA: `8300` registry, `8302–8304` Tier lists, `8312–8314` teleport/cycle, `8399` candidate/rotation summary.

After a DEV command, focus is released from the DEV field so keyboard movement works
immediately again. For remote-desktop testing, the footer duplicates movement, Action and Dash
as clickable buttons; mouse Dash is a short pulse so it can be clicked just before a direction.


## Biome floor textures

The v0.0.57 runtime selects a floor by `biome + isCity` and repeats a 1024×1024 source texture in world space. Defaults and file mappings are stored in `data/biome-textures.json`; admin overrides are browser-local.

Current development slots:

- field: grass / sand / snow / forest / stone / south;
- city: city-grass / city-sand / city-snow / city-forest / city-stone / city-south.

The original six PNG binaries remain local development assets handled by `Update-uGame.cmd → 10`. The two South prototype JPEG assets are tracked in the repository because the current world uses them directly. Forest/Stone currently reuse existing grass/city-grass art as explicit prototype fallbacks.

`Project Hub → Игра → Biome Visual Lab · DEV` is temporary admin tooling. It can change the texture name/file, enable state, scale from 1% to 10,000%, opacity from 0% to 100%, and preview the same tiled behavior used in gameplay. Later the admin UI can be hidden without removing the runtime GroundTextureSystem.

See `docs/BIOME-GROUND-TEXTURES.md`.

## First update

Run `C:\!CODE_CLUB\new 2026\011_uGame\Update-uGame.cmd`, choose **1** to update,
then restart the launcher and choose **4**. Type `RUN` when the updater asks for
explicit permission to execute the checked-out local project.

## Safety contract

Only the fixed HTTPS sunpole/uGame URL and refs/heads/main are fetched. Origin
must identify sunpole/uGame. Updating requires main, no tracked/staged/untracked
changes, and no active Git operation. Detached, local-ahead or divergent history
stops sync. Ignored files cannot be overwritten by merge/checkout.

Synchronization never executes remote instructions, manifests, issues, reports,
package scripts, hooks or submodules. Git fsmonitor and LFS executable filters
are disabled. Other configured filters and URL rewrites are rejected; this
updater does not materialize LFS assets. Authentication uses the user's existing
trusted Git credential helper. Git configuration is not modified.

Downloaded updater code is not automatically executed: the menu exits after a
changing update and must be explicitly restarted. The next launch trusts the
checked-out updater and repository maintainers. This is not a sandbox for a
compromised repository or local Git/Node installation. Option 4 explicitly runs
local project code; no dependency installation or automatic npm pre/post scripts.
Simulation option 9 also requires explicit `SIMULATE`, never installs Python/pip packages automatically, and runs only the checked-out `tools/simulation/ugame_sim.py`. If Python is unavailable it prints the GitHub Actions no-install route instead. Option 10 only copies the six specifically named biome PNG files from `%USERPROFILE%\Desktop` into ignored local `assets\textures\biomes`; it does not download, execute or scan arbitrary Desktop files. Local RUN performs the same texture check before starting the dev server.

The in-game DEV console accepts only four decimal digits. It does not execute shell
commands or updater commands. Active game commands are explicitly implemented by
the relevant game system and documented in `docs/DEV-CODES.md`.

An exclusive lock prevents simultaneous updater instances. Do not edit files or
use another Git client during sync; those programs do not honor this lock.

## Recovery

Before changing files, an immutable reference is saved under
`refs/ugame/backups/<timestamp>-<id>` and the log records old/target commits.
No reset, clean, force push or automatic destructive recovery is performed.

Option 7 checks out the latest backup with detached HEAD. Newer commits remain
on main. Keep the menu open and use 8 to return. If you close it while an older
updater is restored, run `git switch main` in the project directory and reopen
the launcher. Conflicting local edits block checkout. Partial checkout failures
require inspection. Backups protect committed files, not dependencies, ignored
files or external game data.

## Reports and logs

Option 3 creates a new file such as
`uGame_report_S003_R014_20260914_231455.37.txt` under a unique
`%TEMP%\uGame-<id>` folder. S is the launcher session (wraps after 999); R is the
report number in that session. Exclusive creation prevents overwrites. Notepad
opens without blocking the menu. Open reports are never renamed.

Reports include time, commit, branch, last operation and short file status, with
no file contents, environment dump, tokens, remote config or automatic upload.
Status filenames may be private: review before sharing. Reports remain temporary
until Windows/user temp cleanup. They are not deleted when Notepad exits, because
modern Notepad can reuse a process/tab. They are never saved in the repository.
Session counter and operational log are local `.git` metadata, never committed.

## Maintenance and provenance

Implementation: Update-uGame.ps1; launcher: Update-uGame.cmd. Run
`powershell.exe -NoProfile -File tests\Test-Updater.ps1` for isolated Git checks.
Direct commands: `powershell.exe -NoProfile -File .\Update-uGame.ps1 -Command status`
(also sync, report, run, github, rollback, resume, simulate, textures).

Reference: sunpole/uMontage release/v1.0.0 commit
7b785744a374745c8fce390cf21381debfc85454, tools/uMontage-Control.ps1,
docs/CONTROL_RUNNER.md and addon/uMontage/updater/Update-uMontage.ps1. Its main
branch contains the older VBA project. uGame uses the menu, explicit sync and
temporary-report concepts, without CorelDRAW installation or script orchestration.

See [verification](docs/UPDATER-VERIFICATION.md) for acceptance evidence.
