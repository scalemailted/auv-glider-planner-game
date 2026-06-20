import { normalizeDiveProfile } from '../science/DiveProfileModel.js';
import { normalizeWaterColumnConfig, waterColumnLayerMetadata } from '../science/WaterColumnSchema.js';
import { normalizeContinuousGliderState } from './ContinuousGliderState.js';

export const GLIDER_DIVE_STATE_MACHINE_VERSION = 'glider-dive-state-machine-three-r1-2a-3';
export const GLIDER_DIVE_KINEMATICS_MODEL = Object.freeze({
  modelType: 'educationalGliderDiveKinematics',
  version: GLIDER_DIVE_STATE_MACHINE_VERSION,
  seaExplorerValidated: false,
  operationallyCalibrated: false
});

export function advanceGliderDiveStateMachine(state = {}, inputs = {}) {
  const current = normalizeContinuousGliderState(state);
  const dt = positive(inputs.dt ?? inputs.deltaTimeSeconds, 0.25);
  const config = normalizeWaterColumnConfig(inputs.waterColumnConfig ?? inputs.mission?.waterColumnConfig ?? inputs.level?.world?.waterColumnConfig ?? { depthLayerIds: ['surface'] });
  const profile = normalizeDiveProfile(inputs.diveProfile ?? inputs.diveProfileId ?? inputs.selectedDiveProfileId ?? 'surfaceOnly', config);
  const requestedDepth = requestedTargetDepth(inputs, profile, config);
  const localBottomDepth = finite(inputs.localBathymetryMeters ?? inputs.bottomDepthMeters, Infinity);
  const bottomClearance = positive(inputs.minimumBottomClearanceMeters ?? inputs.bottomClearanceMeters, 5);
  const terrainLimitedDepth = Math.max(0, Number.isFinite(localBottomDepth) ? localBottomDepth - bottomClearance : requestedDepth);
  const ratingLimitedDepth = finite(inputs.vehicleDepthRatingMeters ?? inputs.maxVehicleDepthMeters, Infinity);
  const targetDepth = Math.max(0, Math.min(requestedDepth, terrainLimitedDepth, ratingLimitedDepth));
  const verticalSpeed = positive(inputs.verticalSpeedMetersPerSecond ?? inputs.verticalSpeed ?? 0.18, 0.18);
  const horizontalSpeed = positive(inputs.horizontalSpeed ?? inputs.maxSpeed ?? 1, 1);
  const segmentLength = Math.max(0, finite(inputs.segmentLength ?? inputs.segmentHorizontalDistanceMeters ?? 0, 0));
  const segmentProgress = inputs.segmentProgress != null ? clamp01(inputs.segmentProgress) : progressFromDistance(current, inputs, segmentLength);
  const previousDepth = current.position.depthMeters;
  let phase = current.divePhase;
  let depth = previousDepth;
  let verticalVelocity = 0;
  let pitchRadians = 0;
  const events = [];

  const requestedCycleCount = requestedDiveCycleCount(inputs, profile);
  const feasibleCycleCount = profile.id === 'surfaceOnly' || targetDepth <= 0.1 ? 0 : Math.max(1, requestedCycleCount);

  if (feasibleCycleCount > 0) {
    const cycleProgress = segmentProgress * feasibleCycleCount;
    const cycleIndex = segmentProgress >= 1 ? feasibleCycleCount - 1 : Math.min(feasibleCycleCount - 1, Math.floor(cycleProgress));
    const localProgress = segmentProgress >= 1 ? 1 : cycleProgress - Math.floor(cycleProgress);
    const shape = triangularCycle(localProgress);
    depth = segmentProgress >= 1 ? 0 : targetDepth * shape;
    verticalVelocity = dt > 0 ? (depth - previousDepth) / dt : 0;
    phase = cyclePhaseFor(localProgress, segmentProgress, depth);
    pitchRadians = phase === 'descending' || phase === 'inflectingDown' ? positivePitch(inputs.descentPitchRadians ?? 0.18)
      : phase === 'ascending' || phase === 'inflectingUp' || phase === 'surfacing' ? -positivePitch(inputs.ascentPitchRadians ?? 0.16)
        : 0;
    if (current.divePhase !== phase) events.push(phaseEvent(phase === 'inflectingUp' ? 'surfacing' : phase, current, inputs, { depthMeters: depth, cycleIndex }));
    const layerCrossingEvents = layerCrossings(previousDepth, depth, config, current, inputs);
    const bottomClearanceMeters = Number.isFinite(localBottomDepth) ? localBottomDepth - depth : null;
    const next = normalizeContinuousGliderState({
      ...current,
      position: { ...current.position, depthMeters: depth },
      velocity: { ...current.velocity, vertical: verticalVelocity },
      groundRelativeVelocity: { ...current.groundRelativeVelocity, vertical: verticalVelocity },
      pitchRadians,
      divePhase: phase,
      profileProgress: cycleProgress / Math.max(1, feasibleCycleCount),
      segmentProgress,
      surfaced: depth <= 0.1,
      transmitting: phase === 'transmitting',
      timeSeconds: current.timeSeconds + dt,
      bottomDepthMeters: Number.isFinite(localBottomDepth) ? localBottomDepth : null,
      bottomClearanceMeters
    });
    return {
      type: 'anchor.sim.glider-dive-state-machine-step',
      version: GLIDER_DIVE_STATE_MACHINE_VERSION,
      model: GLIDER_DIVE_KINEMATICS_MODEL,
      state: next,
      previousDepthMeters: previousDepth,
      requestedDepthMeters: requestedDepth,
      targetDepthMeters: targetDepth,
      requestedCycleCount,
      feasibleCycleCount,
      actualCompletedCycleCount: segmentProgress >= 1 ? feasibleCycleCount : cycleIndex,
      cycleIndex,
      cycleProgress: round(localProgress),
      verticalVelocity,
      horizontalPropulsionContribution: horizontalSpeed,
      pitchRadians,
      phase,
      phaseTransitionEvents: events,
      layerCrossingEvents,
      bottomTurnEvent: phase === 'bottomTurn' ? phaseEvent('bottomTurn', current, inputs, { depthMeters: depth, cycleIndex }) : events.find((event) => event.type === 'bottomTurn') ?? null,
      surfacingEvent: phase === 'surfacing' || phase === 'inflectingUp' || phase === 'transmitting' ? phaseEvent('surfacing', current, inputs, { cycleIndex }) : events.find((event) => event.type === 'surfacing') ?? null,
      warnings: warningsForLimits({ requestedDepth, targetDepth, terrainLimitedDepth, ratingLimitedDepth, bottomClearanceMeters }),
      failures: bottomClearanceMeters != null && bottomClearanceMeters < 0 ? ['seabedPenetrationPrevented'] : []
    };
  }

  if (targetDepth <= 0.1 || profile.id === 'surfaceOnly') {
    phase = segmentProgress >= 1 ? 'transmitting' : 'surfaced';
    depth = 0;
  } else if (phase === 'surfaced' || phase === 'transmitting') {
    phase = 'inflectingDown';
  }

  if (phase === 'inflectingDown') {
    phase = 'descending';
    events.push(phaseEvent('inflectingDown', current, inputs));
  }

  if (phase === 'descending') {
    verticalVelocity = verticalSpeed;
    depth = Math.min(targetDepth, previousDepth + verticalSpeed * dt);
    pitchRadians = positivePitch(inputs.descentPitchRadians ?? 0.18);
    if (depth >= targetDepth - 1e-6 || segmentProgress >= 0.48) {
      depth = targetDepth;
      phase = 'bottomTurn';
      events.push(phaseEvent('bottomTurn', current, inputs, { depthMeters: depth }));
    }
  } else if (phase === 'bottomTurn') {
    depth = targetDepth;
    verticalVelocity = 0;
    pitchRadians = 0;
    if (segmentProgress >= 0.52 || finite(inputs.bottomTurnElapsedSeconds, 0) >= positive(inputs.bottomTurnDurationSeconds ?? 1, 1)) {
      phase = 'ascending';
      events.push(phaseEvent('ascending', current, inputs, { depthMeters: depth }));
    }
  } else if (phase === 'ascending') {
    verticalVelocity = -verticalSpeed;
    depth = Math.max(0, previousDepth - verticalSpeed * dt);
    pitchRadians = -positivePitch(inputs.ascentPitchRadians ?? 0.16);
    if (depth <= 0.1 || segmentProgress >= 0.98) {
      depth = 0;
      phase = 'inflectingUp';
      events.push(phaseEvent('inflectingUp', current, inputs));
    }
  } else if (phase === 'inflectingUp' || phase === 'surfacing') {
    depth = 0;
    phase = 'transmitting';
    events.push(phaseEvent('surfacing', current, inputs));
  }

  if (phase === 'transmitting' && segmentProgress < 1 && targetDepth > 0.1) {
    phase = 'surfaced';
  }

  const layerCrossingEvents = layerCrossings(previousDepth, depth, config, current, inputs);
  const bottomClearanceMeters = Number.isFinite(localBottomDepth) ? localBottomDepth - depth : null;
  const next = normalizeContinuousGliderState({
    ...current,
    position: { ...current.position, depthMeters: depth },
    velocity: { ...current.velocity, vertical: verticalVelocity },
    groundRelativeVelocity: { ...current.groundRelativeVelocity, vertical: verticalVelocity },
    pitchRadians,
    divePhase: phase,
    profileProgress: profileProgressFromDepth(depth, targetDepth, phase),
    segmentProgress,
    surfaced: depth <= 0.1,
    transmitting: phase === 'transmitting',
    timeSeconds: current.timeSeconds + dt,
    bottomDepthMeters: Number.isFinite(localBottomDepth) ? localBottomDepth : null,
    bottomClearanceMeters
  });
  return {
    type: 'anchor.sim.glider-dive-state-machine-step',
    version: GLIDER_DIVE_STATE_MACHINE_VERSION,
    model: GLIDER_DIVE_KINEMATICS_MODEL,
    state: next,
    previousDepthMeters: previousDepth,
    requestedDepthMeters: requestedDepth,
    targetDepthMeters: targetDepth,
    verticalVelocity,
    horizontalPropulsionContribution: horizontalSpeed,
    pitchRadians,
    phase,
    phaseTransitionEvents: events,
    layerCrossingEvents,
    bottomTurnEvent: events.find((event) => event.type === 'bottomTurn') ?? null,
    surfacingEvent: events.find((event) => event.type === 'surfacing') ?? null,
    warnings: warningsForLimits({ requestedDepth, targetDepth, terrainLimitedDepth, ratingLimitedDepth, bottomClearanceMeters }),
    failures: bottomClearanceMeters != null && bottomClearanceMeters < 0 ? ['seabedPenetrationPrevented'] : []
  };
}

