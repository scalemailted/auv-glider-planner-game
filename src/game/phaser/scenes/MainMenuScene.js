import { markAnchorAppBootMilestone, markAnchorRouteReady } from '../../../app/production/AnchorAppBootReadiness.js';
import { downloadJSON, loadJSON, readJSONFile } from '../../../core/io/ImportExport.js';
import { applyTutorialMissionConfig, loadCampaignLevel, CAMPAIGN_LEVELS } from '../../../core/campaign/CampaignLevels.js';
import { ensureLevelIdentity } from '../../../core/identity/GameInstanceId.js';
import { resetPlanResultStore } from '../../../core/evaluation/PlanResultStore.js';
import { beginScenario } from '../../../core/scenario/ScenarioState.js';
import { createDefaultScenarioConfig, generateScenarioFromConfig, regenerateScenarioFromReplayContract } from '../../../core/generation/ScenarioConfig.js';
import { CenterLeaderboardView } from '../../../ui/CenterLeaderboardView.js';
import { CenterTutorialBrowser } from '../../../ui/CenterTutorialBrowser.js';
import { buildChallengeExport } from '../../../core/io/ChallengeExporter.js';
import { buildLeaderboardExport, buildLeaderboardRecordExport } from '../../../core/io/LeaderboardExporter.js';
import { buildResultExport } from '../../../core/io/ResultExporter.js';
import { evaluateExactReplayAvailability } from '../../../core/random/ReplaySeedContract.js';
import { normalizePlan } from '../../../core/planning/WaypointPlan.js';
import { EXPERIENCE_MODES, normalizeExperienceMode } from '../../../core/experience/ExperienceMode.js';
import {
  clearLeaderboard,
  clearLeaderboardRecord,
  deleteLeaderboardAttempt,
  getBestAttempt,
  importLeaderboard,
  loadLeaderboard
} from '../../../core/storage/LeaderboardStore.js';
import { resetMissionShellForMainMenu, publishSceneIsolationDebug } from '../../../ui/MissionShellReset.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};
const MAIN_MENU_VERSION = 'main-menu-hub-ui-r1';

const PRIMARY_CARDS = ['Challenge Mode', 'Simulation Lab', 'Learning Labs', 'Methods & Validation'];
const CHALLENGE_ACTIONS = [
  'Start Guided Challenge',
  'Quick Random Challenge',
  'Play Custom Challenge / Import Challenge JSON',
  'Greedy Planner Race',
  'Challenge Leaderboard'
];
const SIMULATION_LAB_ACTIONS = [
  'Sampling Process Lab',
  'Flow Fields Demo',
  'Coupled Fields Demo',
  'Uncertainty / Forecast Demo',
  'Sampling Priority Demo',
  'Flow-Coupled Sampling Demo',
  'Motion Planning Demo',
  '3D Bathymetric World View',
  'Renderer Architecture Preview',
  'Planner Benchmark',
  'Adaptive Benchmark',
  'Full Autonomy Benchmark',
  'Headless Bundle Viewer',
  'External Solver Evaluation',
  'Import / Export Tools'
];
const LEARNING_LAB_ACTIONS = [
  'Learning Labs Index',
  'Scientific Computational Modeling',
  'CA for Ocean Processes',
  'Sampling Priority to Glider Action Value',
  'Benchmark Modes',
  'Forecast Correction and Hidden Discovery',
  'Headless / Colab Workflow'
];

export class MainMenuScene extends PhaserScene {
  constructor() {
    super('MainMenuScene');
    this.objects = [];
  }

  create() {
    this.app = this.sys.game.anchorApp ?? globalThis.__anchorPhaserApp;
    if (this.app && !this.sys.game.anchorApp) this.sys.game.anchorApp = this.app;
    if (!this.app) return;
    this.events?.once?.('shutdown', () => this.shutdown());
    this.events?.once?.('destroy', () => this.shutdown());
    this.stopMissionScenesForMainMenu();
    this.destroyLeaderboardView();
    this.destroyTutorialBrowser();
    this.app.state.mode = 'mainMenu';
    this.app.clearPanels();
    resetMissionShellForMainMenu(this.app, { reason: 'main-menu-create' });
    this.app.agentPerformanceHud?.setHandlers({});
    this.app.setSceneLabel('Main Menu');
    this.setMainMenuShellState(true);
    this.activeHubView = 'home';
    this.buttons = [];
    markAnchorAppBootMilestone('main-menu-scene-ready', { resolvedRuntimeShell: 'default' });
    this.updateDebugObject(true);
    this.drawIdleViewport();
    this.mountProductHub('home');
    publishSceneIsolationDebug(this.app, { reason: 'main-menu-mounted', activePhaserSceneKeys: ['MainMenuScene'], activeProductionSceneCount: 1 });
    globalThis.requestAnimationFrame?.(() => publishSceneIsolationDebug(this.app, { reason: 'main-menu-mounted-frame', activePhaserSceneKeys: ['MainMenuScene'], activeProductionSceneCount: 1 }));
  }

  stopMissionScenesForMainMenu() {
    const sceneManager = this.scene;
    for (const key of ['MissionWorkspaceScene', 'SimulationScene', 'DebriefScene']) {
      if (key === this.sys?.settings?.key) continue;
      const active = sceneManager?.isActive?.(key) === true;
      const sleeping = sceneManager?.isSleeping?.(key) === true;
      const paused = sceneManager?.isPaused?.(key) === true;
      if (!active && !sleeping && !paused) continue;
      try { sceneManager.stop?.(key); } catch (error) { globalThis.console?.warn?.('Scene stop failed before main menu', key, error); }
    }
  }
  shutdown() {
    this.clearObjects();
    this.unmountProductHub();
    this.setMainMenuShellState(false);
    this.app?.resizeToViewport?.('main-menu-hub-exit');
    this.updateDebugObject(false);
    this.destroyLeaderboardView();
    this.destroyTutorialBrowser();
  }

