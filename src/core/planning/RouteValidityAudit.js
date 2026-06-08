import { getPlanningFrame } from '../sim/ChallengeMode.js';
import { getSelectedStart, requiresDeploymentSelection } from '../deployment/DeploymentZones.js';
import { getTimeConfig } from '../time/MissionTime.js';
import { buildRouteSegmentsForAgent } from './RouteSegmentBuilder.js';
import { estimateRouteEnergy } from './RoutePreview.js';
import { estimateSegmentBeachingRisk, isBeachingRisk } from './ShorelineRisk.js';
import { buildRouteBlockDiagnostic, cellToCenterPosition, isCellNavigable, positionToCell } from './Navigability.js';
import { evaluateSegmentForExecution } from './SegmentExecutionValidator.js';
import { buildRouteValidationDiagnostic, buildSolverValidationFeedback } from './RouteDiagnostic.js';
import { normalizeWaypointKind } from './WaypointSemantics.js';

export function validateRoutePlanForExecution({
  level,
  mission,
  plan,
  agentId = null,
  gameState = null
} = {}) {
  clearRouteAuditAnnotations(plan);
  const agentResults = [];
  const agents = (mission?.agents ?? []).filter((agent) => !agentId || agent.id === agentId);
  const duration = Number(getTimeConfig(level).duration ?? level?.world?.time?.duration ?? Infinity);

  for (const agent of agents) {
    const agentPlan = (plan?.agentPlans ?? []).find((candidate) => candidate.agentId === agent.id) ?? { agentId: agent.id, agentLabel: agent.label ?? agent.id, waypoints: [] };
    const issues = [];
    const route = buildRouteSegmentsForAgent({
      level,
      mission,
      agent,
      agentPlan,
      surfacedAgents: gameState?.surfacedAgents,
      planningAnchor: gameState?.ui?.planningAnchor
    });

    if (requiresDeploymentSelection(mission, agent.id) || route.missingAnchor || !isFinitePoint(route.anchor)) {
      const issue = buildIssue({
        type: 'invalidStart',
        severity: 'error',
        agentId: agent.id,
        agentLabel: agent.label ?? agent.id,
        to: waypointRef(agentPlan.waypoints?.[0], 0),
        message: `${agent.label ?? agent.id} needs a valid start before execution.`
      });
      issues.push(issue);
      annotateWaypoint(agentPlan, 0, issue);
    }

    for (const [index, waypoint] of (agentPlan.waypoints ?? []).entries()) {
      const label = `Waypoint ${index + 1}`;
      if (!isFinitePoint(waypoint)) {
        const issue = buildIssue({
          type: 'invalidCoordinate',
          severity: 'error',
          agentId: agent.id,
          agentLabel: agent.label ?? agent.id,
          to: waypointRef(waypoint, index),
          message: `${agent.label ?? agent.id} ${label} needs finite coordinates.`
        });
        issues.push(issue);
        annotateWaypoint(agentPlan, index, issue);
        continue;
      }
      const boundsIssue = outOfBoundsIssue(level, agent, waypoint, index);
      if (boundsIssue) {
        issues.push(boundsIssue);
        annotateWaypoint(agentPlan, index, boundsIssue);
        continue;
      }
      const navigability = isCellNavigable(level, mission, waypoint.x, waypoint.y);
      if (!navigability.ok) {
        const issue = buildIssue({
          type: 'invalidCoordinate',
          reason: navigability.reason,
          severity: 'error',
          agentId: agent.id,
          agentLabel: agent.label ?? agent.id,
          to: waypointRef(waypoint, index),
          message: `${agent.label ?? agent.id} ${label} is not navigable (${formatBlockReason(navigability.reason)}).`
        });
        issues.push(issue);
        annotateWaypoint(agentPlan, index, issue);
      }
    }

    let cumulativeEnergy = 0;
    let previousTime = null;
    let executionAnchor = isFinitePoint(route.anchor)
      ? { x: Number(route.anchor.x), y: Number(route.anchor.y), t: Number(route.anchor.t ?? 0), source: route.anchor.source ?? 'start' }
      : null;
    for (const [index, segment] of (route.segments ?? []).entries()) {
      const waypoint = agentPlan.waypoints?.[index];
      const executionFrom = isFinitePoint(executionAnchor) ? executionAnchor : segment.from;
      if (!waypoint || !isFinitePoint(executionFrom) || !isFinitePoint(segment.to)) continue;
      const frame = getPlanningFrame(level, Number(executionFrom.t ?? segment.from.t ?? waypoint.t ?? 0), {
        challengeMode: gameState?.challengeMode,
        revealTruth: gameState?.ui?.revealTruth,
        forecastMemberId: gameState?.ui?.forecastMemberId
      });
      const estimate = estimateRouteEnergy(executionFrom, segment.to, level, agent, frame, {
        driftGain: gameState?.mission?.physics?.driftGain ?? mission?.physics?.driftGain ?? 0.5,
        energyPerCell: mission?.physics?.energyPerCell ?? 1,
        mission
      });
      const execution = estimate.valid === false || segment.valid === false
        ? null
        : evaluateSegmentForExecution({
          level,
          mission,
          agent,
          from: executionFrom,
          to: segment.to,
          startTime: Number(executionFrom.t ?? segment.from.t ?? waypoint.t ?? 0),
          travelTime: waypoint.segmentTravelTime ?? waypoint.estimatedTravelTime ?? estimate.estimatedTravelTime ?? estimate.eta ?? estimate.distance / Math.max(0.05, Number(agent.maxSpeed ?? 1)),
          maxWaypointTravelTime: getMaxWaypointTravelTime(level, waypoint, Number(executionFrom.t ?? segment.from.t ?? waypoint.t ?? 0)),
          fuelRemaining: Number(agent.battery ?? agent.maxBattery ?? mission?.rules?.energyBudget ?? 100) - cumulativeEnergy,
          frame
        });
      debugAdjacentRouteValidation({
        level,
        mission,
        from: executionFrom,
        to: segment.to,
        segment,
        estimate,
        execution
      });
      cumulativeEnergy += Number(waypoint.segmentEnergy ?? estimate.energy ?? 0);

      if (!segment.valid || estimate.valid === false || execution?.ok === false) {
        const noLegalPath = execution?.reason === 'noLegalPath' || estimate.reason === 'noLegalPath';
        const routeBlockDiagnostic = execution?.routeBlockDiagnostic ?? buildRouteBlockDiagnostic({
          level,
          mission,
          agentId: agent.id,
          agentLabel: agent.label ?? agent.id,
          segmentFromIndex: index - 1,
          segmentToIndex: index,
          plannedFrom: segment.from,
          target: segment.to,
          actualStartPosition: executionFrom,
          reportedCell: segment.blockedAt ?? estimate.blockedAt ?? execution?.blockedCell ?? estimate.reachability?.blockedCell ?? null,
          reason: noLegalPath ? 'noLegalPath' : execution?.reason ?? segment.reason ?? 'segmentBlocked',
          source: 'routeValidityAudit'
        });
        const blockedAt = routeBlockDiagnostic?.blocking?.blockedCell
          ?? segment.blockedAt
          ?? estimate.blockedAt
          ?? execution?.blockedCell
          ?? estimate.reachability?.blockedCell
          ?? null;
        const executionBlocked = execution?.ok === false && !noLegalPath && segment.valid !== false && estimate.valid !== false;
        const issue = buildIssue({
          type: 'segmentBlocked',
          reason: noLegalPath ? 'noLegalPath' : executionBlocked ? 'routeBlocked' : 'segmentBlocked',
          severity: 'error',
          agentId: agent.id,
          agentLabel: agent.label ?? agent.id,
          from: segmentEndpointRef(executionFrom, index - 1),
          to: waypointRef(waypoint, index),
          blockedAt,
          routeBlockDiagnostic,
          pathCells: routeBlockDiagnostic?.traversedCells ?? segment.pathCells ?? estimate.reachability?.pathCells ?? [],
          segmentIndex: index,
          waypointIndex: index,
          message: noLegalPath
            ? `${agent.label ?? agent.id} cannot reach Waypoint ${index + 1}: no legal continuous segment exists${formatRouteBlockDiagnostic(routeBlockDiagnostic, blockedAt)}.`
            : executionBlocked
              ? `${agent.label ?? agent.id} route to Waypoint ${index + 1} would be blocked during simulation${formatRouteBlockDiagnostic(routeBlockDiagnostic, blockedAt)}.`
            : `${agent.label ?? agent.id} route to Waypoint ${index + 1} crosses terrain${formatRouteBlockDiagnostic(routeBlockDiagnostic, blockedAt)}.`
        });
        issues.push(issue);
        annotateWaypoint(agentPlan, index, issue);
      }

      const beachingRisk = estimateSegmentBeachingRisk({
        level,
        frame,
        start: executionFrom,
        end: estimate.valid === false ? estimate.lastValid : segment.to
      });
      if (isBeachingRisk(beachingRisk)) {
        const issue = buildIssue({
          type: 'beachingRisk',
          reason: 'beachingRisk',
          severity: 'warning',
          agentId: agent.id,
          agentLabel: agent.label ?? agent.id,
          from: segmentEndpointRef(executionFrom, index - 1),
          to: waypointRef(waypoint, index),
          segmentIndex: index,
          waypointIndex: index,
          risk: {
            level: beachingRisk.level,
            value: beachingRisk.value,
            shoreDistance: beachingRisk.shoreDistance,
            currentTowardLand: beachingRisk.currentTowardLand,
            currentMagnitude: beachingRisk.currentMagnitude,
            cell: { x: beachingRisk.x, y: beachingRisk.y }
          },
          message: `${agent.label ?? agent.id} shoreline current warning: route may beach near (${beachingRisk.x}, ${beachingRisk.y}).`
        });
        issues.push(issue);
        annotateWaypoint(agentPlan, index, issue);
      }

      const waypointTime = Number(waypoint.estimatedArrivalTime ?? waypoint.t);
      if (Number.isFinite(waypointTime)) {
        if (Number.isFinite(duration) && waypointTime > duration) {
          const isFinalWaypoint = index === (agentPlan.waypoints?.length ?? 0) - 1;
          const terminalCarryThrough = Boolean(waypoint.terminalCarryThrough || waypoint.intentionalOverDuration || isFinalWaypoint);
          const issue = buildIssue({
            type: 'timeExceeded',
            reason: 'waypoint_exceeds_mission_duration',
            severity: 'warning',
            category: 'waypoint_exceeds_mission_duration',
            runtimeBehavior: 'truncate_at_mission_end',
            blocking: false,
            intentional: terminalCarryThrough,
            terminalCarryThrough,
            isFinalWaypoint,
            agentId: agent.id,
            agentLabel: agent.label ?? agent.id,
            to: waypointRef(waypoint, index),
            segmentIndex: index,
            waypointIndex: index,
            message: terminalCarryThrough
              ? `${agent.label ?? agent.id} Waypoint ${index + 1} is a terminal carry-through waypoint after mission duration. Simulation will run toward it and end at the mission time limit.`
              : `${agent.label ?? agent.id} Waypoint ${index + 1} is scheduled after the mission duration. Simulation will run toward this waypoint and end at the mission time limit before it is reached.`
          });
          issues.push(issue);
          annotateWaypoint(agentPlan, index, issue);
        }
        if (previousTime !== null && waypointTime <= previousTime) {
          const issue = buildIssue({
            type: 'nonMonotonicTime',
            reason: 'nonMonotonicTime',
            severity: 'error',
            agentId: agent.id,
            agentLabel: agent.label ?? agent.id,
            to: waypointRef(waypoint, index),
            segmentIndex: index,
            waypointIndex: index,
            message: `${agent.label ?? agent.id} Waypoint ${index + 1} has non-increasing timing.`
          });
          issues.push(issue);
          annotateWaypoint(agentPlan, index, issue);
        }
        previousTime = waypointTime;
      }
      if (execution?.ok && isFinitePoint(execution.finalPosition)) {
        executionAnchor = {
          x: Number(execution.finalPosition.x),
          y: Number(execution.finalPosition.y),
          t: Number(execution.finalPosition.t ?? waypointTime ?? executionFrom.t ?? 0),
          source: 'simulatedWaypointArrival'
        };
      } else if (isFinitePoint(segment.to)) {
        executionAnchor = {
          x: Number(segment.to.x),
          y: Number(segment.to.y),
          t: Number(waypointTime ?? segment.to.t ?? executionFrom.t ?? 0),
          source: 'plannedWaypoint'
        };
      }

      const fuelBudget = Number(agent.battery ?? agent.maxBattery ?? mission?.rules?.energyBudget ?? 100);
      if (Number.isFinite(fuelBudget) && cumulativeEnergy > fuelBudget) {
        const issue = buildIssue({
          type: 'fuelExceeded',
          reason: 'fuel',
          severity: 'error',
          agentId: agent.id,
          agentLabel: agent.label ?? agent.id,
          to: waypointRef(waypoint, index),
          segmentIndex: index,
          waypointIndex: index,
          message: `${agent.label ?? agent.id} Waypoint ${index + 1} exceeds estimated fuel.`
        });
        issues.push(issue);
        annotateWaypoint(agentPlan, index, issue);
      }
    }

    agentResults.push({
      agentId: agent.id,
      agentLabel: agent.label ?? agent.id,
      ok: issues.every((issue) => issue.severity !== 'error'),
      issues
    });
  }

  const issues = agentResults.flatMap((result) => result.issues);
  const result = {
    ok: issues.every((issue) => issue.severity !== 'error'),
    issueCount: issues.length,
    firstIssue: issues[0] ?? null,
    agentResults,
    diagnostics: issues.map((issue) => issue.diagnostic).filter(Boolean)
  };
  result.firstBlockingDiagnostic = result.diagnostics.find((diagnostic) => diagnostic.severity === 'blocking') ?? null;
  result.solverFeedback = buildSolverValidationFeedback({ routeAudit: result, plan, level, mission });
  return result;
}

