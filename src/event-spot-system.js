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

  ensureZone(zone, now = Date.now()) {
    if (!zone?.id) return null;

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
    const desired = Math.min(this.rewardGenerator.activeSlots(zoneState.qualityLevel), spots.length);
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

    const desired = Math.min(this.rewardGenerator.activeSlots(zoneState.qualityLevel), spots.length);
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
    const common = {
      id: event.id,
      dynamicEventId: event.id,
      dynamicKind: event.kind,
      x: spot.x,
      y: spot.y,
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
    const selectedCount = Array.isArray(offer.selectedIndices) ? offer.selectedIndices.length : 0;
    if (selectedCount >= Number(offer.maxChoices || 1)) {
      this.consumeEvent(event);
      return true;
    }

    const isChest = event.kind === 'chest';
    const description = isChest
      ? `Появилось сундуков: ${offer.options.length}. Можно забрать: ${offer.maxChoices}. Содержимое скрыто до выбора.`
      : `Сгенерировано вариантов: ${offer.options.length}. Выбери один ресурсный результат.`;

    this.interactionPanel?.showRewardOffer({
      title: isChest ? 'Случайные сундуки' : 'Ресурсное событие',
      text: description,
      offer,
      onChoose: async (option, index) => {
        if (!Array.isArray(offer.selectedIndices)) offer.selectedIndices = [];
        if (offer.selectedIndices.includes(index)) return false;

        offer.selectedIndices.push(index);
        this.publish();

        const reward = option.reward || {};
        this.grantResource?.(reward.resourceId, Number(reward.amount) || 1);
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

    const slots = this.rewardGenerator.activeSlots(state.qualityLevel);
    const active = (state.events || []).filter((event) => !event.consumed).length;
    this.onZoneStatus?.(
      `${zone.name} · качество ${state.qualityLevel}/4 ${state.qualityLabel || ''} · события ${active}/${slots} · смена ${formatCountdown(Number(state.qualityExpiresAt) - now)}`
    );
  }

  publish() {
    if (!this.initialized) return;
    this.onStateChange?.(this.snapshot());
    this.eventSystem?.emit('dynamic-events:state', { state: this.snapshot() });
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
