function clone(value) {
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function normalize(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { schemaVersion: 1, masters: {} };
  const masters = value.masters && typeof value.masters === 'object' && !Array.isArray(value.masters) ? value.masters : {};
  return { schemaVersion: 1, masters: clone(masters) };
}

export class CharacterMasterRelationshipSystem {
  constructor({ onStateChange } = {}) {
    this.onStateChange = onStateChange;
    this.state = normalize(null);
    this.initialized = false;
  }

  initialize(snapshot = null) {
    this.state = normalize(snapshot);
    this.initialized = true;
    this.publish();
    return this.snapshot();
  }

  snapshot() { return clone(this.state); }

  get(masterId) {
    const value = this.state.masters?.[masterId];
    return value ? clone(value) : null;
  }

  ensureMaster(masterId) {
    if (!masterId) return null;
    if (!this.state.masters) this.state.masters = {};
    if (!this.state.masters[masterId]) {
      this.state.masters[masterId] = {
        masterId,
        relationshipXp: 0,
        relationshipLevel: 0,
        encountersCount: 0,
        completedNpcQuestIds: [],
        dialogueFlags: [],
        firstMetAt: null,
        lastMetAt: null,
        specialFlags: [],
        pendingRewards: [],
        seenEncounterIds: [],
        activeProcess: null
      };
    }
    const current = this.state.masters[masterId];
    if (!Array.isArray(current.pendingRewards)) current.pendingRewards = [];
    if (!Array.isArray(current.seenEncounterIds)) current.seenEncounterIds = [];
    if (!Object.prototype.hasOwnProperty.call(current, 'activeProcess')) current.activeProcess = null;
    return current;
  }

  getActiveProcess(masterId) {
    const current = this.state.masters?.[masterId];
    return current?.activeProcess ? clone(current.activeProcess) : null;
  }

  startProcess(masterId, process) {
    const current = this.ensureMaster(masterId);
    if (!current || current.activeProcess || !process?.processId) return null;
    current.activeProcess = clone(process);
    this.publish();
    return clone(current.activeProcess);
  }

  meet(masterId, encounterId, now = Date.now()) {
    if (!masterId) return null;
    const current = this.ensureMaster(masterId);

    const seen = Array.isArray(current.seenEncounterIds) ? current.seenEncounterIds : [];
    const firstEncounter = encounterId && !seen.includes(encounterId);
    if (firstEncounter) {
      seen.push(encounterId);
      current.encountersCount = Math.max(0, Number(current.encountersCount) || 0) + 1;
    }
    current.seenEncounterIds = seen.slice(-200);
    current.firstMetAt = current.firstMetAt || now;
    current.lastMetAt = now;
    this.state.masters[masterId] = current;
    this.publish();
    return clone(current);
  }

  publish() {
    if (!this.initialized) return;
    this.onStateChange?.(this.snapshot());
  }
}
