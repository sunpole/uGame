function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

export class DaylightSystem {
  constructor({ host, visionSystem, configUrl = './data/daylight-vision.json', onStatus } = {}) {
    this.host = host;
    this.visionSystem = visionSystem;
    this.configUrl = configUrl;
    this.onStatus = onStatus;
    this.config = null;
    this.clockPhase = 'День';
    this.overridePhase = null;
    this.safeCity = false;
    this.tintElements = [];
  }

  async load() {
    const response = await fetch(this.configUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error('Daylight config failed: ' + response.status);
    this.config = await response.json();
    this.ensureTintElements(2);
    this.apply();
    return this;
  }

  ensureTintElements(count) {
    if (!this.host) return;
    while (this.tintElements.length < count) {
      const element = document.createElement('div');
      element.className = 'world-lighting-tint';
      element.setAttribute('aria-hidden', 'true');
      this.host.appendChild(element);
      this.tintElements.push(element);
    }
  }

  setClockSnapshot(snapshot = {}) {
    const phase = String(snapshot.phase || '');
    if (!phase) return false;
    this.clockPhase = phase;
    if (this.config && !this.overridePhase) this.apply();
    return true;
  }

  setZone(zone = {}) {
    this.safeCity = zone?.isSafeCity === true;
    if (this.config) this.apply();
  }

  phaseName() {
    return this.overridePhase || this.clockPhase || 'День';
  }

  apply() {
    const phaseName = this.phaseName();
    const phase = this.config?.phases?.[phaseName];
    if (!phase) return false;
    const context = this.safeCity ? phase.city : phase.field;

    this.visionSystem?.setModifier?.('daylight', {
      radiusMultiplier: context?.radiusMultiplier ?? 1,
      darknessMultiplier: context?.darknessMultiplier ?? 1
    });

    const layers = Array.isArray(phase.tintLayers) ? phase.tintLayers : [];
    this.ensureTintElements(Math.max(2, layers.length));
    this.tintElements.forEach((element, index) => {
      const layer = layers[index];
      if (!layer) {
        element.style.display = 'none';
        return;
      }
      element.style.display = 'block';
      element.style.background = String(layer.color || '#000000');
      element.style.opacity = String(clamp(layer.opacity, 0, 1));
    });

    this.onStatus?.({
      phase: phaseName,
      context: this.safeCity ? 'city' : 'field',
      radiusMultiplier: context?.radiusMultiplier ?? 1,
      darknessMultiplier: context?.darknessMultiplier ?? 1
    });
    return true;
  }

  setPhaseOverride(phase = null) {
    if (phase === null) {
      this.overridePhase = null;
      this.apply();
      return true;
    }
    if (!this.config?.phases?.[phase]) return false;
    this.overridePhase = phase;
    this.apply();
    return true;
  }

  executeDevCode(code) {
    const phases = { '1301': 'Утро', '1302': 'День', '1303': 'Вечер', '1304': 'Ночь' };
    if (phases[code]) {
      this.setPhaseOverride(phases[code]);
      return { handled: true, message: code + ' · Daylight: ' + phases[code] + ' (DEV override)', state: 'ok' };
    }
    if (code === '1399') {
      this.setPhaseOverride(null);
      return { handled: true, message: '1399 · Daylight: игровое время (' + this.clockPhase + ')', state: 'ok' };
    }
    return { handled: false };
  }
}
