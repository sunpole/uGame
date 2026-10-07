const DEFAULT_STORAGE_KEY = 'ugame.spawn-zone-debug.v1';

const DEFAULT_SETTINGS = Object.freeze({
  enabled: true,
  showCenters: true,
  radiusPx: 150
});

function safeStorage() {
  try { return globalThis.localStorage || null; } catch { return null; }
}

function clamp(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

function normalize(value = {}) {
  return {
    enabled: value.enabled === true,
    showCenters: value.showCenters !== false,
    radiusPx: Math.round(clamp(value.radiusPx, 10, 500, DEFAULT_SETTINGS.radiusPx))
  };
}

export class SpawnZoneDebugSystem {
  constructor({
    scene,
    worldGraph,
    zoneSystem,
    eventSystem,
    storageKey = DEFAULT_STORAGE_KEY
  } = {}) {
    this.scene = scene;
    this.worldGraph = worldGraph;
    this.zoneSystem = zoneSystem;
    this.eventSystem = eventSystem;
    this.storage = safeStorage();
    this.storageKey = storageKey;
    this.settings = this.restore();
    this.graphics = this.scene?.add?.graphics?.() || null;
    this.graphics?.setDepth?.(3);

    this.eventSystem?.on('zone:enter', () => this.renderCurrentZone());
    this.eventSystem?.on('zone:leave', () => this.clear());
    this.eventSystem?.on('zone:relayout', () => this.renderCurrentZone());
  }

  restore() {
    try {
      const raw = this.storage?.getItem(this.storageKey);
      return normalize(raw ? JSON.parse(raw) : DEFAULT_SETTINGS);
    } catch {
      return normalize(DEFAULT_SETTINGS);
    }
  }

  persist() {
    try {
      this.storage?.setItem(this.storageKey, JSON.stringify(this.settings));
    } catch {}
  }

  getSettings() {
    return { ...this.settings };
  }

  updateSettings(patch = {}) {
    this.settings = normalize({ ...this.settings, ...patch });
    this.persist();
    this.renderCurrentZone();
    return this.getSettings();
  }

  resetSettings() {
    this.settings = normalize(DEFAULT_SETTINGS);
    this.persist();
    this.renderCurrentZone();
    return this.getSettings();
  }

  clear() {
    this.graphics?.clear?.();
  }

  renderCurrentZone() {
    this.clear();
    if (!this.settings.enabled || !this.graphics) return;

    const zoneId = this.zoneSystem?.currentId || this.zoneSystem?.current?.id || null;
    const zone = zoneId ? this.worldGraph?.getZone?.(zoneId) : null;
    if (!zone) return;

    const radius = this.settings.radiusPx;
    const spots = Array.isArray(zone.eventSpots) ? zone.eventSpots : [];
    this.graphics.lineStyle(1, 0x58a6ff, 0.58);

    for (const spot of spots) {
      const point = this.zoneSystem?.mapPoint?.(spot) || spot;
      if (!Number.isFinite(Number(point?.x)) || !Number.isFinite(Number(point?.y))) continue;
      this.graphics.strokeCircle(Number(point.x), Number(point.y), radius);

      if (this.settings.showCenters) {
        this.graphics.fillStyle(0x79c0ff, 0.9);
        this.graphics.fillCircle(Number(point.x), Number(point.y), 2.5);
      }
    }
  }

  destroy() {
    this.graphics?.destroy?.();
    this.graphics = null;
  }
}

export { DEFAULT_SETTINGS as SPAWN_ZONE_DEBUG_DEFAULTS };
