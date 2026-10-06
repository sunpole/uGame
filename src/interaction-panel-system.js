export class InteractionPanelSystem {
  constructor({
    panel,
    titleElement,
    textElement,
    optionsElement,
    metaElement,
    closeButton,
    onOpenChange,
    windowManager
  } = {}) {
    this.panel = panel;
    this.titleElement = titleElement;
    this.textElement = textElement;
    this.optionsElement = optionsElement;
    this.metaElement = metaElement;
    this.closeButton = closeButton;
    this.onOpenChange = onOpenChange;
    this.windowManager = windowManager;
    this.currentOffer = null;
    this.unregisterWindow = this.windowManager?.register(this.panel, {
      level: 'game-modal',
      close: () => this.close()
    }) || null;

    this.closeButton?.addEventListener('click', () => this.close());
    window.addEventListener('keydown', (event) => {
      if (!this.isOpen() || event.code !== 'Escape') return;
      event.preventDefault();
      this.close();
    }, true);
  }

  isOpen() {
    return this.panel && !this.panel.hasAttribute('hidden');
  }

  open() {
    this.windowManager?.activate(this.panel);
    this.panel?.removeAttribute('hidden');
    this.windowManager?.fitSoon(this.panel);
    this.onOpenChange?.(true);
  }

  close() {
    this.currentOffer = null;
    this.panel?.setAttribute('hidden', '');
    this.windowManager?.closed(this.panel);
    this.onOpenChange?.(false);
  }

  navigableButtons() {
    return [...(this.optionsElement?.querySelectorAll('.interaction-option:not(:disabled)') || [])];
  }

  focusButton(button) {
    for (const item of this.optionsElement?.querySelectorAll('.interaction-option') || []) {
      delete item.dataset.focused;
    }
    if (!button) return;
    button.dataset.focused = 'true';
    button.focus({ preventScroll: true });
  }

  navigate(code) {
    const buttons = this.navigableButtons();
    if (!buttons.length) return false;

    const current = buttons.findIndex((button) => button.dataset.focused === 'true' || button === document.activeElement);
    const step = code === 'ArrowLeft' || code === 'ArrowUp' ? -1 : 1;
    const nextIndex = current < 0
      ? 0
      : (current + step + buttons.length) % buttons.length;
    this.focusButton(buttons[nextIndex]);
    return true;
  }

  primaryAction() {
    if (!this.isOpen()) return false;
    const buttons = this.navigableButtons();
    if (buttons.length) {
      const current = buttons.find((button) => button.dataset.focused === 'true' || button === document.activeElement) || buttons[0];
      this.focusButton(current);
      current.click();
      return true;
    }
    this.close();
    return true;
  }

  clear() {
    if (this.titleElement) this.titleElement.textContent = '';
    if (this.textElement) this.textElement.textContent = '';
    if (this.metaElement) this.metaElement.textContent = '';
    if (this.optionsElement) this.optionsElement.replaceChildren();
  }

  showMessage({ title = 'Событие', text = '', meta = '' } = {}) {
    this.clear();
    if (this.titleElement) this.titleElement.textContent = title;
    if (this.textElement) this.textElement.textContent = text;
    if (this.metaElement) this.metaElement.textContent = meta;
    if (this.closeButton) this.closeButton.textContent = 'Закрыть';
    this.open();
  }

  showRewardOffer({
    title = 'Выбор награды',
    text = '',
    offer,
    onChoose,
    onComplete
  } = {}) {
    if (!offer?.options?.length) return false;

    this.clear();
    this.currentOffer = offer;
    if (this.titleElement) this.titleElement.textContent = title;
    if (this.textElement) this.textElement.textContent = text;
    if (this.closeButton) this.closeButton.textContent = 'Закрыть';

    const maxChoices = Math.max(1, Number(offer.maxChoices || 1));
    const selected = new Set(
      Array.isArray(offer.selectedIndices)
        ? offer.selectedIndices.filter((value) => Number.isInteger(value))
        : []
    );
    const revealUnchosenAfterComplete = offer.revealUnchosenAfterComplete !== false;
    const optionButtons = [];

    const done = () => selected.size >= maxChoices;

    const rewardText = (option, index) => {
      const reward = option.reward || {};
      const label = option.label || `Вариант ${index + 1}`;
      const value = `${reward.qualityLabel || ''} · ${reward.resourceName || reward.resourceId || 'Награда'} ×${reward.amount || 1}`;
      return offer.hidden ? `${label} → ${value}` : value;
    };

    const hiddenText = (option, index) => option.label || `Вариант ${index + 1}`;

    const renderOption = (button, option, index, revealMissed = false) => {
      const isSelected = selected.has(index);
      const reveal = !offer.hidden || isSelected || revealMissed;

      button.textContent = reveal ? rewardText(option, index) : hiddenText(option, index);
      button.disabled = isSelected || done();

      if (isSelected) button.dataset.selected = 'true';
      else delete button.dataset.selected;

      if (revealMissed && !isSelected) button.dataset.missed = 'true';
      else delete button.dataset.missed;
    };

    const updateMeta = () => {
      if (!this.metaElement) return;
      const remaining = Math.max(0, maxChoices - selected.size);
      if (remaining > 0) {
        this.metaElement.textContent = `Можно выбрать ещё: ${remaining}`;
        return;
      }
      this.metaElement.textContent = revealUnchosenAfterComplete && offer.hidden
        ? 'Выбор завершён · показано, что было в остальных вариантах'
        : 'Выбор завершён';
    };

    const renderAll = ({ revealMissed = false } = {}) => {
      for (const { button, option, index } of optionButtons) {
        renderOption(button, option, index, revealMissed);
      }
      updateMeta();
      this.windowManager?.fitSoon(this.panel);
    };

    offer.options.forEach((option, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'interaction-option';
      optionButtons.push({ button, option, index });
      renderOption(button, option, index, false);

      button.addEventListener('click', async () => {
        if (selected.has(index) || done()) return;

        button.disabled = true;
        const accepted = await onChoose?.(option, index);
        if (accepted === false) {
          button.disabled = false;
          return;
        }

        selected.add(index);
        offer.selectedIndices = [...selected];

        const isComplete = done();
        renderAll({
          revealMissed: isComplete && revealUnchosenAfterComplete
        });

        if (isComplete) onComplete?.(offer);
      });

      this.optionsElement?.append(button);
    });

    const alreadyComplete = done();
    renderAll({
      revealMissed: alreadyComplete && revealUnchosenAfterComplete
    });
    this.open();
    this.focusButton(this.navigableButtons()[0] || null);

    if (alreadyComplete) onComplete?.(offer);
    return true;
  }
}
