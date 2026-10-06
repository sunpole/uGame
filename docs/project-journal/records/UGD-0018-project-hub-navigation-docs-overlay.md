# UGD-0018 — Project Hub: единая навигация игры, документации и dev-инструментов

Дата: 2026-10-06  
Тип: ui-ux  
Статус: accepted  
Flags: needs-prototype, needs-test  
Теги: ui, ux, navigation, documentation, developer-tools, overlay, project-hub

## Контекст

uGame уже запускается как одна веб-страница на GitHub Pages и локально через dev-server. По мере роста проекта появились отдельные поверхности: сама игра, Project Journal, документация, GitHub repository, будущий Simulation Lab и DEV-инструменты.

Принято добавить в саму игру единый **Project Hub**, чтобы из игрового экрана можно было попасть во все важные части проекта и вернуться назад, не теряя контекст игры.

## Основной UX-принцип

Не размещать множество постоянных ссылок поверх игрового поля.

Верхняя панель получает один понятный вход:

```text
uGame   v0.0.xx                              [☰]
```

Кнопка открывает Project Hub поверх игры.

## Project Hub

Hub является modal/overlay-слоем поверх текущей игры.

```text
GAME
├─ Вернуться в игру
├─ Инвентарь / персонаж / прогрессия (по мере появления)

PROJECT
├─ Текущее состояние проекта
├─ Version / Changelog
├─ Project Journal
├─ Active/Idle Core

TOOLS
├─ DEV
├─ World Analyzer (позже)
├─ Simulation Lab (позже)

EXTERNAL
├─ GitHub repository
├─ GitHub Actions
└─ GitHub Pages
```

Состав пунктов data-driven и может расширяться без переписывания layout.

## Вложенная навигация

Вместо множества независимых modal поверх modal используется один overlay-shell с **navigation stack**.

Пример:

```text
Game
→ Project Hub
→ Documentation
→ UGD-0017
→ Back
→ Back
→ Game
```

Визуально вложенная страница может выглядеть как новое всплывающее окно/лист поверх предыдущего, но технически Hub хранит stack экранов. Это уменьшает путаницу с фокусом, клавиатурой, мобильным UI и закрытием нескольких окон.

Обязательные элементы каждого вложенного view:

- Back, если это не корень Hub;
- Close — закрыть весь Hub и вернуться в игру;
- title;
- scrollable content-area;
- breadcrumb или короткий путь при глубине 2+;
- Esc закрывает верхний слой/возвращает назад, а на корне закрывает Hub.

## Игра во время Hub

Когда Hub открыт:

- управление персонажем приостанавливается;
- игровые клавиши не проходят в Phaser/PlayerController;
- игровые таймеры мира продолжают жить по своим правилам, если отдельно не принято pause;
- закрытие Hub возвращает управление без reload;
- состояние игры не пересоздаётся.

## Документация прямо внутри игры

Внутренние документы проекта должны читаться **в том же browser tab**, внутри Project Hub.

Нужно поддержать минимум:

- `README.md`;
- `VERSION.md`;
- `docs/project-journal/CURRENT.md`;
- `docs/project-journal/ACTIVE-IDLE-CORE.md`;
- Project Journal index/records;
- `docs/SIMULATION-LAB.md`;
- другие whitelisted docs по мере необходимости.

Для внутренних файлов предпочтителен собственный lightweight document viewer:

```text
relative repo path
↓
fetch same-origin file
↓
render in Hub document view
```

Это работает и на GitHub Pages, и на localhost из одного кода.

Не разрешать произвольный URL/path из пользовательского ввода. Список документов задаётся конфигурацией Hub.

## Markdown

На первом этапе достаточно безопасного ограниченного renderer:

- headings;
- paragraphs;
- lists;
- tables;
- code/pre;
- links;
- emphasis;
- horizontal rule.

Raw HTML из Markdown не исполнять.

Если полноценный Markdown parser потребует внешнюю dependency, сначала оценить её необходимость. Documentation viewer не должен превращаться в отдельный framework.

## Project Journal

Journal уже имеет собственную GitHub Pages поверхность. В Hub нужны два режима:

1. быстрый встроенный список/поиск важных записей;
2. `Open full Journal` — открыть существующую journal page внутри Hub, если same-origin embedding удобен.

