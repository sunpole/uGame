const CLOCK_KEY = 'ugame.world-clock.v1';
const GAME_START_UTC_MS = Date.UTC(2026, 0, 1, 0, 0, 0);
const REAL_MS_PER_GAME_MINUTE = 5000;
const GAME_TIME_SCALE = 60_000 / REAL_MS_PER_GAME_MINUTE;
const RENDER_INTERVAL_MS = 250;

function safeLocalStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function pad2(value) {
  return String(Math.floor(Number(value) || 0)).padStart(2, '0');
}

function phaseForHour(hour) {
  if (hour < 6) return 'Ночь';
  if (hour < 12) return 'Утро';
  if (hour < 18) return 'День';
  return 'Вечер';
}

function phaseIconForHour(hour) {
  if (hour < 6) return '🌙';
  if (hour < 12) return '🌅';
  if (hour < 18) return '☀️';
  return '🌆';
}

export class GameClockSystem {
  constructor({ element } = {}) {
    this.element = element;
    this.storage = safeLocalStorage();
    this.realStartedAt = this.restoreOrCreateStart();
    this.timer = null;
  }

  restoreOrCreateStart() {
    try {
      const raw = this.storage?.getItem(CLOCK_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      const value = Number(parsed?.realStartedAt);
      if (Number.isFinite(value) && value > 0) return value;
    } catch {}

    const now = Date.now();
    try {
      this.storage?.setItem(CLOCK_KEY, JSON.stringify({
        schemaVersion: 1,
        realStartedAt: now,
        gameEpoch: '2026-01-01T00:00:00',
        realMsPerGameMinute: REAL_MS_PER_GAME_MINUTE
      }));
    } catch {}
    return now;
  }

  snapshot(now = Date.now()) {
    const elapsedRealMs = Math.max(0, now - this.realStartedAt);
    const elapsedGameMs = Math.floor(elapsedRealMs * GAME_TIME_SCALE);
    const elapsedGameMinutes = Math.floor(elapsedGameMs / 60_000);
    const gameMs = GAME_START_UTC_MS + elapsedGameMs;
    const date = new Date(gameMs);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const hour = date.getUTCHours();
    const minute = date.getUTCMinutes();
    const second = date.getUTCSeconds();
    const phase = phaseForHour(hour);
    const phaseIcon = phaseIconForHour(hour);

    return {
      elapsedGameMs,
      elapsedGameMinutes,
      year,
      month,
      day,
      hour,
      minute,
      second,
      phase,
      phaseIcon,
      speed: GAME_TIME_SCALE,
      label: `${pad2(day)}.${pad2(month)}.${year} · ${pad2(hour)}:${pad2(minute)}:${pad2(second)} · ${phaseIcon} ${phase} · ×${GAME_TIME_SCALE}`
    };
  }

  start() {
    this.stop();
    this.render();
    this.timer = window.setInterval(() => this.render(), RENDER_INTERVAL_MS);
  }

  stop() {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
  }

  render() {
    const snapshot = this.snapshot();
    if (this.element) {
      this.element.textContent = snapshot.label;
      this.element.title = 'Game Clock: ×12; 1 игровая минута = 5 реальных секунд. Только отображение — gameplay timers остаются real-time.';
    }
    return snapshot;
  }
}

export {
  GAME_START_UTC_MS,
  REAL_MS_PER_GAME_MINUTE,
  GAME_TIME_SCALE,
  RENDER_INTERVAL_MS,
  phaseForHour,
  phaseIconForHour
};
