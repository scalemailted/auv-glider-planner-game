import { HEADLESS_CANONICAL_FIELDS } from '../HeadlessFieldSchema.js';
import { createHeadlessMissionConfig as createH0HeadlessMissionConfig, validateHeadlessMissionConfig } from '../HeadlessMissionSchema.js';
import { createHeadlessGrid } from './HeadlessGrid.js';

export const HEADLESS_RUNTIME_CONFIG_VERSION = 'headless-node-runtime-h1';

export const HEADLESS_RUNTIME_FIELD_IDS = Object.freeze([
  'T_hiddenTruth',
  'E_forecast',
  'mu_belief',
  'U_uncertainty',
  'P_unknown',
  'A_global',
  'F_u',
  'F_v',
  'hazard',
  'constraintMask',
  'staleness',
  'boundaryStrength'
]);

export function createDefaultHeadlessRuntimeConfig(options = {}) {
  const scenarioId = normalizeScenarioId(options.scenario ?? options.scenarioId ?? 'coastalBloomFront');
  const seed = String(options.seed ?? 'demo-001');
  const grid = createHeadlessGrid({
    width: options.width ?? options.grid?.width ?? 32,
    height: options.height ?? options.grid?.height ?? 24,
    depthLayers: options.depthLayers ?? options.grid?.depthLayers ?? ['surface', 'thermocline', 'deep']
  });
  const missionConfig = createDefaultHeadlessMissionConfig({ ...options, scenarioId, seed, grid });
  const plan = options.plan ?? createDefaultHeadlessGliderPlan({ ...options, grid, gliderId: missionConfig.gliders[0]?.id ?? 'glider-1' });
  return {
    type: 'anchor.headless.runtime-config',
    version: HEADLESS_RUNTIME_CONFIG_VERSION,
    runtimeTarget: 'nodeHeadless',
    scenario: scenarioId,
    scenarioId,
    seed,
    grid,
    fields: HEADLESS_RUNTIME_FIELD_IDS.slice(),
    missionConfig,
    plan,
    sensorNoise: finiteNumber(options.sensorNoise, 0.03),
    stepDistance: finiteNumber(options.stepDistance, 1.25),
    priorityWeights: {
      value: finiteNumber(options.priorityWeights?.value, 0.35),
      uncertainty: finiteNumber(options.priorityWeights?.uncertainty, 0.25),
      boundary: finiteNumber(options.priorityWeights?.boundary, 0.18),
      unknown: finiteNumber(options.priorityWeights?.unknown, 0.22),
      staleness: finiteNumber(options.priorityWeights?.staleness, 0.12),
      hazard: finiteNumber(options.priorityWeights?.hazard, 0.35),
      mask: finiteNumber(options.priorityWeights?.mask, 1)
    },
    boundary: {
      canonicalRuntime: 'Node headless runtime over portable ANCHOR core logic. Browser ANCHOR remains the official visual referee and scoring UI.',
      calibratedOceanForecast: false,
      productionController: false,
      implementsNewPlanner: false,
      implementsMARL: false,
      implementsPythonSimulator: false
    },
    notes: [
      'H1 is a deterministic educational headless runtime scaffold, not a calibrated ocean model.',
      'Waypoint plans are executed as supplied; H1 does not optimize or generate routes.'
    ]
  };
}

export function createDefaultHeadlessMissionConfig(options = {}) {
  const grid = createHeadlessGrid(options.grid ?? options);
  const seed = String(options.seed ?? 'demo-001');
  return createH0HeadlessMissionConfig({
    missionId: options.missionId ?? 'coastal-bloom-front-headless-mission',
    scenarioId: options.scenarioId ?? options.scenario ?? 'coastalBloomFront',
    seed,
    informationAccessTier: options.informationAccessTier ?? 'forecastOnly',
    world: {
      width: grid.width,
      height: grid.height,
      depthLayers: grid.depthLayers,
      timeStepSeconds: 60,
      durationSeconds: 3600,
      coordinateFrame: grid.coordinateFrame,
      fieldDescriptors: HEADLESS_CANONICAL_FIELDS.filter((entry) => HEADLESS_RUNTIME_FIELD_IDS.includes(entry.id)).map((entry) => ({
        id: entry.id,
        dimensions: entry.dimensions,
        visibilityTier: entry.visibilityTier,
        depthLayers: entry.dimensions.includes('z') ? grid.depthLayers : []
      }))
    },
    gliders: [{
      id: options.gliderId ?? 'glider-1',
      label: 'Survey Glider 1',
      start: { x: 2, y: Math.max(1, grid.height - 4), z: 0 },
      speed: finiteNumber(options.gliderSpeed, 1),
      energyBudget: finiteNumber(options.energyBudget, 120),
      sensorSuite: ['temperature-fluorescence-sampler'],
      diveProfile: { mode: 'sawtooth', minZ: 0, maxZ: grid.depthCount - 1, cycleLength: 0.5 },
      communicationPolicy: { surfacingRequired: false }
    }],
    objectives: [{
      id: 'reconnaissanceSurvey',
      label: 'Sample front and bloom boundary',
      targetFields: ['mu_belief', 'U_uncertainty', 'P_unknown', 'boundaryStrength']
    }],
    visibleFields: ['E_forecast', 'mu_belief', 'U_uncertainty', 'P_unknown', 'A_global', 'F_u', 'F_v', 'hazard', 'constraintMask', 'staleness', 'boundaryStrength'],
    hiddenFields: ['T_hiddenTruth'],
    planningRules: {
      routeAuthority: 'providedWaypointsOnly',
      h1DoesNotOptimizeRoutes: true
    },
    scoringRules: {
      educationalHeadlessScoring: true,
      browserOfficialScoring: false
    },
    exportPolicy: {
      includeHiddenTruth: Boolean(options.includeHiddenTruth ?? true),
      separateVisibleAndHiddenFields: true
    },
    notes: ['Node headless runtime over portable ANCHOR core logic. Browser ANCHOR remains the official visual referee and scoring UI.']
  });
}

