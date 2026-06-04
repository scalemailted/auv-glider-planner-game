import { clamp, normalize } from '../math/MathUtils.js';
import { applySeededStochasticDrift } from './StochasticDrift.js';

export function stepAgentToward(agent, target, world, dt, config = {}) {
  agent.lastStepTime = config.t ?? 0;
  agent.activeWaypoint = target ?? null;
  if (!Number.isFinite(Number(dt)) || Number(dt) < 0) {
    agent.status = 'invalidStep';
    agent.velocity = { x: 0, y: 0 };
    agent.history.push(snapshot(agent, config.t));
    return { moved: false, distance: 0, blocked: false, batteryDepleted: false, invalidStep: true };
  }

  if (!target || agent.completedPlan) {
    agent.status = agent.completedPlan ? 'complete' : 'idle';
    agent.velocity = { x: 0, y: 0 };
    agent.history.push(snapshot(agent, config.t));
    return { moved: false, distance: 0, blocked: false, batteryDepleted: false };
  }

  if (agent.battery <= 0) {
    agent.status = 'batteryDepleted';
    agent.velocity = { x: 0, y: 0 };
    agent.history.push(snapshot(agent, config.t));
    return { moved: false, distance: 0, blocked: false, batteryDepleted: true };
  }

  if (!isFinitePoint(agent) || !isFinitePoint(target)) {
    agent.status = 'invalidPosition';
    agent.velocity = { x: 0, y: 0 };
    agent.history.push(snapshot(agent, config.t));
    return { moved: false, distance: 0, blocked: false, batteryDepleted: false, invalidPosition: true };
  }

  const [nx, ny] = normalize(target.x - agent.x, target.y - agent.y);
  const commandVx = nx * agent.maxSpeed;
  const commandVy = ny * agent.maxSpeed;
  const sampledCurrent = world.sampleCurrent(agent.x, agent.y, config.t ?? 0);
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
  const nextX = clamp(agent.x + vx * dt, 0, world.grid.width - 1);
  const nextY = clamp(agent.y + vy * dt, 0, world.grid.height - 1);
  if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) {
    agent.status = 'invalidPosition';
    agent.velocity = { x: 0, y: 0 };
    agent.history.push(snapshot(agent, config.t));
    return { moved: false, distance: 0, blocked: false, batteryDepleted: false, invalidPosition: true };
  }
  const blocked = world.isBlocked(nextX, nextY);

  if (!blocked) {
    agent.x = nextX;
    agent.y = nextY;
    agent.blockedSteps = 0;
    agent.status = 'enroute';
  } else {
    agent.blockedSteps += 1;
    agent.status = 'blocked';
  }

  agent.velocity = blocked ? { x: 0, y: 0 } : { x: vx, y: vy };
  if (!blocked && Math.hypot(vx, vy) > 1e-6) agent.heading = Math.atan2(vy, vx);
  const distance = Math.hypot(agent.x - oldX, agent.y - oldY);
  const depthMultiplier = world.depthEnergyMultiplier?.(agent.x, agent.y) ?? config.depthEnergyMultiplier ?? 1;
  const baseEnergy = distance * (config.energyPerCell ?? 1);
  const energy = baseEnergy * depthMultiplier;
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
    velocity: [vx, vy],
    depthMultiplier,
    baseEnergy,
    energy
  };
}

function isFinitePoint(point) {
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y));
}

function snapshot(agent, t = 0) {
  return {
    x: agent.x,
    y: agent.y,
    t,
    heading: agent.heading,
    velocity: agent.velocity ? { ...agent.velocity } : { x: 0, y: 0 },
    battery: agent.battery,
    energyUsed: agent.energyUsed,
    waypointIndex: agent.currentWaypointIndex,
    status: agent.status
  };
}
