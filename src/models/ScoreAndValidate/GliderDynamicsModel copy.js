const HeadlessFlow = require('./HeadlessFlow.js')
const GliderMotionSchema = require('./GliderMotionSchema.js')
const GLIDER_DYNAMICS_MODEL_VERSION = 'glider-dynamics-model-motion-r1';

 function stepGliderMotion({
  state,
  control,
  environment,
  config,
  dt
} = {}) {
  const warnings = [...(state?.warnings ?? []), ...(environment?.warnings ?? [])];
  const stepSeconds = Math.max(0.001, finiteNumber(dt ?? config?.controlStepSeconds, 60));
  const command = control ?? {};
  const current = environment?.currentVector ?? { u: 0, v: 0, w: 0 };
  const desiredHeading = command.desiredHeadingRadians ?? computeDesiredHeadingToWaypoint(state, command.targetWaypoint);
  const headingRadians = applyHeadingRateLimit(
    finiteNumber(state?.headingRadians, 0),
    finiteNumber(desiredHeading, finiteNumber(state?.headingRadians, 0)),
    finiteNumber(config?.maxTurnRateRadiansPerSecond, Math.PI / 36),
    stepSeconds
  );
  const throughWaterVelocity = computeThroughWaterVelocity({ ...state, headingRadians }, command, config);
  const realizedVelocity = computeRealizedVelocity({
    throughWaterVelocity,
    currentVector: current,
    driftGain: finiteNumber(config?.driftGain, 1)
  });
  const previous = GliderMotionSchema.createGliderMotionState({
    ...state,
    energyBudget: config?.energyBudget ?? state?.energyRemaining ?? 120
  });
  const nextX = finiteNumber(previous.x, 0) + realizedVelocity.x * stepSeconds;
  const nextY = finiteNumber(previous.y, 0) + realizedVelocity.y * stepSeconds;
  const depthTarget = finiteNumber(command.desiredDepthMeters, environment?.depthMeters ?? previous.depthMeters);
  const depthDelta = depthTarget - finiteNumber(previous.depthMeters, 0);
  const maxDepthStep = finiteNumber(config?.maxVerticalSpeedMetersPerSecond, 0.08) * stepSeconds;
  const depthStep = clamp(depthDelta, -maxDepthStep, maxDepthStep);
  const depthMeters = Math.max(0, finiteNumber(previous.depthMeters, 0) + depthStep);
  const z = command.desiredDepthLayerId && environment?.waterColumnLayer?.id === command.desiredDepthLayerId
    ? finiteNumber(previous.z, 0)
    : finiteNumber(previous.z, 0);
  const energyCost = computeMotionEnergyCost({
    state: previous,
    control: command,
    environment,
    realizedVelocity,
    config,
    dt: stepSeconds
  });
  let clampedX = nextX;
  let clampedY = nextY;
  const grid = config?.grid ?? config?.world?.grid ?? {};
  if (Number.isFinite(Number(grid.width))) {
    const before = clampedX;
    clampedX = clamp(clampedX, 0, Math.max(0, Number(grid.width) - 1));
    if (clampedX !== before) warnings.push('Motion state reached x grid boundary and was clamped.');
  }
  if (Number.isFinite(Number(grid.height))) {
    const before = clampedY;
    clampedY = clamp(clampedY, 0, Math.max(0, Number(grid.height) - 1));
    if (clampedY !== before) warnings.push('Motion state reached y grid boundary and was clamped.');
  }
  if (Number(environment?.constraint ?? 0) >= 0.5) warnings.push('Constraint mask sampled at realized state.');
  if (environment?.bottomClearanceMeters !== null && Number(environment?.bottomClearanceMeters) < 2) warnings.push('Bottom clearance below teaching threshold.');
  const energyRemaining = Math.max(0, finiteNumber(previous.energyRemaining, config?.energyBudget ?? 120) - energyCost.energyUsedIncrement);
  const nextState = GliderMotionSchema.createGliderMotionState({
    ...previous,
    timeSeconds: finiteNumber(previous.timeSeconds, 0) + stepSeconds,
    x: clampedX,
    y: clampedY,
    z,
    zIndex: previous.zIndex,
    depthLayerId: command.desiredDepthLayerId ?? environment?.depthLayerId ?? previous.depthLayerId,
    depthMeters,
    headingRadians,
    speedThroughWater: throughWaterVelocity.speedThroughWater,
    pitchRadians: finiteNumber(command.desiredPitchRadians, depthStep === 0 ? 0 : Math.atan2(depthStep, Math.max(1e-6, throughWaterVelocity.speedThroughWater * stepSeconds))),
    verticalSpeed: depthStep / stepSeconds,
    energyRemaining,
    energyUsed: finiteNumber(previous.energyUsed, 0) + energyCost.energyUsedIncrement,
    energyBudget: config?.energyBudget ?? finiteNumber(previous.energyRemaining, 120),
    lastControlMode: GliderMotionSchema.normalizeGliderControlModeId(command.controlMode),
    warnings
  });
  const travelDirection = {
    x: Math.cos(headingRadians),
    y: Math.sin(headingRadians)
  };
  return {
    state: nextState,
    trackPoint: {
      type: 'anchor.motion.track-point',
      version: GLIDER_DYNAMICS_MODEL_VERSION,
      timeSeconds: round(nextState.timeSeconds),
      gliderId: nextState.gliderId,
      x: round(nextState.x),
      y: round(nextState.y),
      z: round(nextState.z),
      zIndex: nextState.zIndex,
      depthLayerId: nextState.depthLayerId,
      depthMeters: round(nextState.depthMeters),
      headingRadians: round(headingRadians),
      speedThroughWater: round(throughWaterVelocity.speedThroughWater),
      realizedVelocityX: round(realizedVelocity.x),
      realizedVelocityY: round(realizedVelocity.y),
      flowU: round(current.u),
      flowV: round(current.v),
      currentAssist: round(HeadlessFlow.currentAssist(current, travelDirection)),
      crossCurrent: round(HeadlessFlow.crossCurrentMagnitude(current, travelDirection)),
      energyUsedIncrement: round(energyCost.energyUsedIncrement),
      energyRemaining: round(nextState.energyRemaining),
      hazard: round(environment?.hazard ?? 0),
      constraintMask: round(environment?.constraint ?? 0),
      bottomClearanceMeters: environment?.bottomClearanceMeters === null ? null : round(environment?.bottomClearanceMeters),
      controlMode: command.controlMode ?? 'waypointTracking',
      commandId: command.commandId ?? null,
      sampleEnabled: command.sampleEnabled !== false,
      warnings: warnings.slice()
    },
    energyCost,
    warnings
  };
}

 function integrateGliderMotion({
  initialState,
  controls,
  environmentSampler,
  config,
  dt,
  durationSeconds
} = {}) {
  const schedule = (Array.isArray(controls) ? controls : []).slice().sort((a, b) => Number(a.timeSeconds ?? 0) - Number(b.timeSeconds ?? 0));
  const stepSeconds = Math.max(0.001, finiteNumber(dt ?? config?.controlStepSeconds, 60));
  const duration = Math.max(0, finiteNumber(durationSeconds, schedule.at(-1)?.timeSeconds ?? 0) + stepSeconds);
  let state = GliderMotionSchema.createGliderMotionState({ ...initialState, energyBudget: config?.energyBudget ?? initialState?.energyRemaining ?? 120 });
  const track = [];
  const samples = [];
  for (let elapsed = 0; elapsed <= duration && state.energyRemaining > 0; elapsed += stepSeconds) {
    const control = activeControl(schedule, elapsed);
    const environment = environmentSampler?.({ state, timeSeconds: state.timeSeconds, control }) ?? {};
    samples.push(environment);
    const stepped = stepGliderMotion({ state, control, environment, config, dt: stepSeconds });
    state = stepped.state;
    track.push(stepped.trackPoint);
  }
  return {
    type: 'anchor.motion.integration-result',
    version: GLIDER_DYNAMICS_MODEL_VERSION,
    state,
    track,
    environmentSamples: samples,
    controlCount: schedule.length,
    generatedRoute: false,
    summary: gliderDynamicsSummary({ track, controls: schedule })
  };
}

 function computeDesiredHeadingToWaypoint(state = {}, waypoint = {}) {
  const dx = finiteNumber(waypoint?.x, finiteNumber(state.x, 0)) - finiteNumber(state.x, 0);
  const dy = finiteNumber(waypoint?.y, finiteNumber(state.y, 0)) - finiteNumber(state.y, 0);
  return Math.atan2(dy, dx);
}

 function applyHeadingRateLimit(currentHeading, desiredHeading, maxTurnRate, dt) {
  const delta = wrapAngle(finiteNumber(desiredHeading, 0) - finiteNumber(currentHeading, 0));
  const maxDelta = Math.max(0, finiteNumber(maxTurnRate, 0)) * Math.max(0, finiteNumber(dt, 0));
  return wrapAngle(finiteNumber(currentHeading, 0) + clamp(delta, -maxDelta, maxDelta));
}

 function computeThroughWaterVelocity(state = {}, control = {}, config = {}) {
  const requestedSpeed = finiteNumber(control.desiredSpeedThroughWater ?? state.speedThroughWater, finiteNumber(config.gliderSpeed, 1));
  const maxSpeed = finiteNumber(config.controlLimits?.maxSpeedThroughWater, Math.max(requestedSpeed, finiteNumber(config.gliderSpeed, 1)));
  const speedThroughWater = clamp(requestedSpeed, 0, maxSpeed);
  const heading = finiteNumber(state.headingRadians, finiteNumber(control.desiredHeadingRadians, 0));
  return {
    x: Math.cos(heading) * speedThroughWater / 60,
    y: Math.sin(heading) * speedThroughWater / 60,
    speedThroughWater
  };
}

 function computeRealizedVelocity({
  throughWaterVelocity,
  currentVector,
  driftGain
} = {}) {
  return {
    x: finiteNumber(throughWaterVelocity?.x, 0) + finiteNumber(driftGain, 1) * finiteNumber(currentVector?.u, 0) / 60,
    y: finiteNumber(throughWaterVelocity?.y, 0) + finiteNumber(driftGain, 1) * finiteNumber(currentVector?.v, 0) / 60,
    z: finiteNumber(throughWaterVelocity?.z, 0) + finiteNumber(driftGain, 1) * finiteNumber(currentVector?.w, 0) / 60
  };
}

 function computeMotionEnergyCost({
  state,
  control,
  environment,
  realizedVelocity,
  config,
  dt
} = {}) {
  const model = config?.energyModel ?? {};
  const stepSeconds = Math.max(0, finiteNumber(dt, 0));
  const distance = Math.hypot(finiteNumber(realizedVelocity?.x, 0), finiteNumber(realizedVelocity?.y, 0)) * stepSeconds;
  const heading = finiteNumber(state?.headingRadians, 0);
  const desired = finiteNumber(control?.desiredHeadingRadians, heading);
  const turnEffort = Math.abs(wrapAngle(desired - heading));
  const assist = HeadlessFlow.currentAssist(environment?.currentVector ?? {}, { x: Math.cos(heading), y: Math.sin(heading) });
  const cross = HeadlessFlow.crossCurrentMagnitude(environment?.currentVector ?? {}, { x: Math.cos(heading), y: Math.sin(heading) });
  const depthEffort = Math.abs(finiteNumber(control?.desiredDepthMeters, state?.depthMeters ?? 0) - finiteNumber(state?.depthMeters, 0)) / 100;
  const energyUsedIncrement = (
    finiteNumber(model.basePerSecond, 0.004) * stepSeconds
    + finiteNumber(model.distanceScale, 0.18) * distance
    + finiteNumber(model.oppositionScale, 1.8) * Math.max(0, -assist) * stepSeconds / 60
    + finiteNumber(model.crossCurrentScale, 0.35) * cross * stepSeconds / 60
    + finiteNumber(model.turnScale, 0.08) * turnEffort
    + finiteNumber(model.depthChangeScale, 0.05) * depthEffort
    + (control?.sampleEnabled === false ? 0 : finiteNumber(model.samplingScale, 0.015))
    + (control?.surfaceRequested ? finiteNumber(model.surfacingScale, 0.5) : 0)
  );
  return {
    energyUsedIncrement: round(energyUsedIncrement),
    distance: round(distance),
    currentAssist: round(assist),
    crossCurrent: round(cross),
    turnEffort: round(turnEffort),
    depthChangeEffort: round(depthEffort)
  };
}

 function computeTrackError(state = {}, targetSegment = {}) {
  const start = targetSegment.start ?? targetSegment.from ?? state;
  const end = targetSegment.end ?? targetSegment.to ?? targetSegment.targetWaypoint ?? state;
  const sx = finiteNumber(start.x, 0);
  const sy = finiteNumber(start.y, 0);
  const ex = finiteNumber(end.x, sx);
  const ey = finiteNumber(end.y, sy);
  const px = finiteNumber(state.x, 0);
  const py = finiteNumber(state.y, 0);
  const dx = ex - sx;
  const dy = ey - sy;
  const length2 = dx * dx + dy * dy;
  if (length2 <= 1e-9) return Math.hypot(px - sx, py - sy);
  const t = clamp(((px - sx) * dx + (py - sy) * dy) / length2, 0, 1);
  const cx = sx + dx * t;
  const cy = sy + dy * t;
  return Math.hypot(px - cx, py - cy);
}

 function gliderDynamicsSummary(result = {}) {
  const track = Array.isArray(result.track) ? result.track : [];
  return {
    type: 'anchor.motion.dynamics-summary',
    version: GLIDER_DYNAMICS_MODEL_VERSION,
    trackPointCount: track.length,
    finalTimeSeconds: track.at(-1)?.timeSeconds ?? 0,
    energyUsed: round(track.reduce((sum, point) => sum + Number(point.energyUsedIncrement ?? 0), 0)),
    realizedDistance: round(pathDistance(track)),
    meanCurrentAssist: mean(track.map((point) => point.currentAssist)),
    meanCrossCurrent: mean(track.map((point) => point.crossCurrent)),
    generatedRoute: false,
    notA: ['not route planning', 'not production controller', 'not full 3D vehicle dynamics']
  };
}

function activeControl(controls, timeSeconds) {
  let current = controls[0] ?? {};
  for (const control of controls) {
    if (Number(control.timeSeconds ?? 0) <= timeSeconds) current = control;
    else break;
  }
  return current;
}

function pathDistance(points) {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += Math.hypot(Number(points[index].x ?? 0) - Number(points[index - 1].x ?? 0), Number(points[index].y ?? 0) - Number(points[index - 1].y ?? 0));
  }
  return total;
}

function mean(values) {
  const finite = values.map(Number).filter(Number.isFinite);
  return finite.length ? round(finite.reduce((sum, value) => sum + value, 0) / finite.length) : 0;
}

function wrapAngle(value) {
  let angle = finiteNumber(value, 0);
  while (angle <= -Math.PI) angle += Math.PI * 2;
  while (angle > Math.PI) angle -= Math.PI * 2;
  return angle;
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, finiteNumber(value, min)));
}

function round(value) {
  return Number(Number(value ?? 0).toFixed(6));
}

module.exports = {stepGliderMotion, integrateGliderMotion, computeDesiredHeadingToWaypoint, applyHeadingRateLimit, computeThroughWaterVelocity, computeRealizedVelocity, computeMotionEnergyCost, computeTrackError, gliderDynamicsSummary}