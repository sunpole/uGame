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

  async load(url = './data/quests.json', { restoreState = null } = {}) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Quest load failed: ${response.status}`);
    this.quests = await response.json();

    if (restoreState) {
      this.restore(restoreState);
      if (!this.active) this.startFirstPendingAuto();
      return;
    }

    this.startFirstPendingAuto();
  }

  startFirstPendingAuto() {
    const auto = Object.values(this.quests).find((quest) => quest.autoStart && !this.completed.has(quest.id));
    if (auto) return this.start(auto.id);
    this.notify();
    return false;
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
    this.publishState();
    return true;
  }

  signal(key) {
    if (!key) return false;
    this.seenSignals.add(key);
    if (!this.active) {
      this.publishState();
      return false;
    }

    const before = this.stepIndex;
    this.advanceFromSeenSignals();
    this.publishState();
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

  snapshot() {
    return {
      activeId: this.active?.id || null,
      stepIndex: this.stepIndex,
      completed: [...this.completed],
      seenSignals: [...this.seenSignals],
      lastCompletedTitle: this.lastCompletedTitle
    };
  }

  restore(snapshot = {}) {
    this.completed = new Set(Array.isArray(snapshot.completed) ? snapshot.completed : []);
    this.seenSignals = new Set(Array.isArray(snapshot.seenSignals) ? snapshot.seenSignals : []);
    this.lastCompletedTitle = typeof snapshot.lastCompletedTitle === 'string' ? snapshot.lastCompletedTitle : '';

    const active = snapshot.activeId ? this.quests[snapshot.activeId] : null;
    this.active = active || null;
    if (this.active) {
      const maxIndex = Math.max(0, (this.active.steps?.length || 1) - 1);
      this.stepIndex = Math.min(Math.max(0, Number(snapshot.stepIndex) || 0), maxIndex);
    } else {
      this.stepIndex = 0;
    }

    this.notify();
    return true;
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

  publishState() {
    this.notify();
    this.eventSystem?.emit('quest:state', { state: this.snapshot() });
  }

  executeDevCode(code) {
    if (code === '8001') {
      const first = Object.values(this.quests)[0];
      if (first) {
        this.completed.delete(first.id);
        this.start(first.id, { resetSignals: true });
      }
      return { handled: true, message: '8001 · Первый квест перезапущен с нуля', state: 'ok' };
    }
    if (code === '8099') {
      return { handled: true, message: `8099 · ${this.statusText()}`, state: 'ok' };
    }
    return { handled: false };
  }
}
