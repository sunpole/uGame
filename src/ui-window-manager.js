const DEFAULT_MIN_SCALE = 0.82;

export class UIWindowManager {
  constructor({ host, margin = 12, minScale = DEFAULT_MIN_SCALE } = {}) {
    this.host = host || null;
    this.margin = Math.max(0, Number(margin) || 0);
    this.minScale = Math.min(1, Math.max(0.65, Number(minScale) || DEFAULT_MIN_SCALE));
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
    panel.dataset.scrollFallback = 'false';
    this.registry.set(panel, { level, close });
    return () => this.registry.delete(panel);
  }

  activate(panel) {
    if (!panel) return;
    const current = this.registry.get(panel);
    const level = current?.level || panel.dataset.uiWindowLevel || 'game-modal';

    for (const [otherPanel, meta] of this.registry.entries()) {
      if (otherPanel === panel || meta.level !== level || otherPanel.hasAttribute('hidden')) continue;
      if (typeof meta.close === 'function') meta.close();
      else otherPanel.setAttribute('hidden', '');
    }

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

    panel.style.setProperty('--ui-window-scale', '1');
    panel.style.maxWidth = '';
    panel.style.maxHeight = '';
    panel.style.overflow = '';
    panel.dataset.scrollFallback = 'false';

    const style = getComputedStyle(panel);
    const bottomInset = style.bottom === 'auto' ? 0 : Math.max(0, parseFloat(style.bottom) || 0);
    const availableWidth = Math.max(1, this.host.clientWidth - this.margin * 2);
    const availableHeight = Math.max(1, this.host.clientHeight - this.margin - Math.max(this.margin, bottomInset));

    const naturalWidth = Math.max(1, panel.scrollWidth, panel.offsetWidth);
    const naturalHeight = Math.max(1, panel.scrollHeight, panel.offsetHeight);
    const requiredScale = Math.min(1, availableWidth / naturalWidth, availableHeight / naturalHeight);
    const scale = Math.max(this.minScale, Number.isFinite(requiredScale) ? requiredScale : 1);

    panel.style.setProperty('--ui-window-scale', scale.toFixed(3));

    if (requiredScale < this.minScale) {
      panel.dataset.scrollFallback = 'true';
      panel.style.maxWidth = `${Math.floor(availableWidth / this.minScale)}px`;
      panel.style.maxHeight = `${Math.floor(availableHeight / this.minScale)}px`;
      panel.style.overflow = 'auto';
    }
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

export { DEFAULT_MIN_SCALE };
