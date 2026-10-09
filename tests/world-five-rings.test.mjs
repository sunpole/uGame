import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WorldGraph } from '../src/world-graph.js';
import { validateWorld } from '../src/preflight-system.js';
import { ProjectHubSystem } from '../src/project-hub-system.js';
import { GROUND_TEXTURE_ASSETS, preloadGroundTextures } from '../src/ground-texture-system.js';

const world = JSON.parse(readFileSync(new URL('../data/world.json', import.meta.url), 'utf8'));
const config = JSON.parse(readFileSync(new URL('../data/world-spawn-config.json', import.meta.url), 'utf8'));
const graph = new WorldGraph();
graph.use(world);

test('five additional square rings preserve 25 old IDs and add 200 fields', () => {
  assert.equal(world.topology.locationCount, 225);
  assert.equal(graph.zones.size, 225);
  assert.equal(graph.transitions.size, 840);
  assert.equal(graph.start.zoneId, 'loc-00013');
  assert.equal(graph.getSafeCityZones().length, 5);
  for (let n = 1; n <= 25; n += 1) {
    assert.ok(graph.getZone('loc-' + String(n).padStart(5, '0')));
  }
  const fields = [...graph.zones.values()].filter(z => !z.isSafeCity);
  assert.equal(fields.length, 220);
  assert.equal(fields.reduce((sum,z) => sum + z.eventSpots.length,0),2640);
  assert.ok(fields.every(z => z.eventSpots.length === 12));
  assert.ok(graph.getSafeCityZones().every(z => z.eventSpots.length === 0));
  assert.equal(config.locationTiers.T4.spawnMax, 6);
  assert.deepEqual(config.worldCapsPerResource, { T2: 3, T3: 2, T4: 1 });
  assert.equal(config.masterTierByLocationTier.T1.T4, 1.5);
});

test('all 225 zones remain reachable; distant fields use all distance bands', () => {
  const histogram = {};
  for (const zone of graph.zones.values()) {
    const distance = graph.distanceFromSafeCity(zone.id);
    assert.ok(Number.isFinite(distance), zone.id + ' must be connected');
    if (zone.isSafeCity) assert.equal(distance,0);
    else histogram[distance] = (histogram[distance] || 0) + 1;
  }
  assert.deepEqual(histogram, { 1:20, 2:28, 3:28, 4:32, 5:36, 6:32, 7:20, 8:12, 9:8, 10:4 });
  assert.equal(graph.distanceFromSafeCity('loc-00013'), 0);
  assert.equal(graph.distanceFromSafeCity('missing-id'), Infinity);
});

test('diamond gates have reciprocal opposite entries and no more than four exits', () => {
  const opposite = {nw:'se',ne:'sw',sw:'ne',se:'nw'};
  for (const zone of graph.zones.values()) {
    const exits = graph.getTransitionsFrom(zone.id);
    assert.ok(exits.length <= 4, zone.id);
    assert.equal(exits.length, graph.getNeighborZoneIds(zone.id).length);
    for (const edge of exits) {
      assert.equal(edge.to.entryId, opposite[edge.from.side], edge.id);
      const reverse = graph.getTransitionsFrom(edge.to.zoneId).find(t => t.to.zoneId === zone.id);
      assert.ok(reverse, 'missing reverse edge for ' + edge.id);
      assert.equal(reverse.from.side, edge.to.entryId);
    }
  }
});

test('large world map uses dynamic count and wide scrollable stage', () => {
  const hub = Object.create(ProjectHubSystem.prototype);
  hub.contentElement = {innerHTML:'',scrollTop:0,querySelectorAll:()=>[],querySelector:()=>null};
  hub.setSubViewHeader = () => {};
  hub.worldMap = {getData:()=>({currentZoneId:'loc-00013',zones:[...graph.zones.values()]})};
  hub.renderWorldMap({type:'world-map',selectedId:'loc-00013'});
  assert.match(hub.contentElement.innerHTML,/225 локаций/);
  assert.match(hub.contentElement.innerHTML,/world-map-stage" style="width:2\d{3}px;height:2\d{3}px"/);
  assert.match(hub.contentElement.innerHTML,/⌖ ВЫ ЗДЕСЬ/);
});

test('browser PRE-FLIGHT accepts the full 225-zone diamond map', () => {
  assert.doesNotThrow(() => validateWorld(world));
});

test('browser PRE-FLIGHT refuses old 5x5 topology, truncated zones and broken transition references', () => {
  const oldTopology = structuredClone(world);
  oldTopology.topology.type = 'rotated-square-5x5';
  oldTopology.topology.locationCount = 25;
  assert.throws(() => validateWorld(oldTopology), /at least 15x15/);

  const truncated = structuredClone(world);
  truncated.zones.pop();
  assert.throws(() => validateWorld(truncated), /225 unique/);

  const badTransition = structuredClone(world);
  badTransition.transitions[0].to.zoneId = 'missing-zone';
  assert.throws(() => validateWorld(badTransition), /unknown zone/);

  const lostSpot = structuredClone(world);
  const firstField = lostSpot.zones.find(zone => !zone.isSafeCity);
  firstField.eventSpots.pop();
  assert.throws(() => validateWorld(lostSpot), /expected 12 Event Spots/);
});

test('optional biome assets do not block Phaser preload when missing from clean checkout', () => {
  const loaded = [];
  const scene = { load: { image: (key, file) => loaded.push({ key, file }) } };
  const available = new Set([
    './assets/textures/biomes/south_256.jpg',
    './assets/textures/biomes/city_south_512.jpg'
  ]);
  preloadGroundTextures(scene, available);
  assert.deepEqual(loaded.map(({ file }) => file).sort(), [...available].sort());
  loaded.length = 0;
  preloadGroundTextures(scene, new Set());
  assert.equal(loaded.length, 0, 'missing optional files are not queued');
  preloadGroundTextures(scene);
  assert.equal(loaded.length, GROUND_TEXTURE_ASSETS.length, 'legacy standalone preload still works');
});
