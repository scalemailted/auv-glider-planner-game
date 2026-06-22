import { clamp, normalize } from '../math/MathUtils.js';
import { estimateBeachingRiskAtCell } from '../planning/ShorelineRisk.js';
import { computeHeadingCurrentComponents, currentEnergyMultiplier } from '../planning/CurrentAwareRouteCost.js';
import { normalizeWaterColumnConfig } from '../science/WaterColumnSchema.js';
import { applySeededStochasticDrift } from './StochasticDrift.js';
import { advanceGliderDiveStateMachine } from './GliderDiveStateMachine.js';

export function stepAgentToward(agent, target, world, dt, config = {}) {
  agent.lastStepTime = config.t ?? 0;
  agent.activeWaypoint = target ?? null;
  if (!Number.isFinite(Number(dt)) || Number(dt) < 0) {
    agent.status = 'invalidStep';
    setAgentVelocity(agent, { x: 0, y: 0, vertical: 0 }, { x: 0, y: 0, vertical: 0 }, { u: 0, v: 0, w: 0 });
    agent.history.push(snapshot(agent, config.t));
    return { moved: false, distance: 0, blocked: false, batteryDepleted: false, invalidStep: true };
  }

  if (!target || agent.completedPlan) {
    agent.status = agent.completedPlan ? 'complete' : 'idle';
    setAgentVelocity(agent, { x: 0, y: 0, vertical: 0 }, { x: 0, y: 0, vertical: 0 }, agent.currentVector ?? { u: 0, v: 0, w: 0 });
    agent.history.push(snapshot(agent, config.t));
    return { moved: false, distance: 0, blocked: false, batteryDepleted: false };
  }

  if (agent.battery <= 0) {
    agent.status = 'batteryDepleted';
    setAgentVelocity(agent, { x: 0, y: 0, vertical: 0 }, { x: 0, y: 0, vertical: 0 }, agent.currentVector ?? { u: 0, v: 0, w: 0 });
    agent.history.push(snapshot(agent, config.t));
    return { moved: false, distance: 0, blocked: false, batteryDepleted: true };
  }

  if (!isFinitePoint(agent) || !isFinitePoint(target)) {
    agent.status = 'invalidPosition';
    setAgentVelocity(agent, { x: 0, y: 0, vertical: 0 }, { x: 0, y: 0, vertical: 0 }, agent.currentVector ?? { u: 0, v: 0, w: 0 });
    agent.history.push(snapshot(agent, config.t));
    return { moved: false, distance: 0, blocked: false, batteryDepleted: false, invalidPosition: true };
  }

  const dxToTarget = target.x - agent.x;
  const dyToTarget = target.y - agent.y;
  const distanceToTarget = Math.hypot(dxToTarget, dyToTarget);
  const [nx, ny] = normalize(dxToTarget, dyToTarget);
  const commandSpeed = Math.min(Number(agent.maxSpeed ?? 1), distanceToTarget / Math.max(Number(dt) || 1, 1e-6));
  const commandVx = nx * commandSpeed;
  const commandVy = ny * commandSpeed;
  const sampledCurrent = world.sampleCurrent(agent.x, agent.y, config.t ?? 0, agent.depthMeters ?? 0);
  const driftSample = applySeededStochasticDrift(sampledCurrent, {
    mission: config.mission,
    agentId: agent.id,
    t: config.t ?? 0
  });
  const [currentX, currentY] = driftSample.current;
  const driftGain = config.driftGain ?? 0.5;
  const vx = commandVx + driftGain * currentX;
  const vy = commandVy + driftGain * currentY;
  const oldX = agent.x;
  const oldY = agent.y;
  const waypointIdentity = waypointIdentityForDive(target, agent.currentWaypointIndex);
  if (agent.activeWaypointIdForDive !== waypointIdentity || !Number.isFinite(Number(agent.activeSegmentInitialDistance)) || Number(agent.activeSegmentInitialDistance) <= 0) {
    agent.activeWaypointIdForDive = waypointIdentity;
    agent.activeSegmentInitialDistance = Math.max(distanceToTarget, 1e-6);
    agent.segmentProgress = 0;
  }
  const segmentInitialDistance = Math.max(Number(agent.activeSegmentInitialDistance ?? distanceToTarget), 1e-6);
  const nextX = clamp(agent.x + vx * dt, 0, world.grid.width - 1);
  const nextY = clamp(agent.y + vy * dt, 0, world.grid.height - 1);
  if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) {
    agent.status = 'invalidPosition';
    setAgentVelocity(agent, { x: 0, y: 0, vertical: 0 }, { x: 0, y: 0, vertical: 0 }, { u: currentX, v: currentY, w: 0 });
    agent.history.push(snapshot(agent, config.t));
    return { moved: false, distance: 0, blocked: false, batteryDepleted: false, invalidPosition: true };
  }
  const frame = world.getFrame?.(config.t ?? 0);
  const beachingRisk = estimateBeachingRiskAtCell({ level: world.level, frame, x: nextX, y: nextY });
  const blocked = world.isBlocked(nextX, nextY);
  const attemptedPosition = { x: nextX, y: nextY };
  const blockedCell = blocked ? { x: Math.floor(nextX), y: Math.floor(nextY) } : null;

  if (!blocked) {
    agent.x = nextX;
    agent.y = nextY;
    agent.blockedSteps = 0;
    agent.lastBlockedCell = null;
    agent.lastBlockedPosition = null;
    agent.status = 'enroute';
  } else {
    agent.blockedSteps += 1;
    agent.lastBlockedCell = blockedCell;
    agent.lastBlockedPosition = attemptedPosition;
    agent.status = 'blocked';
  }

  const groundHorizontal = blocked ? { x: 0, y: 0 } : { x: vx, y: vy };
  if (!blocked && Math.hypot(vx, vy) > 1e-6) {
    agent.heading = Math.atan2(vy, vx);
    agent.headingRadians = agent.heading;
    agent.courseOverGroundRadians = agent.heading;
  }
  const remainingDistance = Math.hypot(Number(target.x) - Number(agent.x), Number(target.y) - Number(agent.y));
  const segmentProgress = clamp(1 - remainingDistance / segmentInitialDistance, 0, 1);
  const diveOutcome = advanceContinuousDiveState(agent, target, world, dt, config, {
    segmentInitialDistance,
    segmentProgress,
    horizontalSpeed: Math.hypot(commandVx, commandVy),
    currentX,
    currentY,
    groundHorizontal,
    commandVx,
    commandVy
  });
  const verticalVelocity = Number(diveOutcome?.verticalVelocity ?? agent.velocity?.vertical ?? 0);
  setAgentVelocity(agent, {
    x: blocked ? 0 : commandVx,
    y: blocked ? 0 : commandVy,
    vertical: verticalVelocity
  }, {
    x: groundHorizontal.x,
    y: groundHorizontal.y,
    vertical: verticalVelocity
  }, { u: currentX, v: currentY, w: 0 });

  const distance = Math.hypot(agent.x - oldX, agent.y - oldY);
  const depthMultiplier = world.depthEnergyMultiplier?.(agent.x, agent.y) ?? config.depthEnergyMultiplier ?? 1;
  const commandedDistance = commandSpeed * dt;
  const baseEnergy = commandedDistance * (config.energyPerCell ?? 1);
  const currentComponents = computeHeadingCurrentComponents({ u: currentX, v: currentY }, { x: nx, y: ny });
  const currentMultiplier = currentEnergyMultiplier({
    ...currentComponents,
    driftGain,
    shorelineRisk: beachingRisk.value ?? 0,
    depthPenalty: Math.max(0, Number(depthMultiplier ?? 1) - 1)
  });
  const shorelineEnergyPenalty = !blocked && distance > 0 ? baseEnergy * Math.max(0, Number(beachingRisk.energyMultiplier ?? 1) - 1) : 0;
  const currentEnergyAdjustment = !blocked && distance > 0 ? baseEnergy * (currentMultiplier - 1) : 0;
  const energy = Math.max(0, baseEnergy * depthMultiplier * currentMultiplier + shorelineEnergyPenalty);
  agent.energyUsed += energy;
  agent.battery = Math.max(0, agent.battery - energy);
  if (agent.battery <= 0 && distance > 0) agent.status = 'batteryDepleted';
  agent.history.push(snapshot(agent, config.t));

  return {
    moved: distance > 0,
    distance,
    blocked,
    batteryDepleted: agent.battery <= 0,
    current: [currentX, currentY],
    baseCurrent: sampledCurrent,
    stochasticDriftNoise: driftSample.noise,
    stochasticDriftRules: driftSample.rules,
    command: [commandVx, commandVy],
    velocity: [groundHorizontal.x, groundHorizontal.y, verticalVelocity],
    attemptedPosition,
    attemptedCell: { x: Math.floor(nextX), y: Math.floor(nextY) },
    blockedCell,
    depthMultiplier,
    baseEnergy,
    commandedDistance,
    energy,
    currentEnergyMultiplier: currentMultiplier,
    currentEnergyAdjustment,
    alongTrackCurrent: currentComponents.alongTrackCurrent,
    crossTrackCurrent: currentComponents.crossTrackCurrent,
    speedOverGround: Math.hypot(groundHorizontal.x, groundHorizontal.y),
    shorelineEnergyPenalty,
    beachingRisk,
    diveState: diveOutcome?.state ?? null,
    diveModel: diveOutcome?.model ?? null,
    diveWarnings: diveOutcome?.warnings ?? [],
    diveEvents: diveOutcome?.phaseTransitionEvents ?? [],
    layerCrossingEvents: diveOutcome?.layerCrossingEvents ?? [],
    bottomTurnEvent: diveOutcome?.bottomTurnEvent ?? null,
    surfacingEvent: diveOutcome?.surfacingEvent ?? null,
    targetDepthMeters: diveOutcome?.targetDepthMeters ?? null,
    requestedDepthMeters: diveOutcome?.requestedDepthMeters ?? null
  };
}