export function createDefaultHeadlessGliderPlan(options = {}) {
  const grid = createHeadlessGrid(options.grid ?? options);
  const maxX = grid.width - 1;
  const maxY = grid.height - 1;
  const gliderId = options.gliderId ?? 'glider-1';
  const waypointFractions = [
    [0.07, 0.84, 0],
    [0.24, 0.68, 1],
    [0.43, 0.54, 1],
    [0.62, 0.44, 2],
    [0.78, 0.32, 1],
    [0.92, 0.19, 0]
  ];
  return {
    type: 'anchor.headless.waypoint-plan',
    planId: options.planId ?? 'fixed-front-crossing-plan',
    gliderId,
    routeAuthority: 'fixedDefaultWaypoints',
    generatesRoute: false,
    waypoints: waypointFractions.map(([fx, fy, z], index) => createWaypoint({
      x: fx * maxX,
      y: fy * maxY,
      zIndex: Math.min(grid.depthCount - 1, z),
      depthLayer: grid.depthLayers[Math.min(grid.depthCount - 1, z)],
      index
    }))
  };
}

export function validateHeadlessRuntimeConfig(config = {}) {
  const errors = [];
  const warnings = [];
  if (!config || typeof config !== 'object') errors.push('Runtime config must be an object.');
  if (config?.type !== 'anchor.headless.runtime-config') errors.push(`Expected type anchor.headless.runtime-config, got ${config?.type ?? 'missing'}.`);
  if (config?.runtimeTarget !== 'nodeHeadless') errors.push('runtimeTarget must be nodeHeadless.');
  const grid = createHeadlessGrid(config?.grid ?? {});
  if (grid.width <= 0 || grid.height <= 0 || grid.depthCount <= 0) errors.push('Grid must have positive width, height, and depth layers.');
  for (const fieldId of HEADLESS_RUNTIME_FIELD_IDS) {
    if (!config?.fields?.includes(fieldId)) errors.push(`Missing H0 field ${fieldId}.`);
  }
  if (!Array.isArray(config?.plan?.waypoints) || config.plan.waypoints.length < 4) errors.push('Default waypoint plan must include at least four waypoints.');
  if (config?.plan?.generatesRoute !== false) warnings.push('H1 plans should be provided waypoints, not generated routes.');
  const missionValidation = validateHeadlessMissionConfig(config?.missionConfig ?? {});
  if (!missionValidation.valid) errors.push(...missionValidation.errors.map((entry) => `missionConfig: ${entry}`));
  if (config?.boundary?.implementsPythonSimulator) warnings.push('H1 must not claim a Python simulator package.');
  if (config?.boundary?.implementsNewPlanner) warnings.push('H1 must not claim a new planner.');
  if (config?.boundary?.implementsMARL) warnings.push('H1 must not claim MARL/RL.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

export function headlessRuntimeConfigSummary(configInput = {}) {
  const config = configInput?.type === 'anchor.headless.runtime-config' ? configInput : createDefaultHeadlessRuntimeConfig(configInput);
  const validation = validateHeadlessRuntimeConfig(config);
  return {
    version: config.version,
    scenario: config.scenario,
    seed: config.seed,
    width: config.grid.width,
    height: config.grid.height,
    depthLayers: config.grid.depthLayers.slice(),
    fieldCount: config.fields.length,
    waypointCount: config.plan.waypoints.length,
    gliderCount: config.missionConfig.gliders.length,
    valid: validation.valid,
    warnings: validation.warnings,
    boundary: config.boundary.canonicalRuntime
  };
}

function createWaypoint({ x, y, zIndex, depthLayer, index }) {
  return {
    waypointId: `wp-${index + 1}`,
    x: Number(x.toFixed(3)),
    y: Number(y.toFixed(3)),
    zIndex,
    z: zIndex,
    depthLayer
  };
}

function normalizeScenarioId(value) {
  const text = String(value ?? 'coastalBloomFront');
  if (text === 'coastal_bloom_front') return 'coastalBloomFront';
  return text;
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
