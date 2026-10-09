// Pure predicates for the inventory, bank and resource chest. Keep search separate from storage mutation.
const categoryLabels = {
  all: 'Все', resource: 'Ресурсы', equipment: 'Экипировка',
  consumable: 'Расходники', quest: 'Квестовые', other: 'Прочие'
};
export { categoryLabels };
export function inventoryCategory(item) {
  const tags = Array.isArray(item?.tags) ? item.tags : [];
  if (item?.massStorage || tags.includes('resource')) return 'resource';
  if (item?.equipSlot || tags.includes('equipment')) return 'equipment';
  if (tags.includes('consumable') || item?.type === 'consumable') return 'consumable';
  if (tags.includes('quest') || item?.type === 'quest') return 'quest';
  return 'other';
}
export function matchesInventoryItem(item, { search = '', category = 'all', tier = 'all' } = {}) {
  if (!item) return false;
  if (category !== 'all' && inventoryCategory(item) !== category) return false;
  if (tier !== 'all' && item.tier !== tier) return false;
  const term = String(search || '').trim().toLocaleLowerCase('ru-RU');
  if (!term) return true;
  const text = [item.name, item.id, item.resourceId, item.tier, inventoryCategory(item)]
    .filter(Boolean).join(' ').toLocaleLowerCase('ru-RU');
  return text.includes(term);
}
export function compareInventoryStacks(a, b, catalog, mode = 'name') {
  const ia = catalog.require(a.itemId), ib = catalog.require(b.itemId);
  const nameA = ia.name || ia.id, nameB = ib.name || ib.id;
  const collator = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' });
  const compareName = () => collator.compare(nameA, nameB) || collator.compare(a.itemId,b.itemId);
  if (mode === 'tier') {
    const tierA = Number(String(ia.tier||'T0').replace(/^T/,'')) || 0;
    const tierB = Number(String(ib.tier||'T0').replace(/^T/,'')) || 0;
    return tierB-tierA || compareName();
  }
  if (mode === 'weight') return (ib.weightKg* b.quantity)-(ia.weightKg*a.quantity)||compareName();
  if (mode === 'quantity') return b.quantity-a.quantity || compareName();
  if (mode === 'category') {
    return collator.compare(inventoryCategory(ia), inventoryCategory(ib)) || compareName();
  }
  return compareName();
}

/**
 * The current resource catalog uses baseValue as a provisional price reference.
 * "Внимание" has baseValue 5000. There is NO live exchange/market pricing yet.
 * Unknown prices and quest items are deliberately protected.
 */
export function discardProtection(item, amount, attentionValue = 5000) {
  const n = Number(amount);
  const tags = Array.isArray(item?.tags) ? item.tags : [];
  const special = item?.type === 'quest' || tags.includes('quest')
    || item?.storageMode === 'account' || item?.accountBound === true;
  const declared = Number(item?.baseValue);
  const hasPrice = Number.isFinite(declared) && declared >= 0 && item?.baseValue != null;
  const unitValue = hasPrice ? declared : null;
  const totalValue = hasPrice && Number.isSafeInteger(n) && n > 0 ? unitValue * n : null;
  const threshold = Number.isFinite(Number(attentionValue)) && Number(attentionValue) > 0
    ? Number(attentionValue) : 5000;
  return {
    typed: special || !hasPrice || unitValue >= threshold || totalValue >= threshold,
    reason: special ? 'Квестовый или привязанный предмет'
      : !hasPrice ? 'Цена пока не определена'
      : unitValue >= threshold ? 'Стоимость одной единицы не ниже 1 Внимания'
      : totalValue >= threshold ? 'Стоимость удаляемой стопки не ниже 1 Внимания'
      : 'Обычный предмет',
    unitValue, totalValue, threshold
  };
}
