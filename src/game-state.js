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

function cleanWorldSpawnState(value) {
  const fallback = {
    schemaVersion: 1,
    zones: {},
    activeMasterSpawns: [],
    activeCountsByResourceAndTier: {},
    rotations: {},
    candidatePools: {},
    recentMasterSpotIdsByZone: {},
    allocationAudit: [],
    updatedAt: 0
  };

  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;

  try {
    const copy = JSON.parse(JSON.stringify(value));
    return {
      schemaVersion: 1,
      zones: copy.zones && typeof copy.zones === 'object' && !Array.isArray(copy.zones) ? copy.zones : {},
      activeMasterSpawns: Array.isArray(copy.activeMasterSpawns) ? copy.activeMasterSpawns : [],
      activeCountsByResourceAndTier: copy.activeCountsByResourceAndTier
        && typeof copy.activeCountsByResourceAndTier === 'object'
        && !Array.isArray(copy.activeCountsByResourceAndTier)
          ? copy.activeCountsByResourceAndTier
          : {},
      rotations: copy.rotations && typeof copy.rotations === 'object' && !Array.isArray(copy.rotations)
        ? copy.rotations
        : {},
      candidatePools: copy.candidatePools && typeof copy.candidatePools === 'object' && !Array.isArray(copy.candidatePools)
        ? copy.candidatePools
        : {},
      recentMasterSpotIdsByZone: copy.recentMasterSpotIdsByZone
        && typeof copy.recentMasterSpotIdsByZone === 'object'
        && !Array.isArray(copy.recentMasterSpotIdsByZone)
          ? copy.recentMasterSpotIdsByZone
          : {},
      allocationAudit: Array.isArray(copy.allocationAudit) ? copy.allocationAudit.slice(-100) : [],
      updatedAt: Number.isFinite(Number(copy.updatedAt)) ? Number(copy.updatedAt) : 0
    };
  } catch {
    return fallback;
  }
}

function cleanStepEconomy(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    schemaVersion: 1,
    balance: Math.max(0, Number.isFinite(Number(source.balance)) ? Number(source.balance) : 10000),
    debt: Math.max(0, Number.isFinite(Number(source.debt)) ? Number(source.debt) : 0),
    lastRegenAt: Number.isFinite(Number(source.lastRegenAt)) ? Number(source.lastRegenAt) : Date.now()
  };
}

function cleanMasterRelationships(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { schemaVersion: 1, masters: {} };
  const masters = value.masters;
  if (!masters || typeof masters !== 'object' || Array.isArray(masters)) return { schemaVersion: 1, masters: {} };
  try {
    return JSON.parse(JSON.stringify({ schemaVersion: 1, masters }));
  } catch {
    return { schemaVersion: 1, masters: {} };
  }
}

function cleanContainers(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { schemaVersion: 1, containers: {} };
  }

  const containers = value.containers;
  if (!containers || typeof containers !== 'object' || Array.isArray(containers)) {
    return { schemaVersion: 1, containers: {} };
  }

  try {
    return JSON.parse(JSON.stringify({
      schemaVersion: 1,
      containers
    }));
  } catch {
    return { schemaVersion: 1, containers: {} };
  }
}


function cleanMasterActivities(value) {
  const source=value && typeof value==='object' && !Array.isArray(value) ? value : {};
  const encounters=source.encounters && typeof source.encounters==='object' && !Array.isArray(source.encounters)
    ? source.encounters : {};
  return {schemaVersion:1,encounters:typeof structuredClone==='function'
    ? structuredClone(encounters):JSON.parse(JSON.stringify(encounters))};
}

function cleanResourceProfessions(value) {
  const source=value && typeof value==='object' && !Array.isArray(value) ? value : {};
  return {
    schemaVersion:1,
    directions:source.directions && typeof source.directions==='object' && !Array.isArray(source.directions)
      ? (typeof structuredClone==='function'?structuredClone(source.directions):JSON.parse(JSON.stringify(source.directions)))
      : {}
  };
}

function cleanResourceExpedition(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    schemaVersion: 1,
    usedEncounterIds: Array.isArray(source.usedEncounterIds)
      ? [...new Set(source.usedEncounterIds.filter((id) => typeof id === 'string' && id))].slice(-300)
      : [],
    run: source.run && typeof source.run === 'object' && !Array.isArray(source.run)
      ? (typeof structuredClone === 'function' ? structuredClone(source.run) : JSON.parse(JSON.stringify(source.run)))
      : null
  };
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
    stepEconomy: cleanStepEconomy(null),
    inventory: {},
    containers: {
      schemaVersion: 1,
      containers: {}
    },
    quests: null,
    dynamicEvents: {
      zones: {}
    },
    worldSpawnState: cleanWorldSpawnState(null),
    characterMasterRelationships: cleanMasterRelationships(null),
    resourceExpedition: cleanResourceExpedition(null),
    resourceProfessions: cleanResourceProfessions(null),
    masterActivities: cleanMasterActivities(null)
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
    stepEconomy: cleanStepEconomy(input.stepEconomy),
    inventory: cleanCounts(input.inventory),
    containers: cleanContainers(input.containers),
    quests: cleanQuestState(input.quests),
    dynamicEvents: cleanDynamicEvents(input.dynamicEvents),
    worldSpawnState: cleanWorldSpawnState(input.worldSpawnState),
    characterMasterRelationships: cleanMasterRelationships(input.characterMasterRelationships),
    resourceExpedition: cleanResourceExpedition(input.resourceExpedition),
    resourceProfessions: cleanResourceProfessions(input.resourceProfessions),
    masterActivities: cleanMasterActivities(input.masterActivities)
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

  setStepEconomy(snapshot) {
    this.state.stepEconomy = cleanStepEconomy(snapshot);
  }

  setInventory(snapshot) {
    this.state.inventory = cleanCounts(snapshot);
  }

  setContainers(snapshot) {
    this.state.containers = cleanContainers(snapshot);
  }

  setQuestState(snapshot) {
    this.state.quests = cleanQuestState(snapshot);
  }

  setDynamicEvents(snapshot) {
    this.state.dynamicEvents = cleanDynamicEvents(snapshot);
  }

  setWorldSpawnState(snapshot) {
    this.state.worldSpawnState = cleanWorldSpawnState(snapshot);
  }

  setCharacterMasterRelationships(snapshot) {
    this.state.characterMasterRelationships = cleanMasterRelationships(snapshot);
  }

  setResourceExpedition(snapshot) {
    this.state.resourceExpedition = cleanResourceExpedition(snapshot);
  }

  setResourceProfessions(snapshot) {
    this.state.resourceProfessions = cleanResourceProfessions(snapshot);
  }

  setMasterActivities(snapshot) {
    this.state.masterActivities = cleanMasterActivities(snapshot);
  }
}
