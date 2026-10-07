# UGD-0023 — Responsive Workspace + Biome Ground Texture / Visual Lab

Дата: 2026-10-07  
Тип: ui-ux / world-visual / tooling  
Статус: accepted  
Flags: needs-test  
Теги: viewport, responsive, camera, inventory, bank, biome, city, texture, ground, admin, tooling

## Решение

Серия реализована как пять мини-патчей `v0.0.54 → v0.0.58`.

### v0.0.54 — Inventory / Bank Normal Size

- Inventory/Bank на desktop не уменьшаются общим scale-first механизмом.
- Backpack и Bank используют одинаковый размер ячеек.
- При нехватке места предпочтителен внутренний scroll, а не уменьшение ячеек.

### v0.0.55 — Full Workspace Game Viewport

DOM-контейнер игры занимает всю центральную область между persistent Header и Footer. Старое вписывание `16:9` с боковыми пустотами удалено.

### v0.0.56 — Responsive World Camera

Графика не растягивается под широкий монитор.

Принцип:

```text
height → единый camera zoom
extra screen width → дополнительные world units
```

Поэтому широкий экран показывает больше мира по горизонтали, а персонаж, NPC, стены и Vision сохраняют пропорции.

Legacy layout 960×540 остаётся базовым ядром и центрируется внутри расширенного world width. Внешние boundaries/portals следуют реальным краям viewport.

### v0.0.57 — Biome Ground Texture System

Runtime GroundTextureSystem выбирает floor по:

```text
biome + isCity
```

Текущие слоты:

- grass;
- sand;
- snow;
- city-grass;
- city-sand;
- city-snow.

Для каждого слота отдельно:

- `enabled`;
- `textureName`;
- `textureFile`;
- `scalePercent: 1..10000`;
- `opacityPercent: 0..100`.

Исходная картинка 1024×1024 не растягивается на viewport: она повторяется TileSprite в world space.

### v0.0.58 — Biome Visual Lab · DEV

Project Hub получает временный администраторский редактор:

- выбор одного из шести biome/city slots;
- изменение display name;
- выбор texture file из текущего набора;
- ручной scale 1–10 000% плюс шаговые кнопки;
- opacity 0–100% плюс шаговые кнопки;
- enabled;
- Reset / Apply;
- живой 16:9 tiled preview;
- localStorage overrides и live update активного floor.

Admin UI архитектурно отделён от GroundTextureSystem. Позже его можно скрыть из пользовательского меню без удаления runtime floor.

## Локальные PNG в прототипе

На текущем этапе шесть точных PNG пользователя являются локальными development assets.

`Update-uGame.ps1` option 10 и local RUN проверяют строго шесть имён на `%USERPROFILE%\Desktop` и копируют их в `assets/textures/biomes/`.

PNG в этой папке Git-ignored, чтобы локальные бинарные assets не блокировали безопасный fast-forward updater. Код/config/документация хранятся в GitHub. До публичного релиза approved texture binaries нужно отдельно перевести в tracked/deployed assets.

При отсутствии PNG runtime не падает: остаётся базовый тёмный floor.

## Временной инвариант

Эта серия не меняет систему времени. Game Clock остаётся display-only; Event/Location/NPC/Process/cooldown/session/location timers продолжают использовать REAL TIME.
