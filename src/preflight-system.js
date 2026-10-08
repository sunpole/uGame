const DEFAULT_TIMEOUT_MS = 8000;

function absolute(url, base = document.baseURI) {
  return new URL(url, base).href;
}

async function fetchText(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error(String(response.status) + ' ' + response.statusText);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url) {
  const text = await fetchText(url);
  try { return JSON.parse(text); }
  catch (error) { throw new Error('JSON parse: ' + (error?.message || error)); }
}

function importedSpecs(source) {
  const specs = [];
  const pattern = /(?:^|\n)\s*import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]\s*;?/g;
  let match;
  while ((match = pattern.exec(source))) specs.push(match[1]);
  return specs;
}

function namedImports(source) {
  const result = [];
  const pattern = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = pattern.exec(source))) {
    result.push({
      specifier: match[2],
      names: match[1].split(',').map((part) => part.trim()).filter(Boolean).map((part) => part.split(/\s+as\s+/)[0].trim())
    });
  }
  return result;
}

function exportedNames(source) {
  const names = new Set();
  for (const match of source.matchAll(/export\s+(?:async\s+)?(?:class|function|const|let|var)\s+([A-Za-z_$][\w$]*)/g)) names.add(match[1]);
  for (const match of source.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const raw of match[1].split(',')) {
      const parts = raw.trim().split(/\s+as\s+/);
      const name = (parts[1] || parts[0] || '').trim();
      if (name) names.add(name);
    }
  }
  return names;
}

function stripModuleSyntax(source) {
  return String(source)
    .replace(/^\s*import[^\n;]*(?:;|$)/gm, '')
    .replace(/\bimport\.meta\.url\b/g, JSON.stringify(document.baseURI))
    .replace(/\bimport\.meta\b/g, '({ url: ' + JSON.stringify(document.baseURI) + ' })')
    .replace(/\bexport\s+default\s+/g, '')
    .replace(/\bexport\s+async\s+function\s+/g, 'async function ')
    .replace(/\bexport\s+(class|function|const|let|var)\s+/g, '$1 ')
    .replace(/export\s*\{[^}]*\}\s*;?/g, '');
}

async function collectModuleGraph(entryUrl) {
  const sources = new Map();
  const queue = [absolute(entryUrl)];
  while (queue.length) {
    const url = queue.shift();
    if (sources.has(url)) continue;
    const source = await fetchText(url);
    sources.set(url, source);
    for (const spec of importedSpecs(source)) {
      if (!spec.startsWith('.')) continue;
      const target = absolute(spec, url);
      if (!sources.has(target)) queue.push(target);
    }
  }
  return sources;
}

function validateNamedDependencies(sources) {
  const problems = [];
  for (const [url, source] of sources) {
    for (const imported of namedImports(source)) {
      if (!imported.specifier.startsWith('.')) continue;
      const targetUrl = absolute(imported.specifier, url);
      const target = sources.get(targetUrl);
      if (!target) {
        problems.push('missing ' + imported.specifier);
        continue;
      }
      const exports = exportedNames(target);
      for (const name of imported.names) {
        if (!exports.has(name)) problems.push(name + ' ← ' + imported.specifier);
      }
    }
  }
  if (problems.length) throw new Error('Named imports: ' + problems.slice(0, 8).join(', '));
}

function validateSyntax(sources) {
  const problems = [];
  for (const [url, source] of sources) {
    try {
      new Function(stripModuleSyntax(source));
    } catch (error) {
      problems.push(new URL(url).pathname.split('/').pop() + ': ' + (error?.message || error));
    }
  }
  if (problems.length) throw new Error(problems.slice(0, 5).join(' | '));
}

