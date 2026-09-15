const ZONES = [
  {
    id: 1,
    name: 'Zone 1',
    spawn: { x: 96, y: 270 },
    exitSide: 'right',
    rules: {
      speedMultiplier: 1,
      vision: {}
    },
    walls: [
      { x: 360, y: 175, width: 230, height: 28 },
      { x: 520, y: 360, width: 270, height: 28 },
      { x: 720, y: 265, width: 28, height: 170 }
    ],
    interactables: [
      {
        id: 'guide',
        type: 'npc',
        x: 150,
        y: 120,
        label: 'Проводник',
        prompt: 'Поговорить',
        dialogueId: 'guide_intro'
      },
      {
        id: 'shard-node',
        type: 'resource',
        x: 585,
        y: 245,
        label: 'Осколок',
        prompt: 'Взять осколок',
        resourceId: 'shard',
        amount: 1,
        once: true,
        sound: 'resource'
      },
      {
        id: 'starter-chest',
        type: 'chest',
        x: 830,
        y: 420,
        label: 'Старый сундук',
        prompt: 'Открыть сундук',
        once: true,
        sound: 'chest'
      }
    ]
  },
  {
    id: 2,
    name: 'Zone 2',
    spawn: { x: 864, y: 270 },
    exitSide: 'left',
    rules: {
      speedMultiplier: 0.86,
      vision: { darkness: 0.9 }
    },
    walls: [
      { x: 710, y: 145, width: 260, height: 28 },
      { x: 515, y: 300, width: 28, height: 230 },
      { x: 285, y: 395, width: 300, height: 28 },
      { x: 250, y: 180, width: 180, height: 28 }
    ],
    interactables: [
      {
        id: 'zone2-shard',
        type: 'resource',
        x: 690,
        y: 410,
        label: 'Осколок',
        prompt: 'Взять осколок',
        resourceId: 'shard',
        amount: 1,
        once: true,
        sound: 'resource'
      }
    ]
  }
];

export class ZoneSystem {
  constructor({ scene, width, height, player, interactableSystem, eventSystem, onStatus, onZoneChange }) {
    this.scene = scene;
    this.width = width;
    this.height = height;
    this.player = player;
    this.interactableSystem = interactableSystem;
    this.eventSystem = eventSystem;
    this.onStatus = onStatus;
    this.onZoneChange = onZoneChange;
    this.index = 0;
    this.objects = [];
    this.walls = [];
  }

  get current() {
    return ZONES[this.index];
  }

  build(index = this.index) {
    const previous = this.current;
    if (this.objects.length || this.interactableSystem?.items?.length) {
      this.eventSystem?.emit('zone:leave', { zone: previous });
    }

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

    const portal = this.portalDefinition(zone.exitSide);
    this.interactableSystem?.load([...(zone.interactables || []), portal]);

    this.player.setPosition(zone.spawn.x, zone.spawn.y);
    this.onStatus?.(`${zone.name} · выход ${zone.exitSide === 'right' ? 'справа' : 'слева'}`);
    this.onZoneChange?.(zone);
    this.eventSystem?.emit('zone:enter', { zone });
    return zone;
  }

  next() {
    return this.build(this.index + 1);
  }

  portalDefinition(side) {
    const isRight = side === 'right';
    return {
      id: `portal-zone-${this.current.id}`,
      type: 'portal',
      trigger: 'auto',
      x: isRight ? this.width - 22 : 22,
      y: this.height / 2,
      width: 28,
      height: 110,
      labelX: isRight ? this.width - 82 : 82,
      labelY: this.height / 2,
      label: isRight ? 'ВЫХОД →' : '← ВЫХОД',
      sound: 'portal',
      target: 'next'
    };
  }

  makeWall(x, y, width, height) {
    const object = this.scene.add.rectangle(x, y, width, height, 0x30363d);
    this.objects.push(object);
    this.walls.push({ x, y, width, height });
  }

  clear() {
    for (const object of this.objects) object.destroy();
    this.objects = [];
    this.walls = [];
    this.interactableSystem?.clear();
  }
}
