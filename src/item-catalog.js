export class ItemCatalog {
  constructor({
    resourcesUrl = './data/resources.json',
    itemsUrl = './data/items.json'
  } = {}) {
    this.resourcesUrl = resourcesUrl;
    this.itemsUrl = itemsUrl;
    this.items = new Map();
    this.loaded = false;
  }

  async load() {
    if (this.loaded) return this;

    const [resourcesResponse, itemsResponse] = await Promise.all([
      fetch(this.resourcesUrl, { cache: 'no-store' }),
      fetch(this.itemsUrl, { cache: 'no-store' })
    ]);

    if (!resourcesResponse.ok) {
      throw new Error(`Resource catalog load failed: ${resourcesResponse.status}`);
    }
    if (!itemsResponse.ok) {
      throw new Error(`Item catalog load failed: ${itemsResponse.status}`);
    }

    const resources = await resourcesResponse.json();
    const items = await itemsResponse.json();
    this.items.clear();

    for (const resource of resources.resources || []) {
      if (!resource?.id) continue;
      const tags = Array.isArray(resource.tags) ? [...resource.tags] : ['resource'];
      const massStorage = Boolean(resource.massStorage);
      const unitKg = massStorage ? Math.max(0.001, Number(resource.unitKg) || 0.1) : Math.max(0, Number(resource.weightKg) || 0);
      const slotCapacityKg = massStorage ? Math.max(unitKg, Number(resource.slotCapacityKg) || 50) : null;
      const tiers = massStorage && Array.isArray(resource.tiers) ? resource.tiers.filter(Boolean) : [];
      const base = {
        id: resource.id,
        name: resource.name || resource.id,
        type: 'resource',
        tags,
        weightKg: Math.max(0, Number(resource.weightKg) || 0),
        stackLimit: Math.max(1, Number(resource.stackLimit) || 1),
        storageMode: resource.storageMode || 'physical',
        baseValue: Math.max(0, Number(resource.baseValue) || 0),
        accountBound: Boolean(resource.accountBound),
        tierHint: resource.tierHint || '',
        massStorage,
        legacyMassResourceBase: massStorage,
        unitKg,
        slotCapacityKg,
        rewardRangeKg: resource.rewardRangeKg || null,
        tiers
      };
      this.items.set(resource.id, base);

      for (const tier of tiers) {
        const tierId = resource.id + '-' + String(tier).toLowerCase();
        this.items.set(tierId, {
          ...base,
          id: tierId,
          name: base.name + ' ' + tier,
          resourceId: resource.id,
          tier,
          weightKg: unitKg,
          stackLimit: Math.max(1, Math.floor((slotCapacityKg + 1e-9) / unitKg)),
          legacyMassResourceBase: false
        });
      }
    }

    for (const item of items.items || []) {
      if (!item?.id) continue;
      this.items.set(item.id, {
        id: item.id,
        name: item.name || item.id,
        type: item.type || 'item',
        tags: Array.isArray(item.tags) ? [...item.tags] : ['item'],
        weightKg: Math.max(0, Number(item.weightKg) || 0),
        stackLimit: Math.max(1, Number(item.stackLimit) || 1),
        storageMode: item.storageMode || 'physical',
        equipSlot: item.equipSlot || null,
        devOnly: Boolean(item.devOnly)
      });
    }

    this.loaded = true;
    return this;
  }

  get(id) {
    return this.items.get(id) || null;
  }

  require(id) {
    return this.get(id) || {
      id,
      name: id,
      type: 'unknown',
      tags: ['item'],
      weightKg: 0,
      stackLimit: 100,
      storageMode: 'physical',
      equipSlot: null,
      massStorage: false,
      unitKg: 0,
      slotCapacityKg: null,
      tier: null,
      resourceId: null
    };
  }

  name(id) {
    return this.require(id).name;
  }
}