  handleViewportResize() {
    if (!this.sys?.isActive?.()) return;
    this.drawIdleViewport();
  }

  drawIdleViewport() {
    this.clearObjects();
    const width = Math.max(1, Number(this.scale?.width ?? this.sys?.game?.scale?.width ?? 1280));
    const height = Math.max(1, Number(this.scale?.height ?? this.sys?.game?.scale?.height ?? 820));
    const safeX = Math.max(28, Math.min(76, width * 0.08));
    const safeY = Math.max(28, Math.min(70, height * 0.1));
    const centerX = width / 2;
    const centerY = height / 2;
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x06111f, 0x0b2137, 0x08243a, 0x06111f, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.lineStyle(1, 0x54c7ec, 0.12);
    for (let y = safeY + 52; y < height; y += 58) {
      graphics.beginPath();
      graphics.moveTo(0, y);
      graphics.lineTo(width, y + Math.sin(y * 0.02) * 18);
      graphics.strokePath();
    }
    graphics.fillStyle(0x54c7ec, 0.08);
    graphics.fillCircle(width * 0.76, height * 0.24, Math.min(width, height) * 0.24);
    graphics.fillStyle(0x63e6be, 0.06);
    graphics.fillCircle(width * 0.68, height * 0.72, Math.min(width, height) * 0.32);
    for (let x = safeX; x < width - safeX; x += 80) {
      graphics.lineStyle(1, 0x54c7ec, 0.08);
      graphics.lineBetween(x, safeY, x, height - safeY);
    }
    for (let y = safeY; y < height - safeY; y += 80) {
      graphics.lineStyle(1, 0x54c7ec, 0.08);
      graphics.lineBetween(safeX, y, width - safeX, y);
    }
    const ringRadius = Math.min(width, height) * 0.18;
    graphics.lineStyle(3, 0x63e6be, 0.22);
    graphics.strokeCircle(centerX, centerY + 18, ringRadius);
    graphics.strokeCircle(centerX, centerY + 18, ringRadius * 1.55);
    graphics.lineStyle(2, 0x63e6be, 0.32);
    graphics.lineBetween(centerX, centerY + 18, Math.min(width - safeX, centerX + ringRadius * 1.72), Math.max(safeY, centerY - ringRadius * 0.55));
    graphics.fillStyle(0x54c7ec, 0.18);
    graphics.fillTriangle(centerX - 20, centerY - 22, centerX + 34, centerY + 88, centerX, centerY + 58);
    graphics.lineStyle(2, 0xbef6ff, 0.58);
    graphics.strokeTriangle(centerX - 20, centerY - 22, centerX + 34, centerY + 88, centerX, centerY + 58);
    this.objects.push(graphics);
  }

  addIdleText(x, y, value, style, width) {
    const text = this.add.text(x, y, value, {
      ...style,
      wordWrap: style.wordWrap ?? { width }
    }).setOrigin(0.5, 0);
    this.objects.push(text);
    return text;
  }

  clearObjects() {
    this.objects?.forEach((object) => object.destroy?.());
    this.objects = [];
  }

  renderMainMenu() {
    this.scene.start('MainMenuScene');
  }

  setMainMenuShellState(active) {
    const body = globalThis.document?.body;
    body?.classList.toggle('main-menu-shell', Boolean(active));
    body?.classList.toggle('hub-mode', Boolean(active));
    body?.classList.toggle('no-mission-hub', Boolean(active));
    this.app?.elements?.shell?.classList.toggle('hub-mode', Boolean(active));
  }

  mountProductHub(view = 'home') {
    const root = this.app?.elements?.overlay?.modalRoot;
    if (!root) return;
    this.activeHubView = view;
    root.innerHTML = this.productHubHtml(view);
    root.classList.add('main-menu-hub-host');
    root.onclick = (event) => {
      const actionButton = event.target?.closest?.('[data-action]');
      if (actionButton && root.contains(actionButton)) {
        event.preventDefault();
        this.handleHubAction(actionButton.dataset.action);
        return;
      }
      const viewButton = event.target?.closest?.('[data-hub-view]');
      if (viewButton && root.contains(viewButton) && viewButton.id !== 'main-menu-hub') {
        event.preventDefault();
        this.mountProductHub(viewButton.dataset.hubView);
      }
    };
    this.updateDebugObject(true);
    markAnchorRouteReady('main-menu', { resolvedRuntimeShell: 'default', inputHandlersBound: true });
  }

  unmountProductHub() {
    const root = this.app?.elements?.overlay?.modalRoot;
    if (!root) return;
    root.classList.remove('main-menu-hub-host');
    root.onclick = null;
    root.innerHTML = '';
  }

  leaveMainMenuHub() {
    this.unmountProductHub();
    this.setMainMenuShellState(false);
    this.app?.resizeToViewport?.('main-menu-hub-exit');
    this.updateDebugObject(false);
  }

