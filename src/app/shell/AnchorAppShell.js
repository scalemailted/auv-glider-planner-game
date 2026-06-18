export const ANCHOR_APP_SHELL_VERSION = 'anchor-app-shell-mig-r2-2';

export const ANCHOR_SHELL_LAYOUTS = Object.freeze({
  productHub: 'productHub',
  setup: 'setup',
  briefing: 'briefing',
  missionWorkspace: 'missionWorkspace',
  simulationWorkspace: 'simulationWorkspace',
  debrief: 'debrief',
  legacyLab: 'legacyLab'
});

const ROUTE_LAYOUT_CLASSES = Object.freeze([
  'anchor-layout-product-hub',
  'anchor-layout-setup',
  'anchor-layout-briefing',
  'anchor-layout-mission-workspace',
  'anchor-layout-simulation-workspace',
  'anchor-layout-debrief',
  'anchor-layout-legacy-lab',
  'main-menu-shell',
  'planning-workspace',
  'simulation-workspace',
  'debrief-fullscreen'
]);

export function createAnchorAppShell(elements = {}) {
  return new AnchorAppShell(elements);
}

export function setAnchorShellLayout(shell, layoutId) {
  return shell?.setLayout?.(layoutId);
}

export class AnchorAppShell {
  constructor(elements = {}) {
    this.elements = normalizeShellElements(elements);
    this.activeView = null;
    this.activeViewId = null;
    this.activeLayoutId = null;
    this.ensureLayout();
  }

  ensureLayout() {
    const root = this.elements.root;
    if (root && !root.id) root.id = 'anchor-app';
    root?.classList?.add?.('anchor-dom-runtime', 'anchor-shell');
    this.elements.consoleRoot?.classList?.add?.('mission-console-host');
    this.elements.centerColumn?.classList?.add?.('mission-main-host');
    this.elements.topHud?.classList?.add?.('mission-status-host');
    this.elements.gameRoot?.classList?.add?.('anchor-dom-viewport', 'mission-viewport-host');
    this.elements.bottomTimeline?.classList?.add?.('mission-timeline-host');
    this.elements.agentPerformanceHud?.classList?.add?.('mission-performance-host');
    this.elements.waypointTimelineRoot?.classList?.add?.('mission-right-panel-host');
    this.elements.modalRoot?.classList?.add?.('mission-modal-host');
    this.elements.toastRoot?.classList?.add?.('mission-toast-host');
    this.clearViewport();
    this.setLayout(ANCHOR_SHELL_LAYOUTS.productHub);
  }

  mountView(viewId, view) {
    this.activeView?.unmount?.();
    this.activeView = view;
    this.activeViewId = viewId;
    this.clearViewport();
    const node = view?.mount?.(this.getMountContext()) ?? view?.element ?? null;
    if (node) this.elements.gameRoot?.appendChild?.(node);
    this.setModeLabel(labelForView(viewId));
    this.publishUiParityDebug();
    return node;
  }

  setLayout(layoutId = ANCHOR_SHELL_LAYOUTS.productHub) {
    const normalized = normalizeLayoutId(layoutId);
    for (const className of ROUTE_LAYOUT_CLASSES) this.elements.root?.classList?.remove?.(className);
    this.activeLayoutId = normalized;
    this.elements.root?.classList?.add?.(`anchor-layout-${kebab(normalized)}`);
    if (normalized === ANCHOR_SHELL_LAYOUTS.productHub) this.elements.root?.classList?.add?.('main-menu-shell');
    if (normalized === ANCHOR_SHELL_LAYOUTS.missionWorkspace) this.elements.root?.classList?.add?.('planning-workspace');
    if (normalized === ANCHOR_SHELL_LAYOUTS.simulationWorkspace) this.elements.root?.classList?.add?.('simulation-workspace');
    this.elements.root?.setAttribute?.('data-anchor-layout', normalized);
    this.publishUiParityDebug();
    return normalized;
  }

  mountRendererHost(className = 'anchor-three-host') {
    const host = this.createElement('div');
    host.className = className;
    host.setAttribute?.('data-anchor-renderer-host', 'three-mission-world');
    this.elements.gameRoot?.appendChild?.(host);
    return host;
  }

  clearViewport() {
    if (this.elements.gameRoot) this.elements.gameRoot.innerHTML = '';
  }

  clearRouteRegions() {
    for (const key of ['consoleRoot', 'waypointTimelineRoot', 'missionSummaryHud', 'agentPerformanceHud', 'topHud', 'bottomTimeline', 'leftDrawer', 'rightDrawer', 'modalRoot']) {
      if (this.elements[key]) this.elements[key].innerHTML = '';
    }
  }

