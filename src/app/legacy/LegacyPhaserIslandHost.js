import { normalizeLegacySceneId } from '../router/AnchorRouteContract.js';
import { MissionConsole } from '../../ui/MissionConsole.js';
import { RightWaypointPanel } from '../../ui/RightWaypointPanel.js';
import { MissionSummaryHud } from '../../ui/MissionSummaryHud.js';
import { AgentPerformanceHud } from '../../ui/AgentPerformanceHud.js';
import { MapHoverTooltip } from '../../ui/MapHoverTooltip.js';

export const LEGACY_PHASER_ISLAND_HOST_VERSION = 'legacy-phaser-island-host-mig-r2';

export function createLegacyPhaserIslandHost(options = {}) {
  return new LegacyPhaserIslandHost(options);
}

export class LegacyPhaserIslandHost {
  constructor({ elements = {}, documentRef = globalThis.document } = {}) {
    this.elements = elements;
    this.documentRef = documentRef;
    this.app = null;
    this.loading = null;
    this.currentSceneId = null;
    this.legacyPanels = null;
    this.publishDebug();
  }

  async mount(sceneId = 'MainMenuScene') {
    this.currentSceneId = normalizeLegacySceneId(sceneId);
    if (!this.loading) this.loading = this.ensureApp();
    const app = await this.loading;
    app.goTo?.(this.currentSceneId);
    this.publishDebug();
    return app;
  }

  async ensureApp() {
    await ensurePhaserScriptLoaded(this.documentRef);
    const { createPhaserGame } = await import('../../game/phaser/PhaserGame.js');
    this.legacyPanels = this.legacyPanels ?? createHiddenLegacyPanels(this.documentRef, this.elements.uiRoot ?? this.documentRef?.body);
    this.app = createPhaserGame({
      shell: this.elements.gameRoot,
      gameContainer: this.elements.gameRoot,
      viewportShell: this.elements.viewportShell,
      consoleRoot: this.elements.consoleRoot,
      waypointTimelineRoot: this.elements.waypointTimelineRoot,
      uiRoot: this.elements.uiRoot,
      overlay: {
        missionSummaryHud: this.elements.missionSummaryHud,
        topHud: this.documentRef?.getElementById?.('top-hud'),
        leftDrawer: this.documentRef?.getElementById?.('left-drawer'),
        rightDrawer: this.documentRef?.getElementById?.('right-drawer'),
        bottomTimeline: this.documentRef?.getElementById?.('bottom-timeline'),
        agentPerformanceHud: this.elements.agentPerformanceHud,
        modalRoot: this.documentRef?.getElementById?.('modal-root')
      },
      contextPanel: this.legacyPanels.contextPanel,
      waypointPanel: this.legacyPanels.waypointPanel,
      scorePanel: this.legacyPanels.scorePanel,
      eventPanel: this.legacyPanels.eventPanel,
      timelinePanel: this.legacyPanels.timelinePanel,
      legacyPanelRoot: this.legacyPanels.root,
      toastRoot: this.elements.toastRoot
    });
    this.app.console = new MissionConsole(this.app, this.elements.consoleRoot);
    this.app.waypointPanel = new RightWaypointPanel(this.app, this.elements.waypointTimelineRoot);
    this.app.summaryHud = new MissionSummaryHud(this.app, this.elements.missionSummaryHud);
    this.app.agentPerformanceHud = new AgentPerformanceHud(this.app, this.elements.agentPerformanceHud);
    this.app.mapHoverTooltip = new MapHoverTooltip(this.app);
    globalThis.__anchorLegacyPhaserApp = this.app;
    this.app.start();
    this.publishDebug();
    return this.app;
  }

  dispose() {
    this.app?.phaser?.destroy?.(true);
    this.app = null;
    this.loading = null;
    this.currentSceneId = null;
    this.publishDebug();
  }

  getDebugState() {
    return {
      type: 'anchor.legacy-phaser-island.debug',
      version: LEGACY_PHASER_ISLAND_HOST_VERSION,
      mounted: Boolean(this.app?.phaser),
      currentSceneId: this.currentSceneId,
      lazyLoaded: Boolean(this.loading),
      normalRuntimeDependency: false
    };
  }

  publishDebug() {
    globalThis.ANCHOR_LEGACY_PHASER_DEBUG = this.getDebugState();
  }
}

function ensurePhaserScriptLoaded(documentRef) {
  if (globalThis.Phaser) return Promise.resolve();
  if (!documentRef?.createElement) return Promise.reject(new Error('Cannot load Phaser without a document.'));
  const existing = documentRef.querySelector?.('script[data-anchor-phaser="lazy"]');
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load vendor/phaser.min.js.')), { once: true });
    });
  }
  return new Promise((resolve, reject) => {
    const script = documentRef.createElement('script');
    script.src = 'vendor/phaser.min.js';
    script.async = true;
    script.dataset.anchorPhaser = 'lazy';
    script.addEventListener('load', resolve, { once: true });
    script.addEventListener('error', () => reject(new Error('Failed to load vendor/phaser.min.js.')), { once: true });
    documentRef.head?.appendChild(script);
  });
}

function createHiddenLegacyPanels(documentRef, host) {
  const root = documentRef.createElement('div');
  root.id = 'legacy-dom-panels';
  root.hidden = true;
  host?.appendChild?.(root);
  const panels = { root };
  for (const id of ['context-panel', 'waypoint-panel', 'score-panel', 'event-panel', 'timeline-panel']) {
    const panel = documentRef.createElement('div');
    panel.id = id;
    root.appendChild(panel);
    panels[toCamelId(id)] = panel;
  }
  return panels;
}

function toCamelId(id) {
  return id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
