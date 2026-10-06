const SLOT_LABELS = {
  helmet: 'Шлем',
  chest: 'Нагрудник',
  pants: 'Штаны',
  boots: 'Ботинки',
  gloves: 'Перчатки',
  ring1: 'Кольцо 1',
  ring2: 'Кольцо 2',
  amulet: 'Амулет',
  cloak: 'Плащ',
  belt: 'Пояс'
};

function weightLabel(value) {
  const number = Number(value) || 0;
  if (number <= 0) return '0 кг';
  if (number < 1) return `${Math.round(number * 1000)} г`;
  return `${number.toFixed(number >= 10 ? 0 : 1)} кг`;
}

export class InventoryPanelSystem {
  constructor({
    eventSystem,
    containerSystem,
    itemCatalog,
    panel,
    titleElement,
    statsElement,
    tabsElement,
    gridElement,
    statusElement,
    closeButton,
    openButtons = [],
    onOpenChange,
    windowManager
  } = {}) {
    this.eventSystem = eventSystem;
    this.containerSystem = containerSystem;
    this.itemCatalog = itemCatalog;
    this.panel = panel;
    this.titleElement = titleElement;
    this.statsElement = statsElement;
    this.tabsElement = tabsElement;
    this.gridElement = gridElement;
    this.statusElement = statusElement;
    this.closeButton = closeButton;
    this.openButtons = openButtons.filter(Boolean);
    this.onOpenChange = onOpenChange;
    this.windowManager = windowManager;
    this.currentTab = 'backpack';
    this.bankAccess = false;
    this.unregisterWindow = this.windowManager?.register(this.panel, {
      level: 'game-modal',
      close: () => this.close()
    }) || null;

    this.closeButton?.addEventListener('click', () => this.close());
    for (const button of this.openButtons) {
      button.addEventListener('click', () => this.open('backpack', { bankAccess: false }));
    }

    this.tabsElement?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-container-tab]');
      if (!button || button.disabled) return;
      this.currentTab = button.dataset.containerTab;
      this.render();
    });

    this.eventSystem?.on('containers:changed', () => {
      if (this.isOpen()) this.render();
    });

    window.addEventListener('keydown', (event) => {
      if (!this.isOpen()) return;
      if (event.code === 'Escape') {
        event.preventDefault();
        this.close();
      }
    }, true);
  }

  isOpen() {
    return this.panel && !this.panel.hasAttribute('hidden');
  }

  open(tab = 'backpack', { bankAccess = false } = {}) {
    this.windowManager?.activate(this.panel);
    this.bankAccess = Boolean(bankAccess);
    this.currentTab = tab === 'bank' && !this.bankAccess ? 'backpack' : tab;
    if (this.panel) this.panel.removeAttribute('hidden');
    this.onOpenChange?.(true);
    this.render();
    this.windowManager?.fitSoon(this.panel);
  }

  close() {
    this.bankAccess = false;
    this.currentTab = 'backpack';
    this.panel?.setAttribute('hidden', '');
    this.windowManager?.closed(this.panel);
    this.onOpenChange?.(false);
  }

  setStatus(text = '', state = '') {
    if (!this.statusElement) return;
    this.statusElement.textContent = text;
    if (state) this.statusElement.dataset.state = state;
    else delete this.statusElement.dataset.state;
  }

  render() {
    if (!this.containerSystem?.loaded) return;

    if (this.currentTab === 'bank' && !this.bankAccess) this.currentTab = 'backpack';
    this.renderTabs();

    const config = this.containerSystem.config(this.currentTab);
    const state = this.containerSystem.container(this.currentTab);
    if (!config || !state) return;

    if (this.titleElement) this.titleElement.textContent = config.name;
    this.renderStats(config);
    this.gridElement?.replaceChildren();

    if (config.kind === 'equipment') this.renderEquipment(config, state);
    else this.renderGrid(config, state);
    this.windowManager?.fitSoon(this.panel);
  }

  renderTabs() {
    for (const button of this.tabsElement?.querySelectorAll('[data-container-tab]') || []) {
      const id = button.dataset.containerTab;
      button.dataset.active = String(id === this.currentTab);
      button.disabled = id === 'bank' && !this.bankAccess;
      if (id === 'bank') {
        button.title = this.bankAccess ? 'Банк доступен' : 'Банк открывается только в городе';
      }
    }
  }

  renderStats(config) {
    if (!this.statsElement) return;
    const stats = this.containerSystem.containerStats(config.id);
    if (!stats) {
      this.statsElement.textContent = '';
      return;
    }

    const slots = `Ячейки ${stats.usedSlots}/${stats.slotCount}`;
    const weight = Number.isFinite(stats.maxWeightKg)
      ? `Вес ${weightLabel(stats.weightKg)} / ${weightLabel(stats.maxWeightKg)}`
      : `Вес ${weightLabel(stats.weightKg)} · без лимита`;

    this.statsElement.textContent = `${slots} · ${weight}`;
  }

  renderGrid(config, state) {
    state.slots.forEach((stack, index) => {
      const slot = document.createElement('div');
      slot.className = 'inventory-slot';
      slot.dataset.empty = String(!stack);

      const number = document.createElement('span');
      number.className = 'inventory-slot-number';
      number.textContent = String(index + 1);
      slot.append(number);

      if (!stack) {
        const empty = document.createElement('span');
        empty.className = 'inventory-slot-empty';
        empty.textContent = 'Пусто';
        slot.append(empty);
        this.gridElement?.append(slot);
        return;
      }

      const item = this.itemCatalog.require(stack.itemId);
      const name = document.createElement('strong');
      name.textContent = item.name;
      slot.append(name);

      const details = document.createElement('span');
      details.className = 'inventory-slot-details';
      details.textContent = `×${stack.quantity} · ${weightLabel(item.weightKg * stack.quantity)} · stack ${this.containerSystem.stackLimit(config.id, item.id)}`;
      slot.append(details);

      const actions = document.createElement('div');
      actions.className = 'inventory-slot-actions';

      if (config.id === 'bank') {
        this.addAction(actions, '→ С собой', () => {
          const result = this.containerSystem.moveSlotToAuto('bank', index);
          this.reportMove(result, 'Перенесено из банка');
        });
      } else {
        if (this.bankAccess) {
          this.addAction(actions, '→ Банк', () => {
            const result = this.containerSystem.transferStack(config.id, 'bank', index);
            this.reportMove(result, 'Перенесено в банк');
          });
        }

        if (config.id === 'backpack' && item.tags.includes('resource') && this.containerSystem.isAllowed('resourcePouch', item.id)) {
          this.addAction(actions, '→ Пояс', () => {
            const result = this.containerSystem.transferStack('backpack', 'resourcePouch', index);
            this.reportMove(result, 'Перенесено в пояс');
          });
        }

        if (config.id === 'resourcePouch') {
          this.addAction(actions, '→ Рюкзак', () => {
            const result = this.containerSystem.transferStack('resourcePouch', 'backpack', index);
            this.reportMove(result, 'Перенесено в рюкзак');
          });
        }

        if (config.id === 'backpack' && item.equipSlot) {
          this.addAction(actions, 'Надеть', () => {
            const result = this.containerSystem.equipFrom('backpack', index);
            this.setStatus(
              result.equipped ? `Надето: ${item.name}` : 'Не удалось экипировать предмет',
              result.equipped ? 'ok' : 'error'
            );
          });
        }
      }

      if (actions.childElementCount) slot.append(actions);
      this.gridElement?.append(slot);
    });
  }

  renderEquipment(config, state) {
    for (const key of config.slotKeys) {
      const stack = state.slots[key];
      const slot = document.createElement('div');
      slot.className = 'inventory-slot equipment-slot';
      slot.dataset.empty = String(!stack);

      const label = document.createElement('span');
      label.className = 'equipment-slot-label';
      label.textContent = SLOT_LABELS[key] || key;
      slot.append(label);

      if (!stack) {
        const empty = document.createElement('span');
        empty.className = 'inventory-slot-empty';
        empty.textContent = 'Пусто';
        slot.append(empty);
      } else {
        const item = this.itemCatalog.require(stack.itemId);
        const name = document.createElement('strong');
        name.textContent = item.name;
        slot.append(name);

        const details = document.createElement('span');
        details.className = 'inventory-slot-details';
        details.textContent = weightLabel(item.weightKg);
        slot.append(details);

        const actions = document.createElement('div');
        actions.className = 'inventory-slot-actions';
        this.addAction(actions, 'Снять', () => {
          const result = this.containerSystem.unequip(key);
          this.setStatus(
            result.unequipped ? `Снято: ${item.name}` : 'В рюкзаке нет места',
            result.unequipped ? 'ok' : 'error'
          );
        });
        slot.append(actions);
      }

      this.gridElement?.append(slot);
    }
  }

  addAction(host, label, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      handler();
      this.render();
    });
    host.append(button);
  }

  reportMove(result, successText) {
    if (result?.moved > 0) {
      const tail = result.remaining > 0 ? ` · осталось ${result.remaining}` : '';
      this.setStatus(`${successText}: ${result.moved}${tail}`, 'ok');
    } else {
      this.setStatus('Нет места или предмет сюда нельзя положить', 'error');
    }
  }
}
