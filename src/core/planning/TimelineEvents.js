import { getWindowForTime } from '../time/MissionTime.js';
import { normalizeWaypointKind, waypointKindLabel } from './WaypointSemantics.js';

export function buildTimelineEvents({
  plan,
  selectedAgentId,
  priorityTargets = [],
  level,
  showMarkers = true,
  showStars = true
} = {}) {
  const agentPlan = (plan?.agentPlans ?? []).find((candidate) => candidate.agentId === selectedAgentId);
  return buildTimelineEventsForAgent(agentPlan, null, level, {
    selectedAgentId,
    planningMarkers: showMarkers ? (plan?.planningMarkers ?? []) : [],
    priorityTargets: showStars ? priorityTargets : []
  });
}

export function buildTimelineEventsForAgent(agentPlan, mission, level, options = {}) {
  const agentId = agentPlan?.agentId ?? options.selectedAgentId ?? options.agentId ?? null;
  const events = [];
  for (const [index, waypoint] of (agentPlan?.waypoints ?? []).entries()) {
    const t = waypointTime(waypoint);
    events.push({
      type: 'waypoint',
      id: waypoint.id ?? `${agentId}_wp_${index}`,
      agentId,
      index,
      label: String(index + 1),
      waypointKind: normalizeWaypointKind(waypoint),
      waypointKindLabel: waypointKindLabel(waypoint),
      t,
      window: Number(waypoint.window ?? getWindowForTime(level, t)),
      x: Number(waypoint.x),
      y: Number(waypoint.y),
      status: waypoint.validity?.valid === false ? waypointStatus(waypoint) : 'pending',
      issueMessage: waypoint.validity?.routeAudit?.message ?? null,
      energy: waypoint.cumulativeEnergy ?? waypoint.segmentEnergy ?? null
    });
  }

  for (const [index, marker] of (options.planningMarkers ?? []).entries()) {
    const timing = compareRouteToMarkerTiming(agentPlan, marker);
    const t = Number(marker.t ?? 0);
    events.push({
      type: 'marker',
      id: marker.id ?? `${agentId}_marker_${index}`,
      index,
      markerId: marker.id ?? null,
      label: marker.linkedTargetId ? 'Star' : 'Marker',
      t,
      window: Number(marker.window ?? getWindowForTime(level, t)),
      x: Number(marker.x),
      y: Number(marker.y),
      note: marker.note ?? marker.status ?? null,
      timingStatus: timing.status,
      timing,
      reachability: marker.reachability ?? null
    });
  }

  const priorityTargets = options.priorityTargets ?? level?.layers?.priorityTargets ?? [];
  for (const target of priorityTargets) {
    for (const frame of target.frames ?? []) {
      if (!frame.active) continue;
      const t = Number(frame.t ?? 0);
      events.push({
        type: 'priorityTarget',
        id: `${target.id ?? 'target'}_${t}`,
        label: 'Sampling Target',
        waypointKind: 'samplingTarget',
        waypointKindLabel: 'Sampling Target',
        t,
        window: getWindowForTime(level, t),
        x: Number(frame.x ?? target.x ?? target.position?.x ?? 0),
        y: Number(frame.y ?? target.y ?? target.position?.y ?? 0),
        targetId: target.id ?? null,
        value: Number(frame.value ?? target.value ?? 0)
      });
    }
  }

  return events.sort((a, b) => Number(a.t ?? 0) - Number(b.t ?? 0));
}

export function compareRouteToMarkerTiming(agentPlan, marker, { tolerance = 0.5 } = {}) {
  const markerTime = Number(marker?.t ?? 0);
  const waypoints = (agentPlan?.waypoints ?? [])
    .map((waypoint, index) => ({ waypoint, index, t: waypointTime(waypoint) }))
    .filter((entry) => Number.isFinite(entry.t));
  if (!waypoints.length || !Number.isFinite(markerTime)) {
    return {
      status: 'unconnected',
      nearestWaypointIndex: null,
      arrivalTime: null,
      markerTime,
      slack: null
    };
  }
  const nearest = waypoints.reduce((best, entry) => (
    Math.abs(entry.t - markerTime) < Math.abs(best.t - markerTime) ? entry : best
  ), waypoints[0]);
  const slack = markerTime - nearest.t;
  let status = 'onTime';
  if (slack > tolerance) status = 'early';
  if (slack < -tolerance) status = 'late';
  return {
    status,
    nearestWaypointIndex: nearest.index,
    arrivalTime: nearest.t,
    markerTime,
    slack
  };
}

function waypointTime(waypoint) {
  const value = Number(waypoint?.estimatedArrivalTime ?? waypoint?.t ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function waypointStatus(waypoint) {
  const reasons = waypoint?.validity?.reasons ?? [];
  if (reasons.includes('segmentBlocked') || reasons.includes('terrain')) return 'invalid-terrain';
  if (reasons.includes('fuel')) return 'invalid-fuel';
  if (reasons.includes('time')) return 'invalid-time';
  return 'invalid';
}
