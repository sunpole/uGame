import test from 'node:test';
import assert from 'node:assert/strict';
import { CharacterMasterRelationshipSystem as Relationship } from '../src/character-master-relationship-system.js';
import { MasterProcessSystem } from '../src/master-process-system.js';
import { MasterEncounterSystem } from '../src/master-encounter-system.js';
import { InteractionPanelSystem } from '../src/interaction-panel-system.js';

// No browser save, Phaser canvas, dev server, or external dependencies required.
const masterId = 'water-master-t1';
const currentEncounterId = 'test-current';
const historicalEncounterId = 'test-history';

function fixture({ historical = true, granted = true } = {}) {
  const now = Date.now();
  const spawn = {
    masterId, encounterId: currentEncounterId, zoneId: 'test-zone', tier: 'T1',
    resourceDirectionId: 'water', activeModules: ['extraction'],
    efficiencyMultiplier: 1, expiresAt: now + 120000
  };
  const relationship = new Relationship();
  relationship.initialize({
    schemaVersion: 1, masters: {
      [masterId]: {
        masterId,
        pendingRewards: historical ? [{
          rewardId: 'pending:old',
          processId: 'process:' + historicalEncounterId + ':111',
          baseReward: { resourceId: 'water', tier: 'T1', massKg: 0.5 }
        }] : []
      }
    }
  });
  const world = {
    getMasterSpawn: () => spawn,
    getActiveMasters: () => [spawn],
    getLocationSummary: () => ({ locationBonus: 0 })
  };
  const panels = [], grants = [];
  const ui = {
    showActions: (value) => panels.push(value),
    showMessage: (value) => panels.push(value)
  };
  const process = new MasterProcessSystem({
    relationshipSystem: relationship, worldSpawnStateSystem: world,
    interactionPanel: ui,
    grantResource: (...args) => { grants.push(args); return granted; }
  });
  process.profiles.set('water-basic', {
    id: 'water-basic', moduleId: 'extraction', resourceDirectionId: 'water',
    durationSeconds: 1, rewardRangeKg: { min: 0.1, max: 0.1 }
  });
  const encounter = new MasterEncounterSystem({
    relationshipSystem: relationship, worldSpawnStateSystem: world,
    processSystem: process, interactionPanel: ui,
    masterCatalog: {
      get: () => ({ displayName: 'Master' }),
      getModule: () => ({ label: 'Добыча', implemented: true }),
      moduleLabel: () => 'Добыча'
    }
  });
  function open(actionId) {
    encounter.activate({ masterEncounterId: currentEncounterId });
    const action = panels.at(-1).actions.find((entry) => entry.id === actionId);
    assert.ok(action && !action.disabled, actionId + ' should be accessible');
    action.onSelect();
    return panels.at(-1);
  }
  return { now, spawn, relationship, process, encounter, panels, grants, open };
}

test('historical reward never replaces the current free Extraction', () => {
  const f = fixture();
  const activePanel = f.open('extraction');
  assert.equal(activePanel.title, 'Добыча / Process');
  assert.ok(f.relationship.getActiveProcess(masterId));
  f.process.update(f.now + 3000, true);
  const ready = f.open('extraction');
  assert.match(ready.actions[0].label, /этой встречи/);
  assert.equal(ready.actions[0].onSelect(), true);
  assert.equal(f.relationship.hasClaimedEncounter(masterId, currentEncounterId), true);
  assert.equal(f.relationship.getPendingRewards(masterId).length, 1);
  const old = f.open('historical-rewards');
  assert.match(old.actions[0].label, /прежней встречи/);
  assert.equal(old.actions[0].onSelect(), true);
  assert.equal(f.relationship.hasClaimedEncounter(masterId, historicalEncounterId), true);
  assert.equal(old.actions[0].onSelect(), false);
  assert.equal(f.grants.length, 2);
});

test('direct process start rejects claimed and pending Encounter repeats', () => {
  const rel = new Relationship();
  rel.initialize();
  const process = (id, n) => ({
    masterId, encounterId: id, processId: 'process:' + id + ':' + n
  });
  assert.ok(rel.startProcess(masterId, process('A', 1)));
  assert.equal(rel.startProcess(masterId, process('A', 2)), null);
  rel.ensureMaster(masterId).activeProcess = null;
  rel.ensureMaster(masterId).pendingRewards.push({
    rewardId: 'pending:A', encounterId: 'A'
  });
  assert.equal(rel.startProcess(masterId, process('A', 3)), null);
  assert.ok(rel.startProcess(masterId, process('B', 4)));
  rel.ensureMaster(masterId).activeProcess = null;
  rel.markEncounterRewardClaimed(masterId, 'B');
  assert.equal(rel.startProcess(masterId, process('B', 5)), null);
  const restored = new Relationship();
  restored.initialize(rel.snapshot());
  assert.equal(restored.hasClaimedEncounter(masterId, 'B'), true);
});

test('finished real-time Process exposes only its own claim action', () => {
  const f = fixture({ historical: false });
  f.open('extraction');
  const active = f.panels.at(-1);
  assert.equal(active.title, 'Добыча / Process');
  assert.equal(typeof active.metaProvider, 'function');
  assert.equal(typeof active.onExpired, 'function');
  assert.match(active.metaProvider(f.now + 500), /REAL TIME/);
  assert.equal(active.metaProvider(f.now + 3000), null);
  active.onExpired();
  const ready = f.panels.at(-1);
  assert.equal(ready.title, 'Добыча / готовый результат');
  assert.equal(ready.actions.length, 1);
  assert.match(ready.actions[0].label, /этой встречи/);
});

test('live message expiry does not close its replacement panel', () => {
  const oldWindow = globalThis.window;
  globalThis.window = { addEventListener() {}, setInterval() { return 7; }, clearInterval() {} };
  const el = () => ({
    textContent: '',
    _hidden: true,
    hasAttribute(name) { return name === 'hidden' && this._hidden; },
    setAttribute(name) { if (name === 'hidden') this._hidden = true; },
    removeAttribute(name) { if (name === 'hidden') this._hidden = false; },
    replaceChildren() {},
    querySelectorAll() { return []; }
  });
  try {
    const panel = el(), title = el(), text = el(), meta = el(), options = el(), close = el();
    close.addEventListener = () => {};
    const ui = new InteractionPanelSystem({
      panel, titleElement: title, textElement: text,
      metaElement: meta, optionsElement: options, closeButton: close
    });
    ui.showMessage({
      title: 'Working',
      metaProvider: () => null,
      onExpired: () => ui.showActions({ title: 'Ready', actions: [] })
    });
    assert.equal(panel.hasAttribute('hidden'), false);
    assert.equal(title.textContent, 'Ready');
  } finally {
    if (oldWindow === undefined) delete globalThis.window;
    else globalThis.window = oldWindow;
  }
});
