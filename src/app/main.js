import { createAnchorBrowserRuntime } from './runtime/AnchorBrowserRuntime.js';

const runtime = createAnchorBrowserRuntime({
  elements: {
    root: document.body,
    gameRoot: document.getElementById('game-root'),
    uiRoot: document.getElementById('ui-root'),
    viewportShell: document.getElementById('viewport-shell'),
    consoleRoot: document.getElementById('mission-console'),
    waypointTimelineRoot: document.getElementById('waypoint-timeline'),
    missionSummaryHud: document.getElementById('mission-summary-hud'),
    agentPerformanceHud: document.getElementById('agent-performance-hud'),
    toastRoot: document.getElementById('toast-root')
  }
});

runtime.start();

globalThis.anchorRuntime = runtime;
globalThis.anchorGame = {
  runtime,
  phaser: null,
  get state() {
    return runtime.sessionStore.getState();
  },
  goTo(routeId) {
    return runtime.router.navigate(routeId);
  },
  openLegacyScene(sceneId) {
    return runtime.openLegacyRoute(sceneId);
  }
};
