// Minimal vertical slice: one data-driven recipe, no location or profession lock.
// Costs and rewards are committed together to ContainerSystem and one save event.
export class CraftingSystem {
  constructor({ containerSystem, itemCatalog, url = './data/crafting-prototype.json' } = {}) {
    this.containerSystem = containerSystem;
    this.itemCatalog = itemCatalog;
    this.url = url;
    this.recipe = null;
    this.busy = false;
  }

  async load() {
    const response = await fetch(this.url, { cache: 'no-store' });
    if (!response.ok) throw new Error('Crafting recipe failed: ' + response.status);
    const data = await response.json();
    if (!data.liveCraftingEnabled || data.requiresApprovalBeforeGameplay || !data.recipe) {
      throw new Error('Crafting recipe is not approved for gameplay');
    }
    const recipe = data.recipe;
    const output = recipe.output;
    if (!output?.id || !this.itemCatalog?.get?.(output.id)
      || !Number.isInteger(output.count) || output.count < 1) {
      throw new Error('Craft output missing from live ItemCatalog');
    }
    if (!Array.isArray(recipe.materials) || recipe.materials.length !== 2) {
      throw new Error('Only the approved two-material recipe is supported');
    }
    const requirements = recipe.materials.map((entry) => {
      const id = entry.resourceId + '-' + String(entry.tier).toLowerCase();
      const material = this.itemCatalog.get(id);
      const amount = Number(entry.massKg) / Number(material?.unitKg);
      if (!material?.massStorage || !material?.tier
        || !Number.isFinite(amount) || amount <= 0 || !Number.isInteger(Math.round(amount))
        || Math.abs(amount - Math.round(amount)) > 1e-7) {
        throw new Error('Invalid crafting requirement: ' + id);
      }
      return { id, resourceId: entry.resourceId, tier: entry.tier, massKg: entry.massKg, units: Math.round(amount) };
    });
    if (new Set(requirements.map((item) => item.id)).size !== requirements.length) {
      throw new Error('Duplicate crafting material');
    }
    this.recipe = { ...recipe, requirements };
    return this;
  }

  count(itemId) {
    let total = 0;
    for (const containerId of ['resourcePouch', 'backpack']) {
      const slots = this.containerSystem?.container?.(containerId)?.slots || [];
      for (const stack of slots) if (stack?.itemId === itemId) total += stack.quantity;
    }
    return total;
  }

  inspect() {
    if (!this.recipe || !this.containerSystem?.loaded) return { ready: false, reason: 'not-loaded', materials: [] };
    const materials = this.recipe.requirements.map((entry) => ({
      ...entry, owned: this.count(entry.id)
    }));
    return {
      ready: materials.every((entry) => entry.owned >= entry.units),
      materials,
      output: this.recipe.output
    };
  }

  craft() {
    if (this.busy) return { ok: false, reason: 'busy' };
    const status = this.inspect();
    if (!status.ready) return { ok: false, reason: status.reason || 'missing-materials' };
    this.busy = true;
    const backup = this.containerSystem.snapshot();
    try {
      // All components are counted and taken from carried containers, never a remote bank.
      for (const requirement of status.materials) {
        let remaining = requirement.units;
        for (const containerId of ['resourcePouch', 'backpack']) {
          const slots = this.containerSystem.container(containerId)?.slots || [];
          for (let index = 0; index < slots.length && remaining > 0; index += 1) {
            if (slots[index]?.itemId !== requirement.id) continue;
            const removed = this.containerSystem.removeFrom(containerId, index, remaining, { silent: true }).removed;
            remaining -= removed;
          }
        }
        if (remaining !== 0) throw new Error('missing-materials');
      }
      const { id, count } = this.recipe.output;
      const added = this.containerSystem.addAuto(id, count, { atomic: true, silent: true });
      if (added.added !== count) throw new Error('inventory-full');
      this.containerSystem.emitChange({ reason: 'craft', recipeId: this.recipe.id, outputId: id, amount: count });
      return { ok: true, itemId: id, count };
    } catch (error) {
      this.containerSystem.state = backup;
      return { ok: false, reason: error instanceof Error ? error.message : String(error) };
    } finally {
      this.busy = false;
    }
  }
}
