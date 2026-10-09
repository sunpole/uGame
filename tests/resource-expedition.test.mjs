import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ResourceExpeditionSystem } from '../src/resource-expedition-system.js';

const config = JSON.parse(readFileSync(new URL('../data/resource-expeditions.json', import.meta.url), 'utf8'));
const spawn = (tier = 'T1', encounterId = 'test-001') => ({
  encounterId, masterId: 'stone-master-' + tier.toLowerCase(), resourceDirectionId: 'stone',
  tier, expiresAt: 1_200_000, efficiencyMultiplier: tier === 'T1' ? 1 : 1.6
});

function fixture({ steps = 1000, save = null, random = () => 0.5, onDepleted } = {}) {
  const grants = [], xp = [], refunds = [], snapshots = [];
  const expedition = new ResourceExpeditionSystem({
    config,
    random,
    onChange: (value) => snapshots.push(value),
    availableSteps: () => steps,
    spendSteps: (cost) => {
      if (cost > steps) return false;
      steps -= cost;
      return true;
    },
    addSteps: (amount) => { steps += amount; refunds.push(amount); },
    grantResource: (id, mass, tier) => { grants.push({ id, mass, tier }); return true; },
    grantRelationshipXp: (id, amount) => xp.push({ id, amount }),
    onDepleted
  });
  expedition.initialize(save);
  return { expedition, grants, refunds, xp, snapshots, getSteps: () => steps };
}

test('new encounters guarantee Expedition with Tier-specific counts and old saves retain free extraction', async () => {
  const { MasterCatalog } = await import('../src/master-catalog.js');
  const { MasterEncounterSystem } = await import('../src/master-encounter-system.js');
  const { CharacterMasterRelationshipSystem } = await import('../src/character-master-relationship-system.js');
  const source = JSON.parse(readFileSync(new URL('../data/master-npcs.json', import.meta.url), 'utf8'));
  const catalog = new MasterCatalog();
  for (const master of source.masters) catalog.masters.set(master.id, master);
  for (const module of source.modules) catalog.modules.set(module.id, module);
  for (const master of source.masters) {
    for (let i = 0; i < 15; i += 1) {
      const modules = catalog.rollModules(master.id);
      assert.ok(modules.includes('expedition'), master.id + ' must guarantee Expedition');
      assert.equal(new Set(modules).size, modules.length);
      assert.ok(modules.length >= master.moduleCountMin && modules.length <= master.moduleCountMax);
      if (master.tier === 'T4') assert.equal(modules.length, 6);
    }
  }
  const oldSpawn = {
    masterId: 'stone-master-t1', encounterId: 'saved-old',
    resourceDirectionId:'stone', tier:'T1',
    activeModules:['extraction', 'dialogue'], expiresAt: Date.now()+100000
  };
  let menu = null;
  const rel = new CharacterMasterRelationshipSystem();rel.initialize();
  const encounter = new MasterEncounterSystem({
    worldSpawnStateSystem:{getMasterSpawn:()=>oldSpawn},
    relationshipSystem:rel,masterCatalog:catalog,
    interactionPanel:{showActions:value=>{menu=value}}
  });
  encounter.activate({masterEncounterId:'saved-old'});
  assert.ok(menu.actions.some(x=>x.id==='expedition'),'old save should get guaranteed Expedition');
  assert.ok(menu.actions.some(x=>x.id==='extraction'),'old save should retain free reward');
  assert.equal(encounter.getRewardMarkerState({...oldSpawn, activeModules:['expedition']}).state,'claimed');
  assert.equal(encounter.getRewardMarkerState(oldSpawn).state,'idle');
});

