function mass(units) { return (Math.max(0, Number(units) || 0) / 10).toFixed(1) + ' кг'; }
function minutes(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
}
const names = { stone: 'Камень', wood: 'Дерево', water: 'Вода', clay: 'Глина' };

export class ResourceExpeditionView {
  constructor({ expeditionSystem, interactionPanel, onOccupancyChange } = {}) {
    this.system = expeditionSystem;
    this.panel = interactionPanel;
    this.onOccupancyChange = onOccupancyChange;
  }

  open(spawn) {
    const result = this.system.enter(spawn);
    if (!result.ok) {
      const messages = {
        'skills-locked': 'Этот Мастер открывает ресурсы ' + (result.availableTiers || []).join(' / ') +
          ', но соответствующее дерево навыков и допуск по репутации ещё не внедрены. Пока доступна тренировочная добыча T1 у Мастеров T1.',
        expired: 'Встреча уже закончилась.',
        occupied: 'Персонаж уже находится в другой экспедиции. Возобновите её перед новой встречей.',
        used: 'В эту экспедицию вы уже входили. Повторный вход в тот же Encounter запрещён.',
        unclaimed: 'Сначала заберите груз предыдущей экспедиции.'
      };
      if (result.reason === 'unclaimed' || result.reason === 'occupied') return this.show();
      this.panel?.showMessage?.({
        title: 'Экспедиция · доступ',
        text: messages[result.reason] || 'Экспедиция сейчас недоступна.',
        meta: 'Новая система — локальный прототип, не общий мультиплеер.'
      });
      return true;
    }
    this.onOccupancyChange?.();
    this.show();
    return true;
  }

  show(feedback = '') {
    this.system.update(Date.now(), true);
    const run = this.system.run;
    if (!run) return false;

    const active = run.status === 'active';
    const resourceName = names[run.resourceId] || run.resourceId;
    const text = active
      ? 'Вы спустились в отдельную ресурсную зону. Ваш персонаж занят добычей; можно закрыть браузер и вернуться до окончания Encounter. '
        + 'Другие игроки пока не подключены — это локальная проверка на одном персонаже.'
      : (run.status === 'depleted'
        ? 'Месторождение полностью исчерпано. Итоги сохранены, персонаж вернулся на поверхность.'
        : run.status === 'expired'
          ? 'Время Encounter вышло. Персонаж вернулся на поверхность, накопленный груз сохранён.'
          : 'Вы добровольно вышли из экспедиции. Груз сохранён, право на итоговый возврат Шагов утрачено.');

    const actions = active ? this.activeActions(run) : this.resultActions(run);
    this.panel?.showActions?.({
      title: 'Экспедиция · ' + resourceName + ' ' + run.tier,
      text,
      actions,
      meta: feedback || this.summary(Date.now()),
      metaProvider: (now) => {
        this.system.update(now);
        this.paintMeter(now);
        this.onOccupancyChange?.();
        return this.summary(now);
      },
      updateIntervalMs: 150
    });
    this.addDashboard();
    this.onOccupancyChange?.();
    return true;
  }

  activeActions(run) {
    const manual = run.mode === 'manual';
    return [
      {
        id: 'expedition-auto',
        label: run.mode === 'auto' ? '⏸ Приостановить автоматическую добычу' : '▶ Автоматически: 0,2 кг / 10 с',
        disabled: manual,
        onSelect: () => {
          if (run.mode === 'auto') this.system.pause();
          else this.system.startAuto();
          this.show();
          return true;
        }
      },
      {
        id: 'expedition-manual',
        label: manual ? '🎯 Остановить маркер' : '🎯 Ручная добыча (мини-игра)',
        onSelect: () => {
          if (!manual) {
            this.system.startManual();
            this.show('Маркер движется: остановите его в зелёной зоне!');
            return true;
          }
          const result = this.system.stopManual();
          if (!result.ok && result.reason === 'too-fast') return false;
          this.show(result.ok
            ? result.result + ' · добыто ' + mass(result.minedUnits)
            : 'Попытка не удалась: ' + result.reason);
          return true;
        }
      },
      {
        id: 'expedition-refresh',
        label: '↻ Обновить таблицу / результат',
        onSelect: () => { this.show(); return true; }
      },
      {
        id: 'expedition-exit',
        label: '↑ На поверхность (без итогового приза)',
        onSelect: () => {
          this.system.leave();
          this.show();
          return true;
        }
      }
    ];
  }

