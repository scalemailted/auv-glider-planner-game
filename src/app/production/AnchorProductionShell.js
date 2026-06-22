export const ANCHOR_PRODUCTION_SHELL_VERSION = 'three-r3a-production-shell';

const ROUTE_BODY_CLASSES = [
  'main-menu-shell', 'hub-mode', 'no-mission-hub', 'setup-route', 'briefing-route',
  'planning-workspace', 'simulation-route', 'surfacing-route', 'debrief-route',
  'replay-route', 'editor-route', 'tool-route', 'benchmark-route', 'legacy-learning-route',
  'next-production-shell'
];

export function createAnchorProductionShell(documentRef = globalThis.document) {
  const regions = {
    body: documentRef.body,
    consoleRoot: documentRef.getElementById('mission-console'),
    centerColumn: documentRef.getElementById('center-column'),
    viewportShell: documentRef.getElementById('viewport-shell'),
    gameRoot: documentRef.getElementById('game-root'),
    uiRoot: documentRef.getElementById('ui-root'),
    rightRoot: documentRef.getElementById('waypoint-timeline'),
    missionSummaryHud: documentRef.getElementById('mission-summary-hud'),
    topHud: documentRef.getElementById('top-hud'),
    leftDrawer: documentRef.getElementById('left-drawer'),
    rightDrawer: documentRef.getElementById('right-drawer'),
    bottomTimeline: documentRef.getElementById('bottom-timeline'),
    agentPerformanceHud: documentRef.getElementById('agent-performance-hud'),
    modalRoot: documentRef.getElementById('modal-root'),
    toastRoot: documentRef.getElementById('toast-root')
  };
  regions.centerColumn?.setAttribute('role', 'main');
  regions.centerColumn?.setAttribute('aria-label', 'ANCHOR production mission workspace');
  regions.consoleRoot?.setAttribute('role', 'complementary');
  regions.consoleRoot?.setAttribute('aria-label', 'Mission Console');
  regions.rightRoot?.setAttribute('role', 'complementary');
  regions.rightRoot?.setAttribute('aria-label', 'Mission Waypoint Timeline');
  regions.bottomTimeline?.setAttribute('role', 'region');
  regions.bottomTimeline?.setAttribute('aria-label', 'Mission timeline and performance');
  regions.gameRoot?.setAttribute('aria-label', 'ANCHOR production route viewport');
  const liveRegion = ensureLiveRegion(documentRef, regions.uiRoot ?? regions.body);
  const shell = {
    type: 'anchor.production.shell',
    version: ANCHOR_PRODUCTION_SHELL_VERSION,
    document: documentRef,
    regions,
    liveRegion,
    activeBodyClasses: [],
    focusTarget: null,
    focusRestoreStatus: 'not-started',
    reducedMotionEnabled: prefersReducedMotion(documentRef),
    applyRouteMetadata,
    announce,
    focusRoute,
    accessibilitySummary
  };
  regions.body?.classList.add('next-production-shell');
  return shell;
}

export function productionShellSummary(shell) {
  return {
    type: 'anchor.production.shell-summary',
    version: ANCHOR_PRODUCTION_SHELL_VERSION,
    activeBodyClasses: [...(shell?.activeBodyClasses ?? [])],
    focusTarget: shell?.focusTarget ?? null,
    focusRestoreStatus: shell?.focusRestoreStatus ?? null,
    reducedMotionEnabled: shell?.reducedMotionEnabled === true,
    regionIds: Object.fromEntries(Object.entries(shell?.regions ?? {}).map(([key, value]) => [key, value?.id ?? null]))
  };
}

function applyRouteMetadata(metadata = {}) {
  const body = this.regions.body;
  if (body?.classList) {
    for (const className of ROUTE_BODY_CLASSES) body.classList.remove(className);
    body.classList.add('next-production-shell');
    for (const className of metadata.bodyClasses ?? []) body.classList.add(className);
  }
  this.regions.gameRoot?.classList?.remove('planning-workspace', 'hub-mode');
  for (const className of metadata.shellClasses ?? []) this.regions.gameRoot?.classList?.add(className);
  this.activeBodyClasses = ['next-production-shell', ...(metadata.bodyClasses ?? [])];
  this.regions.centerColumn?.setAttribute('aria-labelledby', 'next-shell-route-heading');
  return this;
}

function announce(message) {
  if (this.liveRegion) this.liveRegion.textContent = String(message ?? '');
}

function focusRoute(selector = '#next-shell-route-heading') {
  const target = this.document.querySelector(selector) ?? this.document.getElementById('next-shell-route-heading');
  if (!target) {
    this.focusTarget = null;
    this.focusRestoreStatus = 'missing-target';
    return false;
  }
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus?.({ preventScroll: true });
  this.focusTarget = selector;
  this.focusRestoreStatus = this.document.activeElement === target ? 'focused' : 'focus-requested';
  return true;
}

function accessibilitySummary(activeRoute = null) {
  const doc = this.document;
  const labelledCanvases = [...doc.querySelectorAll('canvas')].filter((canvas) => canvas.getAttribute('aria-label') || canvas.getAttribute('aria-labelledby')).length;
  const missingNames = [...doc.querySelectorAll('button, [role="button"], canvas')].filter((node) => !accessibleName(node)).length;
  return {
    version: ANCHOR_PRODUCTION_SHELL_VERSION,
    activeRoute,
    mainLandmarkCount: doc.querySelectorAll('main, [role="main"]').length,
    headingLevelOneCount: doc.querySelectorAll('h1').length,
    currentFocusSelector: this.focusTarget,
    routeFocusStatus: this.focusRestoreStatus,
    labelledCanvasCount: labelledCanvases,
    liveRegionCount: doc.querySelectorAll('[aria-live]').length,
    keyboardReachablePrimaryActionCount: doc.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])').length,
    missingAccessibleNameCount: missingNames.length,
    reducedMotionPreferred: prefersReducedMotion(doc),
    reducedMotionEnabled: this.reducedMotionEnabled === true,
    colorOnlyStatusCount: doc.querySelectorAll('[data-color-only-status="true"]').length,
    failures: []
  };
}

function ensureLiveRegion(documentRef, parent) {
  let region = documentRef.getElementById('next-shell-live-region');
  if (!region) {
    region = documentRef.createElement('div');
    region.id = 'next-shell-live-region';
    region.className = 'sr-only';
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    parent?.appendChild?.(region);
  }
  return region;
}

function prefersReducedMotion(documentRef) {
  return documentRef.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
}

function accessibleName(node) {
  return String(node.getAttribute?.('aria-label') ?? node.getAttribute?.('title') ?? node.textContent ?? '').trim();
}
