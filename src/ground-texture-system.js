const SETTINGS_URL = './data/biome-textures.json';
const DEFAULT_STORAGE_KEY = 'ugame.biome-textures.v1';

export const GROUND_TEXTURE_ASSETS = [
  { key: 'ground-grass', file: './assets/textures/biomes/grass_1024.png', label: 'grass_1024.png' },
  { key: 'ground-sand', file: './assets/textures/biomes/sand_1024.png', label: 'sand_1024.png' },
  { key: 'ground-snow', file: './assets/textures/biomes/snow_1024.png', label: 'snow_1024.png' },
  { key: 'ground-city-grass', file: './assets/textures/biomes/city_grass_1024.png', label: 'city_grass_1024.png' },
  { key: 'ground-city-sand', file: './assets/textures/biomes/city_sand_1024.png', label: 'city_sand_1024.png' },
  { key: 'ground-city-snow', file: './assets/textures/biomes/city_snow_1024.png', label: 'city_snow_1024.png' },
  { key: 'ground-south', file: './assets/textures/biomes/south_256.jpg', label: 'south_256.jpg · южный песок' },
  { key: 'ground-city-south', file: './assets/textures/biomes/city_south_512.jpg', label: 'city_south_512.jpg · белый мрамор' }
];

function clone(value) {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

function safeStorage() {
  try { return globalThis.localStorage || null; } catch { return null; }
}

function normalizeEntry(entry = {}) {
  return {
    id: String(entry.id || ''),
    biome: String(entry.biome || 'grass'),
    city: Boolean(entry.city),
    textureName: String(entry.textureName || entry.id || 'Texture'),
    textureFile: String(entry.textureFile || ''),
    enabled: entry.enabled !== false,
    scalePercent: clamp(entry.scalePercent, 1, 10000, 40),
    opacityPercent: clamp(entry.opacityPercent, 0, 100, 40)
  };
}

export class BiomeTextureSettingsSystem {
  constructor({ url = SETTINGS_URL } = {}) {
    this.url = url;
    this.storage = safeStorage();
    this.storageKey = DEFAULT_STORAGE_KEY;
    this.defaults = new Map();
    this.values = new Map();
    this.listeners = new Set();
    this.loaded = false;
    this.loadPromise = null;
  }

  async load() {
    if (this.loaded) return this;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      const response = await fetch(this.url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Biome texture config failed: ${response.status}`);
      const data = await response.json();
      this.storageKey = String(data.storageKey || DEFAULT_STORAGE_KEY);
      this.defaults.clear();
      this.values.clear();

      for (const raw of data.textures || []) {
        const entry = normalizeEntry(raw);
        if (!entry.id) continue;
        this.defaults.set(entry.id, entry);
        this.values.set(entry.id, clone(entry));
      }

      try {
        const savedRaw = this.storage?.getItem(this.storageKey);
        const saved = savedRaw ? JSON.parse(savedRaw) : null;
        for (const [id, patch] of Object.entries(saved?.textures || {})) {
          if (!this.values.has(id)) continue;
          this.values.set(id, normalizeEntry({ ...this.values.get(id), ...patch, id }));
        }
      } catch {}

      this.loaded = true;
      return this;
    })();

    return this.loadPromise;
  }

  list() {
    return [...this.values.values()].map(clone);
  }

  get(id) {
    const value = this.values.get(String(id));
    return value ? clone(value) : null;
  }

  resolve({ biome = 'grass', city = false } = {}) {
    const id = city ? `city-${biome}` : String(biome);
    return this.get(id) || this.get(city ? 'city-grass' : 'grass');
  }

  update(id, patch = {}) {
    const current = this.values.get(String(id));
    if (!current) return null;
    const next = normalizeEntry({ ...current, ...patch, id: current.id });
    this.values.set(current.id, next);
    this.persist();
    this.emit(next.id);
    return clone(next);
  }

  reset(id) {
    const fallback = this.defaults.get(String(id));
    if (!fallback) return null;
    this.values.set(fallback.id, clone(fallback));
    this.persist();
    this.emit(fallback.id);
    return clone(fallback);
  }

  resetAll() {
    this.values = new Map([...this.defaults.entries()].map(([id, value]) => [id, clone(value)]));
    this.persist();
    this.emit('*');
  }

  subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(id) {
    for (const listener of this.listeners) listener(id, this.get(id));
  }

  persist() {
    const textures = {};
    for (const [id, value] of this.values.entries()) {
      const base = this.defaults.get(id) || {};
      const patch = {};
      for (const key of ['textureName','textureFile','enabled','scalePercent','opacityPercent']) {
        if (value[key] !== base[key]) patch[key] = value[key];
      }
      if (Object.keys(patch).length) textures[id] = patch;
    }
    try {
      this.storage?.setItem(this.storageKey, JSON.stringify({ schemaVersion: 1, textures }));
    } catch {}
  }
}

export function preloadGroundTextures(scene) {
  for (const asset of GROUND_TEXTURE_ASSETS) {
    scene.load.image(asset.key, asset.file);
  }
}

function assetForFile(file) {
  return GROUND_TEXTURE_ASSETS.find((asset) => asset.file === file) || null;
}

export class GroundTextureSystem {
  constructor({ scene, settings, worldWidth = 960, worldHeight = 540 } = {}) {
    this.scene = scene;
    this.settings = settings;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.sprite = null;
    this.currentZone = null;
    this.unsubscribe = this.settings?.subscribe?.(() => {
      if (this.currentZone) this.applyZone(this.currentZone);
    }) || null;
  }

  applyZone(zone) {
    this.currentZone = zone || null;
    if (!zone) return;

    const entry = this.settings?.resolve?.({
      biome: zone.biome || 'grass',
      city: Boolean(zone.isCity)
    });

    const asset = entry ? assetForFile(entry.textureFile) : null;
    if (!entry?.enabled || !asset || !this.scene.textures.exists(asset.key)) {
      this.sprite?.setVisible(false);
      return;
    }

    if (!this.sprite || this.sprite.texture?.key !== asset.key) {
      this.sprite?.destroy();
      this.sprite = this.scene.add.tileSprite(0, 0, this.worldWidth, this.worldHeight, asset.key)
        .setOrigin(0, 0)
        .setDepth(-100);
    }

    this.sprite.setVisible(true);
    this.sprite.setAlpha(entry.opacityPercent / 100);
    const scale = entry.scalePercent / 100;
    if (typeof this.sprite.setTileScale === 'function') this.sprite.setTileScale(scale, scale);
    else {
      this.sprite.tileScaleX = scale;
      this.sprite.tileScaleY = scale;
    }
  }

  resize(worldWidth, worldHeight = this.worldHeight) {
    this.worldWidth = Math.max(1, Number(worldWidth) || this.worldWidth);
    this.worldHeight = Math.max(1, Number(worldHeight) || this.worldHeight);
    if (!this.currentZone) return;
    this.sprite?.destroy();
    this.sprite = null;
    this.applyZone(this.currentZone);
  }

  destroy() {
    this.unsubscribe?.();
    this.sprite?.destroy();
    this.sprite = null;
  }
}
