# uGame — Simulation Lab

Status: **prototype implemented in v0.0.37; candidate balance only, not live gameplay.**

Project Journal decision: `docs/project-journal/records/UGD-0017-simulation-lab.md`.

### Important: candidate data

The percentages in `data/simulation/simulation-defaults.json` are **candidate tables for measurement**. They do not replace the current gameplay `data/reward-rules.json` or current Dynamic Event behavior until a later explicit balance decision.

## Purpose

Simulation Lab is a headless balancing and verification tool for world generation. It exists to answer questions that are hard to reason about from nominal percentages alone:

- how often Location T4 actually exists;
- how distance from a peaceful city changes real outcomes;
- how often T2/T3/T4 master candidates are blocked by world caps;
- whether rotation is fair across eligible zones;
- how rarity changes when the world grows from 8 to 30/50/100+ outside zones;
- how reward/XP multipliers behave after Location + additive bonuses + master multiplier;
- whether a seemingly reasonable probability table creates unreachable or overpowered outcomes.

## Core principle

The simulation engine is **headless**. It does not use Phaser, Canvas, browser rendering, animation, or realtime timers.

```text
simulation phase
  pure calculation
  ↓
aggregate metrics
  ↓
report phase
  JSON / CSV / HTML / SVG
```

No charts are generated inside the hot simulation loop.

## Current MVP structure

```text
data/
  simulation/
    simulation-defaults.json
    location-tier-rules.json
    biome-resource-rules.json
    master-spawn-rules.json
    report-thresholds.json

tools/
  simulation/
    ugame_sim.py
    engine.py
    world_model.py
    allocator.py
    metrics.py
    reports.py
    compare.py
    validate_config.py
    presets/
      world-8.json
      world-30.json
      world-50.json
      world-100.json

tests/
  simulation/
    fixtures/
    test_determinism.py
    test_allocator_caps.py
    test_reward_formula.py
    test_config_validation.py

.github/workflows/
  simulation-lab.yml

simulation-reports/        # generated locally; must be gitignored
```

The first MVP intentionally keeps the engine/report code compact and auditable. Split it into more modules only when growth makes that useful.

## Source of truth

Balance values should not be duplicated between Python and the game.

Preferred evolution:

```text
shared JSON config
   ├── Python Simulation Lab
   └── JavaScript uGame runtime
```

If a rule cannot yet be safely shared with runtime, the simulator config must clearly mark it as `simulationCandidate` rather than pretending it is live gameplay.

## World presets

Two kinds of input are planned. **v0.0.37 currently implements synthetic worlds; direct ingestion of the live `data/world.json` remains a later extension.**

### Real-world preset — not implemented yet

Future mode: read current `data/world.json` plus simulation metadata to verify the actual playable world.

### Synthetic presets

Used for scalability:

- 8 outside zones;
- 30 outside zones;
- 50 outside zones;
- 100 outside zones;
- optional custom N.

Synthetic worlds should preserve the same model: peaceful hubs, graph distance bands, biomes, resource eligibility and Event/NPC spawn capacity.

## CLI design

Planned command examples:

```text
python tools/simulation/ugame_sim.py validate
python tools/simulation/ugame_sim.py trace --cycles 20 --world-size 8 --seed 42
python tools/simulation/ugame_sim.py run --mode TEST --cycles 100000 --world-size 8 --seed 42
python tools/simulation/ugame_sim.py run --mode DEEP --cycles 1000000 --world-size 100 --seed 42
python tools/simulation/ugame_sim.py compare <runA> <runB>
python tools/simulation/ugame_sim.py matrix --cycles 100000 --world-sizes 8,30,50,100 --seed 42
```

The CLI must validate all inputs before running and print the exact config/seed/runId.

## Presets

Human-friendly presets:

```text
TRACE
cycles: 20
trace: full
charts: yes after run

TEST
cycles: 100000
trace: off
charts: yes after run

DEEP
cycles: 1000000
trace: off
charts: yes after run
```

Custom cycle count remains possible.

## Deterministic random

The simulator must create one explicitly seeded RNG owned by the simulation context. No module should silently create its own unseeded random source.

Every result manifest stores:

- seed;
- simulator version;
- Git SHA;
- config hash;
- world preset hash;
- cycle count.

Deterministic regression fixture:

```text
same inputs
→ same tier sequence / allocator decisions for fixture
→ same summary.json
```

## Simulation model

One `world cycle` is a logical simulation step, not a rendered frame.

The engine may use event-driven time jumps rather than iterating every second/minute. For example:

```text
next timestamp = minimum of:
  zone tier expiry
  NPC/Event expiry
  scheduled reroll
```

This is preferred for large DEEP runs because it avoids wasting CPU simulating empty time.

## WorldSpawn allocator

The allocator consumes an already-valid set of candidate spawn positions.

For each resourceDirection:

