export class InteractionPanelSystem {
  constructor({
    panel,
    titleElement,
    textElement,
    optionsElement,
    metaElement,
    closeButton,
    onOpenChange
  } = {}) {
    this.panel = panel;
    this.titleElement = titleElement;
    this.textElement = textElement;
    this.optionsElement = optionsElement;
    this.metaElement = metaElement;
    this.closeButton = closeButton;
    this.onOpenChange = onOpenChange;
    this.currentOffer = null;

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
    this.panel?.removeAttribute('hidden');
    this.onOpenChange?.(true);
  }

  close() {
    this.currentOffer = null;
    this.panel?.setAttribute('hidden', '');
    this.onOpenChange?.(false);
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

    const selected = new Set(
      Array.isArray(offer.selectedIndices)
        ? offer.selectedIndices.filter((value) => Number.isInteger(value))
        : []
    );

    const updateMeta = () => {
      const remaining = Math.max(0, Number(offer.maxChoices || 1) - selected.size);
      if (this.metaElement) {
        this.metaElement.textContent = remaining > 0
          ? `Можно выбрать ещё: ${remaining}`
          : 'Выбор завершён';
      }
    };

    const revealText = (option, index, wasSelected = false) => {
      const reward = option.reward || {};
      if (offer.hidden && !wasSelected) return option.label || `Сундук ${index + 1}`;
      const prefix = offer.hidden ? `${option.label || `Сундук ${index + 1}`} → ` : '';
      return `${prefix}${reward.qualityLabel || ''} · ${reward.resourceName || reward.resourceId || 'Награда'} ×${reward.amount || 1}`;
    };

    offer.options.forEach((option, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'interaction-option';
      const alreadySelected = selected.has(index);
      button.textContent = revealText(option, index, alreadySelected);
      button.disabled = alreadySelected || selected.size >= Number(offer.maxChoices || 1);
      if (alreadySelected) button.dataset.selected = 'true';

      button.addEventListener('click', async () => {
        if (selected.has(index)) return;
        if (selected.size >= Number(offer.maxChoices || 1)) return;

        button.disabled = true;
        const accepted = await onChoose?.(option, index);
        if (accepted === false) {
          button.disabled = false;
          return;
        }

        selected.add(index);
        offer.selectedIndices = [...selected];
        button.dataset.selected = 'true';
        button.textContent = revealText(option, index, true);

        const done = selected.size >= Number(offer.maxChoices || 1);
        for (const sibling of this.optionsElement?.querySelectorAll('button') || []) {
          if (done) sibling.disabled = true;
        }
        updateMeta();
        if (done) onComplete?.(offer);
      });

      this.optionsElement?.append(button);
    });

    updateMeta();
    this.open();

    if (selected.size >= Number(offer.maxChoices || 1)) {
      for (const button of this.optionsElement?.querySelectorAll('button') || []) {
        button.disabled = true;
      }
      onComplete?.(offer);
    }

    return true;
  }
}
