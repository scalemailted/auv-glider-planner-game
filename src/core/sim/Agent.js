import { getSelectedStart } from '../deployment/DeploymentZones.js';

export function createAgent(config) {
  const selectedStart = getSelectedStart(config);
  const rawStart = selectedStart ?? config.start ?? null;
  const x = Number.isFinite(Number(rawStart?.x)) ? Number(rawStart.x) : NaN;
  const y = Number.isFinite(Number(rawStart?.y)) ? Number(rawStart.y) : NaN;
  const battery = config.battery ?? 100;

  return {
    id: config.id,
    label: config.label ?? config.id,
    x,
    y,
    heading: -Math.PI / 2,
    velocity: { x: 0, y: 0 },
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
    status: 'ready',
    commsState: 'surfaced',
    lastSurfaceTime: 0,
    lastStepTime: 0,
    lastDepthMultiplier: 1,
    history: [{ x, y, t: 0 }]
  };
}