  clearSidePanels() {
    this.clearRouteRegions();
  }

  setConsole(htmlOrNode) {
    setHostContent(this.elements.consoleRoot, htmlOrNode);
  }

  setTimeline(htmlOrNode) {
    setHostContent(this.elements.bottomTimeline ?? this.elements.waypointTimelineRoot, htmlOrNode);
  }

  setRightPanel(htmlOrNode) {
    setHostContent(this.elements.waypointTimelineRoot, htmlOrNode);
  }

  setStatus(htmlOrNode) {
    setHostContent(this.elements.topHud, htmlOrNode);
  }

  setMissionHud(htmlOrNode) {
    setHostContent(this.elements.missionSummaryHud, htmlOrNode);
  }

  setPerformance(htmlOrNode) {
    setHostContent(this.elements.agentPerformanceHud, htmlOrNode);
  }

  toast(message, kind = 'info') {
    if (!this.elements.toastRoot) return;
    const node = this.createElement('div');
    node.className = `toast toast-${kind}`;
    node.textContent = message;
    this.elements.toastRoot.appendChild(node);
    globalThis.setTimeout?.(() => node.remove?.(), 3600);
  }

  setModeLabel(label) {
    this.elements.root?.setAttribute?.('data-anchor-view', this.activeViewId ?? 'none');
    if (this.elements.modeLabel) this.elements.modeLabel.textContent = label;
  }

  createElement(tagName) {
    const documentRef = this.elements.documentRef ?? globalThis.document;
    return documentRef.createElement(tagName);
  }

  getMountContext() {
    return {
      shell: this,
      elements: this.elements,
      documentRef: this.elements.documentRef ?? globalThis.document
    };
  }

  getDebugState() {
    return {
      type: 'anchor.app-shell.debug',
      version: ANCHOR_APP_SHELL_VERSION,
      activeViewId: this.activeViewId,
      activeLayoutId: this.activeLayoutId,
      activeRouteClass: `anchor-layout-${kebab(this.activeLayoutId ?? 'none')}`,
      occupiedRegions: occupiedRegions(this.elements),
      duplicateRegionCount: duplicateCount(this.elements.root, '[id]'),
      overlappingRouteRootCount: countSelector(this.elements.gameRoot, '.anchor-route-root'),
      hasViewport: Boolean(this.elements.gameRoot),
      usesPhaserCanvas: false
    };
  }

  publishUiParityDebug(routeHostSummary = {}) {
    const duplicateDomIdCount = duplicateIdCount(this.elements.root);
    const duplicateTestIdCount = duplicateTestIdCountIn(this.elements.root);
    const activeRouteRootCount = countSelector(this.elements.gameRoot, '.anchor-route-root');
    const activeThreeCanvasCount = countSelector(this.elements.gameRoot, '.three-mission-world-canvas, .anchor-three-planning-host canvas, .anchor-three-simulation-host canvas');
    const activePhaserCanvasCount = countSelector(this.elements.gameRoot, '#game-canvas');
    globalThis.ANCHOR_UI_PARITY_DEBUG = {
      version: ANCHOR_APP_SHELL_VERSION,
      activeRouteId: routeHostSummary.activeRouteId ?? this.activeViewId ?? null,
      activeViewId: routeHostSummary.activeViewId ?? this.activeViewId ?? null,
      activeLayoutId: this.activeLayoutId,
      activeRouteRootCount,
      activeThreeCanvasCount,
      activePhaserCanvasCount,
      missionConsolePresent: hasContent(this.elements.consoleRoot),
      missionViewportPresent: Boolean(this.elements.gameRoot),
      rightPanelPresent: hasContent(this.elements.waypointTimelineRoot),
      timelinePresent: hasContent(this.elements.bottomTimeline),
      performanceBarPresent: hasContent(this.elements.agentPerformanceHud),
      visibleSectionIds: visibleDataValues(this.elements.root, 'sectionId'),
      visibleControlIds: visibleDataValues(this.elements.root, 'testid'),
      missingRequiredSectionIds: [],
      missingRequiredControlIds: [],
      forbiddenVisibleSectionIds: [],
      duplicateDomIdCount,
      duplicateTestIdCount,
      staleRouteNodeCount: Math.max(0, activeRouteRootCount - 1),
      staleSubscriptionCount: 0,
      staleListenerCount: 0,
      contentParityStatus: 'partial',
      layoutParityStatus: activeRouteRootCount <= 1 ? 'pass' : 'fail',
      flowParityStatus: 'partial',
      implementationChanged: true,
      userFacingStructureChanged: false,
      usesThreeMissionEnvironment: true,
      productionUsesPhaserScene: false
    };
  }
}

