export const GAME_STATE_SCHEMA_VERSION = 1;

function cleanCounts(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result = {};
  for (const [key, raw] of Object.entries(value)) {
    const count = Number(raw);
    if (!key || !Number.isFinite(count) || count < 0) continue;
    result[key] = count;
  }
  return result;
}

function cleanStringList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item) => typeof item === 'string' && item.length > 0))];
}

function cleanQuestState(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return {
    activeId: typeof value.activeId === 'string' && value.activeId ? value.activeId : null,
    stepIndex: Number.isInteger(value.stepIndex) && value.stepIndex >= 0 ? value.stepIndex : 0,
    completed: cleanStringList(value.completed),
    seenSignals: cleanStringList(value.seenSignals),
    lastCompletedTitle: typeof value.lastCompletedTitle === 'string' ? value.lastCompletedTitle : ''
  };
}

function cleanDynamicEvents(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { zones: {} };
  const zones = value.zones;
  if (!zones || typeof zones !== 'object' || Array.isArray(zones)) return { zones: {} };

  try {
    return JSON.parse(JSON.stringify({ zones }));
  } catch {
    return { zones: {} };
  }
}

export function createDefaultGameState() {
  return {
    schemaVersion: GAME_STATE_SCHEMA_VERSION,
    player: {
      classId: 'wanderer'
    },
    world: {
      zoneId: 'zone-001',
      entry: 'left',
      usedInteractables: []
    },
    resources: {},
    inventory: {},
    quests: null,
    dynamicEvents: {
      zones: {}
    }
  };
}

export function normalizeGameState(input) {
  const defaults = createDefaultGameState();
  if (!input || typeof input !== 'object' || Array.isArray(input)) return defaults;
  if (input.schemaVersion !== GAME_STATE_SCHEMA_VERSION) return defaults;

  const zoneId = input.world?.zoneId;
  const validZoneId = (typeof zoneId === 'number' && Number.isFinite(zoneId)) || (typeof zoneId === 'string' && zoneId);

  return {
    schemaVersion: GAME_STATE_SCHEMA_VERSION,
    player: {
      classId: typeof input.player?.classId === 'string' && input.player.classId
        ? input.player.classId
        : defaults.player.classId
    },
    world: {
      zoneId: validZoneId ? zoneId : defaults.world.zoneId,
      entry: typeof input.world?.entry === 'string' && input.world.entry
        ? input.world.entry
        : defaults.world.entry,
      usedInteractables: cleanStringList(input.world?.usedInteractables)
    },
    resources: cleanCounts(input.resources),
    inventory: cleanCounts(input.inventory),
    quests: cleanQuestState(input.quests),
    dynamicEvents: cleanDynamicEvents(input.dynamicEvents)
  };
}

export class GameState {
  constructor(initialState = null) {
    this.state = normalizeGameState(initialState);
  }

  snapshot() {
    return typeof structuredClone === 'function'
      ? structuredClone(this.state)
      : JSON.parse(JSON.stringify(this.state));
  }

  setClassId(classId) {
    if (typeof classId !== 'string' || !classId) return;
    this.state.player.classId = classId;
  }

  setZone(zoneId, entry = this.state.world.entry) {
    if (zoneId !== undefined && zoneId !== null) this.state.world.zoneId = zoneId;
    if (typeof entry === 'string' && entry) this.state.world.entry = entry;
  }

  markInteractableUsed(id) {
    if (typeof id !== 'string' || !id) return;
    if (!this.state.world.usedInteractables.includes(id)) {
      this.state.world.usedInteractables.push(id);
    }
  }

  isInteractableUsed(id) {
    return this.state.world.usedInteractables.includes(id);
  }

  setResources(snapshot) {
    this.state.resources = cleanCounts(snapshot);
  }

  setInventory(snapshot) {
    this.state.inventory = cleanCounts(snapshot);
  }

  setQuestState(snapshot) {
    this.state.quests = cleanQuestState(snapshot);
  }

  setDynamicEvents(snapshot) {
    this.state.dynamicEvents = cleanDynamicEvents(snapshot);
  }
}
