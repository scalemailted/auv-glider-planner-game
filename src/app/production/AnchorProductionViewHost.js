import { anchorProductionRouteMetadata } from './AnchorProductionRoute.js';

export const ANCHOR_PRODUCTION_VIEW_HOST_VERSION = 'three-r3a-view-host';

export function createAnchorProductionViewHost(shell, options = {}) {
  return {
    type: 'anchor.production.view-host',
    version: ANCHOR_PRODUCTION_VIEW_HOST_VERSION,
    shell,
    activeRoute: null,
    activeView: null,
    listenerDisposers: [],
    mountedViewCount: 0,
    disposedViewCount: 0,
    cleanupDiagnostics: [],
    warnings: [],
    failures: [],
    mountRoute,
    disposeActiveView,
    addListener,
    summary
  };
}

export function productionViewHostSummary(host) {
  return host?.summary?.() ?? inactiveSummary();
}

function mountRoute(routeId, viewFactory, context = {}) {
  const metadata = anchorProductionRouteMetadata(routeId);
  if (!metadata) throw new Error(`Cannot mount unknown route: ${routeId}`);
  this.disposeActiveView(`route-change:${routeId}`);
  clearRouteRegions(this.shell?.regions);
  this.shell?.applyRouteMetadata?.(metadata);
  const before = countRouteArtifacts(this.shell?.document);
  const view = viewFactory({
    route: routeId,
    metadata,
    shell: this.shell,
    regions: this.shell.regions,
    host: this,
    addListener: (target, type, listener, options) => this.addListener(target, type, listener, options),
    ...context
  });
  this.activeRoute = routeId;
  this.activeView = view;
  this.mountedViewCount += 1;
  this.shell?.announce?.(`${metadata.label} opened.`);
  this.shell?.focusRoute?.(metadata.defaultFocusSelector);
  const after = countRouteArtifacts(this.shell?.document);
  this.cleanupDiagnostics.push({ route: routeId, before, after });
  return view;
}

function disposeActiveView(reason = 'dispose') {
  for (const dispose of this.listenerDisposers.splice(0)) {
    try { dispose(); } catch (error) { this.failures.push(String(error?.message ?? error)); }
  }
  if (this.activeView?.dispose) {
    try { this.activeView.dispose(reason); } catch (error) { this.failures.push(String(error?.message ?? error)); }
    this.disposedViewCount += 1;
  }
  this.activeView = null;
}

function addListener(target, type, listener, options) {
  if (!target?.addEventListener || typeof listener !== 'function') return () => {};
  target.addEventListener(type, listener, options);
  const dispose = () => target.removeEventListener?.(type, listener, options);
  this.listenerDisposers.push(dispose);
  return dispose;
}

function summary() {
  const doc = this.shell?.document;
  return {
    type: 'anchor.production.view-host-summary',
    version: ANCHOR_PRODUCTION_VIEW_HOST_VERSION,
    activeRoute: this.activeRoute,
    mountedViewCount: this.activeView ? 1 : 0,
    totalMountedViewCount: this.mountedViewCount,
    disposedViewCount: this.disposedViewCount,
    activeListenerCount: this.listenerDisposers.length,
    activeOverlayCount: countVisible(this.shell?.regions?.uiRoot?.children),
    staleRouteRootCount: Math.max(0, (doc?.querySelectorAll?.('[data-next-shell-route-root]')?.length ?? 0) - (this.activeView ? 1 : 0)),
    staleCanvasCount: doc?.querySelectorAll?.('canvas[data-next-shell-stale="true"]')?.length ?? 0,
    activeCanvasCount: doc?.querySelectorAll?.('canvas')?.length ?? 0,
    cleanupDiagnostics: this.cleanupDiagnostics.at(-1) ?? null,
    warnings: [...this.warnings],
    failures: [...this.failures]
  };
}

function clearRouteRegions(regions = {}) {
  for (const key of ['consoleRoot', 'rightRoot', 'gameRoot', 'missionSummaryHud', 'topHud', 'leftDrawer', 'rightDrawer', 'bottomTimeline', 'agentPerformanceHud', 'modalRoot']) {
    const node = regions[key];
    if (node) node.innerHTML = '';
  }
}

function countRouteArtifacts(documentRef) {
  return {
    routeRoots: documentRef?.querySelectorAll?.('[data-next-shell-route-root]')?.length ?? 0,
    canvases: documentRef?.querySelectorAll?.('canvas')?.length ?? 0,
    overlays: documentRef?.querySelectorAll?.('#ui-root .overlay-panel:not(:empty), #modal-root:not(:empty)')?.length ?? 0
  };
}

function countVisible(children = []) {
  return [...children].filter((child) => child && child.innerHTML && !child.hidden).length;
}

function inactiveSummary() {
  return {
    type: 'anchor.production.view-host-summary',
    version: ANCHOR_PRODUCTION_VIEW_HOST_VERSION,
    activeRoute: null,
    mountedViewCount: 0,
    totalMountedViewCount: 0,
    disposedViewCount: 0,
    activeListenerCount: 0,
    activeOverlayCount: 0,
    staleRouteRootCount: 0,
    staleCanvasCount: 0,
    activeCanvasCount: 0,
    warnings: [],
    failures: []
  };
}
