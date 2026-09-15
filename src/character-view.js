export class CharacterView {
  constructor({ scene, player } = {}) {
    this.scene = scene;
    this.player = player;
    this.phase = 0;

    player.setAlpha(0);

    this.container = scene.add.container(player.x, player.y).setDepth(10);
    this.shadow = scene.add.ellipse(0, 9, 24, 10, 0x000000, 0.35);
    this.body = scene.add.ellipse(0, 3, 20, 24, 0x5f81ff, 1);
    this.head = scene.add.circle(0, -8, 8, 0xe7c6a5, 1);
    this.face = scene.add.circle(0, -14, 2.3, 0x1f2328, 1);
    this.armLeft = scene.add.rectangle(-10, 2, 5, 14, 0xe7c6a5, 1);
    this.armRight = scene.add.rectangle(10, 2, 5, 14, 0xe7c6a5, 1);
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

    const swing = state.moving ? Math.sin(this.phase) * 3 : 0;
    this.armLeft.y = 2 + swing;
    this.armRight.y = 2 - swing;
    this.legLeft.y = 13 - swing * 0.6;
    this.legRight.y = 13 + swing * 0.6;

    const squash = state.dashing ? 1.045 : 1;
    this.container.setScale(1, squash);
  }

  destroy() {
    this.container?.destroy(true);
  }
}
