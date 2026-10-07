function clone(value) {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function shuffled(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export class EventSpotSystem {
  constructor({
    worldGraph,
    zoneSystem,
    interactableSystem,
    eventSystem,
    rewardGenerator,
    interactionPanel,
    grantResource,
    onStateChange,
    onZoneStatus
  } = {}) {
    this.worldGraph = worldGraph;
    this.zoneSystem = zoneSystem;
    this.interactableSystem = interactableSystem;
    this.eventSystem = eventSystem;
    this.rewardGenerator = rewardGenerator;
    this.interactionPanel = interactionPanel;
    this.grantResource = grantResource;
    this.onStateChange = onStateChange;
    this.onZoneStatus = onZoneStatus;

    this.state = { zones: {} };
    this.currentZoneId = null;
    this.renderedIds = new Set();
    this.initialized = false;
    this.nextTickAt = 0;

    this.eventSystem?.on('zone:enter', ({ zone }) => {
      if (!zone) return;
      this.currentZoneId = zone.id;
      if (!this.initialized) return;
      this.ensureZone(zone, Date.now());
      this.renderCurrentZone();
      this.updateZoneStatus(Date.now());
    });

    this.eventSystem?.on('zone:leave', () => {
      this.clearRendered();
    });

    this.eventSystem?.on('zone:relayout', () => {
      if (!this.initialized) return;
      this.renderCurrentZone();
    });

    this.eventSystem?.on('location-tier:changed', ({ zone }) => {
      if (!this.initialized || !zone) return;
      this.ensureZone(zone, Date.now());
      if (zone.id === this.currentZoneId) {
        this.renderCurrentZone();
        this.updateZoneStatus(Date.now());
      }
    });
  }

  initialize(snapshot = null) {
    this.state = snapshot && typeof snapshot === 'object' && snapshot.zones && typeof snapshot.zones === 'object'
      ? clone(snapshot)
      : { zones: {} };

    const now = Date.now();
    for (const zone of this.worldGraph?.zones?.values?.() || []) {
      this.ensureZone(zone, now);
    }

    this.initialized = true;
    this.publish();
    return this.snapshot();
  }

  snapshot() {
    return clone(this.state);
  }

  isExternalTierZone(zone) {
    return Boolean(zone?.id && zone.isSafeCity !== true && this.worldSpawnStateSystem?.getLocationTier?.(zone.id));
  }

  desiredSlots(zone, zoneState) {
    const spots = Array.isArray(zone?.eventSpots) ? zone.eventSpots : [];
    if (this.isExternalTierZone(zone)) {
      return Math.min(
        Math.max(0, Number(this.worldSpawnStateSystem?.getSpawnCapacity?.(zone.id)) || 0),
        spots.length
      );
    }
    return Math.min(this.rewardGenerator.activeSlots(zoneState?.qualityLevel), spots.length);
  }

  ensureZone(zone, now = Date.now()) {
    if (!zone?.id) return null;

    if (this.isExternalTierZone(zone)) {
      const locationState = this.worldSpawnStateSystem.getLocationTier(zone.id);
      const existing = this.state.zones?.[zone.id] || {};
      const stateChanged = existing.locationTierStateId !== locationState.stateId;
      const zoneState = {
        ...existing,
        qualityLevel: Number(locationState.tierLevel) || 1,
        qualityRarityId: String(locationState.tier || 'T1').toLowerCase(),
        qualityLabel: `Location ${locationState.tier || 'T1'}`,
        qualityExpiresAt: Number(locationState.expiresAt),
        locationTierStateId: locationState.stateId,
        locationTier: locationState.tier,
        locationBonus: Number(locationState.locationBonus) || 0,
        spawnCapacity: Number(locationState.spawnCapacity) || 0,
        events: Array.isArray(existing.events) ? existing.events : []
      };

      if (!this.state.zones) this.state.zones = {};
      this.state.zones[zone.id] = zoneState;
      this.refreshEvents(zone, zoneState, now);
      if (stateChanged && this.initialized) this.publish();
      return zoneState;
    }

    const existing = this.state.zones?.[zone.id];
    const qualityExpired = !existing
      || !Number.isInteger(existing.qualityLevel)
      || !Number.isFinite(Number(existing.qualityExpiresAt))
      || Number(existing.qualityExpiresAt) <= now;

    if (qualityExpired) {
      return this.rerollQuality(zone, now, false);
    }

    this.refreshEvents(zone, existing, now);
    return existing;
  }

  rerollQuality(zone, now = Date.now(), shouldPublish = true) {
    const quality = this.rewardGenerator.rollLocationQuality();
    const zoneState = {
      qualityLevel: quality.level,
      qualityRarityId: quality.rarityId,
      qualityLabel: quality.rarityLabel,
      qualityExpiresAt: now + this.rewardGenerator.locationDurationMs(quality.level),
      events: []
    };

    if (!this.state.zones) this.state.zones = {};
    this.state.zones[zone.id] = zoneState;
    this.fillEventSlots(zone, zoneState, now, true);

    if (zone.id === this.currentZoneId) {
      this.interactionPanel?.close?.();
      this.renderCurrentZone();
    }
    if (shouldPublish) this.publish();
    return zoneState;
  }

  refreshEvents(zone, zoneState, now = Date.now()) {
    const spots = Array.isArray(zone.eventSpots) ? zone.eventSpots : [];
    const spotIds = new Set(spots.map((spot) => spot.id));
    const desired = this.desiredSlots(zone, zoneState);
    let changed = false;

    if (!Array.isArray(zoneState.events)) {
      zoneState.events = [];
      changed = true;
    }

    zoneState.events = zoneState.events
      .filter((event) => event?.id && spotIds.has(event.spotId))
      .slice(0, desired);

    for (let index = 0; index < zoneState.events.length; index += 1) {
      const event = zoneState.events[index];
      if (!Number.isFinite(Number(event.expiresAt)) || Number(event.expiresAt) <= now) {
        const usedSpots = new Set(zoneState.events
          .filter((_item, otherIndex) => otherIndex !== index)
          .map((item) => item.spotId));
        const available = shuffled(spots.filter((spot) => !usedSpots.has(spot.id)));
        zoneState.events[index] = this.createEvent(zone, available[0] || spots[0], now);
        changed = true;
      }
    }

    if (zoneState.events.length < desired) {
      this.fillEventSlots(zone, zoneState, now, false);
      changed = true;
    }

    if (changed) {
      if (zone.id === this.currentZoneId) {
        this.interactionPanel?.close?.();
        this.renderCurrentZone();
      }
      this.publish();
    }
    return changed;
  }

  fillEventSlots(zone, zoneState, now = Date.now(), rebuild = false) {
    const spots = Array.isArray(zone.eventSpots) ? zone.eventSpots : [];
    if (rebuild) zoneState.events = [];

    const desired = this.desiredSlots(zone, zoneState);
    const usedSpots = new Set((zoneState.events || []).map((event) => event.spotId));
    const available = shuffled(spots.filter((spot) => !usedSpots.has(spot.id)));

    while (zoneState.events.length < desired && available.length) {
      const spot = available.shift();
      zoneState.events.push(this.createEvent(zone, spot, now));
    }
  }

  createEvent(zone, spot, now = Date.now()) {
    const nonce = Math.random().toString(36).slice(2, 8);
    return {
      id: `dynamic-${zone.id}-${now}-${nonce}`,
      spotId: spot?.id || 'spot',
      kind: this.rewardGenerator.rollEventKind(),
      spawnedAt: now,
      expiresAt: now + this.rewardGenerator.eventLifetimeMs(),
      consumed: false,
      consumedAt: null,
      offer: null
    };
  }

  getCurrentZoneState() {
    return this.currentZoneId ? this.state.zones?.[this.currentZoneId] || null : null;
  }

  eventDefinition(event, spot) {
    const mappedSpot = this.zoneSystem?.mapPoint?.(spot) || spot;
    const common = {
      id: event.id,
      dynamicEventId: event.id,
      dynamicKind: event.kind,
      x: mappedSpot.x,
      y: mappedSpot.y,
      expiresAt: Number(event.expiresAt),
      trigger: 'action',
      interactionRadius: 62,
      once: false
    };

    if (event.kind === 'chest') {
      return {
        ...common,
        type: 'chest',
        label: 'Случайный сундук',
        prompt: 'Исследовать сундук',
        sound: 'chest'
      };
    }

    if (event.kind === 'event-portal') {
      return {
        ...common,
        type: 'event-portal',
        label: 'Неизвестный портал',
        prompt: 'Осмотреть портал',
        sound: 'portal'
      };
    }

    return {
      ...common,
      type: 'resource',
      label: 'Неизвестный ресурс',
      prompt: 'Исследовать ресурс',
      sound: 'resource'
    };
  }

  renderCurrentZone() {
    if (!this.initialized || !this.currentZoneId) return;
    const zone = this.worldGraph?.getZone(this.currentZoneId);
    const zoneState = this.getCurrentZoneState();
    if (!zone || !zoneState) return;

    this.clearRendered();
    const spotsById = new Map((zone.eventSpots || []).map((spot) => [spot.id, spot]));

    for (const event of zoneState.events || []) {
      if (event.consumed) continue;
      const spot = spotsById.get(event.spotId);
      if (!spot) continue;
      const definition = this.eventDefinition(event, spot);
      this.interactableSystem?.add(definition);
      this.renderedIds.add(event.id);
    }
  }

  clearRendered() {
    for (const id of this.renderedIds) this.interactableSystem?.remove?.(id);
    this.renderedIds.clear();
  }

  findCurrentEvent(id) {
    return (this.getCurrentZoneState()?.events || []).find((event) => event.id === id) || null;
  }

  async activate(item) {
    if (!item?.dynamicEventId) return false;
    const event = this.findCurrentEvent(item.dynamicEventId);
    if (!event || event.consumed) return false;

    if (event.kind === 'event-portal') {
      this.interactionPanel?.showMessage({
        title: 'Портал событий',
        text: 'Портал реагирует на персонажа, но пока никуда не ведёт. Позже такие точки смогут открывать отдельные event-зоны: подземелья, испытания и другие временные места.',
        meta: `Активен ещё ${formatCountdown(Number(event.expiresAt) - Date.now())}`
      });
      return true;
    }

    if (!event.offer) {
      event.offer = event.kind === 'chest'
        ? this.rewardGenerator.generateChestOffer()
        : this.rewardGenerator.generateResourceOffer();
      this.publish();
    }

    const offer = event.offer;
    if (this.rewardGenerator.normalizeOfferPresentation(offer)) this.publish();
    const selectedCount = Array.isArray(offer.selectedIndices) ? offer.selectedIndices.length : 0;
    if (selectedCount >= Number(offer.maxChoices || 1)) {
      this.consumeEvent(event);
      return true;
    }

    const isChest = event.kind === 'chest';
    const restrictedChoice = Number(offer.maxChoices || 1) < offer.options.length;
    const description = isChest
      ? restrictedChoice
        ? `Появилось сундуков: ${offer.options.length}. Можно забрать: ${offer.maxChoices}. Это слепой выбор: содержимое скрыто до решения.`
        : `Появилось сундуков: ${offer.options.length}. Можно забрать все — содержимое показано сразу.`
      : restrictedChoice
        ? `Сгенерировано вариантов: ${offer.options.length}. Можно забрать: ${offer.maxChoices}. Это слепой выбор: награды скрыты до решения.`
        : `Сгенерировано вариантов: ${offer.options.length}. Можно забрать все — награды показаны сразу.`;

    this.interactionPanel?.showRewardOffer({
      title: isChest ? 'Случайные сундуки' : 'Ресурсное событие',
      text: description,
      offer,
      onChoose: async (option, index) => {
        if (!Array.isArray(offer.selectedIndices)) offer.selectedIndices = [];
        if (offer.selectedIndices.includes(index)) return false;

        const reward = option.reward || {};
        const granted = this.grantResource?.(reward.resourceId, Number(reward.amount) || 1);
        if (granted === false) return false;

        offer.selectedIndices.push(index);
        this.publish();

        this.eventSystem?.emit('dynamic-event:reward', {
          eventId: event.id,
          kind: event.kind,
          reward: clone(reward)
        });
        return true;
      },
      onComplete: () => {
        this.consumeEvent(event);
      }
    });

    return true;
  }

  consumeEvent(event) {
    if (!event || event.consumed) return;
    event.consumed = true;
    event.consumedAt = Date.now();
    this.interactableSystem?.remove?.(event.id);
    this.renderedIds.delete(event.id);
    this.publish();
    this.updateZoneStatus(Date.now());
  }

  update(now = Date.now()) {
    if (!this.initialized || now < this.nextTickAt) return;
    this.nextTickAt = now + 1000;

    let changedAny = false;
    for (const zone of this.worldGraph?.zones?.values?.() || []) {
      if (this.isExternalTierZone(zone)) {
        const beforeId = this.state.zones?.[zone.id]?.locationTierStateId || null;
        const zoneState = this.ensureZone(zone, now);
        if (beforeId !== zoneState?.locationTierStateId) changedAny = true;
        continue;
      }

      const zoneState = this.state.zones?.[zone.id];
      if (!zoneState || Number(zoneState.qualityExpiresAt) <= now) {
        this.rerollQuality(zone, now, false);
        changedAny = true;
        continue;
      }
      if (this.refreshEvents(zone, zoneState, now)) changedAny = true;
    }

    if (changedAny) this.publish();
    this.updateZoneStatus(now);
  }

  updateZoneStatus(now = Date.now()) {
    if (!this.currentZoneId) return;
    const zone = this.worldGraph?.getZone(this.currentZoneId);
    const state = this.getCurrentZoneState();
    if (!zone || !state) return;

    const slots = this.desiredSlots(zone, state);
    const active = (state.events || []).filter((event) => !event.consumed).length;
    if (this.isExternalTierZone(zone)) {
      const location = this.worldSpawnStateSystem.getLocationTier(zone.id);
      const bonus = Math.round((Number(location?.locationBonus) || 0) * 100);
      this.onZoneStatus?.(
        `${zone.name} · LT ${location?.tier || '?'} · spawn ${active}/${slots} · бонус +${bonus}% · Tier-state ${formatCountdown(Number(location?.expiresAt) - now)}`
      );
      return;
    }

    this.onZoneStatus?.(
      `${zone.name} · город · события ${active}/${slots} · смена ${formatCountdown(Number(state.qualityExpiresAt) - now)}`
    );
  }

  publish() {
    if (!this.initialized) return;
    this.onStateChange?.(this.snapshot());
    this.eventSystem?.emit('dynamic-events:state', { state: this.snapshot() });
  }

  forceQuality(zone, level, now = Date.now()) {
    const labels = {
      1: { id: 'normal', label: 'Обычное' },
      2: { id: 'rare', label: 'Редкое' },
      3: { id: 'magic', label: 'Магическое' },
      4: { id: 'unique', label: 'Уникальное' }
    };
    const quality = labels[level];
    if (!zone || !quality) return null;

    const zoneState = {
      qualityLevel: level,
      qualityRarityId: quality.id,
      qualityLabel: quality.label,
      qualityExpiresAt: now + this.rewardGenerator.locationDurationMs(level),
      events: []
    };

    this.state.zones[zone.id] = zoneState;
    this.fillEventSlots(zone, zoneState, now, true);

    if (zone.id === this.currentZoneId) {
      this.interactionPanel?.close?.();
      this.renderCurrentZone();
      this.updateZoneStatus(now);
    }
    this.publish();
    return zoneState;
  }

  executeDevCode(code) {
    const zone = this.currentZoneId ? this.worldGraph?.getZone(this.currentZoneId) : null;
    if (!zone) return { handled: false };

    if (code === '8201') {
      const state = this.getCurrentZoneState();
      if (!state) return { handled: true, message: '8201 · Нет состояния зоны', state: 'error' };
      this.fillEventSlots(zone, state, Date.now(), true);
      this.renderCurrentZone();
      this.publish();
      this.updateZoneStatus(Date.now());
      return { handled: true, message: '8201 · Доп. события зоны пересозданы', state: 'ok' };
    }

    if (code === '8202') {
      const state = this.rerollQuality(zone, Date.now(), true);
      this.updateZoneStatus(Date.now());
      return {
        handled: true,
        message: `8202 · Качество зоны: ${state.qualityLevel}/4 · ${state.qualityLabel}`,
        state: 'ok'
      };
    }

    if (['8211', '8212', '8213', '8214'].includes(code)) {
      const level = Number(code.at(-1));
      const state = this.forceQuality(zone, level, Date.now());
      return {
        handled: true,
        message: `${code} · DEV качество зоны: ${state.qualityLevel}/4 · событий ${state.events.length}`,
        state: 'ok'
      };
    }

    if (code === '8299') {
      const state = this.getCurrentZoneState();
      return {
        handled: true,
        message: `8299 · Q${state?.qualityLevel || '?'} · событий ${(state?.events || []).filter((event) => !event.consumed).length}`,
        state: 'ok'
      };
    }

    return { handled: false };
  }
}

export { formatCountdown };
