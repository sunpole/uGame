# uGame — 3D-полигон Quaternius (12.10.2026)

Ссылка: https://sunpole.github.io/uGame/labs/first-real-3d.html

Это отдельная от игры HTML-сцена (Three.js/WebGL), где одна готовая нейтральная **3D-модель Quaternius Universal Base Characters** поворачивается настоящей камерой на 45°, 60°, 75° над горизонтом. Размеры 75%, 100%, 130%. Можно вращать, двигать по полю и видеть простую пробную ходьбу. Существующие Phaser, мир, сохранения, экономику и баланс не меняем.

Источник модели CC0: https://quaternius.com/packs/universalbasecharacters.html ; опубликованный в другом открытом проекте нейтральный GLB-экспорт: https://github.com/programasweights/avatar/blob/ddd5fc34a445bcded3cf9836607aaeebc19a5c78/public/assets/character.glb ; происхождение и лицензия: https://github.com/programasweights/avatar/blob/ddd5fc34a445bcded3cf9836607aaeebc19a5c78/ASSETS.md . Модель ~741 КБ, без оригинальных клипов ходьбы; шаги в тесте задаёт **наша простая пробная анимация костей**. Загрузка модели и Three.js по сети; при отсутствии WebGL/интернета показывается ошибка.

Статус: визуальный пробник, не релиз игры. Chromium desktop/mobile нужно подтвердить отдельно. Вопрос: одобрить угол, масштаб и читаемость. Текущий выпуск v0.2.76 не изменён.
