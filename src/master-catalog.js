function clone(value) {
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

export class MasterCatalog {
  constructor({ url = './data/master-npcs.json' } = {}) {
    this.url = url;
    this.masters = new Map();
    this.modules = new Map();
    this.loaded = false;
  }

  async load() {
    if (this.loaded) return this;
    const response = await fetch(this.url, { cache: 'no-store' });
    if (!response.ok) throw new Error('Master catalog failed: ' + response.status);
    const data = await response.json();
    this.masters.clear();
    this.modules.clear();
    for (const item of data.modules || []) {
      if (item?.id) this.modules.set(item.id, clone(item));
    }
    for (const master of data.masters || []) {
      if (!master?.id || master.enabled === false) continue;
      this.masters.set(master.id, clone(master));
    }
    this.loaded = true;
    return this;
  }

  get(id) {
    const value = this.masters.get(String(id || ''));
    return value ? clone(value) : null;
  }

  getModule(id) {
    const value = this.modules.get(String(id || ''));
    return value ? clone(value) : null;
  }

  find(resourceDirectionId, tier) {
    return [...this.masters.values()].find((master) =>
      master.resourceDirectionId === resourceDirectionId && master.tier === tier
    ) ? clone([...this.masters.values()].find((master) =>
      master.resourceDirectionId === resourceDirectionId && master.tier === tier
    )) : null;
  }

  list({ resourceDirectionId = null, tier = null } = {}) {
    return [...this.masters.values()]
      .filter((master) => !resourceDirectionId || master.resourceDirectionId === resourceDirectionId)
      .filter((master) => !tier || master.tier === tier)
      .map(clone);
  }
}
