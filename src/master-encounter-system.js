function formatRemaining(ms) {
  const total = Math.max(0, Math.ceil(Number(ms || 0) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
}

export class MasterEncounterSystem {
  constructor({ worldGraph, zoneSystem, interactableSystem, eventSystem, worldSpawnStateSystem, masterCatalog, relationshipSystem, interactionPanel, processSystem, canMoveTo, getWanderRadius } = {}) {
    this.worldGraph = worldGraph;
    this.zoneSystem = zoneSystem;
    this.interactableSystem = interactableSystem;
    this.eventSystem = eventSystem;
    this.worldSpawnStateSystem = worldSpawnStateSystem;
    this.masterCatalog = masterCatalog;
    this.relationshipSystem = relationshipSystem;
    this.interactionPanel = interactionPanel;
    this.processSystem = processSystem;
    this.canMoveTo = canMoveTo;
    this.getWanderRadius = getWanderRadius;
    this.currentZoneId = null;
    this.renderedIds = new Set();
    this.devCycleIndexByTier = { T2: -1, T3: -1, T4: -1 };
    this.motionState = new Map();
    this.turnSpeedRadPerSec = 0.22;
    this.moveSpeedPxPerSec = 5;
    this.nextMotionUpdateAt = 0;
    this.motionIntervalMs = 50;

    this.eventSystem?.on('zone:enter', ({ zone }) => {
      this.currentZoneId = zone?.id || null;
      this.renderCurrentZone();
    });
    this.eventSystem?.on('zone:leave', () => {
      this.clearRendered();
      this.motionState.clear();
    });
    this.eventSystem?.on('zone:relayout', () => this.renderCurrentZone());
    this.eventSystem?.on('master-spawns:changed', () => this.renderCurrentZone());
  }

  clearRendered() {
    for (const id of this.renderedIds) this.interactableSystem?.remove?.(id);
    this.renderedIds.clear();
  }

  isFreeRewardAvailable(spawn) {
    if (!spawn?.masterId || !spawn?.encounterId) return false;
    return !this.relationshipSystem?.hasClaimedEncounter?.(spawn.masterId, spawn.encounterId);
  }

  refreshRewardMarkers() {
    if (!this.currentZoneId) return false;
    const spawns = this.worldSpawnStateSystem?.getActiveMasters?.({ zoneId: this.currentZoneId }) || [];
    for (const spawn of spawns) {
      const id = 'master-interactable:' + spawn.encounterId;
      this.interactableSystem?.setMasterRewardAvailable?.(id, this.isFreeRewardAvailable(spawn));
    }
    return true;
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
        masterResourceDirectionId: spawn.resourceDirectionId,
        masterRewardAvailable: this.isFreeRewardAvailable(spawn),
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

  update(now = Date.now(), deltaMs = 16.67) {
    if (!this.currentZoneId || now < this.nextMotionUpdateAt) return;
    const elapsedMs = this.nextMotionUpdateAt > 0 ? Math.max(this.motionIntervalMs, now - (this.nextMotionUpdateAt - this.motionIntervalMs)) : Number(deltaMs);
    this.nextMotionUpdateAt = now + this.motionIntervalMs;
    const zone = this.worldGraph?.getZone?.(this.currentZoneId);
    if (!zone) return;

    const spawns = this.worldSpawnStateSystem?.getActiveMasters?.({ zoneId: this.currentZoneId }) || [];
    const alive = new Set(spawns.map((spawn) => spawn.encounterId));
    for (const encounterId of this.motionState.keys()) {
      if (!alive.has(encounterId)) this.motionState.delete(encounterId);
    }

    const dt = Math.max(0, Math.min(0.12, Number(elapsedMs) / 1000 || 0));
    const pauseTranslation = Boolean(this.interactionPanel?.isOpen?.());
    const configuredRadius = Number(this.getWanderRadius?.());
    const wanderRadius = Math.max(10, Math.min(500, Number.isFinite(configuredRadius) ? configuredRadius : 150));
    const spots = new Map((zone.eventSpots || []).map((spot) => [spot.id, spot]));

    for (const spawn of spawns) {
      const id = 'master-interactable:' + spawn.encounterId;
      const spot = spots.get(spawn.spotId);
      if (!spot) continue;
      const anchor = this.zoneSystem?.mapPoint?.(spot) || spot;
      if (!Number.isFinite(Number(anchor?.x)) || !Number.isFinite(Number(anchor?.y))) continue;

      let state = this.motionState.get(spawn.encounterId);
      if (!state) {
        state = {
          anchorX: Number(anchor.x),
          anchorY: Number(anchor.y),
          x: Number(anchor.x),
          y: Number(anchor.y),
          targetX: Number(anchor.x),
          targetY: Number(anchor.y),
          angle: 0,
          targetAngle: 0,
          moving: false,
          nextMoveAt: now + 4000 + Math.random() * 8000,
          nextTurnAt: now + 3000 + Math.random() * 7000
        };
        this.motionState.set(spawn.encounterId, state);
      }

      const anchorDx = Number(anchor.x) - state.anchorX;
      const anchorDy = Number(anchor.y) - state.anchorY;
      if (Math.abs(anchorDx) > 0.01 || Math.abs(anchorDy) > 0.01) {
        state.x += anchorDx;
        state.y += anchorDy;
        state.targetX += anchorDx;
        state.targetY += anchorDy;
        state.anchorX = Number(anchor.x);
        state.anchorY = Number(anchor.y);
      }

      if (!state.moving && now >= state.nextMoveAt && !pauseTranslation) {
        const targetRadius = Math.sqrt(Math.random()) * wanderRadius * 0.9;
        const targetTheta = Math.random() * Math.PI * 2;
        state.targetX = state.anchorX + Math.cos(targetTheta) * targetRadius;
        state.targetY = state.anchorY + Math.sin(targetTheta) * targetRadius;
        state.moving = true;
      }

      const dx = state.targetX - state.x;
      const dy = state.targetY - state.y;
      const distance = Math.hypot(dx, dy);

      if (state.moving && distance > 0.5) {
        state.targetAngle = Math.atan2(dy, dx) + Math.PI / 2;
      } else if (state.moving) {
        state.moving = false;
        state.nextMoveAt = now + 6000 + Math.random() * 12000;
        state.nextTurnAt = now + 3000 + Math.random() * 7000;
      } else if (now >= state.nextTurnAt) {
        state.targetAngle = Math.random() * Math.PI * 2 - Math.PI;
        state.nextTurnAt = now + 8000 + Math.random() * 12000;
      }

      let diff = state.targetAngle - state.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const maxTurn = this.turnSpeedRadPerSec * dt;
      state.angle += Math.max(-maxTurn, Math.min(maxTurn, diff));

      if (state.moving && !pauseTranslation && distance > 0.5 && Math.abs(diff) < 0.4) {
        const step = Math.min(distance, this.moveSpeedPxPerSec * dt);
        const nextX = state.x + (dx / distance) * step;
        const nextY = state.y + (dy / distance) * step;
        const fromAnchor = Math.hypot(nextX - state.anchorX, nextY - state.anchorY);
        const allowed = fromAnchor <= wanderRadius + 0.01 && (typeof this.canMoveTo !== 'function' || this.canMoveTo(nextX, nextY));
        if (allowed) {
          state.x = nextX;
          state.y = nextY;
        } else {
          state.moving = false;
          state.targetX = state.x;
          state.targetY = state.y;
          state.nextMoveAt = now + 3000 + Math.random() * 7000;
        }
      }

      this.interactableSystem?.setItemTransform?.(id, {
        x: state.x,
        y: state.y,
        rotation: state.angle
      });
    }
  }

  teleportToSpawn(spawn) {
    if (!spawn?.zoneId) return false;
    const zone = this.worldGraph?.getZone?.(spawn.zoneId);
    if (!zone) return false;
    this.zoneSystem?.build?.(zone.id, zone.defaultEntry || null);
    const spot = (zone.eventSpots || []).find((item) => item.id === spawn.spotId);
    if (spot && this.zoneSystem?.player) {
      const point = this.zoneSystem.mapPoint?.(spot) || spot;
      const liveItem = this.interactableSystem?.getItem?.('master-interactable:' + spawn.encounterId);
      const targetX = Number.isFinite(Number(liveItem?.x)) ? Number(liveItem.x) : Number(point.x);
      const targetY = Number.isFinite(Number(liveItem?.y)) ? Number(liveItem.y) : Number(point.y);
      const x = Math.max(20, Math.min((this.zoneSystem.width || 960) - 20, targetX + 44));
      const y = Math.max(20, Math.min((this.zoneSystem.height || 540) - 20, targetY));
      this.zoneSystem.player.setPosition(x, y);
    }
    return true;
  }

  teleportToEncounter(encounterId) {
    const spawn = this.worldSpawnStateSystem?.getMasterSpawn?.(encounterId);
    return spawn ? this.teleportToSpawn(spawn) : false;
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
    const ok = this.teleportToSpawn(spawn);
    return {
      handled: true,
      message: ok ? code + ' · TP ' + tier + ' → ' + zone.name + ' · ' + spawn.spotId : code + ' · teleport failed',
      state: ok ? 'ok' : 'error'
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
    const moduleIds = Array.isArray(spawn.activeModules) ? spawn.activeModules : [];
    const moduleLabels = moduleIds.map((id) => this.masterCatalog?.moduleLabel?.(id) || id);
    const encounterMeta = (now = Date.now()) => {
      const current = this.worldSpawnStateSystem?.getMasterSpawn?.(encounterId);
      if (!current || Number(current.expiresAt) <= now) return null;
      return 'Эффективность ×' + multiplier + ' · встреч: ' + (relationship?.encountersCount || 0) + ' · осталось ' + formatRemaining(Number(current.expiresAt) - now);
    };
    const freeRewardAvailable = this.isFreeRewardAvailable(spawn);
    const actions = moduleIds.map((moduleId) => {
      const module = this.masterCatalog?.getModule?.(moduleId);
      const implemented = module?.implemented === true;
      const claimedExtraction = moduleId === 'extraction' && implemented && !freeRewardAvailable;
      return {
        id: moduleId,
        label: claimedExtraction
          ? (module?.label || moduleId) + ' · получено'
          : (module?.label || moduleId) + (implemented ? '' : ' · позже'),
        disabled: !implemented || claimedExtraction,
        hint: claimedExtraction
          ? 'Бесплатная добыча этой встречи уже получена.'
          : (implemented ? '' : 'Модуль доступен в этой встрече, но его игровая логика ещё не подключена.'),
        onSelect: moduleId === 'extraction' && implemented && !claimedExtraction
          ? () => this.processSystem?.openExtraction?.(spawn)
          : null
      };
    });
    this.interactionPanel?.showActions({
      title: (master?.displayName || spawn.displayName || 'Мастер') + ' · ' + spawn.tier,
      text: 'Доступные модули этой встречи: ' + (moduleLabels.join(' · ') || 'Добыча') + '. Добыча гарантирована; остальные выбираются по Tier.',
      actions,
      meta: encounterMeta(Date.now()) || 'Встреча завершена',
      metaProvider: encounterMeta,
      updateIntervalMs: 250
    });
    return true;
  }
}
