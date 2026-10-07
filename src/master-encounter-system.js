function formatRemaining(ms) {
  const total = Math.max(0, Math.ceil(Number(ms || 0) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
}

export class MasterEncounterSystem {
  constructor({ worldGraph, zoneSystem, interactableSystem, eventSystem, worldSpawnStateSystem, masterCatalog, relationshipSystem, interactionPanel } = {}) {
    this.worldGraph = worldGraph;
    this.zoneSystem = zoneSystem;
    this.interactableSystem = interactableSystem;
    this.eventSystem = eventSystem;
    this.worldSpawnStateSystem = worldSpawnStateSystem;
    this.masterCatalog = masterCatalog;
    this.relationshipSystem = relationshipSystem;
    this.interactionPanel = interactionPanel;
    this.currentZoneId = null;
    this.renderedIds = new Set();
    this.devCycleIndexByTier = { T2: -1, T3: -1, T4: -1 };

    this.eventSystem?.on('zone:enter', ({ zone }) => {
      this.currentZoneId = zone?.id || null;
      this.renderCurrentZone();
    });
    this.eventSystem?.on('zone:leave', () => this.clearRendered());
    this.eventSystem?.on('zone:relayout', () => this.renderCurrentZone());
    this.eventSystem?.on('master-spawns:changed', () => this.renderCurrentZone());
  }

  clearRendered() {
    for (const id of this.renderedIds) this.interactableSystem?.remove?.(id);
    this.renderedIds.clear();
  }

  renderCurrentZone() {
    if (!this.currentZoneId) return;
    const zone = this.worldGraph?.getZone?.(this.currentZoneId);
    if (!zone) return;
    this.clearRendered();
    const spots = new Map((zone.eventSpots || []).map((spot) => [spot.id, spot]));
    const spawns = this.worldSpawnStateSystem?.getActiveMasters?.({ zoneId: zone.id }) || [];

    for (const spawn of spawns) {
      const spot = spots.get(spawn.spotId);
      if (!spot) continue;
      const point = this.zoneSystem?.mapPoint?.(spot) || spot;
      const master = this.masterCatalog?.get?.(spawn.masterId);
      const id = 'master-interactable:' + spawn.encounterId;
      this.interactableSystem?.add({
        id,
        type: 'master-npc',
        masterEncounterId: spawn.encounterId,
        masterId: spawn.masterId,
        masterTier: spawn.tier,
        x: point.x,
        y: point.y,
        label: master?.displayName || spawn.displayName || 'Мастер',
        prompt: 'Взаимодействовать с мастером',
        expiresAt: Number(spawn.expiresAt),
        interactionRadius: 68,
        trigger: 'action',
        sound: 'interact'
      });
      this.renderedIds.add(id);
    }
  }

  executeDevCode(code) {
    if (!['8312', '8313', '8314'].includes(code)) return { handled: false };
    const tier = 'T' + code.at(-1);
    const spawns = this.worldSpawnStateSystem?.getActiveMasters?.({ resourceDirectionId: 'stone', tier }) || [];
    if (!spawns.length) return { handled: true, message: code + ' · active ' + tier + ' master нет', state: 'reserved' };

    const nextIndex = ((this.devCycleIndexByTier[tier] ?? -1) + 1) % spawns.length;
    this.devCycleIndexByTier[tier] = nextIndex;
    const spawn = spawns[nextIndex];
    const zone = this.worldGraph?.getZone?.(spawn.zoneId);
    if (!zone) return { handled: true, message: code + ' · zone не найдена', state: 'error' };

    this.zoneSystem?.build?.(zone.id, zone.defaultEntry || null);
    const spot = (zone.eventSpots || []).find((item) => item.id === spawn.spotId);
    if (spot && this.zoneSystem?.player) {
      const point = this.zoneSystem.mapPoint?.(spot) || spot;
      const x = Math.max(20, Math.min((this.zoneSystem.width || 960) - 20, Number(point.x) + 44));
      const y = Math.max(20, Math.min((this.zoneSystem.height || 540) - 20, Number(point.y)));
      this.zoneSystem.player.setPosition(x, y);
    }

    return {
      handled: true,
      message: code + ' · TP ' + tier + ' → ' + zone.name + ' · ' + spawn.spotId,
      state: 'ok'
    };
  }

  activate(item) {
    const encounterId = item?.masterEncounterId;
    if (!encounterId) return false;
    const spawn = this.worldSpawnStateSystem?.getMasterSpawn?.(encounterId);
    if (!spawn || Number(spawn.expiresAt) <= Date.now()) return false;
    const master = this.masterCatalog?.get?.(spawn.masterId);
    const relationship = this.relationshipSystem?.meet?.(spawn.masterId, spawn.encounterId, Date.now());
    const multiplier = Number(spawn.efficiencyMultiplier || master?.efficiencyMultiplier || 1).toFixed(2);
    this.interactionPanel?.showMessage({
      title: (master?.displayName || spawn.displayName || 'Мастер') + ' · ' + spawn.tier,
      text: 'Странствующий мастер направления «Камень». Это persistent Encounter из WorldSpawnState; функциональные модули будут подключаться отдельными слоями.',
      meta: 'Эффективность ×' + multiplier + ' · встреч: ' + (relationship?.encountersCount || 0) + ' · осталось ' + formatRemaining(Number(spawn.expiresAt) - Date.now())
    });
    return true;
  }
}
