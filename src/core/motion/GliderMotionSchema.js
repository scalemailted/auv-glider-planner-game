export const GLIDER_MOTION_SCHEMA_VERSION = 'glider-motion-schema-motion-r1';

export const GLIDER_MOTION_MODEL_IDS = Object.freeze([
  'kinematicVectorField',
  'depthLayerKinematic',
  'currentShearKinematic',
  'bathymetryAwareKinematic',
  'fluidCoupledPreview',
  'webgpuFluidFuture'
]);

export const GLIDER_CONTROL_MODE_IDS = Object.freeze([
  'waypointTracking',
  'headingHold',
  'currentAwareHeading',
  'diveProfileTracking',
  'stationKeeping',
  'sampleAndContinue',
  'surfaceAndReport'
]);

export const GLIDER_MOTION_STATE_FIELDS = Object.freeze([
  'gliderId',
  'timeSeconds',
  'x',
  'y',
  'z',
  'depthLayerId',
  'depthMeters',
  'headingRadians',
  'speedThroughWater',
  'pitchRadians',
  'verticalSpeed',
  'energyRemaining',
  'batteryFraction',
  'lastControlMode',
  'warnings'
]);

export const GLIDER_CONTROL_FIELDS = Object.freeze([
  'commandId',
  'gliderId',
  'timeSeconds',
  'controlMode',
  'targetWaypoint',
  'desiredHeadingRadians',
  'desiredSpeedThroughWater',
  'desiredDepthLayerId',
  'desiredDepthMeters',
  'desiredPitchRadians',
  'sampleEnabled',
  'surfaceRequested',
  'notes'
]);

export const GLIDER_MOTION_DIAGNOSTIC_IDS = Object.freeze([
  'currentAssistMean',
  'currentOppositionMean',
  'crossCurrentMean',
  'trackErrorMean',
  'trackErrorMax',
  'energyUsed',
  'turnEffort',
  'depthChangeEffort',
  'hazardExposure',
  'bottomClearanceWarnings',
  'constraintViolations',
  'sampleCoverageCount',
  'arrivalStatus'
]);

const MOTION_NOT_A = Object.freeze([
  'not route planning',
  'not full 3D vehicle dynamics',
  'not production controller',
  'not hydrodynamic solver',
  'not WebGPU',
  'not MARL/RL'
]);

export function normalizeGliderMotionModelId(id) {
  const value = String(id ?? '').trim();
  const aliases = {
    kinematic: 'kinematicVectorField',
    vectorField: 'kinematicVectorField',
    depth: 'depthLayerKinematic',
    shear: 'currentShearKinematic',
    bathymetry: 'bathymetryAwareKinematic',
    fluid: 'fluidCoupledPreview',
    webgpu: 'webgpuFluidFuture'
  };
  const normalized = aliases[value] ?? value;
  return GLIDER_MOTION_MODEL_IDS.includes(normalized) ? normalized : 'depthLayerKinematic';
}

export function normalizeGliderControlModeId(id) {
  const value = String(id ?? '').trim();
  const aliases = {
    waypoint: 'waypointTracking',
    heading: 'headingHold',
    currentAware: 'currentAwareHeading',
    dive: 'diveProfileTracking',
    station: 'stationKeeping',
    sample: 'sampleAndContinue',
    surface: 'surfaceAndReport'
  };
  const normalized = aliases[value] ?? value;
  return GLIDER_CONTROL_MODE_IDS.includes(normalized) ? normalized : 'waypointTracking';
}

