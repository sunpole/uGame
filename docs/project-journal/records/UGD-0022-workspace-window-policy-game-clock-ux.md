# UGD-0022 — Workspace Window Policy + Game Clock UX

Дата: 2026-10-07  
Тип: ui-ux / runtime  
Статус: accepted  
Flags: needs-test  
Теги: ui, windows, workspace, scaling, scroll, z-index, layers, game-clock, time

## Решение

Серия реализуется сразу как пять мини-патчей `v0.0.49 → v0.0.53`.

### v0.0.49 — Workspace Window Bounds

Любое runtime-окно игры обязано полностью оставаться внутри игрового Workspace / `#game`.

Persistent Header и Footer являются отдельными grid-областями приложения и не могут перекрываться runtime-окнами.

### v0.0.50 — Scale-first Window Sizing

При нехватке места используется следующий порядок:

1. окно сначала адаптируется по доступной ширине/высоте;
2. затем допускается умеренное масштабирование;
3. минимальный читаемый scale по умолчанию — `0.82`;
4. только если даже при этом окно не помещается, включается внутренний scroll.

Цель: не превращать текст в микроскопический ради формального fit и одновременно не включать прокрутку там, где окно можно аккуратно уменьшить.

Dialogue и Interaction используют единый standard preferred width. Inventory остаётся wide-окном, но проходит через тот же Window Manager.

### v0.0.51 — Layer / Z Policy

Приняты уровни:

```text
world
→ vision
→ HUD / touch
→ workspace controls
→ game modal
→ OverlayRoot
→ Project Hub
→ persistent Header / Footer
```

Dialogue, Interaction и Inventory находятся на одном `game-modal` уровне.

На одном modal-уровне не должно быть случайного наложения: открытие нового окна закрывает предыдущее через его собственный close path, чтобы не ломать внутреннее состояние и input-lock.

### v0.0.52 — Game Clock phase UX

Фазы суток показываются иконкой:

- 🌙 Ночь;
- 🌅 Утро;
- ☀️ День;
- 🌆 Вечер.

### v0.0.53 — Game seconds + speed

Game Clock показывает `HH:MM:SS` и явный коэффициент `×12`.

Принятое соотношение не меняется:

```text
1 game minute = 5 real seconds
1 game hour   = 5 real minutes
1 game day    = 120 real minutes
speed         = ×12
```

UI обновляется чаще одной реальной секунды, чтобы движение игровых секунд было видно.

## Жёсткий инвариант времени

Game Clock остаётся **display-only**.

Он не меняет и не ускоряет:

- Dynamic Event lifetime;
- Location / zone quality timers;
- NPC/Event timers;
- Process/offline timers;
- cooldown;
- session timer;
- time-in-location.

Все эти системы продолжают считать REAL TIME до отдельного принятого решения.
