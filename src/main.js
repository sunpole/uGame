import { initDevConsole } from './dev-console.js';
import { VisionSystem } from './vision-system.js';
import { ZoneSystem } from './zone-system.js';
import { ClassSystem } from './class-system.js';
import { EventSystem } from './event-system.js';
import { InteractableSystem } from './interactable-system.js';
import { PlayerController } from './player-controller.js';
import { CharacterView } from './character-view.js';
import { AudioSystem } from './audio-system.js';
import { ZoneRulesSystem } from './zone-rules-system.js';
import { ResourceSystem } from './resource-system.js';
import { InventorySystem } from './inventory-system.js';
import { DialogueSystem } from './dialogue-system.js';
import { QuestSystem } from './quest-system.js';

const WIDTH = 960;
const HEIGHT = 540;
const PLAYER_SIZE = 28;
const SPEED = 220;
const VISIBILITY_RADIUS = 165;

let visionSystem = null;
let classSystem = null;
let playerController = null;
let resourceSystem = null;
let inventorySystem = null;
let questSystem = null;

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

function executeDevCode(code) {
  const systems = [
    visionSystem,
    classSystem,
    playerController,
    inventorySystem,
    resourceSystem,
    questSystem
  ];

  for (const system of systems) {
    const result = system?.executeDevCode?.(code);
    if (result?.handled) return result;
  }

  return { handled: false };
}

class ZoneScene extends Phaser.Scene {
  constructor() {
    super('zone');
    this.transitionLockUntil = 0;
    this.wasDashing = false;
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b0d10');
    this.statusElement = document.querySelector('#zone-status');
    this.gameElement = document.querySelector('#game');
    this.playerStateElement = document.querySelector('#player-state');
    this.resourceStatusElement = document.querySelector('#resource-status');
    this.inventoryStatusElement = document.querySelector('#inventory-status');
    this.zoneRuleStatusElement = document.querySelector('#zone-rule-status');
    this.questStatusElement = document.querySelector('#quest-status');
    this.interactPromptElement = document.querySelector('#interact-prompt');

    this.eventSystem = new EventSystem();
    this.audioSystem = new AudioSystem();

    this.player = this.add
      .rectangle(96, HEIGHT / 2, PLAYER_SIZE, PLAYER_SIZE, 0xf2f4f7)
      .setDepth(10);

    visionSystem = new VisionSystem({
      host: this.gameElement,
      canvas: this.game.canvas,
      worldWidth: WIDTH,
      worldHeight: HEIGHT,
      player: this.player,
      radius: VISIBILITY_RADIUS
    });

    classSystem = new ClassSystem({ visionSystem });

    playerController = new PlayerController({
      scene: this,
      player: this.player,
      speed: SPEED,
      canMove: (x, y) => this.canMoveTo(x, y),
      onState: (state) => this.updatePlayerHud(state),
      arrowIndicators: {
        left: document.querySelector('#arrow-left'),
        up: document.querySelector('#arrow-up'),
        down: document.querySelector('#arrow-down'),
        right: document.querySelector('#arrow-right')
      }
    });
    playerController.bindVirtualControls(document);

    this.characterView = new CharacterView({ scene: this, player: this.player });

    resourceSystem = new ResourceSystem({
      eventSystem: this.eventSystem,
      onChange: (_id, _value, snapshot) => {
        if (this.resourceStatusElement) {
          this.resourceStatusElement.textContent = `Осколки ${snapshot.shard || 0}`;
        }
      }
    });

    inventorySystem = new InventorySystem({
      eventSystem: this.eventSystem,
      onChange: () => {
        if (this.inventoryStatusElement) {
          this.inventoryStatusElement.textContent = `Инвентарь: ${inventorySystem.summary()}`;
        }
      }
    });

    questSystem = new QuestSystem({
      eventSystem: this.eventSystem,
      onChange: (text) => {
        if (this.questStatusElement) this.questStatusElement.textContent = text;
      },
      grantReward: (reward) => {
        if (reward.type === 'item') inventorySystem.add(reward.id, reward.amount || 1);
        if (reward.type === 'resource') resourceSystem.add(reward.id, reward.amount || 1);
        this.audioSystem.play('quest');
      }
    });

    this.dialogueSystem = new DialogueSystem({
      eventSystem: this.eventSystem,
      panel: document.querySelector('#dialogue-panel'),
      speakerElement: document.querySelector('#dialogue-speaker'),
      textElement: document.querySelector('#dialogue-text'),
      nextButton: document.querySelector('#dialogue-next'),
      onOpenChange: (open) => playerController.setEnabled(!open)
    });

    this.interactableSystem = new InteractableSystem({
      scene: this,
      player: this.player,
      eventSystem: this.eventSystem,
      audioSystem: this.audioSystem,
      onPrompt: (text) => {
        if (this.interactPromptElement) this.interactPromptElement.textContent = text;
      }
    });

    this.zoneRulesSystem = new ZoneRulesSystem({
      playerController,
      visionSystem,
      onStatus: (text) => {
        if (this.zoneRuleStatusElement) this.zoneRuleStatusElement.textContent = text;
      }
    });

    this.zoneSystem = new ZoneSystem({
      scene: this,
      width: WIDTH,
      height: HEIGHT,
      player: this.player,
      interactableSystem: this.interactableSystem,
      eventSystem: this.eventSystem,
      onStatus: (text) => this.setStatus(text),
      onZoneChange: (zone) => this.zoneRulesSystem.apply(zone.rules)
    });

    this.bindGameEvents();
    this.zoneSystem.build(0);

    this.scale.on('resize', () => visionSystem?.update());
    window.addEventListener('resize', () => visionSystem?.update());

    this.dialogueSystem.load().catch(() => {
      if (this.questStatusElement) this.questStatusElement.textContent = 'Диалоги не загрузились';
    });
    questSystem.load().catch(() => {
      if (this.questStatusElement) this.questStatusElement.textContent = 'Квесты не загрузились';
    });
  }