test('four master tiers expose eight resource tiers without prematurely minting locked materials', () => {
  const f = fixture();
  assert.equal(config.maxParticipants, 12);
  assert.deepEqual(['T1','T2','T3','T4'].map(t => f.expedition.allowedTiers(t)),
    [['T1','T2'],['T3','T4'],['T5','T6'],['T7','T8']]);
  assert.deepEqual(f.expedition.enter(spawn('T4'), 0),
    { ok: false, reason: 'skills-locked', tier: 'T7', availableTiers: ['T7','T8'] });
  assert.equal(f.expedition.run, null);
});

test('offline auto harvests finite stock, charges Steps once and restores without duplication', () => {
  const f = fixture();
  assert.equal(f.expedition.enter(spawn(), 1_000).ok, true);
  assert.equal(f.expedition.startAuto(1_000), true);
  f.expedition.update(121_000, true);
  assert.equal(f.expedition.run.extractedUnits, 24);
  assert.equal(f.expedition.run.stockUnits, 76);
  assert.equal(f.expedition.run.spentSteps, 24);
  assert.equal(f.getSteps(), 976);
  assert.equal(f.xp[0].amount, 12);
  const saved = f.expedition.snapshot();
  const restored = fixture({ steps: f.getSteps(), save: saved });
  restored.expedition.update(121_000, true);
  assert.equal(restored.expedition.run.extractedUnits, 24);
  restored.expedition.update(1_500_000, true);
  assert.equal(restored.expedition.run.status, 'depleted');
  assert.equal(restored.expedition.run.extractedUnits, 100);
  assert.equal(restored.expedition.update(1_900_000, true), false);
  assert.equal(restored.expedition.claim(), true);
  assert.deepEqual(restored.grants, [{ id: 'stone', mass: 10, tier: 'T1' }]);
  assert.equal(restored.expedition.claim(), false);
});

test('Encounter expiry caps offline progress and a missed deadline cannot produce extra resources', () => {
  const f = fixture({ steps: 6 });
  f.expedition.enter(spawn(), 1_000);
  f.expedition.startAuto(1_000);
  f.expedition.update(1_500_000, true);
  assert.equal(f.expedition.run.status, 'expired');
  assert.equal(f.expedition.run.extractedUnits, 6);
  assert.equal(f.expedition.run.spentSteps, 6);
  assert.equal(f.expedition.run.cargoUnits, 6);
  assert.equal(f.expedition.run.refundSteps, 0);
  assert.equal(f.expedition.update(2_500_000, true), false);
  assert.equal(f.expedition.run.extractedUnits, 6);
  assert.equal(f.expedition.claim(), true);
  assert.deepEqual(f.grants, [{ id: 'stone', mass: 0.6, tier: 'T1' }]);
});

test('manual accuracy gives improved yield and XP while preserving finite stock', () => {
  const f = fixture();
  f.expedition.enter(spawn(), 1000);
  assert.equal(f.expedition.startManual(1000), true);
  assert.equal(f.expedition.stopManual(1200).reason, 'too-fast');
  const accurate = f.expedition.stopManual(1500); // half of two-second oscillation
  assert.deepEqual({ minedUnits: accurate.minedUnits, result: accurate.result },
    { minedUnits: 5, result: 'точно' });
  assert.equal(f.expedition.run.spentSteps, 2);
  assert.equal(f.xp[0].amount, 20);
  assert.equal(f.expedition.stopManual(1600).ok, false);
  f.expedition.startManual(2000);
  const poor = f.expedition.stopManual(2500 + 340); // outside precision center
  assert.ok(poor.minedUnits <= 3);
  assert.equal(f.expedition.run.extractedUnits, 5 + poor.minedUnits);
});