function validateWorld(world) {
  const zones = Array.isArray(world?.zones) ? world.zones : [];
  const transitions = Array.isArray(world?.transitions) ? world.transitions : [];
  const ids = new Set(zones.map((zone) => zone.id));
  const cities = zones.filter((zone) => zone.isSafeCity === true);
  const fields = zones.filter((zone) => zone.isSafeCity !== true);
  const opposite = { nw: 'se', ne: 'sw', sw: 'ne', se: 'nw' };

  if (zones.length !== 25 || ids.size !== 25) throw new Error('WorldGraph zones must be 25 unique');
  if (Number(world?.worldSize?.width) !== Number(world?.worldSize?.height)) throw new Error('Local world must be square before 45° rotation');
  if (cities.length !== 5 || fields.length !== 20) throw new Error('Expected 5 cities / 20 fields');
  if (transitions.length !== 80) throw new Error('Expected 80 directed transitions');

  for (const transition of transitions) {
    const side = transition?.from?.side;
    if (!opposite[side]) throw new Error('Non-diagonal transition: ' + side);
    if (transition?.to?.entryId !== opposite[side]) throw new Error('Bad opposite entry: ' + transition.id);
  }

  const distance = (a, b) => Math.hypot(Number(a.x) - Number(b.x), Number(a.y) - Number(b.y));
  const pointToWallDistance = (point, wall) => {
    const angle = Number(wall.rotationDeg || 0) * Math.PI / 180;
    const cos = Math.cos(-angle);
    const sin = Math.sin(-angle);
    const dx = Number(point.x) - Number(wall.x);
    const dy = Number(point.y) - Number(wall.y);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    const qx = Math.max(Math.abs(localX) - Number(wall.width) / 2, 0);
    const qy = Math.max(Math.abs(localY) - Number(wall.height) / 2, 0);
    return Math.hypot(qx, qy);
  };

  for (const zone of fields) {
    if ((zone.eventSpots || []).length !== 12) throw new Error(zone.id + ': expected 12 Event Spots');
    const entries = ['nw','ne','sw','se'].map((id) => zone.entries?.[id]).filter(Boolean);
    for (const spot of zone.eventSpots || []) {
      if (entries.some((entry) => distance(spot, entry) < 250)) throw new Error(zone.id + ': spot too close to gate (<250px)');
    }
    for (const wall of zone.walls || []) {
      if (Math.abs(Math.abs(Number(wall.rotationDeg || 0)) - 45) > 0.01) throw new Error(zone.id + ': wall is not ±45°');
      const protectedPoints = [...entries, ...(zone.eventSpots || [])];
      if (protectedPoints.some((point) => pointToWallDistance(point, wall) < 100)) {
        throw new Error(zone.id + ': wall clearance < 100px');
      }
    }
  }
  for (const zone of cities) {
    if ((zone.eventSpots || []).length !== 0) throw new Error(zone.id + ': city Event Spots must be 0');
    const services = (zone.interactables || []).filter((item) => String(item.type || '').startsWith('city-'));
    if (services.length !== 3) throw new Error(zone.id + ': expected 3 city service NPC');
  }
}

function validateStepsEconomy(config) {
  if (Number(config?.initialSteps) !== 10000) throw new Error('Initial Steps must be 10000');
  if (Number(config?.maxSteps) !== 100000000) throw new Error('Max Steps must be 100000000');
  if (Number(config?.pixelsPerStep) !== 1.2) throw new Error('Steps pixelsPerStep must be 1.2');
  if (Number(config?.cityRegenFlatPerSecond) !== 5) throw new Error('City flat regen must be 5/s');
  if (Number(config?.cityRegenPercentOfMaxPerSecond) !== 0) throw new Error('City percent regen baseline must be 0');
  if (config?.autoAttentionAtMax !== true) throw new Error('Auto Attention at max must be enabled');
  if (Number(config?.dashSpeedMultiplier) !== 2 || Number(config?.dashSpendRateMultiplier) !== 4) {
    throw new Error('Dash must be ×2 speed / ×4 spend rate');
  }
  if (Number(config?.attentionToSteps) !== 10000000 || Number(config?.stepsToAttention) !== 100000000) {
    throw new Error('Attention exchange rates mismatch');
  }
  if (Number(config?.teleportWalkStepsPerTransition) !== 1000 || Number(config?.teleportCostFactor) !== 0.6) {
    throw new Error('Teleport Steps formula mismatch');
  }
}