export function gliderDiveStateMachineSummary(result = {}) {
  return {
    version: GLIDER_DIVE_STATE_MACHINE_VERSION,
    modelType: GLIDER_DIVE_KINEMATICS_MODEL.modelType,
    seaExplorerValidated: false,
    operationallyCalibrated: false,
    phase: result.phase ?? result.state?.divePhase ?? null,
    depthMeters: result.state?.position?.depthMeters ?? null,
    pitchRadians: result.pitchRadians ?? result.state?.pitchRadians ?? null,
    targetDepthMeters: result.targetDepthMeters ?? null,
    requestedCycleCount: result.requestedCycleCount ?? null,
    feasibleCycleCount: result.feasibleCycleCount ?? null,
    actualCompletedCycleCount: result.actualCompletedCycleCount ?? null,
    layerCrossingCount: result.layerCrossingEvents?.length ?? 0,
    warningCount: result.warnings?.length ?? 0
  };
}

function requestedDiveCycleCount(inputs, profile) {
  if (profile.id === 'surfaceOnly') return 0;
  const explicit = Number(inputs.cycleCount ?? inputs.requestedCycleCount ?? inputs.multiYoCycleCount);
  if (Number.isFinite(explicit) && explicit >= 0) return Math.max(0, Math.round(explicit));
  return 1;
}

