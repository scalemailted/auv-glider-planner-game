import { createEmptyPlan, addWaypoint } from './WaypointPlan.js';
import { roiScalar } from '../sim/ROIValue.js';
import { getMobileHazardsAtTime } from '../sim/MobileHazards.js';
import { depthEnergyMultiplier } from '../sim/DepthLayer.js';
import { getPlanningFrame } from '../sim/ChallengeMode.js';
import { normalizePriorityTargetRules, normalizePriorityTargets, getPriorityTargetPosition } from '../sim/PriorityTargets.js';
import { normalizeSamplingRules } from '../sim/MissionRules.js';
import { estimateTemporalSegment } from './TemporalWaypointPlanner.js';
import { applyRouteAuditToPlan, validateRoutePlanForExecution } from './RouteValidityAudit.js';
import { isCellNavigable } from './Navigability.js';
import { buildRouteSegmentsForAgent } from './RouteSegmentBuilder.js';
import { expandCellsBySamplingRadius, rasterizeRouteSegment } from '../roi/RoiMode.js';
import { evaluateSegmentForExecution } from './SegmentExecutionValidator.js';
import { estimateStochasticSegmentCurrentRisk } from './ShorelineRisk.js';

export function greedySolver(level, mission, options = {}) {
  return temporalGreedySolver(level, mission, options);
}

