export class WorldGraph {
  constructor() {
    this.schemaVersion = 0;
    this.start = { zoneId: null, entryId: null };
    this.zones = new Map();
    this.zoneAliases = new Map();
    this.transitions = new Map();
    this.transitionsByZone = new Map();
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

    for (const zone of zones) {
      if (!zone || typeof zone.id !== 'string' || !zone.id) {
        throw new Error('WorldGraph zone requires a stable string id');
      }
      if (this.zones.has(zone.id)) throw new Error(`Duplicate zone id: ${zone.id}`);

      this.zones.set(zone.id, zone);
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
    if (typeof entryId === 'string' && zone.entries?.[entryId]) return entryId;
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
}
