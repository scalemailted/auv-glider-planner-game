import { getSelectedStart, isValidSelectedStart, requiresDeploymentSelection } from '../deployment/DeploymentZones.js';
import { computeReachabilitySummary } from '../validation/ConnectivityValidator.js';
import { validateRoutePlanForExecution } from './RouteValidityAudit.js';
import { isCellNavigable } from './Navigability.js';

const MAX_EXECUTION_WAYPOINTS_PER_AGENT = 50;
const MAX_INVALID_WAYPOINTS_PER_AGENT = 3;

export function validatePlanForExecution({ level, mission, plan } = {}) {
  const errors = [];
  const warnings = [];
  const routeAudit = validateRoutePlanForExecution({ level, mission, plan });
  const grid = level?.world?.grid ?? {};
  const duration = Number(level?.world?.time?.duration);
  const dt = Number(level?.world?.time?.dt ?? 0.25);

  if (!level) errors.push('Level is missing.');
  if (!mission) errors.push('Mission is missing.');
  if (!plan) errors.push('Plan is missing.');
  if (!Number.isFinite(Number(grid.width)) || !Number.isFinite(Number(grid.height)) || Number(grid.width) <= 0 || Number(grid.height) <= 0) {
    errors.push('Level grid is invalid.');
  }
  if (!Number.isFinite(duration) || duration <= 0) errors.push('Mission duration must be a positive number.');
  if (!Number.isFinite(dt) || dt <= 0) errors.push('Mission time step must be a positive number.');
  const usesDeploymentZones = (level?.zones ?? []).some((zone) => zone.type === 'deployment')
    || (mission?.agents ?? []).some((agent) => agent.deployment?.mode === 'chooseFromZone' || agent.deployment?.mode === 'chooseFromZones');
  if (level && mission && usesDeploymentZones) {
    const connectivity = computeReachabilitySummary(level, mission);
    if (!connectivity.deploymentConnected) errors.push('Deployment zone is disconnected from navigable water.');
    if (connectivity.roiReachableRatio <= 0 && connectivity.totalNavigableCells > 0) {
      errors.push('No scoring ROI cells are reachable from deployment. Reduce or revise terrain.');
    }
  }
  if (level && mission && plan) {
    const executableAgentCount = (plan.agentPlans ?? []).filter((agentPlan) => (agentPlan.waypoints ?? []).length > 0).length;
    if (executableAgentCount <= 0) errors.push('At least one glider needs a waypoint route before simulation.');
  }

  for (const agent of mission?.agents ?? []) {
    const speed = Number(agent.maxSpeed ?? 1);
    const battery = Number(agent.battery ?? mission?.rules?.energyBudget ?? 100);
    if (!Number.isFinite(speed) || speed <= 0) errors.push(`${agent.label ?? agent.id} needs a positive finite max speed.`);
    if (!Number.isFinite(battery) || battery < 0) errors.push(`${agent.label ?? agent.id} needs finite non-negative fuel.`);
    const selectedStart = getSelectedStart(agent);
    const agentPlan = plan?.agentPlans?.find((candidate) => candidate.agentId === agent.id);
    const waypoints = agentPlan?.waypoints ?? [];
    const agentIsIdle = !agentPlan || waypoints.length === 0;
    if (agentIsIdle) {
      warnings.push(`${agent.label ?? agent.id} has no waypoints and will idle.`);
      continue;
    }

    if (requiresDeploymentSelection(mission, agent.id)) {
      errors.push(`${agent.label ?? agent.id} needs a deployment cell before simulation.`);
    } else if (agent.deployment?.mode === 'chooseFromZone' || agent.deployment?.mode === 'chooseFromZones') {
      const validation = isValidSelectedStart(level, mission, agent.id, selectedStart);
      if (!validation.valid) errors.push(`${agent.label ?? agent.id} has an invalid selected start: ${validation.message}`);
    } else if (!isFinitePoint(selectedStart ?? agent.start)) {
      errors.push(`${agent.label ?? agent.id} needs a valid fixed start.`);
    }
    if (waypoints.length > MAX_EXECUTION_WAYPOINTS_PER_AGENT) {
      errors.push(`${agent.label ?? agent.id} route exceeds the safe waypoint limit (${waypoints.length}/${MAX_EXECUTION_WAYPOINTS_PER_AGENT}). Reduce or revise waypoints.`);
    }
    let previousTime = null;
    let invalidWaypointCount = 0;
    for (const [index, waypoint] of waypoints.entries()) {
      const label = `${agent.label ?? agent.id} waypoint ${index + 1}`;
      if (!isFinitePoint(waypoint)) {
        errors.push(`${label} needs finite x/y coordinates.`);
        invalidWaypointCount += 1;
        continue;
      }
      if (waypoint.validity?.valid === false) {
        if (isRuntimeTruncatedTimeWaypoint(waypoint, duration)) {
          warnings.push(`${label} is beyond mission duration. Simulation will travel toward it and stop at mission end.`);
        } else {
          invalidWaypointCount += 1;
          const reason = waypoint.validity.reasons?.join(', ') || 'route';
          errors.push(`${label} is not executable (${reason}). Reduce or revise waypoints.`);
        }
      }
      const x = Math.floor(Number(waypoint.x));
      const y = Math.floor(Number(waypoint.y));
      if (x < 0 || y < 0 || x >= Number(grid.width) || y >= Number(grid.height)) {
        errors.push(`${label} is outside the grid.`);
        invalidWaypointCount += 1;
        continue;
      }
      const navigability = isCellNavigable(level, mission, x, y);
      if (!navigability.ok) errors.push(`${label} is not navigable (${formatBlockReason(navigability.reason)}).`);
      for (const field of ['t', 'estimatedArrivalTime', 'segmentTravelTime']) {
        if (waypoint[field] !== undefined && waypoint[field] !== null && !Number.isFinite(Number(waypoint[field]))) {
          errors.push(`${label} has invalid ${field}.`);
        }
      }
      if (Number(waypoint.segmentTravelTime) < 0) errors.push(`${label} has negative segment travel time.`);
      const waypointTime = Number(waypoint.estimatedArrivalTime ?? waypoint.t);
      if (Number.isFinite(waypointTime)) {
        if (waypointTime > duration) {
          warnings.push(`${label} is scheduled after the mission duration. Simulation will run toward this waypoint and end at the mission time limit before it is reached.`);
        }
        if (previousTime !== null && waypointTime <= previousTime) {
          errors.push(`${label} has non-increasing timing. Waypoint times must increase before simulation.`);
        }
        previousTime = waypointTime;
      }
    }
    if (invalidWaypointCount > MAX_INVALID_WAYPOINTS_PER_AGENT) {
      errors.push(`${agent.label ?? agent.id} has too many unreachable waypoints (${invalidWaypointCount}). Reduce or revise waypoints.`);
    }
  }

  for (const result of routeAudit.agentResults ?? []) {
    for (const issue of result.issues ?? []) {
      debugRouteExecutionValidationIssue(issue, result);
      if (issue.severity === 'error') errors.push(issue.message);
      else warnings.push(issue.message);
    }
  }

  return {
    ok: errors.length === 0,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
    diagnostics: routeAudit?.diagnostics ?? [],
    solverFeedback: routeAudit?.solverFeedback ?? null,
    routeAudit
  };
}