1. collect eligible locations/spots;
2. apply biome/resource rules;
3. score candidates using Location Tier and future distance/rotation weights;
4. enforce `max one T2+ per location per resourceDirection`;
5. enforce world caps for T2/T3/T4;
6. use rotation history to avoid repeatedly favoring the same zone;
7. assign high tiers;
8. fill remaining resource spawn with T1 or other allowed event;
9. persist decisions to simulated `WorldSpawnState`.

The simulator must separately count:

- desired high-tier rolls;
- accepted assignments;
- blocked by world cap;
- blocked by per-location/resource cap;
- downgraded/fallback assignments.

## Location Tier

Accepted model:

| Tier | Simultaneous active spawn | Tier-state lifetime | Location bonus |
| --- | ---: | ---: | ---: |
| T1 | 2–4 | 2–3 h | +0% |
| T2 | 2–5 | 1.5–2.5 h | +20% |
| T3 | 3–6 | 1–2 h | +40% |
| T4 | 5–6 | 1–1.5 h | +60% |

Zone identity remains permanent. Only Tier-state rerolls.

## Distance model

Do not hardcode one final mathematical formula before measurements.

First implementation should support data-driven distance bands:

```text
distanceBand 0  peaceful city / no outside tier roll
distanceBand 1  nearest outside ring
distanceBand 2
distanceBand 3
...
distanceBand N  farthest ring
```

Each band has a probability row summing to 100%. The simulator should then search/compare candidate tables.

Later the table may be replaced by a formula if a formula proves easier to control.

## NPC tier conditional matrix

Likewise, use a data table:

```text
P(masterTier | locationTier)
```

Every row must sum to 100 before world caps. Reports must show both:

- nominal probability before caps;
- realized probability after caps/rotation.

This difference is one of the main reasons the simulator exists.

## World caps

Initial accepted limits per `resourceDirection`:

```text
T4 = 1 world-wide
T3 = 2 world-wide
T2 = 3 world-wide
T1 = remaining
```

These are prototype caps, not guaranteed final MMORPG limits.

Simulation matrix should test the same fixed caps at world sizes 8/30/50/100 to reveal where scaling breaks.

## Reward/XP model

Accepted ordering:

```text
preMaster = base × (1 + locationBonus + otherAdditiveBonuses)
final = preMaster × masterMultiplier
```

Master multiplier:

```text
T1 = ×1.00
T2 = ×1.20
T3 = ×1.40
T4 = ×1.60
```

It applies only to reward/XP generated through that master.

Simulator reports must distinguish:

- base;
- additive factor;
- master factor;
- final factor.

## Metrics schema

Recommended `summary.json` top-level groups:

```text
run
performance
world
locationTiers
distanceBands
resources
masters
caps
rotation
rewards
xp
warnings
```

## Performance metrics

Every run records:

- wall-clock duration;
- cycles/sec;
- simulated hours/sec;
- peak counters/estimated state size if easy to obtain;
- report-generation duration separately.

This prevents chart/report code from hiding simulator performance regressions.

## Report visuals

First-version required charts:

1. Location Tier distribution by distance band — 100% stacked bars.
2. Realized master Tier by Location Tier — 100% stacked bars.
3. T4/T3 waiting-time distribution — histogram/CDF style.
4. Blocked high-tier rate by reason.
5. Reward/XP multiplier distribution.
6. High-tier allocation by zone — fairness/ranking.
7. World-size sensitivity 8/30/50/100.
8. Nominal vs realized probability delta.

Charts should be generated after simulation from summary/table data.

## HTML report layout

Self-contained `report.html`:

```text
HEADER
run id / git SHA / seed / cycles / preset / config hash

VERDICT
OK / REVIEW / BAD

KPI STRIP
T4 zone share
T4 master uptime
p95 T4 wait
cap block rate
mean reward multiplier
cycles/sec

WARNINGS
ordered by severity

TRENDS
charts

TABLES
full distributions

DIAGNOSTICS
allocator/cap/rotation details

REPRODUCE
exact command / workflow parameters
```

## Verdict rules

`OK / REVIEW / BAD` must not be subjective prose only.

Initial design:

```text
OK      no error-level threshold violated
REVIEW  one or more warning thresholds violated
BAD     invariant broken / impossible tier / severe fairness or probability failure
```

Thresholds belong in `report-thresholds.json`.

## Comparison reports

Comparison must not simply put two HTML files side by side.

Required comparison fields:

| Metric | Baseline | Candidate | Delta | Delta % | Evaluation |
| --- | ---: | ---: | ---: | ---: | --- |

Comparison metadata must state:

- same/different commit;
- same/different config hash;
- same/different seed;
- same/different world size;
- same/different cycle count.

For stochastic comparisons, large-run metrics are primary. Same-seed comparisons are especially useful when changing one algorithm because noise is reduced.

