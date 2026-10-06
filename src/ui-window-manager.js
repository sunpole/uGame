export class UIWindowManager {
  constructor({ host, margin = 12 } = {}) {
    this.host = host || null;
    this.margin = Math.max(0, Number(margin) || 0);
    this.registry = new Map();
    this.resizeObserver = null;

    if (this.host && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.fitAll());
      this.resizeObserver.observe(this.host);
    }

    this.onWindowResize = () => this.fitAll();
    window.addEventListener('resize', this.onWindowResize);
  }

  register(panel, { level = 'game-modal', close = null } = {}) {
    if (!panel) return () => {};
    panel.classList.add('ui-game-window');
    panel.dataset.uiWindowLevel = level;
    this.registry.set(panel, { level, close });
    return () => this.registry.delete(panel);
  }

  activate(panel) {
    if (!panel) return;
    this.fitSoon(panel);
  }

  closed(panel) {
    if (!panel) return;
    panel.dataset.scrollFallback = 'false';
  }

  fitSoon(panel) {
    if (!panel) return;
    window.requestAnimationFrame(() => this.fit(panel));
  }

  fit(panel) {
    if (!this.host || !panel || panel.hasAttribute('hidden')) return;
    const availableWidth = Math.max(1, this.host.clientWidth - this.margin * 2);
    const availableHeight = Math.max(1, this.host.clientHeight - this.margin * 2);
    panel.style.maxWidth = `${availableWidth}px`;
    panel.style.maxHeight = `${availableHeight}px`;
    panel.style.overflow = 'auto';
    panel.dataset.scrollFallback = 'true';
  }

  fitAll() {
    for (const panel of this.registry.keys()) this.fit(panel);
  }

  destroy() {
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.onWindowResize);
    this.registry.clear();
  }
}