function advanceContinuousDiveState(agent, target, world, dt, config, step) {
  const waterColumnConfig = normalizeWaterColumnConfig(config.waterColumnConfig
    ?? config.mission?.waterColumnConfig
    ?? config.mission?.world?.waterColumnConfig
    ?? world.level?.world?.waterColumnConfig
    ?? { depthLayerIds: ['surface'], diveProfileId: 'surfaceOnly' });
  const localBathymetryMeters = Number(world.sampleBottomDepthMeters?.(agent.x, agent.y) ?? Infinity);
  const state = {
    agentId: agent.id,
    position: { x: agent.x, y: agent.y, depthMeters: agent.depthMeters ?? 0 },
    velocity: agent.velocity ?? { x: 0, y: 0, vertical: 0 },
    waterRelativeVelocity: agent.waterRelativeVelocity ?? { x: 0, y: 0, vertical: 0 },
    groundRelativeVelocity: agent.groundRelativeVelocity ?? { x: 0, y: 0, vertical: 0 },
    headingRadians: agent.headingRadians ?? agent.heading ?? 0,
    courseOverGroundRadians: agent.courseOverGroundRadians ?? agent.heading ?? 0,
    pitchRadians: agent.pitchRadians ?? 0,
    rollRadians: agent.rollRadians ?? 0,
    divePhase: agent.divePhase ?? 'surfaced',
    profileProgress: agent.profileProgress ?? 0,
    segmentProgress: step.segmentProgress,
    surfaced: Number(agent.depthMeters ?? 0) <= 0.1,
    transmitting: agent.divePhase === 'transmitting',
    timeSeconds: config.t ?? 0,
    bottomDepthMeters: Number.isFinite(localBathymetryMeters) ? localBathymetryMeters : null,
    bottomClearanceMeters: Number.isFinite(localBathymetryMeters) ? localBathymetryMeters - Number(agent.depthMeters ?? 0) : null,
    currentVector: { u: step.currentX, v: step.currentY, w: 0 }
  };
  const result = advanceGliderDiveStateMachine(state, {
    dt,
    timeSeconds: config.t ?? 0,
    waterColumnConfig,
    mission: config.mission,
    diveProfileId: target.diveProfileId ?? target.profileId ?? config.agentPlan?.diveProfileId ?? agent.diveProfileId ?? config.mission?.rules?.waterColumn?.defaultDiveProfileId ?? waterColumnConfig.diveProfileId,
    targetDepthLayerId: target.targetDepthLayerId ?? target.depthLayerId ?? target.depthLayer ?? config.agentPlan?.targetDepthLayerId ?? config.agentPlan?.depthLayerId ?? agent.targetDepthLayerId ?? config.mission?.rules?.waterColumn?.defaultTargetDepthLayerId ?? waterColumnConfig.defaultLayerIds?.[0],
    targetDepthMeters: target.depthMeters ?? target.maximumDepthMeters ?? target.maximumDiveDepthMeters ?? config.agentPlan?.maximumDiveDepthMeters ?? config.agentPlan?.maximumDepthMeters,
    cycleCount: target.cycleCount ?? target.requestedCycleCount ?? config.agentPlan?.cycleCount ?? agent.cycleCount ?? config.mission?.rules?.waterColumn?.cycleCount,
    localBathymetryMeters,
    segmentLength: step.segmentInitialDistance,
    segmentProgress: step.segmentProgress,
    horizontalSpeed: step.horizontalSpeed,
    currentVector: { u: step.currentX, v: step.currentY, w: 0 },
    maxVehicleDepthMeters: agent.maxDepthMeters ?? config.mission?.physics?.maxVehicleDepthMeters ?? config.mission?.physics?.vehicleDepthRatingMeters,
    minimumBottomClearanceMeters: config.mission?.physics?.minimumBottomClearanceMeters ?? config.mission?.physics?.bottomClearanceMeters ?? 5,
    verticalSpeedMetersPerSecond: config.mission?.physics?.verticalSpeedMetersPerSecond ?? config.mission?.physics?.verticalSpeed ?? 0.18
  });
  const next = result.state;
  agent.depthMeters = next.position.depthMeters;
  agent.pitchRadians = next.pitchRadians;
  agent.rollRadians = next.rollRadians;
  agent.divePhase = next.divePhase;
  agent.profileProgress = next.profileProgress;
  agent.segmentProgress = next.segmentProgress;
  agent.bottomDepthMeters = next.bottomDepthMeters;
  agent.bottomClearanceMeters = next.bottomClearanceMeters;
  agent.continuousState = next;
  return result;
}

