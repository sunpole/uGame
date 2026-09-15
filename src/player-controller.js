function isTypingTarget() {
  const active = document.activeElement;
  if (!active) return false;
  return active.matches?.('input, textarea, select, [contenteditable="true"]') || false;
}

export class PlayerController {
  constructor({ scene, player, speed = 220, canMove, onState, arrowIndicators } = {}) {
    this.scene = scene;
    this.player = player;
    this.baseSpeed = speed;
    this.speedMultiplier = 1;
    this.canMove = canMove;
    this.onState = onState;
    this.arrowIndicators = arrowIndicators || {};
    this.enabled = true;

    this.staminaMax = 100;
    this.stamina = this.staminaMax;
    this.dashMultiplier = 1.7;
    this.dashDrainPerSecond = 55;
    this.staminaRegenPerSecond = 30;
    this.direction = { x: 1, y: 0 };

    this.virtual = { left: false, right: false, up: false, down: false, dash: false };
    this.virtualActionQueued = false;

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keys = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      interact: Phaser.Input.Keyboard.KeyCodes.E,
      interactAlt: Phaser.Input.Keyboard.KeyCodes.SPACE,
      dash: Phaser.Input.Keyboard.KeyCodes.SHIFT
    });
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }

  setSpeedMultiplier(multiplier = 1) {
    this.speedMultiplier = Math.max(0.2, Math.min(3, Number(multiplier) || 1));
  }

  refillStamina() {
    this.stamina = this.staminaMax;
  }

  bindVirtualControls(root = document) {
    const buttons = root.querySelectorAll?.('[data-control]') || [];
    const directional = new Set(['left', 'right', 'up', 'down']);

    for (const button of buttons) {
      const control = button.dataset.control;
      const release = (event) => {
        event.preventDefault();
        if (directional.has(control) || control === 'dash') this.virtual[control] = false;
      };

      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        button.setPointerCapture?.(event.pointerId);
        if (directional.has(control) || control === 'dash') this.virtual[control] = true;
        if (control === 'action') this.virtualActionQueued = true;
      });
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('lostpointercapture', release);
    }
  }

  update(delta) {
    const seconds = delta / 1000;
    const typing = isTypingTarget();
    const keyboardAllowed = this.enabled && !typing;
    const virtualAllowed = this.enabled;

    const left = (keyboardAllowed && (this.cursors.left.isDown || this.keys.left.isDown)) || (virtualAllowed && this.virtual.left);
    const right = (keyboardAllowed && (this.cursors.right.isDown || this.keys.right.isDown)) || (virtualAllowed && this.virtual.right);
    const up = (keyboardAllowed && (this.cursors.up.isDown || this.keys.up.isDown)) || (virtualAllowed && this.virtual.up);
    const down = (keyboardAllowed && (this.cursors.down.isDown || this.keys.down.isDown)) || (virtualAllowed && this.virtual.down);

    this.updateArrowIndicators(keyboardAllowed);

    let dx = (right ? 1 : 0) - (left ? 1 : 0);
    let dy = (down ? 1 : 0) - (up ? 1 : 0);
    if (dx !== 0 && dy !== 0) {
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }

    const moving = dx !== 0 || dy !== 0;
    if (moving) {
      const length = Math.hypot(dx, dy) || 1;
      this.direction = { x: dx / length, y: dy / length };
    }

    const dashRequested = (keyboardAllowed && this.keys.dash.isDown) || (virtualAllowed && this.virtual.dash);
    const dashing = moving && dashRequested && this.stamina > 1;
    if (dashing) this.stamina = Math.max(0, this.stamina - this.dashDrainPerSecond * seconds);
    else this.stamina = Math.min(this.staminaMax, this.stamina + this.staminaRegenPerSecond * seconds);

    const speed = this.baseSpeed * this.speedMultiplier * (dashing ? this.dashMultiplier : 1);
    const distance = speed * seconds;
    if (moving) {
      this.tryMove(dx * distance, 0);
      this.tryMove(0, dy * distance);
    }

    const keyboardInteract = keyboardAllowed && (
      Phaser.Input.Keyboard.JustDown(this.keys.interact) ||
      Phaser.Input.Keyboard.JustDown(this.keys.interactAlt)
    );
    const interactPressed = keyboardInteract || this.virtualActionQueued;
    this.virtualActionQueued = false;

    const state = {
      moving,
      dashing,
      direction: { ...this.direction },
      stamina: this.stamina,
      staminaMax: this.staminaMax,
      interactPressed
    };
    this.onState?.(state);
    return state;
  }

  tryMove(dx, dy) {
    if (!dx && !dy) return;
    const nextX = this.player.x + dx;
    const nextY = this.player.y + dy;
    if (this.canMove && !this.canMove(nextX, nextY)) return;
    this.player.setPosition(nextX, nextY);
  }

  updateArrowIndicators(keyboardAllowed) {
    const states = {
      left: keyboardAllowed && this.cursors.left.isDown,
      up: keyboardAllowed && this.cursors.up.isDown,
      down: keyboardAllowed && this.cursors.down.isDown,
      right: keyboardAllowed && this.cursors.right.isDown
    };

    for (const [direction, isDown] of Object.entries(states)) {
      const element = this.arrowIndicators[direction];
      if (element) element.dataset.active = isDown ? 'true' : 'false';
    }
  }

  executeDevCode(code) {
    if (code === '3001') {
      this.refillStamina();
      return { handled: true, message: '3001 · Выносливость восстановлена', state: 'ok' };
    }
    if (code === '3099') {
      return {
        handled: true,
        message: `3099 · Speed ${Math.round(this.baseSpeed * this.speedMultiplier)} · Stamina ${Math.round(this.stamina)}`,
        state: 'ok'
      };
    }
    return { handled: false };
  }
}