test('a single miner receives stored Step refund once only when stock reaches zero', () => {
  const f = fixture();
  f.expedition.enter(spawn(), 1000);
  for (let n = 0; n < 20; n += 1) {
    const now = 1000 + n * 1000;
    assert.equal(f.expedition.startManual(now), true);
    assert.equal(f.expedition.stopManual(now + 500).ok, true);
  }
  assert.equal(f.expedition.run.stockUnits, 0);
  assert.equal(f.expedition.run.status, 'depleted');
  assert.equal(f.expedition.run.spentSteps, 40);
  assert.equal(f.expedition.run.refundSteps, 10);
  assert.deepEqual(f.refunds, [10]);
  assert.equal(f.expedition.claim(), true);
  assert.deepEqual(f.grants, [{ id: 'stone', mass: 10, tier: 'T1' }]);
  assert.equal(f.expedition.enter(spawn(), 30_000).reason, 'used');
  assert.equal(f.refunds.length, 1);
});

test('voluntary leaving forfeits refund but keeps already extracted cargo for one claim', () => {
  const f = fixture();
  f.expedition.enter(spawn(), 1000);
  f.expedition.startAuto(1000);
  f.expedition.update(11_000, true);
  assert.equal(f.expedition.leave(12_000), true);
  assert.equal(f.expedition.run.status, 'left');
  assert.equal(f.expedition.run.forfeited, true);
  assert.equal(f.expedition.run.cargoUnits, 2);
  assert.equal(f.expedition.startAuto(), false);
  assert.equal(f.expedition.claim(), true);
  assert.deepEqual(f.grants, [{ id:'stone', mass: 0.2, tier:'T1' }]);
  assert.deepEqual(f.refunds, []);
});

test('no Steps pauses auto, full inventory preserves cargo and does not reroll', () => {
  const f = fixture({ steps: 1 });
  f.expedition.enter(spawn(), 1000);
  f.expedition.startAuto(1000);
  f.expedition.update(101_000, true);
  assert.equal(f.expedition.run.extractedUnits, 0);
  assert.equal(f.expedition.run.mode, 'paused');
  assert.equal(f.expedition.run.spentSteps, 0);
  f.expedition.leave(102_000);
  f.expedition.run.cargoUnits = 1;
  f.expedition.run.extractedUnits = 1;
  f.expedition.grantResource = () => false;
  assert.equal(f.expedition.claim(), false);
  assert.equal(f.expedition.run.cargoUnits, 1);
  f.expedition.grantResource = () => true;
  assert.equal(f.expedition.claim(), true);
  assert.equal(f.expedition.claim(), false);
});

test('depletion stamps exact time and shortens NPC Encounter to a persisted 30-second countdown', async () => {
  const { WorldSpawnStateSystem } = await import('../src/world-spawn-state-system.js');
  const events = [], snapshots = [], depletedEvents = [];
  const now = 1_000;
  const world = new WorldSpawnStateSystem({
    eventSystem: { on() {}, emit: (name, payload) => events.push({ name, payload }) },
    onStateChange: (state) => snapshots.push(state)
  });
  world.state.activeMasterSpawns = [{
    ...spawn('T1','depletion-30'), spotId: 'rock-1', zoneId: 'zone-001'
  }];
  world.initialized = true;
  const f = fixture({ onDepleted: (value) => {
    depletedEvents.push(value);
    world.markExpeditionDepleted(value.encounterId,value.completedAt,30_000);
  } });
  f.expedition.enter(spawn('T1','depletion-30'),now);
  f.expedition.startAuto(now);
  f.expedition.update(501_000,true);
  assert.equal(f.expedition.run.status,'depleted');
  assert.equal(f.expedition.run.completedAt,501_000);
  assert.equal(depletedEvents.length,1);
  assert.equal(world.getMasterSpawn('depletion-30').expeditionCompletedAt,501_000);
  assert.equal(world.getMasterSpawn('depletion-30').expiresAt,531_000);
  assert.equal(world.getMasterSpawn('depletion-30').zoneId,'zone-001');
  assert.equal(world.markExpeditionDepleted('depletion-30',515_000),false);
  assert.equal(snapshots.length,1);
  assert.ok(events.some(x=>x.name==='master-spawns:changed'));
  assert.equal(f.expedition.update(520_000,true),false);
  assert.equal(depletedEvents.length,1);
  assert.equal(f.expedition.claim(),true);
  assert.equal(f.grants.length,1);
});

