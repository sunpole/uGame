function createHumanoidVisual(scene, {
  x = 0,
  y = 0,
  depth = 5,
  bodyColor = 0x5f81ff,
  legColor = 0x30363d,
  skinColor = 0xe7c6a5,
  faceColor = 0x1f2328,
  bodyWidth = 20,
  bodyHeight = 24,
  armOffset = 10,
  armWidth = 5,
  armHeight = 14,
  legOffset = 5,
  legWidth = 6,
  legHeight = 12,
  shadowWidth = 24,
  shadowHeight = 10,
  scaleX = 1,
  scaleY = 1
} = {}) {
  const container = scene.add.container(x, y).setDepth(depth);
  const shadow = scene.add.ellipse(0, 9, shadowWidth, shadowHeight, 0x000000, 0.35);
  const body = scene.add.ellipse(0, 4, bodyWidth, bodyHeight, bodyColor, 1);
  const head = scene.add.circle(0, 1, 8, skinColor, 1);
  const face = scene.add.circle(0, -2, 2.3, faceColor, 1);
  const armLeft = scene.add.rectangle(-armOffset, 4, armWidth, armHeight, skinColor, 1);
  const armRight = scene.add.rectangle(armOffset, 4, armWidth, armHeight, skinColor, 1);
  const legLeft = scene.add.rectangle(-legOffset, 13, legWidth, legHeight, legColor, 1);
  const legRight = scene.add.rectangle(legOffset, 13, legWidth, legHeight, legColor, 1);

  container.add([shadow, legLeft, legRight, armLeft, armRight, body, head, face]);
  container.setScale(scaleX, scaleY);
  container.setSize(Math.max(shadowWidth, bodyWidth + armOffset), 40);

  return { container, shadow, body, head, face, armLeft, armRight, legLeft, legRight };
}

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

