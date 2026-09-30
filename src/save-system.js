import { GAME_STATE_SCHEMA_VERSION } from './game-state.js';

const DEFAULT_KEY = `ugame.save.v${GAME_STATE_SCHEMA_VERSION}`;

function browserStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

export class SaveSystem {
  constructor({ storage, key = DEFAULT_KEY, getState } = {}) {
    this.storage = storage === undefined ? browserStorage() : storage;
    this.key = key;
    this.getState = getState;
    this.blocked = false;
    this.paused = false;
    this.lastSavedAt = null;
    this.lastError = '';
  }

  load() {
    this.lastError = '';
    this.paused = false;
    if (!this.storage) return null;

    try {
      const raw = this.storage.getItem(this.key);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (!parsed || parsed.schemaVersion !== GAME_STATE_SCHEMA_VERSION) {
        this.blocked = true;
        this.lastError = 'unsupported-schema';
        return null;
      }

      this.lastSavedAt = typeof parsed.savedAt === 'string' ? parsed.savedAt : null;
      return parsed;
    } catch (error) {
      this.blocked = true;
      this.lastError = error instanceof Error ? error.message : String(error);
      return null;
    }
  }

  save(state) {
    if (!this.storage || this.blocked || this.paused || !state) return false;

    try {
      const savedAt = new Date().toISOString();
      const payload = {
        ...state,
        schemaVersion: GAME_STATE_SCHEMA_VERSION,
        savedAt
      };
      this.storage.setItem(this.key, JSON.stringify(payload));
      this.lastSavedAt = savedAt;
      this.lastError = '';
      return true;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      return false;
    }
  }

  clear() {
    if (!this.storage) return false;
    try {
      this.storage.removeItem(this.key);
      this.blocked = false;
      this.paused = true;
      this.lastSavedAt = null;
      this.lastError = '';
      return true;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      return false;
    }
  }

  statusText() {
    if (!this.storage) return 'Save недоступен в этом браузере';
    if (this.blocked) return `Save заблокирован: ${this.lastError || 'неподдерживаемая схема'}`;
    if (this.paused) return 'Save очищен и приостановлен до перезапуска';
    if (this.lastError) return `Save ошибка: ${this.lastError}`;
    if (!this.lastSavedAt) return 'Save: ещё нет сохранения';
    return `Save: ${this.lastSavedAt}`;
  }

  executeDevCode(code) {
    if (code === '9001') {
      this.paused = false;
      const state = this.getState?.();
      const ok = this.save(state);
      return {
        handled: true,
        message: ok ? '9001 · Состояние сохранено' : `9001 · ${this.statusText()}`,
        state: ok ? 'ok' : 'error'
      };
    }

    if (code === '9002') {
      const ok = this.clear();
      return {
        handled: true,
        message: ok ? '9002 · Save очищен; перезапусти игру' : `9002 · ${this.statusText()}`,
        state: ok ? 'ok' : 'error'
      };
    }

    if (code === '9099') {
      return {
        handled: true,
        message: `9099 · ${this.statusText()}`,
        state: this.lastError || this.blocked ? 'error' : 'ok'
      };
    }

    return { handled: false };
  }
}