function validateDaylight(config) {
  const expected = {
    'Утро': { tint: 0.25, cityRadius: 3.0, cityDarkness: 0.30, fieldRadius: 1.0, fieldDarkness: 0.76 },
    'День': { tint: 0.15, cityRadius: 2.5, cityDarkness: 0.50, fieldRadius: 1.2, fieldDarkness: 0.88 },
    'Вечер': { tint: 0.15, cityRadius: 2.0, cityDarkness: 0.60, fieldRadius: 1.1, fieldDarkness: 0.94 },
    'Ночь': { tint: 0.25, cityRadius: 1.5, cityDarkness: 0.80, fieldRadius: 0.8, fieldDarkness: 1.05 }
  };
  for (const [phaseName, rules] of Object.entries(expected)) {
    const phase = config?.phases?.[phaseName];
    if (!phase) throw new Error('missing phase: ' + phaseName);
    const tint = (phase.tintLayers || []).reduce((sum, layer) => sum + (Number(layer.opacity) || 0), 0);
    if (Math.abs(tint - rules.tint) > 0.0001) throw new Error(phaseName + ': tint opacity mismatch');
    if (Number(phase.city?.radiusMultiplier) !== rules.cityRadius) throw new Error(phaseName + ': city radius mismatch');
    if (Number(phase.city?.darknessMultiplier) !== rules.cityDarkness) throw new Error(phaseName + ': city darkness mismatch');
    if (Number(phase.field?.radiusMultiplier) !== rules.fieldRadius) throw new Error(phaseName + ': field radius mismatch');
    if (Number(phase.field?.darknessMultiplier) !== rules.fieldDarkness) throw new Error(phaseName + ': field darkness mismatch');
  }
  if (!String(config?.modifierFormula?.radius || '').includes('flatSum')) throw new Error('radius modifier formula missing flat layer');
  if (!String(config?.modifierFormula?.radius || '').includes('multiplierBonusSum')) throw new Error('radius multiplier-bonus layer missing');
  if (!String(config?.modifierFormula?.darkness || '').includes('flatSum')) throw new Error('darkness modifier formula missing flat layer');
}

function validateMassResources(resources, containers) {
  const expected = {
    stone: [0.5, 25],
    wood: [0.2, 10],
    water: [0.1, 5],
    clay: [0.3, 15]
  };
  for (const [id, range] of Object.entries(expected)) {
    const item = (resources?.resources || []).find((resource) => resource.id === id);
    if (!item?.massStorage) throw new Error(id + ': massStorage missing');
    if (Number(item.unitKg) !== 0.1 || Number(item.slotCapacityKg) !== 50) throw new Error(id + ': expected 0.1kg unit / 50kg cell');
    if (Number(item.rewardRangeKg?.min) !== range[0] || Number(item.rewardRangeKg?.max) !== range[1]) throw new Error(id + ': reward kg range mismatch');
    const tiers = Array.isArray(item.tiers) ? item.tiers : [];
    for (const tier of ['T1','T2','T3','T4']) if (!tiers.includes(tier)) throw new Error(id + ': missing ' + tier);
  }
  const equipment = (containers?.containers || []).find((item) => item.id === 'equipment');
  if (!equipment?.slotKeys?.includes('belt') || !equipment?.slotKeys?.includes('bag')) throw new Error('equipment future belt/bag hooks missing');
  const pouch = (containers?.containers || []).find((item) => item.id === 'resourcePouch');
  if (pouch?.enabled !== false) throw new Error('resourcePouch must stay inactive until real belt equipment');
}

function validateMasters(catalog, processes) {
  for (const resource of ['stone', 'water', 'wood', 'clay']) {
    const tiers = new Set((catalog?.masters || []).filter((m) => m.resourceDirectionId === resource).map((m) => m.tier));
    for (const tier of ['T1','T2','T3','T4']) if (!tiers.has(tier)) throw new Error(resource + ' missing ' + tier);
    if (!(processes?.profiles || []).some((p) => p.resourceDirectionId === resource)) throw new Error(resource + ' extraction profile missing');
  }
}

