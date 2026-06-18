import { createAnchorViewContract, button, createDomElement, panel } from './AnchorViewContract.js';

export const MAIN_MENU_VIEW_VERSION = 'main-menu-view-mig-r2';

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
    shell.clearSidePanels?.();
    const root = createDomElement(documentRef, 'main', 'anchor-dom-main-menu');
    root.id = 'main-menu-hub';
    root.dataset.anchorRuntimeView = 'mainMenu';
    root.dataset.hubView = 'home';

    const hero = panel(documentRef, 'ANCHOR Mission Planner', 'Plan glider missions, run deterministic browser simulation, inspect science sandboxes, and export artifacts for solvers.');
    const modeActions = createDomElement(documentRef, 'div', 'anchor-dom-actions');
    modeActions.append(
      hubButton(documentRef, root, 'Challenge Mode', 'challenge'),
      hubButton(documentRef, root, 'Simulation Lab', 'simulation'),
      hubButton(documentRef, root, 'Learning Labs', 'learning')
    );
    hero.appendChild(modeActions);

    const cards = createDomElement(documentRef, 'div', 'anchor-dom-hub-grid');
    cards.append(
      this.challengeCard(documentRef),
      this.simulationCard(documentRef),
      this.learningCard(documentRef)
    );

    const note = panel(documentRef, 'Runtime Boundary', 'The default mission flow uses DOM routing, Three.js rendering, and the shared simulation engine. Phaser labs load only when a legacy route is selected.');
    root.append(hero, cards, note);
    this.element = root;
    globalThis.ANCHOR_APP_RUNTIME_DEBUG ??= {};
    globalThis.ANCHOR_APP_RUNTIME_DEBUG.mainMenu = this.getDebugState();
    globalThis.ANCHOR_MAIN_MENU_DEBUG = this.getDebugState();
    return root;
  }

  challengeCard(documentRef) {
    const card = panel(documentRef, 'Challenge Mode', 'Start with the tutorial mission path while broader challenge setup migrates from the legacy island.');
    const actions = createDomElement(documentRef, 'div', 'anchor-dom-actions anchor-dom-actions-column');
    actions.append(
      actionButton(documentRef, 'Start Tutorial Mission', 'tutorial_01_first_deployment', () => this.lifecycleController?.loadTutorialMission?.('tutorial_01_first_deployment'), 'anchor-dom-button anchor-dom-button-primary'),
      actionButton(documentRef, 'Mission Setup', 'mission-setup', () => this.lifecycleController?.beginSetup?.({ source: 'menu' }))
    );
    card.appendChild(actions);
    return card;
  }

  simulationCard(documentRef) {
    const card = panel(documentRef, 'Simulation Lab', 'Open legacy science sandboxes through the lazy Phaser island, or run the DOM tutorial mission through the shared simulation engine.');
    const actions = createDomElement(documentRef, 'div', 'anchor-dom-actions anchor-dom-actions-column');
    actions.append(
      actionButton(documentRef, 'Flow Fields Demo', 'flow-demo', () => this.router?.openLegacyScene?.('flowDemo')),
      actionButton(documentRef, 'Sampling Process Lab', 'roi-demo', () => this.router?.openLegacyScene?.('roiDemo')),
      actionButton(documentRef, 'Bathymetric World View', 'bathymetry-world-view', () => this.router?.openLegacyScene?.('bathymetryWorldView')),
      actionButton(documentRef, 'Renderer Architecture Preview', 'renderer-architecture-preview', () => this.router?.openLegacyScene?.('rendererArchitecturePreview')),
      actionButton(documentRef, 'Headless Bundle Viewer', 'headless-bundle-viewer', () => this.router?.openLegacyScene?.('headlessBundleViewer'))
    );
    card.appendChild(actions);
    return card;
  }

  learningCard(documentRef) {
    const card = panel(documentRef, 'Learning Labs', 'Read the static science lessons before using the interactive sandboxes.');
    const links = createDomElement(documentRef, 'div', 'anchor-dom-actions anchor-dom-actions-column');
    links.append(
      linkButton(documentRef, 'Learning Labs Index', 'labs/index.html'),
      linkButton(documentRef, 'Scientific Computational Modeling', 'labs/scientific-computational-modeling.html'),
      linkButton(documentRef, 'Sampling Priority to Glider Action Value', 'labs/sampling-priority-to-glider-action-value.html')
    );
    card.appendChild(links);
    return card;
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
      usesMARL: false
    };
  }
}

function hubButton(documentRef, root, label, view) {
  return actionButton(documentRef, label, `hub-${view}`, () => {
    root.dataset.hubView = view;
  }, 'anchor-dom-button anchor-dom-button-primary');
}

function actionButton(documentRef, label, action, onClick, className = 'anchor-dom-button') {
  const el = button(documentRef, label, onClick, className);
  el.dataset.action = action;
  if (action.startsWith('hub-')) el.dataset.hubView = action.slice('hub-'.length);
  return el;
}

function linkButton(documentRef, label, href) {
  const link = createDomElement(documentRef, 'a', 'anchor-dom-button', label);
  link.href = href;
  return link;
}