test('expired and voluntarily abandoned excavations do not trigger Master farewell', () => {
  const depleted = [];
  const abandoned = fixture({ onDepleted: value=>depleted.push(value),steps:1 });
  abandoned.expedition.enter(spawn(),1_000);
  abandoned.expedition.startAuto(1_000);
  abandoned.expedition.update(1_500_000,true);
  assert.equal(abandoned.expedition.run.status,'expired');
  assert.equal(depleted.length,0);
  const left = fixture({ onDepleted: value=>depleted.push(value) });
  left.expedition.enter(spawn(),1_000);
  left.expedition.leave(2_000);
  assert.equal(depleted.length,0);
});

test('immersive Expedition realm owns navigation separately from the original NPC interaction menu', async () => {
  const { ResourceExpeditionView } = await import('../src/resource-expedition-view.js');
  const f = fixture();
  const events = [];
  const view = new ResourceExpeditionView({
    expeditionSystem: f.expedition,
    interactionPanel: { close: () => events.push('close') },
    onOccupancyChange: () => events.push('sync'),
    getSteps: f.getSteps,
    getRelationship: () => ({relationshipXp:10})
  });
  assert.equal(view.isOpen(),false); // server-side Node: DOM is absent
  assert.equal(f.expedition.enter(spawn(),1000).ok,true);
  assert.equal(typeof view.show,'function');
  assert.equal(typeof view.tick,'function');
  view.hide();
  assert.ok(events.includes('sync'));
});

test('master farewell timer is drawn over the head, follows NPC and is destroyed on despawn', async () => {
  const { InteractableSystem } = await import('../src/interactable-system.js');
  const objects = [];
  function obj(x, y, type = 'sprite') {
    const value = {
      x, y, type, active: true, visible: true, text: '',
      width: 34, height: 40,
      setDepth() { return this; }, setOrigin() { return this; },
      setSize(w, h) { this.width = w; this.height = h; return this; },
      setScale() { return this; }, setStrokeStyle() { return this; },
      setText(text) { this.text = String(text); return this; },
      setPosition(a,b) { this.x = a; this.y = b; return this; },
      setRotation() { return this; }, setVisible() { return this; },
      add() { return this; }, setName() { return this; },
      destroy() { this.active = false; }
    };
    objects.push(value);
    return value;
  }
  const scene = {
    add: {
      ellipse: (x,y) => obj(x,y,'ellipse'),
      circle: (x,y) => obj(x,y,'circle'),
      container: (x,y) => obj(x,y,'container'),
      text: (x,y,text) => { const el=obj(x,y,'text');el.setText(text);return el; }
    },
    tweens: { add() {}, killTweensOf() {} }
  };
  const system = new InteractableSystem({ scene, onPrompt() {} });
  const npc = system.add({
    id:'master-interactable:timed',type:'master-npc',x:200,y:200,
    label:'Master',masterTier:'T1',masterEncounterId:'timed',
    masterRewardAvailable:false,masterRewardState:'claimed',
    masterExpeditionCompletedAt:1000,expiresAt:31_000
  });
  assert.ok(npc._masterExpeditionTimer);
  assert.equal(npc._masterExpeditionTimer.y,87);
  assert.match(npc._masterExpeditionTimer.text,/УХОЖУ ЧЕРЕЗ/);
  system.setItemTransform(npc,{x:250,y:230});
  assert.equal(npc._masterExpeditionTimer.y,117);
  system.updateCountdowns(16_000);
  assert.equal(npc._masterExpeditionTimer.text,'УХОЖУ ЧЕРЕЗ 00:15');
  const timer=npc._masterExpeditionTimer;
  assert.equal(system.remove(npc.id),true);
  assert.equal(timer.active,false);
});
