import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ContainerSystem } from '../src/container-system.js';
import { CraftingSystem } from '../src/crafting-system.js';

const read = (path) => JSON.parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'));
const recipeData = read('data/crafting-prototype.json');
const itemData = read('data/items.json');

function fixture({ stonePouch = 4, woodBackpack = 2, backpackFull = false } = {}) {
  const catalog = {
    loaded: true,
    get(id) {
      if (id === 'stone-t1' || id === 'wood-t1') return {
        id, tags: ['resource'], tier: 'T1', resourceId: id.split('-')[0],
        type: 'resource', unitKg: 0.1, weightKg: 0.1, massStorage: true,
        stackLimit: 500, storageMode: 'physical'
      };
      const item = itemData.items.find((value) => value.id === id);
      return item ? { ...item, storageMode: 'physical' } : null;
    },
    require(id) { return this.get(id); }
  };
  const changes = [];
  const eventSystem = { emit(name, value) { if (name === 'containers:changed') changes.push(value); } };
  const containers = new ContainerSystem({ itemCatalog: catalog, eventSystem });
  const config = (id, count, allowedTags = []) => ({
    id, name: id, kind: 'grid', access: 'global', enabled: true, slotCount: count,
    maxWeightKg: 50, allowedTags, allowedItemIds: []
  });
  containers.configs = new Map([
    ['resourcePouch', config('resourcePouch', 4, ['resource'])],
    ['backpack', config('backpack', backpackFull ? 1 : 4)]
  ]);
  containers.state = {
    schemaVersion: 1,
    containers: {
      resourcePouch: {
        kind: 'grid', modifiers: {}, slots: [
          stonePouch ? { itemId: 'stone-t1', quantity: stonePouch } : null, null, null, null
        ]
      },
      backpack: {
        kind: 'grid', modifiers: {}, slots: backpackFull
          ? [{ itemId: 'test-item', quantity: 1 }]
          : [woodBackpack ? { itemId: 'wood-t1', quantity: woodBackpack } : null, null, null, null]
      }
    }
  };
  containers.loaded = true;
  const craft = new CraftingSystem({ containerSystem: containers, itemCatalog: catalog });
  const ingredients = recipeData.recipe.materials.map((x) => ({
    id: x.resourceId + '-' + x.tier.toLowerCase(),
    resourceId: x.resourceId, tier: x.tier, massKg: x.massKg, units: x.massKg * 10
  }));
  craft.recipe = { ...recipeData.recipe, requirements: ingredients };
  return { craft, containers, changes };
}

test('first tool uses approved T1 material costs and a live inventory output', () => {
  assert.equal(recipeData.liveCraftingEnabled, true);
  assert.equal(recipeData.requiresApprovalBeforeGameplay, false);
  assert.equal(recipeData.recipe.materials.find(x => x.resourceId === 'stone').massKg, 0.4);
  assert.equal(recipeData.recipe.materials.find(x => x.resourceId === 'wood').massKg, 0.2);
  assert.ok(itemData.items.find((x) => x.id === recipeData.recipe.output.id));
});

test('craft debits actual carried T1 units and emits one persistence event', () => {
  const { craft, containers, changes } = fixture();
  assert.equal(craft.inspect().ready, true);
  assert.deepEqual(craft.craft(), { ok: true, itemId: 'simple-field-tool', count: 1 });
  assert.equal(craft.count('stone-t1'), 0);
  assert.equal(craft.count('wood-t1'), 0);
  assert.equal(containers.container('backpack').slots.some((s) => s?.itemId === 'simple-field-tool'), true);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].detail.reason, 'craft');
  const restored = containers.snapshot();
  assert.equal(restored.containers.backpack.slots.some((s) => s?.itemId === 'simple-field-tool'), true);
  assert.equal(craft.craft().ok, false); // no free second item
  assert.equal(changes.length, 1);
});

test('insufficient materials leave all container contents unchanged', () => {
  const { craft, containers, changes } = fixture({ stonePouch: 3 });
  const before = containers.snapshot();
  assert.equal(craft.craft().reason, 'missing-materials');
  assert.deepEqual(containers.snapshot(), before);
  assert.equal(changes.length, 0);
});

test('full output backpack triggers rollback including already consumed inputs', () => {
  const { craft, containers, changes } = fixture({ backpackFull: true, woodBackpack: 0 });
  // Put two units of wood in the pouch; all ingredients exist, but output has no slot.
  containers.container('resourcePouch').slots[1] = { itemId: 'wood-t1', quantity: 2 };
  const before = containers.snapshot();
  assert.equal(craft.inspect().ready, true);
  assert.equal(craft.craft().reason, 'inventory-full');
  assert.deepEqual(containers.snapshot(), before);
  assert.equal(changes.length, 0);
});
