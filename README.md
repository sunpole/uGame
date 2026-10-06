# uGame

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

## Game prototype v0.0.39 — Project Hub + Simulation Lab v0.2 + gameplay prototype

uGame keeps the First Playable slice and changing-world/container layers, and now adds an in-game Project Hub for project navigation and documentation.
The current prototype includes:

- four connected top-down zones loaded from `data/world.json` through WorldGraph;
- five possible Dynamic Event Spots in every current zone;
- zone quality Q1–Q4 with 1 / 2 / 3 / 5 active dynamic-event slots;
- independent real-time zone-quality timers and 30-minute event timers;
- random Resource, Chest and placeholder Event Portal encounters;
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

The original First Playable quest remains available: speak with the Guide, explore the connected
zones, find the blue, amber and violet fragments, then activate the extinguished core.
On top of that static loop, v0.0.32 tests whether changing Event Spots make revisiting zones
more interesting. v0.0.35 adds the first inventory/storage gameplay layer: physical rewards now
need portable container capacity, while Attention remains intangible/account storage. v0.0.36 adds
the Project Hub so project documentation, Journal records and project/tool links can be reached
without leaving or reloading the current game session. v0.0.37 adds the first working Simulation
Lab developer tool: it can model synthetic worlds at 8/30/50/100 zones, enforce candidate master
caps, produce analysis reports and run either from GitHub Actions or locally through updater option
9 when Python is already available. These simulation probability tables are candidates only and do
not alter the current gameplay rules. Event Portal
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
Dynamic Event QA: `8201` recreates current-zone events, `8202` rerolls current-zone quality,
`8211` / `8212` / `8213` / `8214` force Q1 / Q2 / Q3 / Q4 for fast slot-count testing,
and `8299` shows Dynamic Event status.

After a DEV command, focus is released from the DEV field so keyboard movement works
immediately again. For remote-desktop testing, the footer duplicates movement, Action and Dash
as clickable buttons; mouse Dash is a short pulse so it can be clicked just before a direction.

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
Simulation option 9 also requires explicit `SIMULATE`, never installs Python/pip packages automatically, and runs only the checked-out `tools/simulation/ugame_sim.py`. If Python is unavailable it prints the GitHub Actions no-install route instead.

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
(also sync, report, run, github, rollback, resume, simulate).

Reference: sunpole/uMontage release/v1.0.0 commit
7b785744a374745c8fce390cf21381debfc85454, tools/uMontage-Control.ps1,
docs/CONTROL_RUNNER.md and addon/uMontage/updater/Update-uMontage.ps1. Its main
branch contains the older VBA project. uGame uses the menu, explicit sync and
temporary-report concepts, without CorelDRAW installation or script orchestration.

See [verification](docs/UPDATER-VERIFICATION.md) for acceptance evidence.
