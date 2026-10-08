function copy(value) {
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}
const positiveInt = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : fallback;
};
const tierNumber = (tier) => Number(String(tier || '').replace(/^T/, '')) || 1;
const roundUnits = (kg) => Math.max(1, Math.round(Number(kg || 0) * 10));

export class ResourceExpeditionSystem {
  constructor({ config = null, onChange, availableSteps, spendSteps, addSteps, grantResource, grantRelationshipXp, onDepleted, random = Math.random } = {}) {
    this.config = config;
    this.onChange = onChange;
    this.availableSteps = availableSteps;
    this.spendSteps = spendSteps;
    this.addSteps = addSteps;
    this.grantResource = grantResource;
    this.grantRelationshipXp = grantRelationshipXp;
    this.onDepleted = onDepleted;
    this.random = random;
    this.state = { schemaVersion: 1, usedEncounterIds: [], run: null };
    this.nextSyncAt = 0;
  }

  async load(url = './data/resource-expeditions.json') {
    if (this.config) return this;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('Expedition config failed: ' + response.status);
    this.config = await response.json();
    return this;
  }

  initialize(snapshot = null) {
    const used = Array.isArray(snapshot?.usedEncounterIds)
      ? snapshot.usedEncounterIds.filter((id) => typeof id === 'string' && id).slice(-300)
      : [];
    let run = snapshot?.run && typeof snapshot.run === 'object' ? copy(snapshot.run) : null;
    if (run && (typeof run.encounterId !== 'string' || !run.encounterId || typeof run.masterId !== 'string')) run = null;
    if (run) {
      for (const key of ['stockUnits','initialUnits','cargoUnits','extractedUnits','spentSteps','refundSteps',
        'lastAutoAt','endsAt','autoCycles','manualAttempts','manualStartedAt','completedAt']) {
        run[key] = positiveInt(run[key]);
      }
      run.mode = run.mode === 'auto' ? 'auto' : 'paused'; // A half-played manual attempt cannot resume after reload.
      run.status = ['active','depleted','expired','left'].includes(run.status) ? run.status : 'expired';
      if (run.status !== 'active') run.mode = 'paused';
      run.initialUnits = Math.max(1, run.initialUnits);
      run.stockUnits = Math.min(run.initialUnits, run.stockUnits);
      run.extractedUnits = Math.min(run.initialUnits, run.extractedUnits);
      run.cargoUnits = Math.min(run.extractedUnits, run.cargoUnits);
      run.forfeited = Boolean(run.forfeited);
      run.claimed = Boolean(run.claimed);
    }
    this.state = { schemaVersion: 1, usedEncounterIds: [...new Set(used)], run };
    return this.snapshot();
  }

  snapshot() { return copy(this.state); }
  get run() { return this.state.run; }
  isOccupied() { return this.run?.status === 'active'; }

  allowedTiers(masterTier) {
    return this.config?.resourceTiersByMasterTier?.[masterTier] || [];
  }

