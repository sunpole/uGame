export class ResourceSystem {
  constructor({ eventSystem, onChange } = {}) {
    this.eventSystem = eventSystem;
    this.onChange = onChange;
    this.values = new Map();
  }

  add(id, amount = 1) {
    const next = (this.values.get(id) || 0) + amount;
    this.values.set(id, next);
    this.onChange?.(id, next, this.snapshot());
    this.eventSystem?.emit('resource:changed', { id, amount, value: next });
    this.eventSystem?.emit('quest:signal', { key: `resource:${id}` });
    return next;
  }

  get(id) {
    return this.values.get(id) || 0;
  }

  snapshot() {
    return Object.fromEntries(this.values.entries());
  }

  executeDevCode(code) {
    if (code === '6001') {
      const value = this.add('shard', 1);
      return { handled: true, message: `6001 · Осколки: ${value}`, state: 'ok' };
    }
    if (code === '6099') {
      return { handled: true, message: `6099 · Осколки: ${this.get('shard')}`, state: 'ok' };
    }
    return { handled: false };
  }
}
