# Быстрый 3D-полигон KayKit (вне uGame)

Дата: 2026-10-12. Версия игры: **v0.2.76**, игровой код без изменений.

## Запуск

Открыть напрямую: https://sunpole.github.io/uGame/labs/kaykit-first-3d.html

Полноценный отдельный HTML, **настоящий WebGL/Three.js** (не 2D спрайты). 1 готовая GLB-модель KayKit Adventurers по зафиксированному SHA источника; камера 45/60/75° от горизонтали, размеры 75/100/130%, кнопка анимации, разворот и WASD/экранные кнопки. Размер только внешний, камера uGame не затронута.

## Лицензия и источники

- Модель: `Knight.glb`, автор Kay Lousberg, **CC0 1.0**. Официальный исходник: https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/tree/672074b73ba276876a19e8816ecdc5241817ab47 . Лицензия источника: https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/blob/672074b73ba276876a19e8816ecdc5241817ab47/LICENSE.txt
- Three.js 0.180.0 — https://threejs.org/ (MIT).
- Модель загружается из CDN jsDelivr, исходник (бинарник) **не дублируется в нашем GitHub**: https://cdn.jsdelivr.net/gh/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0@672074b73ba276876a19e8816ecdc5241817ab47/addons/kaykit_character_pack_adventures/Characters/gltf/Knight.glb
- Демо требует интернет-доступа для модели и библиотеки Three.js, а также поддержки WebGL.

## Ожидаемый сценарий

На отдельной площадке виден настоящий 3D-человечек. Можно менять угол камеры (45/60/75) без замены модели или кадров, сравнить вид макушки и тела, шаги во время реальной анимации. Приложение отдельно от Phaser, не затрагивает `GameState`, `localStorage`, баланс, мир, релизы и сохранения.

## QA

Протокол: `tests/kaykit-first-3d-browser-smoke.mjs` — реальные desktop/mobile Chromium WebGL, загрузка внешней модели, 3 угла, 3 масштаба, проверка анимации и кнопок. Пользовательский Windows QA будет отдельным этапом после открытия Pages.

## Что потом

Сначала владелец скажет, подходит ли угловая проекция и масштаб. Если да — импорт одной модели на существующую карту или предрендер walking sheets под выбранным углом. Не делать крупную систему моделей до этого решения.
