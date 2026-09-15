const ZONES = [
  {
    id: 1,
    name: 'Zone 1',
    spawn: { x: 96, y: 270 },
    exitSide: 'right',
    walls: [
      { x: 360, y: 175, width: 230, height: 28 },
      { x: 520, y: 360, width: 270, height: 28 },
      { x: 720, y: 265, width: 28, height: 170 }
    ]
  },
  {
    id: 2,
    name: 'Zone 2',
    spawn: { x: 864, y: 270 },
    exitSide: 'left',
    walls: [
      { x: 710, y: 145, width: 260, height: 28 },
      { x: 515, y: 300, width: 28, height: 230 },
      { x: 285, y: 395, width: 300, height: 28 },
      { x: 250, y: 180, width: 180, height: 28 }
    ]
  }
];

export class ZoneSystem {
  constructor({ scene, width, height, player, onStatus }) {
    this.scene = scene;
    this.width = width;
    this.height = height;
    this.player = player;
    this.onStatus = onStatus;
    this.index = 0;
    this.objects = [];
    this.walls = [];
    this.exit = null;
    this.exitGlow = null;
  }

  get current() {
    return ZONES[this.index];
  }

  build(index = this.index) {
    this.clear();
    this.index = ((index % ZONES.length) + ZONES.length) % ZONES.length;

    const zone = this.current;
    this.walls = [];

    this.makeWall(this.width / 2, 6, this.width, 12);
    this.makeWall(this.width / 2, this.height - 6, this.width, 12);

    if (zone.exitSide === 'right') {
      this.makeWall(6, this.height / 2, 12, this.height);
      this.makeWall(this.width - 6, 105, 12, 210);
      this.makeWall(this.width - 6, 435, 12, 210);
    } else {
      this.makeWall(this.width - 6, this.height / 2, 12, this.height);
      this.makeWall(6, 105, 12, 210);
      this.makeWall(6, 435, 12, 210);
    }

    for (const wall of zone.walls) {
      this.makeWall(wall.x, wall.y, wall.width, wall.height);
    }

    this.makeExit(zone.exitSide);
    this.player.setPosition(zone.spawn.x, zone.spawn.y);
    this.onStatus?.(`${zone.name} · Найди выход ${zone.exitSide === 'right' ? 'справа' : 'слева'}`);
  }

  next() {
    this.build(this.index + 1);
    return this.current;
  }

  makeWall(x, y, width, height) {
    const object = this.scene.add.rectangle(x, y, width, height, 0x30363d);
    this.objects.push(object);
    this.walls.push({ x, y, width, height });
  }

  makeExit(side) {
    const isRight = side === 'right';
    const x = isRight ? this.width - 22 : 22;
    const glowX = isRight ? this.width - 28 : 28;
    const labelX = isRight ? this.width - 82 : 82;
    const label = isRight ? 'ВЫХОД →' : '← ВЫХОД';

    this.exitGlow = this.scene.add.rectangle(glowX, this.height / 2, 44, 126, 0x56d364, 0.18);
    this.exit = this.scene.add.rectangle(x, this.height / 2, 28, 110, 0x2ea043, 1);
    const text = this.scene.add.text(labelX, this.height / 2, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#9ff0ad'
    }).setOrigin(0.5);

    this.objects.push(this.exitGlow, this.exit, text);

    this.scene.tweens.add({
      targets: this.exitGlow,
      alpha: { from: 0.22, to: 0.62 },
      duration: 900,
      yoyo: true,
      repeat: -1
    });
  }

  clear() {
    if (this.exitGlow) this.scene.tweens.killTweensOf(this.exitGlow);
    for (const object of this.objects) object.destroy();
    this.objects = [];
    this.walls = [];
    this.exit = null;
    this.exitGlow = null;
  }
}
