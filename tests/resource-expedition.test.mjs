import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ResourceExpeditionSystem } from '../src/resource-expedition-system.js';

const config = JSON.parse(readFileSync(new URL('../data/resource-expeditions.json', import.meta.url), 'utf8'));
const spawn = (tier = 'T1', encounterId = 'test-001') => ({
  encounterId, masterId: 'stone-master-' + tier.toLowerCase(), resourceDirectionId: 'stone',
  tier, expiresAt: 1_200_000, efficiencyMultiplier: tier === 'T1' ? 1 : 1.6
});

function fixture({ steps = 1000, save = null, random = () => 0.5 } = {}) {
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
    grantRelationshipXp: (id, amount) => xp.push({ id, amount })
  });
  expedition.initialize(save);
  return { expedition, grants, refunds, xp, snapshots, getSteps: () => steps };
}

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
