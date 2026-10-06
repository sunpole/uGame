function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function boundsOf(object) {
  return {
    left: object.x - object.width / 2,
    right: object.x + object.width / 2,
    top: object.y - object.height / 2,
    bottom: object.y + object.height / 2
  };
}

function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function countdownText(expiresAt, now = Date.now()) {
  const total = Math.max(0, Math.ceil((Number(expiresAt) - now) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export class InteractableSystem {
  constructor({ scene, player, eventSystem, audioSystem, onPrompt } = {}) {
    this.scene = scene;
    this.player = player;
    this.eventSystem = eventSystem;
    this.audioSystem = audioSystem;
    this.onPrompt = onPrompt;
    this.items = [];
    this.objects = [];
    this.lastAutoId = null;
    this.nextCountdownUpdateAt = 0;
  }

  load(definitions = []) {
    this.clear();
    for (const definition of definitions) this.add(definition);
  }

  add(definition) {
    const item = {
      trigger: 'action',
      interactionRadius: 58,
      once: false,
      used: false,
      ...definition
    };

    if (!(item.once && item.used)) item.display = this.createDisplay(item);
    else item.display = null;

    this.items.push(item);
    return item;
  }

  createDisplay(item) {
    const { scene } = this;
    const labelStyle = {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold'
    };

    let body;
    let label;
    let glow = null;

    if (item.type === 'portal') {
      glow = scene.add.rectangle(item.x, item.y, 44, 126, 0x56d364, 0.18);
      body = scene.add.rectangle(item.x, item.y, item.width || 28, item.height || 110, 0x2ea043, 1);
      label = scene.add.text(item.labelX ?? item.x, item.labelY ?? item.y, item.label || 'ПОРТАЛ', {
        ...labelStyle,
        fontSize: '16px',
        color: '#9ff0ad'
      }).setOrigin(0.5);
      scene.tweens.add({ targets: glow, alpha: { from: 0.22, to: 0.62 }, duration: 900, yoyo: true, repeat: -1 });
    } else if (item.type === 'event-portal') {
      glow = scene.add.circle(item.x, item.y, 24, 0xa371f7, 0.2);
      body = scene.add.circle(item.x, item.y, 17, 0x8957e5, 1).setStrokeStyle(2, 0xd2a8ff);
      body.width = 34;
      body.height = 34;
      label = scene.add.text(item.x, item.y - 34, item.label || 'Портал событий', {
        ...labelStyle,
        color: '#d2a8ff'
      }).setOrigin(0.5);
      scene.tweens.add({ targets: glow, alpha: { from: 0.22, to: 0.7 }, scale: { from: 0.9, to: 1.2 }, duration: 1000, yoyo: true, repeat: -1 });
    } else if (item.type === 'bank') {
      body = scene.add.rectangle(item.x, item.y, item.width || 46, item.height || 36, 0x6e7681, 1).setStrokeStyle(2, 0xc9d1d9);
      label = scene.add.text(item.x, item.y - 32, item.label || 'Банк', { ...labelStyle, color: '#c9d1d9' }).setOrigin(0.5);
    } else if (item.type === 'chest') {
      body = scene.add.rectangle(item.x, item.y, item.width || 40, item.height || 30, 0xc9963b, 1).setStrokeStyle(2, 0xf0c66a);
      label = scene.add.text(item.x, item.y - 28, item.label || 'Сундук', { ...labelStyle, color: '#f0c66a' }).setOrigin(0.5);
    } else if (item.type === 'resource') {
      body = scene.add.circle(item.x, item.y, item.radius || 16, 0x58a6ff, 1).setStrokeStyle(2, 0x9ecbff);
      body.width = (item.radius || 16) * 2;
      body.height = (item.radius || 16) * 2;
      label = scene.add.text(item.x, item.y - 30, item.label || 'Ресурс', { ...labelStyle, color: '#9ecbff' }).setOrigin(0.5);
    } else if (item.type === 'npc') {
      body = scene.add.circle(item.x, item.y, item.radius || 15, 0xbc8cff, 1).setStrokeStyle(2, 0xe1c7ff);
      body.width = (item.radius || 15) * 2;
      body.height = (item.radius || 15) * 2;
      label = scene.add.text(item.x, item.y - 30, item.label || 'NPC', { ...labelStyle, color: '#e1c7ff' }).setOrigin(0.5);
    } else {
      body = scene.add.rectangle(item.x, item.y, item.width || 30, item.height || 30, 0x8b949e, 1);
      label = scene.add.text(item.x, item.y - 28, item.label || item.id, { ...labelStyle, color: '#c9d1d9' }).setOrigin(0.5);
    }

    body.setDepth(5);
    label?.setDepth(5);
    glow?.setDepth(4);

    const displayObjects = [body, label].filter(Boolean);
    if (glow) displayObjects.push(glow);

    if (Number.isFinite(Number(item.expiresAt))) {
      const timerLabel = scene.add.text(item.x, item.y + 30, countdownText(item.expiresAt), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        color: '#8b949e',
        backgroundColor: 'rgba(5, 6, 8, 0.72)',
        padding: { x: 4, y: 2 }
      }).setOrigin(0.5).setDepth(5);
      item._timerLabel = timerLabel;
      displayObjects.push(timerLabel);
    }

    item._glow = glow;
    item._label = label;
    item._displayObjects = displayObjects;
    this.objects.push(...displayObjects);
    return body;
  }

  update({ interactPressed = false } = {}) {
    if (!this.player) return;
    this.updateCountdowns(Date.now());

    const playerBounds = boundsOf({ x: this.player.x, y: this.player.y, width: this.player.width, height: this.player.height });

    for (const item of this.items) {
      if (item.used && item.once) continue;
      if (item.trigger !== 'auto' || !item.display) continue;

      const inside = overlaps(playerBounds, boundsOf(item.display));
      if (inside && this.lastAutoId !== item.id) {
        this.lastAutoId = item.id;
        this.activate(item);
        return;
      }
      if (!inside && this.lastAutoId === item.id) this.lastAutoId = null;
    }

    const available = this.items
      .filter((item) => item.trigger === 'action' && !(item.used && item.once))
      .filter((item) => distance(this.player, item) <= item.interactionRadius)
      .sort((a, b) => distance(this.player, a) - distance(this.player, b));

    const nearest = available[0];
    this.onPrompt?.(nearest ? `E / Space / Enter · ${nearest.prompt || nearest.label || 'Взаимодействовать'}` : '');

    if (nearest && interactPressed) this.activate(nearest);
  }

  updateCountdowns(now = Date.now()) {
    if (now < this.nextCountdownUpdateAt) return;
    this.nextCountdownUpdateAt = now + 250;

    for (const item of this.items) {
      if (!item._timerLabel || !Number.isFinite(Number(item.expiresAt))) continue;
      item._timerLabel.setText(countdownText(item.expiresAt, now));
    }
  }

  activate(item) {
    if (!item || (item.used && item.once)) return;
    if (item.once) item.used = true;
    this.audioSystem?.play(item.sound || 'interact');
    this.eventSystem?.emit('interactable:activate', { item });
    if (item.once) this.eventSystem?.emit('interactable:used', { id: item.id, item });
  }

  remove(id) {
    const index = this.items.findIndex((item) => item.id === id);
    if (index < 0) return false;

    const [item] = this.items.splice(index, 1);
    if (item._glow) this.scene?.tweens?.killTweensOf(item._glow);

    const objectSet = new Set(item._displayObjects || []);
    for (const object of objectSet) object?.destroy?.();
    this.objects = this.objects.filter((object) => !objectSet.has(object));

    if (this.lastAutoId === id) this.lastAutoId = null;
    this.onPrompt?.('');
    return true;
  }

  clear() {
    this.onPrompt?.('');
    for (const item of this.items) {
      if (item._glow) this.scene?.tweens?.killTweensOf(item._glow);
    }
    for (const object of this.objects) object?.destroy?.();
    this.items = [];
    this.objects = [];
    this.lastAutoId = null;
    this.nextCountdownUpdateAt = 0;
  }
}

export { countdownText };
