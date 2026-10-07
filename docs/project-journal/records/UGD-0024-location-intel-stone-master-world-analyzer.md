# UGD-0024 — Persistent Location Intel + Stone Master Runtime + DEV World Analyzer

Дата: 2026-10-07  
Тип: system / ui-ux / tooling  
Статус: accepted  
Flags: needs-test  
Теги: location-tier, chrome, worldspawn, npc, master, relationship, modules, rotation, tooling, world-analyzer

## Контекст

После ручной проверки v0.0.64 пользователь отдельно указал, что Location Tier, дистанция от города, шанс текущего Tier и bonus локации являются ключевой игровой информацией и не должны быть спрятаны только в DEV-кодах.

Одновременно пользователь подтвердил продолжение следующих уже принятых patch-блоков по 5–10 версий за один проход.

## Реализованная серия v0.0.65–v0.0.72

### v0.0.65 — Persistent Location Tier HUD

Header/Footer постоянно показывают:

- Location Tier;
- distance from safe city;
- probability именно текущего Location Tier в текущем distance band;
- location bonus;
- capacity/biome в Footer;
- полный T1–T4 probability profile доступен через tooltip.

### v0.0.66 — Stone Master Registry

Четыре persistent neutral identity T1–T4, multiplier и data-driven module metadata.

### v0.0.67 — Stone Master Allocator

- ~30m REAL TIME Encounter;
- candidate `P(masterTier | LocationTier)`;
- world caps T4=1 / T3=2 / T2=3 для Stone;
- fallback вместо пустого слота;
- independent rotation coverage;
- persistent spawn/allocation state.

### v0.0.68 — Visible Encounter

Stone Master занимает Event/NPC slot, отображается Tier-colored NPC и не конфликтует с generic Event Spot.

### v0.0.69 — Character↔Master Relationship

Persistent character-scoped history; unique Encounter count защищён от spam-click.

### v0.0.70 — 83xx QA

Registry/filter/rotation/teleport DEV controls активированы.

### v0.0.71 — DEV World Analyzer

Project Hub показывает live WorldSpawnState, active masters, Location context, candidate pools, rotation, Next/Previous и Teleport.

### v0.0.72 — Module Availability

Extraction гарантирован; T1 2–3 / T2 3–4 / T3 4–6 / T4 all. Набор persistent per Encounter.

## Инварианты

- Game Clock остаётся display-only.
- Location Tier и Master Encounter используют REAL TIME.
- Candidate probabilities не становятся финальным балансом только из-за live реализации.
- Backend не вводится.
- DEV World Analyzer читает runtime source of truth и не дублирует экономику.
- Module availability не выдаётся за функциональный Process/Quest/Training.

## Следующий шаг

После ручного QA v0.0.72 — функциональный Stone Extraction / Process, затем остальные master modules отдельными маленькими патчами.
