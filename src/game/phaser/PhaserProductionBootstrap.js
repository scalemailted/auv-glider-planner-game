import { markAnchorAppBootMilestone } from '../../app/production/AnchorAppBootReadiness.js';
import {
  markAnchorRuntimePhaserLoaded,
  markAnchorRuntimePhaserInstantiated
} from '../../app/production/AnchorRuntimeSelector.js';

await ensurePhaserVendorLoaded();
markAnchorAppBootMilestone('phaser-vendor-ready', { phaserAvailable: Boolean(globalThis.Phaser?.Game) });

const [gameModule, consoleModule, waypointModule, summaryModule, performanceModule, tooltipModule] = await Promise.all([
  import('./PhaserGame.js'),
  import('../../ui/MissionConsole.js'),
  import('../../ui/RightWaypointPanel.js'),
  import('../../ui/MissionSummaryHud.js'),
  import('../../ui/AgentPerformanceHud.js'),
  import('../../ui/MapHoverTooltip.js')
]);

const { createPhaserGame } = gameModule;
const { MissionConsole } = consoleModule;
const { RightWaypointPanel } = waypointModule;
const { MissionSummaryHud } = summaryModule;
const { AgentPerformanceHud } = performanceModule;
const { MapHoverTooltip } = tooltipModule;

const gameRoot = document.getElementById('game-root');
const uiRoot = document.getElementById('ui-root');
const viewportShell = document.getElementById('viewport-shell');
const legacyPanels = createHiddenLegacyPanels(uiRoot);

markAnchorAppBootMilestone('app-shell-ready', { resolvedRuntimeShell: 'default' });
const app = createPhaserGame({
  shell: gameRoot,
  gameContainer: gameRoot,
  viewportShell,
  consoleRoot: document.getElementById('mission-console'),
  waypointTimelineRoot: document.getElementById('waypoint-timeline'),
  uiRoot,
  overlay: {
    missionSummaryHud: document.getElementById('mission-summary-hud'),
    topHud: document.getElementById('top-hud'),
    leftDrawer: document.getElementById('left-drawer'),
    rightDrawer: document.getElementById('right-drawer'),
    bottomTimeline: document.getElementById('bottom-timeline'),
    agentPerformanceHud: document.getElementById('agent-performance-hud'),
    modalRoot: document.getElementById('modal-root')
  },
  contextPanel: legacyPanels.contextPanel,
  waypointPanel: legacyPanels.waypointPanel,
  scorePanel: legacyPanels.scorePanel,
  eventPanel: legacyPanels.eventPanel,
  timelinePanel: legacyPanels.timelinePanel,
  legacyPanelRoot: legacyPanels.root,
  toastRoot: document.getElementById('toast-root')
});

window.anchorGame = app;
app.console = new MissionConsole(app, document.getElementById('mission-console'));
app.waypointPanel = new RightWaypointPanel(app, document.getElementById('waypoint-timeline'));
app.summaryHud = new MissionSummaryHud(app, document.getElementById('mission-summary-hud'));
app.agentPerformanceHud = new AgentPerformanceHud(app, document.getElementById('agent-performance-hud'));
app.mapHoverTooltip = new MapHoverTooltip(app);
app.start();
markAnchorRuntimePhaserInstantiated(Boolean(app.phaser));
markAnchorAppBootMilestone('phaser-game-ready', { phaserGameCreated: Boolean(app.phaser), resolvedRuntimeShell: 'default' });
if (!app.phaser) {
  app.console.renderIdle({ mode: 'Main Menu', status: 'Main Menu' });
  app.waypointPanel.renderIdle({ mainMenu: true });
}

async function ensurePhaserVendorLoaded() {
  if (globalThis.Phaser?.Game) {
    markAnchorRuntimePhaserLoaded(true);
    return;
  }
  const existing = document.querySelector('script[data-anchor-phaser-vendor]');
  if (existing) {
    await new Promise((resolve, reject) => {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Phaser vendor script.')), { once: true });
    });
    markAnchorRuntimePhaserLoaded(Boolean(globalThis.Phaser?.Game));
    return;
  }
  const script = document.createElement('script');
  script.src = new URL('../../../vendor/phaser.min.js', import.meta.url).href;
  script.async = false;
  script.dataset.anchorPhaserVendor = 'true';
  await new Promise((resolve, reject) => {
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${script.src}`));
    document.head.appendChild(script);
  });
  markAnchorRuntimePhaserLoaded(Boolean(globalThis.Phaser?.Game));
}

function createHiddenLegacyPanels(uiRoot) {
  const root = document.createElement('div');
  root.id = 'legacy-dom-panels';
  root.hidden = true;
  (uiRoot ?? document.body).appendChild(root);

  const panels = {};
  panels.root = root;
  for (const id of ['context-panel', 'waypoint-panel', 'score-panel', 'event-panel', 'timeline-panel']) {
    const panel = document.createElement('div');
    panel.id = id;
    root.appendChild(panel);
    panels[toCamelId(id)] = panel;
  }
  return panels;
}

function toCamelId(id) {
  return id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
