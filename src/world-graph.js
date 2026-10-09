export class WorldGraph {
  constructor() {
    this.schemaVersion = 0;
    this.start = { zoneId: null, entryId: null };
    this.zones = new Map();
    this.zoneAliases = new Map();
    this.transitions = new Map();
    this.transitionsByZone = new Map();
    this.neighborsByZone = new Map();
    this.distanceToSafeCity = new Map();
  }

  async load(url = './data/world.json') {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`WorldGraph load failed: ${response.status}`);
    const data = await response.json();
    this.use(data);
    return this;
  }

  use(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('WorldGraph data must be an object');
    }

    const zones = Array.isArray(data.zones) ? data.zones : [];
    const transitions = Array.isArray(data.transitions) ? data.transitions : [];
    if (!zones.length) throw new Error('WorldGraph requires at least one zone');

    this.schemaVersion = Number(data.schemaVersion) || 1;
    this.zones.clear();
    this.zoneAliases.clear();
    this.transitions.clear();
    this.transitionsByZone.clear();
    this.neighborsByZone.clear();
    this.distanceToSafeCity.clear();

    for (const zone of zones) {
      if (!zone || typeof zone.id !== 'string' || !zone.id) {
        throw new Error('WorldGraph zone requires a stable string id');
      }
      if (this.zones.has(zone.id)) throw new Error(`Duplicate zone id: ${zone.id}`);

      this.zones.set(zone.id, zone);
      this.neighborsByZone.set(zone.id, new Set());
      this.zoneAliases.set(String(zone.id), zone.id);
      for (const alias of zone.legacyIds || []) {
        this.zoneAliases.set(String(alias), zone.id);
      }
    }

    for (const transition of transitions) {
      if (!transition || typeof transition.id !== 'string' || !transition.id) {
        throw new Error('WorldGraph transition requires a stable string id');
      }
      if (this.transitions.has(transition.id)) {
        throw new Error(`Duplicate transition id: ${transition.id}`);
      }

      const fromZoneId = this.resolveZoneId(transition.from?.zoneId);
      const toZoneId = this.resolveZoneId(transition.to?.zoneId);
      if (!fromZoneId || !toZoneId) {
        throw new Error(`Transition ${transition.id} references an unknown zone`);
      }

      const normalized = {
        ...transition,
        from: { ...transition.from, zoneId: fromZoneId },
        to: { ...transition.to, zoneId: toZoneId }
      };

      this.transitions.set(normalized.id, normalized);
      if (!this.transitionsByZone.has(fromZoneId)) this.transitionsByZone.set(fromZoneId, []);
      this.transitionsByZone.get(fromZoneId).push(normalized);
      this.neighborsByZone.get(fromZoneId).add(toZoneId);
      this.neighborsByZone.get(toZoneId).add(fromZoneId);
    }

    // Cache nearest-city distances in one multi-source BFS for the expanded world.
    const queue = [];
    for (const zone of this.zones.values()) {
      if (zone.isSafeCity === true) {
        this.distanceToSafeCity.set(zone.id, 0);
        queue.push(zone.id);
      }
    }
    for (let index = 0; index < queue.length; index += 1) {
      const fromId = queue[index];
      const nextDistance = this.distanceToSafeCity.get(fromId) + 1;
      for (const adjacentId of this.neighborsByZone.get(fromId) || []) {
        if (this.distanceToSafeCity.has(adjacentId)) continue;
        this.distanceToSafeCity.set(adjacentId, nextDistance);
        queue.push(adjacentId);
      }
    }

    const requestedStartId = this.resolveZoneId(data.start?.zoneId);
    const zoneId = requestedStartId || zones[0].id;
    const entryId = this.resolveEntryId(zoneId, data.start?.entryId);
    this.start = { zoneId, entryId };
  }

  resolveZoneId(value) {
    if (value === undefined || value === null) return null;
    return this.zoneAliases.get(String(value)) || null;
  }

  getZone(value) {
    const id = this.resolveZoneId(value);
    return id ? this.zones.get(id) || null : null;
  }

  resolveEntryId(zoneValue, entryId) {
    const zone = this.getZone(zoneValue);
    if (!zone) return null;
    const aliases = { left: 'nw', right: 'se', top: 'ne', bottom: 'sw' };
    const requested = typeof entryId === 'string' ? (aliases[entryId] || entryId) : null;
    if (requested && zone.entries?.[requested]) return requested;
    if (typeof zone.defaultEntry === 'string' && zone.entries?.[zone.defaultEntry]) return zone.defaultEntry;
    return Object.keys(zone.entries || {})[0] || null;
  }

  getEntry(zoneValue, entryId) {
    const zone = this.getZone(zoneValue);
    if (!zone) return null;
    const resolved = this.resolveEntryId(zone.id, entryId);
    return resolved ? { id: resolved, ...zone.entries[resolved] } : null;
  }

  getTransition(id) {
    return typeof id === 'string' ? this.transitions.get(id) || null : null;
  }

  getTransitionsFrom(zoneValue) {
    const zoneId = this.resolveZoneId(zoneValue);
    if (!zoneId) return [];
    return [...(this.transitionsByZone.get(zoneId) || [])];
  }

  getNeighborZoneIds(zoneValue) {
    const zoneId = this.resolveZoneId(zoneValue);
    if (!zoneId) return [];
    return [...(this.neighborsByZone.get(zoneId) || [])];
  }

  shortestDistance(fromValue, toValue) {
    const from = this.resolveZoneId(fromValue);
    const to = this.resolveZoneId(toValue);
    if (!from || !to) return Infinity;
    if (from === to) return 0;

    const visited = new Set([from]);
    const queue = [{ id: from, distance: 0 }];

    while (queue.length) {
      const current = queue.shift();
      for (const neighbor of this.getNeighborZoneIds(current.id)) {
        if (visited.has(neighbor)) continue;
        if (neighbor === to) return current.distance + 1;
        visited.add(neighbor);
        queue.push({ id: neighbor, distance: current.distance + 1 });
      }
    }

    return Infinity;
  }

  getSafeCityZones() {
    return [...this.zones.values()].filter((zone) => zone?.isSafeCity === true);
  }

  distanceFromSafeCity(zoneValue) {
    const zoneId = this.resolveZoneId(zoneValue);
    if (!zoneId) return Infinity;
    return this.distanceToSafeCity.get(zoneId) ?? Infinity;
  }

  resourceDirectionsFor(zoneValue) {
    const zone = this.getZone(zoneValue);
    if (!zone) return [];
    return Array.isArray(zone.resourceDirections)
      ? [...new Set(zone.resourceDirections.filter((id) => typeof id === 'string' && id))]
      : [];
  }
}
