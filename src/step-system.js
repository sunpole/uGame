function clone(value) {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function nonNegative(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

export class StepSystem {
  constructor({ eventSystem, configUrl = './data/steps-economy.json', onChange } = {}) {
    this.eventSystem = eventSystem;
    this.configUrl = configUrl;
    this.onChange = onChange;
    this.config = null;
    this.state = { schemaVersion: 1, balance: 10000, debt: 0, lastRegenAt: Date.now() };
    this.loaded = false;
    this.nextUpdateAt = 0;
    this.movementCostRemainder = 0;
  }

  async load(snapshot = null) {
    const response = await fetch(this.configUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error('Steps economy config failed: ' + response.status);
    const raw = await response.json();
    this.config = {
      initialSteps: Math.max(0, Math.floor(Number(raw.initialSteps) || 10000)),
      maxSteps: Math.max(1, Math.floor(Number(raw.maxSteps) || 100000000)),
      pixelsPerStep: Math.max(0.01, Number(raw.pixelsPerStep) || 1.2),
      cityRegenFlatPerSecond: Math.max(0, Number(raw.cityRegenFlatPerSecond) || 0),
      cityRegenPercentOfMaxPerSecond: Math.max(0, Number(raw.cityRegenPercentOfMaxPerSecond) || 0),
      dashSpeedMultiplier: Math.max(1, Number(raw.dashSpeedMultiplier) || 2),
      dashSpendRateMultiplier: Math.max(1, Number(raw.dashSpendRateMultiplier) || 4),
      attentionToSteps: Math.max(1, Math.floor(Number(raw.attentionToSteps) || 10000000)),
      stepsToAttention: Math.max(1, Math.floor(Number(raw.stepsToAttention) || 100000000)),
      teleportWalkStepsPerTransition: Math.max(1, Math.floor(Number(raw.teleportWalkStepsPerTransition) || 1000)),
      teleportCostFactor: Math.max(0, Number(raw.teleportCostFactor) || 0.6)
    };
    this.restore(snapshot);
    this.loaded = true;
    const attentionPurchased = this.applyAutoAttention();
    this.publish('load', { attentionPurchased });
    return this;
  }

  restore(snapshot = null) {
    const source = snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot) ? snapshot : {};
    this.state = {
      schemaVersion: 1,
      balance: nonNegative(source.balance, this.config?.initialSteps || 10000),
      debt: nonNegative(source.debt, 0),
      lastRegenAt: Number.isFinite(Number(source.lastRegenAt)) ? Number(source.lastRegenAt) : Date.now()
    };
    return this.snapshot();
  }

  snapshot() { return clone(this.state); }
  get balance() { return this.state.balance; }
  get debt() { return this.state.debt; }
  get maxSteps() { return this.config?.maxSteps || 100000000; }

  configuredCityRegenPerSecond() {
    const flat = Math.max(0, Number(this.config?.cityRegenFlatPerSecond) || 0);
    const percent = Math.max(0, Number(this.config?.cityRegenPercentOfMaxPerSecond) || 0);
    return flat + this.maxSteps * percent;
  }

  regenPerSecond({ safeCity = false } = {}) {
    if (!safeCity || this.state.debt > 0 || this.state.balance >= this.maxSteps) return 0;
    return this.configuredCityRegenPerSecond();
  }

  applyAutoAttention() {
    if (this.config?.autoAttentionAtMax === false || this.state.debt > 0) return 0;
    const threshold = Math.max(1, this.stepsToAttentionAmount());
    if (this.state.balance < threshold) return 0;
    const count = Math.floor(this.state.balance / threshold);
    this.state.balance -= count * threshold;
    return count;
  }

  add(amount, { source = 'reward', payDebt = false } = {}) {
    let value = Math.max(0, Math.floor(Number(amount) || 0));
    if (value <= 0) return this.snapshot();
    let debtPaid = 0;
    if (payDebt && this.state.debt > 0) {
      debtPaid = Math.min(this.state.debt, value);
      this.state.debt -= debtPaid;
      value -= debtPaid;
    }
    if (value > 0) this.state.balance += value;
    const attentionPurchased = this.applyAutoAttention();
    this.publish('add', { source, debtPaid, balanceAdded: value, attentionPurchased });
    return this.snapshot();
  }

  spendDistance(distancePx, { dashing = false, safeCity = false } = {}) {
    const distance = Math.max(0, Number(distancePx) || 0);
    if (distance <= 0 || safeCity) {
      if (safeCity) this.movementCostRemainder = 0;
      return { spent: 0, debtAdded: 0 };
    }

    const speedMultiplier = Math.max(1, Number(this.config?.dashSpeedMultiplier) || 2);
    const rateMultiplier = Math.max(1, Number(this.config?.dashSpendRateMultiplier) || 4);
    const distanceCostMultiplier = dashing ? rateMultiplier / speedMultiplier : 1;
    const rawCost = distance / Math.max(0.01, Number(this.config?.pixelsPerStep) || 1.2)
      * distanceCostMultiplier
      + this.movementCostRemainder;
    const wholeSteps = Math.floor(rawCost);
    this.movementCostRemainder = rawCost - wholeSteps;
    if (wholeSteps <= 0) return { spent: 0, debtAdded: 0 };
    return this.spendMovementSteps(wholeSteps, { source: dashing ? 'dash' : 'walk', publish: false });
  }

  spendMovementSteps(cost, { source = 'movement', publish = true } = {}) {
    const requested = Math.max(0, Math.floor(Number(cost) || 0));
    if (requested <= 0) return { spent: 0, debtAdded: 0 };
    const fromBalance = Math.min(this.state.balance, requested);
    this.state.balance -= fromBalance;
    const debtAdded = requested - fromBalance;
    const beforeDebt = this.state.debt;
    if (debtAdded > 0) this.state.debt += debtAdded;
    if (publish) this.publish('movement-spend', { source, spent: requested, fromBalance, debtAdded });
    if (beforeDebt <= 0 && this.state.debt > 0) this.eventSystem?.emit('steps:debt-started', this.snapshot());
    return { spent: requested, debtAdded };
  }

  teleportCostForTransitions(transitionCount) {
    const count = Math.max(0, Math.floor(Number(transitionCount) || 0));
    const walking = count * Math.max(1, Number(this.config?.teleportWalkStepsPerTransition) || 1000);
    return Math.ceil(walking * Math.max(0, Number(this.config?.teleportCostFactor) || 0.6));
  }

  attentionToStepsAmount() {
    return Math.max(1, Math.floor(Number(this.config?.attentionToSteps) || 10000000));
  }

  stepsToAttentionAmount() {
    return Math.max(1, Math.floor(Number(this.config?.stepsToAttention) || 100000000));
  }

  canSpendService(cost) {
    const requested = Math.max(0, Math.floor(Number(cost) || 0));
    return this.state.debt <= 0 && this.state.balance >= requested;
  }

  spendService(cost, { source = 'service' } = {}) {
    const requested = Math.max(0, Math.floor(Number(cost) || 0));
    if (requested <= 0) return { ok: true, spent: 0 };
    if (!this.canSpendService(requested)) {
      return { ok: false, spent: 0, reason: this.state.debt > 0 ? 'debt' : 'insufficient' };
    }
    this.state.balance -= requested;
    this.publish('service-spend', { source, spent: requested });
    return { ok: true, spent: requested };
  }

  update(now = Date.now(), { safeCity = false, force = false } = {}) {
    if (!this.loaded) return false;
    if (!force && now < this.nextUpdateAt) return false;
    this.nextUpdateAt = now + 1000;

    const regenPerSecond = this.regenPerSecond({ safeCity });
    if (regenPerSecond <= 0) {
      this.state.lastRegenAt = now;
      return false;
    }

    const elapsed = Math.max(0, now - Number(this.state.lastRegenAt || now));
    const stepsPerMs = regenPerSecond / 1000;
    const gain = Math.floor(elapsed * stepsPerMs);
    if (gain <= 0) return false;

    this.state.balance += gain;
    const attentionPurchased = this.applyAutoAttention();
    const consumedMs = gain / stepsPerMs;
    this.state.lastRegenAt = Math.min(now, Number(this.state.lastRegenAt || now) + consumedMs);
    this.publish('city-regen', { amount: gain, regenPerSecond, attentionPurchased });
    return true;
  }

  resetRegenClock(now = Date.now()) { this.state.lastRegenAt = now; }

  statusText() {
    const balance = Math.floor(this.balance).toLocaleString('ru-RU');
    const debt = Math.floor(this.debt).toLocaleString('ru-RU');
    const max = Math.floor(this.maxSteps).toLocaleString('ru-RU');
    return this.debt > 0
      ? 'Шаги ' + balance + ' / ' + max + ' · долг ' + debt
      : 'Шаги ' + balance + ' / ' + max;
  }

  publish(reason, detail = {}) {
    const snapshot = this.snapshot();
    this.onChange?.(snapshot, { reason, ...detail });
    this.eventSystem?.emit('steps:changed', { state: snapshot, reason, detail });
  }

  executeDevCode(code) {
    if (code === '6401') {
      this.add(1000, { source: 'dev' });
      return { handled: true, message: '6401 · +1 000 Шагов', state: 'ok' };
    }
    if (code === '6402') {
      this.spendMovementSteps(1000, { source: 'dev' });
      return { handled: true, message: '6402 · −1 000 Шагов / долг разрешён', state: 'ok' };
    }
    if (code === '6499') {
      return { handled: true, message: '6499 · ' + this.statusText(), state: 'ok' };
    }
    return { handled: false };
  }
}
