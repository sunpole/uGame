# uGame · Безопасная нормализация названий характеристик

**Дата:** 2026-10-11. **Статус при создании:** в PR, QA/merge проверяются отдельно.

## Резервная точка отката — создана ДО изменений

**Опубликован и проверен:** [v0.2.57-pre-stat-names-20261011](https://github.com/sunpole/uGame/releases/tag/v0.2.57-pre-stat-names-20261011), immutable source commit `d0a120de23589c2476eb38ba55de48ea4ece6034`, workflow [CI](https://github.com/sunpole/uGame/actions/runs/38103667526) SUCCESS. [Backup PR #62](https://github.com/sunpole/uGame/pull/62) merged. Внутренняя версия игры не повышалась: v0.2.57. GitHub Release защищает **код**, не браузерные сохранения.

## Фактическая задача

Ранее пользовательские значения в лаборатории показывались в UI по-русски, но экспорт JSON и внутренние структуры содержали `vyn`, `lov`, `intel`, `otv` и транслитерированные технические названия. Владелец потребовал понятные реальные английские названия рядом с русскими обозначениями, особенно **ВЫН / CON — Constitution**. Требуется избегать destructive rename, который сломает уже выгруженные файлы и контракты.

## Решение

- Добавлен единый словарь `src/character-balance/terminology.js` для 24 производных и 4 базовых статов. Русские метки и английские имена: ВЫН/CON/Constitution, ЛОВ/DEX/Dexterity, ИНТ/INT/Intelligence, ОТВ/RESP/Responsibility и др. Lineage II подтверждает CON/DEX/INT: https://www.lineage2.com/en-us/news/aden-launch-patch-notes ; PoE использует Dexterity/Intelligence: https://www.pathofexile.com/forum/view-thread/55152 . **RESP — понятие uGame, не официальная игровая характеристика чужого проекта**. Любые названия не меняют баланс.
- Редактор, профиль, таблица результатов, реестр и закреплённые параметры показывают RU + английский код и имя.
- `src/character-balance/named-snapshot.js` создаёт публичный **JSON schema v2** с полноценными английскими ключами. Например `constitution`, `dexterity`, `intelligence`, `responsibility`, `perConstitution`, `health`, `cooldownReduction`, `globalRegeneration`. Конвертер рекурсивно обрабатывает профили, все формулы, ruleModifiers, расчёты и трассы, registry IDs, pins, selected.
- Перед импортом проверяется SHA-256 и точная `terminology`. Затем public→legacy conversion, validation полей и повторный расчёт средствами `parseSnapshot`. **Старые v1 JSON импортируются без ручной обработки**.
- Старые внутренние legacy IDs остаются только в техническом расчётном ядре как контракт для обратной совместимости; не следует переименовывать их в источниках/сейвах без отдельной версии миграции.
- Не менялись `data/character-balance-candidate.json`, GameState, Phaser, live SaveSystem, Steps, режимы времени, игровой баланс.

## QA

Тест `tests/character-lab-named-ids.test.mjs`: уникальность всех идентификаторов, двуязычные названия, schema v2 без транслит-ключей, JSON export→import с сохранением ruleModifiers и расчётных трасс, приём исходных JSON v1, отказ от подделанного checksum и неподдерживаемых версий. Chromium `tests/character-lab-admin-browser-smoke.mjs`: все прежние сценарии + экспорт v2, новый имя/код, восстановление, отклонение tamper. Обязателен полный `npm test`, Chromium desktop/mobile + Phaser/Save/F5.

**Итоги тестов и merged commit обновить после финального CI.** Не считать обычный текст этого отчёта доказательством прошедшего тестирования.

## Проверка пользователю после merge

1. Сначала обновить локальный main (Updater 1) и открыть Character Lab из Quick Run.
2. Посмотреть ВЫН / CON, ЛОВ / DEX, ИНТ / INT, ОТВ / RESP в карточках и редакторе.
3. Изменить любую зависимость, экспортировать JSON; поискать в файле `"constitution"`, `"perConstitution"` и убедиться, что там нет `"vyn":` и `"perVyn":`.
4. Нажать «Вернуть стандарт», затем «Импорт JSON» и восстановить изменённые показатели. Старый JSON v1 также должен импортироваться.
5. Если хочется немедленно восстановить **предыдущий код**, использовать release-tag `v0.2.57-pre-stat-names-20261011` в отдельном checkout. Updater 7 откатывает лишь предыдущее локальное обновление, не произвольный тег.

## Открытые вопросы

- Смысловые переводы некоторых собственных характеристик uGame (Ward/Desire и др.) являются редакторскими, а не утверждением, что механика идентична PoE/Lineage/Albion. Можно позже утвердить другой пользовательский термин **без изменения значений**.
- Ручной Windows QA после объединения — отдельно от Chromium CI.
