import { distance } from '../math/MathUtils.js';

export function getActiveWaypoint(agent, plan) {
  const agentPlan = getPlanForAgent(plan, agent.id);
  if (!agentPlan || agent.completedPlan) return null;

  const waypoint = agentPlan.waypoints[agent.currentWaypointIndex];
  return waypoint ?? null;
}

export function advanceWaypointIfReached(agent, plan, tolerance = agent.waypointTolerance ?? 0.35) {
  const waypoint = getActiveWaypoint(agent, plan);
  if (!waypoint || distance(agent, waypoint) > tolerance) return null;

  const waypointIndex = agent.currentWaypointIndex;
  waypoint.executionStatus = 'completed';
  agent.completedWaypoints.push({
    waypointId: waypoint.id,
    waypointIndex,
    t: agent.lastStepTime ?? 0
  });

  const agentPlan = getPlanForAgent(plan, agent.id);
  if (agent.currentWaypointIndex < agentPlan.waypoints.length - 1) {
    agent.currentWaypointIndex += 1;
    agent.status = 'enroute';
  } else {
    agent.completedPlan = true;
    agent.status = 'complete';
  }

  return waypoint;
}

export function markWaypointMissed(agent, waypoint, reason, t, details = {}) {
  if (!waypoint) return null;
  const waypointId = waypoint.id ?? `${agent.id}:wp:${agent.currentWaypointIndex}`;
  const alreadyMissed = agent.missedWaypoints.some((missed) => missed.waypointId === waypointId || missed.waypointIndex === agent.currentWaypointIndex);
  if (alreadyMissed || waypoint.executionStatus === 'missed') {
    agent.currentWaypointIndex += 1;
    return null;
  }

  const event = {
    type: 'missedWaypoint',
    t,
    agentId: agent.id,
    waypointId,
    waypointIndex: agent.currentWaypointIndex,
    x: waypoint.x,
    y: waypoint.y,
    reason,
    blockedCell: details.blockedCell ?? null,
    attemptedPosition: details.attemptedPosition ?? null,
    routeBlockDetails: details.routeBlockDetails ?? null,
    finalPosition: details.finalPosition ?? null,
    missionDuration: details.missionDuration ?? null,
    finalInstruction: details.finalInstruction ?? null,
    finalWaypointReached: details.finalWaypointReached ?? null,
    terminalCarryThrough: Boolean(details.terminalCarryThrough)
  };
  waypoint.executionStatus = 'missed';
  waypoint.executionReason = reason;
  agent.missedWaypoints.push(event);
  agent.currentWaypointIndex += 1;
  agent.status = 'missedWaypoint';
  agent.waypointSafety = null;
  return event;
}

export function detectMissedWaypoint(agent, waypoint, t, config = {}) {
  if (!waypoint) return null;
  if (config.invalidTarget) return markWaypointMissed(agent, waypoint, 'invalidWaypoint', t);
  if (!isFiniteWaypoint(waypoint)) return markWaypointMissed(agent, waypoint, 'invalidWaypoint', t);
  if (config.outOfBounds) return markWaypointMissed(agent, waypoint, 'outOfBoundsTarget', t);
  if (agent.battery <= 0) return markWaypointMissed(agent, waypoint, 'batteryDepleted', t);
  if (config.blockedTarget) {
    return markWaypointMissed(agent, waypoint, 'blockedTarget', t, {
      blockedCell: config.blockedCell ?? { x: Math.floor(Number(waypoint.x)), y: Math.floor(Number(waypoint.y)) },
      routeBlockDetails: config.routeBlockDetails ?? null
    });
  }
  if ((agent.blockedSteps ?? 0) >= (config.maxBlockedSteps ?? 8)) {
    return markWaypointMissed(agent, waypoint, 'blockedMovement', t, {
      blockedCell: config.blockedCell ?? agent.lastBlockedCell ?? null,
      attemptedPosition: config.attemptedPosition ?? agent.lastBlockedPosition ?? null,
      routeBlockDetails: config.routeBlockDetails ?? null
    });
  }
  if ((agent.waypointSafety?.stalledSteps ?? 0) >= (config.maxStalledSteps ?? 90)) return markWaypointMissed(agent, waypoint, 'unreachableStalled', t);
  if ((agent.waypointSafety?.elapsed ?? 0) >= (config.maxWaypointTravelTime ?? Infinity)) return markWaypointMissed(agent, waypoint, 'waypointTimeout', t);
  return null;
}

export function getWaypointProgress(agent, plan) {
  const agentPlan = getPlanForAgent(plan, agent.id);
  const total = agentPlan?.waypoints?.length ?? 0;
  const activeWaypoint = getActiveWaypoint(agent, plan);
  return {
    total,
    currentWaypointIndex: agent.currentWaypointIndex,
    activeWaypoint,
    completed: agent.completedWaypoints.length,
    missed: agent.missedWaypoints.length,
    complete: agent.completedPlan || agent.currentWaypointIndex >= total
  };
}

function getPlanForAgent(plan, agentId) {
  return plan?.agentPlans?.find((agentPlan) => agentPlan.agentId === agentId) ?? null;
}

function isFiniteWaypoint(waypoint) {
  return Number.isFinite(Number(waypoint?.x)) && Number.isFinite(Number(waypoint?.y));
}