  productHubHtml(view) {
    return `
      <section id="main-menu-hub" class="main-menu-hub" data-hub-view="${escapeAttr(view)}">
        <header class="main-menu-hero">
          <div>
            <p class="main-menu-kicker">ANCHOR mission systems</p>
            <h1>ANCHOR: Glider Command</h1>
            <p class="main-menu-subtitle">Scientific AUV Glider Adaptive-Sampling Game</p>
          </div>
          <p class="main-menu-runtime-note">ANCHOR Alpha is a deterministic, scientifically constrained research-and-education sandbox for investigating adaptive underwater-glider mission planning. It supports reproducible comparison of human, classical, and learning-based planners. It is not an operational ocean forecast or certified vehicle-navigation system. Plan. Simulate. Compare. Learn.</p>
        </header>
        ${view === 'home' ? this.productHubHomeHtml() : ''}
        ${view === 'challenge' ? this.challengeHubHtml() : ''}
        ${view === 'simulation' ? this.simulationLabHubHtml() : ''}
        ${view === 'learning' ? this.learningLabsHubHtml() : ''}
      </section>
    `;
  }

  productHubHomeHtml() {
    return `
      <div class="main-menu-primary-grid" aria-label="Primary ANCHOR paths">
        ${hubCardHtml({ view: 'challenge', title: 'Challenge Mode', eyebrow: 'Play missions', body: 'Learn objectives, chase scores, compare routes, and race the greedy baseline.' })}
        ${hubCardHtml({ view: 'simulation', title: 'Simulation Lab', eyebrow: 'Inspect systems', body: 'Open scientific sandboxes, benchmark modes, headless bundles, and solver workflows.' })}
        ${hubCardHtml({ view: 'learning', title: 'Learning Labs', eyebrow: 'Read + experiment', body: 'Use interactive articles and companion sandboxes to learn the science step by step.' })}
        ${hubActionCardHtml({ action: 'methods-validation', title: 'Methods & Validation', eyebrow: 'Inspect evidence', body: 'Inspect model assumptions, numerical tests, reference comparisons, provenance, and known limitations.' })}
      </div>
      <div class="main-menu-secondary-row" aria-label="Secondary tools">
        <button type="button" data-action="load-json">Import JSON</button>
        <button type="button" data-action="headless-bundle-viewer">Headless Bundle Viewer</button>
        <button type="button" data-action="methods-validation">Methods & Validation</button>
        <button type="button" data-action="dataset">External Solver Workflow</button>
        <button type="button" data-action="open-about">Development / About</button>
      </div>
    `;
  }

  challengeHubHtml() {
    return `
      ${hubBackHtml()}
      <div class="hub-submenu-header">
        <p class="main-menu-kicker">Challenge Mode</p>
        <h2>Play missions, learn objectives, chase scores, compare routes.</h2>
      </div>
      <div class="hub-action-grid">
        ${hubActionHtml('play-challenge', 'Start Guided Challenge', 'Pick a tactical mission objective and configure a playable challenge.', 'primary')}
        ${hubActionHtml('random-challenge', 'Quick Random Challenge', 'Generate a fresh perfect-knowledge challenge immediately.')}
        ${hubActionHtml('play-custom-challenge', 'Play Custom Challenge / Import Challenge JSON', 'Load a shared or editor-authored challenge package.')}
        ${hubActionHtml('greedy-race', 'Greedy Planner Race', 'Race a generated forecast challenge against the baseline planner.')}
        ${hubActionHtml('tutorial', 'Tutorials', 'Learn deployment, currents, planning, uncertainty, and import/export.')}
        ${hubActionHtml('leaderboard', 'Challenge Leaderboard', 'Review local high-score attempts and saved best paths.')}
      </div>
    `;
  }

  simulationLabHubHtml() {
    return `
      ${hubBackHtml()}
      <div class="hub-submenu-header">
        <p class="main-menu-kicker">Simulation Lab</p>
        <h2>Inspect scientific sandboxes, benchmark modes, headless bundles, and solver workflows.</h2>
      </div>
      <div class="hub-group-grid">
        ${hubGroupHtml('Scientific Sandboxes', [
          hubActionHtml('roi-demo', 'Sampling Process Lab', 'Explore deterministic or seeded sampling processes S(x,y,t).'),
          hubActionHtml('flow-fields', 'Flow Fields Demo', 'Explore current vectors F(x,y,t).'),
          hubActionHtml('coupled-fields', 'Coupled Fields Demo', 'Inspect known process, flow, constraints, and oracle objective.'),
          hubActionHtml('uncertainty-forecast-demo', 'Uncertainty / Forecast Demo', 'Compare truth, forecast, belief, uncertainty, and observations.'),
          hubActionHtml('sampling-priority-demo', 'Sampling Priority Demo', 'Turn belief, uncertainty, boundaries, hazards, and hidden-event suspicion into A_global.'),
          hubActionHtml('flow-coupled-sampling-demo', 'Flow-Coupled Sampling Demo', 'Evaluate Q_glider action value under currents, reachability, energy, and redundancy.'),
          hubActionHtml('motion-planning-demo', 'Motion Planning Demo', 'Compare planned waypoint intent with realized glider motion under currents and control limits.'),
          hubActionHtml('bathymetry-world-view', '3D Bathymetric World View', 'Render 2.5D water-column missions as synthetic bathymetry, transparent depth layers, route intent, and sampling points.'),
          hubActionHtml('renderer-architecture-preview', 'Renderer Architecture Preview', 'Inspect Phaser shell plus future 3D renderer boundary and fallback capabilities.')
        ])}
        ${hubGroupHtml('Benchmark Modes', [
          hubActionHtml('benchmark-planner', 'Planner Benchmark', 'Objective fixed; player or solver chooses the route.', 'primary'),
          hubActionHtml('benchmark-adaptive', 'Adaptive Benchmark', 'Mission manager recommends objectives after observations; player or solver still routes.'),
          hubActionHtml('benchmark-full-autonomy', 'Full Autonomy Benchmark', 'Contract-only future mode where solver/agent chooses objective and route.'),
          hubActionHtml('benchmark-overview', 'Benchmark Overview', 'Open the benchmark mode overview.')
        ])}
        ${hubGroupHtml('Headless / Solver Tools', [
          hubActionHtml('headless-bundle-viewer', 'Headless Bundle Viewer', 'Inspect Node/OceanBox-JS bundle artifacts.'),
          hubActionHtml('dataset', 'External Solver Evaluation', 'Export datasets and solver packets.'),
          hubActionHtml('load-json', 'Import / Export Tools', 'Load challenge, level, result, oracle, and custom JSON packages.'),
          hubActionHtml('editor', 'Mission Editor', 'Build and export custom scenario/challenge packages.')
        ])}
      </div>
    `;
  }