export function temporalGreedySolver(level, mission, options = {}) {
  const plan = createEmptyPlan(level, mission);
  plan.meta.name = 'Temporal Greedy Plan';
  plan.meta.solver = 'browser-temporal-greedy';
  plan.meta.source = 'temporalGreedy';
  plan.meta.plannerType = 'temporalGreedy';
  plan.meta.plannerVersion = 'v1';
  plan.meta.usesTemporalRoi = true;
  plan.meta.usesTravelCost = true;
  plan.meta.usesPriorityTargets = true;
  plan.meta.usesForecastProbability = true;
  plan.meta.usesFleetRemainingValue = true;
  plan.meta.depletesPriorAgentCoverage = true;
  const plannerChallengeMode = options.challengeMode ?? level.challengeMode ?? 'perfectKnowledge';
  const plannerRevealTruth = plannerChallengeMode === 'forecast'
    ? Boolean(options.usesOracle && options.revealTruth)
    : Boolean(options.revealTruth);
  plan.planner = {
    name: 'Temporal Greedy',
    type: 'temporalGreedy',
    usesForecast: plannerChallengeMode === 'forecast',
    usesTruth: plannerChallengeMode !== 'forecast' || plannerRevealTruth,
    usesOracle: Boolean(options.usesOracle && plannerRevealTruth),
    source: 'game'
  };
  plan.meta.planner = plan.planner;

  const cells = [];
  const grid = level?.world?.grid ?? {};
  const cellCount = Math.max(1, Number(grid.width ?? 1) * Number(grid.height ?? 1));
  const missionDuration = Number(level?.world?.time?.duration ?? 24);
  const maxWaypoints = Math.max(1, Number(options.maxWaypoints ?? Math.min(cellCount, Math.max(48, Math.ceil(missionDuration * 4)))));
  const maxPlannerIterations = Math.max(maxWaypoints, Number(options.maxPlannerIterations ?? Math.max(200, cellCount * Math.max(1, mission?.agents?.length ?? 1) * 4)));
  const startedAt = globalThis.performance?.now?.() ?? Date.now();
  const maxRuntimeMs = Number.isFinite(Number(options.maxRuntimeMs)) ? Number(options.maxRuntimeMs) : Infinity;
  const duration = Number(level?.world?.time?.duration ?? 0);
  const priorityTargets = normalizePriorityTargets(level);
  const depletion = createFleetDepletionState(level, mission, priorityTargets);
  for (let y = 0; y < level.world.grid.height; y += 1) {
    for (let x = 0; x < level.world.grid.width; x += 1) {
      if (!isCellNavigable(level, mission, x, y).ok) continue;
      cells.push({ x, y });
    }
  }

  const agents = mission.agents ?? [];
  const agentStops = [];

  for (const agent of agents) {
    let anchor = {
      agentId: agent.id,
      x: Number(agent.start?.x ?? 0),
      y: Number(agent.start?.y ?? 0),
      t: 0,
      source: 'start'
    };
    let remainingFuel = Number(agent.battery ?? agent.maxBattery ?? 100);
    const agentSampled = new Set([cellKey(anchor)]);
    let stop = null;
    const plannerStats = {
      unreachableCandidates: 0,
      blockedCandidates: 0,
      stochasticRiskCandidates: 0,
      timeRejectedCandidates: 0,
      fuelRejectedCandidates: 0,
      evaluatedCandidates: 0,
      feasibleCandidates: 0,
      lastCandidateStage: null
    };
    debugTemporalGreedyVisibility(plan.planner);
    for (let index = 0; index < maxWaypoints; index += 1) {
      if ((globalThis.performance?.now?.() ?? Date.now()) - startedAt > maxRuntimeMs) {
        stop = buildStop('planner_safety_limit_reached', anchor, remainingFuel, duration, {
          waypointCount: index,
          guardFailure: true,
          diagnostics: buildPlannerDiagnostics({
            maxPlannerIterations,
            maxRuntimeMs,
            acceptedWaypoints: index,
            anchor,
            remainingFuel,
            duration,
            agent,
            plannerStats
          })
        });
        debugTemporalGreedySafetyLimit(stop);
        break;
      }
      if (index >= maxPlannerIterations) {
        stop = buildStop('max_planner_iterations_after_no_progress', anchor, remainingFuel, duration, {
          waypointCount: index,
          guardFailure: true,
          diagnostics: buildPlannerDiagnostics({
            maxPlannerIterations,
            maxRuntimeMs,
            acceptedWaypoints: index,
            anchor,
            remainingFuel,
            duration,
            agent,
            plannerStats
          })
        });
        debugTemporalGreedySafetyLimit(stop);
        break;
      }
      if (duration && Number(anchor.t ?? 0) >= duration - minimumMoveTime(agent)) {
        stop = buildStop('mission_time_exhausted', anchor, remainingFuel, duration, { waypointCount: index });
        break;
      }
      if (Number.isFinite(remainingFuel) && remainingFuel <= minimumFuelReserve(mission)) {
        stop = buildStop('fuel_exhausted', anchor, remainingFuel, duration, { waypointCount: index });
        break;
      }
      const candidate = chooseTemporalCell({
        level,
        mission,
        agent,
        anchor,
        remainingFuel,
        cells,
        sampled: agentSampled,
        priorityTargets,
        depletion,
        challengeMode: plannerChallengeMode,
        revealTruth: plannerRevealTruth,
        forecastMemberId: options.forecastMemberId ?? null,
        duration,
        plannerStats,
        iteration: index
      });
      if (!candidate) {
        stop = buildStop(plannerStats.stochasticRiskCandidates > 0
          ? 'no_safe_forecast_feasible_candidates'
          : 'no_reachable_feasible_candidates', anchor, remainingFuel, duration, {
          waypointCount: index,
          unreachableCandidates: plannerStats.unreachableCandidates,
          blockedCandidates: plannerStats.blockedCandidates,
          stochasticRiskCandidates: plannerStats.stochasticRiskCandidates,
          timeRejectedCandidates: plannerStats.timeRejectedCandidates,
          fuelRejectedCandidates: plannerStats.fuelRejectedCandidates,
          diagnostics: buildPlannerDiagnostics({
            maxPlannerIterations,
            maxRuntimeMs,
            acceptedWaypoints: index,
            anchor,
            remainingFuel,
            duration,
            agent,
            plannerStats
          })
        });
        break;
      }
      addWaypoint(plan, agent.id, {
        window: candidate.window,
        t: candidate.arrivalTime,
        estimatedArrivalTime: candidate.arrivalTime,
        segmentTravelTime: candidate.segment.estimatedTravelTime,
        segmentEnergy: candidate.segment.energy,
        x: candidate.x,
        y: candidate.y,
        action: 'sample',
        note: `stage=${candidate.stage} temporal=${candidate.value.toFixed(3)} priority=${candidate.priorityBonus.toFixed(1)} energy=${candidate.segment.energy.toFixed(1)} score=${candidate.score.toFixed(3)}`
      });
      debugTemporalGreedyCommit({
        waypointIndex: index,
        previousTime: anchor.t,
        newTime: candidate.arrivalTime,
        previousFuel: remainingFuel,
        newFuel: remainingFuel - candidate.segment.energy,
        position: candidate
      });
      agentSampled.add(cellKey(candidate));
      remainingFuel -= candidate.segment.energy;
      anchor = {
        agentId: agent.id,
        x: candidate.x,
        y: candidate.y,
        t: candidate.arrivalTime,
        source: 'waypoint',
        waypointIndex: index
      };
    }
    if (!stop) {
      stop = buildStop('max_planner_iterations', anchor, remainingFuel, duration, {
        waypointCount: maxWaypoints,
        unreachableCandidates: plannerStats.unreachableCandidates,
        blockedCandidates: plannerStats.blockedCandidates,
        stochasticRiskCandidates: plannerStats.stochasticRiskCandidates,
        timeRejectedCandidates: plannerStats.timeRejectedCandidates,
        fuelRejectedCandidates: plannerStats.fuelRejectedCandidates,
        diagnostics: buildPlannerDiagnostics({
          maxPlannerIterations,
          maxRuntimeMs,
          acceptedWaypoints: maxWaypoints,
          anchor,
          remainingFuel,
          duration,
          agent,
          plannerStats
        })
      });
    }
    const agentPlan = plan.agentPlans?.find((candidate) => candidate.agentId === agent.id);
    const depletionSummary = applyAgentPlanDepletion(depletion, {
      level,
      mission,
      plan,
      agent,
      agentPlan,
      challengeMode: plannerChallengeMode,
      revealTruth: plannerRevealTruth,
      forecastMemberId: options.forecastMemberId ?? null
    });
    stop.sharedDepletion = {
      enabled: agents.length > 1,
      plannedOrder: agentStops.length + 1,
      claimedCells: depletionSummary.claimedCells,
      claimedPriorityTargets: depletionSummary.claimedPriorityTargets,
      duplicateSamplesAvoided: depletion.duplicateSamplesAvoided
    };
    agentStops.push({ agentId: agent.id, ...stop });
  }
  plan.meta.greedyStopsByAgent = agentStops;
  plan.meta.sharedDepletion = summarizeFleetDepletion(depletion, agents.length);
  validateAndRepairBaselinePlan(plan, level, mission);
  reconcileGreedyStopsWithAcceptedPlan(plan, level, mission);
  plan.meta.greedyStop = summarizeStops(plan.meta.greedyStopsByAgent, duration);
  debugTemporalGreedySummary(plan, level, mission);

  return plan;
}

