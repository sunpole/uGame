# uGame v0.2.25 — Master loop smoke QA

Date: 2026-10-08. Scope: gameplay and updater candidate; browser QA still pending.

## Before test

- Update via Update-uGame.cmd → 1. Restart the updater and use 11 to launch.
- PRE-FLIGHT should show version v0.2.25 and green checks.
- Do not clear browser localStorage, reset saves, or reroll world states.
- Gameplay timers are REAL TIME, not the ×12 informational game clock.
- Extraction profiles currently use 60 seconds, shortened if the Master Encounter is close to expiry.

## Minimal manual test (once, not ten repeated claims)

1. Pick an active Master showing a red dot, open «Добыча».
2. Start Extraction; the dialog explains REAL TIME and counts down.
3. Keep the dialog open until the countdown ends. The same window should switch to «Забрать (этой встречи)», without interacting with the NPC again.
4. Click the claim action once. Check the resource in inventory and the red marker disappears.
5. Reopen the Master: «Добыча · получено» must be disabled.
6. If the Master has a separate «Забрать прежнюю добычу», confirm it never removes a *new* Encounter's red marker. Old loot remains claimable after a reload.
7. Use DEV 8388 only when needed. It must identify the last interacted Encounter; report its selection mode.
8. Close and reload while a Process is running, and confirm elapsed time/ready reward uses the real clock and isn't rerolled.

## Accept/reject

- Accept only if PRE-FLIGHT, tests and steps 1–5 work in the actual browser.
- If anything fails, provide the PRE-FLIGHT output and one screenshot of the broken state; do not repeat collection many times.
- Automation and headless tests do not confirm live Phaser rendering, browser storage, or actual Windows PowerShell updater.

## Status and known limits

- Automated Node suite: GitHub Actions v0.2.24 passed; run again at v0.2.25 before publishing releases.
- New Master UI auto-transition is **not yet browser-confirmed**.
- v0.2.19 is the prior user-tested updater checkpoint; v0.2.25 is a new QA candidate.
