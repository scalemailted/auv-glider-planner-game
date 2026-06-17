import { createPhaserGame } from './phaser/PhaserGame.js';
import { MissionConsole } from '../ui/MissionConsole.js';
import { RightWaypointPanel } from '../ui/RightWaypointPanel.js';
import { MissionSummaryHud } from '../ui/MissionSummaryHud.js';
import { AgentPerformanceHud } from '../ui/AgentPerformanceHud.js';
import { MapHoverTooltip } from '../ui/MapHoverTooltip.js';

const gameRoot = document.getElementById('game-root');
const uiRoot = document.getElementById('ui-root');
const viewportShell = document.getElementById('viewport-shell');
const legacyPanels = createHiddenLegacyPanels();

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
if (!app.phaser) {
  app.console.renderIdle({ mode: 'Main Menu', status: 'Main Menu' });
  app.waypointPanel.renderIdle({ mainMenu: true });
}

function createHiddenLegacyPanels() {
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

