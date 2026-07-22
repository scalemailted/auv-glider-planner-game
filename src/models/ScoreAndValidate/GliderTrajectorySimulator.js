const HeadlessObservation = require('./HeadlessObservation.js')
const DiveProfileModel = require('./DiveProfileModel.js')
const WaterColumnSchema = require('./WaterColumnSchema.js')
const GliderMotionSchema = require('./GliderMotionSchema.js')
const MotionEnvironmentSampler = require('./MotionEnvironmentSampler.js')
const GliderDynamicsModel = require('./GliderDynamicsModel.js')
const PlanControlAdapter = require('./PlanControlAdapter.js')
const MotionDiagnostics = require('./MotionDiagnostics.js')
const GLIDER_TRAJECTORY_SIMULATOR_VERSION = 'glider-trajectory-simulator-motion-r1';

 function simulateGliderMotionTrajectory({
  plan,
  fieldPack,
  waterColumnConfig,
  bathymetry,
  glider,
  motionConfig,
  options = {}
} = {}) {
  const planInput = PlanControlAdapter.normalizeMotionPlanInput(plan ?? {}, options);
  const config = GliderMotionSchema.createGliderMotionConfig({
    ...(motionConfig ?? {}),
    enabled: true,
    motionAware: true,
    gliderSpeed: planInput.desiredSpeedThroughWater ?? motionConfig?.gliderSpeed ?? glider?.speed,
    sampleIntervalSeconds: planInput.sampleIntervalSeconds ?? motionConfig?.sampleIntervalSeconds,
    energyBudget: glider?.energyBudget ?? motionConfig?.energyBudget
  });
  const configValidation = GliderMotionSchema.validateGliderMotionConfig(config);
  const waterConfig = WaterColumnSchema.normalizeWaterColumnConfig(waterColumnConfig ?? fieldPack?.waterColumnConfig ?? fieldPack?.grid?.waterColumnConfig ?? {
    depthLayerIds: fieldPack?.grid?.depthLayers,
    diveProfileId: planInput.diveProfileId ?? glider?.diveProfileId
  });
  const profile = DiveProfileModel.normalizeDiveProfile(planInput.diveProfileId ?? glider?.diveProfile ?? glider?.diveProfileId ?? waterConfig.diveProfileId, waterConfig);
  const plannedWaypoints = ensureStartWaypoint(planInput.waypoints, glider, fieldPack, profile);
  const controlSchedule = PlanControlAdapter.buildControlScheduleFromWaypoints({
    waypoints: plannedWaypoints,
    glider,
    motionConfig: config,
    diveProfile: profile,
    options: {
      ...options,
      planId: planInput.planId,
      routeSource: planInput.routeAuthority,
      waterColumnConfig: waterConfig,
      desiredSpeedThroughWater: planInput.desiredSpeedThroughWater ?? config.gliderSpeed,
      sampleIntervalSeconds: planInput.sampleIntervalSeconds ?? config.sampleIntervalSeconds,
      surfaceAtEnd: planInput.surfaceAtEnd
    }
  });
  let state = createInitialMotionState({ glider, plannedWaypoints, fieldPack, waterConfig, profile, config });
  const realizedTrack = [];
  const sampledObservations = [];
  const environmentSamples = [];
  const warnings = [...configValidation.warnings];
  const dt = Math.max(1, config.controlStepSeconds);
  const maxSteps = Math.max(1, Math.min(2000, Math.round(options.maxSteps ?? 360)));
  const maxSimTime = Math.max(dt, Number(options.durationSeconds ?? options.maxSimTime ?? fieldPack?.missionConfig?.world?.durationSeconds ?? 3600) || 3600);
  let targetIndex = Math.min(1, plannedWaypoints.length - 1);
  let lastSampleTime = -Infinity;
  let completed = plannedWaypoints.length <= 1;
  const trackErrors = [];
  for (let step = 0; step < maxSteps && state.timeSeconds <= maxSimTime && state.energyRemaining > 0; step += 1) {
    const target = plannedWaypoints[targetIndex] ?? plannedWaypoints.at(-1) ?? {};
    const depthLayerId = target.depthLayerId ?? target.depthLayer ?? DiveProfileModel.depthLayerForDiveProfile(profile, routeProgressForTarget(targetIndex, plannedWaypoints.length));
    const depthMeters = WaterColumnSchema.waterColumnLayerMetadata(depthLayerId).nominalDepthMeters ?? state.depthMeters;
    const command = {
      ...(controlSchedule.controls[Math.max(0, targetIndex - 1)] ?? controlSchedule.controls[0] ?? {}),
      timeSeconds: state.timeSeconds,
      targetWaypoint: target,
      desiredHeadingRadians: GliderDynamicsModel.computeDesiredHeadingToWaypoint(state, target),
      desiredDepthLayerId: depthLayerId,
      desiredDepthMeters: depthMeters,
      desiredSpeedThroughWater: planInput.desiredSpeedThroughWater ?? config.gliderSpeed,
      sampleEnabled: true
    };
    const environment = MotionEnvironmentSampler.sampleMotionEnvironment({
      fieldPack,
      waterColumnConfig: waterConfig,
      bathymetry,
      state,
      timeSeconds: state.timeSeconds,
      options
    });
    environmentSamples.push(environment);
    const stepped = GliderDynamicsModel.stepGliderMotion({ state, control: command, environment, config: { ...config, grid: fieldPack?.grid }, dt });
    state = stepped.state;
    const activeSegment = {
      start: plannedWaypoints[Math.max(0, targetIndex - 1)] ?? plannedWaypoints[0],
      end: target
    };
    const trackError = GliderDynamicsModel.computeTrackError(state, activeSegment);
    trackErrors.push(trackError);
    const trackPoint = {
      ...stepped.trackPoint,
      zIndex: DiveProfileModel.depthIndexForDiveProfile(profile, routeProgressForTarget(targetIndex, plannedWaypoints.length), waterConfig),
      depthLayer: depthLayerId,
      depthLayerId,
      diveProfileId: profile.id,
      targetWaypointId: target.waypointId ?? target.id ?? null,
      trackError: round(trackError)
    };
    realizedTrack.push(trackPoint);
    if (state.timeSeconds - lastSampleTime >= config.sampleIntervalSeconds - 1e-6) {
      sampledObservations.push(HeadlessObservation.sampleHeadlessObservation({
        fieldPack,
        x: state.x,
        y: state.y,
        zIndex: trackPoint.zIndex,
        gliderId: state.gliderId,
        timeSeconds: state.timeSeconds,
        sensorNoise: finiteNumber(options.sensorNoise, 0.03),
        seed: options.seed ?? fieldPack?.seed ?? 'motion-r1',
        diveProfileId: profile.id
      }));
      lastSampleTime = state.timeSeconds;
    }
    if (distance2d(state, target) <= finiteNumber(options.waypointArrivalRadius, 0.75)) {
      if (targetIndex >= plannedWaypoints.length - 1) {
        completed = true;
        break;
      }
      targetIndex += 1;
    }
  }
  if (!completed) warnings.push('Realized motion did not reach every planned waypoint within the configured browser-friendly limit.');
  const preliminaryTrace = {
    plannedWaypoints,
    controlCommands: controlSchedule.controls,
    realizedTrack,
    sampledObservations,
    plannedVsRealized: { trackErrors, arrivalStatus: completed ? 'arrived' : 'incomplete' }
  };
  const diagnostics = MotionDiagnostics.computeMotionFeasibilityDiagnostics(preliminaryTrace);
  const trace = buildPlannedVsRealizedTrace({
    plannedWaypoints,
    realizedTrack,
    observations: sampledObservations,
    controls: controlSchedule.controls,
    diagnostics: {
      ...diagnostics,
      environmentSummary: environmentSamples.length
        ? {
            sampleCount: environmentSamples.length,
            warningCount: environmentSamples.reduce((sum, sample) => sum + (sample.warnings?.length ?? 0), 0)
          }
        : null,
      configValidation
    }
  });
  return {
    type: 'anchor.motion.trajectory',
    version: GLIDER_TRAJECTORY_SIMULATOR_VERSION,
    motionModelId: config.motionModelId,
    planId: planInput.planId,
    gliderId: state.gliderId,
    plannedWaypoints,
    controlCommands: controlSchedule.controls,
    realizedTrack,
    sampledObservations,
    plannedVsRealized: trace.plannedVsRealized,
    motionDiagnostics: trace.motionDiagnostics,
    energySummary: trace.energySummary,
    warnings: [...warnings, ...(trace.warnings ?? [])],
    publicSafe: true,
    deterministic: true,
    generatedRoute: false,
    usesNewPlanner: false,
    usesWebGPUFluid: false,
    usesMARL: false,
    notA: [
      'not a route planner',
      'not a production controller',
      'not WebGPU',
      'not MARL/RL',
      'not official browser scoring'
    ]
  };
}

 function buildPlannedVsRealizedTrace({
  plannedWaypoints,
  realizedTrack,
  observations,
  controls,
  diagnostics
} = {}) {
  const planned = PlanControlAdapter.plannedPathSummary(plannedWaypoints);
  const realizedDistance = pathDistance(realizedTrack);
  const trackErrors = realizedTrack.map((point) => Number(point.trackError)).filter(Number.isFinite);
  const driftDistance = cumulativeDrift(realizedTrack);
  const energyUsed = realizedTrack.reduce((sum, point) => sum + Number(point.energyUsedIncrement ?? 0), 0);
  const arrivalStatus = diagnostics?.arrivalStatus ?? (realizedTrack.length && distance2d(realizedTrack.at(-1), plannedWaypoints?.at(-1)) <= 1 ? 'arrived' : 'incomplete');
  const plannedVsRealized = {
    type: 'anchor.motion.planned-vs-realized',
    version: GLIDER_TRAJECTORY_SIMULATOR_VERSION,
    plannedDistance: round(planned.plannedDistance),
    realizedDistance: round(realizedDistance),
    finalTrackError: trackErrors.length ? round(trackErrors.at(-1)) : 0,
    meanTrackError: mean(trackErrors),
    maxTrackError: max(trackErrors),
    driftDistance: round(driftDistance),
    currentAssistMean: mean(realizedTrack.map((point) => point.currentAssist)),
    crossCurrentMean: mean(realizedTrack.map((point) => point.crossCurrent)),
    energyUsed: round(energyUsed),
    arrivalStatus,
    missedWaypointCount: arrivalStatus === 'arrived' ? 0 : Math.max(0, (plannedWaypoints?.length ?? 1) - 1),
    sampledPointCount: observations?.length ?? 0,
    trackErrors
  };
  const motionDiagnostics = {
    ...(diagnostics ?? {}),
    plannedVsRealized,
    summary: MotionDiagnostics.motionDiagnosticsSummary({
      ...(diagnostics ?? {}),
      trackErrorMean: plannedVsRealized.meanTrackError,
      trackErrorMax: plannedVsRealized.maxTrackError,
      energyUsed: plannedVsRealized.energyUsed,
      sampleCoverageCount: plannedVsRealized.sampledPointCount,
      arrivalStatus
    })
  };
  return {
    plannedVsRealized,
    motionDiagnostics,
    energySummary: {
      type: 'anchor.motion.energy-summary',
      energyUsed: plannedVsRealized.energyUsed,
      energyRemaining: realizedTrack.at(-1)?.energyRemaining ?? null,
      educationalEstimate: true,
      officialBrowserScoring: false
    },
    warnings: [],
    controls
  };
}

 function trajectoryMotionSummary(trace = {}) {
  const planned = trace.plannedVsRealized ?? {};
  const diagnostics = trace.motionDiagnostics?.summary ?? trace.motionDiagnostics ?? {};
  return {
    type: 'anchor.motion.trajectory-summary',
    version: GLIDER_TRAJECTORY_SIMULATOR_VERSION,
    present: Boolean(trace?.type),
    motionModelId: trace.motionModelId ?? null,
    planId: trace.planId ?? null,
    gliderId: trace.gliderId ?? null,
    plannedWaypointCount: trace.plannedWaypoints?.length ?? 0,
    realizedTrackPointCount: trace.realizedTrack?.length ?? 0,
    sampledPointCount: trace.sampledObservations?.length ?? planned.sampledPointCount ?? 0,
    plannedDistance: round(planned.plannedDistance ?? 0),
    realizedDistance: round(planned.realizedDistance ?? 0),
    meanTrackError: round(planned.meanTrackError ?? diagnostics.trackErrorMean ?? 0),
    maxTrackError: round(planned.maxTrackError ?? diagnostics.trackErrorMax ?? 0),
    driftDistance: round(planned.driftDistance ?? 0),
    currentAssistMean: round(planned.currentAssistMean ?? diagnostics.currentAssistMean ?? 0),
    currentOppositionMean: round(diagnostics.currentOppositionMean ?? 0),
    crossCurrentMean: round(planned.crossCurrentMean ?? diagnostics.crossCurrentMean ?? 0),
    energyUsed: round(planned.energyUsed ?? diagnostics.energyUsed ?? 0),
    arrivalStatus: planned.arrivalStatus ?? diagnostics.arrivalStatus ?? 'unknown',
    warningCount: trace.warnings?.length ?? 0,
    usesMotionDynamics: true,
    usesNewPlanner: false,
    usesWebGPUFluid: false,
    usesMARL: false
  };
}

 function validateMotionTrajectory(trace = {}) {
  const errors = [];
  const warnings = [];
  if (!trace || typeof trace !== 'object') errors.push('Motion trajectory must be an object.');
  if (trace?.type !== 'anchor.motion.trajectory') errors.push(`Expected anchor.motion.trajectory, got ${trace?.type ?? 'missing'}.`);
  if (!Array.isArray(trace?.plannedWaypoints)) errors.push('plannedWaypoints must be an array.');
  if (!Array.isArray(trace?.controlCommands)) errors.push('controlCommands must be an array.');
  if (!Array.isArray(trace?.realizedTrack)) errors.push('realizedTrack must be an array.');
  if (!Array.isArray(trace?.sampledObservations)) errors.push('sampledObservations must be an array.');
  if (trace?.usesNewPlanner === true) errors.push('Motion trajectory must not claim a new planner.');
  if (trace?.usesWebGPUFluid === true) errors.push('Motion trajectory must not claim WebGPU integration.');
  if (trace?.usesMARL === true) errors.push('Motion trajectory must not claim MARL/RL.');
  if ((trace?.realizedTrack?.length ?? 0) === 0) warnings.push('Motion trajectory has no realized track points.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

function createInitialMotionState({ glider, plannedWaypoints, fieldPack, waterConfig, profile, config }) {
  const start = glider?.start ?? plannedWaypoints[0] ?? { x: 0, y: 0, zIndex: 0 };
  const zIndex = Math.max(0, Math.round(finiteNumber(start.zIndex ?? start.z, 0)));
  const depthLayerId = start.depthLayerId ?? start.depthLayer ?? fieldPack?.grid?.depthLayers?.[zIndex] ?? DiveProfileModel.depthLayerForDiveProfile(profile, 0);
  return GliderMotionSchema.createGliderMotionState({
    gliderId: glider?.id ?? glider?.gliderId ?? 'glider-1',
    x: finiteNumber(start.x, 0),
    y: finiteNumber(start.y, 0),
    z: zIndex,
    zIndex,
    depthLayerId,
    depthMeters: WaterColumnSchema.waterColumnLayerMetadata(depthLayerId).nominalDepthMeters ?? 0,
    headingRadians: plannedWaypoints[1] ? Math.atan2(finiteNumber(plannedWaypoints[1].y, 0) - finiteNumber(start.y, 0), finiteNumber(plannedWaypoints[1].x, 0) - finiteNumber(start.x, 0)) : 0,
    speedThroughWater: config.gliderSpeed,
    energyRemaining: config.energyBudget,
    energyBudget: config.energyBudget,
    lastControlMode: config.controlMode,
    waterColumnConfig: waterConfig
  });
}

function ensureStartWaypoint(waypoints = [], glider = {}, fieldPack = {}, profile = {}) {
  const list = Array.isArray(waypoints) ? waypoints.map(cloneJson) : [];
  if (!list.length) {
    const start = glider?.start ?? { x: 0, y: 0, zIndex: 0 };
    return [{ waypointId: 'start', ...cloneJson(start), depthLayerId: 'surface', diveProfileId: profile.id }];
  }
  const start = glider?.start;
  if (!start) return list;
  const first = list[0];
  if (distance2d(start, first) < 0.01) return list;
  const zIndex = Math.max(0, Math.round(finiteNumber(start.zIndex ?? start.z, 0)));
  return [{
    waypointId: `${glider.id ?? 'glider'}-motion-start`,
    x: finiteNumber(start.x, 0),
    y: finiteNumber(start.y, 0),
    zIndex,
    z: zIndex,
    depthLayer: fieldPack?.grid?.depthLayers?.[zIndex] ?? 'surface',
    depthLayerId: fieldPack?.grid?.depthLayers?.[zIndex] ?? 'surface',
    diveProfileId: profile.id,
    source: 'glider.start'
  }, ...list];
}

function routeProgressForTarget(index, count) {
  return count <= 1 ? 0 : Math.max(0, Math.min(1, index / (count - 1)));
}

function cumulativeDrift(track = []) {
  return track.reduce((sum, point) => sum + Math.hypot(Number(point.flowU ?? 0), Number(point.flowV ?? 0)), 0);
}

function pathDistance(points = []) {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) total += distance2d(points[index - 1], points[index]);
  return total;
}

function distance2d(a = {}, b = {}) {
  return Math.hypot(finiteNumber(b.x, 0) - finiteNumber(a.x, 0), finiteNumber(b.y, 0) - finiteNumber(a.y, 0));
}

function mean(values) {
  const finite = values.map(Number).filter(Number.isFinite);
  return finite.length ? round(finite.reduce((sum, value) => sum + value, 0) / finite.length) : 0;
}

function max(values) {
  const finite = values.map(Number).filter(Number.isFinite);
  return finite.length ? round(Math.max(...finite)) : 0;
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  return JSON.parse(JSON.stringify(value));
}

function round(value) {
  return Number(Number(value ?? 0).toFixed(6));
}

module.exports = {simulateGliderMotionTrajectory, buildPlannedVsRealizedTrace, trajectoryMotionSummary, validateMotionTrajectory}