export function applyRouteAuditToPlan(plan, audit) {
  clearRouteAuditAnnotations(plan);
  for (const result of audit?.agentResults ?? []) {
    const agentPlan = plan?.agentPlans?.find((candidate) => candidate.agentId === result.agentId);
    for (const issue of result.issues ?? []) {
      annotateWaypoint(agentPlan, Number(issue.waypointIndex ?? issue.to?.index ?? 0), issue);
    }
  }
  return plan;
}

function clearRouteAuditAnnotations(plan) {
  for (const agentPlan of plan?.agentPlans ?? []) {
    for (const waypoint of agentPlan.waypoints ?? []) {
      if (!waypoint.validity?.routeAudit) continue;
      const remainingReasons = (waypoint.validity.reasons ?? []).filter((reason) => !waypoint.validity.routeAudit.reasons?.includes(reason));
      waypoint.validity = {
        ...waypoint.validity,
        valid: remainingReasons.length === 0,
        reasons: remainingReasons
      };
      delete waypoint.validity.routeAudit;
      if (waypoint.validity.valid && remainingReasons.length === 0) delete waypoint.validity;
    }
  }
}

function annotateWaypoint(agentPlan, index, issue) {
  if (!agentPlan || !Number.isInteger(index) || index < 0) return;
  const waypoint = agentPlan.waypoints?.[index];
  if (!waypoint) return;
  const reason = issue.reason ?? issue.type;
  const runtimeTruncation = issue.runtimeBehavior === 'truncate_at_mission_end'
    || issue.reason === 'waypoint_exceeds_mission_duration'
    || issue.category === 'waypoint_exceeds_mission_duration';
  const existingReasons = runtimeTruncation
    ? (waypoint.validity?.reasons ?? []).filter((existing) => !isLegacyTimeReason(existing))
    : (waypoint.validity?.reasons ?? []);
  const reasons = new Set([...existingReasons, reason]);
  const hasHardExistingReason = [...reasons].some((existing) => !isLegacyTimeReason(existing) && existing !== reason);
  waypoint.validity = {
    valid: issue.severity !== 'error' && !hasHardExistingReason,
    status: issue.severity === 'error' ? 'invalid' : 'warning',
    reasons: [...reasons],
    routeAudit: {
      issueType: issue.type,
      severity: issue.severity,
      reasons: [reason],
      message: issue.message,
      blockedAt: issue.blockedAt ?? null,
      runtimeBehavior: issue.runtimeBehavior ?? null,
      intentional: Boolean(issue.intentional),
      terminalCarryThrough: Boolean(issue.terminalCarryThrough),
      diagnostic: issue.diagnostic ?? null
    }
  };
  if (issue.terminalCarryThrough || issue.runtimeBehavior === 'truncate_at_mission_end') {
    waypoint.kind = 'terminalCarryThrough';
    waypoint.waypointKind = 'terminalCarryThrough';
    waypoint.terminalCarryThrough = true;
    waypoint.runtimeBehavior = 'truncate_at_mission_end';
  }
  if (issue.severity === 'error') waypoint.validity.valid = false;
}

