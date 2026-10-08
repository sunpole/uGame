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
        claimedEncounterIds: [],
        activeProcess: null
      };
    }
    const current = this.state.masters[masterId];
    if (!Array.isArray(current.pendingRewards)) current.pendingRewards = [];
    if (!Array.isArray(current.seenEncounterIds)) current.seenEncounterIds = [];
    if (!Array.isArray(current.claimedEncounterIds)) current.claimedEncounterIds = [];
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

  getPendingRewards(masterId) {
    const current = this.state.masters?.[masterId];
    return Array.isArray(current?.pendingRewards) ? clone(current.pendingRewards) : [];
  }

  hasClaimedEncounter(masterId, encounterId) {
    if (!masterId || !encounterId) return false;
    const current = this.state.masters?.[masterId];
    return Array.isArray(current?.claimedEncounterIds) && current.claimedEncounterIds.includes(encounterId);
  }

  markEncounterRewardClaimed(masterId, encounterId) {
    if (!masterId || !encounterId) return false;
    const current = this.ensureMaster(masterId);
    if (!current) return false;
    if (!Array.isArray(current.claimedEncounterIds)) current.claimedEncounterIds = [];
    if (current.claimedEncounterIds.includes(encounterId)) return false;
    current.claimedEncounterIds.push(encounterId);
    current.claimedEncounterIds = current.claimedEncounterIds.slice(-200);
    this.publish();
    return true;
  }

  consumePendingReward(masterId, rewardId, fallbackEncounterId = null) {
    const current = this.state.masters?.[masterId];
    if (!current || !Array.isArray(current.pendingRewards)) return null;
    const index = current.pendingRewards.findIndex((reward) => reward.rewardId === rewardId);
    if (index < 0) return null;
    const [removed] = current.pendingRewards.splice(index, 1);
    const encounterId = removed?.encounterId || fallbackEncounterId;
    if (!Array.isArray(current.claimedEncounterIds)) current.claimedEncounterIds = [];
    if (encounterId && !current.claimedEncounterIds.includes(encounterId)) {
      current.claimedEncounterIds.push(encounterId);
      current.claimedEncounterIds = current.claimedEncounterIds.slice(-200);
    }
    this.publish();
    return clone(removed);
  }

  syncProcesses(now = Date.now()) {
    let changed = false;
    for (const current of Object.values(this.state.masters || {})) {
      const process = current?.activeProcess;
      if (!process?.processId) continue;
      const endsAt = Number(process.endsAt) || 0;
      const encounterExpiresAt = Number(process.encounterExpiresAt) || 0;
      if (endsAt > now) continue;

      current.activeProcess = null;
      changed = true;

      if (encounterExpiresAt && endsAt > encounterExpiresAt) {
        current.cancelledProcessesCount = Math.max(0, Number(current.cancelledProcessesCount) || 0) + 1;
        continue;
      }

      if (!Array.isArray(current.pendingRewards)) current.pendingRewards = [];
      const rewardId = 'pending:' + process.processId;
      if (!current.pendingRewards.some((reward) => reward.rewardId === rewardId)) {
        current.pendingRewards.push({
          rewardId,
          source: 'master-process',
          processId: process.processId,
          profileId: process.profileId,
          moduleId: process.moduleId,
          encounterId: process.encounterId || null,
          resourceDirectionId: process.resourceDirectionId,
          completedAt: endsAt || now,
          baseReward: clone(process.candidateBaseReward || { resourceId: 'stone', amount: 1 }),
          locationBonus: Number(process.locationBonus) || 0,
          efficiencyMultiplier: Number(process.efficiencyMultiplier) || 1
        });
      }
    }
    if (changed) this.publish();
    return changed;
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
