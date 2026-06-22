import { anchorProductionRouteMetadata, normalizeAnchorProductionRoute } from './AnchorProductionRoute.js';
import { anchorProductionSessionSummary } from './AnchorProductionSessionStore.js';

export const ANCHOR_PRODUCTION_LIFECYCLE_VERSION = 'three-r3a-lifecycle';

const COMMANDS = Object.freeze({
  openProductHub: { route: 'productHub', from: '*' },
  openMissionSetup: { route: 'missionSetup', from: ['productHub', 'missionPlanning', 'missionBriefing'] },
  loadMission: { route: 'missionBriefing', from: ['missionSetup', 'productHub'] },
  openBriefing: { route: 'missionBriefing', from: ['missionSetup', 'missionPlanning'] },
  startPlanning: { route: 'missionPlanning', from: ['missionBriefing', 'missionSetup', 'missionEditor'] },
  executeMission: { route: 'missionSimulation', from: ['missionPlanning', 'surfacingDecision'] },
  pauseSimulation: { route: 'missionSimulation', from: ['missionSimulation'] },
  surfaceMission: { route: 'surfacingDecision', from: ['missionSimulation'] },
  continueMission: { route: 'missionSimulation', from: ['surfacingDecision'] },
  replanMission: { route: 'missionPlanning', from: ['surfacingDecision', 'missionSimulation'] },
  finishMission: { route: 'missionDebrief', from: ['missionSimulation', 'surfacingDecision'] },
  openDebrief: { route: 'missionDebrief', from: ['missionSimulation', 'missionReplayReview', 'productHub'] },
  openReplayReview: { route: 'missionReplayReview', from: ['missionDebrief', 'headlessBundleViewer'] },
  returnFromReplay: { route: 'missionDebrief', from: ['missionReplayReview'] },
  openEditor: { route: 'missionEditor', from: ['productHub', 'missionPlanning'] },
  previewEditorMission: { route: 'missionPlanning', from: ['missionEditor'] },
  returnToEditor: { route: 'missionEditor', from: ['missionPlanning'] },
  openImportExport: { route: 'importExport', from: ['productHub', 'missionPlanning', 'missionDebrief'] },
  openLeaderboard: { route: 'leaderboard', from: ['productHub', 'missionDebrief'] },
  openHeadlessViewer: { route: 'headlessBundleViewer', from: ['productHub', 'missionDebrief'] },
  openTutorialBrowser: { route: 'tutorialBrowser', from: ['productHub'] },
  openPlannerBenchmark: { route: 'plannerBenchmark', from: ['productHub'] },
  openAdaptiveBenchmark: { route: 'adaptiveBenchmark', from: ['productHub'] },
  openLegacyLearningLab: { route: 'legacyLearningLab', from: ['productHub'] },
  returnToMainMenu: { route: 'productHub', from: '*' }
});

export function createAnchorProductionLifecycle(options = {}) {
  const route = normalizeAnchorProductionRoute(options.initialRoute ?? 'productHub');
  return {
    type: 'anchor.production.lifecycle',
    version: ANCHOR_PRODUCTION_LIFECYCLE_VERSION,
    activeRoute: route,
    previousRoute: null,
    routeHistory: [route],
    transitionHistory: [],
    invalidTransitionCount: 0,
    routeTransitionCount: 0,
    sessionStore: options.sessionStore ?? null,
    diagnostics: [],
    warnings: [],
    failures: []
  };
}

export function dispatchAnchorLifecycleCommand(lifecycle, command) {
  const request = normalizeCommand(command);
  const definition = COMMANDS[request.type];
  if (!definition) return reject(lifecycle, request, `Unknown lifecycle command: ${request.type}`);
  const current = normalizeAnchorProductionRoute(lifecycle.activeRoute);
  if (!isLegalSource(definition.from, current)) return reject(lifecycle, request, `${request.type} is not legal from ${current}.`);
  const target = normalizeAnchorProductionRoute(request.route ?? definition.route);
  const session = lifecycle.sessionStore;
  applySessionSideEffect(session, request, target);
  lifecycle.previousRoute = current;
  lifecycle.activeRoute = target;
  lifecycle.routeTransitionCount += current === target ? 0 : 1;
  lifecycle.routeHistory.push(target);
  lifecycle.transitionHistory.push({ command: request.type, from: current, to: target, accepted: true });
  session?.clearRouteState?.(target);
  lifecycle.diagnostics.push({ command: request.type, route: target, sessionDigest: session?.digest?.() ?? null });
  return { accepted: true, command: request.type, from: current, to: target, route: target };
}