function isLegacyTimeReason(reason) {
  return [
    'time',
    'timeExceeded',
    'waypoint_exceeds_mission_duration',
    'missionTimeExceeded'
  ].includes(String(reason));
}

function outOfBoundsIssue(level, agent, waypoint, index) {
  const grid = level?.world?.grid ?? {};
  const x = Math.floor(Number(waypoint?.x));
  const y = Math.floor(Number(waypoint?.y));
  if (x >= 0 && y >= 0 && x < Number(grid.width) && y < Number(grid.height)) return null;
  return buildIssue({
    type: 'invalidCoordinate',
    reason: 'invalidCoordinate',
    severity: 'error',
    agentId: agent.id,
    agentLabel: agent.label ?? agent.id,
    to: waypointRef(waypoint, index),
    waypointIndex: index,
    message: `${agent.label ?? agent.id} Waypoint ${index + 1} is outside the grid.`
  });
}

function buildIssue(issue) {
  const enriched = {
    severity: 'error',
    reason: issue.type,
    ...issue
  };
  enriched.diagnostic ??= buildRouteValidationDiagnostic(enriched);
  return enriched;
}

function segmentEndpointRef(point, index) {
  if (index < 0) {
    return {
      kind: point?.source ?? 'start',
      x: Number(point?.x),
      y: Number(point?.y)
    };
  }
  return waypointRef(point, index);
}

