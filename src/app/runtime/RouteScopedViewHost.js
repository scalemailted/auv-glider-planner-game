export const ROUTE_SCOPED_VIEW_HOST_VERSION = 'route-scoped-view-host-mig-r2-2';

export function createRouteScopedViewHost(shell, options = {}) {
  return {
    type: 'anchor.route-scoped-view-host',
    version: ROUTE_SCOPED_VIEW_HOST_VERSION,
    shell,
    options,
    activeView: null,
    activeRoot: null,
    activeRouteId: null,
    activeViewId: null,
    mountCount: 0,
    unmountCount: 0,
    abortController: null
  };
}

export function mountRouteScopedView(host, view, context = {}) {
  if (!host?.shell) throw new Error('RouteScopedViewHost requires a shell.');
  unmountRouteScopedView(host);
  host.abortController = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const routeId = context.routeId ?? view?.contract?.id ?? 'unknown';
  const viewId = view?.contract?.id ?? routeId;
  const mountContext = {
    ...host.shell.getMountContext?.(),
    ...context,
    routeId,
    viewId,
    signal: host.abortController?.signal ?? null
  };
  const node = view?.mount?.(mountContext) ?? view?.element ?? null;
  if (!node) throw new Error(`Route ${routeId} did not return a route root node.`);
  node.dataset.routeId = routeId;
  node.dataset.viewId = viewId;
  node.classList?.add?.('anchor-route-root', routeClassForRoute(routeId));
  const existingRoots = host.shell.elements.gameRoot?.querySelectorAll?.('.anchor-route-root') ?? [];
  for (const root of existingRoots) root.remove?.();
  host.shell.elements.gameRoot?.appendChild?.(node);
  host.activeView = view;
  host.activeRoot = node;
  host.activeRouteId = routeId;
  host.activeViewId = viewId;
  host.mountCount += 1;
  host.shell.activeView = view;
  host.shell.activeViewId = routeId;
  assertRouteIsolation(host);
  host.shell.publishUiParityDebug?.(routeScopedViewHostSummary(host));
  return node;
}

export function updateRouteScopedView(host, context = {}) {
  host?.activeView?.update?.(context);
  host?.shell?.publishUiParityDebug?.(routeScopedViewHostSummary(host));
}

export function unmountRouteScopedView(host) {
  if (!host) return;
  host.abortController?.abort?.();
  host.activeView?.unmount?.();
  host.activeRoot?.remove?.();
  host.activeView = null;
  host.activeRoot = null;
  host.activeRouteId = null;
  host.activeViewId = null;
  host.abortController = null;
  host.unmountCount += 1;
  host.shell?.clearRouteRegions?.();
  host.shell?.publishUiParityDebug?.(routeScopedViewHostSummary(host));
}

export function disposeRouteScopedViewHost(host) {
  unmountRouteScopedView(host);
  if (host) host.shell = null;
}

export function routeScopedViewHostSummary(host) {
  const root = host?.shell?.elements?.root ?? globalThis.document;
  const routeRoots = [...(root?.querySelectorAll?.('.anchor-route-root') ?? [])];
  const threeCanvases = [...(root?.querySelectorAll?.('.three-mission-world-canvas, .anchor-three-planning-host canvas, .anchor-three-simulation-host canvas') ?? [])];
  return {
    type: 'anchor.route-scoped-view-host.summary',
    version: ROUTE_SCOPED_VIEW_HOST_VERSION,
    activeRouteId: host?.activeRouteId ?? null,
    activeViewId: host?.activeViewId ?? null,
    activeRouteRootCount: routeRoots.length,
    activeThreeCanvasCount: threeCanvases.length,
    mountCount: host?.mountCount ?? 0,
    unmountCount: host?.unmountCount ?? 0
  };
}

export function routeClassForRoute(routeId) {
  return `anchor-route-${String(routeId ?? 'unknown').replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`).replace(/^-/, '')}`;
}

function assertRouteIsolation(host) {
  const roots = host?.shell?.elements?.gameRoot?.querySelectorAll?.('.anchor-route-root') ?? [];
  if (roots.length > 1) throw new Error(`Route isolation failed: ${roots.length} production route roots are mounted.`);
}
