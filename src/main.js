const WIDTH = 960;
const HEIGHT = 540;
const PLAYER_SIZE = 28;
const SPEED = 220;

class ZoneScene extends Phaser.Scene {
  constructor() {
    super('zone');
    this.walls = [];
    this.exitReached = false;
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b0d10');

    this.add.text(24, 20, 'uGame v0.0.1', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '22px',
      color: '#f2f4f7'
    });

    this.add.text(24, 50, 'WASD / стрелки — движение', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#9aa4b2'
    });

    this.statusText = this.add.text(24, HEIGHT - 38, 'Найди выход справа', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#7ee787'
    });

    this.makeWall(WIDTH / 2, 6, WIDTH, 12);
    this.makeWall(WIDTH / 2, HEIGHT - 6, WIDTH, 12);
    this.makeWall(6, HEIGHT / 2, 12, HEIGHT);
    this.makeWall(WIDTH - 6, 105, 12, 210);
    this.makeWall(WIDTH - 6, 435, 12, 210);

    this.makeWall(360, 175, 230, 28);
    this.makeWall(520, 360, 270, 28);
    this.makeWall(720, 265, 28, 170);

    this.exit = this.add.rectangle(WIDTH - 22, HEIGHT / 2, 28, 110, 0x2ea043, 0.85);
    this.add.text(WIDTH - 74, HEIGHT / 2 - 8, 'EXIT', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#d9fbdc'
    }).setOrigin(0.5);

    this.player = this.add.rectangle(96, HEIGHT / 2, PLAYER_SIZE, PLAYER_SIZE, 0xf2f4f7);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });
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

    if (!this.exitReached && this.overlaps(this.playerBounds(), this.objectBounds(this.exit))) {
      this.exitReached = true;
      this.statusText.setText('Выход найден. Следующая зона будет следующим шагом.');
      this.exit.setFillStyle(0x56d364, 1);
    }
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