export function normalizeShellElements(elements = {}) {
  const documentRef = elements.documentRef ?? globalThis.document;
  const root = elements.root ?? documentRef?.body ?? null;
  return {
    documentRef,
    root,
    centerColumn: elements.centerColumn ?? documentRef?.getElementById?.('center-column') ?? null,
    gameRoot: elements.gameRoot ?? documentRef?.getElementById?.('game-root') ?? root,
    uiRoot: elements.uiRoot ?? documentRef?.getElementById?.('ui-root') ?? root,
    viewportShell: elements.viewportShell ?? documentRef?.getElementById?.('viewport-shell') ?? null,
    consoleRoot: elements.consoleRoot ?? documentRef?.getElementById?.('mission-console') ?? null,
    waypointTimelineRoot: elements.waypointTimelineRoot ?? documentRef?.getElementById?.('waypoint-timeline') ?? null,
    missionSummaryHud: elements.missionSummaryHud ?? documentRef?.getElementById?.('mission-summary-hud') ?? null,
    topHud: elements.topHud ?? documentRef?.getElementById?.('top-hud') ?? null,
    leftDrawer: elements.leftDrawer ?? documentRef?.getElementById?.('left-drawer') ?? null,
    rightDrawer: elements.rightDrawer ?? documentRef?.getElementById?.('right-drawer') ?? null,
    bottomTimeline: elements.bottomTimeline ?? documentRef?.getElementById?.('bottom-timeline') ?? null,
    agentPerformanceHud: elements.agentPerformanceHud ?? documentRef?.getElementById?.('agent-performance-hud') ?? null,
    modalRoot: elements.modalRoot ?? documentRef?.getElementById?.('modal-root') ?? null,
    toastRoot: elements.toastRoot ?? documentRef?.getElementById?.('toast-root') ?? null,
    modeLabel: elements.modeLabel ?? documentRef?.getElementById?.('scene-label') ?? null
  };
}

function setHostContent(host, htmlOrNode) {
  if (!host) return;
  host.innerHTML = '';
  if (typeof htmlOrNode === 'string') host.innerHTML = htmlOrNode;
  else if (htmlOrNode) host.appendChild?.(htmlOrNode);
}

function labelForView(viewId) {
  return ({
    mainMenu: 'Main Menu',
    missionSetup: 'Mission Setup',
    missionBriefing: 'Mission Briefing',
    missionPlanning: 'Mission Planning',
    missionSimulation: 'Mission Simulation',
    missionDebrief: 'Mission Debrief',
    importExport: 'Import / Export',
    leaderboard: 'Leaderboard',
    tutorialBrowser: 'Tutorial Browser',
    plannerBenchmark: 'Planner Benchmark',
    adaptiveBenchmark: 'Adaptive Benchmark',
    legacyPhaser: 'Legacy Phaser Lab'
  })[viewId] ?? 'ANCHOR';
}

function normalizeLayoutId(layoutId) {
  return Object.values(ANCHOR_SHELL_LAYOUTS).includes(layoutId) ? layoutId : ANCHOR_SHELL_LAYOUTS.productHub;
}

function kebab(value) {
  return String(value ?? '').replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`).replace(/^-/, '');
}

function occupiedRegions(elements = {}) {
  return Object.entries({
    missionConsole: elements.consoleRoot,
    missionViewport: elements.gameRoot,
    waypointPanel: elements.waypointTimelineRoot,
    status: elements.topHud,
    timeline: elements.bottomTimeline,
    performance: elements.agentPerformanceHud,
    modal: elements.modalRoot
  }).filter(([, element]) => hasContent(element)).map(([key]) => key);
}

function hasContent(element) {
  return Boolean(element && String(element.innerHTML ?? element.textContent ?? '').trim());
}

function countSelector(root, selector) {
  return root?.querySelectorAll?.(selector)?.length ?? 0;
}

function duplicateCount(root, selector) {
  const nodes = [...(root?.querySelectorAll?.(selector) ?? [])];
  const seen = new Set();
  let duplicates = 0;
  for (const node of nodes) {
    const key = node.id ?? node.dataset?.testid ?? '';
    if (!key) continue;
    if (seen.has(key)) duplicates += 1;
    seen.add(key);
  }
  return duplicates;
}

function duplicateIdCount(root) {
  return duplicateCount(root, '[id]');
}

function duplicateTestIdCountIn(root) {
  return duplicateCount(root, '[data-testid]');
}

function visibleDataValues(root, key) {
  return [...(root?.querySelectorAll?.(`[data-${key}]`) ?? [])].map((node) => node.dataset?.[key]).filter(Boolean);
}
