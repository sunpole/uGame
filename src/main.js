import { initDevConsole } from './dev-console.js';
import { VisionSystem } from './vision-system.js';
import { ZoneSystem } from './zone-system.js';

const WIDTH = 960;
const HEIGHT = 540;
const PLAYER_SIZE = 28;
const SPEED = 220;
const VISIBILITY_RADIUS = 165;

let visionSystem = null;

async function loadVersion() {
  try {
    const response = await fetch('./version.json', { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    if (!data?.version) return;

    const label = `v${data.version}`;
    const element = document.querySelector('#app-version');
    if (element) element.textContent = label;
    document.title = `uGame ${label}`;
  } catch {
    // Keep the HTML fallback version if version.json cannot be read.
  }
}

class ZoneScene extends Phaser.Scene {
  constructor() {
    super('zone');
    this.transitionLockUntil = 0;
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b0d10');
    this.statusElement = document.querySelector('#zone-status');
    this.gameElement = document.querySelector('#game');

    this.player = this.add
      .rectangle(96, HEIGHT / 2, PLAYER_SIZE, PLAYER_SIZE, 0xf2f4f7)
      .setDepth(10);

    this.zoneSystem = new ZoneSystem({
      scene: this,
      width: WIDTH,
      height: HEIGHT,
      player: this.player,
      onStatus: (text) => this.setStatus(text)
    });
    this.zoneSystem.build(0);

    visionSystem = new VisionSystem({
      host: this.gameElement,
      canvas: this.game.canvas,
      worldWidth: WIDTH,
      worldHeight: HEIGHT,
      player: this.player,
      radius: VISIBILITY_RADIUS
    });

    this.scale.on('resize', () => visionSystem?.update());
    window.addEventListener('resize', () => visionSystem?.update());

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });
  }

  setStatus(text) {
    if (this.statusElement) this.statusElement.textContent = text;
  }

  update(time, delta) {
    let dx = 0;
    let dy = 0;

    if (this.cursors.left.isDown || this.keys.left.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.keys.right.isDown) dx += 1;
    if (this.cursors.up.isDown || this.keys.up.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.keys.down.isDown) dy += 1;

    if (dx !== 0 && dy !== 0) {
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }

    if (dx !== 0 || dy !== 0) visionSystem?.setDirection(dx, dy);

    const distance = SPEED * (delta / 1000);
    this.tryMove(dx * distance, 0);
    this.tryMove(0, dy * distance);
    visionSystem?.update();

    if (
      time >= this.transitionLockUntil &&
      this.zoneSystem.exit &&
      this.overlaps(this.playerBounds(), this.objectBounds(this.zoneSystem.exit))
    ) {
      this.transitionLockUntil = time + 500;
      this.zoneSystem.next();
      visionSystem?.update();
    }
  }

  tryMove(dx, dy) {
    if (dx === 0 && dy === 0) return;

    const nextX = this.player.x + dx;
    const nextY = this.player.y + dy;
    const bounds = this.playerBounds(nextX, nextY);

    if (bounds.left < 0 || bounds.right > WIDTH || bounds.top < 0 || bounds.bottom > HEIGHT) return;
    if (this.zoneSystem.walls.some((wall) => this.overlaps(bounds, this.objectBounds(wall)))) return;

    this.player.setPosition(nextX, nextY);
  }

  playerBounds(x = this.player.x, y = this.player.y) {
    const half = PLAYER_SIZE / 2;
    return {
      left: x - half,
      right: x + half,
      top: y - half,
      bottom: y + half
    };
  }

  objectBounds(object) {
    return {
      left: object.x - object.width / 2,
      right: object.x + object.width / 2,
      top: object.y - object.height / 2,
      bottom: object.y + object.height / 2
    };
  }

  overlaps(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }
}

loadVersion();
initDevConsole({
  execute: (code) => visionSystem?.executeDevCode(code) || { handled: false }
});

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#0b0d10',
  scene: [ZoneScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
});
