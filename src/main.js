import { initDevConsole } from './dev-console.js';

const WIDTH = 960;
const HEIGHT = 540;
const PLAYER_SIZE = 28;
const SPEED = 220;
const VISIBILITY_RADIUS = 165;

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
    this.walls = [];
    this.exitReached = false;
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b0d10');
    this.statusElement = document.querySelector('#zone-status');
    this.gameElement = document.querySelector('#game');
    this.setStatus('Zone 1 · Найди выход справа');

    this.makeWall(WIDTH / 2, 6, WIDTH, 12);
    this.makeWall(WIDTH / 2, HEIGHT - 6, WIDTH, 12);
    this.makeWall(6, HEIGHT / 2, 12, HEIGHT);
    this.makeWall(WIDTH - 6, 105, 12, 210);
    this.makeWall(WIDTH - 6, 435, 12, 210);

    this.makeWall(360, 175, 230, 28);
    this.makeWall(520, 360, 270, 28);
    this.makeWall(720, 265, 28, 170);

    this.exitGlow = this.add.rectangle(WIDTH - 28, HEIGHT / 2, 44, 126, 0x56d364, 0.18);
    this.exit = this.add.rectangle(WIDTH - 22, HEIGHT / 2, 28, 110, 0x2ea043, 1);
    this.add.text(WIDTH - 82, HEIGHT / 2, 'ВЫХОД →', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#9ff0ad'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: this.exitGlow,
      alpha: { from: 0.22, to: 0.62 },
      duration: 900,
      yoyo: true,
      repeat: -1
    });

    this.player = this.add.rectangle(96, HEIGHT / 2, PLAYER_SIZE, PLAYER_SIZE, 0xf2f4f7);

    this.darknessElement = document.createElement('div');
    this.darknessElement.className = 'darkness-overlay';
    this.darknessElement.setAttribute('aria-hidden', 'true');
    this.gameElement?.appendChild(this.darknessElement);
    this.updateDarkness();

    this.scale.on('resize', () => this.updateDarkness());
    window.addEventListener('resize', () => this.updateDarkness());

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

  makeWall(x, y, width, height) {
    this.add.rectangle(x, y, width, height, 0x30363d);
    this.walls.push({ x, y, width, height });
  }

  update(_time, delta) {
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

    const distance = SPEED * (delta / 1000);
    this.tryMove(dx * distance, 0);
    this.tryMove(0, dy * distance);
    this.updateDarkness();

    if (!this.exitReached && this.overlaps(this.playerBounds(), this.objectBounds(this.exit))) {
      this.exitReached = true;
      this.setStatus('Zone 1 · Выход найден');
      this.exit.setFillStyle(0x56d364, 1);
      this.exitGlow.setAlpha(0.75);
      this.tweens.killTweensOf(this.exitGlow);
    }
  }

  updateDarkness() {
    if (!this.darknessElement || !this.gameElement || !this.player) return;

    const canvas = this.game.canvas;
    const canvasRect = canvas.getBoundingClientRect();
    const hostRect = this.gameElement.getBoundingClientRect();
    if (!canvasRect.width || !canvasRect.height) return;

    const left = canvasRect.left - hostRect.left;
    const top = canvasRect.top - hostRect.top;
    const scaleX = canvasRect.width / WIDTH;
    const scaleY = canvasRect.height / HEIGHT;
    const lightX = this.player.x * scaleX;
    const lightY = this.player.y * scaleY;
    const radius = VISIBILITY_RADIUS * Math.min(scaleX, scaleY);

    Object.assign(this.darknessElement.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${canvasRect.width}px`,
      height: `${canvasRect.height}px`
    });

    this.darknessElement.style.setProperty('--light-x', `${lightX}px`);
    this.darknessElement.style.setProperty('--light-y', `${lightY}px`);
    this.darknessElement.style.setProperty('--light-radius', `${radius}px`);
  }

  tryMove(dx, dy) {
    if (dx === 0 && dy === 0) return;

    const nextX = this.player.x + dx;
    const nextY = this.player.y + dy;
    const bounds = this.playerBounds(nextX, nextY);

    if (bounds.left < 0 || bounds.right > WIDTH || bounds.top < 0 || bounds.bottom > HEIGHT) return;
    if (this.walls.some((wall) => this.overlaps(bounds, this.objectBounds(wall)))) return;

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
initDevConsole();

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
