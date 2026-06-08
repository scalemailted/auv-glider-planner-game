export function summarizeSimulationStopReason({ agents = [], events = [], aborted = false, abortReason = null, complete = false } = {}) {
  if (aborted) {
    return {
      code: abortReason ?? 'aborted',
      title: `Simulation stopped: ${labelReason(abortReason)}.`,
      lastSuccessfulWaypoint: lastReached(events),
      firstFailedWaypoint: firstMissed(events),
      suggestedFix: suggestedFix(abortReason)
    };
  }
  const missed = events.filter((event) => event.type === 'missedWaypoint');
  if (!missed.length) {
    return complete ? {
      code: 'complete',
      title: 'Simulation completed.',
      lastSuccessfulWaypoint: lastReached(events),
      firstFailedWaypoint: null,
      suggestedFix: ''
    } : null;
  }
  const firstFailed = missed[0];
  const missionTimeExpired = missed.find((event) => normalizeMissReason(event.reason) === 'mission_time_expired') ?? null;
  if (missionTimeExpired) {
    return {
      code: 'mission_time_expired',
      title: `Mission ended: time limit reached before waypoint ${Number(missionTimeExpired.waypointIndex ?? 0) + 1}.`,
      lastSuccessfulWaypoint: lastReached(events, missionTimeExpired.agentId),
      firstFailedWaypoint: missionTimeExpired,
      suggestedFix: suggestedFix('mission_time_expired'),
      missedCount: missed.length,
      affectedAgents: [...new Set(missed.map((event) => event.agentId).filter(Boolean))]
    };
  }
  const blockedBeforeMiss = events.some((event) => event.type === 'blocked'
    && event.agentId === firstFailed.agentId
    && Number(event.t ?? 0) <= Number(firstFailed.t ?? 0));
  const cascade = missed.length > 1;
  const code = blockedBeforeMiss ? 'routeBlocked' : normalizeMissReason(firstFailed.reason);
  return {
    code,
    title: cascade
      ? `Simulation stopped: ${labelReason(code)} after waypoint ${Number(firstFailed.waypointIndex ?? 0) + 1}. Later route steps were missed.`
      : `Simulation stopped: ${labelReason(code)} at waypoint ${Number(firstFailed.waypointIndex ?? 0) + 1}.`,
    lastSuccessfulWaypoint: lastReached(events, firstFailed.agentId),
    firstFailedWaypoint: firstFailed,
    suggestedFix: suggestedFix(code),
    missedCount: missed.length,
    affectedAgents: [...new Set(missed.map((event) => event.agentId).filter(Boolean))]
  };
}

export function labelReason(reason) {
  const labels = {
    complete: 'complete',
    routeBlocked: 'route blocked',
    blockedMovement: 'route blocked',
    blockedTarget: 'route blocked',
    terrain: 'route blocked',
    unreachableStalled: 'unreachable',
    waypointTimeout: 'time exceeded',
    missionTimeExpired: 'mission time expired',
    mission_time_expired: 'mission time expired',
    batteryDepleted: 'fuel exceeded',
    outOfBoundsTarget: 'target out of bounds',
    invalidWaypoint: 'invalid waypoint',
    tooManyWaypointMissesInOneUpdate: 'missed-waypoint cascade',
    tooManyWaypointTransitionsInOneUpdate: 'waypoint transition cascade',
    tooManyEventsInOneUpdate: 'event cascade',
    timeStalled: 'no progress',
    waypointNoProgress: 'no progress'
  };
  return labels[reason] ?? String(reason ?? 'unknown stop reason');
}

export function suggestedFix(reason) {
  const normalized = normalizeMissReason(reason);
  if (normalized === 'routeBlocked') return 'Move the failed waypoint or add an intermediate waypoint around terrain.';
  if (normalized === 'waypointTimeout') return 'Move the waypoint closer, use currents, or plan it in an earlier window.';
  if (normalized === 'mission_time_expired') return 'No route fix is required unless this waypoint must be reached before mission end.';
  if (normalized === 'batteryDepleted') return 'Shorten the route, use favorable currents, or remove costly detours.';
  if (normalized === 'unreachableStalled') return 'Add an intermediate waypoint or choose a reachable cell.';
  if (normalized === 'noProgress') return 'Revise the route so the glider can make progress toward the active waypoint.';
  return 'Revise unreachable waypoints, then run the simulation again.';
}

export function normalizeMissReason(reason) {
  if (reason === 'blockedMovement' || reason === 'blockedTarget' || reason === 'terrain') return 'routeBlocked';
  if (reason === 'batteryDepleted') return 'batteryDepleted';
  if (reason === 'waypointTimeout') return 'waypointTimeout';
  if (reason === 'missionTimeExpired' || reason === 'mission_time_expired') return 'mission_time_expired';
  if (reason === 'unreachableStalled') return 'unreachableStalled';
  if (reason === 'timeStalled' || reason === 'waypointNoProgress') return 'noProgress';
  return reason ?? 'unknown';
}

function firstMissed(events = []) {
  return events.find((event) => event.type === 'missedWaypoint') ?? null;
}

function lastReached(events = [], agentId = null) {
  const reached = events.filter((event) => event.type === 'waypointReached' && (!agentId || event.agentId === agentId));
  return reached.at(-1) ?? null;
}