  bindGameEvents() {
    this.eventSystem.on('interactable:activate', ({ item }) => {
      if (!item) return;

      if (item.type === 'portal') {
        const now = performance.now();
        if (now < this.transitionLockUntil) return;
        this.transitionLockUntil = now + 450;
        this.zoneSystem.next();
        visionSystem.update();
        return;
      }

      if (item.type === 'resource') {
        resourceSystem.add(item.resourceId || 'shard', item.amount || 1);
        return;
      }

      if (item.type === 'chest') {
        inventorySystem.add('starter-cache', 1);
        this.eventSystem.emit('quest:signal', { key: 'chest:starter' });
        return;
      }

      if (item.type === 'npc' && item.dialogueId) {
        this.dialogueSystem.start(item.dialogueId).catch(() => {});
      }
    });

    this.eventSystem.on('quest:complete', () => this.audioSystem.play('quest'));
  }

  setStatus(text) {
    if (this.statusElement) this.statusElement.textContent = text;
  }

  updatePlayerHud(state) {
    if (!state || !this.playerStateElement) return;
    const dash = state.dashing ? ' · РЫВОК' : '';
    this.playerStateElement.textContent = `Stamina ${Math.round(state.stamina)}${dash}`;

    if (state.dashing && !this.wasDashing) this.audioSystem.play('dash');
    this.wasDashing = state.dashing;
  }

  update(_time, delta) {
    const state = playerController.update(delta);

    if (state.moving) {
      visionSystem.setDirection(state.direction.x, state.direction.y);
    }

    this.characterView.update(state, delta);
    this.interactableSystem.update({ interactPressed: state.interactPressed });
    visionSystem.update();
  }

  canMoveTo(x, y) {
    const bounds = this.playerBounds(x, y);
    if (bounds.left < 0 || bounds.right > WIDTH || bounds.top < 0 || bounds.bottom > HEIGHT) return false;
    if (this.zoneSystem?.walls?.some((wall) => this.overlaps(bounds, this.objectBounds(wall)))) return false;
    return true;
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
initDevConsole({ execute: executeDevCode });

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
