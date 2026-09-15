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
    this.lastCompletedTitle = '';

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
    this.lastCompletedTitle = '';
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
    this.lastCompletedTitle = quest.title;
    this.active = null;
    this.stepIndex = 0;
    for (const reward of quest.rewards || []) this.grantReward?.(reward);
    this.eventSystem?.emit('quest:complete', { id: quest.id });
    this.notify();
  }

  statusText() {
    if (!this.active) {
      return this.lastCompletedTitle
        ? `✓ ${this.lastCompletedTitle} · завершён`
        : 'Квест · нет активного задания';
    }

    const steps = this.active.steps || [];
    const step = steps[this.stepIndex];
    const progress = `${Math.min(this.stepIndex + 1, steps.length)}/${steps.length}`;
    return `Квест · ${this.active.title} · ${progress} — ${step?.text || '...'}`;
  }

  notify() {
    this.onChange?.(this.statusText(), this.active, {
      stepIndex: this.stepIndex,
      stepCount: this.active?.steps?.length || 0,
      completed: new Set(this.completed)
    });
  }

  executeDevCode(code) {
    if (code === '8001') {
      const first = Object.values(this.quests)[0];
      if (first) {
        this.completed.delete(first.id);
        this.start(first.id);
      }
      return { handled: true, message: '8001 · Квест восстановлен по уже выполненным действиям', state: 'ok' };
    }
    if (code === '8099') {
      return { handled: true, message: `8099 · ${this.statusText()}`, state: 'ok' };
    }
    return { handled: false };
  }
}