function validateMasterRewardState(sources) {
  const relationship = sources.relationship || '';
  const interactable = sources.interactable || '';
  const encounter = sources.encounter || '';
  const process = sources.process || '';
  if (!relationship.includes('claimedEncounterIds') || !relationship.includes('hasClaimedEncounter')) {
    throw new Error('claimed Encounter reward state missing');
  }
  if (!interactable.includes('_masterRewardMarker') || !interactable.includes('setMasterRewardAvailable')
    || !interactable.includes('marker.destroy?.()')) {
    throw new Error('Master red reward marker missing');
  }
  // The Extraction label is data-driven (master-npcs.json), so the complete
  // "Добыча · получено" string is not a literal in this module.
  // Verify the claimed state, suffix and disabled-action guard instead.
  if (!encounter.includes('isFreeRewardAvailable')
    || !encounter.includes('claimedExtraction')
    || !encounter.includes("' · получено'")
    || !encounter.includes('disabled: !implemented || claimedExtraction')) {
    throw new Error('Encounter reward eligibility UI missing');
  }
  if (!process.includes('Бесплатная добыча у этого NPC') || !process.includes('pendingForEncounter') || !process.includes('openHistoricalRewards') || !relationship.includes('pendingRewardEncounterId')) {
    throw new Error('one-free-reward Process guard missing');
  }
}

function validateMasterRewardRuntime({ MasterEncounterSystem, CharacterMasterRelationshipSystem }) {
  const spawn = {
    masterId: 'test-master', encounterId: 'test-encounter',
    zoneId: 'test-zone', spotId: 'test-spot',
    resourceDirectionId: 'stone', tier: 'T1',
    activeModules: ['extraction'], efficiencyMultiplier: 1,
    expiresAt: Date.now() + 60000
  };
  const marker = { visible: true, setVisible(value) { this.visible = Boolean(value); return this; } };
  const item = {
    id: 'master-interactable:' + spawn.encounterId,
    type: 'master-npc', masterRewardAvailable: true, _masterRewardMarker: marker
  };
  let encounter, claimedActions = [], notificationsEnabled = true;
  const relationship = new CharacterMasterRelationshipSystem({
    onStateChange: () => { if (notificationsEnabled) encounter?.refreshRewardMarkers?.(); }
  });
  const interactable = {
    getItem: (id) => id === item.id ? item : null,
    setMasterRewardAvailable: (target, available) => {
      const current = typeof target === 'string' ? interactable.getItem(target) : target;
      if (!current) return false;
      current.masterRewardAvailable = Boolean(available);
      current._masterRewardMarker?.setVisible?.(Boolean(available));
      return true;
    },
    setItemTransform: () => true
  };
  encounter = new MasterEncounterSystem({
    worldGraph: { getZone: () => ({ eventSpots: [{ id: spawn.spotId, x: 100, y: 100 }] }) },
    zoneSystem: { mapPoint: (point) => point },
    interactableSystem: interactable,
    worldSpawnStateSystem: {
      getActiveMasters: () => [spawn],
      getMasterSpawn: (id) => id === spawn.encounterId ? spawn : null
    },
    relationshipSystem: relationship,
    masterCatalog: {
      get: () => ({ displayName: 'Master' }),
      getModule: () => ({ label: 'Добыча', implemented: true }),
      moduleLabel: () => 'Добыча'
    },
    interactionPanel: { showActions: (value) => { claimedActions = value.actions; } }
  });
  encounter.currentZoneId = spawn.zoneId;
  relationship.initialize();
  if (!encounter.isFreeRewardAvailable(spawn)) throw new Error('fresh Encounter should be unclaimed');
  relationship.markEncounterRewardClaimed(spawn.masterId, spawn.encounterId);
  if (marker.visible !== false) throw new Error('claim event did not hide marker');
  encounter.activate({ masterEncounterId: spawn.encounterId });
  if (!claimedActions.some((x) => x.label === 'Добыча · получено' && x.disabled && !x.onSelect)) {
    throw new Error('claimed Extraction not disabled');
  }

  // A lost visual notification must be repaired during the existing NPC update.
  notificationsEnabled = false;
  item.masterRewardAvailable = true;
  marker.setVisible(true);
  encounter.update(Date.now(), 16.67);
  if (marker.visible !== false) throw new Error('stale red marker was not repaired');

  // Cached logical state may match while the Phaser visibility flag is stale.
  marker.setVisible(true);
  encounter.nextMotionUpdateAt = 0;
  encounter.update(Date.now(), 16.67);
  if (marker.visible !== false) throw new Error('stale Phaser visible flag was not repaired');

  notificationsEnabled = true;
  relationship.initialize(null);
  if (marker.visible !== true) throw new Error('fresh unclaimed marker was not restored');
}