  learningLabsHubHtml() {
    return `
      ${hubBackHtml()}
      <div class="hub-submenu-header">
        <p class="main-menu-kicker">Learning Labs</p>
        <h2>Interactive articles + companion sandboxes.</h2>
      </div>
      <div class="hub-group-grid">
        ${hubGroupHtml('Learning Path', [
          hubLinkHtml('labs/index.html', 'Learning Labs Index', 'ANCHOR course roadmap and syllabus.'),
          hubLinkHtml('labs/scientific-computational-modeling.html', 'Scientific Computational Modeling', 'Rules, equations, observations, and validation.'),
          hubLinkHtml('labs/ca-for-ocean-relevant-processes.html', 'Cellular Automata / Grid Processes', 'CA and grid-process models as honest teaching analogs.'),
          hubLinkHtml('labs/deterministic-spatiotemporal-processes.html', 'CA for Ocean Processes', 'Local rules, emergence, and observable process patterns.'),
          hubLinkHtml('labs/sampling-priority-to-glider-action-value.html', 'Sampling Priority to Glider Action Value', 'Why A_global differs from Q_glider.'),
          hubLinkHtml('labs/planner-mission-evaluation.html', 'Benchmark Modes', 'Route evaluation, fairness labels, and debrief scorecards.')
        ])}
        ${hubGroupHtml('Companion Sandboxes', [
          hubActionHtml('roi-demo', 'Open Sampling Process Lab', 'Launch the process sandbox.'),
          hubActionHtml('flow-fields', 'Open Flow Fields Demo', 'Launch the flow sandbox.'),
          hubActionHtml('uncertainty-forecast-demo', 'Forecast Correction and Hidden Discovery', 'Launch the uncertainty/forecast sandbox.'),
          hubActionHtml('headless-bundle-viewer', 'Headless / Colab Workflow', 'Inspect headless bundle examples.')
        ])}
        ${hubGroupHtml('Roadmap Topics', [
          hubStaticHtml('2.5D Water-Column Sampling', 'Depth-layer sampling is documented as a current/future learning path topic when P11 material is present.')
        ])}
      </div>
    `;
  }

  handleHubAction(action) {
    const scene = this.app?.phaser?.scene;
    const actions = {
      'flow-fields': () => scene.start('FlowFieldDemoScene'),
      'roi-demo': () => scene.start('RoiGeneratorDemoScene'),
      'coupled-fields': () => scene.start('CoupledFieldsDemoScene'),
      'uncertainty-forecast-demo': () => scene.start('UncertaintyForecastDemoScene'),
      'sampling-priority-demo': () => scene.start('SamplingPriorityDemoScene'),
      'flow-coupled-sampling-demo': () => scene.start('FlowCoupledSamplingDemoScene'),
      'motion-planning-demo': () => scene.start('MotionPlanningDemoScene'),
      'bathymetry-world-view': () => scene.start('BathymetryWorldViewScene'),
      'renderer-architecture-preview': () => scene.start('RendererArchitecturePreviewScene'),
      'benchmark-planner': () => scene.start('BenchmarkModeOverviewScene', { benchmarkMode: 'plannerBenchmark' }),
      'benchmark-adaptive': () => scene.start('BenchmarkModeOverviewScene', { benchmarkMode: 'adaptiveBenchmark' }),
      'benchmark-full-autonomy': () => scene.start('BenchmarkModeOverviewScene', { benchmarkMode: 'fullAutonomyBenchmark' }),
      'benchmark-overview': () => scene.start('BenchmarkModeOverviewScene'),
      tutorial: () => this.openTutorialBrowser(),
      'play-challenge': () => this.openChallengeSetup('perfectKnowledge', EXPERIENCE_MODES.challenge),
      'play-custom-challenge': () => scene.start('LoadLevelJsonScene', { preferredExperienceMode: EXPERIENCE_MODES.challenge }),
      'random-challenge': () => this.startRandomChallenge('perfectKnowledge', EXPERIENCE_MODES.challenge),
      'greedy-race': () => this.startRandomChallenge('forecast', EXPERIENCE_MODES.challenge, { greedyRace: true }),
      deterministic: () => this.openChallengeSetup('perfectKnowledge', EXPERIENCE_MODES.simulationLab),
      stochastic: () => this.openChallengeSetup('forecast', EXPERIENCE_MODES.simulationLab),
      editor: () => scene.start('EnvironmentEditorScene'),
      'load-json': () => scene.start('LoadLevelJsonScene'),
      'headless-bundle-viewer': () => scene.start('HeadlessBundleViewerScene'),
      'methods-validation': () => scene.start('MethodsValidationScene'),
      dataset: () => scene.start('DatasetExportScene'),
      leaderboard: () => this.openLeaderboard(),
      'open-about': () => this.mountProductHub('learning')
    };
    const handler = actions[action];
    if (handler) {
      if (action !== 'open-about') this.leaveMainMenuHub();
      handler();
    }
  }