function setAgentVelocity(agent, waterRelativeVelocity, groundRelativeVelocity, currentVector) {
  agent.waterRelativeVelocity = { ...waterRelativeVelocity };
  agent.groundRelativeVelocity = { ...groundRelativeVelocity };
  agent.velocity = { ...groundRelativeVelocity };
  agent.currentVector = { ...currentVector };
}

function waypointIdentityForDive(target, index) {
  return String(target?.id ?? target?.waypointId ?? `${index ?? 0}:${target?.x ?? 0},${target?.y ?? 0}`);
}

function isFinitePoint(point) {
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y));
}

function snapshot(agent, t = 0) {
  return {
    x: agent.x,
    y: agent.y,
    t,
    depthMeters: finite(agent.depthMeters, 0),
    depthLayerId: agent.depthLayerId ?? null,
    heading: agent.heading,
    headingRadians: finite(agent.headingRadians ?? agent.heading, 0),
    courseOverGroundRadians: finite(agent.courseOverGroundRadians ?? agent.heading, 0),
    pitchRadians: finite(agent.pitchRadians, 0),
    rollRadians: finite(agent.rollRadians, 0),
    divePhase: agent.divePhase ?? 'surfaced',
    profileProgress: finite(agent.profileProgress, 0),
    segmentProgress: finite(agent.segmentProgress, 0),
    velocity: agent.velocity ? { ...agent.velocity } : { x: 0, y: 0, vertical: 0 },
    waterRelativeVelocity: agent.waterRelativeVelocity ? { ...agent.waterRelativeVelocity } : { x: 0, y: 0, vertical: 0 },
    groundRelativeVelocity: agent.groundRelativeVelocity ? { ...agent.groundRelativeVelocity } : { x: 0, y: 0, vertical: 0 },
    currentVector: agent.currentVector ? { ...agent.currentVector } : { u: 0, v: 0, w: 0 },
    bottomDepthMeters: agent.bottomDepthMeters ?? null,
    bottomClearanceMeters: agent.bottomClearanceMeters ?? null,
    battery: agent.battery,
    energyUsed: agent.energyUsed,
    waypointIndex: agent.currentWaypointIndex,
    status: agent.status
  };
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}