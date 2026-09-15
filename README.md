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
| 0 | Exit |

## Game prototype v0.0.20

uGame now has a modular foundation instead of putting gameplay into `main.js`.
The current playable prototype includes:

- two top-down zones with walls and real portal transitions;
- modular Vision, Class, Zone, Player, Interactable, Event and Zone Rules systems;
- a temporary layered top-down character with movement/facing animation;
- WASD/arrow movement, Shift dash and stamina;
- NPC, resource, chest and portal variants built on one Interactable system;
- temporary procedural sounds routed through one Audio system;
- resource counters and a small stack-based inventory;
- JSON-driven dialogue and quest data with one test quest;
- mobile touch controls for movement, action and dash;
- the four-digit DEV console and live physical-arrow indicator.

The first quest is intentionally small: talk to the Guide, collect a shard and open
the old chest. Its purpose is to prove that dialogue, interactables, resources,
inventory and events can cooperate without being hard-coded into one system.

Zone 2 also demonstrates zone-specific rules: slower movement and a Vision darkness
override. The selected class profile remains underneath the zone override.

`docs/CHARACTER-ASSET-GUIDE.md` describes the first authored character spritesheet/layer
workflow. `docs/PREBY-DEPLOY.md` describes the intended static deployment to a dedicated
`pre.by` development hostname. Hosting is prepared/documented but is not deployed by
this repository itself yet.

`version.json` is the machine-readable project version. `package.json` mirrors the
same version for tooling. `VERSION.md` is the human-readable version history.

Option 4 runs the prototype through the local Node dev server. No npm package
installation is required. Phaser is loaded by the browser from its CDN, so the
prototype needs an internet connection while running.

## DEV console

Code `9999` opens `docs/DEV-CODES.md`. Active groups currently include Vision `1xxx`,
Movement `3xxx`, Items/Inventory `5xxx`, World/Resources `6xxx`, Classes `7xxx` and
Events/Quests `8xxx`. `2xxx` Player and `4xxx` Combat remain reserved.

After a DEV command, focus is released from the DEV field so keyboard movement works
immediately again.

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
(also sync, report, run, github, rollback, resume).

Reference: sunpole/uMontage release/v1.0.0 commit
7b785744a374745c8fce390cf21381debfc85454, tools/uMontage-Control.ps1,
docs/CONTROL_RUNNER.md and addon/uMontage/updater/Update-uMontage.ps1. Its main
branch contains the older VBA project. uGame uses the menu, explicit sync and
temporary-report concepts, without CorelDRAW installation or script orchestration.

See [verification](docs/UPDATER-VERIFICATION.md) for acceptance evidence.