function validateAndRepairBaselinePlan(plan, level, mission) {
  let audit = validateRoutePlanForExecution({ level, mission, plan });
  debugTemporalGreedyInvalidRoute(audit, plan);
  if (!audit.ok) {
    for (const result of audit.agentResults ?? []) {
      const firstInvalid = (result.issues ?? [])
        .filter((issue) => Number.isInteger(Number(issue.waypointIndex ?? issue.to?.index)))
        .sort((a, b) => Number(a.waypointIndex ?? a.to?.index) - Number(b.waypointIndex ?? b.to?.index))[0];
      if (!firstInvalid) continue;
      const agentPlan = plan.agentPlans?.find((candidate) => candidate.agentId === result.agentId);
      const truncateAt = Math.max(0, Number(firstInvalid.waypointIndex ?? firstInvalid.to?.index));
      if (agentPlan?.waypoints?.length > truncateAt) {
        agentPlan.waypoints.splice(truncateAt);
        const stop = plan.meta.greedyStopsByAgent?.find((candidate) => candidate.agentId === result.agentId);
        if (stop) {
          stop.stopReason = isRouteBlockedIssue(firstInvalid)
            ? 'planner_generated_blocked_segment'
            : 'route_blocked_by_terrain';
          stop.validationIssues = result.issues;
          stop.waypointCount = agentPlan.waypoints.length;
        }
      }
    }
    audit = validateRoutePlanForExecution({ level, mission, plan });
  }
  applyRouteAuditToPlan(plan, audit);
  plan.meta.valid = audit.ok;
  plan.meta.validationIssues = audit.agentResults?.flatMap((result) => result.issues ?? []) ?? [];
  if (!audit.ok) {
    plan.meta.stopReason = hasRouteBlockedIssue(audit)
      ? 'planner_generated_blocked_segment'
      : 'no_executable_route_after_validation';
  }
}

function reconcileGreedyStopsWithAcceptedPlan(plan, level, mission) {
  const duration = Number(level?.world?.time?.duration ?? 0);
  for (const stop of plan?.meta?.greedyStopsByAgent ?? []) {
    const agent = mission?.agents?.find((candidate) => candidate.id === stop.agentId);
    const agentPlan = plan?.agentPlans?.find((candidate) => candidate.agentId === stop.agentId);
    const waypoints = agentPlan?.waypoints ?? [];
    const acceptedWaypointCount = waypoints.length;
    const lastWaypoint = waypoints.at(-1) ?? null;
    const acceptedTime = acceptedWaypointCount
      ? Number(lastWaypoint?.estimatedArrivalTime ?? lastWaypoint?.t ?? 0)
      : 0;
    const acceptedEnergy = waypoints.reduce((sum, waypoint) => sum + Math.max(0, Number(waypoint.segmentEnergy ?? 0)), 0);
    const fuelBudget = Number(agent?.battery ?? agent?.maxBattery ?? 100);
    stop.acceptedWaypointCount = acceptedWaypointCount;
    stop.acceptedRouteTime = round(acceptedTime);
    stop.acceptedFuelUsed = round(acceptedEnergy);
    stop.waypointCount = acceptedWaypointCount;
    stop.stopTime = round(acceptedTime);
    stop.remainingMissionTime = round(Math.max(0, Number(duration || 0) - acceptedTime));
    stop.remainingFuel = round(Math.max(0, fuelBudget - acceptedEnergy));
    stop.accounting = {
      acceptedWaypointCount,
      acceptedRouteTime: stop.acceptedRouteTime,
      acceptedFuelUsed: stop.acceptedFuelUsed,
      candidateEvaluations: Number(stop.diagnostics?.evaluatedCandidates ?? 0),
      rejectedCandidates: {
        blocked: Number(stop.blockedCandidates ?? stop.diagnostics?.rejectionSummary?.blocked ?? 0),
        unreachable: Number(stop.unreachableCandidates ?? stop.diagnostics?.rejectionSummary?.unreachable ?? 0),
        unsafeForecast: Number(stop.stochasticRiskCandidates ?? stop.diagnostics?.rejectionSummary?.unsafeForecast ?? 0),
        time: Number(stop.timeRejectedCandidates ?? stop.diagnostics?.rejectionSummary?.time ?? 0),
        fuel: Number(stop.fuelRejectedCandidates ?? stop.diagnostics?.rejectionSummary?.fuel ?? 0)
      }
    };
    if (acceptedWaypointCount === 0 && shouldReplaceZeroWaypointStop(stop.stopReason)) {
      stop.stopReason = stop.validationIssues?.length
        ? 'no_candidate_passed_validation'
        : stop.stochasticRiskCandidates > 0
          ? 'no_safe_forecast_feasible_candidates'
          : 'no_reachable_feasible_candidates';
    }
  }
}

function shouldReplaceZeroWaypointStop(reason) {
  return new Set([
    'mission_time_exhausted',
    'fuel_exhausted',
    'route_blocked_by_terrain',
    'planner_generated_blocked_segment',
    'no_executable_route_after_validation',
    'route_validation_failed',
    'max_planner_iterations'
  ]).has(reason);
}

function hasRouteBlockedIssue(audit) {
  return (audit?.agentResults ?? []).some((result) =>
    (result.issues ?? []).some((issue) => isRouteBlockedIssue(issue))
  );
}

