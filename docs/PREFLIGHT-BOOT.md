# uGame Pre-flight Boot Gate

Current implementation: **v0.1.27**

## Goal

Gameplay is hidden until the build passes a browser-side pre-flight.

The loading screen runs before `main.js` starts the game and reports every check as green/red.

## Checks

1. Build manifest is readable.
2. Every runtime file listed in the manifest is reachable.
3. Every runtime JSON file parses successfully.
4. `version.json`, `package.json` and pre-flight manifest use the same version.
5. All runtime `src/*.js` modules are reachable.
6. Static named import/export links resolve.
7. Best-effort syntax parse succeeds for every JS module.
8. WorldGraph invariants pass: 25 unique zones, 5 cities, 20 fields, 80 directed diagonal transitions.
9. Local world is square before 45° rotation.
10. Every field has 12 candidate Event Spots; cities have 0.
11. Event Spots stay at least 250 px from diagonal entries.
12. Field walls are ±45° and keep at least 100 px clearance from entries and Event Spots.
13. Stone / Water / Forest Master T1–T4 and extraction profiles exist.
14. Biome texture config and enabled texture assets are reachable.
15. Phaser runtime exists.
16. Game module imports successfully.
17. Game world reaches `ready` within the boot timeout.

If a critical test is red, gameplay remains blocked and the error stays visible on the loading screen.

## Scope limits

This is a runtime/pre-flight integrity gate, not a replacement for full automated gameplay testing.

It can validate files, JSON structure, module links, syntax, world invariants and boot readiness. It does not prove that every gameplay interaction is semantically correct; those remain manual/browser QA until dedicated automated gameplay tests are added.
