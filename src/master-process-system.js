function randomMassKg(range = {}) {
  const minUnits = Math.max(1, Math.round((Number(range.min) || 0.1) * 10));
  const maxUnits = Math.max(minUnits, Math.round((Number(range.max) || Number(range.min) || 0.1) * 10));
  const units = minUnits + Math.floor(Math.random() * (maxUnits - minUnits + 1));
  return units / 10;
}

function formatMass(value) {
  return Math.max(0, Number(value) || 0).toFixed(1) + ' кг';
}

function formatRemaining(ms) {
  const total = Math.max(0, Math.ceil(Number(ms || 0) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
}

export class MasterProcessSystem {
  constructor({
    url = './data/master-processes.json',
    relationshipSystem,
    interactionPanel,
    worldSpawnStateSystem,
    grantResource
  } = {}) {
    this.url = url;
    this.relationshipSystem = relationshipSystem;
    this.interactionPanel = interactionPanel;
    this.worldSpawnStateSystem = worldSpawnStateSystem;
    this.grantResource = grantResource;
    this.profiles = new Map();
    this.loaded = false;
    this.nextSyncAt = 0;
  }

  async load() {
    if (this.loaded) return this;
    const response = await fetch(this.url, { cache: 'no-store' });
    if (!response.ok) throw new Error('Master process config failed: ' + response.status);
    const data = await response.json();
    this.profiles.clear();
    for (const profile of data.profiles || []) {
      if (profile?.id) this.profiles.set(profile.id, profile);
    }
    this.loaded = true;
    return this;
  }

  getProfile(resourceDirectionId = 'stone') {
    return [...this.profiles.values()].find((profile) =>
      profile.resourceDirectionId === resourceDirectionId && profile.moduleId === 'extraction'
    ) || null;
  }

  update(now = Date.now(), force = false) {
    if (!force && now < this.nextSyncAt) return false;
    this.nextSyncAt = now + 1000;
    return Boolean(this.relationshipSystem?.syncProcesses?.(now));
  }

  openExtraction(spawn, now = Date.now()) {
    if (!spawn?.masterId || !spawn?.encounterId) return false;
    const profile = this.getProfile(spawn.resourceDirectionId || 'stone');
    if (!profile) return false;

    this.update(now, true);
    const pending = this.relationshipSystem?.getPendingRewards?.(spawn.masterId) || [];
    if (pending.length) {
      this.showPendingRewards(spawn.masterId, pending);
      return true;
    }

    const active = this.relationshipSystem?.getActiveProcess?.(spawn.masterId);
    if (active) {
      this.showActive(active);
      return true;
    }

    const remainingMs = Number(spawn.expiresAt) - now;
    if (remainingMs <= 1000) {
      this.interactionPanel?.showMessage({
        title: profile.label,
        text: 'До исчезновения мастера осталось слишком мало времени для запуска Process.',
        meta: 'Встреча завершается'
      });
      return true;
    }

    const configuredMs = Math.max(1000, Number(profile.durationSeconds || 60) * 1000);
    const durationMs = Math.max(1000, Math.min(configuredMs, remainingMs));
    const process = {
      processId: 'process:' + spawn.encounterId + ':' + now,
      profileId: profile.id,
      moduleId: 'extraction',
      masterId: spawn.masterId,
      encounterId: spawn.encounterId,
      resourceDirectionId: spawn.resourceDirectionId || 'stone',
      startedAt: now,
      endsAt: now + durationMs,
      encounterExpiresAt: Number(spawn.expiresAt),
      status: 'active',
      candidateBaseReward: {
        resourceId: spawn.resourceDirectionId || 'stone',
        tier: spawn.tier || 'T1',
        massKg: randomMassKg(profile.rewardRangeKg || { min: 0.1, max: 1 })
      },
      efficiencyMultiplier: Number(spawn.efficiencyMultiplier) || 1,
      locationBonus: Number(this.worldSpawnStateSystem?.getLocationSummary?.(spawn.zoneId)?.locationBonus) || 0
    };

    const started = this.relationshipSystem?.startProcess?.(spawn.masterId, process);
    if (!started) return false;
    this.showActive(started);
    return true;
  }

  rewardMassKg(pending) {
    const direct = Number(pending?.baseReward?.massKg);
    if (Number.isFinite(direct) && direct > 0) return Math.round(direct * 10) / 10;
    const legacy = Number(pending?.baseReward?.amount);
    return Math.max(0.1, Math.round((Number.isFinite(legacy) ? legacy : 1) * 10) / 10);
  }

  showPendingRewards(masterId, pendingRewards = []) {
    const actions = pendingRewards.map((pending, index) => {
      const resourceId = pending?.baseReward?.resourceId || 'stone';
      const tier = pending?.baseReward?.tier || 'T1';
      const massKg = this.rewardMassKg(pending);
      const resourceLabel = ({ stone: 'Камень', water: 'Вода', wood: 'Дерево', clay: 'Глина' })[resourceId] || resourceId;
      return {
        id: pending.rewardId,
        label: 'Забрать: ' + resourceLabel + ' ' + tier + ' · ' + formatMass(massKg),
        onSelect: () => {
          const granted = this.grantResource?.(resourceId, massKg, tier);
          if (granted === false) {
            this.interactionPanel?.showMessage({
              title: 'Награда не помещается',
              text: 'Результат Process не потерян и остаётся pending reward у этого Master.',
              meta: resourceLabel + ' ' + tier + ' · ' + formatMass(massKg)
            });
            return false;
          }
          this.relationshipSystem?.consumePendingReward?.(masterId, pending.rewardId);
          this.interactionPanel?.showMessage({
            title: 'Результат получен',
            text: 'Завершённый Process выдал ресурс. Pending reward удалён только после успешного помещения награды.',
            meta: resourceLabel + ' ' + tier + ' · ' + formatMass(massKg)
          });
          return true;
        }
      };
    });

    this.interactionPanel?.showActions({
      title: 'Добыча / готовый результат',
      text: 'Результат Process сохраняется у конкретного Master до получения.',
      actions,
      meta: 'Готовых результатов: ' + pendingRewards.length
    });
  }

  showActive(process) {
    const metaProvider = (now = Date.now()) => {
      this.update(now, true);
      const current = this.relationshipSystem?.getActiveProcess?.(process.masterId);
      if (!current || current.processId !== process.processId) {
        const pending = this.relationshipSystem?.getPendingRewards?.(process.masterId) || [];
        return pending.some((reward) => reward.processId === process.processId)
          ? 'Process завершён · результат сохранён как pending reward'
          : 'Process больше не активен';
      }
      const left = Number(current.endsAt) - now;
      return 'До завершения ' + formatRemaining(left) + ' · REAL TIME';
    };

    this.interactionPanel?.showMessage({
      title: 'Добыча / Process',
      text: 'QA Process запущен и сохранён. Его startedAt/endsAt остаются в Character↔Master state после закрытия игры.',
      meta: metaProvider(Date.now()),
      metaProvider,
      updateIntervalMs: 250
    });
  }
}
