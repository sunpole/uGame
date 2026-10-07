function clone(value) {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function normalizeSnapshot(value) {
  const fallback = {
    schemaVersion: 1,
    zones: {},
    activeMasterSpawns: [],
    activeCountsByResourceAndTier: {},
    rotations: {},
    updatedAt: 0
  };

  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;

  try {
    const source = clone(value);
    return {
      schemaVersion: 1,
      zones: source.zones && typeof source.zones === 'object' && !Array.isArray(source.zones)
        ? source.zones
        : {},
      activeMasterSpawns: Array.isArray(source.activeMasterSpawns)
        ? source.activeMasterSpawns
        : [],
      activeCountsByResourceAndTier: source.activeCountsByResourceAndTier
        && typeof source.activeCountsByResourceAndTier === 'object'
        && !Array.isArray(source.activeCountsByResourceAndTier)
          ? source.activeCountsByResourceAndTier
          : {},
      rotations: source.rotations && typeof source.rotations === 'object' && !Array.isArray(source.rotations)
        ? source.rotations
        : {},
      updatedAt: Number.isFinite(Number(source.updatedAt)) ? Number(source.updatedAt) : 0
    };
  } catch {
    return fallback;
  }
}

export class WorldSpawnStateSystem {
  constructor({ worldGraph, eventSystem, onStateChange } = {}) {
    this.worldGraph = worldGraph;
    this.eventSystem = eventSystem;
    this.onStateChange = onStateChange;
    this.state = normalizeSnapshot(null);
    this.initialized = false;
    this.currentZoneId = null;

    this.eventSystem?.on('zone:enter', ({ zone }) => {
      this.currentZoneId = zone?.id || null;
    });
  }

  initialize(snapshot = null) {
    this.state = normalizeSnapshot(snapshot);
    this.initialized = true;
    this.publish();
    return this.snapshot();
  }

  snapshot() {
    return clone(this.state);
  }

  getZoneState(zoneId) {
    const id = this.worldGraph?.resolveZoneId?.(zoneId) || String(zoneId || '');
    if (!id) return null;
    const value = this.state.zones?.[id];
    return value ? clone(value) : null;
  }

  setZoneState(zoneId, value, { publish = true } = {}) {
    const id = this.worldGraph?.resolveZoneId?.(zoneId) || String(zoneId || '');
    if (!id) return null;
    if (!this.state.zones || typeof this.state.zones !== 'object') this.state.zones = {};

    if (value === null || value === undefined) delete this.state.zones[id];
    else this.state.zones[id] = clone(value);

    this.state.updatedAt = Date.now();
    if (publish) this.publish();
    return this.getZoneState(id);
  }

  patchZoneState(zoneId, patch = {}, options = {}) {
    const current = this.getZoneState(zoneId) || {};
    return this.setZoneState(zoneId, { ...current, ...clone(patch) }, options);
  }

  publish() {
    if (!this.initialized) return;
    const snapshot = this.snapshot();
    this.onStateChange?.(snapshot);
    this.eventSystem?.emit('world-spawn:state', { state: snapshot });
  }
}
