export class QuestSystem {
  constructor({ eventSystem, onChange, grantReward } = {}) {
    this.eventSystem = eventSystem;
    this.onChange = onChange;
    this.grantReward = grantReward;
    this.quests = {};
    this.active = null;
    this.stepIndex = 0;
    this.completed = new Set();
    this.seenSignals = new Set();

    this.eventSystem?.on('quest:signal', ({ key }) => this.signal(key));
  }

  async load(url = './data/quests.json') {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Quest load failed: ${response.status}`);
    this.quests = await response.json();
    const auto = Object.values(this.quests).find((quest) => quest.autoStart);
    if (auto) this.start(auto.id);
  }

  start(id, { resetSignals = false } = {}) {
    const quest = this.quests[id];
    if (!quest) return false;
    if (resetSignals) this.seenSignals.clear();
    this.active = quest;
    this.stepIndex = 0;
    this.eventSystem?.emit('quest:start', { id });
    this.advanceFromSeenSignals();
    this.notify();
    return true;
  }

  signal(key) {
    if (!key) return false;
    this.seenSignals.add(key);
    if (!this.active) return false;
    const before = this.stepIndex;
    this.advanceFromSeenSignals();
    return this.stepIndex !== before || !this.active;
  }

  advanceFromSeenSignals() {
    while (this.active) {
      const step = this.active.steps?.[this.stepIndex];
      if (!step || !this.seenSignals.has(step.key)) break;

      this.stepIndex += 1;
      this.eventSystem?.emit('quest:progress', {
        id: this.active.id,
        stepIndex: this.stepIndex,
        key: step.key
      });

      if (this.stepIndex >= this.active.steps.length) {
        this.complete();
        return;
      }
    }

    this.notify();
  }

  complete() {
    if (!this.active) return;
    const quest = this.active;
    this.completed.add(quest.id);
    this.active = null;
    this.stepIndex = 0;
    for (const reward of quest.rewards || []) this.grantReward?.(reward);
    this.eventSystem?.emit('quest:complete', { id: quest.id });
    this.notify();
  }

  statusText() {
    if (!this.active) return this.completed.size ? 'Квест завершён' : 'Нет активного квеста';
    const step = this.active.steps?.[this.stepIndex];
    return `${this.active.title}: ${step?.text || '...'}`;
  }

  notify() {
    this.onChange?.(this.statusText(), this.active);
  }

  executeDevCode(code) {
    if (code === '8001') {
      const first = Object.values(this.quests)[0];
      if (first) {
        this.completed.delete(first.id);
        this.start(first.id, { resetSignals: true });
      }
      return { handled: true, message: '8001 · Квест перезапущен', state: 'ok' };
    }
    if (code === '8099') {
      return { handled: true, message: `8099 · ${this.statusText()}`, state: 'ok' };
    }
    return { handled: false };
  }
}
