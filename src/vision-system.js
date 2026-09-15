const SVG_NS = 'http://www.w3.org/2000/svg';

function svgElement(name) {
  return document.createElementNS(SVG_NS, name);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export class VisionSystem {
  constructor({ host, canvas, worldWidth, worldHeight, player, radius = 165 }) {
    this.host = host;
    this.canvas = canvas;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.player = player;

    this.defaultRadius = radius;
    this.radius = radius;
    this.mode = 'circle';
    this.darkness = 1;
    this.direction = { x: 1, y: 0 };

    this.createOverlay();
    this.update();
  }

  createOverlay() {
    if (!this.host || !this.canvas) return;

    this.svg = svgElement('svg');
    this.svg.setAttribute('class', 'vision-overlay');
    this.svg.setAttribute('aria-hidden', 'true');

    const defs = svgElement('defs');
    this.mask = svgElement('mask');
    this.maskId = `vision-mask-${Math.random().toString(36).slice(2)}`;
    this.mask.setAttribute('id', this.maskId);
    this.mask.setAttribute('maskUnits', 'userSpaceOnUse');
    this.mask.style.maskType = 'luminance';

    this.maskBase = svgElement('rect');
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
    this.darknessRect.setAttribute('fill', 'black');
    this.darknessRect.setAttribute('mask', `url(#${this.maskId})`);

    this.svg.append(defs, this.darknessRect);
    this.host.appendChild(this.svg);
  }

  setDirection(dx, dy) {
    const length = Math.hypot(dx, dy);
    if (!length) return;
    this.direction = { x: dx / length, y: dy / length };
  }

  setMode(mode) {
    if (!['circle', 'cone', 'full', 'none'].includes(mode)) return;
    this.mode = mode;
    this.update();
  }

  setRadius(radius) {
    this.radius = clamp(radius, 60, 420);
    this.update();
  }

  setDarkness(value) {
    this.darkness = clamp(value, 0, 1);
    this.update();
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

  update() {
    if (!this.svg || !this.darknessRect || !this.player || !this.host || !this.canvas) return;

    const canvasRect = this.canvas.getBoundingClientRect();
    const hostRect = this.host.getBoundingClientRect();
    if (!canvasRect.width || !canvasRect.height) return;

    const width = canvasRect.width;
    const height = canvasRect.height;
    const left = canvasRect.left - hostRect.left;
    const top = canvasRect.top - hostRect.top;
    const scaleX = width / this.worldWidth;
    const scaleY = height / this.worldHeight;
    const scale = Math.min(scaleX, scaleY);
    const x = this.player.x * scaleX;
    const y = this.player.y * scaleY;
    const radius = this.radius * scale;

    Object.assign(this.svg.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`
    });

    this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    this.mask.setAttribute('width', String(width));
    this.mask.setAttribute('height', String(height));

    for (const rect of [this.maskBase, this.darknessRect]) {
      rect.setAttribute('x', '0');
      rect.setAttribute('y', '0');
      rect.setAttribute('width', String(width));
      rect.setAttribute('height', String(height));
    }

    if (this.mode === 'full') {
      this.svg.style.display = 'none';
      return;
    }

    this.svg.style.display = 'block';

    if (this.mode === 'none') {
      this.darknessRect.removeAttribute('mask');
      this.darknessRect.setAttribute('fill-opacity', '1');
      return;
    }

    this.darknessRect.setAttribute('mask', `url(#${this.maskId})`);
    this.darknessRect.setAttribute('fill-opacity', String(this.darkness));

    const showCircle = this.mode === 'circle';
    this.circleHole.setAttribute('cx', String(x));
    this.circleHole.setAttribute('cy', String(y));
    this.circleHole.setAttribute('r', showCircle ? String(radius) : '0');

    if (this.mode === 'cone') {
      const angle = Math.atan2(this.direction.y, this.direction.x);
      const halfAngle = Math.PI / 6;
      const distance = radius * 1.75;
      const leftAngle = angle - halfAngle;
      const rightAngle = angle + halfAngle;
      const x1 = x + Math.cos(leftAngle) * distance;
      const y1 = y + Math.sin(leftAngle) * distance;
      const x2 = x + Math.cos(rightAngle) * distance;
      const y2 = y + Math.sin(rightAngle) * distance;

      this.coneHole.setAttribute('points', `${x},${y} ${x1},${y1} ${x2},${y2}`);
      this.coneCore.setAttribute('cx', String(x));
      this.coneCore.setAttribute('cy', String(y));
      this.coneCore.setAttribute('r', String(Math.min(radius * 0.34, 55 * scale)));
    } else {
      this.coneHole.setAttribute('points', '0,0 0,0 0,0');
      this.coneCore.setAttribute('r', '0');
    }
  }
}
