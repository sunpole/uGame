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
import { StepSystem } from './step-system.js';
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
import { DaylightSystem } from './daylight-system.js';
import { ChromeHeaderSystem } from './chrome-header-system.js';
import { ActionRouter } from './action-router.js';
import { InterfaceSettingsSystem } from './interface-settings.js';
import { UIWindowManager } from './ui-window-manager.js';
import { ResponsiveViewportSystem } from './responsive-viewport-system.js';
import { BiomeTextureSettingsSystem, GroundTextureSystem, preloadGroundTextures } from './ground-texture-system.js';
import { WorldSpawnStateSystem } from './world-spawn-state-system.js';
import { MasterCatalog } from './master-catalog.js';
import { MasterEncounterSystem } from './master-encounter-system.js';
import { CharacterMasterRelationshipSystem } from './character-master-relationship-system.js';
import { MasterProcessSystem } from './master-process-system.js';
import { ResourceExpeditionSystem } from './resource-expedition-system.js';
import { ResourceExpeditionView } from './resource-expedition-view.js';
import { CraftingSystem } from './crafting-system.js';
import { SpawnZoneDebugSystem } from './spawn-zone-debug-system.js';

const WIDTH = 960;
const HEIGHT = 540;
const WORLD_WIDTH = WIDTH * 2;
const WORLD_HEIGHT = WORLD_WIDTH;
const PLAYER_SIZE = 28;
const SPEED = 220;
const VISIBILITY_RADIUS = 165;
const FIRST_PLAYABLE_FRAGMENTS = ['fragment-blue', 'fragment-amber', 'fragment-violet'];

let visionSystem = null;
let classSystem = null;
let playerController = null;
let resourceSystem = null;
let stepSystem = null;
let containerSystem = null;
let questSystem = null;
let eventSpotSystem = null;
let saveSystem = null;
let projectHubSystem = null;
let chromeContextSystem = null;
let gameClockSystem = null;
let daylightSystem = null;
let activeZoneScene = null;
let chromeHeaderSystem = null;
let actionRouter = null;
let interfaceSettingsSystem = null;
let uiWindowManager = null;
let biomeTextureSettingsSystem = new BiomeTextureSettingsSystem();
let groundTextureSystem = null;
let worldSpawnStateSystem = null;
let masterCatalog = new MasterCatalog();
let masterEncounterSystem = null;
let masterRelationshipSystem = null;
let masterProcessSystem = null;
let resourceExpeditionSystem = null;
let resourceExpeditionView = null;
let spawnZoneDebugSystem = null;


