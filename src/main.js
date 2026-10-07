import { initDevConsole } from './dev-console.js';
import { VisionSystem } from './vision-system.js';
import { WorldGraph } from './world-graph.js';
import { ZoneSystem } from './zone-system.js';
import { ClassSystem } from './class-system.js';
import { EventSystem } from './event-system.js';
import { InteractableSystem } from './interactable-system.js';
import { PlayerController } from './player-controller.js';
import { CharacterView } from './character-view.js';
import { AudioSystem } from './audio-system.js';
import { ZoneRulesSystem } from './zone-rules-system.js';
import { ResourceSystem } from './resource-system.js';
import { ItemCatalog } from './item-catalog.js';
import { ContainerSystem } from './container-system.js';
import { InventoryPanelSystem } from './inventory-panel-system.js';
import { DialogueSystem } from './dialogue-system.js';
import { InteractionPanelSystem } from './interaction-panel-system.js';
import { RewardGenerator } from './reward-generator.js';
import { EventSpotSystem } from './event-spot-system.js';
import { QuestSystem } from './quest-system.js';
import { GameState } from './game-state.js';
import { SaveSystem } from './save-system.js';
import { ProjectHubSystem } from './project-hub-system.js';
import { ChromeContextSystem } from './chrome-context-system.js';
import { GameClockSystem } from './game-clock-system.js';
import { ChromeHeaderSystem } from './chrome-header-system.js';
import { ActionRouter } from './action-router.js';
import { InterfaceSettingsSystem } from './interface-settings.js';
import { UIWindowManager } from './ui-window-manager.js';
import { ResponsiveViewportSystem } from './responsive-viewport-system.js';
import { BiomeTextureSettingsSystem, GroundTextureSystem, preloadGroundTextures } from './ground-texture-system.js';
import { WorldSpawnStateSystem } from './world-spawn-state-system.js';
import { MasterCatalog } from './master-catalog.js';

const WIDTH = 960;
const HEIGHT = 540;
const PLAYER_SIZE = 28;
const SPEED = 220;
const VISIBILITY_RADIUS = 165;
const FIRST_PLAYABLE_FRAGMENTS = ['fragment-blue', 'fragment-amber', 'fragment-violet'];

let visionSystem = null;
let classSystem = null;
let playerController = null;
let resourceSystem = null;
let containerSystem = null;
let questSystem = null;
let eventSpotSystem = null;
let saveSystem = null;
let projectHubSystem = null;
let chromeContextSystem = null;
let gameClockSystem = null;
let chromeHeaderSystem = null;
let actionRouter = null;
let interfaceSettingsSystem = null;
let uiWindowManager = null;
let biomeTextureSettingsSystem = new BiomeTextureSettingsSystem();
let groundTextureSystem = null;
let worldSpawnStateSystem = null;
let masterCatalog = new MasterCatalog();


function syncPlayerInputState() {
  if (!playerController) return;
  const overlayIds = ['dialogue-panel', 'interaction-panel', 'inventory-panel', 'project-hub'];
  const anyOverlayOpen = overlayIds.some((id) => {
    const element = document.getElementById(id);
    return element && !element.hidden;
  });
  playerController.setEnabled(!anyOverlayOpen);
}

