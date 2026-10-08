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
      const rotation = Number(item.rotation) || 0;
      glow = scene.add.rectangle(item.x, item.y, (item.width || 104) + 24, (item.height || 22) + 20, 0x56d364, 0.16).setRotation(rotation);
      body = scene.add.rectangle(item.x, item.y, item.width || 104, item.height || 22, 0x2ea043, 0.92)
        .setStrokeStyle(2, 0x9ff0ad)
        .setRotation(rotation);
      label = scene.add.text(item.labelX ?? item.x, item.labelY ?? item.y, item.label || 'ПЕРЕХОД', {
        ...labelStyle,
        fontSize: '15px',
        color: '#9ff0ad',
        backgroundColor: '#08110b'
      }).setOrigin(0.5);
      scene.tweens.add({ targets: glow, alpha: { from: 0.12, to: 0.48 }, duration: 900, yoyo: true, repeat: -1 });
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
    } else if (item.type === 'city-banker') {
      const shadow = scene.add.ellipse(0, 19, 46, 15, 0x000000, 0.32);
      const legs = scene.add.rectangle(0, 13, 24, 19, 0x312e2b, 1);
      const belly = scene.add.ellipse(0, 0, 52, 43, 0x7d5a3b, 1).setStrokeStyle(3, 0xd0a96b);
      const vest = scene.add.rectangle(0, -2, 27, 32, 0x243447, 1);
      const head = scene.add.circle(0, -28, 14, 0xe0ad7a, 1).setStrokeStyle(2, 0xf0d0a8);
      const beard = scene.add.ellipse(0, -18, 19, 12, 0x5a3b28, 1);
      body = scene.add.container(item.x, item.y, [shadow, legs, belly, vest, head, beard]);
      body.setSize(58, 62);
      label = scene.add.text(item.x, item.y - 53, (item.label || 'Банкир') + '\n' + (item.roleLabel || 'Банкир'), { ...labelStyle, color: '#f0c66a', align: 'center' }).setOrigin(0.5);
    } else if (item.type === 'city-teleporter') {
      glow = scene.add.circle(item.x, item.y, 34, 0x8957e5, 0.18);
      const robe = scene.add.triangle(0, 9, -22, 23, 22, 23, 0, -20, 0x3d2f70, 1).setStrokeStyle(2, 0xd2a8ff);
      const head = scene.add.circle(0, -25, 11, 0xd7b18c, 1);
      const hat = scene.add.triangle(0, -45, -17, -24, 17, -24, 0, -58, 0x172554, 1).setStrokeStyle(2, 0x79c0ff);
      const star = scene.add.star(18, -38, 5, 3, 7, 0xf0c66a, 1);
      body = scene.add.container(item.x, item.y, [robe, head, hat, star]);
      body.setSize(52, 82);
      label = scene.add.text(item.x, item.y - 67, (item.label || 'Телепортер') + '\n' + (item.roleLabel || 'Телепортер'), { ...labelStyle, color: '#d2a8ff', align: 'center' }).setOrigin(0.5);
      scene.tweens.add({ targets: glow, alpha: { from: 0.12, to: 0.36 }, scale: { from: 0.95, to: 1.12 }, duration: 1600, yoyo: true, repeat: -1 });
    } else if (item.type === 'city-guide') {
      const styles = {
        'snow-knight': { armor: 0xdce6ef, trim: 0x79c0ff, cape: 0x1f6feb, text: '#dce6ef', crown: 0xbfd7ff },
        'forest-ranger': { armor: 0x2f6b3b, trim: 0x7ee787, cape: 0x173b24, text: '#7ee787', crown: 0x8a633a },
        'stone-marshal': { armor: 0x6e7681, trim: 0xc9d1d9, cape: 0x30363d, text: '#c9d1d9', crown: 0x8b949e },
        'sand-pharaoh': { armor: 0xc9963b, trim: 0xffd33d, cape: 0x6b4b1f, text: '#f0c66a', crown: 0xffd33d },
        'marble-legatus': { armor: 0xe6e1d8, trim: 0xff7b72, cape: 0x8c2f39, text: '#f0f6fc', crown: 0xf0c66a }
      };
      const s = styles[item.cityGuideStyle] || styles['stone-marshal'];
      const cape = scene.add.rectangle(0, 8, 34, 43, s.cape, 1);
      const legs = scene.add.rectangle(0, 18, 21, 25, 0x20242a, 1);
      const torso = scene.add.rectangle(0, 0, 34, 38, s.armor, 1).setStrokeStyle(2, s.trim);
      const shoulders = scene.add.ellipse(0, -7, 46, 18, s.armor, 1).setStrokeStyle(2, s.trim);
      const head = scene.add.circle(0, -28, 11, 0xe1b184, 1);
      const crown = scene.add.triangle(0, -42, -11, -31, 11, -31, 0, -48, s.crown, 1);
      body = scene.add.container(item.x, item.y, [cape, legs, torso, shoulders, head, crown]);
      body.setSize(50, 72);
      label = scene.add.text(item.x, item.y - 59, (item.label || 'Страж') + '\n' + (item.roleLabel || 'Страж города'), { ...labelStyle, color: s.text, align: 'center' }).setOrigin(0.5);
    } else if (item.type === 'chest') {
      body = scene.add.rectangle(item.x, item.y, item.width || 40, item.height || 30, 0xc9963b, 1).setStrokeStyle(2, 0xf0c66a);
      label = scene.add.text(item.x, item.y - 28, item.label || 'Сундук', { ...labelStyle, color: '#f0c66a' }).setOrigin(0.5);
    } else if (item.type === 'resource') {
      body = scene.add.circle(item.x, item.y, item.radius || 16, 0x58a6ff, 1).setStrokeStyle(2, 0x9ecbff);
      body.width = (item.radius || 16) * 2;
      body.height = (item.radius || 16) * 2;
      label = scene.add.text(item.x, item.y - 30, item.label || 'Ресурс', { ...labelStyle, color: '#9ecbff' }).setOrigin(0.5);
    } else if (item.type === 'master-npc') {
      const palette = {
        T1: { fill: 0x8b949e, stroke: 0xc9d1d9, text: '#c9d1d9' },
        T2: { fill: 0x1f6feb, stroke: 0x79c0ff, text: '#79c0ff' },
        T3: { fill: 0x8957e5, stroke: 0xd2a8ff, text: '#d2a8ff' },
        T4: { fill: 0xc9963b, stroke: 0xf0c66a, text: '#f0c66a' }
      };
      const colors = palette[item.masterTier] || palette.T1;
      glow = scene.add.ellipse(item.x, item.y + 7, 34, 24, colors.fill, 0.18);

      const shadow = scene.add.ellipse(0, 11, 26, 10, 0x000000, 0.34);
      const legLeft = scene.add.ellipse(-5, 9, 7, 15, 0x20242a, 1);
      const legRight = scene.add.ellipse(5, 9, 7, 15, 0x20242a, 1);
      const torso = scene.add.ellipse(0, 2, 24, 22, colors.fill, 1).setStrokeStyle(2, colors.stroke);
      const shoulderLeft = scene.add.circle(-11, 1, 4, colors.fill, 1).setStrokeStyle(1, colors.stroke);
      const shoulderRight = scene.add.circle(11, 1, 4, colors.fill, 1).setStrokeStyle(1, colors.stroke);
      const head = scene.add.circle(0, -10, 8, 0xe4b98b, 1).setStrokeStyle(1, 0xf0d0a8);
      const facingMark = scene.add.ellipse(0, -16, 4, 6, colors.stroke, 1);

      body = scene.add.container(item.x, item.y, [
        shadow,
        legLeft,
        legRight,
        torso,
        shoulderLeft,
        shoulderRight,
        head,
        facingMark
      ]);
      body.setSize(34, 40);
      item._masterFacingMark = facingMark;
      label = scene.add.text(item.x, item.y - 38, (item.label || 'Мастер') + ' · ' + (item.masterTier || 'T?'), { ...labelStyle, color: colors.text }).setOrigin(0.5);
      scene.tweens.add({ targets: glow, alpha: { from: 0.15, to: 0.38 }, scale: { from: 0.96, to: 1.08 }, duration: 1600, yoyo: true, repeat: -1 });
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
    this.onPrompt?.(nearest ? `ДЕЙСТВИЕ · ${nearest.prompt || nearest.label || 'Взаимодействовать'} · E / Space / Enter` : '');

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

  getItem(id) {
    return this.items.find((item) => item.id === id) || null;
  }

  setItemTransform(id, { x, y, rotation } = {}) {
    const item = typeof id === 'object' ? id : this.getItem(id);
    if (!item) return false;

    if (Number.isFinite(Number(x))) item.x = Number(x);
    if (Number.isFinite(Number(y))) item.y = Number(y);

    if (item.display?.setPosition) item.display.setPosition(item.x, item.y);
    if (Number.isFinite(Number(rotation)) && item.display?.setRotation) item.display.setRotation(Number(rotation));

    if (item.type === 'master-npc') {
      item._glow?.setPosition?.(item.x, item.y + 7);
      item._label?.setPosition?.(item.x, item.y - 38);
      item._timerLabel?.setPosition?.(item.x, item.y + 30);
    }
    return true;
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
