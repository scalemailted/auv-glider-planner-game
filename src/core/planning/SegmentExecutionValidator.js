import { createAgent } from '../sim/Agent.js';
import { stepAgentToward } from '../sim/Physics.js';
import { SIMULATION_LIMITS } from '../sim/SimulationSafety.js';
import { TruthWorld } from '../sim/TruthWorld.js';
import { evaluateReachability, isCellNavigable } from './Navigability.js';

export function evaluateSegmentForExecution({
  level = null,
  mission = null,
  agent = null,
  from = null,
  to = null,
  startTime = 0,
  travelTime = null,
  fuelRemaining = null,
  frame = null
} = {}) {
  if (!level || !mission || !agent || !isFinitePoint(from) || !isFinitePoint(to)) {
    return blockedResult('invalidPoint', 'Segment has invalid endpoint coordinates.', { from, to });
  }
  const startNav = isCellNavigable(level, mission, from.x, from.y);
  if (!startNav.ok) return blockedResult(startNav.reason, 'Segment start is not navigable.', { blockedCell: startNav.cell });
  const targetNav = isCellNavigable(level, mission, to.x, to.y);
  if (!targetNav.ok) return blockedResult(targetNav.reason, 'Segment target is not navigable.', { blockedCell: targetNav.cell });
  const reachability = evaluateReachability(from, to, { level, mission });
  if (reachability.reachable === false) {
    return blockedResult(reachability.reason ?? 'noLegalPath', 'No legal navigable path exists for this segment.', {
      blockedCell: reachability.blockedCell,
      reachability
    });
  }

  const dt = getSafeStepDt(level);
  const waypointTolerance = Number(agent.waypointTolerance ?? 0.35);
  const timeBudget = Number.isFinite(Number(travelTime))
    ? Math.max(Number(travelTime) * 1.65 + dt * SIMULATION_LIMITS.maxBlockedWaypointSteps, Number(travelTime) + dt)
    : Math.max(1, Math.hypot(Number(to.x) - Number(from.x), Number(to.y) - Number(from.y)) / Math.max(0.05, Number(agent.maxSpeed ?? 1))) * 2;
  const maxSteps = Math.min(
    SIMULATION_LIMITS.maxRunUntilCompleteSteps,
    Math.max(1, Math.ceil(timeBudget / dt) + SIMULATION_LIMITS.maxBlockedWaypointSteps + 4)
  );
  const simAgent = createAgent({
    ...agent,
    start: { x: Number(from.x), y: Number(from.y) },
    battery: Number.isFinite(Number(fuelRemaining)) ? Number(fuelRemaining) : Number(agent.battery ?? agent.maxBattery ?? 100)
  });
  simAgent.x = Number(from.x);
  simAgent.y = Number(from.y);
  simAgent.history = [];
  const world = createExecutionWorld(level, mission, frame);
  const target = { x: Number(to.x), y: Number(to.y) };
  const driftGain = Number(mission?.rules?.drift?.driftGain ?? mission?.physics?.driftGain ?? 0.5);
  const energyPerCell = Number(mission?.physics?.energyPerCell ?? 1);
  let blockedSteps = 0;
  let lastOutcome = null;
  let t = Number(startTime ?? 0);

  for (let step = 0; step < maxSteps; step += 1) {
    const distance = Math.hypot(simAgent.x - target.x, simAgent.y - target.y);
    if (distance <= waypointTolerance) {
      return {
        ok: true,
        reason: 'reachable',
        pathCells: reachability.pathCells,
        finalPosition: { x: simAgent.x, y: simAgent.y, t },
        travelTime: Math.max(0, t - Number(startTime ?? 0)),
        energyCost: simAgent.energyUsed,
        blockedCell: null,
        blockedSteps,
        warnings: []
      };
    }
    lastOutcome = stepAgentToward(simAgent, target, world, dt, {
      t,
      mission,
      driftGain,
      energyPerCell
    });
    if (lastOutcome.blocked) {
      blockedSteps += 1;
      if (blockedSteps >= SIMULATION_LIMITS.maxBlockedWaypointSteps) {
        return blockedResult('routeBlocked', 'Simulation movement would be blocked by terrain.', {
          blockedCell: { x: Math.floor(simAgent.x), y: Math.floor(simAgent.y) },
          travelTime: Math.max(0, t - Number(startTime ?? 0)),
          energyCost: simAgent.energyUsed,
          blockedSteps
        });
      }
    } else {
      blockedSteps = 0;
    }
    if (simAgent.battery <= 0) {
      return blockedResult('fuelExceeded', 'Segment would exhaust fuel before reaching the waypoint.', {
        travelTime: Math.max(0, t - Number(startTime ?? 0)),
        energyCost: simAgent.energyUsed
      });
    }
    t += dt;
  }

  return blockedResult(lastOutcome?.blocked ? 'routeBlocked' : 'waypointTimeout', 'Simulation movement did not reach the waypoint within the segment budget.', {
    blockedCell: lastOutcome?.blocked ? { x: Math.floor(simAgent.x), y: Math.floor(simAgent.y) } : null,
    travelTime: Math.max(0, t - Number(startTime ?? 0)),
    energyCost: simAgent.energyUsed,
    blockedSteps
  });
}

function blockedResult(reason, message, extra = {}) {
  return {
    ok: false,
    severity: 'blocking',
    reason,
    message,
    pathCells: [],
    travelTime: extra.travelTime ?? Infinity,
    energyCost: extra.energyCost ?? Infinity,
    finalPosition: extra.finalPosition ?? null,
    warnings: [],
    blockedCell: extra.blockedCell ?? null,
    blockedSteps: extra.blockedSteps ?? 0,
    reachability: extra.reachability ?? null,
    from: extra.from ?? null,
    to: extra.to ?? null
  };
}

function getSafeStepDt(level) {
  const dt = Number(level?.world?.time?.dt ?? 0.25);
  return Number.isFinite(dt) && dt > 0 ? dt : 0.25;
}

function createExecutionWorld(level, mission, frame = null) {
  const world = new TruthWorld(level, mission);
  if (!frame) return world;
  return {
    ...world,
    level,
    mission,
    grid: world.grid,
    getFrame: () => frame,
    sampleCurrent: (x, y) => {
      const grid = level?.world?.grid ?? {};
      const cx = Math.max(0, Math.min(Number(grid.width ?? 1) - 1, Math.floor(Number(x) || 0)));
      const cy = Math.max(0, Math.min(Number(grid.height ?? 1) - 1, Math.floor(Number(y) || 0)));
      return frame?.current?.[cy]?.[cx] ?? [0, 0];
    },
    sampleROI: (...args) => world.sampleROI(...args),
    sampleROIObject: (...args) => world.sampleROIObject(...args),
    sampleDepth: (...args) => world.sampleDepth(...args),
    depthEnergyMultiplier: (...args) => world.depthEnergyMultiplier(...args),
    isBlocked: (...args) => world.isBlocked(...args),
    hazardAt: (...args) => world.hazardAt(...args),
    mobileHazardAt: (...args) => world.mobileHazardAt(...args),
    clampCell: (...args) => world.clampCell(...args)
  };
}

function isFinitePoint(point) {
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y));
}