function requestedTargetDepth(inputs, profile, config) {
  const explicit = finite(inputs.targetDepthMeters ?? inputs.maximumDepthMeters ?? inputs.requestedDepthMeters, NaN);
  if (Number.isFinite(explicit)) return Math.max(0, explicit);
  const targetLayer = inputs.targetDepthLayerId ?? profile.sequence?.findLast?.((id) => id !== 'surface') ?? profile.sequence?.at(-1) ?? config.depthLayerIds[0];
  return Math.max(0, finite(waterColumnLayerMetadata(targetLayer).nominalDepthMeters, 0));
}

function progressFromDistance(current, inputs, segmentLength) {
  if (segmentLength <= 0) return clamp01(inputs.segmentProgress ?? current.segmentProgress);
  const distance = finite(inputs.distanceAlongSegment ?? inputs.distanceTraveledAlongSegment, current.segmentProgress * segmentLength);
  return clamp01(distance / segmentLength);
}

function layerCrossings(fromDepth, toDepth, config, current, inputs) {
  const min = Math.min(fromDepth, toDepth);
  const max = Math.max(fromDepth, toDepth);
  const direction = toDepth >= fromDepth ? 'down' : 'up';
  return config.depthLayerIds.map((layerId) => ({ layerId, depthMeters: finite(waterColumnLayerMetadata(layerId).nominalDepthMeters, 0) }))
    .filter((layer) => layer.depthMeters > min && layer.depthMeters <= max)
    .map((layer) => ({
      type: 'layerCrossing',
      agentId: current.agentId,
      layerId: layer.layerId,
      depthMeters: layer.depthMeters,
      direction,
      t: finite(inputs.timeSeconds ?? current.timeSeconds, 0)
    }));
}

