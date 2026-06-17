import { HEADLESS_CANONICAL_FIELDS } from '../HeadlessFieldSchema.js';
import { createHeadlessMissionConfig as createH0HeadlessMissionConfig, validateHeadlessMissionConfig } from '../HeadlessMissionSchema.js';
import { createHeadlessGrid } from './HeadlessGrid.js';
import { createDiveProfileSequence, normalizeDiveProfile } from '../../science/DiveProfileModel.js';
import { normalizeWaterColumnConfig, validateWaterColumnConfig, waterColumnConfigSummary } from '../../science/WaterColumnSchema.js';
import { bathymetryConfigSummary, createBathymetryConfig, normalizeBathymetryViewMode, validateBathymetryConfig } from '../../science/BathymetrySchema.js';
import { createGliderMotionConfig, gliderMotionConfigSummary, validateGliderMotionConfig } from '../../motion/GliderMotionSchema.js';

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
  const waterColumnConfig = normalizeWaterColumnConfig(options.waterColumnConfig ?? {
    ...options,
    depthLayerIds: options.depthLayers ?? options.grid?.depthLayers,
    diveProfileId: options.diveProfileId ?? options.diveProfile ?? options.profileId
  });
  const grid = createHeadlessGrid({
    width: options.width ?? options.grid?.width ?? 32,
    height: options.height ?? options.grid?.height ?? 24,
    depthLayers: waterColumnConfig.depthLayerIds
  });
  const bathymetryViewMode = normalizeBathymetryViewMode(options.bathymetryView ?? options.bathymetryViewMode ?? 'obliqueBathymetry');
  const bathymetryConfig = options.bathymetry === false ? null : createBathymetryConfig({
    ...(options.bathymetryConfig ?? {}),
    width: grid.width,
    height: grid.height,
    defaultViewMode: bathymetryViewMode,
    verticalExaggeration: options.verticalExaggeration ?? options.bathymetryConfig?.verticalExaggeration ?? 1.5
  });
  const missionConfig = createDefaultHeadlessMissionConfig({ ...options, scenarioId, seed, grid, waterColumnConfig, bathymetryConfig });
  const plan = options.plan ?? createDefaultHeadlessGliderPlan({ ...options, grid, waterColumnConfig, gliderId: missionConfig.gliders[0]?.id ?? 'glider-1' });
  const motionConfig = createGliderMotionConfig({
    ...(options.motionConfig ?? {}),
    enabled: Boolean(options.motionAware ?? options.motionConfig?.enabled ?? options.motionConfig?.motionAware ?? false),
    motionAware: Boolean(options.motionAware ?? options.motionConfig?.motionAware ?? options.motionConfig?.enabled ?? false),
    motionModelId: options.motionModelId ?? options.motionModel ?? options.motionConfig?.motionModelId,
    controlStepSeconds: options.controlStepSeconds ?? options.controlStep ?? options.motionConfig?.controlStepSeconds,
    gliderSpeed: options.gliderSpeed ?? missionConfig.gliders[0]?.speed ?? options.motionConfig?.gliderSpeed,
    headingRateLimitDegreesPerSecond: options.headingRateLimitDegreesPerSecond ?? options.headingRateLimit ?? options.motionConfig?.controlLimits?.headingRateLimitDegreesPerSecond,
    driftGain: options.driftGain ?? options.motionConfig?.driftGain,
    energyBudget: options.energyBudget ?? missionConfig.gliders[0]?.energyBudget ?? options.motionConfig?.energyBudget,
    sampleIntervalSeconds: options.sampleIntervalSeconds ?? options.motionConfig?.sampleIntervalSeconds
  });
  missionConfig.world ??= {};
  missionConfig.world.motionConfig = motionConfig;
  if (bathymetryConfig) missionConfig.world.bathymetryConfig = bathymetryConfig;
  return {
    type: 'anchor.headless.runtime-config',
    version: HEADLESS_RUNTIME_CONFIG_VERSION,
    runtimeTarget: 'nodeHeadless',
    scenario: scenarioId,
    scenarioId,
    seed,
    grid,
    waterColumnConfig,
    bathymetryConfig,
    bathymetryViewMode,
    fields: HEADLESS_RUNTIME_FIELD_IDS.slice(),
    missionConfig,
    plan,
    motionAware: motionConfig.enabled === true || motionConfig.motionAware === true,
    motionConfig,
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
      implementsPythonSimulator: false,
      implementsFull3DPlanning: false,
      usesMotionDynamics: motionConfig.enabled === true || motionConfig.motionAware === true,
      usesWebGPUFluid: false,
      usesHydrodynamicSolver: false,
      usesTerrainFlowAsOceanCurrent: false
    },
    notes: [
      'H1 is a deterministic educational headless runtime scaffold, not a calibrated ocean model.',
      'P11 adds 2.5D depth-layer sampling metadata; it does not add full 3D planning.',
      'Waypoint plans are executed as supplied; H1 does not optimize or generate routes.',
      'MOTION-R1 motion-aware execution is optional and deterministic; it does not add a route planner or WebGPU.',
      'ENV-R1 bathymetry is public-safe environmental geometry; it is not terrain-flow ocean current or full 3D route planning.'
    ]
  };
}