function validateMasterRewardSpriteRuntime(InteractableSystem) {
  // Tests real InteractableSystem drawing rules using a small Phaser-like scene.
  // Never changes the user's game state or canvas.
  const scene = {
    children: { list: [] },
    tweens: {
      active: [],
      add(config) { this.active.push(config); return config; },
      killTweensOf(target) { this.active = this.active.filter((entry) => entry.targets !== target); }
    }
  };
  function graphic(type, x, y, fillColor = null) {
    const object = {
      type, x, y, fillColor, active: true, visible: true,
      setStrokeStyle() { return this; }, setDepth() { return this; },
      setOrigin() { return this; }, setSize() { return this; },
      setName(value) { this.name = value; return this; },
      setVisible(value) { this.visible = Boolean(value); return this; },
      setPosition(px, py) { this.x = px; this.y = py; return this; },
      setRotation() { return this; }, setText() { return this; },
      destroy() {
        this.active = false;
        scene.children.list = scene.children.list.filter((entry) => entry !== this);
      }
    };
    scene.children.list.push(object);
    return object;
  }
  scene.add = {
    ellipse: (x, y, width, height, color) => graphic('Arc', x, y, color),
    circle: (x, y, radius, color) => graphic('Arc', x, y, color),
    container: (x, y) => graphic('Container', x, y),
    text: (x, y) => graphic('Text', x, y)
  };
  const system = new InteractableSystem({ scene });
  const redCount = () => scene.children.list.filter((object) =>
    object.active && object.fillColor === 0xff3b30
  ).length;
  const make = (id, available) => system.add({
    id: 'master-interactable:' + id, type: 'master-npc',
    masterEncounterId: id, x: 40, y: 50,
    label: 'Master', masterTier: 'T1', masterRewardAvailable: available
  });
  const first = make('test-1', true);
  if (redCount() !== 1 || !first._masterRewardMarker) throw new Error('unclaimed marker not created');
  const marker = first._masterRewardMarker;
  system.setMasterRewardAvailable(first, false);
  if (redCount() !== 0 || first._masterRewardMarker || marker.active !== false
    || scene.tweens.active.some((tween) => tween.targets === marker)) {
    throw new Error('claimed marker GameObject/tween not destroyed');
  }
  system.setMasterRewardAvailable(first, true);
  if (redCount() !== 1 || !first._masterRewardMarker) throw new Error('unclaimed marker not restored');
  system.remove(first.id);
  if (redCount() !== 0) throw new Error('marker leaked on removal');
  const claimed = make('test-2', false);
  if (redCount() !== 0 || claimed._masterRewardMarker) throw new Error('claimed spawn created marker');
  system.clear();
  if (redCount() !== 0) throw new Error('marker leaked on zone clear');
}