  resultActions(run) {
    return [
      {
        id: 'expedition-claim',
        label: run.claimed ? 'Груз уже получен' : 'Забрать добытое: ' + mass(run.cargoUnits),
        disabled: run.claimed,
        onSelect: () => {
          const success = this.system.claim();
          this.show(success ? 'Груз размещён в переносимых контейнерах.' : 'Недостаточно места в рюкзаке. Груз остаётся сохранённым.');
          return success;
        }
      },
      {
        id: 'expedition-close',
        label: 'Вернуться к миру',
        onSelect: () => {
          this.panel?.close?.();
          this.onOccupancyChange?.();
          return true;
        }
      }
    ];
  }

  summary(now) {
    const run = this.system.run;
    if (!run) return 'Нет экспедиции';
    const remaining = minutes(run.endsAt - now);
    const status = ({ active: 'идёт', depleted: 'ресурс собран', expired: 'Encounter истёк', left: 'покинута' })[run.status];
    return 'ЗАПАС ' + mass(run.stockUnits) + ' / ' + mass(run.initialUnits)
      + ' · ВАШ ВКЛАД ' + mass(run.extractedUnits)
      + ' · ГРУЗ ' + mass(run.cargoUnits)
      + ' · ШАГИ −' + run.spentSteps
      + (run.refundSteps ? ' / возврат +' + run.refundSteps : '')
      + ' · ' + status
      + ' · Encounter ' + remaining + ' REAL TIME'
      + (run.mode === 'manual' ? ' · Вручную: ' + Math.min(8, (now - run.manualStartedAt) / 1000).toFixed(1) + ' с' : '');
  }

  addDashboard() {
    if (typeof document === 'undefined' || !this.panel?.optionsElement) return;
    const run = this.system.run;
    const container = document.createElement('div');
    container.className = 'resource-expedition-dashboard';
    const progress = document.createElement('div');
    progress.className = 'resource-expedition-progress';
    const bar = document.createElement('div');
    bar.className = 'resource-expedition-progress-fill';
    bar.style.width = (100 * run.extractedUnits / run.initialUnits).toFixed(1) + '%';
    progress.append(bar);
    const header = document.createElement('strong');
    header.textContent = 'Месторождение · ' + mass(run.stockUnits) + ' осталось';
    const stats = document.createElement('div');
    stats.className = 'resource-expedition-stats';
    stats.textContent = 'Вы: ' + mass(run.extractedUnits) + ' · Участники: 1/12 (локальный тест) · Попытки: ' + run.manualAttempts;
    container.append(header, progress, stats);

    if (run.status === 'active' && run.mode === 'manual') {
      const mini = document.createElement('div');
      mini.className = 'resource-expedition-meter';
      mini.setAttribute('aria-label', 'Зона точной добычи: центр зелёный, края красные');
      const pointer = document.createElement('div');
      pointer.className = 'resource-expedition-pointer';
      mini.append(pointer);
      container.append(mini);
    }
    this.panel.optionsElement.prepend(container);
    this.paintMeter(Date.now());
  }

  paintMeter(now) {
    const marker = this.panel?.optionsElement?.querySelector?.('.resource-expedition-pointer');
    if (marker && this.system.run?.mode === 'manual') {
      marker.style.top = (this.system.meterPosition(now) * 100).toFixed(1) + '%';
    }
  }
}
