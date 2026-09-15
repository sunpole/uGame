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

    item.display = this.createDisplay(item);
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

    if (item.type === 'portal') {
      const glow = scene.add.rectangle(item.x, item.y, 44, 126, 0x56d364, 0.18);
      body = scene.add.rectangle(item.x, item.y, item.width || 28, item.height || 110, 0x2ea043, 1);
      label = scene.add.text(item.labelX ?? item.x, item.labelY ?? item.y, item.label || 'ПОРТАЛ', {
        ...labelStyle,
        fontSize: '16px',
        color: '#9ff0ad'
      }).setOrigin(0.5);
      scene.tweens.add({ targets: glow, alpha: { from: 0.22, to: 0.62 }, duration: 900, yoyo: true, repeat: -1 });
      item._glow = glow;
      this.objects.push(glow);
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
    this.objects.push(body, label);
    return body;
  }

  update({ interactPressed = false } = {}) {
    if (!this.player) return;

    const playerBounds = boundsOf({ x: this.player.x, y: this.player.y, width: this.player.width, height: this.player.height });

    for (const item of this.items) {
      if (item.used && item.once) continue;
      if (item.trigger !== 'auto') continue;

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
    this.onPrompt?.(nearest ? `E / Space · ${nearest.prompt || nearest.label || 'Взаимодействовать'}` : '');

    if (nearest && interactPressed) this.activate(nearest);
  }

  activate(item) {
    if (!item || (item.used && item.once)) return;
    if (item.once) item.used = true;
    this.audioSystem?.play(item.sound || 'interact');
    this.eventSystem?.emit('interactable:activate', { item });
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
  }
}