function validateMasterRewardProvenance({ MasterEncounterSystem, MasterProcessSystem, CharacterMasterRelationshipSystem }) {
  // End-to-end Master Process test: an old pending reward must not masquerade
  // as the new Encounter's reward or block starting a new Process.
  const now = Date.now();
  const masterId = 'preflight-water-t1';
  const currentId = 'preflight-current';
  const previousId = 'preflight-previous';
  const spawn = {
    masterId, encounterId: currentId, zoneId: 'preflight-zone', tier: 'T1',
    resourceDirectionId: 'water', activeModules: ['extraction'],
    efficiencyMultiplier: 1, expiresAt: now + 120000
  };
  const world = {
    getMasterSpawn: () => spawn,
    getActiveMasters: () => [spawn],
    getLocationSummary: () => ({ locationBonus: 0 })
  };
  const catalog = {
    get: () => ({ displayName: 'Water Master' }),
    getModule: () => ({ label: 'Добыча', implemented: true }),
    moduleLabel: () => 'Добыча'
  };
  function setup({ claimed = false, opaque = false, canStore = true } = {}) {
    const panels = [];
    const grants = [];
    const relationship = new CharacterMasterRelationshipSystem();
    relationship.initialize({
      schemaVersion: 1,
      masters: {
        [masterId]: {
          masterId,
          claimedEncounterIds: claimed ? [currentId] : [],
          pendingRewards: [{
            rewardId: 'old-result',
            processId: opaque ? 'opaque-legacy' : 'process:' + previousId + ':1000',
            baseReward: { resourceId: 'water', tier: 'T1', massKg: 0.5 }
          }]
        }
      }
    });
    const panel = {
      showActions: (value) => panels.push(value),
      showMessage: (value) => panels.push(value)
    };
    const process = new MasterProcessSystem({
      relationshipSystem: relationship, interactionPanel: panel,
      worldSpawnStateSystem: world,
      grantResource: (...args) => { grants.push(args); return canStore; }
    });
    process.profiles.set('water-basic', {
      id: 'water-basic', moduleId: 'extraction',
      resourceDirectionId: 'water', durationSeconds: 1,
      rewardRangeKg: { min: 0.1, max: 0.1 }
    });
    const encounter = new MasterEncounterSystem({
      worldSpawnStateSystem: world, relationshipSystem: relationship,
      masterCatalog: catalog, interactionPanel: panel, processSystem: process
    });
    const open = (id) => {
      encounter.activate({ masterEncounterId: currentId });
      const action = panels.at(-1)?.actions?.find((candidate) => candidate.id === id);
      if (!action || action.disabled) throw new Error('missing/disabled ' + id);
      action.onSelect?.();
      return panels.at(-1);
    };
    const take = (view) => {
      const action = view?.actions?.[0];
      if (!action) throw new Error('pending action missing');
      return action.onSelect?.();
    };
    return { relationship, process, encounter, grants, open, take };
  }
  const current = setup();
  current.open('extraction');
  if (!current.relationship.getActiveProcess(masterId)) throw new Error('old pending blocks new Extraction');
  current.process.update(now + 3000, true);
  const currentView = current.open('extraction');
  if (currentView?.actions?.length !== 1 || !currentView.actions[0].label.includes('этой встречи')) {
    throw new Error('new result obscured by old pending');
  }
  if (current.take(currentView) !== true || !current.relationship.hasClaimedEncounter(masterId, currentId)) {
    throw new Error('current claim failed');
  }
  if (current.relationship.getPendingRewards(masterId).length !== 1) throw new Error('old result lost');
  const saved = current.relationship.snapshot();
  const restored = new CharacterMasterRelationshipSystem();
  restored.initialize(saved);
  if (!restored.hasClaimedEncounter(masterId, currentId)
    || restored.getPendingRewards(masterId).length !== 1) throw new Error('claims did not survive reload');

  const oldView = current.open('historical-rewards');
  if (!oldView?.actions?.[0]?.label.includes('прежней встречи')) throw new Error('old result not identified');
  if (current.take(oldView) !== true || !current.relationship.hasClaimedEncounter(masterId, previousId)) {
    throw new Error('historical claim failed');
  }
  if (current.take(oldView) !== false || current.grants.length !== 2) throw new Error('double claim granted twice');

  const locked = setup({ claimed: true });
  if (locked.open('historical-rewards')?.actions?.length !== 1) {
    throw new Error('old result inaccessible when current Extraction claimed');
  }
  const unknown = setup({ opaque: true });
  unknown.take(unknown.open('historical-rewards'));
  if (unknown.relationship.hasClaimedEncounter(masterId, currentId)) {
    throw new Error('unknown legacy reward consumed current Encounter');
  }
  const full = setup({ canStore: false });
  full.take(full.open('historical-rewards'));
  if (full.relationship.getPendingRewards(masterId).length !== 1) throw new Error('failed grant lost reward');
}

