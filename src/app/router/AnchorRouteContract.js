export const ANCHOR_ROUTE_CONTRACT_VERSION = 'anchor-route-contract-mig-r2';

export const ANCHOR_ROUTE_IDS = Object.freeze({
  mainMenu: 'mainMenu',
  missionSetup: 'missionSetup',
  missionBriefing: 'missionBriefing',
  missionPlanning: 'missionPlanning',
  missionSimulation: 'missionSimulation',
  missionDebrief: 'missionDebrief',
  importExport: 'importExport',
  leaderboard: 'leaderboard',
  tutorialBrowser: 'tutorialBrowser',
  plannerBenchmark: 'plannerBenchmark',
  adaptiveBenchmark: 'adaptiveBenchmark',
  legacyPhaser: 'legacyPhaser'
});

export const ANCHOR_ROUTE_HASHES = Object.freeze({
  [ANCHOR_ROUTE_IDS.mainMenu]: '#/menu',
  [ANCHOR_ROUTE_IDS.missionSetup]: '#/setup',
  [ANCHOR_ROUTE_IDS.missionBriefing]: '#/briefing',
  [ANCHOR_ROUTE_IDS.missionPlanning]: '#/planning',
  [ANCHOR_ROUTE_IDS.missionSimulation]: '#/simulation',
  [ANCHOR_ROUTE_IDS.missionDebrief]: '#/debrief',
  [ANCHOR_ROUTE_IDS.importExport]: '#/import',
  [ANCHOR_ROUTE_IDS.leaderboard]: '#/leaderboard',
  [ANCHOR_ROUTE_IDS.tutorialBrowser]: '#/tutorials',
  [ANCHOR_ROUTE_IDS.plannerBenchmark]: '#/benchmark/planner',
  [ANCHOR_ROUTE_IDS.adaptiveBenchmark]: '#/benchmark/adaptive'
});

export const LEGACY_PHASER_SCENE_ALIASES = Object.freeze({
  flowDemo: 'FlowFieldDemoScene',
  roiDemo: 'RoiGeneratorDemoScene',
  coupledFieldsDemo: 'CoupledFieldsDemoScene',
  uncertaintyForecastDemo: 'UncertaintyForecastDemoScene',
  samplingPriorityDemo: 'SamplingPriorityDemoScene',
  flowCoupledSamplingDemo: 'FlowCoupledSamplingDemoScene',
  motionPlanningDemo: 'MotionPlanningDemoScene',
  bathymetryWorldView: 'BathymetryWorldViewScene',
  rendererArchitecturePreview: 'RendererArchitecturePreviewScene',
  benchmarkModeOverview: 'BenchmarkModeOverviewScene',
  headlessBundleViewer: 'HeadlessBundleViewerScene',
  levelEditor: 'EnvironmentEditorScene',
  datasetExport: 'DatasetExportScene',
  loadLevelJson: 'LoadLevelJsonScene',
  loadLevelById: 'LoadLevelByIdScene'
});

export function createAnchorRoute(id, params = {}) {
  const routeId = normalizeAnchorRouteId(id);
  const route = {
    type: 'anchor.route',
    version: ANCHOR_ROUTE_CONTRACT_VERSION,
    id: routeId,
    params: { ...(params ?? {}) },
    requiresPhaser: routeId === ANCHOR_ROUTE_IDS.legacyPhaser,
    createdAt: new Date().toISOString()
  };
  if (routeId === ANCHOR_ROUTE_IDS.legacyPhaser) {
    route.params.sceneId = normalizeLegacySceneId(params.sceneId ?? params.scene ?? params.id);
  }
  return route;
}

