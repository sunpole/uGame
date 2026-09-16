# UGD-0004 — Мир, локации, порталы и меняющиеся активности

- Date: 2026-09-16
- Status: hypothesis
- Flags: needs-prototype, return-later
- Tags: world, locations, portals, procedural-generation, npc, quests, gameplay

## Source / context

The project discussion describes a world with stable geography plus changing routes, portals and activity points. Inspirations mentioned during brainstorming include systems where maps or destinations persist but connections rotate over time.

## Idea

The world may combine:

- a starting location;
- persistent locations such as towns/safe hubs where saving and services are available;
- temporary or instanced locations where saving may be restricted;
- known potential spawn points for activities;
- only a subset of those points active at any given time;
- randomly selected activity/object types at active points;
- portals whose destinations or route graph may change over time;
- activities launched directly from NPCs in towns as an alternative to finding them in the open world.

Potential activities include dungeons, special portals, chests, events, solo/group content, chase/escape/hide/labyrinth/trap sequences and other interaction-focused encounters.

## Why it matters

The goal is to make exploration partly predictable and partly variable: players can learn the world, but routes and opportunities still change.

## Benefits

- Reuses authored locations while changing traversal and opportunity patterns.
- Creates discovery without requiring fully procedural geography.
- Supports both quick targeted sessions and longer exploration.
- Allows later control over rarity and availability through data tables.

## Risks / contradictions

- Too much randomness can make planning frustrating.
- Too little randomness can make the world feel solved.
- Rotating routes can create FOMO if important content disappears too quickly.
- Saving restrictions in temporary areas need clear rules to avoid punishing disconnects.
- Group/solo activity generation may complicate matchmaking later.

## Alternatives

- Fully static world and routes.
- Fully procedural maps.
- Static world with only activity spawns rotating.
- Static activity points but portal destinations rotating.
- Town NPCs launching most instanced content directly.

## Current direction

Prefer a hybrid: stable geography and authored locations, with data-driven dynamic connections and activity contents layered on top. Exact probabilities, timers and content types remain open.

## What to test later

- Number of potential vs simultaneously active points.
- Rotation frequency.
- Whether portal destinations rotate independently from portal spawn points.
- How much route information the player can know in advance.
- Persistence/saving rules for temporary locations.

## Relations

- related: UGD-0003, UGD-0006

## Change history

### 2026-09-16
Created from planning notes about permanent cities, temporary locations, rotating routes and data-driven activity spawn points.