function isRouteBlockedIssue(issue) {
  return issue?.type === 'segmentBlocked' || issue?.reason === 'routeBlocked';
}

function chooseTemporalCell({
  level,
  mission,
  agent,
  anchor,
  remainingFuel,
  cells,
  sampled,
  priorityTargets,
  depletion,
  challengeMode,
  revealTruth,
  forecastMemberId,
  duration,
  plannerStats = null,
  iteration = 0
}) {
  const candidates = [];
  const loopStartStats = snapshotPlannerStats(plannerStats);
  for (const cell of cells) {
    if (sampled.has(cellKey(cell))) continue;
    if (cell.x === Math.round(anchor.x) && cell.y === Math.round(anchor.y)) continue;
    plannerStats && (plannerStats.evaluatedCandidates += 1);
    const segment = estimateTemporalSegment({
      level,
      mission,
      agent,
      from: anchor,
      to: cell,
      challengeMode,
      revealTruth,
      forecastMemberId
    });
    const arrivalTime = Number(anchor.t ?? 0) + Number(segment.estimatedTravelTime ?? 0);
    if (!segment.valid) {
      if (segment.reachability?.reachable === false) plannerStats && (plannerStats.unreachableCandidates += 1);
      else plannerStats && (plannerStats.blockedCandidates += 1);
      debugTemporalGreedyCandidate({ from: anchor, to: cell, segment, execution: null, accepted: false, reason: 'segmentInvalid' });
      continue;
    }
    if (duration && arrivalTime > duration) {
      plannerStats && (plannerStats.timeRejectedCandidates += 1);
      continue;
    }
    if (Number.isFinite(remainingFuel) && segment.energy > remainingFuel) {
      plannerStats && (plannerStats.fuelRejectedCandidates += 1);
      continue;
    }
    const segmentFrame = getPlanningFrame(level, Number(anchor.t ?? 0), { challengeMode, revealTruth, forecastMemberId });
    const execution = evaluateSegmentForExecution({
      level,
      mission,
      agent,
      from: anchor,
      to: cell,
      startTime: Number(anchor.t ?? 0),
      travelTime: segment.estimatedTravelTime,
      fuelRemaining: remainingFuel,
      frame: segmentFrame
    });
    if (!execution.ok) {
      if (execution.reason === 'noLegalPath' || execution.reason === 'outsideMap' || execution.reason === 'terrain' || execution.reason === 'tooShallow') {
        plannerStats && (plannerStats.unreachableCandidates += 1);
      } else {
        plannerStats && (plannerStats.blockedCandidates += 1);
      }
      debugTemporalGreedyCandidate({ from: anchor, to: cell, segment, execution, accepted: false, reason: execution.reason });
      continue;
    }

    const arrivalFrame = getPlanningFrame(level, arrivalTime, { challengeMode, revealTruth, forecastMemberId });
    const stochasticRisk = estimateStochasticSegmentCurrentRisk({
      level,
      frame: arrivalFrame,
      start: anchor,
      end: cell,
      stochasticMode: challengeMode === 'forecast' && !revealTruth
    });
    if (stochasticRisk.blocking) {
      plannerStats && (plannerStats.stochasticRiskCandidates += 1);
      debugTemporalGreedyStochasticRisk({ from: anchor, to: cell, stochasticRisk, rejected: true });
      continue;
    }
    const rawValue = roiScalar(arrivalFrame?.roi?.[cell.y]?.[cell.x] ?? 0, 'expectedValue');
    const probability = roiScalar(arrivalFrame?.roi?.[cell.y]?.[cell.x] ?? 0, 'probability');
    const depletionMultiplier = getRemainingValueMultiplier(depletion, cell, arrivalTime);
    const value = rawValue * depletionMultiplier;
    const priority = priorityTargetBonus(priorityTargets, cell, arrivalTime, depletion);
    const priorityBonus = priority.bonus;
    const hazardPenalty = Number(level.layers?.hazards?.[cell.y]?.[cell.x] ?? 0) * 40;
    const mobileRisk = mobileHazardRisk(level, cell.x, cell.y, arrivalTime);
    const depthPenalty = Math.max(0, depthEnergyMultiplier(level, mission, cell.x, cell.y) - 1);
    const ensembleRisk = ensembleDisagreementAt(level, cell.x, cell.y, arrivalTime, { challengeMode, forecastMemberId });
    const stochasticRiskPenalty = Number(stochasticRisk.value ?? 0) * 90;
    const energyPenalty = Number(segment.energy ?? 0) * 0.35;
    const travelTimePenalty = Number(segment.estimatedTravelTime ?? 0) * 0.08;
    const score = value
      + priorityBonus
      - energyPenalty
      - travelTimePenalty
      - hazardPenalty
      - mobileRisk * 12
      - depthPenalty * 18
      - ensembleRisk * 12
      - stochasticRiskPenalty;
    const candidate = {
      ...cell,
      segment,
      execution,
      arrivalTime,
      window: windowForTime(level, arrivalTime),
      rawValue,
      value,
      probability,
      priorityBonus,
      priorityTargetIds: priority.targetIds,
      depletionMultiplier,
      stochasticRisk,
      score,
      distance: segment.distance,
      totalValue: value + priorityBonus,
      riskPenalty: hazardPenalty + mobileRisk * 12 + depthPenalty * 18 + ensembleRisk * 12 + stochasticRiskPenalty
    };
    if (stochasticRisk.warning) debugTemporalGreedyStochasticRisk({ from: anchor, to: cell, stochasticRisk, rejected: false, score });
    debugTemporalGreedyCandidate({ from: anchor, to: cell, segment, execution, score, accepted: false });
    candidates.push(candidate);
    plannerStats && (plannerStats.feasibleCandidates += 1);
  }
  debugTemporalGreedyLoop({
    iteration,
    anchor,
    remainingFuel,
    duration,
    candidateCount: cells.length,
    feasibleCandidateCount: candidates.length,
    plannerStats,
    loopStartStats
  });
  if (!candidates.length) return null;
  const selected = chooseFromStage(candidates, 'high_value')
    ?? chooseFromStage(candidates, 'moderate_value')
    ?? chooseFromStage(candidates, 'safe_continuation')
    ?? null;
  if (selected && Number(selected.rawValue ?? 0) > Number(selected.value ?? 0)) {
    depletion.duplicateSamplesAvoided += 1;
  }
  if (selected) {
    plannerStats && (plannerStats.lastCandidateStage = selected.stage);
    debugTemporalGreedyAccepted(selected);
  }
  return selected;
}

