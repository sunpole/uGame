# uGame

Windows entry point: **Update-uGame.cmd**. Uses its own checkout directory,
including `D:\ANTON\code\uGame`, regardless of the terminal's current folder.
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

The game is not implemented yet. Option 4 explains missing package.json/dev
instead of installing or generating anything.

## First update

Run the existing `D:\ANTON\code\uGame\Update-uGame.cmd` **from that directory**
once, then start it again for the menu. The old launcher depends on the current
terminal directory; the new launcher fixes that. If local changes block the old
updater, preserve them and ask for recovery help. Do not force reset or delete work.

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
