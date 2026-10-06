function clone(value) {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function cleanModifiers(value = {}) {
  return {
    slotBonus: Math.max(0, Math.floor(Number(value.slotBonus) || 0)),
    maxWeightBonusKg: Math.max(0, Number(value.maxWeightBonusKg) || 0),
    stackLimitBonus: Math.max(0, Math.floor(Number(value.stackLimitBonus) || 0)),
    allowedItemIds: Array.isArray(value.allowedItemIds)
      ? [...new Set(value.allowedItemIds.filter((id) => typeof id === 'string' && id))]
      : []
  };
}

function cleanStack(value) {
  if (!value || typeof value !== 'object') return null;
  if (typeof value.itemId !== 'string' || !value.itemId) return null;
  const quantity = Math.floor(Number(value.quantity) || 0);
  if (quantity <= 0) return null;
  return { itemId: value.itemId, quantity };
}

export class ContainerSystem {
  constructor({
    eventSystem,
    itemCatalog,
    configUrl = './data/containers.json',
    onChange
  } = {}) {
    this.eventSystem = eventSystem;
    this.itemCatalog = itemCatalog;
    this.configUrl = configUrl;
    this.onChange = onChange;
    this.configs = new Map();
    this.state = {
      schemaVersion: 1,
      containers: {}
    };
    this.loaded = false;
  }

  async load({ snapshot = null, legacyInventory = null, legacyResources = null } = {}) {
    if (!this.itemCatalog?.loaded) {
      throw new Error('ItemCatalog must load before ContainerSystem');
    }

    const response = await fetch(this.configUrl, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Container config load failed: ${response.status}`);
    }

    const data = await response.json();
    this.configs.clear();
    for (const raw of data.containers || []) {
      if (!raw?.id) continue;
      this.configs.set(raw.id, {
        id: raw.id,
        name: raw.name || raw.id,
        kind: raw.kind === 'equipment' ? 'equipment' : 'grid',
        access: raw.access || 'global',
        slotCount: Math.max(0, Math.floor(Number(raw.slotCount) || 0)),
        slotKeys: Array.isArray(raw.slotKeys) ? raw.slotKeys.filter(Boolean) : [],
        maxWeightKg: raw.maxWeightKg === null || raw.maxWeightKg === undefined
          ? null
          : Math.max(0, Number(raw.maxWeightKg) || 0),
        allowedTags: Array.isArray(raw.allowedTags) ? raw.allowedTags.filter(Boolean) : [],
        allowedItemIds: Array.isArray(raw.allowedItemIds) ? raw.allowedItemIds.filter(Boolean) : [],
        description: raw.description || ''
      });
    }

    this.state = {
      schemaVersion: 1,
      containers: {}
    };

    const source = snapshot?.containers && typeof snapshot.containers === 'object'
      ? snapshot.containers
      : null;
    const hasStoredContainers = source && Object.keys(source).length > 0;

    for (const config of this.configs.values()) {
      this.state.containers[config.id] = this.restoreContainer(config, source?.[config.id]);
    }

    if (!hasStoredContainers && legacyInventory && typeof legacyInventory === 'object') {
      for (const [itemId, rawAmount] of Object.entries(legacyInventory)) {
        const amount = Math.max(0, Math.floor(Number(rawAmount) || 0));
        if (!itemId || amount <= 0) continue;
        const backpack = this.addTo('backpack', itemId, amount, { atomic: false, silent: true });
        if (backpack.remaining > 0) {
          this.addTo('bank', itemId, backpack.remaining, { atomic: false, silent: true });
        }
      }
    }

    if (!hasStoredContainers && legacyResources && typeof legacyResources === 'object') {
      for (const [itemId, rawAmount] of Object.entries(legacyResources)) {
        const item = this.itemCatalog.get(itemId);
        if (!item || item.type !== 'resource' || item.storageMode === 'account') continue;

        const amount = Math.max(0, Math.floor(Number(rawAmount) || 0));
        if (amount <= 0) continue;

        const carried = this.addAuto(itemId, amount, { atomic: false, silent: true });
        if (carried.remaining > 0) {
          this.addTo('bank', itemId, carried.remaining, { atomic: false, silent: true });
        }
      }
    }

    this.loaded = true;
    this.emitChange({ reason: hasStoredContainers ? 'restore' : 'restore-or-migrate' });
    return this.snapshot();
  }

  restoreContainer(config, source) {
    const modifiers = cleanModifiers(source?.modifiers);
    if (config.kind === 'equipment') {
      const slots = {};
      for (const key of config.slotKeys) {
        slots[key] = cleanStack(source?.slots?.[key]);
      }
      return { kind: config.kind, slots, modifiers };
    }

    const slotCount = this.effectiveSlotCount(config, modifiers);
    const slots = Array.from({ length: slotCount }, (_unused, index) => cleanStack(source?.slots?.[index]));
    return { kind: config.kind, slots, modifiers };
  }

  snapshot() {
    return clone(this.state);
  }

  config(id) {
    return this.configs.get(id) || null;
  }

  container(id) {
    return this.state.containers?.[id] || null;
  }

  item(id) {
    return this.itemCatalog.require(id);
  }

  effectiveSlotCount(configOrId, modifiers = null) {
    const config = typeof configOrId === 'string' ? this.config(configOrId) : configOrId;
    if (!config || config.kind === 'equipment') return config?.slotKeys?.length || 0;
    const mods = modifiers || this.container(config.id)?.modifiers || cleanModifiers();
    return Math.max(0, config.slotCount + Math.max(0, Number(mods.slotBonus) || 0));
  }

  effectiveMaxWeightKg(containerId) {
    const config = this.config(containerId);
    const state = this.container(containerId);
    if (!config || !state) return 0;
    if (config.maxWeightKg === null) return Infinity;
    return Math.max(0, config.maxWeightKg + (Number(state.modifiers?.maxWeightBonusKg) || 0));
  }

  stackLimit(containerId, itemId) {
    const state = this.container(containerId);
    const item = this.item(itemId);
    const bonus = Math.max(0, Number(state?.modifiers?.stackLimitBonus) || 0);
    return Math.max(1, Math.floor(item.stackLimit + bonus));
  }

  isAllowed(containerId, itemId) {
    const config = this.config(containerId);
    const state = this.container(containerId);
    const item = this.item(itemId);
    if (!config || !state) return false;

    if (config.kind === 'equipment') {
      return item.tags.includes('equipment') && Boolean(item.equipSlot);
    }

    const allowedIds = new Set([
      ...(config.allowedItemIds || []),
      ...(state.modifiers?.allowedItemIds || [])
    ]);

    if (config.allowedItemIds.length > 0 && !allowedIds.has(itemId)) return false;
    if (config.allowedTags.length > 0 && !config.allowedTags.some((tag) => item.tags.includes(tag))) return false;
    return item.storageMode !== 'account';
  }

  ensureGridSize(containerId) {
    const config = this.config(containerId);
    const state = this.container(containerId);
    if (!config || !state || config.kind !== 'grid') return;
    const target = this.effectiveSlotCount(config, state.modifiers);
    while (state.slots.length < target) state.slots.push(null);
    if (state.slots.length > target) {
      const overflow = state.slots.slice(target).filter(Boolean);
      if (!overflow.length) state.slots.length = target;
    }
  }

  usedSlots(containerId) {
    const state = this.container(containerId);
    if (!state) return 0;
    if (state.kind === 'equipment') return Object.values(state.slots).filter(Boolean).length;
    return state.slots.filter(Boolean).length;
  }

  weightKg(containerId) {
    const state = this.container(containerId);
    if (!state) return 0;
    const stacks = state.kind === 'equipment' ? Object.values(state.slots) : state.slots;
    return stacks.reduce((total, stack) => {
      if (!stack) return total;
      const item = this.item(stack.itemId);
      return total + item.weightKg * stack.quantity;
    }, 0);
  }

  maxAddable(containerId, itemId) {
    const config = this.config(containerId);
    const state = this.container(containerId);
    if (!config || !state || config.kind !== 'grid' || !this.isAllowed(containerId, itemId)) return 0;

    this.ensureGridSize(containerId);
    const item = this.item(itemId);
    const limit = this.stackLimit(containerId, itemId);
    let stackCapacity = 0;

    for (const slot of state.slots) {
      if (!slot) {
        stackCapacity += limit;
      } else if (slot.itemId === itemId) {
        stackCapacity += Math.max(0, limit - slot.quantity);
      }
    }

    const maxWeight = this.effectiveMaxWeightKg(containerId);
    if (!Number.isFinite(maxWeight) || item.weightKg <= 0) return stackCapacity;

    const remainingKg = Math.max(0, maxWeight - this.weightKg(containerId));
    const weightCapacity = Math.floor((remainingKg + 1e-9) / item.weightKg);
    return Math.max(0, Math.min(stackCapacity, weightCapacity));
  }

  addTo(containerId, itemId, amount = 1, { atomic = true, silent = false } = {}) {
    const requested = Math.max(0, Math.floor(Number(amount) || 0));
    if (requested <= 0) return { added: 0, remaining: 0, containerId };

    const config = this.config(containerId);
    const state = this.container(containerId);
    const item = this.item(itemId);

    if (!config || !state || config.kind !== 'grid' || item.storageMode === 'account') {
      return { added: 0, remaining: requested, containerId };
    }

    const capacity = this.maxAddable(containerId, itemId);
    if (atomic && capacity < requested) {
      return { added: 0, remaining: requested, containerId };
    }

    let remaining = Math.min(requested, capacity);
    const target = remaining;
    const limit = this.stackLimit(containerId, itemId);

    for (const slot of state.slots) {
      if (remaining <= 0) break;
      if (!slot || slot.itemId !== itemId || slot.quantity >= limit) continue;
      const add = Math.min(remaining, limit - slot.quantity);
      slot.quantity += add;
      remaining -= add;
    }

    for (let index = 0; index < state.slots.length && remaining > 0; index += 1) {
      if (state.slots[index]) continue;
      const add = Math.min(remaining, limit);
      state.slots[index] = { itemId, quantity: add };
      remaining -= add;
    }

    const added = target - remaining;
    const unresolved = requested - added;
    if (added > 0 && !silent) this.emitChange({ reason: 'add', containerId, itemId, amount: added });
    return { added, remaining: unresolved, containerId };
  }

  addAuto(itemId, amount = 1, { atomic = true, silent = false } = {}) {
    const requested = Math.max(0, Math.floor(Number(amount) || 0));
    const item = this.item(itemId);
    if (requested <= 0) return { added: 0, remaining: 0, containerIds: [] };

    if (item.storageMode === 'account') {
      return { added: requested, remaining: 0, containerIds: [], account: true };
    }

    const order = item.tags.includes('resource')
      ? ['resourcePouch', 'backpack']
      : ['backpack'];

    const capacity = order.reduce((sum, id) => sum + this.maxAddable(id, itemId), 0);
    if (atomic && capacity < requested) {
      return { added: 0, remaining: requested, containerIds: [] };
    }

    let remaining = requested;
    const used = [];
    for (const id of order) {
      if (remaining <= 0) break;
      const result = this.addTo(id, itemId, remaining, { atomic: false, silent: true });
      if (result.added > 0) used.push(id);
      remaining -= result.added;
    }

    const added = requested - remaining;
    if (added > 0 && !silent) this.emitChange({ reason: 'add-auto', itemId, amount: added, containerIds: used });
    return { added, remaining, containerIds: used };
  }

  slot(containerId, ref) {
    const state = this.container(containerId);
    if (!state) return null;
    if (state.kind === 'equipment') return state.slots?.[ref] || null;
    const index = Number(ref);
    return Number.isInteger(index) ? state.slots[index] || null : null;
  }

  removeFrom(containerId, ref, amount = 1, { silent = false } = {}) {
    const state = this.container(containerId);
    const stack = this.slot(containerId, ref);
    if (!state || !stack) return { removed: 0 };

    const requested = Math.max(0, Math.floor(Number(amount) || 0));
    const removed = Math.min(requested, stack.quantity);
    if (removed <= 0) return { removed: 0 };

    stack.quantity -= removed;
    if (stack.quantity <= 0) {
      if (state.kind === 'equipment') state.slots[ref] = null;
      else state.slots[Number(ref)] = null;
    }

    if (!silent) this.emitChange({ reason: 'remove', containerId, itemId: stack.itemId, amount: removed });
    return { removed, itemId: stack.itemId };
  }

  transferStack(fromId, toId, ref) {
    const stack = this.slot(fromId, ref);
    if (!stack) return { moved: 0, remaining: 0 };
    const result = this.addTo(toId, stack.itemId, stack.quantity, { atomic: false, silent: true });
    if (result.added <= 0) return { moved: 0, remaining: stack.quantity };

    this.removeFrom(fromId, ref, result.added, { silent: true });
    this.emitChange({ reason: 'transfer', fromId, toId, itemId: stack.itemId, amount: result.added });
    return { moved: result.added, remaining: result.remaining };
  }

  moveSlotToAuto(fromId, ref) {
    const stack = this.slot(fromId, ref);
    if (!stack) return { moved: 0, remaining: 0 };

    const result = this.addAuto(stack.itemId, stack.quantity, { atomic: false, silent: true });
    if (result.added <= 0) return { moved: 0, remaining: stack.quantity };

    this.removeFrom(fromId, ref, result.added, { silent: true });
    this.emitChange({ reason: 'transfer-auto', fromId, itemId: stack.itemId, amount: result.added });
    return { moved: result.added, remaining: result.remaining };
  }

  equipFrom(containerId, ref) {
    const stack = this.slot(containerId, ref);
    if (!stack) return { equipped: false, reason: 'empty' };
    const item = this.item(stack.itemId);
    const equipment = this.container('equipment');
    if (!item.equipSlot || !equipment) return { equipped: false, reason: 'not-equipment' };

    let slotKey = item.equipSlot;
    if (slotKey === 'ring') {
      slotKey = !equipment.slots.ring1 ? 'ring1' : (!equipment.slots.ring2 ? 'ring2' : null);
    }

    if (!slotKey || !(slotKey in equipment.slots)) return { equipped: false, reason: 'slot' };
    if (equipment.slots[slotKey]) return { equipped: false, reason: 'occupied' };

    equipment.slots[slotKey] = { itemId: stack.itemId, quantity: 1 };
    this.removeFrom(containerId, ref, 1, { silent: true });
    this.emitChange({ reason: 'equip', fromId: containerId, slotKey, itemId: stack.itemId, amount: 1 });
    return { equipped: true, slotKey };
  }

  unequip(slotKey) {
    const equipment = this.container('equipment');
    const stack = equipment?.slots?.[slotKey];
    if (!stack) return { unequipped: false, reason: 'empty' };

    const result = this.addTo('backpack', stack.itemId, 1, { atomic: true, silent: true });
    if (result.added !== 1) return { unequipped: false, reason: 'backpack-full' };

    equipment.slots[slotKey] = null;
    this.emitChange({ reason: 'unequip', slotKey, itemId: stack.itemId, amount: 1 });
    return { unequipped: true };
  }

  updateModifiers(containerId, patch = {}) {
    const state = this.container(containerId);
    const config = this.config(containerId);
    if (!state || !config) return false;

    state.modifiers = cleanModifiers({ ...state.modifiers, ...patch });
    if (config.kind === 'grid') this.ensureGridSize(containerId);
    this.emitChange({ reason: 'modifiers', containerId });
    return true;
  }

  containerStats(containerId) {
    const config = this.config(containerId);
    const state = this.container(containerId);
    if (!config || !state) return null;
    return {
      id: containerId,
      name: config.name,
      kind: config.kind,
      usedSlots: this.usedSlots(containerId),
      slotCount: this.effectiveSlotCount(config, state.modifiers),
      weightKg: this.weightKg(containerId),
      maxWeightKg: this.effectiveMaxWeightKg(containerId)
    };
  }

  summary() {
    const backpack = this.containerStats('backpack');
    const pouch = this.containerStats('resourcePouch');
    if (!backpack || !pouch) return 'не загружен';

    const backpackMax = Number.isFinite(backpack.maxWeightKg) ? `/${backpack.maxWeightKg}кг` : '';
    const pouchMax = Number.isFinite(pouch.maxWeightKg) ? `/${pouch.maxWeightKg}кг` : '';
    return `рюкзак ${backpack.usedSlots}/${backpack.slotCount} · ${backpack.weightKg.toFixed(1)}${backpackMax}; пояс ${pouch.usedSlots}/${pouch.slotCount} · ${pouch.weightKg.toFixed(1)}${pouchMax}`;
  }

  emitChange(detail = {}) {
    if (!this.loaded && detail.reason !== 'restore' && detail.reason !== 'restore-or-migrate') return;
    const snapshot = this.snapshot();
    this.onChange?.(snapshot, detail);
    this.eventSystem?.emit('containers:changed', { state: snapshot, detail });
  }

  executeDevCode(code) {
    if (code === '5001') {
      const result = this.addAuto('test-item', 1);
      return {
        handled: true,
        message: result.added ? '5001 · test-item добавлен в рюкзак' : '5001 · нет места',
        state: result.added ? 'ok' : 'error'
      };
    }

    if (code === '5011') {
      const helmet = this.addAuto('training-helmet', 1);
      const belt = this.addAuto('training-belt', 1);
      const ok = helmet.added === 1 && belt.added === 1;
      return {
        handled: true,
        message: ok ? '5011 · тестовые шлем и пояс добавлены' : '5011 · не хватило места',
        state: ok ? 'ok' : 'error'
      };
    }

    if (code === '5099') {
      return { handled: true, message: `5099 · ${this.summary()}`, state: 'ok' };
    }

    return { handled: false };
  }
}
