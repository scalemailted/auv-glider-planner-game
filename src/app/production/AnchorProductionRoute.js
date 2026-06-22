export const ANCHOR_PRODUCTION_ROUTE_VERSION = 'three-r3a-route-contract';

const ROUTES = [
  route('productHub', 'Product Hub', 'hub', 'Product Hub', 'ANCHOR: Glider Command', 'Mission Context', false, false, false, false, false, '#next-shell-route-heading', ['main-menu-shell', 'hub-mode', 'no-mission-hub']),
  route('missionSetup', 'Mission Setup', 'setup', 'Mission Navigator', 'Mission Setup', 'Setup Details', false, false, false, false, false, '#next-shell-route-heading', ['setup-route']),
  route('missionBriefing', 'Mission Briefing', 'briefing', 'Mission Briefing', 'Scenario Start', 'Briefing Dossier', true, false, false, false, false, '#next-shell-route-heading', ['briefing-route']),
  route('missionPlanning', 'Mission Planning', 'workspace', 'Mission Console', 'Planning', 'Waypoint Timeline', true, false, false, true, false, '#next-shell-route-heading', ['planning-workspace'], ['planning-workspace']),
  route('missionSimulation', 'Mission Simulation', 'workspace', 'Mission Console', 'Simulation', 'Mission Timeline', true, false, false, true, false, '#next-shell-route-heading', ['simulation-route']),
  route('surfacingDecision', 'Surfacing Decision', 'workspace', 'Surfacing Decision', 'Mission Simulation', 'Decision Timeline', true, false, false, true, false, '#next-shell-route-heading', ['surfacing-route']),
  route('missionDebrief', 'Mission Debrief', 'debrief', 'Debrief Console', 'Mission Debrief', 'Result Timeline', true, true, false, false, false, '#next-shell-route-heading', ['debrief-route']),
  route('missionReplayReview', 'Replay Review', 'replay', 'Replay Console', 'Replay Review', 'Replay Timeline', true, true, true, true, false, '#next-shell-route-heading', ['replay-route']),
  route('missionEditor', 'Mission Editor', 'editor', 'Editor Console', 'Mission Editor', 'Validation', false, false, false, true, false, '#next-shell-route-heading', ['editor-route']),
  route('importExport', 'Import / Export', 'tool', 'Import / Export', 'Import / Export', 'Tool Status', false, false, false, false, false, '#next-shell-route-heading', ['tool-route']),
  route('leaderboard', 'Leaderboard', 'tool', 'Leaderboard', 'Challenge Leaderboard', 'Leaderboard Detail', false, false, false, false, false, '#next-shell-route-heading', ['tool-route']),
  route('headlessBundleViewer', 'Headless Bundle Viewer', 'tool', 'Headless Bundle Viewer', 'Headless Bundle Viewer', 'Bundle Detail', false, false, true, false, false, '#next-shell-route-heading', ['tool-route']),
  route('tutorialBrowser', 'Tutorial Browser', 'tool', 'Tutorial Browser', 'Tutorial Browser', 'Tutorial Detail', false, false, false, false, false, '#next-shell-route-heading', ['tool-route']),
  route('plannerBenchmark', 'Planner Benchmark', 'tool', 'Planner Benchmark', 'Planner Benchmark', 'Benchmark Detail', false, false, false, false, false, '#next-shell-route-heading', ['benchmark-route']),
  route('adaptiveBenchmark', 'Adaptive Benchmark', 'tool', 'Adaptive Benchmark', 'Adaptive Benchmark', 'Adaptive Detail', false, false, false, false, false, '#next-shell-route-heading', ['benchmark-route']),
  route('legacyLearningLab', 'Learning Lab', 'legacy', 'Learning Labs', 'Learning Lab', 'Legacy Lab Status', false, false, false, false, true, '#next-shell-route-heading', ['legacy-learning-route'])
];

export const ANCHOR_PRODUCTION_ROUTES = Object.freeze(ROUTES.map((entry) => Object.freeze(entry)));
const ROUTE_MAP = new Map(ANCHOR_PRODUCTION_ROUTES.map((entry) => [entry.id, entry]));

export function normalizeAnchorProductionRoute(value) {
  const id = String(value ?? '').trim();
  return ROUTE_MAP.has(id) ? id : 'productHub';
}

export function anchorProductionRouteMetadata(routeId) {
  return ROUTE_MAP.get(normalizeAnchorProductionRoute(routeId));
}

export function validateAnchorProductionRoute(routeId) {
  const metadata = ROUTE_MAP.get(String(routeId ?? ''));
  const errors = [];
  if (!metadata) errors.push(`Unknown production route: ${String(routeId)}`);
  if (metadata && !metadata.defaultFocusSelector) errors.push(`${metadata.id} requires a default focus selector.`);
  if (metadata && !Array.isArray(metadata.bodyClasses)) errors.push(`${metadata.id} bodyClasses must be an array.`);
  if (metadata && metadata.permitsLegacyPhaserIsland && metadata.usesThreeWorld) errors.push(`${metadata.id} cannot be both a Three world and a legacy island.`);
  return { valid: errors.length === 0, errors, route: metadata ?? null };
}

function route(id, label, shellLayout, leftHeading, centerHeading, rightHeading, requiresMission, requiresResult, requiresReplay, usesThreeWorld, permitsLegacyPhaserIsland, defaultFocusSelector, bodyClasses = [], shellClasses = []) {
  return {
    id,
    label,
    shellLayout,
    leftRegion: { id: 'mission-console', label: leftHeading },
    centerRegion: { id: 'game-root', label: centerHeading },
    rightRegion: { id: 'waypoint-timeline', label: rightHeading },
    timelineRegion: { id: 'bottom-timeline', label: 'Timeline and performance' },
    requiresMission: Boolean(requiresMission),
    requiresResult: Boolean(requiresResult),
    requiresReplay: Boolean(requiresReplay),
    usesThreeWorld: Boolean(usesThreeWorld),
    permitsLegacyPhaserIsland: Boolean(permitsLegacyPhaserIsland),
    defaultFocusSelector,
    bodyClasses,
    shellClasses
  };
}