## Trend history

Local/GitHub artifacts can later be indexed by a small `runs-index.json` generated outside source control.

A trend report may compare selected runs chronologically:

```text
SIM-A → SIM-B → SIM-C
```

and graph:

- p95 T4 wait;
- cap block rate;
- realized T4 share;
- reward multiplier;
- fairness score.

Do not automatically declare 'newer is better'; each metric has its own desired direction/range.

## Report storage

### GitHub Actions

Each workflow run uploads one artifact folder/ZIP. Nothing is committed automatically.

### Local

`simulation-reports/` is intended as generated local output and must be ignored by Git.

Suggested local path:

```text
<repo>/simulation-reports/<runId>/
```

This gives easy access while preserving updater clean-state checks.

## Web launch — implemented and recommended

GitHub Actions manual workflow is the canonical no-install web launcher for the first implementation.

Current manual workflow inputs:

- mode: TRACE / TEST / DEEP / MATRIX;
- cycles (`0` uses the selected mode default);
- seed;
- world size: 8 / 30 / 50 / 100 for single-world runs.

A/B comparison exists in the CLI/report layer; selecting an arbitrary previous GitHub artifact as baseline is not yet wired into the workflow UI.

Workflow steps:

```text
checkout exact commit
setup Python
validate configs
run simulator
build report
run invariant tests
upload artifact
```

The workflow should fail only on technical/invariant errors, not because a balance warning is merely interesting. Balance warnings belong in report verdict.

## Browser-only Python

Pyodide/PyScript remains technically possible, but is not the preferred heavy-run path.

Reasons:

- Python runtime must be downloaded into browser;
- long 1M simulations compete with browser responsiveness;
- artifact/history/comparison workflow is weaker;
- GitHub Actions already provides a clean Python environment without local installation.

A browser mini-simulator can be added later for quick interactive experiments, but it should consume the same configs and not become a separate source of truth.

## Local updater integration — implemented

Existing updater safety properties must remain unchanged.

Updater menu:

```text
9. Simulation Lab
```

Current flow:

```text
choose preset
↓
show cycles / seed / estimated mode
↓
type SIMULATE
↓
run repository-owned Python script
↓
write only to ignored simulation-reports/
↓
open report.html
```

Updater must:

- never install Python automatically;
- never pip-install unknown dependencies automatically;
- never execute downloaded remote commands;
- print exact Python executable/version;
- keep generated reports out of tracked Git state;
- stop with a clear message if Python is unavailable;
- offer the GitHub Actions route as the no-install alternative.

## Dependencies

Target MVP: Python standard library only.

Why:

- GitHub Actions/simple local run;
- no pandas/numpy/matplotlib dependency management;
- deterministic and easy to audit;
- CSV/JSON via standard library;
- SVG can be emitted as text;
- HTML can embed SVG and tables directly.

If profiling later shows Python itself is too slow, optimize the hot engine first. Optional NumPy should be introduced only with measured benefit, not preemptively.

## Testing

Required before trusting reports:

- probability rows sum to 100;
- impossible negative/NaN values rejected;
- same seed gives same result;
- world caps never exceeded;
- per-location/resource T2+ cap never exceeded;
- T4 master identity count respects cap;
- completed/pending reward accounting conserves totals;
- reward formula fixtures;
- synthetic edge worlds: 0 resource spots, 1 zone, all T4 candidates, caps=0, extreme distance.

## Safety against false confidence

A million cycles do not prove game balance. They only show behavior of the supplied model.

Every report should display:

`Simulation result, not player telemetry.`

Later real gameplay telemetry can be compared against simulator predictions, but should never be silently mixed.

## Implementation phases

### S1 — Engine skeleton

Config validation, deterministic RNG, synthetic world, counters.

### S2 — Location Tier + distance

Distance bands and location state timers.

### S3 — Resource/master allocator

Biome eligibility, world caps, local caps, rotation.

### S4 — Reward/XP model

Additive bonuses + final master multiplier.

### S5 — Reports

JSON/CSV/HTML/SVG + warnings.

### S6 — Compare

A/B comparison and config diff.

### S7 — Web run

GitHub Actions workflow + artifact.

### S8 — Local updater

Safe menu integration.

### S9 — DEV World Analyzer

Text/diagram analyzer inside the actual game using live WorldSpawnState.

## Acceptance criteria for MVP

Simulation Lab MVP is accepted when:

1. TEST 100k and DEEP 1M complete without graphical runtime;
2. same seed/config reproduces summary;
3. reports include manifest, JSON, CSV, HTML and required charts;
4. 8/30/50/100 world-size matrix can be produced;
5. cap violations are impossible and tested;
6. comparison report shows meaningful A/B deltas;
7. GitHub Actions run works without local Python;
8. generated reports do not dirty the repository;
9. runtime gameplay remains unchanged.
