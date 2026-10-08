function isTypingTarget(target = document.activeElement) {
  if (!target) return false;
  return target.matches?.('input, textarea, select, [contenteditable="true"]') || false;
}

const PRIMARY_CODES = new Set(['KeyE', 'Space', 'Enter']);
const DIRECTION_CODES = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export class ActionRouter {
  constructor({
    getDialogue,
    getInteraction,
    getInventory,
    getProjectHub,
    getExpedition,
    onWorldPrimary
  } = {}) {
    this.getDialogue = getDialogue;
    this.getInteraction = getInteraction;
    this.getInventory = getInventory;
    this.getProjectHub = getProjectHub;
    this.getExpedition = getExpedition;
    this.onWorldPrimary = onWorldPrimary;
    this.boundKeydown = (event) => this.handleKeydown(event);
    this.pointerBindings = [];
    window.addEventListener('keydown', this.boundKeydown, true);
  }

  bindPointerControls(root = document) {
    for (const button of root.querySelectorAll?.('[data-control="action"]') || []) {
      if (button.dataset.actionRouterBound === 'true') continue;
      const handler = (event) => {
        event.preventDefault();
        this.primary();
      };
      button.dataset.actionRouterBound = 'true';
      button.addEventListener('click', handler);
      this.pointerBindings.push({ button, handler });
    }
  }

  destroy() {
    window.removeEventListener('keydown', this.boundKeydown, true);
    for (const { button, handler } of this.pointerBindings) {
      button.removeEventListener('click', handler);
      delete button.dataset.actionRouterBound;
    }
    this.pointerBindings = [];
  }

  handleKeydown(event) {
    if (isTypingTarget(event.target) || isTypingTarget()) return;

    if (event.code === 'Escape') {
      if (this.back()) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    if (DIRECTION_CODES.has(event.code)) {
      if (this.navigate(event.code, event.repeat)) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    if (!PRIMARY_CODES.has(event.code) || event.repeat) return;
    if (this.primary()) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  primary() {
    if (this.getExpedition?.()?.isOpen?.()) return true; // Dedicated scene owns its controls.
    const dialogue = this.getDialogue?.();
    if (dialogue?.isOpen?.()) {
      dialogue.advance();
      return true;
    }

    const interaction = this.getInteraction?.();
    if (interaction?.isOpen?.()) {
      interaction.primaryAction?.();
      return true;
    }

    const inventory = this.getInventory?.();
    if (inventory?.isOpen?.()) {
      const active = document.activeElement;
      if (active instanceof HTMLButtonElement && !active.disabled) {
        active.click();
        return true;
      }
      return false;
    }

    const hub = this.getProjectHub?.();
    if (hub?.isOpen) {
      const active = document.activeElement;
      if (active instanceof HTMLButtonElement && !active.disabled) {
        active.click();
        return true;
      }
      return false;
    }

    this.onWorldPrimary?.();
    return true;
  }

  back() {
    if (this.getExpedition?.()?.isOpen?.()) return true; // Exit requires its explicit confirmation.
    const dialogue = this.getDialogue?.();
    if (dialogue?.isOpen?.()) {
      dialogue.close(false);
      return true;
    }

    const interaction = this.getInteraction?.();
    if (interaction?.isOpen?.()) {
      interaction.close();
      return true;
    }

    const inventory = this.getInventory?.();
    if (inventory?.isOpen?.()) {
      inventory.close();
      return true;
    }

    const hub = this.getProjectHub?.();
    if (hub?.isOpen) {
      hub.back();
      return true;
    }

    return false;
  }

  navigate(code, repeat = false) {
    if (this.getExpedition?.()?.isOpen?.()) return true;
    const interaction = this.getInteraction?.();
    if (interaction?.isOpen?.()) {
      interaction.navigate?.(code);
      return true;
    }

    const dialogue = this.getDialogue?.();
    if (dialogue?.isOpen?.()) {
      if (!repeat && (code === 'ArrowDown' || code === 'ArrowRight')) dialogue.advance();
      return true;
    }

    const inventory = this.getInventory?.();
    const hub = this.getProjectHub?.();
    if (inventory?.isOpen?.() || hub?.isOpen) {
      return false;
    }

    return false;
  }
}
