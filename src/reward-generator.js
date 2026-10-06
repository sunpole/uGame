function randomInt(min, max) {
  const low = Math.ceil(Number(min) || 0);
  const high = Math.floor(Number(max) || low);
  return Math.floor(Math.random() * (Math.max(low, high) - low + 1)) + low;
}

function weightedPick(items = []) {
  const valid = items.filter((item) => Number(item?.chance) > 0);
  const total = valid.reduce((sum, item) => sum + Number(item.chance), 0);
  if (!valid.length || total <= 0) return null;

  let roll = Math.random() * total;
  for (const item of valid) {
    roll -= Number(item.chance);
    if (roll <= 0) return item;
  }
  return valid[valid.length - 1];
}

export class RewardGenerator {
  constructor({
    resourcesUrl = './data/resources.json',
    rulesUrl = './data/reward-rules.json'
  } = {}) {
    this.resourcesUrl = resourcesUrl;
    this.rulesUrl = rulesUrl;
    this.resources = new Map();
    this.rules = null;
    this.loaded = false;
  }

  async load() {
    if (this.loaded) return this;

    const [resourcesResponse, rulesResponse] = await Promise.all([
      fetch(this.resourcesUrl, { cache: 'no-store' }),
      fetch(this.rulesUrl, { cache: 'no-store' })
    ]);

    if (!resourcesResponse.ok) {
      throw new Error(`Resource catalog load failed: ${resourcesResponse.status}`);
    }
    if (!rulesResponse.ok) {
      throw new Error(`Reward rules load failed: ${rulesResponse.status}`);
    }

    const catalog = await resourcesResponse.json();
    this.rules = await rulesResponse.json();
    this.resources.clear();

    for (const resource of catalog.resources || []) {
      if (!resource?.id) continue;
      this.resources.set(resource.id, {
        id: resource.id,
        name: resource.name || resource.id,
        baseValue: Math.max(1, Number(resource.baseValue) || 1),
        accountBound: Boolean(resource.accountBound),
        tierHint: resource.tierHint || ''
      });
    }

    this.loaded = true;
    return this;
  }

  rollRarity() {
    const tier = weightedPick(this.rules?.rarityProfile || []);
    if (!tier) {
      return { id: 'normal', label: 'Обычное', chance: 100, qualityLevel: 1 };
    }
    return { ...tier };
  }

  rollLocationQuality() {
    const tier = this.rollRarity();
    return {
      level: Number(tier.qualityLevel) || 1,
      rarityId: tier.id,
      rarityLabel: tier.label,
      chance: Number(tier.chance) || 0
    };
  }

  locationDurationMs(level) {
    const range = this.rules?.location?.qualityDurationMinutes?.[String(level)] || [180, 180];
    return randomInt(range[0], range[1]) * 60 * 1000;
  }

  eventLifetimeMs() {
    return Math.max(1, Number(this.rules?.location?.eventLifetimeMinutes) || 30) * 60 * 1000;
  }

  activeSlots(level) {
    return Math.max(1, Number(this.rules?.location?.activeSlotsByQuality?.[String(level)]) || 1);
  }

  rollEventKind() {
    return weightedPick(this.rules?.location?.eventTypes || [])?.id || 'resource';
  }

  rewardFromTier(tier = this.rollRarity()) {
    const resourceId = this.rules?.reward?.resourceByRarity?.[tier.id] || 'stone';
    const resource = this.resources.get(resourceId) || {
      id: resourceId,
      name: resourceId,
      baseValue: 1,
      accountBound: false
    };
    const budgetRange = this.rules?.reward?.budgetInStoneByRarity?.[tier.id] || [1, 1];
    const budget = randomInt(budgetRange[0], budgetRange[1]);
    const amount = Math.max(1, Math.floor(budget / resource.baseValue));

    return {
      qualityId: tier.id,
      qualityLabel: tier.label,
      resourceId: resource.id,
      resourceName: resource.name,
      amount,
      budgetInStone: budget,
      baseValue: resource.baseValue,
      accountBound: Boolean(resource.accountBound)
    };
  }

  choicePresentation(count, maxChoices) {
    const restricted = maxChoices < count;
    const hideWhenRestricted = this.rules?.choicePresentation?.hideWhenRestricted !== false;
    return {
      hidden: restricted && hideWhenRestricted,
      revealUnchosenAfterComplete: this.rules?.choicePresentation?.revealUnchosenAfterComplete !== false
    };
  }

  normalizeOfferPresentation(offer) {
    if (!offer?.options?.length) return false;

    const count = offer.options.length;
    const maxChoices = Math.min(count, Math.max(1, Number(offer.maxChoices) || 1));
    const presentation = this.choicePresentation(count, maxChoices);
    const changed = offer.maxChoices !== maxChoices
      || offer.hidden !== presentation.hidden
      || offer.revealUnchosenAfterComplete !== presentation.revealUnchosenAfterComplete;

    offer.maxChoices = maxChoices;
    offer.hidden = presentation.hidden;
    offer.revealUnchosenAfterComplete = presentation.revealUnchosenAfterComplete;
    return changed;
  }

  generateResourceOffer() {
    const range = this.rules?.resourceEvent?.offerCount || [2, 3];
    const count = randomInt(range[0], range[1]);
    const maxChoices = Math.min(count, Math.max(1, Number(this.rules?.resourceEvent?.maxChoices) || 1));
    const presentation = this.choicePresentation(count, maxChoices);

    return {
      kind: 'resource-choice',
      ...presentation,
      generatedAt: Date.now(),
      maxChoices,
      selectedIndices: [],
      options: Array.from({ length: count }, (_unused, index) => ({
        id: `resource-${index + 1}`,
        reward: this.rewardFromTier(this.rollRarity())
      }))
    };
  }

  generateChestOffer() {
    const countTier = this.rollRarity();
    const choiceTier = this.rollRarity();
    const table = this.rules?.chestEvent?.countByRarity || {
      normal: 1,
      rare: 2,
      magic: 3,
      unique: 5
    };

    const count = Math.max(1, Number(table[countTier.id]) || 1);
    const maxChoices = Math.min(count, Math.max(1, Number(table[choiceTier.id]) || 1));
    const presentation = this.choicePresentation(count, maxChoices);

    return {
      kind: 'chest-choice',
      ...presentation,
      generatedAt: Date.now(),
      offerQuality: { id: countTier.id, label: countTier.label },
      choiceQuality: { id: choiceTier.id, label: choiceTier.label },
      maxChoices,
      selectedIndices: [],
      options: Array.from({ length: count }, (_unused, index) => ({
        id: `chest-${index + 1}`,
        label: `Сундук ${index + 1}`,
        reward: this.rewardFromTier(this.rollRarity())
      }))
    };
  }

  resourceName(id) {
    return this.resources.get(id)?.name || id;
  }
}

export { randomInt, weightedPick };