  enter(spawn, now = Date.now()) {
    if (!this.config || !spawn?.encounterId || !spawn?.masterId || !spawn?.resourceDirectionId) {
      return { ok: false, reason: 'invalid' };
    }
    this.update(now, true);
    if (this.run?.status === 'active') {
      return this.run.encounterId === spawn.encounterId
        ? { ok: true, resumed: true }
        : { ok: false, reason: 'occupied' };
    }
    if (this.run && !this.run.claimed) return { ok: false, reason: 'unclaimed' };
    if (Number(spawn.expiresAt) <= now) return { ok: false, reason: 'expired' };
    if (this.state.usedEncounterIds.includes(spawn.encounterId)) return { ok: false, reason: 'used' };

    const tier = this.allowedTiers(spawn.tier)[0];
    if (!tier) return { ok: false, reason: 'unsupported-tier' };
    if (!this.config.enabledResourceTiers.includes(tier)) {
      return { ok: false, reason: 'skills-locked', tier, availableTiers: this.allowedTiers(spawn.tier) };
    }
    const initialUnits = roundUnits(this.config.initialStockKg);
    this.state.run = {
      expeditionId: 'expedition:' + spawn.encounterId,
      encounterId: spawn.encounterId,
      masterId: spawn.masterId,
      masterTier: spawn.tier,
      resourceId: spawn.resourceDirectionId,
      tier,
      endsAt: Number(spawn.expiresAt),
      startedAt: now,
      completedAt: 0,
      status: 'active',
      mode: 'paused',
      initialUnits,
      stockUnits: initialUnits,
      extractedUnits: 0,
      cargoUnits: 0,
      spentSteps: 0,
      refundSteps: 0,
      autoCycles: 0,
      manualAttempts: 0,
      manualStartedAt: 0,
      lastAutoAt: now,
      forfeited: false,
      claimed: false,
      multiplier: Math.max(1, Number(spawn.efficiencyMultiplier) || 1)
    };
    this.state.usedEncounterIds.push(spawn.encounterId);
    this.state.usedEncounterIds = this.state.usedEncounterIds.slice(-300);
    this.publish();
    return { ok: true, resumed: false };
  }

  startAuto(now = Date.now()) {
    this.update(now, true);
    if (!this.isOccupied() || this.run.stockUnits === 0) return false;
    this.run.mode = 'auto';
    this.run.manualStartedAt = 0;
    this.run.lastAutoAt = now;
    this.publish();
    return true;
  }

  pause(now = Date.now()) {
    this.update(now, true);
    if (!this.isOccupied()) return false;
    this.run.mode = 'paused';
    this.run.manualStartedAt = 0;
    this.publish();
    return true;
  }

  startManual(now = Date.now()) {
    this.update(now, true);
    if (!this.isOccupied() || this.run.stockUnits === 0) return false;
    this.run.mode = 'manual';
    this.run.manualStartedAt = now;
    this.publish();
    return true;
  }

  meterPosition(now = Date.now()) {
    const start = this.run?.manualStartedAt || now;
    const period = Math.max(500, Number(this.config?.manual?.meterPeriodMs) || 2000);
    const phase = ((Math.max(0, now - start) % period) / period) * 2;
    return phase <= 1 ? phase : 2 - phase;
  }

  stopManual(now = Date.now()) {
    if (!this.isOccupied() || this.run.mode !== 'manual' || !this.run.manualStartedAt) return { ok: false, reason: 'not-playing' };
    if (now < this.run.manualStartedAt + 400) return { ok: false, reason: 'too-fast' };
    const elapsed = now - this.run.manualStartedAt;
    if (now > this.run.endsAt) {
      this.update(now, true);
      return { ok: false, reason: 'expired' };
    }
    const cost = positiveInt(this.config?.manual?.stepsPerAttempt, 2);
    const accuracy = elapsed > Number(this.config.manual.maxAttemptMs)
      ? -1
      : 0.5 - Math.abs(this.meterPosition(now) - 0.5);
    const result = (this.config.manual.results || []).find((option) => accuracy >= Number(option.minAccuracy));
    const units = result ? roundUnits(result.massKg) : 0;
    if (cost > 0 && this.availableSteps() < cost) {
      this.run.mode = 'paused';
      this.run.manualStartedAt = 0;
      this.publish();
      return { ok: false, reason: 'no-steps' };
    }
    if (cost > 0 && !this.spendSteps(cost)) return { ok: false, reason: 'no-steps' };
    this.run.spentSteps += cost;
    this.run.manualAttempts += 1;
    this.run.mode = 'paused';
    this.run.manualStartedAt = 0;
    const mined = Math.min(units, this.run.stockUnits);
    this.run.stockUnits -= mined;
    this.run.extractedUnits += mined;
    this.run.cargoUnits += mined;
    if (mined > 0) this.grantRelationshipXp?.(this.run.masterId, Math.max(1, Math.round(Number(result.baseRelationshipXp) * this.run.multiplier)));
    if (this.run.stockUnits === 0) this.finish('depleted', now);
    this.publish();
    return { ok: true, minedUnits: mined, result: result?.name || 'промах' };
  }

