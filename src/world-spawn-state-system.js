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
    candidatePools: {},
    allocationAudit: [],
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
      candidatePools: source.candidatePools && typeof source.candidatePools === 'object' && !Array.isArray(source.candidatePools)
        ? source.candidatePools
        : {},
      allocationAudit: Array.isArray(source.allocationAudit) ? source.allocationAudit.slice(-100) : [],
      updatedAt: Number.isFinite(Number(source.updatedAt)) ? Number(source.updatedAt) : 0
    };
  } catch {
    return fallback;
  }
}

export class WorldSpawnStateSystem {
  constructor({ worldGraph, eventSystem, onStateChange, masterCatalog, configUrl = DEFAULT_CONFIG_URL } = {}) {
    this.worldGraph = worldGraph;
    this.eventSystem = eventSystem;
    this.onStateChange = onStateChange;
    this.masterCatalog = masterCatalog;
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

    this.refreshMasterSpawns(now, { publish: false });
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

  getLocationTierProbability(zoneId, tierId = null) {
    const state = this.getLocationTier(zoneId);
    const zone = this.worldGraph?.getZone?.(zoneId);
    if (!zone || zone.isSafeCity === true) return null;

    const distance = Number.isFinite(Number(state?.distanceFromSafeCity))
      ? Number(state.distanceFromSafeCity)
      : this.worldGraph?.distanceFromSafeCity?.(zone.id);
    const band = this.distanceBand(distance);
    const resolvedTier = tierId || state?.tier;
    const chance = Number(band?.weights?.[resolvedTier]);
    return Number.isFinite(chance) ? chance : null;
  }

  getLocationSummary(zoneId) {
    const zone = this.worldGraph?.getZone?.(zoneId);
    if (!zone) return null;

    if (zone.isSafeCity === true) {
      return {
        zoneId: zone.id,
        isSafeCity: true,
        tier: null,
        distanceFromSafeCity: 0,
        currentTierChance: null,
        locationBonus: 0,
        spawnCapacity: 0,
        probabilityProfile: null
      };
    }

    const state = this.getLocationTier(zone.id);
    const distance = Number.isFinite(Number(state?.distanceFromSafeCity))
      ? Number(state.distanceFromSafeCity)
      : this.worldGraph?.distanceFromSafeCity?.(zone.id);
    const band = this.distanceBand(distance);
    return {
      zoneId: zone.id,
      isSafeCity: false,
      tier: state?.tier || null,
      distanceFromSafeCity: Number.isFinite(Number(distance)) ? Number(distance) : null,
      currentTierChance: this.getLocationTierProbability(zone.id, state?.tier),
      locationBonus: Number(state?.locationBonus) || 0,
      spawnCapacity: Math.max(0, Number(state?.spawnCapacity) || 0),
      probabilityProfile: band?.weights ? clone(band.weights) : null
    };
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

  buildLocationTierState(zone, tierId, now = Date.now(), source = 'runtime-roll') {
    const distance = this.worldGraph?.distanceFromSafeCity?.(zone.id);
    const tier = this.config?.locationTiers?.[tierId] || this.config?.locationTiers?.T1;
    const resolvedTierId = this.config?.locationTiers?.[tierId] ? tierId : 'T1';
    const lifetimeMinutes = randomInt(tier?.lifetimeMinutesMin, tier?.lifetimeMinutesMax);
    const spawnCapacity = randomInt(tier?.spawnMin, tier?.spawnMax);

    return {
      stateId: `${zone.id}-${now}-${Math.random().toString(36).slice(2, 8)}`,
      zoneId: zone.id,
      tier: resolvedTierId,
      tierLevel: Number(tier?.level) || 1,
      tierLabel: tier?.label || resolvedTierId,
      spawnedAt: now,
      expiresAt: now + lifetimeMinutes * 60_000,
      lifetimeMinutes,
      spawnCapacity,
      locationBonus: Number(tier?.locationBonus) || 0,
      distanceFromSafeCity: Number.isFinite(Number(distance)) ? Number(distance) : null,
      biome: zone.biome || null,
      resourceDirections: this.worldGraph?.resourceDirectionsFor?.(zone.id) || [],
      balanceStatus: this.config?.status || 'candidate-balance',
      source
    };
  }

  rollLocationTier(zone, now = Date.now()) {
    const distance = this.worldGraph?.distanceFromSafeCity?.(zone.id);
    const band = this.distanceBand(distance);
    const tierId = weightedTier(band?.weights || { T1: 100 });
    return this.buildLocationTierState(zone, tierId, now, 'runtime-roll');
  }

  applyLocationState(zone, state, { publish = true } = {}) {
    if (!zone?.id || !state) return null;
    this.setZoneState(zone.id, state, { publish: false });
    if (publish) this.publish();
    this.eventSystem?.emit('location-tier:changed', { zone, state: clone(state) });
    return clone(state);
  }

  forceLocationTier(zone, tierId, now = Date.now()) {
    if (!zone?.id || zone.isSafeCity === true || !this.config?.locationTiers?.[tierId]) return null;
    const state = this.buildLocationTierState(zone, tierId, now, 'dev-force');
    return this.applyLocationState(zone, state);
  }

  rerollLocationTier(zone, now = Date.now()) {
    if (!zone?.id || zone.isSafeCity === true) return null;
    return this.applyLocationState(zone, this.rollLocationTier(zone, now));
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
    this.applyLocationState(zone, next, { publish });
    return true;
  }

  getActiveMasters({ resourceDirectionId = null, tier = null, zoneId = null } = {}) {
    return (this.state.activeMasterSpawns || [])
      .filter((spawn) => !resourceDirectionId || spawn.resourceDirectionId === resourceDirectionId)
      .filter((spawn) => !tier || spawn.tier === tier)
      .filter((spawn) => !zoneId || spawn.zoneId === zoneId)
      .map(clone);
  }

  getMasterSpawn(encounterId) {
    const value = (this.state.activeMasterSpawns || []).find((spawn) => spawn.encounterId === encounterId);
    return value ? clone(value) : null;
  }

  masterTierWeights(zoneId) {
    const locationTier = this.getLocationTier(zoneId)?.tier || 'T1';
    return this.config?.masterTierByLocationTier?.[locationTier] || { T1: 100 };
  }

  lowerMasterTier(tier) {
    if (tier === 'T4') return 'T3';
    if (tier === 'T3') return 'T2';
    return 'T1';
  }

  rebuildMasterCounts() {
    const counts = {};
    for (const spawn of this.state.activeMasterSpawns || []) {
      const resource = spawn.resourceDirectionId || 'unknown';
      if (!counts[resource]) counts[resource] = { T1: 0, T2: 0, T3: 0, T4: 0 };
      if (counts[resource][spawn.tier] === undefined) counts[resource][spawn.tier] = 0;
      counts[resource][spawn.tier] += 1;
    }
    this.state.activeCountsByResourceAndTier = counts;
    return counts;
  }

  rotationPick(resourceDirectionId, tier, zoneIds, limit) {
    const unique = [...new Set(zoneIds.filter(Boolean))];
    if (!unique.length || limit <= 0) return [];
    const key = resourceDirectionId + ':' + tier;
    const current = this.state.rotations?.[key] || { round: 1, visitedZoneIds: [] };
    const eligible = new Set(unique);
    let visited = (current.visitedZoneIds || []).filter((zoneId) => eligible.has(zoneId));
    let unvisited = unique.filter((zoneId) => !visited.includes(zoneId));

    if (!unvisited.length) {
      current.round = Math.max(1, Number(current.round) || 1) + 1;
      visited = [];
      unvisited = [...unique];
    }

    for (let index = unvisited.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [unvisited[index], unvisited[swap]] = [unvisited[swap], unvisited[index]];
    }

    const picked = unvisited.slice(0, limit);
    current.visitedZoneIds = [...new Set([...visited, ...picked])];
    current.lastPickedZoneIds = [...picked];
    current.updatedAt = Date.now();
    if (!this.state.rotations || typeof this.state.rotations !== 'object') this.state.rotations = {};
    this.state.rotations[key] = current;
    return picked;
  }

  chooseMasterSpot(zone, occupiedSpotIds = new Set()) {
    const spots = Array.isArray(zone?.eventSpots) ? zone.eventSpots.filter((spot) => !occupiedSpotIds.has(spot.id)) : [];
    if (!spots.length) return null;
    return spots[Math.floor(Math.random() * spots.length)]?.id || spots[0]?.id || null;
  }

  createMasterSpawn(zone, resourceDirectionId, tier, requestedTier, now, occupiedSpotIds) {
    const master = this.masterCatalog?.find?.(resourceDirectionId, tier);
    if (!master) return null;
    const lifetimeMinutes = Math.max(1, Number(this.config?.encounterLifetimeMinutes) || 30);
    const spotId = this.chooseMasterSpot(zone, occupiedSpotIds);
    if (!spotId) return null;
    occupiedSpotIds.add(spotId);
    return {
      encounterId: 'master-' + resourceDirectionId + '-' + tier + '-' + zone.id + '-' + now + '-' + Math.random().toString(36).slice(2, 7),
      masterId: master.id,
      displayName: master.displayName,
      resourceDirectionId,
      tier,
      requestedTier,
      zoneId: zone.id,
      spotId,
      spawnedAt: now,
      expiresAt: now + lifetimeMinutes * 60_000,
      efficiencyMultiplier: Number(master.efficiencyMultiplier) || 1,
      activeModules: [],
      source: 'candidate-allocator'
    };
  }

  refreshMasterSpawns(now = Date.now(), { publish = true } = {}) {
    if (!this.initialized && !this.config) return false;
    if (!this.masterCatalog?.loaded) return false;

    const before = JSON.stringify(this.state.activeMasterSpawns || []);
    const active = (this.state.activeMasterSpawns || []).filter((spawn) =>
      spawn?.encounterId && Number.isFinite(Number(spawn.expiresAt)) && Number(spawn.expiresAt) > now
    );
    this.state.activeMasterSpawns = active;
    const counts = this.rebuildMasterCounts();

    const occupiedByZone = new Map();
    for (const spawn of active) {
      if (!occupiedByZone.has(spawn.zoneId)) occupiedByZone.set(spawn.zoneId, new Set());
      occupiedByZone.get(spawn.zoneId).add(spawn.spotId);
    }

    const candidates = [];
    for (const zone of this.worldGraph?.zones?.values?.() || []) {
      if (!zone?.id || zone.isSafeCity === true) continue;
      const resources = this.worldGraph?.resourceDirectionsFor?.(zone.id) || [];
      for (const resourceDirectionId of resources) {
        const already = active.some((spawn) => spawn.zoneId === zone.id && spawn.resourceDirectionId === resourceDirectionId);
        if (already) continue;
        const requestedTier = weightedTier(this.masterTierWeights(zone.id));
        candidates.push({ zone, resourceDirectionId, currentTier: requestedTier, requestedTier });
      }
    }

    const audit = [];
    const pools = {};
    for (const tier of ['T4', 'T3', 'T2']) {
      const byResource = new Map();
      for (const candidate of candidates.filter((item) => !item.assigned && item.currentTier === tier)) {
        if (!byResource.has(candidate.resourceDirectionId)) byResource.set(candidate.resourceDirectionId, []);
        byResource.get(candidate.resourceDirectionId).push(candidate);
      }

      for (const [resourceDirectionId, pool] of byResource.entries()) {
        const cap = Math.max(0, Number(this.config?.worldCapsPerResource?.[tier]) || 0);
        const used = Number(counts?.[resourceDirectionId]?.[tier]) || 0;
        const remaining = Math.max(0, cap - used);
        const poolZoneIds = pool.map((item) => item.zone.id);
        pools[resourceDirectionId + ':' + tier] = [...poolZoneIds];
        const chosenIds = new Set(this.rotationPick(resourceDirectionId, tier, poolZoneIds, remaining));

        for (const candidate of pool) {
          if (chosenIds.has(candidate.zone.id)) {
            const occupied = occupiedByZone.get(candidate.zone.id) || new Set();
            const spawn = this.createMasterSpawn(candidate.zone, resourceDirectionId, tier, candidate.requestedTier, now, occupied);
            if (spawn) {
              if (!occupiedByZone.has(candidate.zone.id)) occupiedByZone.set(candidate.zone.id, occupied);
              this.state.activeMasterSpawns.push(spawn);
              candidate.assigned = true;
              if (!counts[resourceDirectionId]) counts[resourceDirectionId] = { T1: 0, T2: 0, T3: 0, T4: 0 };
              counts[resourceDirectionId][tier] = (counts[resourceDirectionId][tier] || 0) + 1;
              audit.push({ zoneId: candidate.zone.id, resourceDirectionId, requestedTier: candidate.requestedTier, finalTier: tier, reason: 'allocated' });
            }
          } else {
            candidate.currentTier = this.lowerMasterTier(tier);
          }
        }
      }
    }

    for (const candidate of candidates.filter((item) => !item.assigned)) {
      const tier = candidate.currentTier || 'T1';
      const occupied = occupiedByZone.get(candidate.zone.id) || new Set();
      const spawn = this.createMasterSpawn(candidate.zone, candidate.resourceDirectionId, tier, candidate.requestedTier, now, occupied);
      if (!spawn && tier !== 'T1') {
        candidate.currentTier = 'T1';
        const fallback = this.createMasterSpawn(candidate.zone, candidate.resourceDirectionId, 'T1', candidate.requestedTier, now, occupied);
        if (fallback) this.state.activeMasterSpawns.push(fallback);
        if (fallback) audit.push({ zoneId: candidate.zone.id, resourceDirectionId: candidate.resourceDirectionId, requestedTier: candidate.requestedTier, finalTier: 'T1', reason: 'fallback' });
      } else if (spawn) {
        this.state.activeMasterSpawns.push(spawn);
        audit.push({ zoneId: candidate.zone.id, resourceDirectionId: candidate.resourceDirectionId, requestedTier: candidate.requestedTier, finalTier: tier, reason: tier === candidate.requestedTier ? 'allocated' : 'fallback' });
      }
    }

    this.state.candidatePools = pools;
    this.state.allocationAudit = [...(this.state.allocationAudit || []), ...audit].slice(-100);
    this.rebuildMasterCounts();
    const changed = before !== JSON.stringify(this.state.activeMasterSpawns || []);
    if (changed) {
      this.state.updatedAt = now;
      if (publish) this.publish();
      this.eventSystem?.emit('master-spawns:changed', { spawns: this.getActiveMasters() });
    }
    return changed;
  }
  update(now = Date.now()) {
    if (!this.initialized || now < this.nextTickAt) return false;
    this.nextTickAt = now + 1000;

    let changed = false;
    for (const zone of this.worldGraph?.zones?.values?.() || []) {
      if (zone?.isSafeCity === true) continue;
      if (this.ensureLocationTier(zone, now, false)) changed = true;
    }
    if (this.refreshMasterSpawns(now, { publish: false })) changed = true;
    if (changed) this.publish();
    return changed;
  }

  executeDevCode(code) {
    if (['8300', '8302', '8303', '8304', '8399'].includes(code)) {
      if (code === '8300') {
        const all = this.getActiveMasters();
        const counts = this.state.activeCountsByResourceAndTier?.stone || {};
        return {
          handled: true,
          message: '8300 · Stone master: ' + all.length + ' · T1 ' + (counts.T1 || 0) + ' · T2 ' + (counts.T2 || 0) + ' · T3 ' + (counts.T3 || 0) + ' · T4 ' + (counts.T4 || 0),
          state: 'ok'
        };
      }

      if (['8302', '8303', '8304'].includes(code)) {
        const tier = 'T' + code.at(-1);
        const list = this.getActiveMasters({ resourceDirectionId: 'stone', tier });
        const zones = list.map((spawn) => spawn.zoneId).join(', ') || 'нет';
        return { handled: true, message: code + ' · ' + tier + ': ' + list.length + ' · ' + zones, state: 'ok' };
      }

      const poolParts = Object.entries(this.state.candidatePools || {}).map(([key, zoneIds]) => key + '=' + (zoneIds?.length || 0));
      const rotationParts = Object.entries(this.state.rotations || {}).map(([key, state]) => key + '#R' + (state.round || 1) + ':' + (state.visitedZoneIds?.length || 0));
      return {
        handled: true,
        message: '8399 · pools ' + (poolParts.join(' ') || '—') + ' · rotation ' + (rotationParts.join(' ') || '—'),
        state: 'ok'
      };
    }

    if (!['8400', '8401', '8402', '8403', '8404', '8499'].includes(code)) {
      return { handled: false };
    }

    const zone = this.currentZoneId ? this.worldGraph?.getZone(this.currentZoneId) : null;
    if (!zone) return { handled: true, message: `${code} · Нет текущей зоны`, state: 'error' };
    if (zone.isSafeCity === true) {
      return { handled: true, message: `${code} · ${zone.name}: safe city, Location Tier не используется`, state: 'reserved' };
    }

    if (code === '8400') {
      const state = this.rerollLocationTier(zone, Date.now());
      return {
        handled: true,
        message: `8400 · ${zone.name}: ${state.tier}, spawn ${state.spawnCapacity}, ${state.lifetimeMinutes} мин`,
        state: 'ok'
      };
    }

    if (['8401', '8402', '8403', '8404'].includes(code)) {
      const tierId = `T${code.at(-1)}`;
      const state = this.forceLocationTier(zone, tierId, Date.now());
      return {
        handled: true,
        message: `${code} · ${zone.name}: DEV ${state.tier}, spawn ${state.spawnCapacity}, бонус +${Math.round(state.locationBonus * 100)}%`,
        state: 'ok'
      };
    }

    const state = this.getLocationTier(zone.id);
    const remainingMin = Math.max(0, Math.ceil((Number(state?.expiresAt) - Date.now()) / 60_000));
    return {
      handled: true,
      message: `8499 · ${zone.name}: ${state?.tier || '?'} · distance ${state?.distanceFromSafeCity ?? '?'} · spawn ${state?.spawnCapacity ?? '?'} · осталось ~${remainingMin}м`,
      state: 'ok'
    };
  }

  publish() {
    if (!this.initialized) return;
    const snapshot = this.snapshot();
    this.onStateChange?.(snapshot);
    this.eventSystem?.emit('world-spawn:state', { state: snapshot });
  }
}
