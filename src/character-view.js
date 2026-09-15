function approach(current, target, delta, response = 80) {
  const t = 1 - Math.exp(-Math.max(0, delta) / response);
  return current + (target - current) * t;
}

export class CharacterView {
  constructor({ scene, player } = {}) {
    this.scene = scene;
    this.player = player;
    this.phase = 0;
    this.lean = 0;

    player.setAlpha(0);

    this.container = scene.add.container(player.x, player.y).setDepth(10);
    this.shadow = scene.add.ellipse(0, 9, 24, 10, 0x000000, 0.35);
    this.body = scene.add.ellipse(0, 5, 20, 24, 0x5f81ff, 1);
    this.head = scene.add.circle(0, -4, 8, 0xe7c6a5, 1);
    this.face = scene.add.circle(0, -8, 2.3, 0x1f2328, 1);
    this.armLeft = scene.add.rectangle(-10, 4, 5, 14, 0xe7c6a5, 1);
    this.armRight = scene.add.rectangle(10, 4, 5, 14, 0xe7c6a5, 1);
    this.legLeft = scene.add.rectangle(-5, 13, 6, 12, 0x30363d, 1);
    this.legRight = scene.add.rectangle(5, 13, 6, 12, 0x30363d, 1);

    this.container.add([
      this.shadow,
      this.legLeft,
      this.legRight,
      this.armLeft,
      this.armRight,
      this.body,
      this.head,
      this.face
    ]);
  }

  update(state, delta) {
    if (!state) return;

    this.container.setPosition(this.player.x, this.player.y);
    const angle = Math.atan2(state.direction.y, state.direction.x) + Math.PI / 2;
    this.container.setRotation(angle);

    if (state.moving) this.phase += delta * (state.dashing ? 0.018 : 0.012);
    else this.phase *= 0.78;

    const targetLean = state.dashing ? 1.45 : state.moving ? 1 : 0;
    this.lean = approach(this.lean, targetLean, delta);

    // Standing upright from a top-down view means the upper body overlaps more
    // of the lower body. Walking projects the torso/head clearly forward.
    this.body.y = 5 - this.lean * 5.5;
    this.head.y = -4 - this.lean * 7.5;
    this.face.y = -8 - this.lean * 9.2;

    const swing = state.moving ? Math.sin(this.phase) * 3.2 : 0;
    const armBaseY = 4 - this.lean * 4.5;
    this.armLeft.y = armBaseY + swing;
    this.armRight.y = armBaseY - swing;
    this.legLeft.y = 13 + this.lean * 1.7 - swing * 0.65;
    this.legRight.y = 13 + this.lean * 1.7 + swing * 0.65;

    // The shadow also stretches slightly in the movement direction, helping the
    // posture change read at normal gameplay scale.
    this.shadow.y = 9 + this.lean * 0.9;
    this.shadow.height = 10 + this.lean * 1.8;

    const scaleY = state.dashing ? 1.06 : 1;
    this.container.setScale(1, scaleY);
  }

  destroy() {
    this.container?.destroy(true);
  }
}
