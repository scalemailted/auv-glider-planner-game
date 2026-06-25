import { markAnchorAppBootMilestone, markAnchorRouteReady } from './AnchorAppBootReadiness.js';
import { anchorProductionLifecycleSummary, createAnchorProductionLifecycle, dispatchAnchorLifecycleCommand } from './AnchorProductionLifecycle.js';
import { createAnchorProductionSessionStore } from './AnchorProductionSessionStore.js';
import { createAnchorProductionShell, productionShellSummary } from './AnchorProductionShell.js';
import { createAnchorProductionViewHost } from './AnchorProductionViewHost.js';
import { createAnchorProductionRouteView } from './views/RouteViewFactory.js';

export const ANCHOR_PRODUCTION_BOOTSTRAP_VERSION = 'three-r3a-production-bootstrap';

const sessionStore = createAnchorProductionSessionStore();
const shell = createAnchorProductionShell(document);
const lifecycle = createAnchorProductionLifecycle({ sessionStore });
const viewHost = createAnchorProductionViewHost(shell);
markAnchorAppBootMilestone('app-shell-ready', { resolvedRuntimeShell: 'next' });

const app = {
  type: 'anchor.production.next-shell-app',
  version: ANCHOR_PRODUCTION_BOOTSTRAP_VERSION,
  runtimeShell: 'next',
  state: sessionStore.state.gameState,
  sessionStore,
  lifecycle,
  viewHost,
  shell,
  dispatch,
  goTo(routeOrCommand) { return dispatch(routeToCommand(routeOrCommand)); },
  dispose() { viewHost.disposeActiveView?.('app-dispose'); publishProductionDebug('app-dispose'); }
};

globalThis.anchorGame = app;
globalThis.__anchorNextShellApp = app;
globalThis.ANCHOR_LIFECYCLE_PARITY_DEBUG = { phaserRoute: null, nextRoute: lifecycle.activeRoute, routeMatches: null, sessionDigestMatches: null, transitionMatches: null, mismatchCount: 0, mismatches: [] };

render('bootstrap');

export function dispatch(command) {
  const result = dispatchAnchorLifecycleCommand(lifecycle, command);
  if (result.accepted) render(result.command);
  else publishProductionDebug(`rejected:${result.command}`);
  return result;
}

function render(reason = 'render') {
  viewHost.mountRoute(lifecycle.activeRoute, createAnchorProductionRouteView, {
    lifecycle,
    sessionStore,
    dispatch,
    rerender: () => render('rerender'),
    publishDebug: publishProductionDebug
  });
  publishProductionDebug(reason);
  if (lifecycle.activeRoute === 'productHub') {
    markAnchorRouteReady('main-menu', { resolvedRuntimeShell: 'next', inputHandlersBound: true });
  }
}

function publishProductionDebug(reason = 'update') {
  const hostSummary = viewHost.summary();
  const routeSummary = viewHost.activeView?.debugSummary?.() ?? null;
  const sessionSummary = sessionStore.summary();
  const legacyDebug = globalThis.ANCHOR_LEGACY_ISLAND_DEBUG ?? {};
  const activeLegacy = legacyDebug.active === true ? 1 : 0;
  const debug = {
    version: ANCHOR_PRODUCTION_BOOTSTRAP_VERSION,
    requestedRuntime: globalThis.ANCHOR_RUNTIME_SELECTION_DEBUG?.requestedRuntime ?? null,
    resolvedRuntime: 'next',
    activeRoute: lifecycle.activeRoute,
    previousRoute: lifecycle.previousRoute,
    mountedViewCount: hostSummary.mountedViewCount,
    disposedViewCount: hostSummary.disposedViewCount,
    activeListenerCount: hostSummary.activeListenerCount,
    activeOverlayCount: hostSummary.activeOverlayCount,
    activeThreeRendererCount: routeSummary?.activeThreeRendererCount ?? 0,
    activeThreeRafCount: routeSummary?.activeThreeRafCount ?? 0,
    activePhaserGameCount: activeLegacy,
    activeLegacyIslandCount: activeLegacy,
    missionId: sessionSummary.missionId,
    scenarioId: sessionSummary.scenarioId,
    planDigest: sessionSummary.planDigest,
    resultDigest: sessionSummary.resultDigest,
    replayDigest: sessionSummary.replayDigest,
    editorDocumentDigest: sessionSummary.editorDocumentDigest,
    routeTransitionCount: lifecycle.routeTransitionCount,
    invalidTransitionCount: lifecycle.invalidTransitionCount,
    focusTarget: shell.focusTarget,
    focusRestoreStatus: shell.focusRestoreStatus,
    staleRouteRootCount: hostSummary.staleRouteRootCount,
    staleCanvasCount: hostSummary.staleCanvasCount,
    usesFrameworkNeutralLifecycle: true,
    usesCanonicalPlanning: true,
    usesCanonicalSimulation: true,
    usesCanonicalReplayReducer: true,
    usesCanonicalEditorSession: true,
    changesOfficialScoring: false,
    usesNewPlanner: false,
    warnings: [...(lifecycle.warnings ?? []), ...(viewHost.warnings ?? [])],
    failures: [...(lifecycle.failures ?? []), ...(viewHost.failures ?? [])],
    reason,
    shell: productionShellSummary(shell),
    lifecycle: anchorProductionLifecycleSummary(lifecycle),
    routeView: routeSummary
  };
  globalThis.ANCHOR_PRODUCTION_SHELL_DEBUG = debug;
  globalThis.ANCHOR_ACCESSIBILITY_DEBUG = shell.accessibilitySummary(lifecycle.activeRoute);
  globalThis.ANCHOR_LIFECYCLE_PARITY_DEBUG.nextRoute = lifecycle.activeRoute;
  globalThis.ANCHOR_LIFECYCLE_PARITY_DEBUG.transitionMatches = lifecycle.invalidTransitionCount === 0;
  return debug;
}

function routeToCommand(routeOrCommand) {
  const value = String(routeOrCommand ?? '');
  return {
    productHub: 'returnToMainMenu', missionSetup: 'openMissionSetup', missionBriefing: 'openBriefing', missionPlanning: 'startPlanning', missionSimulation: 'executeMission', missionDebrief: 'openDebrief', missionReplayReview: 'openReplayReview', missionEditor: 'openEditor', importExport: 'openImportExport', leaderboard: 'openLeaderboard', headlessBundleViewer: 'openHeadlessViewer', methodsValidation: 'openMethodsValidation', tutorialBrowser: 'openTutorialBrowser', plannerBenchmark: 'openPlannerBenchmark', adaptiveBenchmark: 'openAdaptiveBenchmark', legacyLearningLab: 'openLegacyLearningLab'
  }[value] ?? value;
}