function chooseFromStage(candidates, stage) {
  const filtered = candidates.filter((candidate) => {
    if (stage === 'high_value') return candidate.totalValue > 0.35 || candidate.priorityBonus > 0;
    if (stage === 'moderate_value') return candidate.totalValue > 0.04 || candidate.probability > 0.2;
    return candidate.riskPenalty < 45;
  });
  if (!filtered.length) return null;
  const scored = filtered.map((candidate) => ({
    ...candidate,
    stage,
    score: stageScore(candidate, stage)
  }));
  return scored.sort((a, b) => b.score - a.score || a.segment.energy - b.segment.energy || a.arrivalTime - b.arrivalTime)[0] ?? null;
}

function stageScore(candidate, stage) {
  if (stage === 'high_value') return candidate.score;
  if (stage === 'moderate_value') {
    return candidate.totalValue * 1.6
      + candidate.probability * 0.25
      - Number(candidate.segment.energy ?? 0) * 0.22
      - Number(candidate.segment.estimatedTravelTime ?? 0) * 0.06
      - candidate.riskPenalty * 0.04;
  }
  return safeContinuationScore(candidate);
}

function safeContinuationScore(candidate) {
  const currentAssist = Number(candidate.segment.currentAssist ?? 0);
  const energy = Number(candidate.segment.energy ?? 0);
  const travelTime = Number(candidate.segment.estimatedTravelTime ?? 0);
  const distance = Number(candidate.distance ?? 0);
  return currentAssist * 0.35
    + Math.min(0.3, distance * 0.03)
    + candidate.totalValue * 0.4
    - energy * 0.18
    - travelTime * 0.04
    - candidate.riskPenalty * 0.08;
}

function priorityTargetBonus(targets, cell, time, depletion = null) {
  let bonus = 0;
  const targetIds = [];
  for (const target of targets) {
    if (depletion?.claimedTargets?.has(target.id) && !depletion.allowSharedPriorityTargets) continue;
    const position = getPriorityTargetPosition(target, time);
    if (!position?.active) continue;
    const radius = Math.max(0.05, Number(target.radius ?? 0.75));
    const distance = Math.hypot(Number(cell.x) - Number(position.x), Number(cell.y) - Number(position.y));
    if (distance <= radius + 0.5) {
      bonus += Number(target.value ?? 0);
      targetIds.push(target.id);
    }
  }
  return { bonus, targetIds };
}

function createFleetDepletionState(level, mission, priorityTargets = []) {
  const samplingRules = normalizeSamplingRules(mission);
  const priorityRules = normalizePriorityTargetRules(mission);
  return {
    level,
    mission,
    samplingRules,
    priorityRules,
    claimedCells: new Map(),
    claimedTargets: new Set(),
    priorityTargets,
    duplicateSamplesAvoided: 0,
    allowSharedPriorityTargets: priorityRules.captureMode === 'shared' || priorityRules.captureMode === 'multiple',
    enabled: (mission?.agents ?? []).length > 1
  };
}

function applyAgentPlanDepletion(depletion, { level, mission, agent, agentPlan, challengeMode, revealTruth, forecastMemberId }) {
  if (!agentPlan) return { claimedCells: 0, claimedPriorityTargets: 0 };
  const beforeCells = depletion.claimedCells.size;
  const beforeTargets = depletion.claimedTargets.size;
  const route = buildRouteSegmentsForAgent({ level, mission, agent, agentPlan });
  const samplingRadius = Number(mission?.rules?.samplingRadius ?? agent?.samplingRadius ?? 0.75);
  for (const segment of route.segments ?? []) {
    const cells = expandCellsBySamplingRadius(rasterizeRouteSegment(segment, level), samplingRadius, level);
    for (const cell of cells) claimDepletionCell(depletion, cell, Number(segment.to?.estimatedArrivalTime ?? segment.to?.t ?? 0), agent.id, 'segment');
  }
  for (const waypoint of agentPlan.waypoints ?? []) {
    const cells = expandCellsBySamplingRadius([{ x: waypoint.x, y: waypoint.y }], samplingRadius, level);
    for (const cell of cells) claimDepletionCell(depletion, cell, Number(waypoint.estimatedArrivalTime ?? waypoint.t ?? 0), agent.id, 'waypoint');
    for (const target of priorityTargetBonus(depletion.priorityTargets, waypoint, Number(waypoint.estimatedArrivalTime ?? waypoint.t ?? 0), { ...depletion, claimedTargets: new Set(), allowSharedPriorityTargets: true }).targetIds) {
      if (!depletion.allowSharedPriorityTargets) depletion.claimedTargets.add(target);
    }
  }
  return {
    claimedCells: depletion.claimedCells.size - beforeCells,
    claimedPriorityTargets: depletion.claimedTargets.size - beforeTargets
  };
}