// Countdown order: while the free Process is active only its numeric timer runs.
// The farewell warning flashes without digits until its persisted start deadline.
export function masterFarewellDisplay(item, now = Date.now()) {
  const beginsAt = Number(item?.masterFarewellStartsAt) || Number(item?.masterExpeditionCompletedAt) || 0;
  const processWaiting = item?.masterRewardState === 'running'
    && Number(item?.masterProcessEndsAt) > now;
  const waiting = now < beginsAt || processWaiting;
  return waiting
    ? { waiting:true, text:'УХОЖУ ПОСЛЕ НАГРАДЫ', visible:Math.floor(now / 500)%2===0 }
    : { waiting:false, text:'УХОЖУ ЧЕРЕЗ ' + countdownText(item?.expiresAt, now), visible:true };
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
    // Enforce scene identity. Previously repeated add(id) left multiple sprites,
    // while getItem/syncRewardMarker only updated the first one.
    // Remove *all* preexisting duplicates before drawing a replacement.
    if (typeof definition?.id === 'string' && definition.id) {
      while (this.getItem(definition.id)) this.remove(definition.id);
    }
    const item = {
      trigger: 'action',
      interactionRadius: 58,
      once: false,
      used: false,
      ...definition
    };
    if (String(item.type || '').startsWith('city-') && definition?.interactionRadius == null) {
      item.interactionRadius = 150;
    }

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
      const visual = createHumanoidVisual(scene, {
        x: item.x,
        y: item.y,
        depth: 5,
        bodyColor: 0x8a6238,
        legColor: 0x30363d,
        bodyWidth: 31,
        bodyHeight: 27,
        armOffset: 15,
        legOffset: 7,
        shadowWidth: 38,
        scaleX: 3,
        scaleY: 3
      });
      const coin = scene.add.circle(0, 4, 4, 0xf0c66a, 1).setStrokeStyle(1, 0xffdf8a);
      visual.container.add(coin);
      visual.container.setSize(42, 44);
      body = visual.container;
      label = scene.add.text(item.x, item.y - 88, (item.label || 'Банкир') + '\n' + (item.roleLabel || 'Банкир'), { ...labelStyle, fontSize: '16px', color: '#f0c66a', align: 'center' }).setOrigin(0.5);
    } else if (item.type === 'city-teleporter') {
      glow = scene.add.circle(item.x, item.y + 8, 72, 0x8957e5, 0.12);
      const visual = createHumanoidVisual(scene, {
        x: item.x,
        y: item.y,
        depth: 5,
        bodyColor: 0x5f4bb6,
        legColor: 0x202744,
        bodyWidth: 16,
        bodyHeight: 31,
        armOffset: 9,
        armHeight: 17,
        legHeight: 16,
        shadowWidth: 22,
        scaleX: 3,
        scaleY: 3.66
      });
      const star = scene.add.star(13, -9, 5, 2, 5, 0xf0c66a, 1);
      visual.container.add(star);
      visual.container.setSize(30, 54);
      body = visual.container;
      label = scene.add.text(item.x, item.y - 112, (item.label || 'Телепортер') + '\n' + (item.roleLabel || 'Телепортер'), { ...labelStyle, fontSize: '16px', color: '#d2a8ff', align: 'center' }).setOrigin(0.5);
      scene.tweens.add({ targets: glow, alpha: { from: 0.1, to: 0.34 }, scale: { from: 0.94, to: 1.12 }, duration: 1600, yoyo: true, repeat: -1 });
    } else if (item.type === 'city-guide') {
      const styles = {
        'snow-knight': { body: 0xdce6ef, legs: 0x31557b, trim: 0x79c0ff, cape: 0x1f6feb, text: '#dce6ef' },
        'forest-ranger': { body: 0x397a47, legs: 0x263b28, trim: 0x7ee787, cape: 0x173b24, text: '#7ee787' },
        'stone-marshal': { body: 0x6e7681, legs: 0x30363d, trim: 0xc9d1d9, cape: 0x484f58, text: '#c9d1d9' },
        'sand-pharaoh': { body: 0xc9963b, legs: 0x6b4b1f, trim: 0xffd33d, cape: 0x8a5b1f, text: '#f0c66a' },
        'marble-legatus': { body: 0xe6e1d8, legs: 0x7d3338, trim: 0xff7b72, cape: 0x8c2f39, text: '#f0f6fc' }
      };
      const s = styles[item.cityGuideStyle] || styles['stone-marshal'];
      const visual = createHumanoidVisual(scene, {
        x: item.x,
        y: item.y,
        depth: 5,
        bodyColor: s.body,
        legColor: s.legs,
        bodyWidth: 22,
        bodyHeight: 25,
        armOffset: 11,
        shadowWidth: 28,
        scaleX: 3.84,
        scaleY: 3.84
      });
      const cape = scene.add.triangle(0, 14, -10, 7, 10, 7, 0, 28, s.cape, 0.92);
      const sword = scene.add.rectangle(17, 3, 3, 27, 0xc9d1d9, 1).setStrokeStyle(1, s.trim).setRotation(-0.32);
      const shield = scene.add.circle(-17, 5, 8, s.cape, 1).setStrokeStyle(2, s.trim);
      visual.container.add([cape, sword, shield]);
      visual.container.setSize(56, 58);
      body = visual.container;
      label = scene.add.text(item.x, item.y - 118, (item.label || 'Страж') + '\n' + (item.roleLabel || 'Страж города'), { ...labelStyle, fontSize: '16px', color: s.text, align: 'center' }).setOrigin(0.5);
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
      const tierColors = palette[item.masterTier] || palette.T1;
      const resourcePalette = {
        stone: null,
        water: { fill: 0x1f8fc9, stroke: 0x8de7ff, text: '#8de7ff' },
        wood: { fill: 0x2f7d45, stroke: 0x8ee6a7, text: '#8ee6a7' },
        clay: { fill: 0x9b5f3f, stroke: 0xe0a27a, text: '#e0a27a' }
      };
      const resourceColors = resourcePalette[item.masterResourceDirectionId] || null;
      const colors = resourceColors
        ? { fill: resourceColors.fill, stroke: item.masterTier === 'T4' ? tierColors.stroke : resourceColors.stroke, text: resourceColors.text }
        : tierColors;
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

      // The status is derived from the persistent Encounter, never from visual state.
      if (item.masterRewardState !== 'claimed' && item.masterRewardAvailable !== false) {
        this.createMasterRewardMarker(item, item.masterRewardState || 'idle');
        if (item.masterRewardState === 'running') this.createMasterProcessTimer(item);
      }
      if (item.masterExpeditionCompletedAt > 0) {
        const farewell = masterFarewellDisplay(item);
        item._masterExpeditionTimer = scene.add.text(item.x, item.y - 83,
          farewell.text, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#ffb4a9',
            backgroundColor: 'rgba(50, 8, 10, 0.88)',
            padding: { x: 7, y: 4 }
          }).setOrigin(0.5).setDepth(9).setVisible(farewell.visible);
      }
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
    if (item._masterRewardMarker) displayObjects.push(item._masterRewardMarker);
    if (item._masterProcessTimer) displayObjects.push(item._masterProcessTimer);
    if (item._masterExpeditionTimer) displayObjects.push(item._masterExpeditionTimer);

    // Master farewell is the sole NPC lifetime countdown. Do not also draw
    // the generic below-head TTL (which caused a third competing timer).
    if (Number.isFinite(Number(item.expiresAt))
      && !(item.type === 'master-npc' && item.masterExpeditionCompletedAt > 0)) {
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

    let nearest = null;
    let nearestDistance = Infinity;
    for (const item of this.items) {
      if (item.trigger !== 'action' || (item.used && item.once)) continue;
      const currentDistance = distance(this.player, item);
      if (currentDistance > item.interactionRadius || currentDistance >= nearestDistance) continue;
      nearest = item;
      nearestDistance = currentDistance;
    }
    this.onPrompt?.(nearest ? `ДЕЙСТВИЕ · ${nearest.prompt || nearest.label || 'Взаимодействовать'} · E / Space / Enter` : '');

    if (nearest && interactPressed) this.activate(nearest);
  }

  updateCountdowns(now = Date.now()) {
    if (now < this.nextCountdownUpdateAt) return;
    this.nextCountdownUpdateAt = now + 250;

    for (const item of this.items) {
      if (item._timerLabel && Number.isFinite(Number(item.expiresAt))) {
        item._timerLabel.setText(countdownText(item.expiresAt, now));
      }
      if (item._masterExpeditionTimer) {
        const farewell = masterFarewellDisplay(item, now);
        item._masterExpeditionTimer.setText?.(farewell.text);
        item._masterExpeditionTimer.setVisible?.(farewell.visible);
      }
      if (item._masterProcessTimer && item.masterRewardState === 'running') {
        item._masterProcessTimer.setText?.(countdownText(item.masterProcessEndsAt, now));
      }
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
      item._masterRewardMarker?.setPosition?.(item.x, item.y - 24);
      item._masterProcessTimer?.setPosition?.(item.x, item.y - 65);
      item._masterExpeditionTimer?.setPosition?.(item.x, item.y - 83);
    }
    return true;
  }

  createMasterRewardMarker(item, state = 'idle') {
    if (!item || item.type !== 'master-npc') return null;
    const ready = state === 'ready';
    const marker = this.scene.add.circle(item.x, item.y - 24, 5, ready ? 0x22c55e : 0xff3b30, 1)
      .setStrokeStyle(1.5, ready ? 0x146c37 : 0x7a1212, 1)
      .setDepth(7)
      .setVisible(true);
    marker.setName?.('ugame-master-reward:' + String(item.masterEncounterId || item.id));
    item._masterRewardMarker = marker;
    this.scene.tweens.add({
      targets: marker,
      alpha: { from: 1, to: 0.48 },
      scale: { from: 0.85, to: 1.35 },
      duration: 650,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
    return marker;
  }

  createMasterProcessTimer(item) {
    if (!item || item.type !== 'master-npc') return null;
    const timer = this.scene.add.text(item.x, item.y - 65, countdownText(item.masterProcessEndsAt), {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', fontStyle: 'bold',
      color: '#ffb4a9', backgroundColor: 'rgba(5, 6, 8, 0.78)',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5).setDepth(7);
    item._masterProcessTimer = timer;
    return timer;
  }

  // Phaser visuals are disposable views; pending/claimed status comes from saved relationships.
  setMasterRewardState(id, state = 'idle', endsAt = null) {
    const item = typeof id === 'object' ? id : this.getItem(id);
    if (!item || item.type !== 'master-npc') return false;
    const next = ['idle', 'running', 'ready', 'claimed'].includes(state) ? state : 'idle';
    const nextEndsAt = next === 'running' && Number.isFinite(Number(endsAt)) ? Number(endsAt) : null;
    const marker = item._masterRewardMarker;
    const timer = item._masterProcessTimer;
    const markerValid = Boolean(marker && marker.active !== false);
    const timerValid = Boolean(timer && timer.active !== false);
    if (item.masterRewardState === next && item.masterProcessEndsAt === nextEndsAt
      && (next === 'claimed' ? !markerValid && !timerValid
        : markerValid && (next === 'running' ? timerValid : !timerValid))) return false;

    const removeVisual = (object) => {
      if (!object) return;
      this.scene?.tweens?.killTweensOf?.(object);
      object.destroy?.();
      item._displayObjects = (item._displayObjects || []).filter((value) => value !== object);
      this.objects = this.objects.filter((value) => value !== object);
    };
    item.masterRewardState = next;
    item.masterRewardAvailable = next !== 'claimed';
    item.masterProcessEndsAt = nextEndsAt;
    if (next === 'claimed') {
      removeVisual(marker);
      removeVisual(timer);
      item._masterRewardMarker = null;
      item._masterProcessTimer = null;
      return true;
    }
    if (!markerValid) {
      removeVisual(marker);
      const created = this.createMasterRewardMarker(item, next);
      if (created) { item._displayObjects?.push(created); this.objects.push(created); }
    } else {
      const ready = next === 'ready';
      marker.setFillStyle?.(ready ? 0x22c55e : 0xff3b30, 1);
      marker.setStrokeStyle?.(1.5, ready ? 0x146c37 : 0x7a1212, 1);
      marker.setVisible?.(true);
    }
    if (next === 'running') {
      if (!timerValid) {
        removeVisual(timer);
        const created = this.createMasterProcessTimer(item);
        if (created) { item._displayObjects?.push(created); this.objects.push(created); }
      } else {
        timer.setText?.(countdownText(nextEndsAt));
      }
    } else {
      removeVisual(timer);
      item._masterProcessTimer = null;
    }
    return true;
  }

  // Legacy caller retained for older tests and extensions.
  setMasterRewardAvailable(id, available) {
    return this.setMasterRewardState(id, available ? 'idle' : 'claimed');
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
    if (item._masterRewardMarker) this.scene?.tweens?.killTweensOf(item._masterRewardMarker);

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
      if (item._masterRewardMarker) this.scene?.tweens?.killTweensOf(item._masterRewardMarker);
    }
    for (const object of this.objects) object?.destroy?.();
    this.items = [];
    this.objects = [];
    this.lastAutoId = null;
    this.nextCountdownUpdateAt = 0;
  }
}

export { countdownText };
