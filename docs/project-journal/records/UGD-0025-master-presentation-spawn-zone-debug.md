# UGD-0025 — Master presentation, live timer and Spawn Zone DEV

Дата: 2026-10-07  
Тип: ui-ux / npc-runtime / tooling  
Статус: accepted  
Flags: needs-test  
Теги: master, npc, timer, movement, roaming, event-spots, spawn-zone, dev-tooling, biome-texture

## Контекст

После первой ручной встречи со Stone Master принят пакет правок: единый live countdown в мире и InteractionPanel; biome defaults 40% scale + 40% opacity; DEV-окружности Event Spot с управляемым radius; временная top-down NPC-модель; очень медленный facing и wandering около spawn center.

## Реализовано v0.0.73–v0.0.79

- **v0.0.73** — InteractionPanel countdown читает тот же REAL TIME `Encounter.expiresAt`, что и world label; stale panel закрывается после expiry.
- **v0.0.74** — все шесть current biome/city defaults = 40% scale + 40% opacity; explicit local overrides сохраняются.
- **v0.0.75** — `SpawnZoneDebugSystem`: thin circle + optional center marker вокруг Event Spot.
- **v0.0.76** — Project Hub → Tools → Spawn Zone Debug: ON/OFF, center markers, radius 10–500 px, Reset. Default OFF / center ON / 150 px.
- **v0.0.77** — круглый Master marker заменён lightweight top-down humanoid shell.
- **v0.0.78** — very slow idle facing без snap-поворотов.
- **v0.0.79** — slow wandering ~5 px/s в пределах текущего radius; collision check перед шагом; translation pause при открытом InteractionPanel, но Encounter timer продолжает REAL TIME.

## Инварианты

- Game Clock остаётся display-only.
- Wandering position/facing пока ephemeral и не сохраняются.
- Persistent Encounter остаётся привязан к `zoneId + spotId`.
- Spawn Zone radius влияет на roaming boundary, но не меняет Location Tier probability, spawn capacity, master caps или rotation.
- Final NPC art, полноценная animation system и pathfinding ещё не реализованы.

## Исправление старой нестыковки

Актуальное правило T4: candidate first → cap second. Если T4 candidate отсутствует, T4 master сейчас может отсутствовать. `T4=1` — максимум, а не targetCount.

## Следующий шаг

Ручной browser QA v0.0.80, затем функциональная Stone Extraction / Process.

## v0.0.81 — legacy external Resource Event retired

Во внешних Location Tier-зонах generic `resource` больше не является параллельным источником ресурсного взаимодействия. Existing saved external resource-events удаляются при refresh; новые generic slots используют только non-resource world events. Wandering Master остаётся входной точкой resourceDirection.
