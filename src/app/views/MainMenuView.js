import { createAnchorViewContract, button, createDomElement, panel } from './AnchorViewContract.js';

export const MAIN_MENU_VIEW_VERSION = 'main-menu-view-mig-r2-2';

export function createMainMenuView(context = {}) {
  return new MainMenuView(context);
}

export class MainMenuView {
  constructor({ lifecycleController, router } = {}) {
    this.lifecycleController = lifecycleController;
    this.router = router;
    this.contract = createAnchorViewContract('mainMenu');
    this.element = null;
  }

  mount({ documentRef, shell }) {
    shell.clearRouteRegions?.();
    const root = createDomElement(documentRef, 'main', 'anchor-dom-main-menu main-menu-hub main-menu-hub-host');
    root.id = 'main-menu-hub';
    root.dataset.testid = 'main-menu';
    root.dataset.anchorRuntimeView = 'mainMenu';
    root.dataset.hubView = 'home';

    const heroText = createDomElement(documentRef, 'div', '');
    heroText.append(createDomElement(documentRef, 'p', 'main-menu-kicker', 'ANCHOR'), createDomElement(documentRef, 'h1', '', 'ANCHOR Mission Planner'), createDomElement(documentRef, 'p', 'main-menu-subtitle', 'Plan glider missions, run deterministic browser simulation, inspect science sandboxes, and export artifacts for solvers.'));
    const heroNote = createDomElement(documentRef, 'p', 'main-menu-runtime-note', 'DOM lifecycle, Three.js mission environment, shared simulation engine. Legacy labs load only on demand.');
    const hero = createDomElement(documentRef, 'section', 'main-menu-hero');
    hero.append(heroText, heroNote);
    const modeActions = createDomElement(documentRef, 'div', 'anchor-dom-actions main-menu-secondary-row');
    modeActions.append(
      hubButton(documentRef, root, 'Challenge Mode', 'challenge'),
      hubButton(documentRef, root, 'Simulation Lab', 'simulation'),
      hubButton(documentRef, root, 'Learning Labs', 'learning')
    );
    hero.appendChild(modeActions);

    const cards = createDomElement(documentRef, 'div', 'anchor-dom-hub-grid main-menu-primary-grid');
    cards.append(
      this.challengeCard(documentRef),
      this.simulationCard(documentRef),
      this.learningCard(documentRef)
    );

    const note = panel(documentRef, 'Runtime Boundary', 'The default mission flow uses DOM routing, Three.js rendering, and the shared simulation engine. Phaser labs load only when a legacy route is selected.');
    note.classList?.add?.('main-menu-runtime-note');
    root.append(hero, cards, note);
    this.element = root;
    globalThis.ANCHOR_APP_RUNTIME_DEBUG ??= {};
    globalThis.ANCHOR_APP_RUNTIME_DEBUG.mainMenu = this.getDebugState();
    globalThis.ANCHOR_MAIN_MENU_DEBUG = this.getDebugState();
    return root;
  }

  challengeCard(documentRef) {
    const card = panel(documentRef, 'Challenge Mode', 'Start deterministic or stochastic challenge missions through the DOM lifecycle.');
    card.dataset.testid = 'challenge-mode-card';
    card.classList?.add?.('main-menu-card');
    const actions = createDomElement(documentRef, 'div', 'anchor-dom-actions anchor-dom-actions-column');
    actions.append(
      actionButton(documentRef, 'Mission Setup', 'mission-setup', () => this.lifecycleController?.beginSetup?.({ source: 'menu' }), 'anchor-dom-button anchor-dom-button-primary', 'open-mission-setup'),
      actionButton(documentRef, 'Deterministic Tutorial', 'deterministic-challenge', () => this.startMission('tutorial_01_first_deployment', { source: 'challenge', missionMode: 'challenge', challengeMode: 'perfectKnowledge', visibilityMode: 'public', seed: '101' }), 'anchor-dom-button', 'start-deterministic-challenge'),
      actionButton(documentRef, 'Stochastic Tutorial', 'stochastic-challenge', () => this.startMission('tutorial_11_stochastic_forecast', { source: 'challenge', missionMode: 'challenge', challengeMode: 'forecastUncertainty', visibilityMode: 'public', seed: '202' }), 'anchor-dom-button', 'start-stochastic-challenge'),
      actionButton(documentRef, 'Import JSON', 'import-json', () => this.router?.navigate?.('importExport'), 'anchor-dom-button', 'open-import'),
      actionButton(documentRef, 'Leaderboard', 'leaderboard', () => this.router?.navigate?.('leaderboard'), 'anchor-dom-button', 'open-leaderboard')
    );
    card.appendChild(actions);
    return card;
  }