function claimDepletionCell(depletion, cell, time, agentId, source) {
  const key = cellKey(cell);
  const entry = depletion.claimedCells.get(key) ?? {
    x: Math.round(Number(cell.x)),
    y: Math.round(Number(cell.y)),
    count: 0,
    windows: new Set(),
    claims: []
  };
  entry.count += 1;
  entry.lastWindow = missionWindow(depletion.level, time);
  entry.windows.add(entry.lastWindow);
  entry.claims.push({ agentId, source, t: round(time), window: entry.lastWindow });
  depletion.claimedCells.set(key, entry);
}

function getRemainingValueMultiplier(depletion, cell, time) {
  if (!depletion?.claimedCells?.size) return 1;
  const rules = depletion.samplingRules ?? {};
  const key = cellKey(cell);
  const exact = depletion.claimedCells.get(key);
  if (rules.mode === 'persistent') return exact ? Number(rules.persistentWindowMultiplier ?? 1) : 1;
  if (rules.mode === 'cooldown') {
    if (!exact) return 1;
    const currentWindow = missionWindow(depletion.level, time);
    const lastWindow = Number(exact.lastWindow ?? -Infinity);
    return currentWindow - lastWindow < Number(rules.cooldownWindows ?? 0)
      ? Number(rules.duplicateValueMultiplier ?? 0)
      : 1;
  }
  if (rules.mode === 'diminishing') {
    const radius = Number(rules.localDepletionRadius ?? 0);
    if (radius <= 0) return exact ? Number(rules.depletionFactor ?? 0) : 1;
    for (const claimed of depletion.claimedCells.values()) {
      if (Math.hypot(Number(cell.x) - claimed.x, Number(cell.y) - claimed.y) <= radius) return Number(rules.depletionFactor ?? 0);
    }
    return 1;
  }
  return exact ? Number(rules.duplicateValueMultiplier ?? 0) : 1;
}

function missionWindow(level, time) {
  const windowSize = Number(level?.world?.time?.planningWindow ?? 1);
  if (!Number.isFinite(windowSize) || windowSize <= 0) return 0;
  return Math.max(0, Math.floor(Number(time ?? 0) / windowSize));
}

function summarizeFleetDepletion(depletion, agentCount) {
  return {
    enabled: Number(agentCount ?? 0) > 1,
    agentCount: Number(agentCount ?? 0),
    samplingMode: depletion?.samplingRules?.mode ?? 'unique',
    claimedCells: Number(depletion?.claimedCells?.size ?? 0),
    claimedPriorityTargets: Number(depletion?.claimedTargets?.size ?? 0),
    duplicateSamplesAvoided: Number(depletion?.duplicateSamplesAvoided ?? 0),
    priorityCaptureMode: depletion?.priorityRules?.captureMode ?? 'once',
    footprint: 'route_segments_and_waypoint_sampling_radius',
    timeAware: ['cooldown', 'persistent'].includes(depletion?.samplingRules?.mode)
  };
}

function snapshotPlannerStats(stats = {}) {
  return {
    unreachableCandidates: Number(stats.unreachableCandidates ?? 0),
    blockedCandidates: Number(stats.blockedCandidates ?? 0),
    stochasticRiskCandidates: Number(stats.stochasticRiskCandidates ?? 0),
    timeRejectedCandidates: Number(stats.timeRejectedCandidates ?? 0),
    fuelRejectedCandidates: Number(stats.fuelRejectedCandidates ?? 0),
    evaluatedCandidates: Number(stats.evaluatedCandidates ?? 0),
    feasibleCandidates: Number(stats.feasibleCandidates ?? 0)
  };
}

function buildPlannerDiagnostics({
  maxPlannerIterations,
  maxRuntimeMs,
  acceptedWaypoints,
  anchor,
  remainingFuel,
  duration,
  agent,
  plannerStats = {}
} = {}) {
  const fuelBudget = Number(agent?.battery ?? agent?.maxBattery ?? 0);
  const fuelUsed = Number.isFinite(fuelBudget) ? Math.max(0, fuelBudget - Number(remainingFuel ?? 0)) : null;
  const rejectionSummary = {
    blocked: Number(plannerStats.blockedCandidates ?? 0),
    unreachable: Number(plannerStats.unreachableCandidates ?? 0),
    unsafeForecast: Number(plannerStats.stochasticRiskCandidates ?? 0),
    time: Number(plannerStats.timeRejectedCandidates ?? 0),
    fuel: Number(plannerStats.fuelRejectedCandidates ?? 0)
  };
  const mostCommonRejection = Object.entries(rejectionSummary).sort((a, b) => b[1] - a[1])[0] ?? ['none', 0];
  return {
    maxPlannerIterations,
    maxRuntimeMs: Number.isFinite(maxRuntimeMs) ? maxRuntimeMs : null,
    acceptedWaypoints,
    currentTime: round(anchor?.t ?? 0),
    missionDuration: round(duration),
    fuelUsed: fuelUsed === null ? null : round(fuelUsed),
    fuelBudget: Number.isFinite(fuelBudget) ? round(fuelBudget) : null,
    currentCell: pointCell(anchor),
    rejectionSummary,
    mostCommonRejection: { reason: mostCommonRejection[0], count: mostCommonRejection[1] },
    evaluatedCandidates: Number(plannerStats.evaluatedCandidates ?? 0),
    feasibleCandidates: Number(plannerStats.feasibleCandidates ?? 0),
    lastAcceptedWaypoint: pointCell(anchor),
    lastCandidateStage: plannerStats.lastCandidateStage ?? null
  };
}