function syncPlayerInputState() {
  if (!playerController) return;
  const overlayIds = ['dialogue-panel', 'interaction-panel', 'inventory-panel', 'project-hub'];
  const anyOverlayOpen = overlayIds.some((id) => {
    const element = document.getElementById(id);
    return element && !element.hidden;
  });
  playerController.setEnabled(!anyOverlayOpen && !resourceExpeditionSystem?.isOccupied?.() && !resourceExpeditionView?.isOpen?.());
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
    daylightSystem,
    classSystem,
    playerController,
    containerSystem,
    stepSystem,
    resourceSystem,
    questSystem,
    eventSpotSystem,
    masterEncounterSystem,
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
    if (window.__ugameBoot) window.__ugameBoot.phase = 'scene-create';
    this.cameras.main.setBackgroundColor('#0b0d10');
    this.statusElement = document.querySelector('#zone-status');
    this.gameElement = document.querySelector('#game');
    this.playerStateElement = document.querySelector('#player-state');
    this.resourceStatusElement = document.querySelector('#resource-status');
    this.inventoryStatusElement = document.querySelector('#inventory-status');
    this.zoneRuleStatusElement = document.querySelector('#zone-rule-status');
    this.questStatusElement = document.querySelector('#quest-status');
    this.interactPromptElement = document.querySelector('#interact-prompt');
    this.stepsSummaryElement = document.querySelector('#steps-summary');
    this.stepsHudElement = document.querySelector('#steps-hud');
    this.stepsDirty = false;
    this.nextStepsPersistAt = 0;
    this.nextStepsHudAt = 0;

    this.saveSystem = new SaveSystem({
      getState: () => this.gameState?.snapshot()
    });
    this.gameState = new GameState(this.saveSystem.load());
    saveSystem = this.saveSystem;
    const restoredState = this.gameState.snapshot();

    this.eventSystem = new EventSystem();
    this.audioSystem = new AudioSystem();

    stepSystem = new StepSystem({
      eventSystem: this.eventSystem,
      onChange: (snapshot, detail = {}) => {
        this.gameState.setStepEconomy(snapshot);
        this.stepsDirty = true;
        const attentionPurchased = Math.max(0, Math.floor(Number(detail.attentionPurchased) || 0));
        if (attentionPurchased > 0) resourceSystem?.add?.('attention', attentionPurchased);
        this.renderSteps(snapshot);
      }
    });
    this.stepSystem = stepSystem;
    masterRelationshipSystem = new CharacterMasterRelationshipSystem({
      onStateChange: (snapshot) => {
        this.gameState.setCharacterMasterRelationships(snapshot);
        masterEncounterSystem?.refreshRewardMarkers?.();
        this.persistGameState();
      }
    });
    masterRelationshipSystem.initialize(restoredState.characterMasterRelationships);
    this.masterRelationshipSystem = masterRelationshipSystem;
    this.worldGraph = new WorldGraph();

    worldSpawnStateSystem = new WorldSpawnStateSystem({
      worldGraph: this.worldGraph,
      eventSystem: this.eventSystem,
      masterCatalog,
      onStateChange: (snapshot) => {
        this.gameState.setWorldSpawnState(snapshot);
        this.persistGameState();
      }
    });
    this.worldSpawnStateSystem = worldSpawnStateSystem;

    this.player = this.add
      .rectangle(96, HEIGHT / 2, PLAYER_SIZE, PLAYER_SIZE, 0xf2f4f7)
      .setDepth(10);

    activeZoneScene = this;
    visionSystem = new VisionSystem({
      host: this.gameElement,
      canvas: this.game.canvas,
      worldWidth: WORLD_WIDTH,
      worldHeight: WORLD_HEIGHT,
      player: this.player,
      camera: this.cameras.main,
      radius: VISIBILITY_RADIUS
    });

    daylightSystem = new DaylightSystem({
      host: this.gameElement,
      visionSystem
    });
    daylightSystem.setClockSnapshot(gameClockSystem?.snapshot?.() || { phase: 'День' });
    daylightSystem.load().catch((error) => {
      console.warn('DaylightSystem load failed', error);
    });
    this.daylightSystem = daylightSystem;

    this.viewportSystem = new ResponsiveViewportSystem({
      scene: this,
      host: this.gameElement,
      baseWidth: WIDTH,
      baseHeight: HEIGHT,
      worldWidth: WORLD_WIDTH,
      worldHeight: WORLD_HEIGHT,
      onChange: (metrics, previous) => this.handleViewportChange(metrics, previous)
    });
    const initialViewport = this.viewportSystem.start();
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

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
        this.renderResourceHud(snapshot);
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
        this.renderResourceHud();
      }
    });
    this.containerSystem = containerSystem;
    this.craftingSystem = new CraftingSystem({ containerSystem, itemCatalog: this.itemCatalog });
    document.querySelector('#workshop-open')?.addEventListener('click', () => this.openWorkshop());
    document.querySelector('#workshop-open-touch')?.addEventListener('click', () => this.openWorkshop());

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
    this.stepsSummaryElement?.addEventListener('click', () => this.openStepsEconomy());

    masterProcessSystem = new MasterProcessSystem({
      relationshipSystem: masterRelationshipSystem,
      interactionPanel: this.interactionPanel,
      worldSpawnStateSystem,
      grantResource: (id, amount, tier) => this.grantResource(id, amount, tier)
    });
    this.masterProcessSystem = masterProcessSystem;

    resourceExpeditionSystem = new ResourceExpeditionSystem({
      onChange: (snapshot) => {
        this.gameState.setResourceExpedition(snapshot);
        this.persistGameState();
        this.syncExpeditionUI();
      },
      availableSteps: () => stepSystem?.debt > 0 ? 0 : Math.floor(Number(stepSystem?.balance) || 0),
      spendSteps: (amount) => stepSystem?.spendService?.(amount, { source: 'resource-expedition' })?.ok === true,
      addSteps: (amount) => stepSystem?.add?.(amount, { source: 'expedition-solo-refund' }),
      grantResource: (id, mass, tier) => this.grantResource(id, mass, tier),
      grantRelationshipXp: (masterId, xp) => masterRelationshipSystem?.addRelationshipXp?.(masterId, xp),
      onDepleted: ({ encounterId, completedAt }) => worldSpawnStateSystem?.markExpeditionDepleted?.(encounterId, completedAt, 30_000)
    });
    this.resourceExpeditionSystem = resourceExpeditionSystem;
    resourceExpeditionView = new ResourceExpeditionView({
      expeditionSystem: resourceExpeditionSystem,
      interactionPanel: this.interactionPanel,
      onOccupancyChange: () => this.syncExpeditionUI(),
      getSteps: () => Math.floor(Number(stepSystem?.balance) || 0),
      getRelationship: (id) => masterRelationshipSystem?.get?.(id)
    });
    this.resourceExpeditionView = resourceExpeditionView;
    const strip = document.querySelector('#workspace-control-strip .mouse-controls');
    this.expeditionResumeButton = document.createElement('button');
    this.expeditionResumeButton.type = 'button';
    this.expeditionResumeButton.className = 'mouse-control mouse-control-inventory';
    this.expeditionResumeButton.textContent = 'Экспедиция';
    this.expeditionResumeButton.title = 'Вернуться к добыче или забрать груз';
    this.expeditionResumeButton.hidden = true;
    this.expeditionResumeButton.addEventListener('click', () => resourceExpeditionView?.show());
    strip?.append(this.expeditionResumeButton);
    const touch = document.querySelector('#touch-controls .touch-actions');
    this.expeditionResumeTouchButton = document.createElement('button');
    this.expeditionResumeTouchButton.type = 'button';
    this.expeditionResumeTouchButton.textContent = 'Экспедиция';
    this.expeditionResumeTouchButton.hidden = true;
    this.expeditionResumeTouchButton.addEventListener('click', () => resourceExpeditionView?.show());
    touch?.append(this.expeditionResumeTouchButton);

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
      getExpedition: () => resourceExpeditionView,
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
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
      baseWidth: WORLD_WIDTH,
      baseHeight: WORLD_HEIGHT,
      player: this.player,
      worldGraph: this.worldGraph,
      interactableSystem: this.interactableSystem,
      eventSystem: this.eventSystem,
      onStatus: (text) => this.setStatus(text),
      onZoneChange: (zone) => {
        this.zoneRulesSystem.apply(zone.rules);
        daylightSystem?.setZone?.(zone);
        groundTextureSystem?.applyZone(zone);
        chromeContextSystem?.setZone(zone);
        chromeContextSystem?.setLocationTierContext(worldSpawnStateSystem?.getLocationSummary?.(zone.id) || null);
      },
      isInteractableUsed: (id) => this.gameState.isInteractableUsed(id)
    });

    spawnZoneDebugSystem = new SpawnZoneDebugSystem({
      scene: this,
      worldGraph: this.worldGraph,
      zoneSystem: this.zoneSystem,
      eventSystem: this.eventSystem
    });
    this.spawnZoneDebugSystem = spawnZoneDebugSystem;

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

    masterEncounterSystem = new MasterEncounterSystem({
      worldGraph: this.worldGraph,
      zoneSystem: this.zoneSystem,
      interactableSystem: this.interactableSystem,
      eventSystem: this.eventSystem,
      worldSpawnStateSystem,
      masterCatalog,
      relationshipSystem: masterRelationshipSystem,
      interactionPanel: this.interactionPanel,
      processSystem: masterProcessSystem,
      expeditionView: resourceExpeditionView,
      canMoveTo: (x, y) => this.canMoveTo(x, y),
      getWanderRadius: () => spawnZoneDebugSystem?.getSettings?.().radiusPx || 150
    });
    this.masterEncounterSystem = masterEncounterSystem;

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
    this.renderResourceHud(resourceSystem.snapshot());
    this.initializeWorld(restoredState);

    this.scale.on('resize', () => this.viewportSystem?.schedule());

    this.dialogueSystem.load().catch(() => {
      if (this.questStatusElement) this.questStatusElement.textContent = 'Диалоги не загрузились';
    });
    questSystem.load('./data/quests.json', { restoreState: restoredState.quests }).catch(() => {
      if (this.questStatusElement) this.questStatusElement.textContent = 'Квесты не загрузились';
    });
  }

  handleViewportChange(metrics) {
    visionSystem?.setWorldSize(WORLD_WIDTH, WORLD_HEIGHT);
    groundTextureSystem?.resize(WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main?.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }

  async initializeWorld(restoredState) {
    try {
      if (window.__ugameBoot) window.__ugameBoot.phase = 'world-init';
      await Promise.all([
        stepSystem.load(restoredState.stepEconomy),
        biomeTextureSettingsSystem.load(),
        masterCatalog.load(),
        masterProcessSystem.load(),
        resourceExpeditionSystem.load(),
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
      await this.craftingSystem.load();
      await worldSpawnStateSystem.initialize(restoredState.worldSpawnState);
      masterProcessSystem?.update(Date.now(), true);
      resourceExpeditionSystem.initialize(restoredState.resourceExpedition);
      resourceExpeditionSystem.update(Date.now(), true);
      const restoredZoneId = this.worldGraph.resolveZoneId(restoredState.world.zoneId) || this.worldGraph.start.zoneId;
      chromeContextSystem?.setLocationTierContext(worldSpawnStateSystem.getLocationSummary(restoredZoneId));
      chromeHeaderSystem?.setStorageSummary(`Хранилища: ${containerSystem.summary()}`);
      this.renderResourceHud();
      this.persistGameState();

      this.eventSpotSystem.initialize(restoredState.dynamicEvents);

      const zoneId = this.worldGraph.resolveZoneId(restoredState.world.zoneId)
        || this.worldGraph.start.zoneId;
      const entryId = this.worldGraph.resolveEntryId(zoneId, restoredState.world.entry)
        || this.worldGraph.start.entryId;

      this.zoneSystem.build(zoneId, entryId);
      stepSystem.update(Date.now(), { safeCity: this.zoneSystem.current?.isSafeCity === true, force: true });
      this.renderSteps();
      this.gameState.setStepEconomy(stepSystem.snapshot());
      this.stepsDirty = true;
      this.worldReady = true;
      this.syncExpeditionUI();
      if (resourceExpeditionSystem.run && !resourceExpeditionSystem.run.claimed) {
        resourceExpeditionView?.show();
      }
      if (window.__ugameBoot) window.__ugameBoot.phase = 'ready';
      visionSystem?.update();
    } catch (error) {
      this.worldReady = false;
      if (window.__ugameBoot) {
        window.__ugameBoot.phase = 'world-error';
        window.__ugameBoot.error = error instanceof Error ? error.message : String(error);
      }
      playerController?.setEnabled(false);
      this.setStatus('WorldGraph не загрузился');
      if (this.questStatusElement) {
        this.questStatusElement.textContent = `Ошибка мира: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  }

  syncExpeditionUI() {
    const run = resourceExpeditionSystem?.run;
    if (this.expeditionResumeButton) this.expeditionResumeButton.hidden = !run || run.claimed;
    if (this.expeditionResumeTouchButton) this.expeditionResumeTouchButton.hidden = !run || run.claimed;
    syncPlayerInputState();
  }

  bindPersistenceEvents() {
    this.eventSystem.on('class:changed', ({ id, classData }) => {
      this.gameState.setClassId(id);
      chromeHeaderSystem?.setClass(classData || classSystem?.current);
      this.persistGameState();
    });

    this.eventSystem.on('zone:enter', ({ zone, entry }) => {
      this.gameState.setZone(zone?.id, entry);
      stepSystem?.resetRegenClock?.(Date.now());
      this.gameState.setStepEconomy(stepSystem?.snapshot?.() || this.gameState.state.stepEconomy);
      this.renderSteps();
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

      if (item.masterEncounterId) {
        masterEncounterSystem?.activate(item);
        return;
      }

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

      if (item.type === 'bank' || item.type === 'city-banker') {
        this.inventoryPanel.open('bank', { bankAccess: true });
        return;
      }

      if (item.type === 'city-teleporter') {
        this.openCityTeleporter(item);
        return;
      }

      if ((item.type === 'npc' || item.type === 'city-guide') && item.dialogueId) {
        this.dialogueSystem.start(item.dialogueId).catch(() => {});
        return;
      }
    });

    this.eventSystem.on('steps:debt-started', () => {
      this.interactionPanel?.showActions?.({
        title: 'Шаги закончились',
        text: 'Движение не блокируется. Дальнейший путь увеличивает Долг Шагов. Обычный городской regen этот долг не погашает.',
        actions: [
          {
            id: 'steps-open-exchange',
            label: 'Обмен Шагов / Внимания',
            onSelect: () => {
              this.openStepsEconomy();
              return true;
            }
          },
          {
            id: 'steps-continue-debt',
            label: 'Продолжить в долг',
            onSelect: () => true
          }
        ],
        meta: 'Погашение долга: Внимание → Шаги или будущая продажа ресурсов торговцу'
      });
    });

    this.eventSystem.on('quest:complete', () => this.audioSystem.play('quest'));
  }

  openStepsEconomy() {
    if (!stepSystem?.loaded) return false;
    const attention = Math.floor(Number(resourceSystem?.get?.('attention')) || 0);
    const toSteps = stepSystem.attentionToStepsAmount();
    const toAttention = stepSystem.stepsToAttentionAmount();
    const balance = Math.floor(stepSystem.balance);
    const debt = Math.floor(stepSystem.debt);
    const fmt = (value) => Math.floor(Number(value) || 0).toLocaleString('ru-RU');

    this.interactionPanel?.showActions?.({
      title: 'Шаги / Внимание',
      text: debt > 0
        ? 'Есть Долг Шагов. Обмен Внимания сначала погашает долг; только остаток становится положительными Шагами.'
        : 'При достижении максимума Шагов Внимание покупается автоматически.',
      actions: [
        {
          id: 'attention-to-steps',
          label: '1 Внимание → ' + fmt(toSteps) + ' Шагов',
          disabled: attention < 1,
          hint: attention < 1 ? 'Нет Внимания' : 'Сначала погасит Долг Шагов',
          onSelect: () => {
            if (!resourceSystem?.remove?.('attention', 1)) return false;
            stepSystem.add(toSteps, { source: 'attention-exchange', payDebt: true });
            this.flushStepPersistence(Date.now(), true);
            this.openStepsEconomy();
            return true;
          }
        }
      ],
      meta: 'Шаги ' + fmt(balance) + ' / ' + fmt(stepSystem.maxSteps) + ' · Долг ' + fmt(debt) + ' · Внимание ' + fmt(attention) + ' · авто +1 Внимание при ' + fmt(toAttention)
    });
    return true;
  }

  openCityTeleporter(item) {
    const cities = this.worldGraph?.getSafeCityZones?.()
      ?.slice()
      ?.sort((a, b) => Number(a.ordinalId || 0) - Number(b.ordinalId || 0)) || [];
    const currentZoneId = this.zoneSystem?.currentId || null;

    const actions = cities.map((city) => {
      const transitions = city.id === currentZoneId
        ? 0
        : this.worldGraph.shortestDistance(currentZoneId, city.id);
      const cost = Number.isFinite(transitions)
        ? stepSystem?.teleportCostForTransitions?.(transitions) || 0
        : Infinity;
      const affordable = Number.isFinite(cost) && stepSystem?.canSpendService?.(cost);
      return {
        id: city.id,
        label: city.name + (city.id === currentZoneId ? ' · вы здесь' : ' · ' + Number(cost || 0).toLocaleString('ru-RU') + ' Шагов'),
        disabled: city.id === currentZoneId || !affordable,
        hint: city.id === currentZoneId
          ? (city.cityRole || 'Мирный город')
          : ((city.cityRole || 'Мирный город') + ' · маршрут ' + transitions + ' переходов'),
        onSelect: () => {
          const spent = stepSystem?.spendService?.(cost, { source: 'city-teleport' });
          if (!spent?.ok) {
            this.openCityTeleporter(item);
            return false;
          }
          this.flushStepPersistence(Date.now(), true);
          this.interactionPanel?.close?.();
          this.zoneSystem?.travel?.({ zoneId: city.id, entryId: 'center' });
          visionSystem?.update?.();
          this.audioSystem?.play?.('portal');
          return true;
        }
      };
    });

    this.interactionPanel?.showActions?.({
      title: item?.label || 'Астэр Звездочёт',
      text: 'Выберите мирный город. Цена = кратчайший маршрут WorldGraph × 1 000 пеших Шагов × 60%. Телепорт не создаёт долг.',
      actions,
      meta: 'Городская сеть · ' + cities.length + ' городов · ' + stepSystem.statusText()
    });
  }

  openWorkshop() {
    const crafting = this.craftingSystem;
    const status = crafting?.inspect?.();
    if (!crafting?.recipe || !status?.materials?.length) {
      this.interactionPanel?.showMessage?.({
        title: 'Мастерская', text: 'Рецепт пока не загрузился.'
      });
      return;
    }
    const labels = status.materials.map((material) => {
      const name = this.itemCatalog.name(material.id);
      const unitKg = Number(this.itemCatalog.get(material.id)?.unitKg || 0.1);
      return name + ': ' + (material.owned * unitKg).toFixed(1)
        + ' / ' + Number(material.massKg).toFixed(1) + ' кг';
    });
    const canPersist = Boolean(this.saveSystem?.storage) && !this.saveSystem?.blocked && !this.saveSystem?.paused;
    let submitting = false; // Ignore double clicks from the same view.
    this.interactionPanel?.showActions?.({
      title: 'Мастерская · первый рецепт',
      text: (crafting.recipe.name || 'Простой полевой инструмент')
        + '\n' + labels.join('\n'),
      meta: 'Один предмет · без привязки к городу · материалы из рюкзака и пояса',
      actions: [{
        id: 'craft-first-tool',
        label: status.ready ? 'Изготовить 1 предмет' : 'Недостаточно материалов',
        hint: !canPersist ? 'Сохранение недоступно: сначала восстановите Save' : '',
        disabled: !status.ready || !canPersist,
        onSelect: () => {
          if (submitting) return false;
          submitting = true;
          const result = crafting.craft();
          if (!result.ok) {
            this.interactionPanel?.showMessage?.({
              title: 'Изготовление не выполнено',
              text: result.reason === 'inventory-full'
                ? 'Недостаточно места в рюкзаке. Материалы не потрачены.'
                : 'Проверьте доступные материалы и повторите.',
              meta: result.reason
            });
            return false;
          }
          this.interactionPanel?.showMessage?.({
            title: 'Предмет изготовлен',
            text: this.itemCatalog.name(result.itemId) + ' × ' + result.count
              + ' теперь в инвентаре.',
            meta: 'Материалы списаны · состояние сохранено локально'
          });
          return true;
        }
      }]
    });
  }

  grantItem(id, amount = 1) {
    if (!containerSystem?.loaded) return false;
    const result = containerSystem.addAuto(id, amount, { atomic: true });
    if (result.added === Math.max(1, Math.floor(Number(amount) || 1))) return true;
    this.setStatus('Рюкзак переполнен или превышен вес');
    return false;
  }

  grantResource(id, amount = 1, tier = null) {
    const item = this.itemCatalog?.get(id);

    if (!item || item.type !== 'resource') {
      const requested = Math.max(1, Math.floor(Number(amount) || 1));
      resourceSystem.add(id, requested);
      return true;
    }

    if (item.storageMode === 'account') {
      const requested = Math.max(1, Math.floor(Number(amount) || 1));
      resourceSystem.add(id, requested);
      return true;
    }

    if (!containerSystem?.loaded) return false;

    if (item.massStorage) {
      const resolvedTier = typeof tier === 'string' && tier ? tier : 'T1';
      const tierItemId = id + '-' + resolvedTier.toLowerCase();
      const tierItem = this.itemCatalog?.get(tierItemId);
      if (!tierItem) return false;
      const massKg = Math.max(tierItem.unitKg, Math.round((Number(amount) || tierItem.unitKg) * 10) / 10);
      const units = Math.max(1, Math.round(massKg / tierItem.unitKg));
      const stored = containerSystem.addAuto(tierItemId, units, { atomic: true });
      if (stored.added !== units) {
        this.setStatus('Не хватает ячеек или переносимого веса для ' + massKg.toFixed(1) + ' кг');
        return false;
      }
      this.renderResourceHud();
      return true;
    }

    const requested = Math.max(1, Math.floor(Number(amount) || 1));
    const stored = containerSystem.addAuto(id, requested, { atomic: true });
    if (stored.added !== requested) {
      this.setStatus('Не хватает ячеек или переносимого веса для награды');
      return false;
    }
    return true;
  }

  setStatus(text) {
    if (this.statusElement) this.statusElement.textContent = text;
  }

  renderResourceHud(snapshot = resourceSystem?.snapshot?.() || {}) {
    const masses = containerSystem?.loaded ? containerSystem.materialMass() : {};
    const fragments = FIRST_PLAYABLE_FRAGMENTS.reduce((total, id) => total + (snapshot[id] || 0), 0);
    const kg = (id) => (Number(masses[id] || 0)).toFixed(1) + ' кг';
    const core = [
      'Камень ' + kg('stone'),
      'Дерево ' + kg('wood'),
      'Вода ' + kg('water'),
      'Глина ' + kg('clay'),
      'Внимание ' + Number(snapshot.attention || 0)
    ].join(' · ');
    if (this.resourceStatusElement) this.resourceStatusElement.textContent = core + ' · Фрагменты ' + fragments + '/3';
    chromeHeaderSystem?.setResources(snapshot, masses);
  }

  renderSteps(snapshot = stepSystem?.snapshot?.()) {
    if (!snapshot) return;
    const balance = Math.floor(Number(snapshot.balance) || 0);
    const debt = Math.floor(Number(snapshot.debt) || 0);
    const max = Math.floor(Number(stepSystem?.maxSteps) || 100000000);
    const safeCity = this.zoneSystem?.current?.isSafeCity === true;
    const activeRegen = Math.max(0, Number(stepSystem?.regenPerSecond?.({ safeCity })) || 0);
    const configuredRegen = Math.max(0, Number(stepSystem?.configuredCityRegenPerSecond?.()) || 0);
    const fmt = (value) => Math.abs(value).toLocaleString('ru-RU');
    const primary = debt > 0 && balance <= 0
      ? 'Шаги 0 / ' + fmt(max) + ' · долг ' + fmt(debt)
      : 'Шаги ' + fmt(balance) + ' / ' + fmt(max) + (debt > 0 ? ' · долг ' + fmt(debt) : '');
    const regen = activeRegen > 0
      ? ' · +' + activeRegen.toLocaleString('ru-RU') + '/с'
      : (debt > 0 ? ' · реген 0/с' : (safeCity ? ' · +0/с' : ' · +0/с вне города'));
    const detail = primary + regen;
    if (this.stepsSummaryElement) {
      this.stepsSummaryElement.textContent = detail;
      this.stepsSummaryElement.dataset.debt = String(debt > 0);
      this.stepsSummaryElement.title = 'Городской реген: ' + configuredRegen.toLocaleString('ru-RU') + '/с; формула = flat + max×%';
    }
    if (this.stepsHudElement) {
      this.stepsHudElement.textContent = detail;
      this.stepsHudElement.dataset.debt = String(debt > 0);
    }
  }

  flushStepPersistence(now = Date.now(), force = false) {
    if (!this.stepsDirty || (!force && now < this.nextStepsPersistAt)) return false;
    this.nextStepsPersistAt = now + 1000;
    this.gameState.setStepEconomy(stepSystem?.snapshot?.());
    this.persistGameState();
    this.stepsDirty = false;
    return true;
  }

  updatePlayerHud(state) {
    if (!state) return;
    const rounded = Math.round(state.stamina);
    const signature = rounded + ':' + (state.dashing ? '1' : '0');
    if (signature !== this.lastHudSignature) {
      this.lastHudSignature = signature;
      const dash = state.dashing ? ' · РЫВОК' : '';
      if (this.playerStateElement) {
        this.playerStateElement.textContent = `Stamina ${rounded}${dash}`;
      }
      chromeHeaderSystem?.setStamina(state);
    }

    if (state.dashing && !this.wasDashing) this.audioSystem.play('dash');
    this.wasDashing = state.dashing;
  }

  update(_time, delta) {
    if (!this.worldReady) return;

    const state = playerController.update(delta);
    if (state.movedDistancePx > 0) {
      const spend = stepSystem?.spendDistance(state.movedDistancePx, {
        dashing: state.dashing,
        safeCity: this.zoneSystem?.current?.isSafeCity === true
      });
      if (spend?.spent > 0) {
        this.stepsDirty = true;
        if (_time >= this.nextStepsHudAt) {
          this.nextStepsHudAt = _time + 200;
          this.renderSteps();
        }
      }
    }

    if (state.moving) {
      visionSystem.setDirection(state.direction.x, state.direction.y);
    }

    this.characterView.update(state, delta);
    const now = Date.now();
    stepSystem?.update(now, { safeCity: this.zoneSystem?.current?.isSafeCity === true });
    this.flushStepPersistence(now);
    worldSpawnStateSystem?.update(now);
    this.eventSpotSystem?.update(now);
    masterProcessSystem?.update(now);
    resourceExpeditionSystem?.update(now);
    resourceExpeditionView?.tick(now);
    masterEncounterSystem?.update(now, delta);
    this.interactableSystem.update({ interactPressed: state.interactPressed });
    visionSystem.update(false);
  }

  canMoveTo(x, y) {
    const bounds = this.playerBounds(x, y);
    const worldWidth = this.zoneSystem?.width || WIDTH;
    const worldHeight = this.zoneSystem?.height || HEIGHT;
    if (bounds.left < 0 || bounds.right > worldWidth || bounds.top < 0 || bounds.bottom > worldHeight) return false;
    if (this.zoneSystem?.isInsidePlayable && !this.zoneSystem.isInsidePlayable(x, y, PLAYER_SIZE / 2 + 6)) return false;
    if (this.zoneSystem?.collidesWithWall?.(x, y, PLAYER_SIZE / 2 + 4)) return false;
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

export async function bootGame() {
  if (window.__ugameBoot) window.__ugameBoot.phase = 'boot-game';
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
    element: document.querySelector('#game-clock'),
    onPhaseChange: (snapshot) => {
      const target = activeZoneScene?.daylightSystem || daylightSystem;
      target?.setClockSnapshot?.(snapshot);
    }
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
    biomeTextureSettings: biomeTextureSettingsSystem,
    worldMap: {
      getData: () => {
        const graph = worldSpawnStateSystem?.worldGraph;
        const currentZoneId = eventSpotSystem?.currentZoneId || masterEncounterSystem?.currentZoneId || null;
        const zones = [...(graph?.zones?.values?.() || [])].map((zone) => ({
          id: zone.id,
          ordinalId: zone.ordinalId,
          name: zone.name,
          biome: zone.biome,
          isSafeCity: zone.isSafeCity === true,
          cityKey: zone.cityKey || null,
          worldMap: zone.worldMap || null,
          locationTier: zone.isSafeCity ? null : (worldSpawnStateSystem?.getLocationSummary?.(zone.id)?.tier || null)
        }));
        return { currentZoneId, zones };
      }
    },
    spawnZoneDebug: {
      getSettings: () => spawnZoneDebugSystem?.getSettings?.() || null,
      updateSettings: (patch) => spawnZoneDebugSystem?.updateSettings?.(patch) || null,
      resetSettings: () => spawnZoneDebugSystem?.resetSettings?.() || null
    },
    devCodeRunner: (code) => {
      const form = document.querySelector('#dev-console');
      const input = document.querySelector('#dev-code-input');
      const status = document.querySelector('#dev-code-status');
      if (!form || !input) return null;
      input.value = String(code || '').replace(/\D/g, '').slice(0, 4);
      form.requestSubmit?.();
      return {
        code: input.value,
        message: status?.textContent || '',
        state: status?.dataset?.state || ''
      };
    },
    worldAnalyzer: {
      getData: () => {
        const snapshot = worldSpawnStateSystem?.snapshot?.() || {};
        const zones = {};
        for (const zone of worldSpawnStateSystem?.worldGraph?.zones?.values?.() || []) {
          zones[zone.id] = {
            id: zone.id,
            name: zone.name,
            biome: zone.biome,
            isSafeCity: zone.isSafeCity === true,
            location: worldSpawnStateSystem?.getLocationSummary?.(zone.id) || null
          };
        }
        return {
          masters: worldSpawnStateSystem?.getActiveMasters?.() || [],
          zones,
          candidatePools: snapshot.candidatePools || {},
          rotations: snapshot.rotations || {},
          counts: snapshot.activeCountsByResourceAndTier || {}
        };
      },
      teleport: (encounterId) => masterEncounterSystem?.teleportToEncounter?.(encounterId) || false
    }
  });
  
  projectHubSystem.load().catch((error) => {
    const content = document.querySelector('#project-hub-content');
    if (content) content.textContent = `Project Hub не загрузился: ${error instanceof Error ? error.message : String(error)}`;
  });
  
  return true;
}