export function createGliderMotionConfig(options = {}) {
  const motionModelId = normalizeGliderMotionModelId(options.motionModelId ?? options.modelId ?? options.motionModel);
  const controlMode = normalizeGliderControlModeId(options.controlMode ?? 'waypointTracking');
  const controlStepSeconds = Math.max(1, finiteNumber(options.controlStepSeconds ?? options.controlStep ?? options.dt, 60));
  const energyBudget = Math.max(0, finiteNumber(options.energyBudget, 120));
  return {
    type: 'anchor.motion.config',
    version: GLIDER_MOTION_SCHEMA_VERSION,
    enabled: Boolean(options.enabled ?? options.motionAware ?? false),
    motionAware: Boolean(options.motionAware ?? options.enabled ?? false),
    motionModelId,
    controlMode,
    controlStepSeconds,
    sampleIntervalSeconds: Math.max(controlStepSeconds, finiteNumber(options.sampleIntervalSeconds, controlStepSeconds)),
    gliderSpeed: Math.max(0.01, finiteNumber(options.gliderSpeed ?? options.speedThroughWater, 1)),
    maxTurnRateRadiansPerSecond: Math.max(0.0001, finiteNumber(options.maxTurnRateRadiansPerSecond ?? degreesToRadians(options.headingRateLimitDegreesPerSecond ?? options.headingRateLimit ?? 8), degreesToRadians(8))),
    maxVerticalSpeedMetersPerSecond: Math.max(0.001, finiteNumber(options.maxVerticalSpeedMetersPerSecond ?? options.verticalSpeed, 0.08)),
    driftGain: Math.max(0, finiteNumber(options.driftGain, 1)),
    energyBudget,
    boundaryMode: ['clamp', 'stop', 'warn'].includes(options.boundaryMode) ? options.boundaryMode : 'clamp',
    controlLimits: {
      headingRateLimitDegreesPerSecond: finiteNumber(options.headingRateLimitDegreesPerSecond ?? options.headingRateLimit, 8),
      maxPitchRadians: Math.max(0, finiteNumber(options.maxPitchRadians, 0.22)),
      maxSpeedThroughWater: Math.max(0.01, finiteNumber(options.maxSpeedThroughWater, Math.max(1, finiteNumber(options.gliderSpeed, 1) * 1.6)))
    },
    energyModel: {
      basePerSecond: finiteNumber(options.energyModel?.basePerSecond, 0.004),
      distanceScale: finiteNumber(options.energyModel?.distanceScale, 0.18),
      oppositionScale: finiteNumber(options.energyModel?.oppositionScale, 1.8),
      crossCurrentScale: finiteNumber(options.energyModel?.crossCurrentScale, 0.35),
      turnScale: finiteNumber(options.energyModel?.turnScale, 0.08),
      depthChangeScale: finiteNumber(options.energyModel?.depthChangeScale, 0.05),
      samplingScale: finiteNumber(options.energyModel?.samplingScale, 0.015),
      surfacingScale: finiteNumber(options.energyModel?.surfacingScale, 0.5)
    },
    publicSafe: true,
    deterministic: true,
    syntheticTeachingModel: true,
    webgpuFluidFutureContractOnly: motionModelId === 'webgpuFluidFuture',
    usesWebGPUFluid: false,
    usesNewPlanner: false,
    usesMARL: false,
    notA: MOTION_NOT_A.slice()
  };
}

export function createGliderMotionState(options = {}) {
  const energyBudget = Math.max(0, finiteNumber(options.energyBudget ?? options.energyRemaining, 120));
  const energyRemaining = clamp(finiteNumber(options.energyRemaining, energyBudget), 0, energyBudget || Infinity);
  return {
    type: 'anchor.motion.glider-state',
    version: GLIDER_MOTION_SCHEMA_VERSION,
    gliderId: String(options.gliderId ?? 'glider-1'),
    timeSeconds: finiteNumber(options.timeSeconds, 0),
    x: finiteNumber(options.x, 0),
    y: finiteNumber(options.y, 0),
    z: finiteNumber(options.z ?? options.zIndex, 0),
    zIndex: Math.max(0, Math.round(finiteNumber(options.zIndex ?? options.z, 0))),
    depthLayerId: options.depthLayerId ?? options.depthLayer ?? 'surface',
    depthMeters: finiteNumber(options.depthMeters, 0),
    headingRadians: finiteNumber(options.headingRadians, 0),
    speedThroughWater: Math.max(0, finiteNumber(options.speedThroughWater, 1)),
    pitchRadians: finiteNumber(options.pitchRadians, 0),
    verticalSpeed: finiteNumber(options.verticalSpeed, 0),
    energyRemaining,
    energyUsed: Math.max(0, finiteNumber(options.energyUsed, 0)),
    batteryFraction: energyBudget > 0 ? clamp(energyRemaining / energyBudget, 0, 1) : 0,
    lastControlMode: normalizeGliderControlModeId(options.lastControlMode ?? options.controlMode),
    warnings: Array.isArray(options.warnings) ? options.warnings.slice() : []
  };
}

export function createGliderControlCommand(options = {}) {
  return {
    type: 'anchor.motion.control-command',
    version: GLIDER_MOTION_SCHEMA_VERSION,
    commandId: String(options.commandId ?? options.id ?? `control-${Math.round(finiteNumber(options.timeSeconds, 0))}`),
    gliderId: String(options.gliderId ?? 'glider-1'),
    timeSeconds: finiteNumber(options.timeSeconds, 0),
    controlMode: normalizeGliderControlModeId(options.controlMode),
    targetWaypoint: options.targetWaypoint ? { ...options.targetWaypoint } : null,
    desiredHeadingRadians: finiteOrNull(options.desiredHeadingRadians),
    desiredSpeedThroughWater: Math.max(0, finiteNumber(options.desiredSpeedThroughWater, 1)),
    desiredDepthLayerId: options.desiredDepthLayerId ?? options.depthLayerId ?? options.depthLayer ?? null,
    desiredDepthMeters: finiteOrNull(options.desiredDepthMeters ?? options.depthMeters),
    desiredPitchRadians: finiteNumber(options.desiredPitchRadians, 0),
    sampleEnabled: Boolean(options.sampleEnabled ?? true),
    surfaceRequested: Boolean(options.surfaceRequested ?? false),
    notes: Array.isArray(options.notes) ? options.notes.slice() : []
  };
}

