import { getSelectedStart } from '../deployment/DeploymentZones.js';

export function createAgent(config) {
  const selectedStart = getSelectedStart(config);
  const rawStart = selectedStart ?? config.start ?? null;
  const x = Number.isFinite(Number(rawStart?.x)) ? Number(rawStart.x) : NaN;
  const y = Number.isFinite(Number(rawStart?.y)) ? Number(rawStart.y) : NaN;
  const battery = config.battery ?? 100;
  const depthMeters = finiteNumber(config.depthMeters ?? config.start?.depthMeters, 0);
  const heading = finiteNumber(config.headingRadians ?? config.heading, -Math.PI / 2);

  return {
    id: config.id,
    label: config.label ?? config.id,
    x,
    y,
    depthMeters,
    heading,
    headingRadians: heading,
    courseOverGroundRadians: heading,
    pitchRadians: finiteNumber(config.pitchRadians, 0),
    rollRadians: finiteNumber(config.rollRadians, 0),
    velocity: { x: 0, y: 0, vertical: 0 },
    waterRelativeVelocity: { x: 0, y: 0, vertical: 0 },
    groundRelativeVelocity: { x: 0, y: 0, vertical: 0 },
    currentVector: { u: 0, v: 0, w: 0 },
    divePhase: depthMeters > 0 ? 'descending' : 'surfaced',
    diveProfileId: config.diveProfileId ?? config.defaultDiveProfileId ?? null,
    targetDepthLayerId: config.targetDepthLayerId ?? config.depthLayerId ?? config.defaultTargetDepthLayerId ?? null,
    maximumDiveDepthMeters: finiteOptionalNumber(config.maximumDiveDepthMeters ?? config.maximumDepthMeters ?? config.maxDepthMeters),
    cycleCount: finiteOptionalNumber(config.cycleCount ?? config.requestedCycleCount),
    profileProgress: 0,
    segmentProgress: 0,
    bottomDepthMeters: null,
    bottomClearanceMeters: null,
    continuousState: null,
    activeSegmentInitialDistance: null,
    activeWaypointIdForDive: null,
    battery,
    maxBattery: battery,
    maxSpeed: config.maxSpeed ?? 1,
    samplingRadius: config.samplingRadius ?? 0.75,
    collisionRadius: config.collisionRadius ?? 0.5,
    energyUsed: 0,
    sampleScore: 0,
    hazardsHit: 0,
    currentWaypointIndex: 0,
    completedWaypoints: [],
    missedWaypoints: [],
    waypointTolerance: config.waypointTolerance ?? 0.35,
    completedPlan: false,
    activeWaypoint: null,
    blockedSteps: 0,
    lastBlockedCell: null,
    lastBlockedPosition: null,
    status: 'ready',
    commsState: 'surfaced',
    lastSurfaceTime: 0,
    lastStepTime: 0,
    lastDepthMultiplier: 1,
    history: [{
      x,
      y,
      t: 0,
      depthMeters,
      heading,
      headingRadians: heading,
      courseOverGroundRadians: heading,
      pitchRadians: finiteNumber(config.pitchRadians, 0),
      rollRadians: finiteNumber(config.rollRadians, 0),
      divePhase: depthMeters > 0 ? 'descending' : 'surfaced',
      velocity: { x: 0, y: 0, vertical: 0 },
      waterRelativeVelocity: { x: 0, y: 0, vertical: 0 },
      groundRelativeVelocity: { x: 0, y: 0, vertical: 0 },
      currentVector: { u: 0, v: 0, w: 0 }
    }]
  };
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function finiteOptionalNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