Для стабильности предпочтительно читать Journal `index.json` и markdown records напрямую, а не зависеть только от iframe.

## Внешние GitHub-ссылки

`github.com` нельзя считать гарантированно embeddable внутрь iframe из-за browser/security headers.

Поэтому:

- внутренние документы/repo data → same-window Hub;
- GitHub repository / commit / Actions → external link, новая вкладка;
- рядом с внешней ссылкой явно показывать значок/текст `откроется в новой вкладке`.

## GitHub Pages и localhost

Hub обязан работать одинаково из относительных URL.

```text
GitHub Pages:
https://sunpole.github.io/uGame/

Local:
http://localhost:<port>/
```

Нельзя hardcode Pages base URL для внутренних ресурсов.

## Сохранения

GitHub Pages и localhost являются разными browser origins. Поэтому текущие local saves не синхронизируются между ними автоматически.

Project Hub не должен создавать впечатление, что Pages-save и local-save — одно и то же.

Позже, если появится account/server save, это правило изменится отдельным решением.

## Начальный визуальный стиль

Hub должен продолжать текущий минимальный тёмный UI uGame, а не создавать отдельный сайт внутри игры.

Рабочее направление:

- тёмный нейтральный фон;
- одна акцентная линия/состояние;
- минимум декоративных карточек;
- крупные ясные разделы;
- компактная навигация;
- читаемый текст документации;
- desktop-first сейчас, но responsive до mobile;
- modal занимает большую часть игрового окна, но оставляет ощущение, что игра находится под ним.

Точные цвета/размеры/иконки пока относятся к визуальному прототипу, а не к принятой механике.

## Предлагаемая структура UI

```text
TOP BAR
[uGame] [version]                            [☰ Hub]

GAME CANVAS
...

HUB OVERLAY
┌──────────────────────────────────────────────┐
│ ← Back     Documentation              × Close│
├───────────────┬──────────────────────────────┤
│ NAV           │ CONTENT                      │
│ Game          │                              │
│ Project       │ CURRENT.md / Journal / ...   │
│ Tools         │                              │
│ External      │                              │
└───────────────┴──────────────────────────────┘
```

На узком экране sidebar превращается в верхние/вложенные списки, без горизонтального переполнения.

## Data-driven navigation

Предлагается отдельная конфигурация, например:

`data/project-hub.json`

```text
sections[]
  id
  label
  items[]
    id
    label
    type: view | document | internal-page | external
    target
    devOnly?
```

Это позволит позднее добавить Simulation Lab, Analyzer и новые docs без переписывания HTML.

## Архитектура

Минимальное разделение:

```text
ProjectHubSystem
├─ open / close
├─ navigation stack
├─ focus / keyboard management
└─ route item actions

ProjectDocumentViewer
├─ whitelist
├─ fetch relative docs
└─ safe markdown rendering

project-hub.json
└─ navigation definitions
```

ProjectHubSystem не должен знать игровую механику NPC/ресурсов.

## Первая реализация

MVP:

1. кнопка Hub в topbar;
2. fullscreen-within-app overlay;
3. root navigation;
4. Back / Close / Esc;
5. блокировка PlayerController, пока Hub открыт;
6. встроенное чтение CURRENT / VERSION / README / Simulation Lab / Journal records;
7. ссылки GitHub repository / Actions / Pages;
8. relative URLs, одинаковые на Pages и localhost;
9. responsive layout;
10. никакого изменения game save/schema.

## После MVP

- поиск по Project Journal;
- favorites/recent docs;
- Simulation Lab web launcher/status;
- DEV World Analyzer;
- просмотр текущего WorldSpawnState;
- changelog/patch view;
- debug reports;
- deep links вида `?hub=journal&record=UGD-0017` при необходимости.

## Почему это делаем до дальнейшего усложнения проекта

Project Hub становится постоянным входом в developer/project surfaces. Simulation Lab, World Analyzer и последующие инструменты смогут подключаться к уже готовой навигации вместо добавления новых случайных кнопок по интерфейсу.

## Статус

Функциональное направление Project Hub **принято**. Визуальная композиция должна быть проверена первым UI-прототипом до глубокой стилизации.