function fitPlayfield() {
  const shell = document.querySelector('.game-shell');
  const host = document.querySelector('#game');
  if (!shell || !host) return;

  const style = getComputedStyle(shell);
  const horizontalPadding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const verticalPadding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const availableWidth = Math.max(1, shell.clientWidth - horizontalPadding);
  const availableHeight = Math.max(1, shell.clientHeight - verticalPadding);

  host.style.width = `${Math.floor(availableWidth)}px`;
  host.style.height = `${Math.floor(availableHeight)}px`;
}

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
    containerSystem,
    resourceSystem,
    questSystem,
    eventSpotSystem,
    worldSpawnStateSystem,
    saveSystem
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
    this.worldReady = false;
    this.viewportSystem = null;
  }

  preload() {
    preloadGroundTextures(this);
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

    this.saveSystem = new SaveSystem({
      getState: () => this.gameState?.snapshot()
    });
    this.gameState = new GameState(this.saveSystem.load());
    saveSystem = this.saveSystem;
    const restoredState = this.gameState.snapshot();

    this.eventSystem = new EventSystem();
    this.audioSystem = new AudioSystem();
    this.worldGraph = new WorldGraph();

    worldSpawnStateSystem = new WorldSpawnStateSystem({
      worldGraph: this.worldGraph,
      eventSystem: this.eventSystem,
      onStateChange: (snapshot) => {
        this.gameState.setWorldSpawnState(snapshot);
        this.persistGameState();
      }
    });
    this.worldSpawnStateSystem = worldSpawnStateSystem;

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

    this.viewportSystem = new ResponsiveViewportSystem({
      scene: this,
      host: this.gameElement,
      baseWidth: WIDTH,
      baseHeight: HEIGHT,
      onChange: (metrics, previous) => this.handleViewportChange(metrics, previous)
    });
    const initialViewport = this.viewportSystem.start();

    groundTextureSystem = new GroundTextureSystem({
      scene: this,
      settings: biomeTextureSettingsSystem,
      worldWidth: initialViewport.worldWidth,
      worldHeight: initialViewport.worldHeight
    });

    classSystem = new ClassSystem({ visionSystem, eventSystem: this.eventSystem });

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
    syncPlayerInputState();

    this.characterView = new CharacterView({ scene: this, player: this.player });

    resourceSystem = new ResourceSystem({
      eventSystem: this.eventSystem,
      onChange: (_id, _value, snapshot) => {
        if (this.resourceStatusElement) {
          const fragments = FIRST_PLAYABLE_FRAGMENTS.reduce((total, id) => total + (snapshot[id] || 0), 0);
          const core = [
            `Камень ${snapshot.stone || 0}`,
            `Дерево ${snapshot.wood || 0}`,
            `Вода ${snapshot.water || 0}`,
            `Внимание ${snapshot.attention || 0}`
          ].join(' · ');
          this.resourceStatusElement.textContent = `${core} · Фрагменты ${fragments}/3`;
        }
        chromeHeaderSystem?.setResources(snapshot);
      }
    });
    resourceSystem.restore(restoredState.resources);

    this.itemCatalog = new ItemCatalog();
    containerSystem = new ContainerSystem({
      eventSystem: this.eventSystem,
      itemCatalog: this.itemCatalog,
      onChange: () => {
        if (this.inventoryStatusElement) {
          const summary = `Хранилища: ${containerSystem.summary()}`;
          this.inventoryStatusElement.textContent = summary;
          chromeHeaderSystem?.setStorageSummary(summary);
        }
      }
    });
    this.containerSystem = containerSystem;

    questSystem = new QuestSystem({
      eventSystem: this.eventSystem,
      onChange: (text) => {
        if (this.questStatusElement) this.questStatusElement.textContent = text;
      },
      grantReward: (reward) => {
        if (reward.type === 'item') this.grantItem(reward.id, reward.amount || 1);
        if (reward.type === 'resource') this.grantResource(reward.id, reward.amount || 1);
        this.audioSystem.play('quest');
      }
    });

    this.dialogueSystem = new DialogueSystem({
      eventSystem: this.eventSystem,
      panel: document.querySelector('#dialogue-panel'),
      speakerElement: document.querySelector('#dialogue-speaker'),
      textElement: document.querySelector('#dialogue-text'),
      nextButton: document.querySelector('#dialogue-next'),
      onOpenChange: () => syncPlayerInputState(),
      windowManager: uiWindowManager
    });

    this.interactionPanel = new InteractionPanelSystem({
      panel: document.querySelector('#interaction-panel'),
      titleElement: document.querySelector('#interaction-title'),
      textElement: document.querySelector('#interaction-text'),
      optionsElement: document.querySelector('#interaction-options'),
      metaElement: document.querySelector('#interaction-meta'),
      closeButton: document.querySelector('#interaction-close'),
      onOpenChange: () => syncPlayerInputState(),
      windowManager: uiWindowManager
    });

    this.inventoryPanel = new InventoryPanelSystem({
      eventSystem: this.eventSystem,
      containerSystem,
      itemCatalog: this.itemCatalog,
      panel: document.querySelector('#inventory-panel'),
      titleElement: document.querySelector('#inventory-title'),
      statsElement: document.querySelector('#inventory-stats'),
      tabsElement: document.querySelector('#inventory-tabs'),
      gridElement: document.querySelector('#inventory-grid'),
      statusElement: document.querySelector('#inventory-panel-status'),
      closeButton: document.querySelector('#inventory-close'),
      openButtons: [
        document.querySelector('#inventory-open'),
        document.querySelector('#inventory-open-touch')
      ],
      onOpenChange: () => syncPlayerInputState(),
      windowManager: uiWindowManager
    });

    actionRouter?.destroy?.();
    actionRouter = new ActionRouter({
      getDialogue: () => this.dialogueSystem,
      getInteraction: () => this.interactionPanel,
      getInventory: () => this.inventoryPanel,
      getProjectHub: () => projectHubSystem,
      onWorldPrimary: () => playerController?.queueAction()
    });
    actionRouter.bindPointerControls(document);

    this.rewardGenerator = new RewardGenerator();

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
        chromeContextSystem?.setZoneRuntimeStatus(text);
      }
    });

    this.zoneSystem = new ZoneSystem({
      scene: this,
      width: initialViewport.worldWidth,
      height: initialViewport.worldHeight,
      baseWidth: WIDTH,
      baseHeight: HEIGHT,
      player: this.player,
      worldGraph: this.worldGraph,
      interactableSystem: this.interactableSystem,
      eventSystem: this.eventSystem,
      onStatus: (text) => this.setStatus(text),
      onZoneChange: (zone) => {
        this.zoneRulesSystem.apply(zone.rules);
        groundTextureSystem?.applyZone(zone);
        chromeContextSystem?.setZone(zone);
        chromeContextSystem?.setLocationTierContext(worldSpawnStateSystem?.getLocationSummary?.(zone.id) || null);
      },
      isInteractableUsed: (id) => this.gameState.isInteractableUsed(id)
    });

    eventSpotSystem = new EventSpotSystem({
      worldGraph: this.worldGraph,
      zoneSystem: this.zoneSystem,
      interactableSystem: this.interactableSystem,
      eventSystem: this.eventSystem,
      rewardGenerator: this.rewardGenerator,
      worldSpawnStateSystem,
      interactionPanel: this.interactionPanel,
      grantResource: (id, amount) => this.grantResource(id, amount),
      onStateChange: (snapshot) => {
        this.gameState.setDynamicEvents(snapshot);
        this.persistGameState();
      },
      onZoneStatus: (text) => this.setStatus(text)
    });
    this.eventSpotSystem = eventSpotSystem;

    this.eventSystem.on('world-spawn:state', () => {
      const zoneId = this.zoneSystem?.currentZoneId || worldSpawnStateSystem?.currentZoneId;
      if (zoneId) chromeContextSystem?.setLocationTierContext(worldSpawnStateSystem?.getLocationSummary?.(zoneId) || null);
    });
    this.eventSystem.on('location-tier:changed', ({ zone }) => {
      if (!zone?.id) return;
      const zoneId = this.zoneSystem?.currentZoneId || worldSpawnStateSystem?.currentZoneId;
      if (zone.id === zoneId) chromeContextSystem?.setLocationTierContext(worldSpawnStateSystem?.getLocationSummary?.(zone.id) || null);
    });

    this.bindGameEvents();
    this.bindPersistenceEvents();

    if (!classSystem.apply(restoredState.player.classId)) classSystem.apply('wanderer');
    chromeHeaderSystem?.setClass(classSystem.current);
    chromeHeaderSystem?.setResources(resourceSystem.snapshot());
    this.initializeWorld(restoredState);

    this.scale.on('resize', () => this.viewportSystem?.schedule());

    this.dialogueSystem.load().catch(() => {
      if (this.questStatusElement) this.questStatusElement.textContent = 'Диалоги не загрузились';
    });
    questSystem.load('./data/quests.json', { restoreState: restoredState.quests }).catch(() => {
      if (this.questStatusElement) this.questStatusElement.textContent = 'Квесты не загрузились';
    });
  }

  handleViewportChange(metrics, previous = {}) {
    visionSystem?.setWorldSize(metrics.worldWidth, metrics.worldHeight);
    groundTextureSystem?.resize(metrics.worldWidth, metrics.worldHeight);
    if (!this.zoneSystem) return;

    const oldWidth = Number(this.zoneSystem.width) || WIDTH;
    this.zoneSystem.setViewport(metrics.worldWidth, metrics.worldHeight);

    if (this.worldReady && Math.abs(metrics.worldWidth - oldWidth) > 0.5) {
      const previousOffset = Math.max(0, (oldWidth - WIDTH) / 2);
      const nextOffset = Math.max(0, (metrics.worldWidth - WIDTH) / 2);
      this.zoneSystem.relayout({ shiftX: nextOffset - previousOffset });
    }
  }

  async initializeWorld(restoredState) {
    try {
      await Promise.all([
        biomeTextureSettingsSystem.load(),
        masterCatalog.load(),
        this.worldGraph.load(),
        this.rewardGenerator.load(),
        this.itemCatalog.load()
      ]);

      await containerSystem.load({
        snapshot: restoredState.containers,
        legacyInventory: restoredState.inventory,
        legacyResources: restoredState.resources
      });
      this.gameState.setContainers(containerSystem.snapshot());
      this.gameState.setInventory({});
      await worldSpawnStateSystem.initialize(restoredState.worldSpawnState);
      const restoredZoneId = this.worldGraph.resolveZoneId(restoredState.world.zoneId) || this.worldGraph.start.zoneId;
      chromeContextSystem?.setLocationTierContext(worldSpawnStateSystem.getLocationSummary(restoredZoneId));
      chromeHeaderSystem?.setStorageSummary(`Хранилища: ${containerSystem.summary()}`);
      this.persistGameState();

      this.eventSpotSystem.initialize(restoredState.dynamicEvents);

      const zoneId = this.worldGraph.resolveZoneId(restoredState.world.zoneId)
        || this.worldGraph.start.zoneId;
      const entryId = this.worldGraph.resolveEntryId(zoneId, restoredState.world.entry)
        || this.worldGraph.start.entryId;

      this.zoneSystem.build(zoneId, entryId);
      this.worldReady = true;
      visionSystem?.update();
    } catch (error) {
      this.worldReady = false;
      playerController?.setEnabled(false);
      this.setStatus('WorldGraph не загрузился');
      if (this.questStatusElement) {
        this.questStatusElement.textContent = `Ошибка мира: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  }

  bindPersistenceEvents() {
    this.eventSystem.on('class:changed', ({ id, classData }) => {
      this.gameState.setClassId(id);
      chromeHeaderSystem?.setClass(classData || classSystem?.current);
      this.persistGameState();
    });

    this.eventSystem.on('zone:enter', ({ zone, entry }) => {
      this.gameState.setZone(zone?.id, entry);
      this.persistGameState();
    });

    this.eventSystem.on('resource:changed', () => {
      this.gameState.setResources(resourceSystem.snapshot());
      this.persistGameState();
    });

    this.eventSystem.on('containers:changed', ({ state }) => {
      this.gameState.setContainers(state);
      this.persistGameState();
    });

    this.eventSystem.on('quest:state', ({ state }) => {
      this.gameState.setQuestState(state);
      this.persistGameState();
    });

    this.eventSystem.on('interactable:used', ({ id }) => {
      this.gameState.markInteractableUsed(id);
      this.persistGameState();
    });
  }

  persistGameState() {
    this.saveSystem.save(this.gameState.snapshot());
  }

  bindGameEvents() {
    this.eventSystem.on('interactable:activate', ({ item }) => {
      if (!item) return;

      if (item.dynamicEventId) {
        this.eventSpotSystem.activate(item).catch(() => {});
        return;
      }

      if (item.type === 'portal') {
        const now = performance.now();
        if (now < this.transitionLockUntil) return;
        this.transitionLockUntil = now + 450;
        this.zoneSystem.travel(item.target);
        visionSystem.update();
        return;
      }

      if (item.type === 'resource') {
        this.grantResource(item.resourceId || 'shard', item.amount || 1);
        return;
      }

      if (item.type === 'chest') {
        const granted = this.grantItem(item.itemId || 'starter-cache', item.amount || 1);
        if (granted && item.questSignal) this.eventSystem.emit('quest:signal', { key: item.questSignal });
        return;
      }

      if (item.type === 'bank') {
        this.inventoryPanel.open('bank', { bankAccess: true });
        return;
      }

      if (item.type === 'npc' && item.dialogueId) {
        this.dialogueSystem.start(item.dialogueId).catch(() => {});
      }
    });

    this.eventSystem.on('quest:complete', () => this.audioSystem.play('quest'));
  }

  grantItem(id, amount = 1) {
    if (!containerSystem?.loaded) return false;
    const result = containerSystem.addAuto(id, amount, { atomic: true });
    if (result.added === Math.max(1, Math.floor(Number(amount) || 1))) return true;
    this.setStatus('Рюкзак переполнен или превышен вес');
    return false;
  }

  grantResource(id, amount = 1) {
    const requested = Math.max(1, Math.floor(Number(amount) || 1));
    const item = this.itemCatalog?.get(id);

    if (!item || item.type !== 'resource') {
      resourceSystem.add(id, requested);
      return true;
    }

    if (item.storageMode === 'account') {
      resourceSystem.add(id, requested);
      return true;
    }

    if (!containerSystem?.loaded) return false;
    const stored = containerSystem.addAuto(id, requested, { atomic: true });
    if (stored.added !== requested) {
      this.setStatus('Не хватает ячеек или переносимого веса для награды');
      return false;
    }

    resourceSystem.add(id, requested);
    return true;
  }

  setStatus(text) {
    if (this.statusElement) this.statusElement.textContent = text;
  }

  updatePlayerHud(state) {
    if (!state) return;
    const dash = state.dashing ? ' · РЫВОК' : '';
    if (this.playerStateElement) {
      this.playerStateElement.textContent = `Stamina ${Math.round(state.stamina)}${dash}`;
    }
    chromeHeaderSystem?.setStamina(state);

    if (state.dashing && !this.wasDashing) this.audioSystem.play('dash');
    this.wasDashing = state.dashing;
  }

  update(_time, delta) {
    if (!this.worldReady) return;

    const state = playerController.update(delta);

    if (state.moving) {
      visionSystem.setDirection(state.direction.x, state.direction.y);
    }

    this.characterView.update(state, delta);
    worldSpawnStateSystem?.update(Date.now());
    this.eventSpotSystem?.update(Date.now());
    this.interactableSystem.update({ interactPressed: state.interactPressed });
    visionSystem.update();
  }

  canMoveTo(x, y) {
    const bounds = this.playerBounds(x, y);
    const worldWidth = this.zoneSystem?.width || WIDTH;
    const worldHeight = this.zoneSystem?.height || HEIGHT;
    if (bounds.left < 0 || bounds.right > worldWidth || bounds.top < 0 || bounds.bottom > worldHeight) return false;
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

chromeContextSystem = new ChromeContextSystem({
  versionElement: document.querySelector('#footer-version'),
  buildElement: document.querySelector('#footer-build'),
  environmentElement: document.querySelector('#footer-environment'),
  sessionElement: document.querySelector('#session-time'),
  locationPrimaryElement: document.querySelector('#location-primary'),
  locationSecondaryElement: document.querySelector('#location-secondary'),
  realDateElement: document.querySelector('#real-date'),
  realClockElement: document.querySelector('#real-clock'),
  realTimezoneElement: document.querySelector('#real-timezone'),
  headerLocationElement: document.querySelector('#header-location-summary')
});
chromeContextSystem.loadBuildContext();
chromeContextSystem.start();

gameClockSystem = new GameClockSystem({
  element: document.querySelector('#game-clock')
});
gameClockSystem.start();

chromeHeaderSystem = new ChromeHeaderSystem({
  nameElement: document.querySelector('#character-name'),
  classElement: document.querySelector('#character-class'),
  professionElement: document.querySelector('#character-profession'),
  specializationElement: document.querySelector('#character-specialization'),
  levelElement: document.querySelector('#character-level'),
  xpElement: document.querySelector('#character-xp'),
  staminaElement: document.querySelector('#header-stamina'),
  staminaBarElement: document.querySelector('#header-stamina-bar'),
  resourcesElement: document.querySelector('#pinned-resources'),
  wealthElement: document.querySelector('#material-wealth'),
  storageElement: document.querySelector('#header-storage-summary'),
  fragmentElement: document.querySelector('#header-fragment-status')
});
chromeHeaderSystem.load()
  .then(() => chromeHeaderSystem?.setResources(resourceSystem?.snapshot?.() || {}))
  .catch(() => {});

uiWindowManager = new UIWindowManager({
  host: document.querySelector('#game'),
  margin: 12
});

fitPlayfield();
window.addEventListener('resize', () => requestAnimationFrame(fitPlayfield));
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
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.NO_CENTER
  }
});

interfaceSettingsSystem = new InterfaceSettingsSystem();

projectHubSystem = new ProjectHubSystem({
  openButton: document.querySelector('#project-hub-open'),
  overlay: document.querySelector('#project-hub'),
  titleElement: document.querySelector('#project-hub-title'),
  breadcrumbElement: document.querySelector('#project-hub-breadcrumb'),
  navElement: document.querySelector('#project-hub-nav'),
  contentElement: document.querySelector('#project-hub-content'),
  backButton: document.querySelector('#project-hub-back'),
  closeButton: document.querySelector('#project-hub-close'),
  onOpenChange: () => syncPlayerInputState(),
  interfaceSettings: interfaceSettingsSystem,
  biomeTextureSettings: biomeTextureSettingsSystem
});

projectHubSystem.load().catch((error) => {
  const content = document.querySelector('#project-hub-content');
  if (content) content.textContent = `Project Hub не загрузился: ${error instanceof Error ? error.message : String(error)}`;
});
