import { getSelectedStart } from '../deployment/DeploymentZones.js';
import { clipLineToTerrain } from './RoutePreview.js';

export function buildRouteSegmentsForAgent({ level, mission, agent, agentPlan, surfacedAgents = [], planningAnchor = null } = {}) {
  const resolvedAgent = agent ?? mission?.agents?.find((candidate) => candidate.id === agentPlan?.agentId);
  const waypoints = (agentPlan?.waypoints ?? []).filter(isFinitePoint);
  if (!resolvedAgent || !waypoints.length) {
    return {
      anchor: resolveRouteAnchor({ agent: resolvedAgent, agentPlan, surfacedAgents, planningAnchor }),
      missingAnchor: false,
      segments: []
    };
  }
  const anchor = resolveRouteAnchor({ agent: resolvedAgent, agentPlan, surfacedAgents, planningAnchor });
  if (!isFinitePoint(anchor)) {
    return {
      anchor,
      missingAnchor: true,
      message: 'Choose deployment cell first.',
      segments: []
    };
  }

  const points = [
    anchor,
    ...waypoints.map((waypoint, index) => ({
      ...waypoint,
      source: 'waypoint',
      waypointIndex: index
    }))
  ];
  const segments = [];
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    const clipped = clipLineToTerrain(from, to, level, { mission });
    segments.push({
      from,
      to,
      kind: index === 1 ? 'startToWaypoint' : 'waypointToWaypoint',
      waypointIndex: index - 1,
      valid: clipped.valid,
      points: clipped.points,
      blockedAt: clipped.blockedAt,
      lastValid: clipped.lastValid,
      reason: clipped.reason ?? null
    });
  }
  return { anchor, missingAnchor: false, segments };
}

export function resolveRouteAnchor({ agent, agentPlan = null, surfacedAgents = [], planningAnchor = null } = {}) {
  const agentId = agent?.id ?? agentPlan?.agentId;
  const surfaced = (surfacedAgents ?? []).find((candidate) => candidate.id === agentId || candidate.agentId === agentId);
  if (isFinitePoint(surfaced)) {
    return { x: Number(surfaced.x), y: Number(surfaced.y), t: Number(surfaced.t ?? 0), source: 'surfaced', window: 0 };
  }
  if (planningAnchor?.agentId === agentId && isFinitePoint(planningAnchor) && planningAnchor.source === 'surfaced') {
    return { x: Number(planningAnchor.x), y: Number(planningAnchor.y), t: Number(planningAnchor.t ?? 0), source: 'surfaced', window: 0 };
  }
  if (isFinitePoint(agentPlan?.selectedStart)) {
    return { x: Number(agentPlan.selectedStart.x), y: Number(agentPlan.selectedStart.y), source: 'selectedStart', window: 0 };
  }
  const selectedStart = getSelectedStart(agent);
  if (isFinitePoint(selectedStart)) {
    return { x: Number(selectedStart.x), y: Number(selectedStart.y), source: 'selectedStart', window: 0 };
  }
  if (isFinitePoint(agent?.start)) {
    return { x: Number(agent.start.x), y: Number(agent.start.y), source: 'start', window: 0 };
  }
  return { x: NaN, y: NaN, source: 'missingStart', window: 0 };
}

function isFinitePoint(point) {
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y));
}