function waypointRef(waypoint, index) {
  return {
    kind: 'waypoint',
    waypointKind: normalizeWaypointKind(waypoint),
    index,
    id: waypoint?.id ?? null,
    x: Number(waypoint?.x),
    y: Number(waypoint?.y)
  };
}

function formatBlockedAt(cell) {
  return cell ? ` at (${Math.floor(Number(cell.x))}, ${Math.floor(Number(cell.y))})` : '';
}

function formatRouteBlockDiagnostic(diagnostic, fallbackCell = null) {
  const blocking = diagnostic?.blocking;
  if (!blocking) return formatBlockedAt(fallbackCell);
  const blockedCell = blocking.blockedCell;
  const reportedCell = blocking.reportedCell;
  const blockedText = blockedCell ? ` at (${Math.floor(Number(blockedCell.x))}, ${Math.floor(Number(blockedCell.y))})` : '';
  if (reportedCell && blockedCell && !sameCell(reportedCell, blockedCell) && blocking.reportedCellNavigability === 'water') {
    return `${blockedText}; reported/current cell (${Math.floor(Number(reportedCell.x))}, ${Math.floor(Number(reportedCell.y))}) is navigable`;
  }
  if (blocking.reason === 'actual_drift_into_land') return `${blockedText}; actual drifted start entered blocked terrain`;
  if (blocking.reason === 'blocked_endpoint') return `${blockedText}; endpoint is blocked`;
  if (blocking.reason === 'waypoint_timeout') return ' because the segment did not reach the waypoint within the validation time budget';
  if (blocking.reason === 'no_path') return blockedText || ' because no legal navigable path exists';
  return blockedText;
}