  simulationCard(documentRef) {
    const card = panel(documentRef, 'Simulation Lab', 'Run DOM benchmark entries or open legacy science sandboxes through the lazy Phaser island.');
    card.dataset.testid = 'simulation-lab-card';
    card.classList?.add?.('main-menu-card');
    const actions = createDomElement(documentRef, 'div', 'anchor-dom-actions anchor-dom-actions-column');
    actions.append(
      actionButton(documentRef, 'Planner Benchmark', 'planner-benchmark', () => this.startMission('tutorial_01_first_deployment', { source: 'plannerBenchmark', missionMode: 'plannerBenchmark', benchmarkMode: 'plannerBenchmark', experienceMode: 'benchmark', visibilityMode: 'public', seed: '301' }), 'anchor-dom-button anchor-dom-button-primary', 'open-planner-benchmark'),
      actionButton(documentRef, 'Adaptive Benchmark', 'adaptive-benchmark', () => this.startMission('tutorial_11_stochastic_forecast', { source: 'adaptiveBenchmark', missionMode: 'adaptiveBenchmark', benchmarkMode: 'adaptiveBenchmark', experienceMode: 'benchmark', visibilityMode: 'public', seed: '401' }), 'anchor-dom-button', 'open-adaptive-benchmark'),
      actionButton(documentRef, 'Headless Bundle Viewer', 'headless-bundle-viewer', () => this.router?.openLegacyScene?.('headlessBundleViewer'), 'anchor-dom-button', 'open-headless-bundle-viewer'),
      actionButton(documentRef, 'Flow Fields Demo', 'flow-demo', () => this.router?.openLegacyScene?.('flowDemo'), 'anchor-dom-button', 'open-flow-demo'),
      actionButton(documentRef, 'Sampling Process Lab', 'roi-demo', () => this.router?.openLegacyScene?.('roiDemo'), 'anchor-dom-button', 'open-roi-demo'),
      actionButton(documentRef, 'Bathymetric World View', 'bathymetry-world-view', () => this.router?.openLegacyScene?.('bathymetryWorldView'), 'anchor-dom-button', 'open-bathymetry-world-view'),
      actionButton(documentRef, 'Renderer Architecture Preview', 'renderer-architecture-preview', () => this.router?.openLegacyScene?.('rendererArchitecturePreview'), 'anchor-dom-button', 'open-renderer-architecture-preview')
    );
    card.appendChild(actions);
    return card;
  }

  learningCard(documentRef) {
    const card = panel(documentRef, 'Learning Labs', 'Read static science lessons or launch tutorial missions through the DOM lifecycle.');
    card.dataset.testid = 'learning-labs-card';
    card.classList?.add?.('main-menu-card');
    const links = createDomElement(documentRef, 'div', 'anchor-dom-actions anchor-dom-actions-column');
    links.append(
      actionButton(documentRef, 'Tutorial Browser', 'tutorial-browser', () => this.router?.navigate?.('tutorialBrowser'), 'anchor-dom-button anchor-dom-button-primary', 'open-tutorial-browser'),
      linkButton(documentRef, 'Learning Labs Index', 'labs/index.html'),
      linkButton(documentRef, 'Scientific Computational Modeling', 'labs/scientific-computational-modeling.html'),
      linkButton(documentRef, 'Cellular Automata / Grid Processes', 'labs/ca-for-ocean-relevant-processes.html'),
      linkButton(documentRef, 'CA for Ocean Processes', 'labs/deterministic-spatiotemporal-processes.html'),
      linkButton(documentRef, 'Sampling Priority to Glider Action Value', 'labs/sampling-priority-to-glider-action-value.html'),
      linkButton(documentRef, 'Benchmark Modes', 'labs/planner-mission-evaluation.html')
    );
    card.appendChild(links);
    return card;
  }

  startMission(tutorialId, options = {}) {
    return this.lifecycleController?.loadTutorialMission?.(tutorialId, options);
  }

  unmount() {
    this.element?.remove?.();
    this.element = null;
  }

  getDebugState() {
    return {
      type: 'anchor.view.main-menu.debug',
      version: MAIN_MENU_VIEW_VERSION,
      contract: this.contract,
      usesFullViewportHub: true,
      changesSimulationBehavior: false,
      changesScoring: false,
      usesNewPlanner: false,
      usesMARL: false,
      productionE2EUsesDomRuntime: true
    };
  }
}

function hubButton(documentRef, root, label, view) {
  return actionButton(documentRef, label, `hub-${view}`, () => {
    root.dataset.hubView = view;
  }, 'anchor-dom-button anchor-dom-button-primary', `${view}-mode-tab`);
}

function actionButton(documentRef, label, action, onClick, className = 'anchor-dom-button', testId = '') {
  const el = button(documentRef, label, onClick, className);
  el.dataset.action = action;
  if (testId) el.dataset.testid = testId;
  if (action.startsWith('hub-')) el.dataset.hubView = action.slice('hub-'.length);
  return el;
}

function linkButton(documentRef, label, href) {
  const link = createDomElement(documentRef, 'a', 'anchor-dom-button', label);
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}



