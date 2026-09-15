const CLASSES = {
  wanderer: {
    id: 'wanderer',
    name: 'Странник',
    code: '7001',
    vision: { mode: 'circle', radius: 165, darkness: 1 }
  },
  scout: {
    id: 'scout',
    name: 'Разведчик',
    code: '7002',
    vision: { mode: 'circle', radius: 235, darkness: 0.9 }
  },
  tracker: {
    id: 'tracker',
    name: 'Следопыт',
    code: '7003',
    vision: { mode: 'cone', radius: 220, darkness: 1 }
  }
};

export class ClassSystem {
  constructor({ visionSystem } = {}) {
    this.visionSystem = visionSystem;
    this.current = CLASSES.wanderer;
    this.apply(this.current.id);
  }

  apply(id) {
    const next = CLASSES[id];
    if (!next) return false;

    this.current = next;
    this.visionSystem?.applyProfile(next.vision);
    return true;
  }

  executeDevCode(code) {
    const selected = Object.values(CLASSES).find((item) => item.code === code);
    if (selected) {
      this.apply(selected.id);
      return {
        handled: true,
        message: `${code} · Класс: ${selected.name}`,
        state: 'ok'
      };
    }

    if (code === '7099') {
      return {
        handled: true,
        message: `7099 · Класс: ${this.current.name}`,
        state: 'ok'
      };
    }

    return { handled: false };
  }
}
