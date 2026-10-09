# WorldGraph — расширение v0.2.52

Мир теперь состоит из **15×15 = 225 стабильных локаций**. Изначальные 25 (5×5) сохранены как внутреннее ядро, вокруг добавлено 5 внешних колец, или 200 новых полей. Пять мирных городов остаются прежними. Всего 840 направленных переходов, 220 полей с 12 кандидатными точками Event/NPC в каждой. **Кандидатные точки не равны числу одновременно активных NPC.**

Кратчайший путь до ближайшего города теперь охватывает D1–D10. `WorldGraph` один раз строит индекс соседей и кэш ближайших городов многoисточниковым BFS. Только существовавшие NW/NE/SW/SE ворота являются переходами; вся старая система ориентации и вход с противоположной стороны сохранены.

Новые имена и распределение биомов временные, до обсуждения ЛОРа и баланса. Master caps и вероятность T4=1,5% при LT T1 не изменены. Подробности: [v0.2.52](releases/v0.2.52.md).

---

# WorldGraph (историческая архитектура v0.1.27)

## Исходный граф до расширения v0.2.52

- 25 stable location ids in the original core (now preserved within 225).
- 5 safe cities.
- 20 original field locations (now 220).
- 80 original directed transitions (now 840).
- original logical 5×5 adjacency (now 15×15).
- local diamond presentation.

## Transition rule

A local zone has at most four real transition sides: `NW / NE / SW / SE`.
`N / E / S / W` are orientation-only and never create portals.

Opposite-entry invariant:

- NW → SE
- NE → SW
- SW → NE
- SE → NW

Rotated logical-grid mapping:

- col + 1 → SE
- col - 1 → NW
- row + 1 → SW
- row - 1 → NE

## Legacy entry aliases

For save migration only:

- left → NW
- right → SE
- top → NE
- bottom → SW

These aliases do not create extra exits.

## ZoneSystem runtime

ZoneSystem masks the four non-playable canvas corners, draws the diamond border, shows N/E/S/W orientation markers, creates only diagonal portals, places the player at the resolved diagonal entry, then loads walls and interactables.

Movement also checks the diamond boundary, so the player cannot walk into the masked corners.

## QA invariants

- transition sides are only NW/NE/SW/SE.
- target entry is always the opposite diagonal.
- max four exits per location.
- field Event Spots stay inside the diamond.
- city Event Spot count stays zero.

## Local square-diamond dimensions

Current local world canvas: `1920×1920`. The diamond vertices use equal X/Y radius from center, producing a square rotated 45° rather than a flattened rhombus.

Field spatial QA additionally requires Event Spots ≥250 px from diagonal entries and rotated walls ≥100 px from entries/spots.