  updateDebugObject(active = true) {
    globalThis.ANCHOR_MAIN_MENU_DEBUG = {
      version: MAIN_MENU_VERSION,
      active: Boolean(active),
      activeHubView: this.activeHubView ?? 'home',
      primaryCards: [...PRIMARY_CARDS],
      challengeActions: [...CHALLENGE_ACTIONS],
      simulationLabActions: [...SIMULATION_LAB_ACTIONS],
      learningLabActions: [...LEARNING_LAB_ACTIONS],
      sidePanelsSuppressed: Boolean(globalThis.document?.body?.classList.contains('main-menu-shell')),
      usesFullViewportHub: true,
      changesSimulationBehavior: false,
      changesScoring: false,
      usesNewPlanner: false,
      usesMARL: false
    };
  }

  openLeaderboard() {
    this.app ??= this.sys.game.anchorApp;
    this.app.state.mode = 'leaderboard';
    this.app.clearPanels();
    this.app.elements.shell?.classList.remove('planning-workspace');
    this.app.setSceneLabel('Leaderboard');
    this.app.summaryHud?.renderIdle?.();
    this.app.agentPerformanceHud?.setHandlers({});
    this.app.agentPerformanceHud?.renderIdle?.();
    this.clearObjects();
    this.drawIdleViewport();
    const view = new CenterLeaderboardView(this.app, {
      handlers: this.leaderboardHandlers()
    });
    this.app.leaderboardView = view;
    view.mount();
    this.renderLeaderboardControls();
  }

  openTutorialBrowser() {
    this.app ??= this.sys.game.anchorApp;
    this.app.state.mode = 'tutorialBrowser';
    this.app.clearPanels();
    this.app.elements.shell?.classList.remove('planning-workspace');
    this.app.setSceneLabel('Tutorial Browser');
    this.app.summaryHud?.renderIdle?.();
    this.app.agentPerformanceHud?.setHandlers({});
    this.app.agentPerformanceHud?.renderIdle?.();
    this.destroyLeaderboardView();
    this.clearObjects();
    this.drawIdleViewport();
    const view = new CenterTutorialBrowser(this.app, {
      handlers: {
        start: (id) => this.startCampaignLevel(id)
      }
    });
    this.app.tutorialBrowser = view;
    view.mount();
    this.renderTutorialControls();
  }

  renderTutorialControls() {
    const view = this.app?.tutorialBrowser;
    this.app.console?.renderTutorialControls(view?.getState?.() ?? {}, {
      search: (search) => {
        view?.setSearch(search);
        this.renderTutorialControls();
      },
      difficulty: (difficulty) => {
        view?.setDifficulty(difficulty);
        this.renderTutorialControls();
      },
      status: (status) => {
        view?.setStatus(status);
        this.renderTutorialControls();
      },
      focus: (focus) => {
        view?.setFocus(focus);
        this.renderTutorialControls();
      },
      start: (id) => this.startCampaignLevel(id),
      menu: () => this.scene.start('MainMenuScene')
    });
  }

  renderLeaderboardControls() {
    const view = this.app?.leaderboardView;
    this.app.console?.renderLeaderboardControls(view?.getState?.() ?? {}, {
      filter: (filter) => {
        view?.setFilter(filter);
        this.renderLeaderboardControls();
      },
      search: (search) => {
        view?.setSearch(search);
      },
      sort: (sort) => {
        view?.setSort(sort);
        this.renderLeaderboardControls();
      },
      import: () => this.importLeaderboardJson(),
      export: () => downloadJSON('anchor.leaderboard.json', buildLeaderboardExport(loadLeaderboard())),
      clearAll: () => this.clearAllLeaderboardData(),
      menu: () => this.scene.start('MainMenuScene')
    });
  }

  leaderboardHandlers() {
    return {
      replayChallenge: (record) => this.loadLeaderboardChallenge(record, {
        withPlan: false,
        showBestPathOverlay: false,
        targetScene: 'MissionWorkspaceScene'
      }),
      showPath: (record) => this.loadLeaderboardChallenge(record, {
        withPlan: false,
        showBestPathOverlay: true,
        targetScene: 'MissionWorkspaceScene'
      }),
      hidePath: (record) => this.loadLeaderboardChallenge(record, {
        withPlan: false,
        showBestPathOverlay: false,
        targetScene: 'MissionWorkspaceScene'
      }),
      rerunPath: (record) => this.rerunLeaderboardPath(record),
      loadPathAsPlan: (record) => this.loadLeaderboardChallenge(record, {
        withPlan: true,
        showBestPathOverlay: false,
        targetScene: 'MissionWorkspaceScene',
        planSource: 'loadedFromLeaderboard',
        planNamePrefix: 'Leaderboard Saved Path'
      }),
      loadChallenge: (record) => this.loadLeaderboardChallenge(record, { withPlan: false }),
      loadBestPlan: (record) => this.loadLeaderboardChallenge(record, { withPlan: true }),
      exportPlan: (record) => this.exportLeaderboardPlan(record),
      exportLevel: (record) => this.exportLeaderboardLevel(record),
      exportResult: (record) => this.exportLeaderboardResult(record),
      exportRecord: (record) => this.exportLeaderboardRecord(record),
      deleteAttempt: (instanceId, attemptId) => this.deleteLeaderboardAttempt(instanceId, attemptId),
      clearRecord: (instanceId) => this.clearLeaderboardMapRecord(instanceId)
    };
  }

