import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const data = (p) => JSON.parse(readFileSync(new URL('../' + p, import.meta.url),'utf8'));
test('four specialized cities and one neutral Crossroads remain in expanded 225-zone world', () => {
  const world = data('data/world.json');
  const layout = data('data/city-specializations.json');
  const safe = world.zones.filter((z) => z.isSafeCity);
  assert.equal(world.zones.length, 225);
  assert.equal(world.zones.filter(z => !z.isSafeCity).length, 220);
  assert.equal(safe.length, 5);
  assert.equal(layout.cities.length, 5);
  assert.equal(layout.cities.filter((x) => x.kind === 'neutral').length, 1);
  assert.equal(layout.cities.filter((x) => x.kind === 'specialized').length, 4);
  assert.equal(layout.cities.find((x) => x.kind === 'neutral').zoneId, 'loc-00013');
  assert.deepEqual(new Set(layout.cities.map((x) => x.zoneId)),new Set(safe.map((z)=>z.id)));
  assert.deepEqual(new Set(layout.cities.map((x) => x.roleId)),new Set(['crossroads','balance','hunt','strength','wisdom']));
  assert.equal(layout.gameplayEffectsEnabled,false);
  assert.equal(layout.placementStatus,'candidate-requires-owner-review');
});

test('World Map shows safe city specialization from data and no class lock', async () => {
  const { ProjectHubSystem } = await import('../src/project-hub-system.js');
  const world = data('data/world.json');
  const cities = data('data/city-specializations.json');
  const city = world.zones.find((zone) => zone.id === 'loc-00013');
  const ui = Object.create(ProjectHubSystem.prototype);
  const mk = () => ({ innerHTML: '', textContent: '', hidden: false });
  ui.backButton = mk();
  ui.titleElement = mk();
  ui.breadcrumbElement = mk();
  ui.navElement = mk();
  ui.citySpecializations = new Map(cities.cities.map((entry) => [entry.zoneId, entry]));
  ui.worldMap = { getData: () => ({
    currentZoneId: city.id,
    zones: world.zones.map((z) => ({
      id:z.id, name:z.name, worldMap:z.worldMap, biome:z.biome,
      cityKey:z.cityKey, isSafeCity:z.isSafeCity
    }))
  }) };
  ui.contentElement = { innerHTML: '', scrollTop: 0, querySelectorAll: () => [] };
  ui.renderWorldMap({ label: 'Карта мира', selectedId:city.id });
  assert.match(ui.contentElement.innerHTML, /Направление \(предварительно\)/);
  assert.match(ui.contentElement.innerHTML, /Перекрёсток/);
  assert.match(ui.contentElement.innerHTML, /Освоение других профессий не запрещено/);
});

test('six-material proposal has four real resources and two strictly inactive candidates', () => {
  const resourceIds = new Set(data('data/resources.json').resources.map((x) => x.id));
  const p = data('data/materials-proposal.json');
  assert.equal(p.status,'candidate-not-gameplay');
  assert.equal(p.rawMaterials.length,6);
  assert.deepEqual(new Set(p.rawMaterials.map((m) => m.id)).size,6);
  assert.equal(p.rawMaterials.filter((m) => m.inCurrentGame).length,4);
  assert.deepEqual(new Set(p.rawMaterials.filter((m) => m.inCurrentGame).map((m) => m.id)),new Set(['stone','wood','water','clay']));
  for(const m of p.rawMaterials) {
    assert.equal(resourceIds.has(m.id),m.inCurrentGame,'candidate must not silently enter live catalog: '+m.id);
  }
  assert.ok(p.rawMaterials.filter((m) => !m.inCurrentGame).every((m) => m.requiresOwnerApproval));
});

test('approved first crafting recipe uses existing T1 resources and a live item', () => {
  const recipe = data('data/crafting-prototype.json');
  const sources = data('data/resources.json');
  const items = data('data/items.json');
  const ids = new Set(sources.resources.map((x) => x.id));
  const itemIds = new Set((items.items || []).map((x) => x.id));
  assert.equal(recipe.status,'live-first-recipe');
  assert.equal(recipe.liveCraftingEnabled,true);
  assert.equal(recipe.requiresApprovalBeforeGameplay,false);
  assert.equal(recipe.recipe.materials.length,2);
  assert.deepEqual(new Set(recipe.recipe.materials.map((x)=>x.resourceId)),new Set(['stone','wood']));
  for(const material of recipe.recipe.materials) {
    assert.ok(ids.has(material.resourceId));
    assert.ok(['T1','T2','T3','T4'].includes(material.tier));
    assert.equal(Math.round(material.massKg*10),material.massKg*10);
  }
  assert.equal(recipe.recipe.output.inLiveItemCatalog,true);
  assert.equal(itemIds.has(recipe.recipe.output.id),true);
});
