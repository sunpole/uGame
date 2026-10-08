const resourceNames = {
  stone: { title: 'Подземная шахта', material: 'Камень', symbol: '◆', kind: 'stone', description: 'Тёмные пласты горной породы' },
  wood: { title: 'Лесная экспедиция', material: 'Древесина', symbol: '♣', kind: 'wood', description: 'Древние лесные угодья' },
  water: { title: 'Подземный источник', material: 'Вода', symbol: '≈', kind: 'water', description: 'Чистый водоносный горизонт' },
  clay: { title: 'Глиняный карьер', material: 'Глина', symbol: '⬟', kind: 'clay', description: 'Тёплые осадочные пласты' }
};

function mass(units) { return (Math.max(0, Number(units) || 0) / 10).toFixed(1) + ' кг'; }
function clock(ms) {
  const total = Math.max(0, Math.ceil(Number(ms) / 1000));
  return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
}
function number(value) { return Math.max(0, Number(value) || 0).toLocaleString('ru-RU'); }

export class ResourceExpeditionView {
  constructor({ expeditionSystem, interactionPanel, onOccupancyChange, getSteps, getRelationship } = {}) {
    this.system = expeditionSystem;
    this.panel = interactionPanel;
    this.onOccupancyChange = onOccupancyChange;
    this.getSteps = getSteps;
    this.getRelationship = getRelationship;
    this.feedback = '';
    this.lastMode = null;
    this.lastStatus = null;
    this.nextRenderAt = 0;
    this.root = null;
    if (typeof document !== 'undefined') this.mount();
  }

  isOpen() { return Boolean(this.root && !this.root.hidden); }

  mount() {
    if (this.root) return this.root;
    const root = document.createElement('section');
    root.id = 'expedition-realm';
    root.className = 'expedition-realm';
    root.hidden = true;
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', 'Ресурсная экспедиция');
    root.innerHTML = `
      <div class="expedition-realm-shell">
        <header class="expedition-realm-header">
          <div class="expedition-realm-heading">
            <span class="expedition-realm-kicker">uGAME / RESOURCE EXPEDITION / INSTANCE</span>
            <h1 data-exp="title">Ресурсная экспедиция</h1>
            <p data-exp="subtitle">Внутреннее пространство добычи</p>
          </div>
          <div class="expedition-realm-top-stats">
            <div><small>ENCOUNTER · REAL TIME</small><strong data-exp="timer">--:--</strong></div>
            <div><small>ШАГИ</small><strong data-exp="steps">—</strong></div>
            <button type="button" data-exp-action="surface" class="expedition-realm-surface">↑ На поверхность</button>
          </div>
        </header>

        <div class="expedition-realm-content">
          <section class="expedition-realm-cavern" aria-label="Визуальная зона ресурса">
            <div class="expedition-realm-crystals" aria-hidden="true">
              <div class="expedition-realm-orb" data-exp="symbol">◆</div>
              <div class="expedition-realm-rock exp-rock-a"></div><div class="expedition-realm-rock exp-rock-b"></div><div class="expedition-realm-rock exp-rock-c"></div>
            </div>
            <div class="expedition-realm-deposit">
              <span class="expedition-realm-eyebrow">МЕСТОРОЖДЕНИЕ · <span data-exp="tier">T1</span></span>
              <strong data-exp="remaining">—</strong>
              <div class="expedition-realm-progress" role="progressbar" aria-label="Добытая часть месторождения" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span data-exp="bar"></span></div>
              <div class="expedition-realm-progress-label"><span data-exp="percent">0%</span><span data-exp="initial">из —</span></div>
            </div>
          </section>

          <div class="expedition-realm-column">
            <section class="expedition-realm-panel">
              <div class="expedition-realm-panel-head"><h2>Добыча</h2><span data-exp="status">Ожидание</span></div>
              <div class="expedition-realm-metrics">
                <div><small>ВАШ РЕЗУЛЬТАТ</small><strong data-exp="mined">0,0 кг</strong></div>
                <div><small>ДОБЫТО В ГРУЗ</small><strong data-exp="cargo">0,0 кг</strong></div>
                <div><small>ПОТРАЧЕНО ШАГОВ</small><strong data-exp="spent">0</strong></div>
                <div><small>ОПЫТ С NPC</small><strong data-exp="xp">0</strong></div>
              </div>
              <div class="expedition-realm-controls" data-exp="active-controls">
                <button type="button" class="expedition-realm-button exp-auto" data-exp-action="auto">▶ Автодобыча</button>
                <button type="button" class="expedition-realm-button exp-manual" data-exp-action="manual">🎯 Ручная добыча</button>
              </div>
              <div class="expedition-realm-manual" data-exp="manual-zone" hidden>
                <div class="expedition-realm-meter" aria-label="Индикатор точности: попасть в зелёный центр"><div data-exp="pointer" class="expedition-realm-meter-pointer"></div></div>
                <div class="expedition-realm-meter-guide">
                  <strong>Точность удара</strong>
                  <p>Останови белый маркер в зелёном центре. Ручной удар даёт больше опыта отношений.</p>
                  <button type="button" class="expedition-realm-button exp-hit" data-exp-action="manual">Остановить маркер</button>
                  <small data-exp="manual-time">До 8 секунд на попытку</small>
                </div>
              </div>
              <div class="expedition-realm-results" data-exp="result-controls" hidden>
                <p data-exp="result-text">Экспедиция завершена.</p>
                <button type="button" class="expedition-realm-button exp-claim" data-exp-action="claim">Получить груз</button>
                <button type="button" class="expedition-realm-button" data-exp-action="surface">Вернуться на поверхность</button>
              </div>
              <p class="expedition-realm-feedback" data-exp="feedback" aria-live="polite"></p>
            </section>

            <section class="expedition-realm-panel">
              <div class="expedition-realm-panel-head"><h2>Участники</h2><span>1 / 12 · локальный прототип</span></div>
              <div class="expedition-realm-miners">
                <div><strong>01 · Вы</strong><span data-exp="miner-state">В экспедиции</span><strong data-exp="miner-mass">0,0 кг</strong></div>
              </div>
              <p class="expedition-realm-small">Общий сервер, дополнительные добытчики и рейтинг до 12 игроков появятся отдельным этапом. Сейчас запас принадлежит одной тестовой экспедиции.</p>
              <div class="expedition-realm-report">
                <div><span>Автоматических циклов</span><strong data-exp="cycles">0</strong></div>
                <div><span>Ручных ударов</span><strong data-exp="attempts">0</strong></div>
                <div><span>Возврат Шагов</span><strong data-exp="refund">0</strong></div>
              </div>
            </section>
          </div>
        </div>
        <footer class="expedition-realm-footer">Реальное время · Конечный запас ресурса · Внимание не начисляется автоматически · Добыча T1 — тестовый баланс</footer>
      </div>`;
    root.addEventListener('click', (event) => {
      const button = event.target?.closest?.('[data-exp-action]');
      if (!button || !root.contains(button) || button.disabled) return;
      this.act(button.dataset.expAction);
    });
    document.body.append(root);
    this.root = root;
    return root;
  }