export function validateGliderMotionConfig(config = {}) {
  const errors = [];
  const warnings = [];
  if (!config || typeof config !== 'object') errors.push('Motion config must be an object.');
  if (config?.type !== 'anchor.motion.config') errors.push(`Expected type anchor.motion.config, got ${config?.type ?? 'missing'}.`);
  if (!GLIDER_MOTION_MODEL_IDS.includes(config?.motionModelId)) errors.push(`Unknown motion model ${config?.motionModelId ?? 'missing'}.`);
  if (!GLIDER_CONTROL_MODE_IDS.includes(config?.controlMode)) errors.push(`Unknown control mode ${config?.controlMode ?? 'missing'}.`);
  if (!Number.isFinite(Number(config?.controlStepSeconds)) || Number(config.controlStepSeconds) <= 0) errors.push('controlStepSeconds must be positive.');
  if (config?.motionModelId === 'webgpuFluidFuture' && config?.webgpuFluidFutureContractOnly !== true) warnings.push('webgpuFluidFuture must remain contract-only in MOTION-R1.');
  if (config?.usesWebGPUFluid === true) errors.push('MOTION-R1 must not claim WebGPU fluid integration.');
  if (config?.usesNewPlanner === true) errors.push('Motion config must not claim a new route planner.');
  if (config?.usesMARL === true) errors.push('Motion config must not claim MARL/RL.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

export function validateGliderMotionState(state = {}) {
  const errors = [];
  if (!state || typeof state !== 'object') errors.push('Motion state must be an object.');
  if (state?.type !== 'anchor.motion.glider-state') errors.push(`Expected type anchor.motion.glider-state, got ${state?.type ?? 'missing'}.`);
  for (const key of ['timeSeconds', 'x', 'y', 'headingRadians', 'speedThroughWater', 'energyRemaining', 'batteryFraction']) {
    if (!Number.isFinite(Number(state?.[key]))) errors.push(`${key} must be finite.`);
  }
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : 'PASS', errors, warnings: [] };
}

export function validateGliderControlCommand(command = {}) {
  const errors = [];
  if (!command || typeof command !== 'object') errors.push('Control command must be an object.');
  if (command?.type !== 'anchor.motion.control-command') errors.push(`Expected type anchor.motion.control-command, got ${command?.type ?? 'missing'}.`);
  if (!GLIDER_CONTROL_MODE_IDS.includes(command?.controlMode)) errors.push(`Unknown control mode ${command?.controlMode ?? 'missing'}.`);
  if (!Number.isFinite(Number(command?.timeSeconds))) errors.push('timeSeconds must be finite.');
  if (!Number.isFinite(Number(command?.desiredSpeedThroughWater))) errors.push('desiredSpeedThroughWater must be finite.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : 'PASS', errors, warnings: [] };
}

export function gliderMotionConfigSummary(configInput = {}) {
  const config = configInput?.type === 'anchor.motion.config' ? configInput : createGliderMotionConfig(configInput);
  const validation = validateGliderMotionConfig(config);
  return {
    type: 'anchor.motion.config-summary',
    version: GLIDER_MOTION_SCHEMA_VERSION,
    enabled: config.enabled === true,
    motionAware: config.motionAware === true,
    motionModelId: config.motionModelId,
    controlMode: config.controlMode,
    controlStepSeconds: config.controlStepSeconds,
    gliderSpeed: config.gliderSpeed,
    driftGain: config.driftGain,
    headingRateLimitDegreesPerSecond: config.controlLimits?.headingRateLimitDegreesPerSecond ?? null,
    deterministic: true,
    syntheticTeachingModel: true,
    webgpuFluidFutureContractOnly: config.webgpuFluidFutureContractOnly === true,
    usesWebGPUFluid: false,
    usesNewPlanner: false,
    usesMARL: false,
    valid: validation.valid,
    warnings: validation.warnings,
    notA: MOTION_NOT_A.slice()
  };
}

function degreesToRadians(value) {
  return finiteNumber(value, 0) * Math.PI / 180;
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}