function debugTemporalGreedyLoop({ iteration, anchor, remainingFuel, duration, candidateCount, feasibleCandidateCount, plannerStats, loopStartStats } = {}) {
  if (!globalThis.ANCHOR_DEBUG_TEMPORAL_GREEDY) return;
  const delta = {
    rejectedBlocked: Number(plannerStats?.blockedCandidates ?? 0) - Number(loopStartStats?.blockedCandidates ?? 0),
    rejectedUnsafe: Number(plannerStats?.stochasticRiskCandidates ?? 0) - Number(loopStartStats?.stochasticRiskCandidates ?? 0),
    rejectedFuel: Number(plannerStats?.fuelRejectedCandidates ?? 0) - Number(loopStartStats?.fuelRejectedCandidates ?? 0),
    rejectedTime: Number(plannerStats?.timeRejectedCandidates ?? 0) - Number(loopStartStats?.timeRejectedCandidates ?? 0),
    rejectedUnreachable: Number(plannerStats?.unreachableCandidates ?? 0) - Number(loopStartStats?.unreachableCandidates ?? 0)
  };
  globalThis.console?.debug?.('[TemporalGreedy][Loop]', {
    iteration,
    acceptedWaypoints: iteration,
    currentTime: round(anchor?.t ?? 0),
    missionDuration: round(duration),
    remainingFuel: round(remainingFuel),
    currentCell: pointCell(anchor),
    candidateCount,
    feasibleCandidateCount,
    ...delta,
    stopCandidateStage: plannerStats?.lastCandidateStage ?? null
  });
}

function debugTemporalGreedySafetyLimit(stop = {}) {
  if (!globalThis.ANCHOR_DEBUG_TEMPORAL_GREEDY) return;
  globalThis.console?.warn?.('[TemporalGreedy][SafetyLimitReached]', stop.diagnostics ?? stop);
}

function debugTemporalGreedyCandidate({ from, to, segment, execution, score = null, accepted = false, reason = null } = {}) {
  if (!globalThis.ANCHOR_DEBUG_TEMPORAL_GREEDY) return;
  globalThis.console?.debug?.('[TemporalGreedy][Candidate]', {
    fromCell: pointCell(from),
    toCell: pointCell(to),
    endpointNavigable: segment?.valid !== false || execution?.reason !== 'terrain',
    segmentOk: execution ? execution.ok : segment?.valid !== false,
    blockReason: reason ?? execution?.reason ?? segment?.reason ?? null,
    blockedCell: execution?.blockedCell ?? segment?.blockedAt ?? null,
    travelTime: execution?.travelTime ?? segment?.estimatedTravelTime ?? null,
    energyCost: execution?.energyCost ?? segment?.energy ?? null,
    score,
    accepted
  });
}

function debugTemporalGreedyAccepted(candidate) {
  if (!globalThis.ANCHOR_DEBUG_TEMPORAL_GREEDY) return;
  globalThis.console?.debug?.('[TemporalGreedy][Accepted]', {
    waypointIndex: candidate?.waypointIndex ?? null,
    toCell: pointCell(candidate),
    validationOk: true,
    travelTime: candidate?.execution?.travelTime ?? candidate?.segment?.estimatedTravelTime ?? null,
    energyCost: candidate?.execution?.energyCost ?? candidate?.segment?.energy ?? null
  });
}

function debugTemporalGreedyCommit({ waypointIndex, previousTime, newTime, previousFuel, newFuel, position } = {}) {
  if (!globalThis.ANCHOR_DEBUG_TEMPORAL_GREEDY) return;
  globalThis.console?.debug?.('[TemporalGreedy][Commit]', {
    waypointIndex,
    previousTime: round(previousTime),
    newTime: round(newTime),
    previousFuel: round(previousFuel),
    newFuel: round(newFuel),
    position: pointCell(position)
  });
}

function debugTemporalGreedySummary(plan, level, mission) {
  if (!globalThis.ANCHOR_DEBUG_TEMPORAL_GREEDY) return;
  const stop = plan?.meta?.greedyStop ?? {};
  const acceptedWaypoints = (plan?.agentPlans ?? []).reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0);
  const fuelBudget = (mission?.agents ?? []).reduce((sum, agent) => sum + Number(agent.battery ?? agent.maxBattery ?? 100), 0);
  globalThis.console?.debug?.('[TemporalGreedy][Summary]', {
    acceptedWaypoints,
    plannedTime: stop.stopTime ?? 0,
    missionDuration: Number(level?.world?.time?.duration ?? 0),
    fuelUsed: Math.max(0, fuelBudget - Number(stop.remainingFuel ?? fuelBudget)),
    fuelBudget,
    stopReason: stop.stopReason,
    rejectionSummary: (stop.agents ?? []).map((agentStop) => agentStop.accounting?.rejectedCandidates ?? agentStop.diagnostics?.rejectionSummary ?? {})
  });
}