export function normalizeAnchorRouteId(value) {
  const input = String(value ?? '').trim();
  if (!input) return ANCHOR_ROUTE_IDS.mainMenu;
  if (Object.values(ANCHOR_ROUTE_IDS).includes(input)) return input;
  if (input.startsWith('#/legacy/')) return ANCHOR_ROUTE_IDS.legacyPhaser;
  const match = Object.entries(ANCHOR_ROUTE_HASHES).find(([, hash]) => hash === input);
  if (match) return match[0];
  const compact = input.replace(/^#\/?/, '').replace(/^mission\//, 'mission');
  const aliases = {
    menu: ANCHOR_ROUTE_IDS.mainMenu,
    main: ANCHOR_ROUTE_IDS.mainMenu,
    setup: ANCHOR_ROUTE_IDS.missionSetup,
    missionSetup: ANCHOR_ROUTE_IDS.missionSetup,
    missionsetup: ANCHOR_ROUTE_IDS.missionSetup,
    briefing: ANCHOR_ROUTE_IDS.missionBriefing,
    missionBriefing: ANCHOR_ROUTE_IDS.missionBriefing,
    missionbriefing: ANCHOR_ROUTE_IDS.missionBriefing,
    planning: ANCHOR_ROUTE_IDS.missionPlanning,
    missionPlanning: ANCHOR_ROUTE_IDS.missionPlanning,
    missionplanning: ANCHOR_ROUTE_IDS.missionPlanning,
    simulation: ANCHOR_ROUTE_IDS.missionSimulation,
    missionSimulation: ANCHOR_ROUTE_IDS.missionSimulation,
    missionsimulation: ANCHOR_ROUTE_IDS.missionSimulation,
    debrief: ANCHOR_ROUTE_IDS.missionDebrief,
    missionDebrief: ANCHOR_ROUTE_IDS.missionDebrief,
    missiondebrief: ANCHOR_ROUTE_IDS.missionDebrief,
    import: ANCHOR_ROUTE_IDS.importExport,
    importExport: ANCHOR_ROUTE_IDS.importExport,
    leaderboard: ANCHOR_ROUTE_IDS.leaderboard,
    tutorials: ANCHOR_ROUTE_IDS.tutorialBrowser,
    tutorialBrowser: ANCHOR_ROUTE_IDS.tutorialBrowser,
    plannerBenchmark: ANCHOR_ROUTE_IDS.plannerBenchmark,
    benchmarkPlanner: ANCHOR_ROUTE_IDS.plannerBenchmark,
    adaptiveBenchmark: ANCHOR_ROUTE_IDS.adaptiveBenchmark,
    benchmarkAdaptive: ANCHOR_ROUTE_IDS.adaptiveBenchmark,
    legacy: ANCHOR_ROUTE_IDS.legacyPhaser,
    legacyPhaser: ANCHOR_ROUTE_IDS.legacyPhaser
  };
  return aliases[compact] ?? ANCHOR_ROUTE_IDS.legacyPhaser;
}

export function hashForAnchorRoute(route = {}) {
  const id = normalizeAnchorRouteId(route.id ?? route);
  if (id === ANCHOR_ROUTE_IDS.legacyPhaser) {
    return `#/legacy/${encodeURIComponent(normalizeLegacySceneId(route.params?.sceneId ?? route.sceneId))}`;
  }
  return ANCHOR_ROUTE_HASHES[id] ?? ANCHOR_ROUTE_HASHES[ANCHOR_ROUTE_IDS.mainMenu];
}

export function routeFromHash(hash = '') {
  const value = String(hash ?? '').trim() || ANCHOR_ROUTE_HASHES[ANCHOR_ROUTE_IDS.mainMenu];
  if (value.startsWith('#/legacy/')) {
    const sceneId = decodeURIComponent(value.slice('#/legacy/'.length));
    return createAnchorRoute(ANCHOR_ROUTE_IDS.legacyPhaser, { sceneId });
  }
  const routeId = normalizeAnchorRouteId(value);
  return createAnchorRoute(routeId);
}

export function validateAnchorRoute(route = {}) {
  const errors = [];
  const warnings = [];
  if (!route || typeof route !== 'object') errors.push('Route must be an object.');
  if (route?.type && route.type !== 'anchor.route') warnings.push('Route type should be anchor.route.');
  const id = normalizeAnchorRouteId(route?.id);
  if (!Object.values(ANCHOR_ROUTE_IDS).includes(id)) errors.push(`Unknown route id: ${route?.id}`);
  if (id === ANCHOR_ROUTE_IDS.legacyPhaser && !normalizeLegacySceneId(route?.params?.sceneId)) {
    errors.push('Legacy Phaser route requires params.sceneId.');
  }
  return { valid: errors.length === 0, errors, warnings, route: createAnchorRoute(id, route?.params ?? {}) };
}

export function normalizeLegacySceneId(sceneId) {
  const input = String(sceneId ?? '').trim();
  if (!input) return 'MainMenuScene';
  return LEGACY_PHASER_SCENE_ALIASES[input] ?? input;
}

export function anchorRouteSummary(route = {}) {
  const normalized = createAnchorRoute(route.id ?? route, route.params ?? {});
  return {
    type: 'anchor.route.summary',
    version: ANCHOR_ROUTE_CONTRACT_VERSION,
    id: normalized.id,
    requiresPhaser: normalized.requiresPhaser,
    sceneId: normalized.params?.sceneId ?? null,
    hash: hashForAnchorRoute(normalized)
  };
}



