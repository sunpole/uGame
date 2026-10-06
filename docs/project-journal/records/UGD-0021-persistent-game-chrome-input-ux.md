# UGD-0021 — Persistent Game Chrome: Header / Workspace / Footer + Input UX

Дата: 2026-10-07  
Тип: ui-ux / runtime  
Статус: accepted  
Flags: needs-test  
Теги: ui-shell, header, footer, clocks, session, location, input, remote, settings

## Решение

Серия реализуется сразу как восемь мини-патчей `v0.0.41 → v0.0.48`.

### v0.0.41 — App Shell boundaries

- постоянный Header;
- центральный Workspace;
- постоянный Footer;
- OverlayRoot живёт только внутри Workspace;
- никакое игровое окно не может закрыть Header/Footer.

### v0.0.42 — Build / Session / Location context

Footer получает независимые status-block:

- version;
- build/source context;
- LOCAL / PAGES;
- session duration;
- current zone id/name;
- time inside current zone;
- zone runtime details, которые реально известны текущей системе.

Session переживает F5 в одной вкладке через sessionStorage. Новая вкладка/новый запуск начинает новую session.

Location timer переживает F5 в этой session, если zone не изменилась, и сбрасывается при переходе.

### v0.0.43 — Informational Game Clock

Принято:

```text
1 game minute = 5 real seconds
1 game hour   = 5 real minutes
1 game day    = 120 real minutes

game calendar begins:
01.01.2026 00:00

00:00–05:59 Night
06:00–11:59 Morning
12:00–17:59 Day
18:00–23:59 Evening
```

Game Clock пока **ни на что не влияет**.

Все существующие gameplay timers остаются REAL TIME:

- Dynamic Event lifetime;
- Location/quality lifetime;
- NPC/Event future lifetime;
- Process/offline timers;
- cooldowns;
- session/location timers.

Game time станет time-basis конкретной механики только после отдельного решения.

### v0.0.44 — Character / Resource header

Header получает отдельные блоки:

- logo/menu;
- character identity;
- class;
- profession;
- specialization;
- level / XP placeholder до появления настоящей progression;
- stamina;
- pinned resources;
- material Stone-equivalent total;
- storage summary.

Attention показывается отдельно и **не входит** в material wealth.

### v0.0.45 — Unified Action Router

Контекстная команда:

`E / Space / Enter = Primary Action`

Приоритет:

1. активный dialogue → next / complete;
2. active interaction result → select/confirm/close;
3. другой modal → contextual primary action if supported;
4. world → interact with nearby object.

`Escape = Back / Cancel / Close`.

Dialog/menu navigation получает keyboard arrows без передачи движения персонажу.

### v0.0.46 — Remote / AnyDesk input parity

Все видимые movement/action buttons являются настоящим input adapter:

```text
Keyboard
Mouse / AnyDesk
future touch/gamepad
→ Action Router / PlayerController
→ same game action
```

Нажатие мышью не является декоративным дублем.

### v0.0.47 — Text selection setting

Default:

`Text selection = OFF`

Чтобы drag/click по игровому приложению не выделял текст.

Project Hub → Settings позволяет переключить selection без reload.

Input/textarea/select/contenteditable всегда сохраняют нормальную возможность выделения.

### v0.0.48 — HUD migration + cross-page chrome

- старые показатели удаляются из игрового HUD только после переноса;
- Quest/context prompts остаются внутри Workspace;
- Header/Footer не перекрываются никакими modal;
- Journal / Active–Idle / Simulation Results получают shared project chrome;
- любой скриншот HTML-поверхности проекта показывает build/session/game/real time context.

## Инвариант миграции

Нельзя удалить старый показатель, пока его новая replacement не отображается и не проверена.

## Реальное время

Browser/client clock показывает:

- local date/time;
- IANA timezone;
- UTC offset.

Он отражает системные часы клиента. Browser не может криптографически доказать, что Windows clock выставлен правильно. Позже MMORPG backend может дать authoritative server UTC.

## Build identity

UI различает:

- version;
- LOCAL / PAGES;
- source/build id.

Точный local Git SHA может приходить от local dev-server. На Pages short main SHA может запрашиваться у GitHub API; при недоступности показывается stable build/version id без выдуманного SHA.

## Desktop scope

Эта серия оптимизируется для landscape desktop. DOM/component boundaries и CSS grid areas делаются так, чтобы позже portrait/mobile layout мог переставить готовые status-block без переписывания систем.


## Реализация v0.0.41–v0.0.48

Серия реализована полностью:

- v0.0.41 — structural Header / Workspace / Footer + OverlayRoot;
- v0.0.42 — build/environment, session, location/time-in-zone и real clock/timezone;
- v0.0.43 — persistent informational Game Clock;
- v0.0.44 — live character/Stamina/resources/material wealth/storage header;
- v0.0.45 — unified contextual Action Router;
- v0.0.46 — mouse/AnyDesk input parity;
- v0.0.47 — persistent text-selection setting;
- v0.0.48 — legacy HUD migration, modal leak fix и shared chrome на Journal/Simulation HTML pages.

Game Clock остаётся display-only. Все существующие gameplay timers остаются REAL TIME.

Следующий шаг — ручной desktop QA после локального обновления.