  field(name) { return this.root?.querySelector?.('[data-exp="' + name + '"]') || null; }
  put(name, value) { const element = this.field(name); if (element) element.textContent = String(value); }

  open(spawn) {
    const result = this.system.enter(spawn);
    if (!result.ok) {
      if (result.reason === 'unclaimed' || result.reason === 'occupied') return this.show();
      const messages = {
        'skills-locked': 'Этот Мастер открывает ' + (result.availableTiers || []).join(' / ') +
          ', но освоение соответствующих навыков пока не реализовано. Для игрового теста доступен T1 у Мастера T1.',
        expired: 'Встреча уже закончилась.',
        used: 'Эта ресурсная экспедиция уже завершена или покинута.',
        invalid: 'Не удалось открыть экспедицию.'
      };
      this.panel?.showMessage?.({
        title: 'Ресурсная экспедиция',
        text: messages[result.reason] || 'Доступ к экспедиции закрыт.',
        meta: 'Текущий прототип: локальный T1, без сетевого мультиплеера.'
      });
      return true;
    }
    this.feedback = '';
    return this.show();
  }

  show(message = '') {
    this.system.update(Date.now(), true);
    if (!this.system.run) return false;
    this.panel?.close?.();
    if (message) this.feedback = message;
    this.mount();
    this.root.hidden = false;
    this.root.dataset.resource = resourceNames[this.system.run.resourceId]?.kind || 'stone';
    this.lastMode = null;
    this.lastStatus = null;
    this.render(Date.now());
    this.onOccupancyChange?.();
    return true;
  }

  hide() {
    if (this.root) this.root.hidden = true;
    this.onOccupancyChange?.();
  }

  act(action) {
    const now = Date.now();
    const run = this.system.run;
    if (!run) return;
    if (action === 'surface') {
      if (run.status === 'active') {
        const confirmExit = typeof window === 'undefined' || typeof window.confirm !== 'function'
          || window.confirm('Прервать экспедицию? Вы сохраните уже добытый груз, но потеряете право на итоговый возврат Шагов.');
        if (!confirmExit) return;
        this.system.leave(now);
      }
      this.hide();
      return;
    }
    if (action === 'auto' && run.status === 'active') {
      if (run.mode === 'auto') this.system.pause(now);
      else this.system.startAuto(now);
      this.feedback = this.system.run?.mode === 'auto' ? 'Автодобыча запущена. Она продолжится при закрытом браузере.' : 'Автодобыча приостановлена.';
    } else if (action === 'manual' && run.status === 'active') {
      if (run.mode !== 'manual') {
        this.system.startManual(now);
        this.feedback = 'Поймай бегущий маркер в зелёном центре!';
      } else {
        const result = this.system.stopManual(now);
        if (!result.ok) {
          this.feedback = result.reason === 'too-fast'
            ? 'Слишком рано: маркер должен двигаться хотя бы 0,4 секунды.'
            : result.reason === 'no-steps' ? 'Недостаточно Шагов.' : 'Попытка не удалась.';
        } else this.feedback = result.result + ' · +' + mass(result.minedUnits);
      }
    } else if (action === 'claim' && run.status !== 'active') {
      const success = this.system.claim(now);
      this.feedback = success ? 'Груз перенесён в контейнеры.' : 'Не хватило места: груз сохранён до повторной выдачи.';
    }
    this.render(Date.now());
    this.onOccupancyChange?.();
  }

