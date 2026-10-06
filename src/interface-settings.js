const STORAGE_KEY = 'ugame.ui.settings.v1';

function safeStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

export class InterfaceSettingsSystem {
  constructor({ root = document.documentElement } = {}) {
    this.root = root;
    this.storage = safeStorage();
    this.state = {
      textSelection: false
    };
    this.load();
    this.apply();
  }

  load() {
    try {
      const raw = this.storage?.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed.textSelection === 'boolean') {
        this.state.textSelection = parsed.textSelection;
      }
    } catch {}
  }

  save() {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {}
  }

  apply() {
    this.root?.classList.toggle('ugame-text-selection-enabled', this.state.textSelection);
    this.root?.classList.toggle('ugame-text-selection-disabled', !this.state.textSelection);
  }

  isTextSelectionEnabled() {
    return Boolean(this.state.textSelection);
  }

  setTextSelection(enabled) {
    this.state.textSelection = Boolean(enabled);
    this.save();
    this.apply();
    window.dispatchEvent(new CustomEvent('ugame:interface-settings', {
      detail: { ...this.state }
    }));
    return this.state.textSelection;
  }

  toggleTextSelection() {
    return this.setTextSelection(!this.state.textSelection);
  }
}
