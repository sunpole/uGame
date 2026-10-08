import { categoryLabels, matchesInventoryItem } from './inventory-management.js';

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
  belt: 'Пояс',
  bag: 'Сумка'
};

function weightLabel(value) {
  const number = Math.max(0, Number(value) || 0);
  return number.toFixed(1) + ' кг';
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
    this.dragging = null;
    this.searchQuery = '';
    this.categoryFilter = 'all';
    this.tierFilter = 'all';
    this.sortMode = 'name';
    this.createManagementBar();
    this.installDragAndDrop();
    this.unregisterWindow = this.windowManager?.register(this.panel, {
      level: 'game-modal',
      close: () => this.close(),
      allowScale: false
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
    this.dragging = null;
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

    if (['bank','resourceChest'].includes(this.currentTab) && !this.bankAccess) this.currentTab = 'backpack';
    if (this.currentTab === 'resourcePouch' && this.containerSystem?.config('resourcePouch')?.enabled === false) {
      this.currentTab = 'backpack';
    }
    this.renderTabs();

    const config = this.containerSystem.config(this.currentTab);
    const state = this.containerSystem.container(this.currentTab);
    if (!config || !state) return;

    if (this.titleElement) this.titleElement.textContent = config.name;
    if (this.panel) this.panel.dataset.containerId = config.id;
    if (this.gridElement) this.gridElement.dataset.containerId = config.id;
    this.renderStats(config);
    this.gridElement?.replaceChildren();

    if (config.kind === 'equipment') this.renderEquipment(config, state);
    else this.renderGrid(config, state);
    this.windowManager?.fitSoon(this.panel);
  }

  createManagementBar() {
    if (!this.panel || !this.gridElement || typeof document === 'undefined') return;
    const toolbar=document.createElement('div');
    toolbar.className='inventory-manager';
    const search=document.createElement('input');
    search.type='search';
    search.placeholder='Поиск: название, Tier, ID…';
    search.setAttribute('aria-label','Поиск по предметам и ресурсам');
    search.autocomplete='off';
    search.addEventListener('input',()=>{this.searchQuery=search.value;this.render();});
    toolbar.append(search);
    const addSelect=(label,options,handler)=>{
      const wrapper=document.createElement('label');
      wrapper.className='inventory-manager-field';
      const caption=document.createElement('span');caption.textContent=label;
      const select=document.createElement('select');select.setAttribute('aria-label',label);
      for(const [value,text] of options) {
        const option=document.createElement('option');option.value=value;option.textContent=text;
        select.append(option);
      }
      select.addEventListener('change',()=>handler(select.value));
      wrapper.append(caption,select);
      toolbar.append(wrapper);
      return select;
    };
    addSelect('Тип',Object.entries(categoryLabels),value=>{this.categoryFilter=value;this.render();});
    addSelect('Tier',[['all','Все Tier'],...Array.from({length:8},(_,i)=>['T'+(i+1),'T'+(i+1)])],
      value=>{this.tierFilter=value;this.render();});
    addSelect('Сортировка',[
      ['name','По названию'],['tier','По Tier (высокий первый)'],
      ['category','По типу'],['quantity','По количеству'],['weight','По весу']
    ],value=>{this.sortMode=value;});
    const sort=document.createElement('button');
    sort.type='button';sort.textContent='Сортировать и собрать стопки';
    sort.addEventListener('click',()=>{
      const result=this.containerSystem.organize(this.currentTab,{by:this.sortMode,merge:true});
      this.setStatus(result.ok
        ? 'Порядок сохранён · освободилось ячеек: '+result.freedSlots
        : 'Сортировка недоступна для этой вкладки',result.ok?'ok':'error');
      this.render();
    });
    toolbar.append(sort);
    const reset=document.createElement('button');
    reset.type='button';reset.textContent='Сбросить фильтры';
    reset.addEventListener('click',()=>{
      search.value='';this.searchQuery='';this.categoryFilter='all';this.tierFilter='all';
      for(const select of toolbar.querySelectorAll('select')) {
        if (select.getAttribute('aria-label')==='Тип'||select.getAttribute('aria-label')==='Tier')select.value='all';
      }
      this.render();
    });
    toolbar.append(reset);
    this.gridElement.before(toolbar);
    const chestTab=document.createElement('button');
    chestTab.type='button';chestTab.dataset.containerTab='resourceChest';
    chestTab.textContent='Ресурсный сундук';
    chestTab.title='Только у городского банкира';
    this.tabsElement?.append(chestTab);
  }

  matches(stack) {
    const item=this.itemCatalog.require(stack.itemId);
    return matchesInventoryItem(item,{
      search:this.searchQuery,category:this.categoryFilter,tier:this.tierFilter
    });
  }

  confirmDiscard(containerId,index,item,quantity) {
    const promptText=item.massStorage && item.tier
      ? 'Количество единиц по '+item.unitKg+' кг для удаления (из '+quantity+'):'
      : 'Количество предметов для удаления (из '+quantity+'):';
    const raw=window.prompt(promptText,String(quantity));
    if(raw===null)return;
    const amount=Number(raw);
    if(!Number.isSafeInteger(amount)||amount<1||amount>quantity) {
      this.setStatus('Введите целое число от 1 до '+quantity,'error');
      return;
    }
    const caution=item.tags.includes('quest')
      ? 'ВНИМАНИЕ: квестовый предмет может быть нужен для задания! '
      : '';
    if(!window.confirm(caution+'Безвозвратно удалить «'+item.name+'» ×'+amount+
      '? Действие нельзя отменить.'))return;
    const result=this.containerSystem.discardFrom(containerId,index,amount);
    this.setStatus(result.removed===amount
      ? 'Удалено: '+item.name+' ×'+amount
      : 'Не удалось удалить, содержимое не изменено',
      result.removed===amount?'ok':'error');
  }

  installDragAndDrop() {
    this.gridElement?.addEventListener('dragstart',event=>{
      const slot=event.target.closest?.('[data-slot-index]');
      if(!slot?.draggable)return;
      const id=slot.dataset.containerId,index=Number(slot.dataset.slotIndex);
      const stack=this.containerSystem.slot(id,index);
      if(!stack)return;
      this.dragging={containerId:id,index,itemId:stack.itemId};
      if(event.dataTransfer) {
        event.dataTransfer.effectAllowed='move';
        event.dataTransfer.setData('text/plain','uGame inventory'); // external drop payload is never trusted.
      }
    });
    const over=event=>{
      if(!this.dragging)return;
      const target=event.target.closest?.('[data-slot-index], [data-container-tab]');
      if(!target || target.disabled)return;
      event.preventDefault();
      if(event.dataTransfer)event.dataTransfer.dropEffect='move';
    };
    this.gridElement?.addEventListener('dragover',over);
    this.tabsElement?.addEventListener('dragover',over);
    const drop=event=>{
      const drag=this.dragging;
      this.dragging=null;
      if(!drag)return;
      const target=event.target.closest?.('[data-slot-index], [data-container-tab]');
      if(!target || target.disabled)return;
      event.preventDefault();
      if(this.containerSystem.slot(drag.containerId,drag.index)?.itemId!==drag.itemId) {
        this.setStatus('Предмет изменился. Повторите перенос.','error');return;
      }
      const destination=target.dataset.containerTab||target.dataset.containerId;
      if(!destination)return;
      if(['bank','resourceChest'].includes(destination)&&!this.bankAccess) {
        this.setStatus('Банк и сундук доступны только у городского банкира','error');return;
      }
      let result;
      if(target.dataset.slotIndex!==undefined) {
        result=this.containerSystem.moveToSlot(drag.containerId,drag.index,
          destination,Number(target.dataset.slotIndex));
      } else {
        if(destination===drag.containerId)return;
        result=this.containerSystem.transferStack(drag.containerId,destination,drag.index);
      }
      this.reportMove(result,'Перенесено перетаскиванием');
      this.render();
    };
    this.gridElement?.addEventListener('drop',drop);
    this.tabsElement?.addEventListener('drop',drop);
    this.gridElement?.addEventListener('dragend',()=>{this.dragging=null;});
  }

  renderTabs() {
    for (const button of this.tabsElement?.querySelectorAll('[data-container-tab]') || []) {
      const id = button.dataset.containerTab;
      button.dataset.active = String(id === this.currentTab);
      button.disabled = (['bank', 'resourceChest'].includes(id) && !this.bankAccess)
        || (id === 'resourcePouch' && this.containerSystem?.config('resourcePouch')?.enabled === false);
      if (id === 'resourcePouch' && button.disabled) {
        button.title = 'Ресурсный пояс пока не экипирован';
      }
      if (id === 'bank' || id === 'resourceChest') {
        button.title = this.bankAccess ? 'Хранилище доступно' : 'Хранилище открывается только у городского банкира';
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

    const rawSlots = this.containerSystem.container(config.id)?.slots || [];
    const stacks = Array.isArray(rawSlots) ? rawSlots : Object.values(rawSlots);
    const visible = stacks.filter(Boolean).filter(stack => this.matches(stack)).length;
    this.statsElement.textContent = `${slots} · ${weight} · найдено ${visible}`;
  }

  renderGrid(config, state) {
    let shown = 0;
    const filtered = Boolean(this.searchQuery || this.categoryFilter !== 'all' || this.tierFilter !== 'all');
    state.slots.forEach((stack, index) => {
      if (filtered && (!stack || !this.matches(stack))) return;
      shown++;
      const slot = document.createElement('div');
      slot.dataset.slotIndex = String(index);
      slot.dataset.containerId = config.id;
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
      slot.draggable = true;
      slot.title = 'Перетащите в ячейку или на вкладку доступного хранилища';
      const name = document.createElement('strong');
      name.textContent = item.name;
      slot.append(name);

      const details = document.createElement('span');
      details.className = 'inventory-slot-details';
      if (item.massStorage && item.tier) {
        const massKg = stack.quantity * item.unitKg;
        details.textContent = weightLabel(massKg) + ' · ' + item.tier + ' · ячейка ' + weightLabel(item.slotCapacityKg || 50);
      } else {
        details.textContent = `×${stack.quantity} · ${weightLabel(item.weightKg * stack.quantity)} · максимум в стопке ${this.containerSystem.stackLimit(config.id, item.id)}`;
      }
      slot.append(details);

      const actions = document.createElement('div');
      actions.className = 'inventory-slot-actions';

      if (['bank','resourceChest'].includes(config.id)) {
        this.addAction(actions, '→ Рюкзак', () => {
          const result = this.containerSystem.transferStack(config.id, 'backpack', index);
          this.reportMove(result, 'Перенесено в рюкзак');
        });
      }
      if (config.id === 'resourcePouch') {
        this.addAction(actions, '→ Рюкзак', () => {
          const result = this.containerSystem.transferStack('resourcePouch', 'backpack', index);
          this.reportMove(result, 'Перенесено в рюкзак');
        });
      }
      if (this.bankAccess) {
        for (const destination of ['bank','resourceChest','backpack']) {
          if (destination === config.id || (destination==='resourceChest' && !item.tags.includes('resource'))) continue;
          if (destination==='backpack' && config.id !== 'bank' && config.id !== 'resourceChest') continue;
          if (!this.containerSystem.isAllowed(destination,item.id)) continue;
          const labels={bank:'→ Банк',resourceChest:'→ Сундук',backpack:'→ Рюкзак'};
          if (destination==='backpack' && ['bank','resourceChest'].includes(config.id)) continue;
          this.addAction(actions,labels[destination],()=>{
            const result=this.containerSystem.transferStack(config.id,destination,index);
            this.reportMove(result,'Перенесено: '+labels[destination].slice(2));
          });
        }
      }
      if (config.id === 'backpack' && item.tags.includes('resource') &&
          this.containerSystem.isAllowed('resourcePouch',item.id)) {
        this.addAction(actions,'→ Пояс',()=>{
          const result=this.containerSystem.transferStack('backpack','resourcePouch',index);
          this.reportMove(result,'Перенесено в пояс');
        });
      }
      if (config.id === 'backpack' && item.equipSlot) {
        this.addAction(actions,'Надеть',()=>{
          const result=this.containerSystem.equipFrom('backpack',index);
          this.setStatus(result.equipped?'Надето: '+item.name:'Не удалось экипировать предмет',
            result.equipped?'ok':'error');
        });
      }
      this.addAction(actions, 'Удалить…', () => this.confirmDiscard(config.id,index,item,stack.quantity));

      if (actions.childElementCount) slot.append(actions);
      this.gridElement?.append(slot);
    });
    if (!shown && this.gridElement) {
      const empty=document.createElement('p');
      empty.className='inventory-no-results';
      empty.textContent='Совпадений нет. Измените поиск или фильтры.';
      this.gridElement.append(empty);
    }
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