  tick(now = Date.now()) {
    if (!this.isOpen()) return;
    this.render(now);
  }

  render(now = Date.now()) {
    if (!this.isOpen() || !this.system.run) return false;
    const run = this.system.run;
    const resource = resourceNames[run.resourceId] || resourceNames.stone;
    const isActive = run.status === 'active';
    const fraction = run.initialUnits > 0 ? 1 - run.stockUnits / run.initialUnits : 0;
    const modeChanged = this.lastMode !== run.mode || this.lastStatus !== run.status;
    this.put('title', resource.title + ' · ' + run.tier);
    this.put('subtitle', resource.description + ' · ' + run.expeditionId);
    this.put('symbol', resource.symbol);
    this.put('tier', run.tier);
    this.put('remaining', mass(run.stockUnits));
    this.put('initial', 'из ' + mass(run.initialUnits));
    this.put('percent', Math.round(fraction * 100) + '% добыто');
    this.put('mined', mass(run.extractedUnits));
    this.put('cargo', mass(run.cargoUnits));
    this.put('spent', '−' + number(run.spentSteps));
    this.put('miner-mass', mass(run.extractedUnits));
    this.put('cycles', number(run.autoCycles));
    this.put('attempts', number(run.manualAttempts));
    this.put('refund', '+' + number(run.refundSteps));
    this.put('steps', number(this.getSteps?.() ?? 0));
    this.put('xp', number(this.getRelationship?.(run.masterId)?.relationshipXp || 0));
    this.put('timer', clock(run.endsAt - now));
    this.put('feedback', this.feedback);
    this.put('status', ({ active: 'ДОБЫЧА', depleted: 'РЕСУРС ИСЧЕРПАН', expired: 'ВСТРЕЧА ЗАКОНЧЕНА', left: 'ВЫШЛИ' })[run.status] || '—');
    const surfaceButton = this.root.querySelector('.expedition-realm-surface');
    if (surfaceButton) surfaceButton.textContent = isActive ? '↑ Прервать (без бонуса)' : '↑ На поверхность';
    this.put('miner-state', isActive
      ? ({ auto: 'Автоматически', manual: 'Ручной удар', paused: 'Ожидание' })[run.mode]
      : 'Экспедиция окончена');
    const bar = this.field('bar');
    if (bar) bar.style.width = (100 * fraction).toFixed(1) + '%';
    const progress = this.root.querySelector('.expedition-realm-progress');
    progress?.setAttribute('aria-valuenow', String(Math.round(100 * fraction)));
    const manualZone = this.field('manual-zone');
    if (manualZone) manualZone.hidden = !isActive || run.mode !== 'manual';
    const pointer = this.field('pointer');
    if (pointer && run.mode === 'manual') pointer.style.top = (100 * this.system.meterPosition(now)).toFixed(1) + '%';
    if (run.mode === 'manual') {
      this.put('manual-time', Math.min(8, (now - run.manualStartedAt) / 1000).toFixed(1) + ' / 8 сек');
    }
    const activePanel = this.field('active-controls');
    const resultPanel = this.field('result-controls');
    if (activePanel) activePanel.hidden = !isActive;
    if (resultPanel) resultPanel.hidden = isActive;
    if (modeChanged) {
      const auto = this.root.querySelector('[data-exp-action="auto"]');
      if (auto) {
        auto.textContent = run.mode === 'auto' ? '⏸ Пауза' : '▶ Автодобыча';
        auto.disabled = run.mode === 'manual';
      }
      const manual = this.root.querySelector('[data-exp-action="manual"]');
      if (manual) manual.textContent = run.mode === 'manual' ? '🎯 Идёт ручная попытка' : '🎯 Ручная добыча';
      const claim = this.root.querySelector('[data-exp-action="claim"]');
      if (claim) claim.disabled = run.claimed;
      this.put('result-text', run.status === 'depleted'
        ? 'Ресурс полностью исчерпан. Мастер исчезнет с поверхности через 30 секунд после завершения добычи. Получи накопленный груз.'
        : run.status === 'expired'
          ? 'Время встречи завершилось. Добытый груз сохранён и доступен к выдаче.'
          : 'Выход выполнен. Добытый груз сохранён, но итоговый бонус за полную экспедицию утрачен.');
      if (claim) claim.textContent = run.claimed ? 'Груз получен' : 'Забрать ' + mass(run.cargoUnits);
    }
    this.lastMode = run.mode;
    this.lastStatus = run.status;
    return true;
  }
}
