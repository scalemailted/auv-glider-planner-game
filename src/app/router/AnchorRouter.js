import {
  ANCHOR_ROUTE_CONTRACT_VERSION,
  ANCHOR_ROUTE_IDS,
  createAnchorRoute,
  hashForAnchorRoute,
  routeFromHash,
  validateAnchorRoute
} from './AnchorRouteContract.js';

export const ANCHOR_ROUTER_VERSION = 'anchor-router-mig-r2';

export function createAnchorRouter(options = {}) {
  return new AnchorRouter(options);
}

export class AnchorRouter {
  constructor({ windowRef = globalThis.window, initialRoute = null } = {}) {
    this.windowRef = windowRef ?? null;
    this.currentRoute = initialRoute ? createAnchorRoute(initialRoute.id ?? initialRoute, initialRoute.params ?? {}) : routeFromHash(this.windowRef?.location?.hash ?? '');
    this.listeners = new Set();
    this.started = false;
    this.boundHashChange = () => this.applyRoute(routeFromHash(this.windowRef?.location?.hash ?? ''), { source: 'hashchange', replaceHash: false });
  }

  start() {
    if (this.started) return this.currentRoute;
    this.started = true;
    this.windowRef?.addEventListener?.('hashchange', this.boundHashChange);
    this.applyRoute(routeFromHash(this.windowRef?.location?.hash ?? ''), { source: 'start', replaceHash: false });
    return this.currentRoute;
  }

  stop() {
    if (!this.started) return;
    this.started = false;
    this.windowRef?.removeEventListener?.('hashchange', this.boundHashChange);
  }

  subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    this.listeners.add(listener);
    listener(this.currentRoute, { source: 'subscribe' });
    return () => this.listeners.delete(listener);
  }

  navigate(routeId, params = {}, options = {}) {
    const route = createAnchorRoute(routeId, params);
    return this.applyRoute(route, { source: options.source ?? 'navigate', replaceHash: options.replaceHash !== false });
  }

  openLegacyScene(sceneId, params = {}) {
    return this.navigate(ANCHOR_ROUTE_IDS.legacyPhaser, { ...params, sceneId }, { source: 'legacy' });
  }

  applyRoute(route, options = {}) {
    const validation = validateAnchorRoute(route);
    if (!validation.valid) {
      this.notify(this.currentRoute, { source: options.source ?? 'invalid', errors: validation.errors });
      return this.currentRoute;
    }
    const nextRoute = validation.route;
    const nextHash = hashForAnchorRoute(nextRoute);
    const currentHash = this.windowRef?.location?.hash ?? '';
    this.currentRoute = nextRoute;
    if (options.replaceHash !== false && this.windowRef?.location && currentHash !== nextHash) {
      this.windowRef.location.hash = nextHash;
    }
    this.notify(nextRoute, { source: options.source ?? 'route' });
    return nextRoute;
  }

  notify(route, meta = {}) {
    const event = {
      type: 'anchor.route.event',
      version: ANCHOR_ROUTER_VERSION,
      contractVersion: ANCHOR_ROUTE_CONTRACT_VERSION,
      route,
      summary: {
        id: route.id,
        requiresPhaser: route.requiresPhaser,
        sceneId: route.params?.sceneId ?? null
      },
      meta
    };
    for (const listener of [...this.listeners]) listener(route, event);
  }

  getDebugState() {
    return {
      type: 'anchor.router.debug',
      version: ANCHOR_ROUTER_VERSION,
      currentRoute: this.currentRoute,
      listenerCount: this.listeners.size,
      started: this.started,
      productionRoutesUsePhaser: Object.values(ANCHOR_ROUTE_IDS).filter((id) => id !== ANCHOR_ROUTE_IDS.legacyPhaser).some((id) => createAnchorRoute(id).requiresPhaser)
    };
  }
}