function isRuntimeTruncatedTimeWaypoint(waypoint, duration) {
  const routeAudit = waypoint?.validity?.routeAudit ?? {};
  if (routeAudit.runtimeBehavior === 'truncate_at_mission_end') return true;
  if (waypoint?.runtimeBehavior === 'truncate_at_mission_end') return true;
  if (waypoint?.terminalCarryThrough || waypoint?.intentionalOverDuration) return true;
  const reasons = new Set((waypoint?.validity?.reasons ?? []).map((reason) => String(reason)));
  const onlyTimeReason = reasons.size > 0 && [...reasons].every((reason) =>
    reason === 'time'
    || reason === 'timeExceeded'
    || reason === 'waypoint_exceeds_mission_duration'
    || reason === 'missionTimeExceeded'
  );
  const waypointTime = Number(waypoint?.estimatedArrivalTime ?? waypoint?.t);
  return onlyTimeReason && Number.isFinite(waypointTime) && Number.isFinite(duration) && waypointTime > duration;
}

function debugRouteExecutionValidationIssue(issue = {}, result = {}) {
  if (!globalThis.ANCHOR_DEBUG_ROUTE_EXECUTION) return;
  console.debug('[RouteExecution][ValidationIssue]', {
    category: issue.category ?? issue.diagnostic?.category ?? issue.reason ?? issue.type,
    severity: issue.severity,
    blocking: issue.blocking ?? issue.severity === 'error',
    agentId: issue.agentId ?? result.agentId ?? null,
    waypointIndex: issue.waypointIndex ?? issue.to?.index ?? null,
    isFinalWaypoint: issue.isFinalWaypoint ?? null,
    terminalCarryThrough: Boolean(issue.terminalCarryThrough || issue.intentional),
    runtimeBehavior: issue.runtimeBehavior ?? issue.diagnostic?.runtimeBehavior ?? null
  });
}

function isFinitePoint(point) {
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y));
}

function formatBlockReason(reason) {
  return {
    terrain: 'blocked terrain',
    tooShallow: 'too shallow',
    outsideMap: 'outside map'
  }[reason] ?? reason ?? 'blocked';
}
