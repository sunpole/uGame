const SVG_NS = 'http://www.w3.org/2000/svg';

function svgElement(name) {
  return document.createElementNS(SVG_NS, name);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export class VisionSystem {
  constructor({ host, canvas, worldWidth, worldHeight, player, camera = null, radius = 165 }) {
    this.host = host;
    this.canvas = canvas;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.player = player;
    this.camera = camera;

    this.defaultRadius = radius;
    this.radius = radius;
    this.mode = 'circle';
    this.darkness = 1;
    this.direction = { x: 1, y: 0 };
    this.zoneOverride = {};
    this.modifiers = new Map();
    this.coneHalfAngleDeg = 30;
    this.coneDistanceMultiplier = 1.75;
    this.lastRenderAt = 0;
    this.minFrameMs = 33;

    this.createOverlay();
    this.update(true);
  }

  createOverlay() {
    if (!this.host) return;

    this.svg = svgElement('svg');
    this.svg.setAttribute('class', 'vision-overlay');
    this.svg.setAttribute('aria-hidden', 'true');
    this.svg.setAttribute('x', '0');
    this.svg.setAttribute('y', '0');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.svg.setAttribute('viewBox', `0 0 ${this.worldWidth} ${this.worldHeight}`);
    this.svg.setAttribute('preserveAspectRatio', 'none');

    const defs = svgElement('defs');
    this.mask = svgElement('mask');
    this.maskId = `vision-mask-${Math.random().toString(36).slice(2)}`;
    this.mask.setAttribute('id', this.maskId);
    this.mask.setAttribute('maskUnits', 'userSpaceOnUse');
    this.mask.setAttribute('maskContentUnits', 'userSpaceOnUse');
    this.mask.setAttribute('x', '0');
    this.mask.setAttribute('y', '0');
    this.mask.setAttribute('width', String(this.worldWidth));
    this.mask.setAttribute('height', String(this.worldHeight));
    this.mask.style.maskType = 'luminance';

    this.maskBase = svgElement('rect');
    this.maskBase.setAttribute('x', '0');
    this.maskBase.setAttribute('y', '0');
    this.maskBase.setAttribute('width', String(this.worldWidth));
    this.maskBase.setAttribute('height', String(this.worldHeight));
    this.maskBase.setAttribute('fill', 'white');

    this.circleHole = svgElement('circle');
    this.circleHole.setAttribute('fill', 'black');

    this.coneHole = svgElement('polygon');
    this.coneHole.setAttribute('fill', 'black');

    this.coneCore = svgElement('circle');
    this.coneCore.setAttribute('fill', 'black');

    this.mask.append(this.maskBase, this.circleHole, this.coneHole, this.coneCore);
    defs.appendChild(this.mask);

    this.darknessRect = svgElement('rect');
    this.darknessRect.setAttribute('x', '0');
    this.darknessRect.setAttribute('y', '0');
    this.darknessRect.setAttribute('width', String(this.worldWidth));
    this.darknessRect.setAttribute('height', String(this.worldHeight));
    this.darknessRect.setAttribute('fill', 'black');
    this.darknessRect.setAttribute('mask', `url(#${this.maskId})`);

    this.svg.append(defs, this.darknessRect);
    this.host.appendChild(this.svg);
  }

  setWorldSize(width, height = this.worldHeight) {
    const nextWidth = Math.max(1, Number(width) || this.worldWidth);
    const nextHeight = Math.max(1, Number(height) || this.worldHeight);
    this.worldWidth = nextWidth;
    this.worldHeight = nextHeight;

    this.svg?.setAttribute('viewBox', `0 0 ${nextWidth} ${nextHeight}`);
    this.mask?.setAttribute('width', String(nextWidth));
    this.mask?.setAttribute('height', String(nextHeight));
    this.maskBase?.setAttribute('width', String(nextWidth));
    this.maskBase?.setAttribute('height', String(nextHeight));
    this.darknessRect?.setAttribute('width', String(nextWidth));
    this.darknessRect?.setAttribute('height', String(nextHeight));
    this.update(true);
  }

  setDirection(dx, dy) {
    const length = Math.hypot(dx, dy);
    if (!length) return;
    this.direction = { x: dx / length, y: dy / length };
  }

  applyProfile({ mode = this.mode, radius = this.radius, darkness = this.darkness } = {}) {
    if (['circle', 'cone', 'full', 'none'].includes(mode)) this.mode = mode;
    if (Number.isFinite(radius)) this.radius = clamp(radius, 60, 420);
    if (Number.isFinite(darkness)) this.darkness = clamp(darkness, 0, 1);
    this.update(true);
  }

  setZoneOverride(profile = {}) {
    const next = {};
    if (['circle', 'cone', 'full', 'none'].includes(profile.mode)) next.mode = profile.mode;
    if (Number.isFinite(profile.radius)) next.radius = clamp(profile.radius, 60, 420);
    if (Number.isFinite(profile.darkness)) next.darkness = clamp(profile.darkness, 0, 1);
    this.zoneOverride = next;
    this.update(true);
  }

  setModifier(sourceId, modifier = {}) {
    const id = String(sourceId || '').trim();
    if (!id) return false;
    this.modifiers.set(id, {
      radiusFlat: Number(modifier.radiusFlat) || 0,
      radiusMultiplier: Number.isFinite(Number(modifier.radiusMultiplier)) ? Number(modifier.radiusMultiplier) : 1,
      radiusMultiplierBonus: Number(modifier.radiusMultiplierBonus) || 0,
      darknessFlat: Number(modifier.darknessFlat) || 0,
      darknessMultiplier: Number.isFinite(Number(modifier.darknessMultiplier)) ? Number(modifier.darknessMultiplier) : 1,
      darknessMultiplierBonus: Number(modifier.darknessMultiplierBonus) || 0
    });
    this.update(true);
    return true;
  }

  clearModifier(sourceId) {
    const removed = this.modifiers.delete(String(sourceId || ''));
    if (removed) this.update(true);
    return removed;
  }

  getModifier(sourceId) {
    return this.modifiers.get(String(sourceId || '')) || null;
  }

  getEffectiveProfile() {
    const baseRadius = Number(this.zoneOverride.radius ?? this.radius) || this.defaultRadius;
    const baseDarkness = Number(this.zoneOverride.darkness ?? this.darkness);
    let radiusFlat = 0;
    let radiusMultiplier = 1;
    let radiusMultiplierBonus = 0;
    let darknessFlat = 0;
    let darknessMultiplier = 1;
    let darknessMultiplierBonus = 0;

    for (const modifier of this.modifiers.values()) {
      radiusFlat += Number(modifier.radiusFlat) || 0;
      radiusMultiplier *= Number.isFinite(Number(modifier.radiusMultiplier)) ? Number(modifier.radiusMultiplier) : 1;
      radiusMultiplierBonus += Number(modifier.radiusMultiplierBonus) || 0;
      darknessFlat += Number(modifier.darknessFlat) || 0;
      darknessMultiplier *= Number.isFinite(Number(modifier.darknessMultiplier)) ? Number(modifier.darknessMultiplier) : 1;
      darknessMultiplierBonus += Number(modifier.darknessMultiplierBonus) || 0;
    }

    return {
      mode: this.zoneOverride.mode ?? this.mode,
      radius: clamp((baseRadius + radiusFlat) * radiusMultiplier * Math.max(0, 1 + radiusMultiplierBonus), 20, 1200),
      darkness: clamp((baseDarkness + darknessFlat) * darknessMultiplier * Math.max(0, 1 + darknessMultiplierBonus), 0, 1),
      coneHalfAngleDeg: this.coneHalfAngleDeg,
      coneDistanceMultiplier: this.coneDistanceMultiplier
    };
  }

  setMode(mode) {
    if (!['circle', 'cone', 'full', 'none'].includes(mode)) return;
    this.mode = mode;
    this.update(true);
  }

  setRadius(radius) {
    this.radius = clamp(radius, 60, 420);
    this.update(true);
  }

  setDarkness(value) {
    this.darkness = clamp(value, 0, 1);
    this.update(true);
  }

  executeDevCode(code) {
    switch (code) {
      case '1001':
        this.setMode('circle');
        return { handled: true, message: '1001 · Vision: круг', state: 'ok' };
      case '1002':
        this.setMode('cone');
        return { handled: true, message: '1002 · Vision: конус', state: 'ok' };
      case '1003':
        this.setMode('full');
        return { handled: true, message: '1003 · Vision: полная видимость', state: 'ok' };
      case '1004':
        this.setMode('none');
        return { handled: true, message: '1004 · Vision: нет видимости', state: 'ok' };
      case '1101':
        this.setRadius(this.radius - 25);
        return { handled: true, message: `1101 · Радиус: ${this.radius}`, state: 'ok' };
      case '1102':
        this.setRadius(this.radius + 25);
        return { handled: true, message: `1102 · Радиус: ${this.radius}`, state: 'ok' };
      case '1103':
        this.setRadius(this.defaultRadius);
        return { handled: true, message: `1103 · Радиус сброшен: ${this.radius}`, state: 'ok' };
      case '1201':
        this.setDarkness(1);
        return { handled: true, message: '1201 · Темнота: 100%', state: 'ok' };
      case '1202':
        this.setDarkness(0.9);
        return { handled: true, message: '1202 · Темнота: 90%', state: 'ok' };
      case '1203':
        this.setDarkness(0.75);
        return { handled: true, message: '1203 · Темнота: 75%', state: 'ok' };
      default:
        return { handled: false };
    }
  }

  update(force = false) {
    if (!this.svg || !this.darknessRect || !this.player || !this.host) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (!force && now - this.lastRenderAt < this.minFrameMs) return;
    this.lastRenderAt = now;

    const effective = this.getEffectiveProfile();
    const worldView = this.camera?.worldView;
    if (worldView && Number.isFinite(worldView.x) && Number.isFinite(worldView.width)) {
      this.svg.setAttribute('viewBox', [worldView.x, worldView.y, worldView.width, worldView.height].join(' '));
    }
    const x = this.player.x;
    const y = this.player.y;
    const radius = effective.radius;

    if (effective.mode === 'full') {
      this.svg.style.display = 'none';
      return;
    }

    this.svg.style.display = 'block';

    if (effective.mode === 'none') {
      this.darknessRect.removeAttribute('mask');
      this.darknessRect.setAttribute('fill-opacity', '1');
      return;
    }

    this.darknessRect.setAttribute('mask', `url(#${this.maskId})`);
    this.darknessRect.setAttribute('fill-opacity', String(effective.darkness));

    const showCircle = effective.mode === 'circle';
    this.circleHole.setAttribute('cx', String(x));
    this.circleHole.setAttribute('cy', String(y));
    this.circleHole.setAttribute('r', showCircle ? String(radius) : '0');

    if (effective.mode === 'cone') {
      const angle = Math.atan2(this.direction.y, this.direction.x);
      const halfAngle = (Number(effective.coneHalfAngleDeg) || 30) * Math.PI / 180;
      const distance = radius * (Number(effective.coneDistanceMultiplier) || 1.75);
      const leftAngle = angle - halfAngle;
      const rightAngle = angle + halfAngle;
      const x1 = x + Math.cos(leftAngle) * distance;
      const y1 = y + Math.sin(leftAngle) * distance;
      const x2 = x + Math.cos(rightAngle) * distance;
      const y2 = y + Math.sin(rightAngle) * distance;

      this.coneHole.setAttribute('points', `${x},${y} ${x1},${y1} ${x2},${y2}`);
      this.coneCore.setAttribute('cx', String(x));
      this.coneCore.setAttribute('cy', String(y));
      this.coneCore.setAttribute('r', String(Math.min(radius * 0.34, 55)));
    } else {
      this.coneHole.setAttribute('points', '0,0 0,0 0,0');
      this.coneCore.setAttribute('r', '0');
    }
  }
}