function debugTemporalGreedyInvalidRoute(audit, plan) {
  if (!globalThis.ANCHOR_DEBUG_TEMPORAL_GREEDY || audit?.ok !== false) return;
  globalThis.console?.warn?.('[TemporalGreedy][InvalidGeneratedRoute]', {
    firstBlockingError: audit.firstIssue ?? audit.agentResults?.flatMap((result) => result.issues ?? [])?.[0] ?? null,
    waypoints: (plan?.agentPlans ?? []).map((agentPlan) => ({
      agentId: agentPlan.agentId,
      waypoints: (agentPlan.waypoints ?? []).map(pointCell)
    }))
  });
}

function debugTemporalGreedyStochasticRisk({ from, to, stochasticRisk, rejected = false, score = null } = {}) {
  if (!globalThis.ANCHOR_DEBUG_TEMPORAL_GREEDY) return;
  globalThis.console?.debug?.('[TemporalGreedy][StochasticRisk]', {
    fromCell: pointCell(from),
    toCell: pointCell(to),
    stochasticMode: true,
    shoreDistance: stochasticRisk?.shoreDistance ?? null,
    forecastConfidence: stochasticRisk?.forecastConfidence ?? null,
    currentKnown: stochasticRisk?.currentKnown ?? null,
    currentTowardLand: stochasticRisk?.currentTowardLand ?? null,
    riskScore: stochasticRisk?.value ?? 0,
    rejected,
    reason: stochasticRisk?.message ?? null,
    score
  });
}

function debugTemporalGreedyVisibility(planner = {}) {
  if (!globalThis.ANCHOR_DEBUG_TEMPORAL_GREEDY) return;
  globalThis.console?.debug?.('[TemporalGreedy][Visibility]', {
    usesForecast: Boolean(planner.usesForecast),
    usesTruth: Boolean(planner.usesTruth),
    usesOracle: Boolean(planner.usesOracle)
  });
}

function pointCell(point) {
  if (!point) return null;
  return {
    x: Math.round(Number(point.x)),
    y: Math.round(Number(point.y))
  };
}

function ensembleDisagreementAt(level, x, y, time = 0, options = {}) {
  const members = level?.layers?.forecasts ?? [];
  if (members.length < 2) return 0;
  const values = members.map((member) => {
    const frame = getPlanningFrame({ ...level, layers: { ...level.layers, forecasts: [member] } }, time, { challengeMode: options.challengeMode ?? 'forecast', forecastMemberId: member.id });
    return roiScalar(frame?.roi?.[y]?.[x] ?? 0, 'expectedValue');
  });
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
}

function mobileHazardRisk(level, x, y, arrivalTime = null) {
  if (arrivalTime !== null) {
    return getMobileHazardsAtTime(level, arrivalTime).reduce((risk, hazard) => {
      const radius = Number(hazard.radius ?? 1);
      const distance = Math.hypot(x - Number(hazard.x), y - Number(hazard.y));
      return distance <= radius + 1.5 ? risk + Math.max(0, radius + 1.5 - distance) : risk;
    }, 0);
  }
  const duration = level?.world?.time?.duration ?? 1;
  const times = [0, duration * 0.33, duration * 0.66, duration];
  let risk = 0;
  for (const time of times) {
    for (const hazard of getMobileHazardsAtTime(level, time)) {
      const radius = Number(hazard.radius ?? 1);
      const distance = Math.hypot(x - Number(hazard.x), y - Number(hazard.y));
      if (distance <= radius + 1.5) risk += Math.max(0, radius + 1.5 - distance);
    }
  }
  return risk;
}

function windowForTime(level, time) {
  const windowSize = Number(level?.world?.time?.planningWindow ?? 1);
  if (!Number.isFinite(windowSize) || windowSize <= 0) return 0;
  return Math.max(0, Math.floor(Number(time ?? 0) / windowSize));
}

function cellKey(cell) {
  return `${Math.round(Number(cell.x))},${Math.round(Number(cell.y))}`;
}

function buildStop(stopReason, anchor, remainingFuel, duration, extra = {}) {
  const stopTime = Number(anchor?.t ?? 0);
  return {
    stopReason,
    stopTime: round(stopTime),
    remainingMissionTime: round(Math.max(0, Number(duration || 0) - stopTime)),
    remainingFuel: round(remainingFuel),
    ...extra
  };
}

function summarizeStops(stops, duration) {
  const latest = [...stops].sort((a, b) => Number(b.stopTime ?? 0) - Number(a.stopTime ?? 0))[0] ?? {};
  return {
    stopReason: latest.stopReason ?? 'unknown',
    stopTime: round(latest.stopTime ?? 0),
    remainingMissionTime: round(Math.max(0, Number(duration || 0) - Number(latest.stopTime ?? 0))),
    remainingFuel: round(stops.reduce((sum, stop) => sum + Number(stop.remainingFuel ?? 0), 0)),
    agents: stops
  };
}

function agentsSafetyMargin(mission) {
  return Math.max(1, (mission?.agents ?? []).length) * 2;
}

function minimumMoveTime(agent = {}) {
  const speed = Math.max(0.05, Number(agent.maxSpeed ?? 1));
  return Math.min(0.5, 0.5 / speed);
}

function minimumFuelReserve(mission = {}) {
  return Math.max(0, Number(mission?.physics?.energyPerCell ?? 1) * 0.1);
}

function round(value, digits = 2) {
  return Number(Number(value || 0).toFixed(digits));
}
