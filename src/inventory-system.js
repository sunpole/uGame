export class InventorySystem {
  constructor({ eventSystem, onChange } = {}) {
    this.eventSystem = eventSystem;
    this.onChange = onChange;
    this.items = new Map();
  }

  add(id, amount = 1) {
    const next = (this.items.get(id) || 0) + amount;
    this.items.set(id, next);
    this.onChange?.(id, next, this.snapshot());
    this.eventSystem?.emit('inventory:changed', { id, amount, value: next });
    return next;
  }

  remove(id, amount = 1) {
    const current = this.items.get(id) || 0;
    if (current < amount) return false;
    const next = current - amount;
    if (next <= 0) this.items.delete(id);
    else this.items.set(id, next);
    this.onChange?.(id, Math.max(0, next), this.snapshot());
    this.eventSystem?.emit('inventory:changed', { id, amount: -amount, value: Math.max(0, next) });
    return true;
  }

  has(id, amount = 1) {
    return (this.items.get(id) || 0) >= amount;
  }

  get(id) {
    return this.items.get(id) || 0;
  }

  snapshot() {
    return Object.fromEntries(this.items.entries());
  }

  summary() {
    const entries = [...this.items.entries()];
    if (!entries.length) return 'пусто';
    return entries.map(([id, count]) => `${id}×${count}`).join(', ');
  }

  executeDevCode(code) {
    if (code === '5001') {
      const value = this.add('test-item', 1);
      return { handled: true, message: `5001 · test-item: ${value}`, state: 'ok' };
    }
    if (code === '5099') {
      return { handled: true, message: `5099 · ${this.summary()}`, state: 'ok' };
    }
    return { handled: false };
  }
}
