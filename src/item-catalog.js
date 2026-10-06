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
      this.items.set(resource.id, {
        id: resource.id,
        name: resource.name || resource.id,
        type: 'resource',
        tags: Array.isArray(resource.tags) ? [...resource.tags] : ['resource'],
        weightKg: Math.max(0, Number(resource.weightKg) || 0),
        stackLimit: Math.max(1, Number(resource.stackLimit) || 1),
        storageMode: resource.storageMode || 'physical',
        baseValue: Math.max(0, Number(resource.baseValue) || 0),
        accountBound: Boolean(resource.accountBound),
        tierHint: resource.tierHint || ''
      });
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
      equipSlot: null
    };
  }

  name(id) {
    return this.require(id).name;
  }
}
