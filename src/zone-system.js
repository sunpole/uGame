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

  diamondGeometry() {
    return {
      centerX: this.width / 2,
      centerY: this.height / 2,
      radiusX: this.width / 2,
      radiusY: this.height / 2
    };
  }

  isInsidePlayable(x, y, margin = 18) {
    const { centerX, centerY, radiusX, radiusY } = this.diamondGeometry();
    const safeX = Math.max(1, radiusX - margin);
    const safeY = Math.max(1, radiusY - margin);
    return Math.abs(Number(x) - centerX) / safeX + Math.abs(Number(y) - centerY) / safeY <= 1;
  }

  makeDiamondFrame() {
    const { centerX, centerY } = this.diamondGeometry();
    const g = this.scene.add.graphics().setDepth(1);
    g.fillStyle(0x030507, 0.965);

    const fill = (points) => {
      g.beginPath();
      g.moveTo(points[0][0], points[0][1]);
      for (let index = 1; index < points.length; index += 1) g.lineTo(points[index][0], points[index][1]);
      g.closePath();
      g.fillPath();
    };

    fill([[0, 0], [centerX, 0], [0, centerY]]);
    fill([[centerX, 0], [this.width, 0], [this.width, centerY]]);
    fill([[this.width, centerY], [this.width, this.height], [centerX, this.height]]);
    fill([[centerX, this.height], [0, this.height], [0, centerY]]);

    g.lineStyle(5, 0x30363d, 1);
    g.beginPath();
    g.moveTo(centerX, 0);
    g.lineTo(this.width, centerY);
    g.lineTo(centerX, this.height);
    g.lineTo(0, centerY);
    g.closePath();
    g.strokePath();

    this.objects.push(g);
  }

  makeCompassMarkers() {
    const { centerX, centerY } = this.diamondGeometry();
    const style = {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#8b949e',
      stroke: '#050608',
      strokeThickness: 4
    };
    const markers = [
      { x: centerX, y: 28, text: 'N ↑' },
      { x: this.width - 38, y: centerY, text: 'E →' },
      { x: centerX, y: this.height - 28, text: 'S ↓' },
      { x: 38, y: centerY, text: '← W' }
    ];
    for (const marker of markers) {
      const label = this.scene.add.text(marker.x, marker.y, marker.text, style).setOrigin(0.5).setDepth(3);
      this.objects.push(label);
    }
  }

  layoutZone(zone) {
    this.clear();
    this.walls = [];

    const transitions = this.worldGraph.getTransitionsFrom(zone.id);
    this.makeDiamondFrame();
    this.makeCompassMarkers();

    for (const wall of zone.walls || []) {
      this.makeWall(this.mapX(wall.x), wall.y, wall.width, wall.height, wall.rotationDeg || 0);
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

  resolveSpawn(spawn) {
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
    const side = transition.from?.side || 'ne';
    const { centerX, centerY } = this.diamondGeometry();
    const boundary = {
      nw: { x: centerX * 0.5, y: centerY * 0.5, rotation: -Math.atan2(centerY, centerX), arrow: '↖ NW' },
      ne: { x: centerX * 1.5, y: centerY * 0.5, rotation: Math.atan2(centerY, centerX), arrow: 'NE ↗' },
      sw: { x: centerX * 0.5, y: centerY * 1.5, rotation: Math.atan2(centerY, centerX), arrow: '↙ SW' },
      se: { x: centerX * 1.5, y: centerY * 1.5, rotation: -Math.atan2(centerY, centerX), arrow: 'SE ↘' }
    }[side] || { x: centerX, y: centerY, rotation: 0, arrow: 'ВЫХОД' };

    const inward = 0.93;
    const x = centerX + (boundary.x - centerX) * inward;
    const y = centerY + (boundary.y - centerY) * inward;
    const upper = side === 'nw' || side === 'ne';

    return {
      id: transition.id,
      type: 'portal',
      trigger: transition.trigger || 'auto',
      direction: side,
      x,
      y,
      width: 104,
      height: 22,
      rotation: boundary.rotation,
      labelX: x,
      labelY: y + (upper ? 44 : -44),
      label: transition.label || boundary.arrow,
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
    if (side === 'nw') return 'NW';
    if (side === 'ne') return 'NE';
    if (side === 'sw') return 'SW';
    if (side === 'se') return 'SE';
    return side || 'по умолчанию';
  }

  makeWall(x, y, width, height, rotationDeg = 0) {
    const rotation = Number(rotationDeg || 0) * Math.PI / 180;
    const object = this.scene.add.rectangle(x, y, width, height, 0x30363d)
      .setStrokeStyle(1, 0x484f58)
      .setRotation(rotation);
    this.objects.push(object);
    this.walls.push({
      x,
      y,
      width,
      height,
      rotation,
      cos: Math.cos(-rotation),
      sin: Math.sin(-rotation)
    });
  }

  collidesWithWall(x, y, margin = 14) {
    for (const wall of this.walls) {
      const dx = Number(x) - wall.x;
      const dy = Number(y) - wall.y;
      const localX = dx * wall.cos - dy * wall.sin;
      const localY = dx * wall.sin + dy * wall.cos;
      if (Math.abs(localX) <= wall.width / 2 + margin && Math.abs(localY) <= wall.height / 2 + margin) {
        return true;
      }
    }
    return false;
  }

  clear() {
    for (const object of this.objects) object.destroy();
    this.objects = [];
    this.walls = [];
    this.interactableSystem?.clear();
  }
}