function validateVersions(expected, versionJson, packageJson, manifest) {
  const values = [versionJson?.version, packageJson?.version, manifest?.version].map(String);
  if (values.some((value) => value !== expected)) throw new Error('versions: ' + values.join(' / ') + ', expected ' + expected);
}

function createReporter(root) {
  const list = root.querySelector('#preflight-list');
  const summary = root.querySelector('#preflight-summary');
  const rows = new Map();

  function row(id, label) {
    let element = rows.get(id);
    if (!element) {
      element = document.createElement('div');
      element.className = 'preflight-row';
      element.innerHTML = '<span class="preflight-dot">●</span><span class="preflight-label"></span><span class="preflight-detail"></span>';
      element.querySelector('.preflight-label').textContent = label;
      list.appendChild(element);
      rows.set(id, element);
    }
    return element;
  }

  return {
    set(id, label, state, detail = '') {
      const element = row(id, label);
      element.dataset.state = state;
      element.querySelector('.preflight-detail').textContent = detail;
    },
    summary(text, state = '') {
      summary.textContent = text;
      summary.dataset.state = state;
    }
  };
}

export async function runPreflight({ expectedVersion = '0.0.0', root }) {
  if (!root) throw new Error('Preflight root missing');
  const report = createReporter(root);
  const context = {};
  let failed = false;

  const check = async (id, label, fn) => {
    const startedAt = performance.now();
    report.set(id, label, 'running', 'проверка…');
    try {
      const detail = await fn();
      const elapsedMs = Math.max(0, performance.now() - startedAt);
      report.set(id, label, 'ok', (detail || 'OK') + ' · ' + elapsedMs.toFixed(elapsedMs < 100 ? 1 : 0) + ' мс');
      return true;
    } catch (error) {
      const elapsedMs = Math.max(0, performance.now() - startedAt);
      failed = true;
      report.set(id, label, 'fail', (error?.message || String(error)) + ' · ' + elapsedMs.toFixed(elapsedMs < 100 ? 1 : 0) + ' мс');
      return false;
    }
  };

  report.summary('Проверяем сборку перед запуском…');

  await check('manifest', 'Манифест сборки', async () => {
    context.manifest = await fetchJson('./data/preflight-manifest.json');
    return context.manifest.requiredFiles.length + ' обязательных файлов';
  });

  await check('files', 'Доступность обязательных файлов', async () => {
    if (!context.manifest) throw new Error('нет манифеста');
    await Promise.all(context.manifest.requiredFiles.map((url) => fetchText(url)));
    await Promise.all(context.manifest.requiredAssets.map((url) => fetchText(url)));
    return (context.manifest.requiredFiles.length + context.manifest.requiredAssets.length) + ' файлов доступны';
  });

  await check('json', 'JSON-целостность данных', async () => {
    const jsonFiles = (context.manifest?.requiredFiles || []).filter((url) => String(url).endsWith('.json'));
    await Promise.all(jsonFiles.map((url) => fetchJson(url)));
    return jsonFiles.length + ' JSON-файлов корректны';
  });

  await check('versions', 'Согласованность версий', async () => {
    const [versionJson, packageJson] = await Promise.all([fetchJson('./version.json'), fetchJson('./package.json')]);
    validateVersions(expectedVersion, versionJson, packageJson, context.manifest);
    return 'v' + expectedVersion;
  });

  await check('modules', 'Все JS-модули и зависимости', async () => {
    context.modules = await collectModuleGraph(context.manifest?.moduleEntry || './src/main.js');
    for (const file of context.manifest?.moduleFiles || []) {
      const url = absolute(file);
      if (!context.modules.has(url)) context.modules.set(url, await fetchText(file));
    }
    validateNamedDependencies(context.modules);
    return context.modules.size + ' JS-файлов доступны и связаны';
  });

  await check('syntax', 'Синтаксис JS-модулей', async () => {
    if (!context.modules) throw new Error('граф модулей не построен');
    validateSyntax(context.modules);
    return context.modules.size + ' модулей без синтаксических ошибок';
  });

  await check('steps-economy', 'Экономика Шагов', async () => {
    const config = await fetchJson('./data/steps-economy.json');
    validateStepsEconomy(config);
    return '10 000 start · 100 000 000 max · 1.2 px/Step · city +5/s · auto Attention OK';
  });

  await check('daylight', 'Daylight / Vision modifiers', async () => {
    const config = await fetchJson('./data/daylight-vision.json');
    validateDaylight(config);
    return 'Утро/День/Вечер/Ночь · city/field · flat/multiplier/bonus stack OK';
  });

  await check('mass-resources', 'Mass-resources / Tiers', async () => {
    const [resources, containers] = await Promise.all([
      fetchJson('./data/resources.json'),
      fetchJson('./data/containers.json')
    ]);
    validateMassResources(resources, containers);
    return 'Stone / Wood / Water / Clay · T1–T4 · 0.1kg · 50kg/cell';
  });

  await check('world', 'Целостность WorldGraph', async () => {
    context.world = await fetchJson('./data/world.json');
    validateWorld(context.world);
    return '25 зон · 5 городов · 80 переходов · 12 spots/field';
  });

  await check('masters', 'Master runtime / Process', async () => {
    const [catalog, processes] = await Promise.all([
      fetchJson('./data/master-npcs.json'),
      fetchJson('./data/master-processes.json')
    ]);
    validateMasters(catalog, processes);
    return 'Stone / Water / Forest / Clay T1–T4';
  });

  await check('master-reward-marker', 'Master reward marker', async () => {
    const [relationship, interactable, encounter, process] = await Promise.all([
      fetchText('./src/character-master-relationship-system.js'),
      fetchText('./src/interactable-system.js'),
      fetchText('./src/master-encounter-system.js'),
      fetchText('./src/master-process-system.js')
    ]);
    validateMasterRewardState({ relationship, interactable, encounter, process });
    const [{ MasterEncounterSystem }, { CharacterMasterRelationshipSystem }, { InteractableSystem }, { MasterProcessSystem }] = await Promise.all([
      import('./master-encounter-system.js'),
      import('./character-master-relationship-system.js'),
      import('./interactable-system.js'),
      import('./master-process-system.js')
    ]);
    validateMasterRewardRuntime({ MasterEncounterSystem, CharacterMasterRelationshipSystem });
    validateMasterRewardSpriteRuntime(InteractableSystem);
    validateMasterRewardProvenance({ MasterEncounterSystem, MasterProcessSystem, CharacterMasterRelationshipSystem });
    return 'Phaser marker · 1 free / Encounter · historical/current claim runtime OK';
  });

  await check('textures', 'Конфигурация текстур', async () => {
    const config = await fetchJson('./data/biome-textures.json');
    const entries = Array.isArray(config?.textures) ? config.textures : [];
    if (entries.length < 12) throw new Error('ожидалось минимум 12 texture slots');
    const enabled = entries.filter((entry) => entry.enabled !== false && entry.textureFile);
    const checks = await Promise.all(enabled.map(async (entry) => {
      try { await fetchText(entry.textureFile); return true; } catch { return false; }
    }));
    const missing = checks.filter((ok) => !ok).length;
    if (missing) throw new Error('недоступно texture assets: ' + missing);
    return enabled.length + ' texture assets доступны';
  });

  await check('phaser', 'Phaser runtime', async () => {
    if (!globalThis.Phaser?.Game) throw new Error('Phaser не загрузился');
    return 'Phaser ' + (globalThis.Phaser.VERSION || 'OK');
  });

  if (failed) {
    report.summary('PRE-FLIGHT FAILED · игра не запущена', 'fail');
    return { ok: false, report, context };
  }

  report.summary('PRE-FLIGHT OK · запускаем игровой модуль…', 'ok');
  return { ok: true, report, context };
}
