import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const data = (p) => JSON.parse(readFileSync(new URL('../' + p, import.meta.url),'utf8'));
test('four specialized cities and one neutral Crossroads retain stable 25-zone world', () => {
  const world = data('data/world.json');
  const layout = data('data/city-specializations.json');
  const safe = world.zones.filter((z) => z.isSafeCity);
  assert.equal(world.zones.length, 25);
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
