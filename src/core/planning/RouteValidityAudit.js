import { getPlanningFrame } from '../sim/ChallengeMode.js';
import { getSelectedStart, requiresDeploymentSelection } from '../deployment/DeploymentZones.js';
import { getTimeConfig } from '../time/MissionTime.js';
import { buildRouteSegmentsForAgent } from './RouteSegmentBuilder.js';
import { estimateRouteEnergy } from './RoutePreview.js';
import { estimateSegmentBeachingRisk, isBeachingRisk } from './ShorelineRisk.js';
import { isCellNavigable } from './Navigability.js';
import { evaluateSegmentForExecution } from './SegmentExecutionValidator.js';

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
    const agentPlan = (plan?.agentPlans ?? []).find((candidate) => candidate.agentId === agent.id) ?? { agentId: agent.id, waypoints: [] };
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
          to: waypointRef(waypoint, index),
          message: `${agent.label ?? agent.id} ${label} is not navigable (${formatBlockReason(navigability.reason)}).`
        });
        issues.push(issue);
        annotateWaypoint(agentPlan, index, issue);
      }
    }

    let cumulativeEnergy = 0;
    let previousTime = null;
    for (const [index, segment] of (route.segments ?? []).entries()) {
      const waypoint = agentPlan.waypoints?.[index];
      if (!waypoint || !isFinitePoint(segment.from) || !isFinitePoint(segment.to)) continue;
      const frame = getPlanningFrame(level, Number(segment.from.t ?? waypoint.t ?? 0), {
        challengeMode: gameState?.challengeMode,
        revealTruth: gameState?.ui?.revealTruth,
        forecastMemberId: gameState?.ui?.forecastMemberId
      });
      const estimate = estimateRouteEnergy(segment.from, segment.to, level, agent, frame, {
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
          from: segment.from,
          to: segment.to,
          startTime: Number(segment.from.t ?? waypoint.t ?? 0),
          travelTime: waypoint.segmentTravelTime ?? waypoint.estimatedTravelTime ?? estimate.distance / Math.max(0.05, Number(agent.maxSpeed ?? 1)),
          fuelRemaining: Number(agent.battery ?? agent.maxBattery ?? mission?.rules?.energyBudget ?? 100) - cumulativeEnergy,
          frame
        });
      cumulativeEnergy += Number(waypoint.segmentEnergy ?? estimate.energy ?? 0);

      if (!segment.valid || estimate.valid === false || execution?.ok === false) {
        const noLegalPath = estimate.reachability?.reachable === false && segment.valid !== false;
        const blockedAt = segment.blockedAt ?? estimate.blockedAt ?? execution?.blockedCell ?? estimate.reachability?.blockedCell ?? null;
        const executionBlocked = execution?.ok === false && !noLegalPath && segment.valid !== false && estimate.valid !== false;
        const issue = buildIssue({
          type: 'segmentBlocked',
          reason: noLegalPath ? 'noLegalPath' : executionBlocked ? 'routeBlocked' : 'segmentBlocked',
          severity: 'error',
          agentId: agent.id,
          from: segmentEndpointRef(segment.from, index - 1),
          to: waypointRef(waypoint, index),
          blockedAt,
          segmentIndex: index,
          waypointIndex: index,
          message: noLegalPath
            ? `${agent.label ?? agent.id} cannot reach Waypoint ${index + 1}: no legal navigable path exists${formatBlockedAt(blockedAt)}.`
            : executionBlocked
              ? `${agent.label ?? agent.id} route to Waypoint ${index + 1} would be blocked during simulation${formatBlockedAt(blockedAt)}.`
            : `${agent.label ?? agent.id} route to Waypoint ${index + 1} crosses terrain${formatBlockedAt(blockedAt)}.`
        });
        issues.push(issue);
        annotateWaypoint(agentPlan, index, issue);
      }

      const beachingRisk = estimateSegmentBeachingRisk({
        level,
        frame,
        start: segment.from,
        end: estimate.valid === false ? estimate.lastValid : segment.to
      });
      if (isBeachingRisk(beachingRisk)) {
        const issue = buildIssue({
          type: 'beachingRisk',
          reason: 'beachingRisk',
          severity: 'warning',
          agentId: agent.id,
          from: segmentEndpointRef(segment.from, index - 1),
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
          const issue = buildIssue({
            type: 'timeExceeded',
            reason: 'time',
            severity: 'error',
            agentId: agent.id,
            to: waypointRef(waypoint, index),
            segmentIndex: index,
            waypointIndex: index,
            message: `${agent.label ?? agent.id} Waypoint ${index + 1} exceeds the mission duration.`
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

      const fuelBudget = Number(agent.battery ?? agent.maxBattery ?? mission?.rules?.energyBudget ?? 100);
      if (Number.isFinite(fuelBudget) && cumulativeEnergy > fuelBudget) {
        const issue = buildIssue({
          type: 'fuelExceeded',
          reason: 'fuel',
          severity: 'error',
          agentId: agent.id,
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
      ok: issues.every((issue) => issue.severity !== 'error'),
      issues
    });
  }

  const issues = agentResults.flatMap((result) => result.issues);
  return {
    ok: issues.every((issue) => issue.severity !== 'error'),
    issueCount: issues.length,
    firstIssue: issues[0] ?? null,
    agentResults
  };
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
  const reasons = new Set([...(waypoint.validity?.reasons ?? []), reason]);
  waypoint.validity = {
    valid: issue.severity !== 'error' && waypoint.validity?.valid !== false,
    status: issue.severity === 'error' ? 'invalid' : 'warning',
    reasons: [...reasons],
    routeAudit: {
      issueType: issue.type,
      severity: issue.severity,
      reasons: [reason],
      message: issue.message,
      blockedAt: issue.blockedAt ?? null
    }
  };
  if (issue.severity === 'error') waypoint.validity.valid = false;
}

function outOfBoundsIssue(level, agent, waypoint, index) {
  const grid = level?.world?.grid ?? {};
  const x = Math.round(Number(waypoint?.x));
  const y = Math.round(Number(waypoint?.y));
  if (x >= 0 && y >= 0 && x < Number(grid.width) && y < Number(grid.height)) return null;
  return buildIssue({
    type: 'invalidCoordinate',
    reason: 'invalidCoordinate',
    severity: 'error',
    agentId: agent.id,
    to: waypointRef(waypoint, index),
    waypointIndex: index,
    message: `${agent.label ?? agent.id} Waypoint ${index + 1} is outside the grid.`
  });
}

function buildIssue(issue) {
  return {
    severity: 'error',
    reason: issue.type,
    ...issue
  };
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
    index,
    id: waypoint?.id ?? null,
    x: Number(waypoint?.x),
    y: Number(waypoint?.y)
  };
}

function formatBlockedAt(cell) {
  return cell ? ` at (${Math.round(Number(cell.x))}, ${Math.round(Number(cell.y))})` : '';
}

function formatBlockReason(reason) {
  return {
    terrain: 'terrain',
    tooShallow: 'too shallow',
    outsideMap: 'outside map',
    invalidPoint: 'invalid point'
  }[reason] ?? reason ?? 'blocked';
}

function isFinitePoint(point) {
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y));
}