  loadLeaderboardChallenge(record, {
    withPlan = false,
    showBestPathOverlay = false,
    targetScene = null,
    planSource = 'loadedFromLeaderboard',
    planNamePrefix = 'Leaderboard Saved Path'
  } = {}) {
    const restored = restoreLeaderboardChallenge(record);
    if (!restored) {
      const replay = evaluateExactReplayAvailability(record);
      this.app.toast?.(replay.reason ?? 'This leaderboard record does not include replayable challenge data.', 'error');
      return;
    }
    const restoredRecord = { ...record, level: restored.level, mission: restored.mission };
    const best = getBestAttempt(loadLeaderboard(), record.instanceId);
    const plan = withPlan ? this.prepareLeaderboardPlan(restoredRecord, best, { planSource, planNamePrefix }) : null;
    if (withPlan && !plan) {
      this.app.toast?.('No saved plan is available for this record.', 'error');
      return;
    }
    beginScenario(this.app.state, {
      level: restored.level,
      mission: restored.mission,
      challengeMode: record.challengeMode ?? record.mode ?? 'perfectKnowledge',
      experienceMode: record.experienceMode ?? EXPERIENCE_MODES.challenge,
      source: restored.source
    });
    resetPlanResultStore(this.app.state);
    this.app.state.ui ??= {};
    this.app.state.ui.showBestPathOverlay = Boolean(showBestPathOverlay);
    if (plan) {
      this.app.state.plan = plan;
      this.app.state.manualPlan = plan;
      this.app.state.currentPlanSource = planSource;
      this.app.state.selectedAgentId = this.app.state.mission?.agents?.[0]?.id ?? null;
      this.app.state.loadedLeaderboardPlan = {
        recordInstanceId: record.instanceId,
        attemptId: best?.attemptId ?? null,
        score: best?.score ?? null
      };
    }
    if (showBestPathOverlay) {
      this.app.toast?.(`Saved path overlay enabled for this challenge (${restored.replayMethod}).`, 'info');
    } else if (plan) {
      this.app.toast?.('Saved leaderboard path loaded as the editable plan.', 'success');
    }
    this.scene.start(targetScene ?? (withPlan ? 'MissionWorkspaceScene' : 'MissionBriefingScene'));
  }

  rerunLeaderboardPath(record) {
    const restored = restoreLeaderboardChallenge(record);
    if (!restored) {
      const replay = evaluateExactReplayAvailability(record);
      this.app.toast?.(replay.reason ?? 'This leaderboard record does not include replayable challenge data.', 'error');
      return;
    }
    const restoredRecord = { ...record, level: restored.level, mission: restored.mission };
    const best = getBestAttempt(loadLeaderboard(), record.instanceId);
    const plan = this.prepareLeaderboardPlan(restoredRecord, best, {
      planSource: 'bestPriorRerun',
      planNamePrefix: 'Leaderboard Saved Path Rerun'
    });
    if (!plan) {
      this.app.toast?.('No saved plan is available to rerun for this record.', 'error');
      return;
    }
    beginScenario(this.app.state, {
      level: restored.level,
      mission: restored.mission,
      challengeMode: record.challengeMode ?? record.mode ?? 'perfectKnowledge',
      experienceMode: record.experienceMode ?? EXPERIENCE_MODES.challenge,
      source: restored.source
    });
    resetPlanResultStore(this.app.state);
    this.app.state.ui ??= {};
    this.app.state.ui.showBestPathOverlay = true;
    this.app.state.plan = plan;
    this.app.state.manualPlan = plan;
    this.app.state.currentPlanSource = 'bestPriorRerun';
    this.app.state.selectedAgentId = this.app.state.mission?.agents?.[0]?.id ?? null;
    this.app.state.bestPriorRerun = {
      attemptId: best?.attemptId ?? null,
      originalScore: best?.score ?? null,
      recordInstanceId: record.instanceId,
      rerunUnderSavedChallenge: true
    };
    this.app.state.pendingWorkspaceAutoExecute = {
      source: 'leaderboardSavedPath',
      attemptId: best?.attemptId ?? null
    };
    this.app.toast?.('Rerunning saved leaderboard path.', 'info');
    this.scene.start('MissionWorkspaceScene');
  }

  prepareLeaderboardPlan(record, best, { planSource, planNamePrefix } = {}) {
    const rawPlan = cloneJson(best?.plan);
    if (!rawPlan) return null;
    try {
      const plan = normalizePlan(rawPlan, record.level, record.mission);
      plan.meta ??= {};
      plan.meta.source = planSource ?? 'loadedFromLeaderboard';
      plan.meta.name = `${planNamePrefix ?? 'Leaderboard Saved Path'} (${formatScore(best?.score)})`;
      plan.meta.originalAttemptId = best?.attemptId ?? null;
      plan.meta.originalScore = best?.score ?? null;
      plan.meta.recordInstanceId = record.instanceId;
      return plan;
    } catch (error) {
      this.app.toast?.(error?.message ?? 'Saved plan could not be loaded.', 'error');
      return null;
    }
  }

  exportLeaderboardPlan(record) {
    const best = getBestAttempt(loadLeaderboard(), record?.instanceId);
    if (!best?.plan) {
      this.app.toast?.('No saved plan is available for export.', 'error');
      return;
    }
    downloadJSON(`anchor_plan_${record.instanceId}.json`, best.plan);
  }

  exportLeaderboardLevel(record) {
    if (!record?.level) {
      this.app.toast?.('No saved level is available for export.', 'error');
      return;
    }
    downloadJSON(`anchor.challenge.${record.instanceId}.json`, buildChallengeExport({
      level: record.level,
      mission: record.mission,
      challengeMode: record.challengeMode ?? record.mode,
      experienceMode: record.experienceMode,
      includeHiddenTruth: false
    }));
  }

