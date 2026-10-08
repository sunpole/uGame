# uGame — GitHub Releases and safe rollback

Checkpoint date: 2026-10-08.

## Immutable code checkpoints (not game saves)

- v0.2.19 — pre-batch baseline (commit 0cd461958c978ee998ed3240fb9a9b2d31b89b56).
- v0.2.25 — batch QA candidate covering v0.2.20–v0.2.25.
- Releases and tags: https://github.com/sunpole/uGame/releases
- Code compare: https://github.com/sunpole/uGame/compare/v0.2.19...v0.2.25

GitHub Release records a repository tree and history; **it does not export, back up or roll back local browser saves**, including claimed Encounter IDs and inventory.

## Easy rollback on your PC

1. Before Update, stop the local game server normally.
2. Update-uGame.cmd → 1 creates an internal Git backup ref of the previous HEAD before a successful fast-forward.
3. If a new batch fails: close game/server, restart updater → 7 Rollback files → type ROLLBACK.
4. Check version in browser; the rollback is a detached checkout, while main stays at the newer commit.
5. Updater → 8 Return to main to leave rollback mode. Restart updater after switching.
6. Do not clear the browser storage, delete .git, or use git reset --hard to recover game code.

If the updater's last backup isn't the needed release, GitHub Release source archive is a read-only recovery reference and the tag identifies the exact historical code revision. Restoring a specific tag into a working checkout needs a deliberate advanced/manual Git step; the updater currently does not choose arbitrary GitHub releases.

## Release publication

The final series commit adds .github/workflows/publish-qa-release.yml. On push to main, that workflow first runs the Node Master loop tests, then creates v0.2.19 and v0.2.25 tagged GitHub prereleases idempotently. If Actions or the token cannot write releases, the version/commit remain on main and the releases must be published manually. Verify both release pages before reporting that publishing succeeded.

A release is a QA snapshot, not a guarantee of a completed manual browser smoke test.


## New rollback checkpoint v0.2.33 (2026-10-08)

- Before-series release: [v0.2.25](https://github.com/sunpole/uGame/releases/tag/v0.2.25), commit `b5e91400c958eadf70f835036fc54e4e14cd7462`.
- After-series release: [v0.2.33](https://github.com/sunpole/uGame/releases/tag/v0.2.33) (QA prerelease, pending browser confirmation).
- The new release workflow tests the Master and city/crafting Node suites before creating its tag/release.
- The updater's option 7 rolls back to **its own immediately preceding local update ref**, not necessarily to arbitrary old release tags. The remote GitHub release itself cannot restore local browser saves.
- Avoid deleting storage or forcing Git resets to address a visual sprite issue.
