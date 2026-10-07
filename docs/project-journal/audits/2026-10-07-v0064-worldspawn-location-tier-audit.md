# Audit — v0.0.59–v0.0.64 WorldSpawnState / Location Tier

Дата: 2026-10-07

## Реализованная серия

- v0.0.59 — approved biome texture default = 40%;
- v0.0.60 — persistent local WorldSpawnState shell;
- v0.0.61 — safe-city graph distance + Stone eligibility;
- v0.0.62 — persistent Location Tier T1–T4 with real-time lifetime;
- v0.0.63 — external spawn capacity 2–6 + sixth Event Spots;
- v0.0.64 — DEV Location Tier QA and legacy external Quality guardrails.

## Version consistency

Confirmed:

```text
version.json = 0.0.64
package.json = 0.0.64
HTML title = v0.0.64
CSS cache query = 0.0.64
JS cache query = 0.0.64
footer fallback = v0.0.64
VERSION.md Current version = 0.0.64
```

## Static checks

JavaScript syntax smoke passed for:

- main.js
- game-state.js
- world-graph.js
- world-spawn-state-system.js
- event-spot-system.js

JSON parse passed for:

- data/world.json
- data/world-spawn-config.json
- version.json
- package.json

## Invariants

- Game Clock remains display-only.
- Location Tier lifetime uses real Date.now time.
- Event encounter lifetime remains real-time and independent of Tier-state.
- No backend introduced.
- Reload keeps unexpired WorldSpawnState.
- Candidate distance weights are not documented as final balance.
- No new TEST/MATRIX/DEEP run was started.

## Manual QA required

1. Update/run v0.0.64.
2. Enter external zone and use 8499.
3. Force T1/T2/T3/T4 with 8401–8404 and verify footer LT/status.
4. Verify external active events respect selected capacity and can reach 6.
5. Reload/F5 and confirm forced Tier remains until its real-time expiry.
6. Verify 8202/8211–8214 no longer create a second external quality state.
7. Verify city still works with its current legacy event-quality prototype.