function sameCell(a, b) {
  return Boolean(a && b && Math.floor(Number(a.x)) === Math.floor(Number(b.x)) && Math.floor(Number(a.y)) === Math.floor(Number(b.y)));
}

function debugAdjacentRouteValidation({ level, mission, from, to, segment, estimate, execution } = {}) {
  if (!globalThis.ANCHOR_DEBUG_COORDINATES && !globalThis.ANCHOR_DEBUG_ROUTE_BLOCKS) return;
  const fromDisplayCell = isFinitePoint(from) ? positionToCell(from) : null;
  const toDisplayCell = isFinitePoint(to) ? positionToCell(to) : null;
  const adjacent = fromDisplayCell && toDisplayCell
    ? Math.abs(fromDisplayCell.x - toDisplayCell.x) + Math.abs(fromDisplayCell.y - toDisplayCell.y) === 1
    : false;
  if (!adjacent && !globalThis.ANCHOR_DEBUG_ROUTE_BLOCKS) return;
  const fromNavigable = fromDisplayCell ? isCellNavigable(level, mission, fromDisplayCell.x, fromDisplayCell.y) : null;
  const toNavigable = toDisplayCell ? isCellNavigable(level, mission, toDisplayCell.x, toDisplayCell.y) : null;
  globalThis.console?.debug?.('[AdjacentRouteValidation]', {
    fromDisplayCell,
    toDisplayCell,
    fromValidationPosition: isFinitePoint(from) ? cellToCenterPosition(from) : null,
    toValidationPosition: isFinitePoint(to) ? cellToCenterPosition(to) : null,
    fromValidationCell: fromDisplayCell,
    toValidationCell: toDisplayCell,
    fromNavigable,
    toNavigable,
    sampledCells: segment?.traversedCells ?? segment?.pathCells ?? estimate?.sampledCells ?? [],
    blockedCells: segment?.blockedCells ?? estimate?.blockedCells ?? execution?.routeBlockDiagnostic?.traversedCells?.filter((cell) => cell.navigable === false) ?? [],
    validationResult: {
      segmentValid: segment?.valid,
      estimateValid: estimate?.valid,
      executionOk: execution?.ok ?? null,
      executionReason: execution?.reason ?? null,
      estimateReason: estimate?.reason ?? null
    }
  });
}

function formatBlockReason(reason) {
  return {
    terrain: 'terrain',
    tooShallow: 'too shallow',
    outsideMap: 'outside map',
    invalidPoint: 'invalid point'
  }[reason] ?? reason ?? 'blocked';
}

function getMaxWaypointTravelTime(level, waypoint, currentTime = 0) {
  if (!waypoint) return Infinity;
  const plannedT = Number(waypoint.t ?? waypoint.estimatedArrivalTime ?? waypoint.window);
  const planningWindow = Number(level?.world?.time?.planningWindow ?? 3);
  if (Number.isFinite(plannedT)) return Math.max(planningWindow * 3, plannedT + planningWindow * 2 - Number(currentTime ?? 0));
  return Math.max(12, planningWindow * 4);
}

function isFinitePoint(point) {
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y));
}