  update(now = Date.now(), force = false) {
    if (!force && now < this.nextSyncAt) return false;
    this.nextSyncAt = now + 1000;
    const run = this.run;
    if (!run || run.status !== 'active') return false;
    let changed = false;
    const cappedNow = Math.min(now, run.endsAt);
    if (run.mode === 'auto' && cappedNow > run.lastAutoAt) {
      const cfg = this.config.automatic;
      const cycleMs = Math.max(1000, Number(cfg.cycleSeconds) * 1000);
      const units = roundUnits(cfg.massKgPerCycle);
      const cost = positiveInt(cfg.stepsPerCycle, 2);
      const elapsedCycles = Math.floor((cappedNow - run.lastAutoAt) / cycleMs);
      const possible = Math.min(elapsedCycles, Math.ceil(run.stockUnits / units),
        cost > 0 ? Math.floor(Math.max(0, this.availableSteps()) / cost) : elapsedCycles);
      if (possible > 0 && (cost === 0 || this.spendSteps(possible * cost))) {
        const mined = Math.min(run.stockUnits, possible * units);
        run.stockUnits -= mined;
        run.extractedUnits += mined;
        run.cargoUnits += mined;
        run.autoCycles += possible;
        run.spentSteps += possible * cost;
        run.lastAutoAt += possible * cycleMs;
        this.grantRelationshipXp?.(run.masterId, Math.max(1, Math.round(possible * Number(cfg.baseRelationshipXp || 1) * run.multiplier)));
        changed = true;
      }
      if (possible < elapsedCycles && run.stockUnits > 0) {
        run.mode = 'paused'; // No stored backlog that can be collected later without Steps.
        changed = true;
      }
    }
    if (run.stockUnits === 0) {
      this.finish('depleted', run.lastAutoAt || cappedNow);
      changed = true;
    } else if (now >= run.endsAt) {
      this.finish('expired');
      changed = true;
    }
    if (changed) this.publish();
    return changed;
  }

  finish(reason, at = Date.now()) {
    if (!this.isOccupied()) return false;
    if (reason === 'depleted') {
      this.run.completedAt = Math.min(this.run.endsAt, Math.max(this.run.startedAt, Math.floor(at)));
      this.onDepleted?.({ encounterId: this.run.encounterId, completedAt: this.run.completedAt });
    }
    this.run.status = reason;
    this.run.mode = 'paused';
    this.run.manualStartedAt = 0;
    if (reason === 'depleted' && !this.run.forfeited && !this.run.refundSteps) {
      const bounds = this.config.soloStepRefundPercent;
      const min = Number(bounds.min);
      const max = Number(bounds.max);
      const ratio = (min + this.random() * (max - min)) / 100;
      const refund = Math.min(this.run.spentSteps, Math.floor(this.run.spentSteps * ratio));
      this.run.refundSteps = refund;
      if (refund > 0) this.addSteps?.(refund);
    }
    return true;
  }

  leave(now = Date.now()) {
    this.update(now, true);
    if (!this.isOccupied()) return false;
    this.run.forfeited = true;
    this.finish('left');
    this.publish();
    return true;
  }

  claim(now = Date.now()) {
    this.update(now, true);
    const run = this.run;
    if (!run || run.status === 'active' || run.claimed) return false;
    if (run.cargoUnits && this.grantResource?.(run.resourceId, run.cargoUnits / 10, run.tier) !== true) return false;
    run.cargoUnits = 0;
    run.claimed = true;
    this.publish();
    return true;
  }

  publish() { this.onChange?.(this.snapshot()); }
}