export function createDefaultHeadlessMissionConfig(options = {}) {
  const grid = createHeadlessGrid(options.grid ?? options);
  const waterColumnConfig = normalizeWaterColumnConfig(options.waterColumnConfig ?? {
    ...options,
    depthLayerIds: grid.depthLayers,
    diveProfileId: options.diveProfileId ?? options.diveProfile ?? options.profileId
  });
  const diveProfile = normalizeDiveProfile(options.diveProfile ?? options.diveProfileId ?? waterColumnConfig.diveProfileId, waterColumnConfig);
  const bathymetryConfig = options.bathymetryConfig === null ? null : createBathymetryConfig({
    ...(options.bathymetryConfig ?? {}),
    width: grid.width,
    height: grid.height,
    defaultViewMode: options.bathymetryViewMode ?? options.bathymetryView,
    verticalExaggeration: options.verticalExaggeration ?? options.bathymetryConfig?.verticalExaggeration ?? 1.5
  });
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
      depthLayerModel: 'top-down-2p5d',
      waterColumnConfig,
      bathymetryConfig,
      motionConfig: options.motionConfig ?? null,
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
      diveProfile,
      diveProfileId: diveProfile.id,
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
  const waterColumnConfig = normalizeWaterColumnConfig(options.waterColumnConfig ?? {
    ...options,
    depthLayerIds: grid.depthLayers,
    diveProfileId: options.diveProfileId ?? options.diveProfile ?? options.profileId
  });
  const diveProfile = normalizeDiveProfile(options.diveProfile ?? options.diveProfileId ?? waterColumnConfig.diveProfileId, waterColumnConfig);
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
  const profileSequence = createDiveProfileSequence(diveProfile, waterColumnConfig, { sampleCount: waypointFractions.length });
  return {
    type: 'anchor.headless.waypoint-plan',
    planId: options.planId ?? 'fixed-front-crossing-plan',
    gliderId,
    diveProfileId: diveProfile.id,
    routeAuthority: 'fixedDefaultWaypoints',
    generatesRoute: false,
    waypoints: waypointFractions.map(([fx, fy, fallbackZ], index) => {
      const profilePoint = profileSequence[index] ?? {};
      const z = Number.isFinite(Number(profilePoint.zIndex)) ? profilePoint.zIndex : fallbackZ;
      return createWaypoint({
        x: fx * maxX,
        y: fy * maxY,
        zIndex: Math.min(grid.depthCount - 1, z),
        depthLayer: grid.depthLayers[Math.min(grid.depthCount - 1, z)],
        diveProfileId: diveProfile.id,
        index
      });
    })
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
  const waterColumnValidation = validateWaterColumnConfig(config?.waterColumnConfig ?? config?.missionConfig?.world?.waterColumnConfig ?? {});
  if (!waterColumnValidation.valid) errors.push(...waterColumnValidation.errors.map((entry) => `waterColumnConfig: ${entry}`));
  if (config?.bathymetryConfig) {
    const bathymetryValidation = validateBathymetryConfig(config.bathymetryConfig);
    if (!bathymetryValidation.valid) errors.push(...bathymetryValidation.errors.map((entry) => 'bathymetryConfig: ' + entry));
    warnings.push(...bathymetryValidation.warnings.map((entry) => 'bathymetryConfig: ' + entry));
  }
  const motionValidation = validateGliderMotionConfig(config?.motionConfig ?? createGliderMotionConfig());
  if (!motionValidation.valid) errors.push(...motionValidation.errors.map((entry) => `motionConfig: ${entry}`));
  warnings.push(...motionValidation.warnings.map((entry) => `motionConfig: ${entry}`));
  if (config?.boundary?.implementsPythonSimulator) warnings.push('H1 must not claim a Python simulator package.');
  if (config?.boundary?.implementsNewPlanner) warnings.push('H1 must not claim a new planner.');
  if (config?.boundary?.implementsMARL) warnings.push('H1 must not claim MARL/RL.');
  if (config?.boundary?.implementsFull3DPlanning) warnings.push('P11 must not claim full 3D route planning.');
  if (config?.boundary?.usesWebGPUFluid) warnings.push('MOTION-R1 must not claim WebGPU fluid integration.');
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
    waterColumn: waterColumnConfigSummary(config.waterColumnConfig),
    bathymetry: config.bathymetryConfig ? bathymetryConfigSummary(config.bathymetryConfig) : null,
    diveProfileId: config.waterColumnConfig?.diveProfileId ?? config.missionConfig?.gliders?.[0]?.diveProfileId ?? null,
    motion: gliderMotionConfigSummary(config.motionConfig),
    motionAware: config.motionAware === true,
    fieldCount: config.fields.length,
    waypointCount: config.plan.waypoints.length,
    gliderCount: config.missionConfig.gliders.length,
    valid: validation.valid,
    warnings: validation.warnings,
    boundary: config.boundary.canonicalRuntime
  };
}

function createWaypoint({ x, y, zIndex, depthLayer, diveProfileId, index }) {
  return {
    waypointId: `wp-${index + 1}`,
    x: Number(x.toFixed(3)),
    y: Number(y.toFixed(3)),
    zIndex,
    z: zIndex,
    depthLayer,
    depthLayerId: depthLayer,
    diveProfileId
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