  exportLeaderboardResult(record) {
    const best = getBestAttempt(loadLeaderboard(), record?.instanceId);
    if (!best?.result) {
      this.app.toast?.('No saved result is available for export.', 'error');
      return;
    }
    downloadJSON(`anchor.result.${record.instanceId}.json`, buildResultExport({
      level: record.level,
      mission: record.mission,
      plan: best.plan,
      result: best.result,
      experienceMode: record.experienceMode,
      label: best.label ?? 'Leaderboard Best Plan'
    }));
  }

  exportLeaderboardRecord(record) {
    if (!record?.instanceId) return;
    downloadJSON(`anchor.leaderboard-record.${record.instanceId}.json`, buildLeaderboardRecordExport(record));
  }

  deleteLeaderboardAttempt(instanceId, attemptId) {
    deleteLeaderboardAttempt(instanceId, attemptId);
    this.app.leaderboardView?.reload?.();
    this.renderLeaderboardControls();
  }

  clearLeaderboardMapRecord(instanceId) {
    if (!globalThis.confirm?.('Clear all attempts for this saved challenge?')) return;
    clearLeaderboardRecord(instanceId);
    this.app.leaderboardView?.reload?.();
    this.renderLeaderboardControls();
  }

  clearAllLeaderboardData() {
    if (!globalThis.confirm?.('Clear all local leaderboard records? This cannot be undone.')) return;
    clearLeaderboard();
    this.app.leaderboardView?.reload?.();
    this.renderLeaderboardControls();
  }

  importLeaderboardJson() {
    const input = document.getElementById('hidden-file-input');
    if (!input) {
      this.app.toast?.('File input is unavailable.', 'error');
      return;
    }
    input.value = '';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const data = await readJSONFile(file);
        const saved = importLeaderboard(data, { merge: true });
        if (!saved.ok) throw new Error(saved.message ?? 'Import failed');
        this.app.leaderboardView?.reload?.();
        this.renderLeaderboardControls();
        this.app.toast?.('Leaderboard JSON imported.', 'success');
      } catch (error) {
        this.app.toast?.(error?.message ?? 'Failed to import leaderboard JSON.', 'error');
      }
    };
    input.click();
  }

  destroyLeaderboardView() {
    this.app?.leaderboardView?.destroy?.();
    if (this.app) this.app.leaderboardView = null;
  }

  destroyTutorialBrowser() {
    this.app?.tutorialBrowser?.destroy?.();
    if (this.app) this.app.tutorialBrowser = null;
  }

  showCampaignList() {
    this.openTutorialBrowser();
  }

  async startCampaignLevel(id, forcedMode = null) {
    this.app ??= this.sys.game.anchorApp ?? globalThis.__anchorPhaserApp;
    this.leaveMainMenuHub();
    const entry = CAMPAIGN_LEVELS.find((candidate) => candidate.id === id) ?? CAMPAIGN_LEVELS[0];
    const level = ensureLevelIdentity(await loadCampaignLevel(entry));
    const mission = applyTutorialMissionConfig(await loadJSON('missions/tutorial_sampling.json'), entry.id);
    beginScenario(this.app.state, {
      level,
      mission,
      challengeMode: forcedMode ?? level.challengeMode ?? entry.mode ?? 'perfectKnowledge',
      experienceMode: EXPERIENCE_MODES.challenge,
      source: 'tutorial'
    });
    resetPlanResultStore(this.app.state);
    this.scene.start('MissionBriefingScene');
  }

  openChallengeSetup(mode, experienceMode = EXPERIENCE_MODES.simulationLab) {
    this.app ??= this.sys.game.anchorApp ?? globalThis.__anchorPhaserApp;
    this.leaveMainMenuHub();
    const stochastic = mode === 'forecast';
    const normalizedExperience = normalizeExperienceMode(experienceMode);
    this.app.state.experienceMode = normalizedExperience;
    this.app.state.ui.revealTruth = false;
    this.app.state.ui.forecastMemberId = stochastic ? 'ensemble_mean' : null;
    this.app.state.ui.roiViewMode = stochastic ? 'expectedValue' : 'expectedValue';
    this.app.state.pendingScenarioSetup = {
      ...createDefaultScenarioConfig(mode),
      operationalDomainProfileId: normalizedExperience === EXPERIENCE_MODES.challenge ? 'regionalFleetArea' : 'compactTrainingArea'
    };
    this.app.state.level = null;
    this.app.state.mission = null;
    this.app.state.challengeMode = mode;
    this.app.state.currentScenario = {
      levelId: null,
      instanceId: null,
      missionId: null,
      challengeMode: mode,
      experienceMode: normalizedExperience,
      source: normalizedExperience === EXPERIENCE_MODES.simulationLab
        ? (stochastic ? 'stochasticExperiment' : 'deterministicExperiment')
        : (stochastic ? 'stochasticChallenge' : 'deterministicChallenge'),
      briefingSeen: false,
      setupPending: true
    };
    resetPlanResultStore(this.app.state);
    this.scene.start('MissionBriefingScene');
  }

  startRandomChallenge(mode, experienceMode = EXPERIENCE_MODES.challenge, options = {}) {
    this.app ??= this.sys.game.anchorApp ?? globalThis.__anchorPhaserApp;
    this.leaveMainMenuHub();
    const stochastic = mode === 'forecast';
    const normalizedExperience = normalizeExperienceMode(experienceMode);
    const { level, mission } = generateScenarioFromConfig({
      ...createDefaultScenarioConfig(mode),
      operationalDomainProfileId: normalizedExperience === EXPERIENCE_MODES.challenge ? 'regionalFleetArea' : 'compactTrainingArea'
    });
    level.meta ??= {};
    level.meta.experienceMode = normalizedExperience;
    mission.meta ??= {};
    mission.meta.experienceMode = normalizedExperience;
    if (normalizedExperience === EXPERIENCE_MODES.challenge) {
      clearGeneratedDeploymentSelections(mission);
      ensureLegacyDropZoneAliases(level);
      useLegacyDeploymentZoneIds(mission);
    }
    this.app.state.ui.revealTruth = false;
    this.app.state.ui.forecastMemberId = stochastic ? 'ensemble_mean' : null;
    this.app.state.ui.roiViewMode = 'expectedValue';
    this.app.state.pendingGreedyRace = Boolean(options.greedyRace);
    beginScenario(this.app.state, {
      level,
      mission,
      challengeMode: mode,
      experienceMode: normalizedExperience,
      source: options.greedyRace
        ? 'greedyPlannerRace'
        : normalizedExperience === EXPERIENCE_MODES.simulationLab
          ? (stochastic ? 'stochasticExperiment' : 'deterministicExperiment')
          : (stochastic ? 'stochasticChallenge' : 'deterministicChallenge')
    });
    resetPlanResultStore(this.app.state);
    this.scene.start('MissionBriefingScene');
  }

  destroyMenuButtons() {
    this.buttons?.forEach((button) => button.destroy());
    this.buttons = [];
  }
}
function ensureLegacyDropZoneAliases(level = {}) {
  if (!Array.isArray(level.zones)) return;
  const aliases = [
    ['regional_drop_alpha', 'drop_alpha'],
    ['regional_drop_beta', 'drop_beta']
  ];
  const existing = new Set(level.zones.map((zone) => zone.id));
  for (const [sourceId, aliasId] of aliases) {
    if (existing.has(aliasId)) continue;
    const source = level.zones.find((zone) => zone.id === sourceId);
    if (!source) continue;
    level.zones.push({
      ...source,
      id: aliasId,
      label: source.label ?? aliasId,
      compatibilityAliasFor: sourceId
    });
    existing.add(aliasId);
  }
}
function useLegacyDeploymentZoneIds(mission = {}) {
  const aliases = new Map([
    ['regional_drop_alpha', 'drop_alpha'],
    ['regional_drop_beta', 'drop_beta']
  ]);
  for (const agent of mission.agents ?? []) {
    const deployment = agent.deployment;
    if (!deployment) continue;
    if (aliases.has(deployment.zoneId)) deployment.zoneId = aliases.get(deployment.zoneId);
    if (aliases.has(deployment.selectedZoneId)) deployment.selectedZoneId = aliases.get(deployment.selectedZoneId);
    if (Array.isArray(deployment.zoneIds)) {
      deployment.zoneIds = deployment.zoneIds.map((id) => aliases.get(id) ?? id);
    }
  }
}
function clearGeneratedDeploymentSelections(mission = {}) {
  for (const agent of mission.agents ?? []) {
    const mode = agent.deployment?.mode;
    if (mode !== 'chooseFromZone' && mode !== 'chooseFromZones') continue;
    delete agent.start;
    delete agent.selectedStart;
    agent.deployment ??= { mode };
    agent.deployment.selectedStart = null;
    agent.deployment.locked = false;
  }
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}
function hubActionCardHtml({ action, title, eyebrow, body }) {
  return `<button type="button" class="main-menu-card" data-action="${escapeAttr(action)}"><span>${escapeHtml(eyebrow)}</span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(body)}</small></button>`;
}

