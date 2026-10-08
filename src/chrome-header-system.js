export class ChromeHeaderSystem {
  constructor({
    nameElement,
    classElement,
    professionElement,
    specializationElement,
    levelElement,
    xpElement,
    staminaElement,
    staminaBarElement,
    resourcesElement,
    wealthElement,
    storageElement,
    fragmentElement
  } = {}) {
    this.nameElement = nameElement;
    this.classElement = classElement;
    this.professionElement = professionElement;
    this.specializationElement = specializationElement;
    this.levelElement = levelElement;
    this.xpElement = xpElement;
    this.staminaElement = staminaElement;
    this.staminaBarElement = staminaBarElement;
    this.resourcesElement = resourcesElement;
    this.wealthElement = wealthElement;
    this.storageElement = storageElement;
    this.fragmentElement = fragmentElement;
    this.resources = [];
    this.resourceMap = new Map();
    this.lastResourceSnapshot = {};
    this.materialMass = {};
  }

  async load(url = './data/resources.json') {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Resource metadata load failed: ${response.status}`);
    const data = await response.json();
    this.resources = Array.isArray(data?.resources) ? data.resources : [];
    this.resourceMap = new Map(this.resources.map((item) => [item.id, item]));
    return this;
  }

  setIdentity({
    name = '—',
    className = '—',
    profession = '—',
    specialization = '—'
  } = {}) {
    if (this.nameElement) this.nameElement.textContent = `Имя ${name}`;
    if (this.classElement) this.classElement.textContent = `Класс ${className}`;
    if (this.professionElement) this.professionElement.textContent = `Профессия ${profession}`;
    if (this.specializationElement) this.specializationElement.textContent = `Специализация ${specialization}`;
  }

  setClass(classData) {
    this.setIdentity({
      name: '—',
      className: classData?.name || '—',
      profession: '—',
      specialization: '—'
    });
  }

  setProgress({ level = null, xp = null, xpNext = null } = {}) {
    if (this.levelElement) this.levelElement.textContent = level == null ? 'LV —' : `LV ${level}`;
    if (this.xpElement) {
      this.xpElement.textContent = xp == null
        ? 'XP —'
        : xpNext == null
          ? `XP ${xp}`
          : `XP ${xp} / ${xpNext}`;
    }
  }

  setStamina({ stamina = 0, staminaMax = 100, dashing = false } = {}) {
    const current = Math.max(0, Number(stamina) || 0);
    const max = Math.max(1, Number(staminaMax) || 1);
    if (this.staminaElement) {
      this.staminaElement.textContent = `Stamina ${Math.round(current)} / ${Math.round(max)}${dashing ? ' · РЫВОК' : ''}`;
    }
    if (this.staminaBarElement) {
      this.staminaBarElement.style.width = `${Math.max(0, Math.min(100, current * 100 / max))}%`;
    }
  }

  setResources(snapshot = {}, materialMass = this.materialMass) {
    if (!this.resources.length) return;
    this.lastResourceSnapshot = { ...snapshot };
    this.materialMass = { ...(materialMass || {}) };

    const pinned = this.resources.slice(0, 5);
    if (this.resourcesElement) {
      this.resourcesElement.replaceChildren();
      for (const resource of pinned) {
        const span = document.createElement('span');
        span.dataset.resourceId = resource.id;
        if (resource.massStorage) {
          span.textContent = resource.name + ' ' + (Number(this.materialMass[resource.id] || 0)).toFixed(1) + ' кг';
        } else {
          span.textContent = resource.name + ' ' + Number(snapshot[resource.id] || 0);
        }
        if (resource.id === 'attention') span.dataset.special = 'attention';
        this.resourcesElement.append(span);
      }
    }

    let wealth = 0;
    for (const resource of this.resources) {
      if (!Array.isArray(resource.tags) || !resource.tags.includes('material')) continue;
      const amount = resource.massStorage
        ? Number(this.materialMass[resource.id] || 0)
        : Number(snapshot[resource.id] || 0);
      const baseValue = Number(resource.baseValue || 0);
      wealth += amount * baseValue;
    }
    if (this.wealthElement) this.wealthElement.textContent = `Материалы Σ ${Math.round(wealth).toLocaleString('ru-RU')} 🪨`;

    const fragments = Object.entries(snapshot)
      .filter(([id]) => id.startsWith('fragment-'))
      .reduce((total, [, value]) => total + Math.max(0, Number(value) || 0), 0);
    if (this.fragmentElement) this.fragmentElement.textContent = `Фрагменты ${fragments}/3`;
  }

  setStorageSummary(text = '') {
    if (this.storageElement) this.storageElement.textContent = text || 'Хранилища: —';
  }
}
