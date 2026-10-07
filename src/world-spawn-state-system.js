const DEFAULT_CONFIG_URL = './data/world-spawn-config.json';

function clone(value) {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function randomInt(min, max) {
  const low = Math.ceil(Number(min) || 0);
  const high = Math.floor(Number(max) || low);
  return Math.floor(Math.random() * (Math.max(low, high) - low + 1)) + low;
}

function weightedTier(weights = {}) {
  const entries = Object.entries(weights)
    .map(([tier, raw]) => [tier, Number(raw)])
    .filter(([, weight]) => Number.isFinite(weight) && weight > 0);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  if (!entries.length || total <= 0) return 'T1';

  let roll = Math.random() * total;
  for (const [tier, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return tier;
  }
  return entries[entries.length - 1][0];
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
  constructor({ worldGraph, eventSystem, onStateChange, configUrl = DEFAULT_CONFIG_URL } = {}) {
    this.worldGraph = worldGraph;
    this.eventSystem = eventSystem;
    this.onStateChange = onStateChange;
    this.configUrl = configUrl;
    this.config = null;
    this.state = normalizeSnapshot(null);
    this.initialized = false;
    this.currentZoneId = null;
    this.nextTickAt = 0;

    this.eventSystem?.on('zone:enter', ({ zone }) => {
      this.currentZoneId = zone?.id || null;
    });
  }

  async loadConfig() {
    if (this.config) return this.config;
    const response = await fetch(this.configUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`WorldSpawn config failed: ${response.status}`);
    this.config = await response.json();
    return this.config;
  }

  async initialize(snapshot = null, now = Date.now()) {
    await this.loadConfig();
    this.state = normalizeSnapshot(snapshot);
    this.initialized = true;

    let changed = false;
    for (const zone of this.worldGraph?.zones?.values?.() || []) {
      if (zone?.isSafeCity === true) continue;
      if (this.ensureLocationTier(zone, now, false)) changed = true;
    }

    this.state.updatedAt = Number(this.state.updatedAt) || now;
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

  getLocationTier(zoneId) {
    return this.getZoneState(zoneId);
  }

  getSpawnCapacity(zoneId) {
    return Math.max(0, Number(this.getZoneState(zoneId)?.spawnCapacity) || 0);
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

  distanceBand(distance) {
    const value = Number(distance);
    return (this.config?.distanceBands || []).find((band) =>
      value >= Number(band.min) && value <= Number(band.max)
    ) || this.config?.distanceBands?.[0] || null;
  }

  rollLocationTier(zone, now = Date.now()) {
    const distance = this.worldGraph?.distanceFromSafeCity?.(zone.id);
    const band = this.distanceBand(distance);
    const tierId = weightedTier(band?.weights || { T1: 100 });
    const tier = this.config?.locationTiers?.[tierId] || this.config?.locationTiers?.T1;
    const lifetimeMinutes = randomInt(tier?.lifetimeMinutesMin, tier?.lifetimeMinutesMax);
    const spawnCapacity = randomInt(tier?.spawnMin, tier?.spawnMax);

    return {
      stateId: `${zone.id}-${now}-${Math.random().toString(36).slice(2, 8)}`,
      zoneId: zone.id,
      tier: tierId,
      tierLevel: Number(tier?.level) || 1,
      tierLabel: tier?.label || tierId,
      spawnedAt: now,
      expiresAt: now + lifetimeMinutes * 60_000,
      lifetimeMinutes,
      spawnCapacity,
      locationBonus: Number(tier?.locationBonus) || 0,
      distanceFromSafeCity: Number.isFinite(Number(distance)) ? Number(distance) : null,
      biome: zone.biome || null,
      resourceDirections: this.worldGraph?.resourceDirectionsFor?.(zone.id) || [],
      balanceStatus: this.config?.status || 'candidate-balance'
    };
  }

  ensureLocationTier(zone, now = Date.now(), publish = true) {
    if (!zone?.id || zone.isSafeCity === true) return false;
    const existing = this.state.zones?.[zone.id];
    const valid = existing
      && this.config?.locationTiers?.[existing.tier]
      && Number.isFinite(Number(existing.expiresAt))
      && Number(existing.expiresAt) > now;

    if (valid) return false;

    const next = this.rollLocationTier(zone, now);
    this.setZoneState(zone.id, next, { publish: false });
    if (publish) this.publish();
    this.eventSystem?.emit('location-tier:changed', { zone, state: clone(next) });
    return true;
  }

  update(now = Date.now()) {
    if (!this.initialized || now < this.nextTickAt) return false;
    this.nextTickAt = now + 1000;

    let changed = false;
    for (const zone of this.worldGraph?.zones?.values?.() || []) {
      if (zone?.isSafeCity === true) continue;
      if (this.ensureLocationTier(zone, now, false)) changed = true;
    }
    if (changed) this.publish();
    return changed;
  }

  publish() {
    if (!this.initialized) return;
    const snapshot = this.snapshot();
    this.onStateChange?.(snapshot);
    this.eventSystem?.emit('world-spawn:state', { state: snapshot });
  }
}
