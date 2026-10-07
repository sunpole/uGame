export class ZoneSystem {
  constructor({
    scene,
    width,
    height,
    baseWidth = width,
    baseHeight = height,
    player,
    worldGraph,
    interactableSystem,
    eventSystem,
    onStatus,
    onZoneChange,
    isInteractableUsed
  }) {
    this.scene = scene;
    this.width = width;
    this.height = height;
    this.baseWidth = baseWidth;
    this.baseHeight = baseHeight;
    this.player = player;
    this.worldGraph = worldGraph;
    this.interactableSystem = interactableSystem;
    this.eventSystem = eventSystem;
    this.onStatus = onStatus;
    this.onZoneChange = onZoneChange;
    this.isInteractableUsed = isInteractableUsed;
    this.currentId = null;
    this.objects = [];
    this.walls = [];
    this.entryId = null;
  }

  get current() {
    return this.currentId ? this.worldGraph?.getZone(this.currentId) : null;
  }

  get offsetX() {
    return Math.max(0, (this.width - this.baseWidth) / 2);
  }

  setViewport(width, height = this.baseHeight) {
    this.width = Math.max(this.baseWidth, Number(width) || this.baseWidth);
    this.height = Math.max(1, Number(height) || this.baseHeight);
  }

  mapX(value) {
    return Number(value || 0) + this.offsetX;
  }

  mapPoint(point = {}) {
    return {
      ...point,
      x: this.mapX(point.x),
      y: Number(point.y || 0)
    };
  }

  mapDefinition(definition = {}) {
    return {
      ...definition,
      x: this.mapX(definition.x),
      y: Number(definition.y || 0),
      labelX: Number.isFinite(Number(definition.labelX)) ? this.mapX(definition.labelX) : definition.labelX,
      labelY: definition.labelY
    };
  }

  layoutZone(zone) {
    this.clear();
    this.walls = [];

    const transitions = this.worldGraph.getTransitionsFrom(zone.id);
    const openSides = new Set(transitions.map((transition) => transition.from?.side).filter(Boolean));

    this.makeBoundary('top', openSides.has('top'));
    this.makeBoundary('bottom', openSides.has('bottom'));
    this.makeBoundary('left', openSides.has('left'));
    this.makeBoundary('right', openSides.has('right'));

    for (const wall of zone.walls || []) {
      this.makeWall(this.mapX(wall.x), wall.y, wall.width, wall.height);
    }

    const interactables = (zone.interactables || []).map((definition) => ({
      ...this.mapDefinition(definition),
      used: Boolean(definition.once && this.isInteractableUsed?.(definition.id))
    }));
    const portals = transitions.map((transition) => this.portalDefinition(transition));
    this.interactableSystem?.load([...interactables, ...portals]);
  }

  build(zoneValue = this.currentId || this.worldGraph?.start?.zoneId, entryId = null) {
    const previous = this.current;
    if (this.objects.length || this.interactableSystem?.items?.length) {
      this.eventSystem?.emit('zone:leave', { zone: previous });
    }

    const zone = this.worldGraph?.getZone(zoneValue) || this.worldGraph?.getZone(this.worldGraph?.start?.zoneId);
    if (!zone) throw new Error(`Unknown zone: ${String(zoneValue)}`);

    this.currentId = zone.id;
    this.layoutZone(zone);

    const resolvedEntry = this.worldGraph.resolveEntryId(zone.id, entryId);
    const rawSpawn = this.worldGraph.getEntry(zone.id, resolvedEntry) || { x: 96, y: this.height / 2 };
    const spawn = this.resolveSpawn(rawSpawn, resolvedEntry);
    this.entryId = resolvedEntry;
    this.player.setPosition(spawn.x, spawn.y);

    const transitions = this.worldGraph.getTransitionsFrom(zone.id);
    const entryLabel = this.sideLabel(resolvedEntry);
    const exits = [...new Set(transitions.map((transition) => this.sideLabel(transition.from?.side)))];
    const exitLabel = exits.length ? exits.join(', ') : 'нет';
    this.onStatus?.(`${zone.name} · ${zone.id} · вход ${entryLabel} · выход ${exitLabel}`);
    this.onZoneChange?.(zone);
    this.eventSystem?.emit('zone:enter', { zone, entry: resolvedEntry });
    return zone;
  }

  resolveSpawn(spawn, entryId) {
    if (entryId === 'left') return { x: 96, y: spawn.y };
    if (entryId === 'right') return { x: this.width - 96, y: spawn.y };
    if (entryId === 'top' || entryId === 'bottom') return { x: this.width / 2, y: spawn.y };
    return this.mapPoint(spawn);
  }

  relayout({ shiftX = 0 } = {}) {
    const zone = this.current;
    if (!zone) return null;
    if (this.player && Number.isFinite(Number(shiftX)) && shiftX !== 0) {
      const half = 14;
      const nextX = Math.max(half, Math.min(this.width - half, this.player.x + shiftX));
      this.player.setPosition(nextX, this.player.y);
    }
    this.layoutZone(zone);
    this.eventSystem?.emit('zone:relayout', { zone, shiftX });
    return zone;
  }

  travel(target = {}) {
    const transition = target.transitionId
      ? this.worldGraph?.getTransition(target.transitionId)
      : null;

    if (transition) {
      return this.build(transition.to.zoneId, transition.to.entryId || null);
    }

    const zoneId = this.worldGraph?.resolveZoneId(target.zoneId);
    if (!zoneId) return this.current;
    return this.build(zoneId, target.entryId || target.entry || null);
  }

  next() {
    const ids = [...(this.worldGraph?.zones?.keys?.() || [])];
    if (!ids.length) return this.current;
    const currentIndex = Math.max(0, ids.indexOf(this.currentId));
    return this.build(ids[(currentIndex + 1) % ids.length]);
  }

  portalDefinition(transition) {
    const side = transition.from?.side || 'right';
    const horizontal = side === 'left' || side === 'right';
    const isRight = side === 'right';
    const isBottom = side === 'bottom';

    let x = this.width / 2;
    let y = this.height / 2;
    let width = 110;
    let height = 28;
    let labelX = x;
    let labelY = y;
    let defaultLabel = 'ВЫХОД';

    if (horizontal) {
      x = isRight ? this.width - 22 : 22;
      y = this.height / 2;
      width = 28;
      height = 110;
      labelX = isRight ? this.width - 82 : 82;
      labelY = y;
      defaultLabel = isRight ? 'ВЫХОД →' : '← ВЫХОД';
    } else {
      x = this.width / 2;
      y = isBottom ? this.height - 22 : 22;
      width = 110;
      height = 28;
      labelX = x;
      labelY = isBottom ? this.height - 58 : 58;
      defaultLabel = isBottom ? 'ВЫХОД ↓' : '↑ ВЫХОД';
    }

    return {
      id: transition.id,
      type: 'portal',
      trigger: transition.trigger || 'auto',
      x,
      y,
      width,
      height,
      labelX,
      labelY,
      label: transition.label || defaultLabel,
      sound: transition.sound || 'portal',
      target: { transitionId: transition.id }
    };
  }

  makeBoundary(side, open = false) {
    const thickness = 12;
    const opening = 120;

    if (side === 'left' || side === 'right') {
      const x = side === 'left' ? thickness / 2 : this.width - thickness / 2;
      if (!open) {
        this.makeWall(x, this.height / 2, thickness, this.height);
        return;
      }

      const segmentHeight = (this.height - opening) / 2;
      this.makeWall(x, segmentHeight / 2, thickness, segmentHeight);
      this.makeWall(x, this.height - segmentHeight / 2, thickness, segmentHeight);
      return;
    }

    const y = side === 'top' ? thickness / 2 : this.height - thickness / 2;
    if (!open) {
      this.makeWall(this.width / 2, y, this.width, thickness);
      return;
    }

    const segmentWidth = (this.width - opening) / 2;
    this.makeWall(segmentWidth / 2, y, segmentWidth, thickness);
    this.makeWall(this.width - segmentWidth / 2, y, segmentWidth, thickness);
  }

  sideLabel(side) {
    if (side === 'right') return 'справа';
    if (side === 'left') return 'слева';
    if (side === 'top') return 'сверху';
    if (side === 'bottom') return 'снизу';
    return side || 'по умолчанию';
  }

  makeWall(x, y, width, height) {
    const object = this.scene.add.rectangle(x, y, width, height, 0x30363d);
    this.objects.push(object);
    this.walls.push({ x, y, width, height });
  }

  clear() {
    for (const object of this.objects) object.destroy();
    this.objects = [];
    this.walls = [];
    this.interactableSystem?.clear();
  }
}
