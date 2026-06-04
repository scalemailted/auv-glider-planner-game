import { labelReason, normalizeMissReason, suggestedFix } from '../planning/StopReasonSummarizer.js';

const ROUTE_FAILURE_REASONS = new Set([
  'routeBlocked',
  'terrainBlocked',
  'unreachableWaypoint',
  'missedWaypointCascade',
  'noProgress',
  'timeExceeded',
  'fuelExceeded',
  'invalidWaypoint',
  'maxStepSafetyAbort',
  'surfaceDecisionModalMissing'
]);

export function isRouteFailureReason(reason) {
  return ROUTE_FAILURE_REASONS.has(normalizeRouteFailureReason(reason));
}

export function normalizeRouteFailureReason(reason) {
  const normalized = normalizeMissReason(reason);
  const map = {
    blockedMovement: 'routeBlocked',
    blockedTarget: 'routeBlocked',
    terrain: 'routeBlocked',
    routeBlocked: 'routeBlocked',
    unreachableStalled: 'unreachableWaypoint',
    unreachableWaypoint: 'unreachableWaypoint',
    waypointTimeout: 'timeExceeded',
    timeExceeded: 'timeExceeded',
    batteryDepleted: 'fuelExceeded',
    fuelExceeded: 'fuelExceeded',
    invalidWaypoint: 'invalidWaypoint',
    outOfBoundsTarget: 'invalidWaypoint',
    noProgress: 'noProgress',
    timeStalled: 'noProgress',
    waypointNoProgress: 'noProgress',
    tooManyWaypointMissesInOneUpdate: 'missedWaypointCascade',
    tooManyWaypointTransitionsInOneUpdate: 'missedWaypointCascade',
    tooManyEventsInOneUpdate: 'missedWaypointCascade',
    maxStepsExceeded: 'maxStepSafetyAbort',
    maxPlaybackStepsExceeded: 'maxStepSafetyAbort',
    maxRunUntilCompleteSteps: 'maxStepSafetyAbort',
    maxStepSafetyAbort: 'maxStepSafetyAbort',
    surfaceDecisionModalMissing: 'surfaceDecisionModalMissing',
    surfaceDecisionModalHidden: 'surfaceDecisionModalMissing'
  };
  return map[normalized] ?? map[reason] ?? normalized ?? 'unknown';
}

export function createRouteFailureDecision({ event = null, agent = null, t = 0, reason = null, stopReason = null, abortDetails = null } = {}) {
  const failureReason = normalizeRouteFailureReason(reason ?? event?.reason ?? stopReason?.code);
  const failedWaypointIndex = finiteNumber(event?.waypointIndex, agent?.currentWaypointIndex ?? null);
  const lastCompleted = [...(agent?.completedWaypoints ?? [])].at(-1)
    ?? stopReason?.lastSuccessfulWaypoint
    ?? null;
  return {
    active: true,
    agentId: event?.agentId ?? agent?.id ?? stopReason?.affectedAgents?.[0] ?? null,
    time: finiteNumber(event?.t, t),
    reason: failureReason,
    reasonLabel: labelReason(failureReason),
    failedWaypointIndex,
    failedWaypointId: event?.waypointId ?? null,
    lastCompletedWaypointIndex: finiteNumber(lastCompleted?.waypointIndex, null),
    lastCompletedWaypointId: lastCompleted?.waypointId ?? null,
    currentPosition: agent ? { x: round(agent.x, 3), y: round(agent.y, 3) } : null,
    suggestedFix: suggestedFix(failureReason),
    originalReason: reason ?? event?.reason ?? null,
    stopReason: stopReason ?? null,
    abortDetails: abortDetails ?? null,
    canSkip: Boolean(event?.type === 'missedWaypoint'),
    canContinue: Boolean(event?.type === 'missedWaypoint')
  };
}

export function routeFailureTitle(reason) {
  const normalized = normalizeRouteFailureReason(reason);
  const titles = {
    routeBlocked: 'Route Blocked',
    terrainBlocked: 'Route Blocked',
    unreachableWaypoint: 'Waypoint Unreachable',
    missedWaypointCascade: 'Waypoint Cascade',
    noProgress: 'No Progress',
    timeExceeded: 'Time Window Exceeded',
    fuelExceeded: 'Fuel Limit Reached',
    invalidWaypoint: 'Invalid Waypoint',
    maxStepSafetyAbort: 'Simulation Safety Stop',
    surfaceDecisionModalMissing: 'Decision Prompt Missing'
  };
  return titles[normalized] ?? 'Route Failure';
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function round(value, places = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number(number.toFixed(places));
}