function warningsForLimits({ requestedDepth, targetDepth, terrainLimitedDepth, ratingLimitedDepth, bottomClearanceMeters }) {
  const warnings = [];
  if (targetDepth < requestedDepth - 1e-6) {
    if (terrainLimitedDepth <= targetDepth + 1e-6) warnings.push('Dive depth reduced by local bathymetry and bottom clearance.');
    if (ratingLimitedDepth <= targetDepth + 1e-6) warnings.push('Dive depth reduced by vehicle depth rating.');
  }
  if (bottomClearanceMeters != null && bottomClearanceMeters < 5) warnings.push('Bottom clearance is tight.');
  return warnings;
}

function phaseEvent(type, current, inputs, patch = {}) {
  return { type, agentId: current.agentId, t: finite(inputs.timeSeconds ?? current.timeSeconds, 0), ...patch };
}

function triangularCycle(value) {
  const local = clamp01(value);
  return local <= 0.5 ? local * 2 : (1 - local) * 2;
}

function cyclePhaseFor(localProgress, segmentProgress, depthMeters) {
  if (segmentProgress >= 1 || depthMeters <= 0.1 && localProgress > 0.95) return 'transmitting';
  if (depthMeters <= 0.25 && localProgress <= 0.04) return 'inflectingDown';
  if (localProgress < 0.46) return 'descending';
  if (localProgress <= 0.54) return 'bottomTurn';
  if (localProgress < 0.96) return 'ascending';
  return 'inflectingUp';
}

function profileProgressFromDepth(depth, targetDepth, phase) {
  if (targetDepth <= 0) return 0;
  const fraction = clamp01(depth / targetDepth);
  if (phase === 'ascending' || phase === 'inflectingUp' || phase === 'surfacing') return clamp01(1 - fraction / 2);
  return clamp01(fraction / 2);
}

function positivePitch(value) {
  return Math.abs(finite(value, 0.16));
}

function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

function positive(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : 0;
}