function hubCardHtml({ view, title, eyebrow, body }) {
  return `
    <button type="button" class="main-menu-card" data-hub-view="${escapeAttr(view)}">
      <span>${escapeHtml(eyebrow)}</span>
      <strong>${escapeHtml(title)}</strong>
      <small>${escapeHtml(body)}</small>
    </button>
  `;
}

function hubActionHtml(action, title, description, tone = '') {
  const classes = ['hub-action-card', tone].filter(Boolean).join(' ');
  return `
    <button type="button" class="${escapeAttr(classes)}" data-action="${escapeAttr(action)}">
      <strong>${escapeHtml(title)}</strong>
      <small>${escapeHtml(description)}</small>
    </button>
  `;
}

function hubLinkHtml(href, title, description) {
  return `
    <a class="hub-action-card" href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">
      <strong>${escapeHtml(title)}</strong>
      <small>${escapeHtml(description)}</small>
    </a>
  `;
}

function hubStaticHtml(title, description) {
  return `
    <div class="hub-action-card disabled" aria-disabled="true">
      <strong>${escapeHtml(title)}</strong>
      <small>${escapeHtml(description)}</small>
    </div>
  `;
}

function hubGroupHtml(title, items = []) {
  return `
    <section class="hub-menu-group">
      <h3>${escapeHtml(title)}</h3>
      <div class="hub-menu-items">${items.join('')}</div>
    </section>
  `;
}

function hubBackHtml() {
  return '<button type="button" class="hub-back-button" data-hub-view="home">Back to Product Hub</button>';
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function restoreLeaderboardChallenge(record) {
  if (record?.level && record?.mission) {
    return {
      level: cloneJson(record.level),
      mission: cloneJson(record.mission),
      source: 'leaderboard',
      replayMethod: 'snapshot'
    };
  }
  const replay = evaluateExactReplayAvailability(record);
  if (!replay.available || replay.method !== 'regeneration') return null;
  const regenerated = regenerateScenarioFromReplayContract(record);
  if (!regenerated?.level || !regenerated?.mission) return null;
  return {
    level: regenerated.level,
    mission: regenerated.mission,
    source: 'leaderboardRegenerated',
    replayMethod: 'regeneration'
  };
}

function formatScore(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(1) : 'N/A';
}