export function anchorProductionLifecycleSummary(lifecycle) {
  return {
    type: 'anchor.production.lifecycle-summary',
    version: ANCHOR_PRODUCTION_LIFECYCLE_VERSION,
    activeRoute: lifecycle?.activeRoute ?? null,
    previousRoute: lifecycle?.previousRoute ?? null,
    routeTransitionCount: Number(lifecycle?.routeTransitionCount ?? 0),
    invalidTransitionCount: Number(lifecycle?.invalidTransitionCount ?? 0),
    routeHistory: [...(lifecycle?.routeHistory ?? [])],
    lastTransition: lifecycle?.transitionHistory?.at?.(-1) ?? null,
    sessionSummary: lifecycle?.sessionStore ? anchorProductionSessionSummary(lifecycle.sessionStore) : null,
    warnings: [...(lifecycle?.warnings ?? [])],
    failures: [...(lifecycle?.failures ?? [])]
  };
}

export function validateAnchorProductionLifecycle(lifecycle) {
  const errors = [];
  if (!lifecycle || lifecycle.type !== 'anchor.production.lifecycle') errors.push('Lifecycle object type is invalid.');
  if (!anchorProductionRouteMetadata(lifecycle?.activeRoute)) errors.push('Lifecycle activeRoute is not a known route.');
  if (!Array.isArray(lifecycle?.routeHistory) || !lifecycle.routeHistory.length) errors.push('Lifecycle must record route history.');
  return { valid: errors.length === 0, errors, summary: anchorProductionLifecycleSummary(lifecycle) };
}

export function anchorProductionLegalCommands() {
  return Object.keys(COMMANDS);
}

function normalizeCommand(command) {
  if (typeof command === 'string') return { type: command };
  return { ...(command ?? {}), type: String(command?.type ?? command?.command ?? '') };
}

function isLegalSource(from, current) {
  if (from === '*') return true;
  return Array.isArray(from) && from.includes(current);
}

function reject(lifecycle, request, reason) {
  lifecycle.invalidTransitionCount += 1;
  lifecycle.transitionHistory.push({ command: request.type, from: lifecycle.activeRoute, to: lifecycle.activeRoute, accepted: false, reason });
  lifecycle.warnings.push(reason);
  return { accepted: false, command: request.type, from: lifecycle.activeRoute, to: lifecycle.activeRoute, route: lifecycle.activeRoute, reason };
}

function applySessionSideEffect(session, request, target) {
  if (!session) return;
  switch (request.type) {
    case 'loadMission':
      session.loadMission?.(request.config);
      break;
    case 'startPlanning':
      session.ensureMission?.();
      break;
    case 'executeMission':
      session.launchMission?.();
      break;
    case 'pauseSimulation':
      session.pauseSimulation?.();
      break;
    case 'finishMission':
      session.completeMission?.(request.reason ?? 'completed');
      break;
    case 'openReplayReview':
      session.openReplay?.();
      break;
    case 'returnFromReplay':
      session.closeReplay?.();
      break;
    case 'openEditor':
      session.openEditor?.();
      break;
    case 'previewEditorMission':
      session.previewEditorMission?.();
      break;
    case 'returnToEditor':
      session.returnToEditor?.();
      break;
    case 'returnToMainMenu':
    case 'openProductHub':
      session.clearRouteState?.('productHub');
      break;
    case 'openLegacyLearningLab':
      session.state.activeLegacyIsland = true;
      session.state.gameState.mode = 'legacyLearningLab';
      break;
    default:
      if (anchorProductionRouteMetadata(target)?.requiresMission) session.ensureMission?.();
      break;
  }
}
