import { createEmptyPlan, addWaypoint } from './WaypointPlan.js';
import { roiScalar } from '../sim/ROIValue.js';
import { getMobileHazardsAtTime } from '../sim/MobileHazards.js';
import { depthEnergyMultiplier } from '../sim/DepthLayer.js';
import { getPlanningFrame } from '../sim/ChallengeMode.js';
import { normalizePriorityTargetRules, normalizePriorityTargets, getPriorityTargetPosition } from '../sim/PriorityTargets.js';
import { normalizeSamplingRules } from '../sim/MissionRules.js';
import { estimateTemporalSegment } from './TemporalWaypointPlanner.js';
import { applyRouteAuditToPlan, validateRoutePlanForExecution } from './RouteValidityAudit.js';
import { buildRouteBlockDiagnostic, explainSegmentBlockage, isCellNavigable } from './Navigability.js';
import { buildRouteSegmentsForAgent } from './RouteSegmentBuilder.js';
import { expandCellsBySamplingRadius, rasterizeRouteSegment } from '../roi/RoiMode.js';
import { evaluateSegmentForExecution } from './SegmentExecutionValidator.js';
import { estimateStochasticSegmentCurrentRisk } from './ShorelineRisk.js';
import { getDeploymentZones, getSelectedStart } from '../deployment/DeploymentZones.js';

export function greedySolver(level, mission, options = {}) {
  return temporalGreedySolver(level, mission, options);
}

export function temporalGreedySolver(level, mission, options = {}) {
  const selectedAgentId = options.selectedAgentId ?? mission?.agents?.[0]?.id ?? null;
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
  const requestId = options.requestId ?? null;
  const plan = clonePlanForTemporalGreedy(options.currentPlan, level, mission);
  validateSelectedGreedyStart(level, mission, plan, selectedAgentId);
  plan.meta.name = 'Temporal Greedy Plan';
  plan.meta.solver = 'browser-temporal-greedy';
  plan.meta.source = 'temporalGreedy';
  plan.meta.plannerType = 'temporalGreedy';
  plan.meta.plannerVersion = 'v1';
  plan.meta.algorithm = 'iterative-limited-horizon-greedy';
  plan.meta.commitMode = 'live_append';
  plan.meta.usesTemporalRoi = true;
  plan.meta.usesTravelCost = true;
  plan.meta.usesPriorityTargets = true;
  plan.meta.usesForecastProbability = true;
  plan.meta.usesFleetRemainingValue = true;
  plan.meta.depletesPriorAgentCoverage = true;
  plan.meta.selectedAgentId = selectedAgentId;
  plan.meta.preservesOtherAgentPlans = true;
  emitTemporalGreedyProgress(onProgress, {
    type: 'planningStarted',
    phase: 'running',
    requestId,
    agentId: selectedAgentId,
    selectedAgentId
  });
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
  const planningWindow = Number(level?.world?.time?.planningWindow ?? Math.max(1, missionDuration / 8));
  const maxStepHours = Math.max(0.25, Number(options.maxStepHours ?? Math.min(Math.max(1, planningWindow), 3)));
  const defaultStepBudgetHours = Math.max(0.5, Math.min(maxStepHours, planningWindow, missionDuration / 24 || maxStepHours));
  const maxWaypoints = Math.max(1, Number(options.maxWaypoints ?? Math.min(160, Math.ceil(missionDuration / defaultStepBudgetHours))));
  const maxPlannerIterations = Math.max(maxWaypoints, Number(options.maxPlannerIterations ?? maxWaypoints + Math.max(16, Math.ceil(maxWaypoints * 0.25))));
  const maxCandidateCellsPerStep = Math.max(8, Number(options.maxCandidateCellsPerStep ?? 96));
  const maxEvaluationsPerStep = Math.max(4, Number(options.maxEvaluationsPerStep ?? Math.min(48, maxCandidateCellsPerStep)));
  const maxTotalEvaluations = Math.max(maxEvaluationsPerStep, Number(options.maxTotalEvaluations ?? maxWaypoints * maxEvaluationsPerStep));
  const startedAt = globalThis.performance?.now?.() ?? Date.now();
  const maxRuntimeMs = Number.isFinite(Number(options.maxRuntimeMs)) ? Number(options.maxRuntimeMs) : Infinity;
  const duration = Number(level?.world?.time?.duration ?? 0);
  const priorityTargets = normalizePriorityTargets(level);
  const depletion = createFleetDepletionState(level, mission, priorityTargets);
  const deploymentZoneCells = buildDeploymentZoneCellSet(level);
  depletion.deploymentZoneCells = deploymentZoneCells;
  for (let y = 0; y < level.world.grid.height; y += 1) {
    for (let x = 0; x < level.world.grid.width; x += 1) {
      if (!isCellNavigable(level, mission, x, y).ok) continue;
      cells.push({ x, y });
    }
  }

  const agents = (mission.agents ?? []).filter((agent) => agent.id === selectedAgentId);
  const agentStops = [];
  seedDepletionFromExistingOtherAgents(depletion, {
    level,
    mission,
    plan,
    selectedAgentId,
    challengeMode: plannerChallengeMode,
    revealTruth: plannerRevealTruth,
    forecastMemberId: options.forecastMemberId ?? null
  });

  for (const agent of agents) {
    const selectedPlan = plan.agentPlans?.find((candidate) => candidate.agentId === agent.id);
    if (selectedPlan) selectedPlan.waypoints = [];
    let anchor = {
      agentId: agent.id,
      x: Number(selectedPlan?.selectedStart?.x ?? agent.start?.x ?? 0),
      y: Number(selectedPlan?.selectedStart?.y ?? agent.start?.y ?? 0),
      t: 0,
      source: selectedPlan?.selectedStart ? 'selectedStart' : 'start'
    };
    let remainingFuel = Number(agent.battery ?? agent.maxBattery ?? 100);
    const agentSampled = new Set([cellKey(anchor)]);
    let stop = null;
    const plannerStats = {
      unreachableCandidates: 0,
      blockedCandidates: 0,
      stochasticRiskCandidates: 0,
      depletedCandidates: 0,
      collisionConflictCandidates: 0,
      clusteredCandidates: 0,
      timeRejectedCandidates: 0,
      fuelRejectedCandidates: 0,
      deploymentZoneRejectedCandidates: 0,
      evaluatedCandidates: 0,
      feasibleCandidates: 0,
      diagnosticCategories: {},
      tierStats: createTierStats(),
      lastCandidateStage: null
    };
    debugTemporalGreedyVisibility(plan.planner);
    for (let index = 0; index < maxWaypoints; index += 1) {
      if ((globalThis.performance?.now?.() ?? Date.now()) - startedAt > maxRuntimeMs) {
        stop = buildStop('max_iterations_guard', anchor, remainingFuel, duration, {
          waypointCount: index,
          guardFailure: true,
          diagnostics: buildPlannerDiagnostics({
            maxPlannerIterations,
            maxRuntimeMs,
            maxStepHours,
            maxCandidateCellsPerStep,
            maxEvaluationsPerStep,
            maxTotalEvaluations,
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
        stop = buildStop('max_iterations_guard', anchor, remainingFuel, duration, {
          waypointCount: index,
          guardFailure: true,
          diagnostics: buildPlannerDiagnostics({
            maxPlannerIterations,
            maxRuntimeMs,
            maxStepHours,
            maxCandidateCellsPerStep,
            maxEvaluationsPerStep,
            maxTotalEvaluations,
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
        stop = buildStop('mission_time_exhausted', anchor, remainingFuel, duration, {
          waypointCount: index,
          diagnostics: buildPlannerDiagnostics({
            maxPlannerIterations,
            maxRuntimeMs,
            maxStepHours,
            maxCandidateCellsPerStep,
            maxEvaluationsPerStep,
            maxTotalEvaluations,
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
      if (Number.isFinite(remainingFuel) && remainingFuel <= minimumFuelReserve(mission)) {
        stop = buildStop('fuel_exhausted', anchor, remainingFuel, duration, {
          waypointCount: index,
          diagnostics: buildPlannerDiagnostics({
            maxPlannerIterations,
            maxRuntimeMs,
            maxStepHours,
            maxCandidateCellsPerStep,
            maxEvaluationsPerStep,
            maxTotalEvaluations,
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
        deploymentZoneCells,
        conflictState: depletion.conflictState,
        plan,
        challengeMode: plannerChallengeMode,
        revealTruth: plannerRevealTruth,
        forecastMemberId: options.forecastMemberId ?? null,
        duration,
        maxStepHours,
        maxCandidateCellsPerStep,
        maxEvaluationsPerStep,
        maxTotalEvaluations,
        plannerStats,
        iteration: index
      });
      if (!candidate) {
        const stopReason = determineNoCandidateStopReason(plannerStats, { anchor, duration, maxTotalEvaluations });
        stop = buildStop(stopReason, anchor, remainingFuel, duration, {
          waypointCount: index,
          unreachableCandidates: plannerStats.unreachableCandidates,
          blockedCandidates: plannerStats.blockedCandidates,
          stochasticRiskCandidates: plannerStats.stochasticRiskCandidates,
          depletedCandidates: plannerStats.depletedCandidates,
          collisionConflictCandidates: plannerStats.collisionConflictCandidates,
          clusteredCandidates: plannerStats.clusteredCandidates,
          timeRejectedCandidates: plannerStats.timeRejectedCandidates,
          fuelRejectedCandidates: plannerStats.fuelRejectedCandidates,
          deploymentZoneRejectedCandidates: plannerStats.deploymentZoneRejectedCandidates,
          diagnostics: buildPlannerDiagnostics({
            maxPlannerIterations,
            maxRuntimeMs,
            maxStepHours,
            maxCandidateCellsPerStep,
            maxEvaluationsPerStep,
            maxTotalEvaluations,
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
      const waypoint = addWaypoint(plan, agent.id, buildCandidateWaypoint(candidate));
      applyAcceptedCandidateDepletion(depletion, {
        level,
        mission,
        agent,
        candidate,
        waypoint
      });
      emitTemporalGreedyProgress(onProgress, {
        type: 'waypointAccepted',
        phase: 'waypointAccepted',
        requestId,
        agentId: agent.id,
        selectedAgentId,
        waypoint: cloneProgressPayload(waypoint),
        waypointIndex: index,
        summarySoFar: {
          acceptedWaypoints: index + 1,
          plannedTime: round(candidate.arrivalTime),
          remainingFuel: round(remainingFuel - candidate.executionEnergy),
          fuelUsed: round(Number(agent.battery ?? agent.maxBattery ?? 100) - (remainingFuel - candidate.executionEnergy)),
          candidateEvaluations: Number(plannerStats.evaluatedCandidates ?? 0),
          rejectedBlocked: Number(plannerStats.blockedCandidates ?? 0),
          rejectedUnreachable: Number(plannerStats.unreachableCandidates ?? 0),
          rejectedDepleted: Number(plannerStats.depletedCandidates ?? 0),
          rejectedCollision: Number(plannerStats.collisionConflictCandidates ?? 0),
          rejectedClustered: Number(plannerStats.clusteredCandidates ?? 0),
          rejectedDeploymentZone: Number(plannerStats.deploymentZoneRejectedCandidates ?? 0)
        }
      });
      debugTemporalGreedyCommit({
        waypointIndex: index,
        previousTime: anchor.t,
        newTime: candidate.arrivalTime,
        previousFuel: remainingFuel,
        newFuel: remainingFuel - candidate.executionEnergy,
        position: candidate
      });
      agentSampled.add(cellKey(candidate));
      remainingFuel -= candidate.executionEnergy;
      const expectedPosition = isFinitePoint(candidate.expectedArrivalPosition)
        ? candidate.expectedArrivalPosition
        : candidate;
      anchor = {
        agentId: agent.id,
        x: Number(expectedPosition.x),
        y: Number(expectedPosition.y),
        t: candidate.arrivalTime,
        source: 'expectedArrivalPosition',
        waypointIndex: index
      };
    }
    if (!stop) {
      stop = buildStop('max_iterations_guard', anchor, remainingFuel, duration, {
        waypointCount: maxWaypoints,
        unreachableCandidates: plannerStats.unreachableCandidates,
        blockedCandidates: plannerStats.blockedCandidates,
        stochasticRiskCandidates: plannerStats.stochasticRiskCandidates,
        depletedCandidates: plannerStats.depletedCandidates,
        collisionConflictCandidates: plannerStats.collisionConflictCandidates,
        clusteredCandidates: plannerStats.clusteredCandidates,
        timeRejectedCandidates: plannerStats.timeRejectedCandidates,
        fuelRejectedCandidates: plannerStats.fuelRejectedCandidates,
        deploymentZoneRejectedCandidates: plannerStats.deploymentZoneRejectedCandidates,
        diagnostics: buildPlannerDiagnostics({
          maxPlannerIterations,
          maxRuntimeMs,
          maxStepHours,
          maxCandidateCellsPerStep,
          maxEvaluationsPerStep,
          maxTotalEvaluations,
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
      enabled: (mission?.agents ?? []).length > 1,
      selectedAgentId,
      otherGliderRoutesPreserved: Math.max(0, (mission?.agents?.length ?? 0) - 1),
      plannedOrder: agentStops.length + 1,
      claimedCells: depletionSummary.claimedCells,
      existingClaimedCells: depletion.existingClaimedCells ?? 0,
      claimedPriorityTargets: depletionSummary.claimedPriorityTargets,
      duplicateSamplesAvoided: depletion.duplicateSamplesAvoided,
      collisionConflictsAvoided: depletion.conflictState?.avoidedConflicts ?? 0
    };
    agentStops.push({ agentId: agent.id, ...stop });
    debugTemporalGreedyEarlyStop({
      stop,
      anchor,
      duration,
      remainingFuel,
      plannerStats
    });
    emitTemporalGreedyProgress(onProgress, {
      type: 'plannerStopped',
      phase: 'stopped',
      requestId,
      agentId: agent.id,
      selectedAgentId,
      stopReason: stop.stopReason,
      summarySoFar: {
        acceptedWaypoints: Number(stop.waypointCount ?? agentPlan?.waypoints?.length ?? 0),
        plannedTime: round(stop.stopTime ?? 0),
        remainingFuel: round(stop.remainingFuel ?? 0),
        candidateEvaluations: Number(stop.diagnostics?.evaluatedCandidates ?? plannerStats.evaluatedCandidates ?? 0),
        rejectedBlocked: Number(stop.blockedCandidates ?? plannerStats.blockedCandidates ?? 0),
        rejectedUnreachable: Number(stop.unreachableCandidates ?? plannerStats.unreachableCandidates ?? 0),
        rejectedDepleted: Number(stop.depletedCandidates ?? plannerStats.depletedCandidates ?? 0),
        rejectedCollision: Number(stop.collisionConflictCandidates ?? plannerStats.collisionConflictCandidates ?? 0),
        rejectedClustered: Number(stop.clusteredCandidates ?? plannerStats.clusteredCandidates ?? 0),
        rejectedDeploymentZone: Number(stop.deploymentZoneRejectedCandidates ?? plannerStats.deploymentZoneRejectedCandidates ?? 0)
      }
    });
  }
  plan.meta.greedyStopsByAgent = agentStops;
  plan.meta.sharedDepletion = summarizeFleetDepletion(depletion, mission?.agents?.length ?? agents.length);
  plan.meta.sharedDepletion.selectedAgentId = selectedAgentId;
  plan.meta.sharedDepletion.otherGliderRoutesPreserved = Math.max(0, (mission?.agents?.length ?? 0) - agents.length);
  validateAndRepairBaselinePlan(plan, level, mission, selectedAgentId);
  reconcileGreedyStopsWithAcceptedPlan(plan, level, mission);
  plan.meta.greedyStop = summarizeStops(plan.meta.greedyStopsByAgent, duration);
  plan.meta.greedyStop.mode = 'iterative_limited_horizon_greedy';
  plan.meta.greedyStop.runtimeMs = round((globalThis.performance?.now?.() ?? Date.now()) - startedAt);
  plan.meta.greedyStop.candidateEvaluations = (plan.meta.greedyStopsByAgent ?? []).reduce((sum, stop) => sum + Number(stop.diagnostics?.evaluatedCandidates ?? 0), 0);
  debugTemporalGreedySummary(plan, level, mission);
  emitTemporalGreedyProgress(onProgress, {
    type: 'planningComplete',
    phase: 'complete',
    requestId,
    selectedAgentId,
    summary: cloneProgressPayload(plan.meta.greedyStop ?? null)
  });

  return plan;
}

function validateAndRepairBaselinePlan(plan, level, mission, selectedAgentId = null) {
  let audit = validateRoutePlanForExecution({ level, mission, plan, agentId: selectedAgentId });
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
    audit = validateRoutePlanForExecution({ level, mission, plan, agentId: selectedAgentId });
  }
  applyRouteAuditToPlan(plan, audit);
  plan.meta.valid = audit.ok;
  plan.meta.validationIssues = audit.agentResults?.flatMap((result) => result.issues ?? []) ?? [];
  if (!audit.ok) {
    debugTemporalGreedyBlockedSegmentEscapedValidation(audit);
    plan.meta.stopReason = hasRouteBlockedIssue(audit)
      ? 'planner_generated_blocked_segment'
      : 'no_executable_route_after_validation';
  }
}

function validateSelectedGreedyStart(level, mission, plan, selectedAgentId) {
  const agent = mission?.agents?.find((candidate) => candidate.id === selectedAgentId);
  if (!agent) throw new Error('Temporal Greedy cannot run: no selected glider is available.');
  const agentPlan = plan?.agentPlans?.find((candidate) => candidate.agentId === selectedAgentId);
  const selectedStart = agentPlan?.selectedStart ?? getSelectedStart(agent) ?? agent.start ?? null;
  if (!isFinitePoint(selectedStart)) {
    throw new Error(`Temporal Greedy cannot run: selected ${agent.label ?? agent.id} needs a deployment cell.`);
  }
  const x = Math.round(Number(selectedStart.x));
  const y = Math.round(Number(selectedStart.y));
  const grid = level?.world?.grid ?? {};
  if (x < 0 || y < 0 || x >= Number(grid.width) || y >= Number(grid.height) || level?.layers?.terrain?.[y]?.[x]) {
    throw new Error(`Temporal Greedy cannot run: selected ${agent.label ?? agent.id} needs a valid deployment cell.`);
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
        depleted: Number(stop.depletedCandidates ?? stop.diagnostics?.rejectionSummary?.depleted ?? 0),
        collision: Number(stop.collisionConflictCandidates ?? stop.diagnostics?.rejectionSummary?.collision ?? 0),
        clustered: Number(stop.clusteredCandidates ?? stop.diagnostics?.rejectionSummary?.clustered ?? 0),
        time: Number(stop.timeRejectedCandidates ?? stop.diagnostics?.rejectionSummary?.time ?? 0),
        fuel: Number(stop.fuelRejectedCandidates ?? stop.diagnostics?.rejectionSummary?.fuel ?? 0),
        deploymentZone: Number(stop.deploymentZoneRejectedCandidates ?? stop.diagnostics?.rejectionSummary?.deploymentZone ?? 0)
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
    'max_planner_iterations',
    'max_iterations_guard'
  ]).has(reason);
}

function determineNoCandidateStopReason(plannerStats = {}, { anchor = null, duration = 0, maxTotalEvaluations = Infinity } = {}) {
  if (Number(plannerStats.evaluatedCandidates ?? 0) >= Number(maxTotalEvaluations ?? Infinity)) return 'max_iterations_guard';
  const plannedTime = Number(anchor?.t ?? 0);
  const early = Number(duration ?? 0) > 0 && plannedTime < Number(duration) * 0.8;
  const safeTier = plannerStats.tierStats?.safe_continuation ?? {};
  if (early && (Number(safeTier.candidates ?? 0) > 0 || Number(safeTier.rejected ?? 0) > 0)) {
    return 'no_safe_continuation_candidates';
  }
  if (Number(plannerStats.stochasticRiskCandidates ?? 0) > 0) return 'no_safe_forecast_feasible_candidates';
  return 'no_reachable_feasible_candidates';
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
  deploymentZoneCells = new Set(),
  conflictState = null,
  plan = null,
  challengeMode,
  revealTruth,
  forecastMemberId,
  duration,
  maxStepHours = 2,
  maxCandidateCellsPerStep = 96,
  maxEvaluationsPerStep = 48,
  maxTotalEvaluations = Infinity,
  plannerStats = null,
  iteration = 0
}) {
  const candidates = [];
  const loopStartStats = snapshotPlannerStats(plannerStats);
  const stepCells = buildBoundedGreedyCandidates({
    level,
    mission,
    agent,
    anchor,
    remainingFuel,
    cells,
    sampled,
    depletion,
    deploymentZoneCells,
    priorityTargets,
    challengeMode,
    revealTruth,
    forecastMemberId,
    duration,
    maxStepHours,
    maxCandidateCellsPerStep,
    plannerStats
  });
  let evaluatedThisStep = 0;
  for (const cell of stepCells) {
    if (evaluatedThisStep >= maxEvaluationsPerStep) break;
    if (Number(plannerStats?.evaluatedCandidates ?? 0) >= maxTotalEvaluations) break;
    if (cell.x === Math.round(anchor.x) && cell.y === Math.round(anchor.y)) continue;
    if (isDeploymentZoneCell(deploymentZoneCells, cell)) {
      plannerStats && (plannerStats.deploymentZoneRejectedCandidates += 1);
      debugTemporalGreedyDeploymentZoneFilter({
        cell,
        inDeploymentZone: true,
        originalValue: roiScalar(getPlanningFrame(level, Number(anchor?.t ?? 0), { challengeMode, revealTruth, forecastMemberId })?.roi?.[cell.y]?.[cell.x] ?? 0, 'expectedValue'),
        effectiveValue: 0,
        rejectedAsSampleTarget: true
      });
      continue;
    }
    plannerStats && (plannerStats.evaluatedCandidates += 1);
    evaluatedThisStep += 1;
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
    const estimatedArrivalTime = Number(anchor.t ?? 0) + Number(segment.estimatedTravelTime ?? 0);
    if (!segment.valid) {
      if (segment.reachability?.reachable === false) plannerStats && (plannerStats.unreachableCandidates += 1);
      else plannerStats && (plannerStats.blockedCandidates += 1);
      debugTemporalGreedyCandidate({ from: anchor, to: cell, segment, execution: null, accepted: false, reason: 'segmentInvalid' });
      continue;
    }
    if (duration && estimatedArrivalTime > duration) {
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
      maxWaypointTravelTime: getMaxWaypointTravelTime(level, { t: estimatedArrivalTime }, Number(anchor.t ?? 0)),
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
    const arrivalTime = Number(anchor.t ?? 0) + Number(execution.travelTime ?? segment.estimatedTravelTime ?? 0);
    const executionEnergy = Number.isFinite(Number(execution.energyCost)) ? Number(execution.energyCost) : Number(segment.energy ?? 0);
    if (duration && arrivalTime > duration) {
      plannerStats && (plannerStats.timeRejectedCandidates += 1);
      continue;
    }
    if (Number.isFinite(remainingFuel) && executionEnergy > remainingFuel) {
      plannerStats && (plannerStats.fuelRejectedCandidates += 1);
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
    const conflict = getCellTimeConflict(conflictState, cell, arrivalTime, level);
    if (conflict.blocking) {
      plannerStats && (plannerStats.collisionConflictCandidates += 1);
      if (conflictState) conflictState.avoidedConflicts = Number(conflictState.avoidedConflicts ?? 0) + 1;
      continue;
    }
    if (Number(conflict.clusterPenalty ?? 0) > 0) plannerStats && (plannerStats.clusteredCandidates += 1);
    const pathValue = scoreRoutePathValue({
      level,
      mission,
      agent,
      segment,
      frame: arrivalFrame,
      depletion,
      deploymentZoneCells,
      arrivalTime
    });
    if (pathValue.rawValue > 0 && pathValue.value <= 0) plannerStats && (plannerStats.depletedCandidates += 1);
    const rawValue = roiScalar(arrivalFrame?.roi?.[cell.y]?.[cell.x] ?? 0, 'expectedValue');
    const probability = roiScalar(arrivalFrame?.roi?.[cell.y]?.[cell.x] ?? 0, 'probability');
    const depletionMultiplier = getRemainingValueMultiplier(depletion, cell, arrivalTime);
    const endpointValue = rawValue * depletionMultiplier;
    const value = pathValue.value + endpointValue;
    const priority = priorityTargetBonus(priorityTargets, cell, arrivalTime, depletion);
    const priorityBonus = priority.bonus;
    const hazardPenalty = Number(level.layers?.hazards?.[cell.y]?.[cell.x] ?? 0) * 40;
    const mobileRisk = mobileHazardRisk(level, cell.x, cell.y, arrivalTime);
    const depthPenalty = Math.max(0, depthEnergyMultiplier(level, mission, cell.x, cell.y) - 1);
    const ensembleRisk = ensembleDisagreementAt(level, cell.x, cell.y, arrivalTime, { challengeMode, forecastMemberId });
    const stochasticRiskPenalty = Number(stochasticRisk.value ?? 0) * 90;
    const collisionPenalty = Number(conflict.penalty ?? 0);
    const duplicatePenalty = (sampled.has(cellKey(cell)) ? 5 : 0) + (depletionMultiplier <= 0 ? 8 : 0);
    const energyPenalty = Number(executionEnergy ?? segment.energy ?? 0) * 0.35;
    const travelTimePenalty = Number(execution.travelTime ?? segment.estimatedTravelTime ?? 0) * 0.08;
    const score = value
      + priorityBonus
      - energyPenalty
      - travelTimePenalty
      - duplicatePenalty
      - hazardPenalty
      - mobileRisk * 12
      - depthPenalty * 18
      - ensembleRisk * 12
      - stochasticRiskPenalty
      - collisionPenalty;
    const candidate = {
      ...cell,
      from: { ...anchor },
      segment,
      execution,
      arrivalTime,
      expectedArrivalPosition: execution.finalPosition ?? null,
      executionEnergy,
      window: windowForTime(level, arrivalTime),
      rawValue,
      value,
      probability,
      priorityBonus,
      priorityTargetIds: priority.targetIds,
      depletionMultiplier,
      duplicatePenalty,
      stochasticRisk,
      score,
      distance: segment.distance,
      pathValue: pathValue.value,
      endpointValue,
      totalValue: value + priorityBonus,
      conflict,
      clusterPenalty: Number(conflict.clusterPenalty ?? 0),
      riskPenalty: hazardPenalty + mobileRisk * 12 + depthPenalty * 18 + ensembleRisk * 12 + stochasticRiskPenalty + collisionPenalty
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
    candidateCount: stepCells.length,
    feasibleCandidateCount: candidates.length,
    plannerStats,
    loopStartStats
  });
  if (!candidates.length) {
    debugTemporalGreedyCandidateTier({
      agentId: agent.id,
      stepIndex: iteration,
      plannedTime: anchor.t,
      missionDuration: duration,
      tierStats: plannerStats?.tierStats,
      acceptedCandidate: null
    });
    return null;
  }
  const rankedCandidates = rankCandidatesByStage(candidates);
  for (const candidate of rankedCandidates) noteTierCandidate(plannerStats, candidate.stage);
  let selected = null;
  for (const candidate of rankedCandidates) {
    const validation = validateCandidateBeforeAppend({
      level,
      mission,
      agent,
      plan,
      candidate,
      waypointIndex: iteration
    });
    debugTemporalGreedyBeforeAppendValidation({
      agentId: agent.id,
      from: anchor,
      to: candidate,
      waypointIndex: iteration,
      endpointOk: validation.endpointOk,
      segmentOk: validation.segmentOk,
      fullPrefixOk: validation.fullPrefixOk,
      rejectionReason: validation.rejectionReason,
      inDeploymentZone: isDeploymentZoneCell(deploymentZoneCells, candidate),
      deploymentZoneSampleValue: 0,
      accepted: validation.ok
    });
    if (!validation.ok) {
      noteTierRejected(plannerStats, candidate.stage, validation.rejectionReason);
      noteDiagnosticCategory(plannerStats, validation.routeBlockDiagnostic ?? validation.issue?.diagnostic ?? validation.issue?.routeBlockDiagnostic ?? null, validation.rejectionReason);
      debugTemporalGreedyRejectedSegment({
        agentId: agent.id,
        from: candidate.from ?? anchor,
        to: candidate,
        reason: validation.rejectionReason,
        blockedCell: validation.routeBlockDiagnostic?.blocking?.blockedCell
          ?? validation.issue?.routeBlockDiagnostic?.blocking?.blockedCell
          ?? validation.blockage?.blockedAt
          ?? validation.issue?.blockedAt
          ?? null,
        pathCells: validation.blockage?.cells ?? validation.audit?.agentResults?.[0]?.issues?.[0]?.pathCells ?? candidate.execution?.pathCells ?? [],
        routeBlockDiagnostic: validation.routeBlockDiagnostic ?? validation.issue?.routeBlockDiagnostic ?? null,
        simulationEquivalentCheck: {
          endpointOk: validation.endpointOk,
          segmentOk: validation.segmentOk,
          fullPrefixOk: validation.fullPrefixOk
        }
      });
      if (validation.rejectionReason === 'deploymentZoneSample') {
        plannerStats && (plannerStats.deploymentZoneRejectedCandidates += 1);
      } else if (validation.rejectionReason === 'noLegalPath' || validation.rejectionReason === 'outsideMap' || validation.rejectionReason === 'terrain' || validation.rejectionReason === 'tooShallow') {
        plannerStats && (plannerStats.unreachableCandidates += 1);
      } else {
        plannerStats && (plannerStats.blockedCandidates += 1);
      }
      continue;
    }
    selected = candidate;
    noteTierAccepted(plannerStats, candidate.stage);
    debugTemporalGreedyAcceptedSegment({
      agentId: agent.id,
      waypointIndex: iteration,
      candidate
    });
    break;
  }
  if (selected && Number(selected.rawValue ?? 0) > Number(selected.value ?? 0)) {
    depletion.duplicateSamplesAvoided += 1;
  }
  if (selected) {
    plannerStats && (plannerStats.lastCandidateStage = selected.stage);
    debugTemporalGreedyAccepted(selected);
  }
  debugTemporalGreedyCandidateTier({
    agentId: agent.id,
    stepIndex: iteration,
    plannedTime: anchor.t,
    missionDuration: duration,
    tierStats: plannerStats?.tierStats,
    acceptedCandidate: selected
  });
  return selected;
}

function buildBoundedGreedyCandidates({
  level,
  mission,
  agent,
  anchor,
  remainingFuel,
  cells,
  sampled,
  depletion,
  deploymentZoneCells = new Set(),
  priorityTargets,
  challengeMode,
  revealTruth,
  forecastMemberId,
  duration,
  maxStepHours,
  maxCandidateCellsPerStep,
  plannerStats = null
}) {
  const frame = getPlanningFrame(level, Number(anchor?.t ?? 0), { challengeMode, revealTruth, forecastMemberId });
  const speed = Math.max(0.05, Number(agent?.maxSpeed ?? 1));
  const energyPerCell = Number(mission?.physics?.energyPerCell ?? 1);
  const fuelRadius = Number.isFinite(Number(remainingFuel)) && energyPerCell > 0
    ? Math.max(1, Number(remainingFuel) / energyPerCell)
    : Infinity;
  const timeRemaining = Number.isFinite(Number(duration)) && duration > 0
    ? Math.max(0, Number(duration) - Number(anchor?.t ?? 0))
    : maxStepHours;
  const horizonHours = Math.max(0.25, Math.min(Number(maxStepHours ?? 2), timeRemaining || Number(maxStepHours ?? 2)));
  const radius = Math.max(1, Math.min(
    Number(level?.world?.grid?.width ?? 1) + Number(level?.world?.grid?.height ?? 1),
    speed * horizonHours * 1.75 + 1,
    fuelRadius + 1
  ));
  const scored = [];
  for (const cell of cells) {
    const dx = Number(cell.x) - Number(anchor?.x ?? 0);
    const dy = Number(cell.y) - Number(anchor?.y ?? 0);
    const distance = Math.hypot(dx, dy);
    if (distance <= 0 || distance > radius) continue;
    const rawValue = roiScalar(frame?.roi?.[cell.y]?.[cell.x] ?? 0, 'expectedValue');
    if (isDeploymentZoneCell(deploymentZoneCells, cell)) {
      plannerStats && (plannerStats.deploymentZoneRejectedCandidates += 1);
      debugTemporalGreedyDeploymentZoneFilter({
        cell,
        inDeploymentZone: true,
        originalValue: rawValue,
        effectiveValue: 0,
        rejectedAsSampleTarget: true
      });
      continue;
    }
    const multiplier = getRemainingValueMultiplier(depletion, cell, Number(anchor?.t ?? 0));
    const remainingValue = rawValue * multiplier;
    const priority = priorityTargetBonus(priorityTargets, cell, Number(anchor?.t ?? 0) + distance / speed, depletion).bonus;
    const duplicatePenalty = sampled.has(cellKey(cell)) || multiplier <= 0 ? 0.45 : 0;
    const hazardPenalty = Number(level.layers?.hazards?.[cell.y]?.[cell.x] ?? 0) * 0.4;
    const continuation = Math.max(0, 0.08 - distance * 0.005);
    const score = remainingValue * 2.5 + priority - distance * 0.04 + continuation - duplicatePenalty - hazardPenalty;
    scored.push({ ...cell, approximateScore: score, approximateDistance: distance });
  }
  scored.sort((a, b) => b.approximateScore - a.approximateScore || a.approximateDistance - b.approximateDistance);
  return scored.slice(0, Math.max(1, Number(maxCandidateCellsPerStep ?? 96)));
}

function scoreRoutePathValue({ level, mission, agent, segment, frame, depletion, deploymentZoneCells = new Set(), arrivalTime }) {
  const samplingRadius = Number(mission?.rules?.samplingRadius ?? agent?.samplingRadius ?? 0.75);
  const routeCells = expandCellsBySamplingRadius(rasterizeRouteSegment(segment, level), samplingRadius, level);
  const endpointKey = cellKey(segment?.to ?? {});
  let rawValue = 0;
  let value = 0;
  for (const cell of routeCells) {
    if (cellKey(cell) === endpointKey) continue;
    if (isDeploymentZoneCell(deploymentZoneCells, cell)) {
      const originalValue = roiScalar(frame?.roi?.[cell.y]?.[cell.x] ?? 0, 'expectedValue');
      debugTemporalGreedyDeploymentZoneFilter({
        cell,
        inDeploymentZone: true,
        originalValue,
        effectiveValue: 0,
        rejectedAsSampleTarget: false
      });
      continue;
    }
    const cellRawValue = roiScalar(frame?.roi?.[cell.y]?.[cell.x] ?? 0, 'expectedValue');
    if (cellRawValue <= 0) continue;
    rawValue += cellRawValue;
    value += cellRawValue * getRemainingValueMultiplier(depletion, cell, arrivalTime);
  }
  return { rawValue, value };
}

function rankCandidatesByStage(candidates) {
  const seen = new Set();
  const ranked = [];
  for (const stage of ['high_value', 'moderate_value', 'safe_continuation']) {
    for (const candidate of rankStageCandidates(candidates, stage)) {
      const key = cellKey(candidate);
      if (seen.has(key)) continue;
      seen.add(key);
      ranked.push(candidate);
    }
  }
  return ranked;
}

function rankStageCandidates(candidates, stage) {
  const filtered = candidates.filter((candidate) => {
    if (stage === 'high_value') return candidate.totalValue > 0.35 || candidate.priorityBonus > 0;
    if (stage === 'moderate_value') return candidate.totalValue > 0.04 || (candidate.rawValue > 0 && candidate.probability > 0.2);
    return candidate.riskPenalty < 45;
  });
  return filtered.map((candidate) => ({
    ...candidate,
    stage,
    score: stageScore(candidate, stage)
  })).sort((a, b) => b.score - a.score || a.segment.energy - b.segment.energy || a.arrivalTime - b.arrivalTime);
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
    existingClaimedCells: 0,
    ignoredUndeployedAgents: 0,
    conflictState: { occupied: new Map(), avoidedConflicts: 0 },
    allowSharedPriorityTargets: priorityRules.captureMode === 'shared' || priorityRules.captureMode === 'multiple',
    enabled: (mission?.agents ?? []).length > 1
  };
}

function clonePlanForTemporalGreedy(currentPlan, level, mission) {
  const plan = currentPlan && typeof currentPlan === 'object'
    ? JSON.parse(JSON.stringify(currentPlan))
    : createEmptyPlan(level, mission);
  plan.schemaVersion ??= '2.0';
  plan.type = 'anchor.plan';
  plan.levelId ??= level?.levelId ?? null;
  plan.instanceId ??= level?.instanceId ?? null;
  plan.challengeId ??= plan.instanceId ?? level?.instanceId ?? null;
  plan.missionId ??= mission?.missionId ?? null;
  plan.meta ??= {};
  plan.agentPlans ??= [];
  for (const agent of mission?.agents ?? []) {
    let agentPlan = plan.agentPlans.find((candidate) => candidate.agentId === agent.id);
    if (!agentPlan) {
      agentPlan = { agentId: agent.id, selectedStart: null, waypoints: [] };
      plan.agentPlans.push(agentPlan);
    }
    agentPlan.waypoints ??= [];
  }
  return plan;
}

function validateCandidateBeforeAppend({ level, mission, agent, plan, candidate, waypointIndex = 0 }) {
  const endpoint = isCellNavigable(level, mission, candidate?.x, candidate?.y);
  if (!endpoint.ok) {
    return {
      ok: false,
      endpointOk: false,
      segmentOk: false,
      fullPrefixOk: false,
      rejectionReason: endpoint.reason ?? 'invalidEndpoint',
      audit: null
    };
  }
  if (candidate?.execution?.ok === false || candidate?.segment?.valid === false) {
    return {
      ok: false,
      endpointOk: true,
      segmentOk: false,
      fullPrefixOk: false,
      rejectionReason: candidate.execution?.reason ?? candidate.segment?.reason ?? 'segmentBlocked',
      audit: null
    };
  }
  const blockage = explainSegmentBlockage(candidate.from ?? candidate.segment?.from, candidate, { level, mission });
  if (!blockage.ok) {
    const routeBlockDiagnostic = buildRouteBlockDiagnostic({
      level,
      mission,
      agentId: agent.id,
      segmentFromIndex: waypointIndex - 1,
      segmentToIndex: waypointIndex,
      plannedFrom: candidate.from ?? candidate.segment?.from,
      target: candidate,
      actualStartPosition: candidate.from ?? candidate.segment?.from,
      reportedCell: blockage.blockedAt,
      reason: blockage.reason ?? 'segmentBlocked',
      source: 'temporalGreedyBeforeAppend'
    });
    debugTemporalGreedyRejectBlockedSegment({
      from: candidate.from ?? candidate.segment?.from,
      to: candidate,
      blockedCell: blockage.blockedAt,
      traversedCells: blockage.cells,
      reason: 'blocked_by_land',
      routeBlockDiagnostic,
      candidateScore: candidate.score
    });
    return {
      ok: false,
      endpointOk: true,
      segmentOk: false,
      fullPrefixOk: false,
      rejectionReason: 'blocked_by_land',
      blockage,
      routeBlockDiagnostic,
      audit: null,
      waypointIndex
    };
  }
  const trialPlan = JSON.parse(JSON.stringify(plan ?? {}));
  trialPlan.agentPlans ??= [];
  let trialAgentPlan = trialPlan.agentPlans.find((agentPlan) => agentPlan.agentId === agent.id);
  if (!trialAgentPlan) {
    trialAgentPlan = { agentId: agent.id, selectedStart: getSelectedStart(agent) ?? agent.start ?? null, waypoints: [] };
    trialPlan.agentPlans.push(trialAgentPlan);
  }
  trialAgentPlan.waypoints ??= [];
  trialAgentPlan.waypoints.push(buildCandidateWaypoint(candidate));
  const audit = validateRoutePlanForExecution({
    level,
    mission,
    plan: trialPlan,
    agentId: agent.id
  });
  const firstError = (audit.agentResults ?? [])
    .flatMap((result) => result.issues ?? [])
    .filter((issue) => issue.severity === 'error')
    .sort((a, b) => Number(a.waypointIndex ?? a.to?.index ?? 0) - Number(b.waypointIndex ?? b.to?.index ?? 0))[0] ?? null;
  const expectedIndex = Number(waypointIndex ?? trialAgentPlan.waypoints.length - 1);
  if (firstError) {
    return {
      ok: false,
      endpointOk: true,
      segmentOk: firstError.type !== 'segmentBlocked',
      fullPrefixOk: false,
      rejectionReason: firstError.reason ?? firstError.type ?? 'route_validation_failed',
      audit,
      issue: firstError,
      waypointIndex: expectedIndex
    };
  }
  return {
    ok: true,
    endpointOk: true,
    segmentOk: true,
    fullPrefixOk: true,
    rejectionReason: null,
    audit,
    waypointIndex: expectedIndex
  };
}

function buildCandidateWaypoint(candidate) {
  return {
    window: candidate.window,
    t: candidate.arrivalTime,
    estimatedArrivalTime: candidate.arrivalTime,
    segmentTravelTime: candidate.execution?.travelTime ?? candidate.segment?.estimatedTravelTime,
    segmentEnergy: candidate.executionEnergy ?? candidate.execution?.energyCost ?? candidate.segment?.energy,
    x: candidate.x,
    y: candidate.y,
    action: 'sample',
    note: `stage=${candidate.stage} temporal=${Number(candidate.value ?? 0).toFixed(3)} priority=${Number(candidate.priorityBonus ?? 0).toFixed(1)} energy=${Number(candidate.executionEnergy ?? candidate.segment?.energy ?? 0).toFixed(1)} score=${Number(candidate.score ?? 0).toFixed(3)}`
  };
}

function seedDepletionFromExistingOtherAgents(depletion, { level, mission, plan, selectedAgentId, challengeMode, revealTruth, forecastMemberId }) {
  for (const agent of mission?.agents ?? []) {
    if (agent.id === selectedAgentId) continue;
    const agentPlan = plan?.agentPlans?.find((candidate) => candidate.agentId === agent.id);
    if (!agentPlan?.waypoints?.length) continue;
    const start = agentPlan.selectedStart ?? getSelectedStart(agent) ?? agent.start ?? null;
    if (!isFinitePoint(start)) {
      depletion.ignoredUndeployedAgents = Number(depletion.ignoredUndeployedAgents ?? 0) + 1;
      continue;
    }
    const before = depletion.claimedCells.size;
    applyAgentPlanDepletion(depletion, {
      level,
      mission,
      plan,
      agent,
      agentPlan,
      challengeMode,
      revealTruth,
      forecastMemberId
    });
    markOtherAgentOccupancy(depletion.conflictState, { level, mission, agent, agentPlan });
    depletion.existingClaimedCells += Math.max(0, depletion.claimedCells.size - before);
  }
}

function markOtherAgentOccupancy(conflictState, { level, mission, agent, agentPlan }) {
  if (!conflictState) return;
  const route = buildRouteSegmentsForAgent({ level, mission, agent, agentPlan });
  for (const segment of route.segments ?? []) {
    const time = Number(segment.to?.estimatedArrivalTime ?? segment.to?.t ?? 0);
    const window = missionWindow(level, time);
    for (const cell of rasterizeRouteSegment(segment, level)) {
      const key = conflictKey(cell, window);
      const entries = conflictState.occupied.get(key) ?? [];
      entries.push({ agentId: agent.id, window, t: round(time), source: 'segment' });
      conflictState.occupied.set(key, entries);
    }
  }
  for (const waypoint of agentPlan.waypoints ?? []) {
    const window = missionWindow(level, Number(waypoint.estimatedArrivalTime ?? waypoint.t ?? 0));
    const key = conflictKey(waypoint, window);
    const entries = conflictState.occupied.get(key) ?? [];
    entries.push({ agentId: agent.id, window, t: round(waypoint.estimatedArrivalTime ?? waypoint.t ?? 0), source: 'waypoint' });
    conflictState.occupied.set(key, entries);
  }
}

function getCellTimeConflict(conflictState, cell, time, level) {
  if (!conflictState?.occupied?.size) return { blocking: false, penalty: 0, clusterPenalty: 0 };
  const window = missionWindow(level, time);
  const same = conflictState.occupied.get(conflictKey(cell, window)) ?? [];
  if (same.length) return { blocking: true, penalty: 1000, clusterPenalty: 1000, conflicts: same };
  let nearPenalty = 0;
  let clusterPenalty = 0;
  let nearest = Infinity;
  for (const [key, entries] of conflictState.occupied.entries()) {
    const [x, y, otherWindow] = key.split(',').map(Number);
    if (otherWindow !== window) continue;
    const distance = Math.hypot(Number(cell.x) - x, Number(cell.y) - y);
    if (distance <= 0) continue;
    nearest = Math.min(nearest, distance);
    if (distance <= 1.25) nearPenalty += 45 * (1.25 - distance);
    if (distance <= 2) clusterPenalty += 18 * (2 - distance) * Math.max(1, entries.length);
    if (nearPenalty + clusterPenalty > 120) break;
  }
  return {
    blocking: false,
    penalty: nearPenalty + clusterPenalty,
    clusterPenalty,
    nearestDistance: Number.isFinite(nearest) ? nearest : null
  };
}

function conflictKey(cell, window) {
  return `${Math.round(Number(cell.x))},${Math.round(Number(cell.y))},${Number(window ?? 0)}`;
}

function applyAgentPlanDepletion(depletion, { level, mission, agent, agentPlan, challengeMode, revealTruth, forecastMemberId }) {
  if (!agentPlan) return { claimedCells: 0, claimedPriorityTargets: 0 };
  const beforeCells = depletion.claimedCells.size;
  const beforeTargets = depletion.claimedTargets.size;
  const route = buildRouteSegmentsForAgent({ level, mission, agent, agentPlan });
  const samplingRadius = Number(mission?.rules?.samplingRadius ?? agent?.samplingRadius ?? 0.75);
  for (const segment of route.segments ?? []) {
    const cells = expandCellsBySamplingRadius(rasterizeRouteSegment(segment, level), samplingRadius, level);
    for (const cell of cells) {
      if (isDeploymentZoneCell(depletion.deploymentZoneCells, cell)) continue;
      claimDepletionCell(depletion, cell, Number(segment.to?.estimatedArrivalTime ?? segment.to?.t ?? 0), agent.id, 'segment');
    }
  }
  for (const waypoint of agentPlan.waypoints ?? []) {
    const cells = expandCellsBySamplingRadius([{ x: waypoint.x, y: waypoint.y }], samplingRadius, level);
    for (const cell of cells) {
      if (isDeploymentZoneCell(depletion.deploymentZoneCells, cell)) continue;
      claimDepletionCell(depletion, cell, Number(waypoint.estimatedArrivalTime ?? waypoint.t ?? 0), agent.id, 'waypoint');
    }
    for (const target of priorityTargetBonus(depletion.priorityTargets, waypoint, Number(waypoint.estimatedArrivalTime ?? waypoint.t ?? 0), { ...depletion, claimedTargets: new Set(), allowSharedPriorityTargets: true }).targetIds) {
      if (!depletion.allowSharedPriorityTargets) depletion.claimedTargets.add(target);
    }
  }
  return {
    claimedCells: depletion.claimedCells.size - beforeCells,
    claimedPriorityTargets: depletion.claimedTargets.size - beforeTargets
  };
}

function applyAcceptedCandidateDepletion(depletion, { level, mission, agent, candidate, waypoint }) {
  if (!depletion || !candidate) return;
  const arrivalTime = Number(waypoint?.estimatedArrivalTime ?? waypoint?.t ?? candidate.arrivalTime ?? 0);
  const samplingRadius = Number(mission?.rules?.samplingRadius ?? agent?.samplingRadius ?? 0.75);
  const segmentCells = expandCellsBySamplingRadius(rasterizeRouteSegment(candidate.segment, level), samplingRadius, level);
  for (const cell of segmentCells) {
    if (isDeploymentZoneCell(depletion.deploymentZoneCells, cell)) continue;
    claimDepletionCell(depletion, cell, arrivalTime, agent.id, 'accepted-segment');
  }
  const endpointCells = expandCellsBySamplingRadius([{ x: waypoint?.x ?? candidate.x, y: waypoint?.y ?? candidate.y }], samplingRadius, level);
  for (const cell of endpointCells) {
    if (isDeploymentZoneCell(depletion.deploymentZoneCells, cell)) continue;
    claimDepletionCell(depletion, cell, arrivalTime, agent.id, 'accepted-waypoint');
  }
  for (const targetId of candidate.priorityTargetIds ?? []) {
    if (!depletion.allowSharedPriorityTargets) depletion.claimedTargets.add(targetId);
  }
  markAcceptedCandidateOccupancy(depletion.conflictState, { level, agent, candidate, arrivalTime });
}

function markAcceptedCandidateOccupancy(conflictState, { level, agent, candidate, arrivalTime }) {
  if (!conflictState || !candidate?.segment) return;
  const window = missionWindow(level, arrivalTime);
  for (const cell of rasterizeRouteSegment(candidate.segment, level)) {
    const key = conflictKey(cell, window);
    const entries = conflictState.occupied.get(key) ?? [];
    entries.push({ agentId: agent.id, window, t: round(arrivalTime), source: 'accepted-segment' });
    conflictState.occupied.set(key, entries);
  }
  const key = conflictKey(candidate, window);
  const entries = conflictState.occupied.get(key) ?? [];
  entries.push({ agentId: agent.id, window, t: round(arrivalTime), source: 'accepted-waypoint' });
  conflictState.occupied.set(key, entries);
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
    existingClaimedCells: Number(depletion?.existingClaimedCells ?? 0),
    ignoredUndeployedAgents: Number(depletion?.ignoredUndeployedAgents ?? 0),
    collisionConflictsAvoided: Number(depletion?.conflictState?.avoidedConflicts ?? 0),
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
    depletedCandidates: Number(stats.depletedCandidates ?? 0),
    collisionConflictCandidates: Number(stats.collisionConflictCandidates ?? 0),
    clusteredCandidates: Number(stats.clusteredCandidates ?? 0),
    timeRejectedCandidates: Number(stats.timeRejectedCandidates ?? 0),
    fuelRejectedCandidates: Number(stats.fuelRejectedCandidates ?? 0),
    deploymentZoneRejectedCandidates: Number(stats.deploymentZoneRejectedCandidates ?? 0),
    evaluatedCandidates: Number(stats.evaluatedCandidates ?? 0),
    feasibleCandidates: Number(stats.feasibleCandidates ?? 0),
    diagnosticCategories: { ...(stats.diagnosticCategories ?? {}) },
    tierStats: cloneTierStats(stats.tierStats)
  };
}

function createTierStats() {
  return {
    high_value: { candidates: 0, accepted: 0, rejected: 0, rejections: {} },
    moderate_value: { candidates: 0, accepted: 0, rejected: 0, rejections: {} },
    safe_continuation: { candidates: 0, accepted: 0, rejected: 0, rejections: {} }
  };
}

function cloneTierStats(tierStats = null) {
  const source = tierStats ?? createTierStats();
  const copy = createTierStats();
  for (const tier of Object.keys(copy)) {
    copy[tier] = {
      candidates: Number(source[tier]?.candidates ?? 0),
      accepted: Number(source[tier]?.accepted ?? 0),
      rejected: Number(source[tier]?.rejected ?? 0),
      rejections: { ...(source[tier]?.rejections ?? {}) }
    };
  }
  return copy;
}

function noteTierCandidate(plannerStats, tier) {
  if (!plannerStats || !tier) return;
  plannerStats.tierStats ??= createTierStats();
  plannerStats.tierStats[tier] ??= { candidates: 0, accepted: 0, rejected: 0, rejections: {} };
  plannerStats.tierStats[tier].candidates += 1;
}

function noteTierAccepted(plannerStats, tier) {
  if (!plannerStats || !tier) return;
  plannerStats.tierStats ??= createTierStats();
  plannerStats.tierStats[tier] ??= { candidates: 0, accepted: 0, rejected: 0, rejections: {} };
  plannerStats.tierStats[tier].accepted += 1;
}

function noteTierRejected(plannerStats, tier, reason = 'rejected') {
  if (!plannerStats || !tier) return;
  plannerStats.tierStats ??= createTierStats();
  plannerStats.tierStats[tier] ??= { candidates: 0, accepted: 0, rejected: 0, rejections: {} };
  plannerStats.tierStats[tier].rejected += 1;
  const key = reason ?? 'rejected';
  plannerStats.tierStats[tier].rejections[key] = Number(plannerStats.tierStats[tier].rejections[key] ?? 0) + 1;
}

function noteDiagnosticCategory(plannerStats, diagnostic = null, fallback = 'rejected') {
  if (!plannerStats) return;
  const category = diagnostic?.category ?? diagnostic?.blocking?.reason ?? fallback ?? 'rejected';
  plannerStats.diagnosticCategories ??= {};
  plannerStats.diagnosticCategories[category] = Number(plannerStats.diagnosticCategories[category] ?? 0) + 1;
}

function emitTemporalGreedyProgress(onProgress, progress) {
  if (!onProgress) return;
  try {
    onProgress(cloneProgressPayload(progress));
  } catch (error) {
    globalThis.console?.warn?.('Temporal Greedy progress callback failed.', error);
  }
}

function cloneProgressPayload(value) {
  if (value === undefined || value === null) return value ?? null;
  if (globalThis.structuredClone) return globalThis.structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function buildPlannerDiagnostics({
  maxPlannerIterations,
  maxRuntimeMs,
  maxStepHours,
  maxCandidateCellsPerStep,
  maxEvaluationsPerStep,
  maxTotalEvaluations,
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
    depleted: Number(plannerStats.depletedCandidates ?? 0),
    collision: Number(plannerStats.collisionConflictCandidates ?? 0),
    clustered: Number(plannerStats.clusteredCandidates ?? 0),
    time: Number(plannerStats.timeRejectedCandidates ?? 0),
    fuel: Number(plannerStats.fuelRejectedCandidates ?? 0),
    deploymentZone: Number(plannerStats.deploymentZoneRejectedCandidates ?? 0)
  };
  const mostCommonRejection = Object.entries(rejectionSummary).sort((a, b) => b[1] - a[1])[0] ?? ['none', 0];
  return {
    maxPlannerIterations,
    maxRuntimeMs: Number.isFinite(maxRuntimeMs) ? maxRuntimeMs : null,
    mode: 'iterative_limited_horizon_greedy',
    maxStepHours: Number.isFinite(Number(maxStepHours)) ? Number(maxStepHours) : null,
    maxCandidateCellsPerStep: Number(maxCandidateCellsPerStep ?? 0),
    maxEvaluationsPerStep: Number(maxEvaluationsPerStep ?? 0),
    maxTotalEvaluations: Number.isFinite(Number(maxTotalEvaluations)) ? Number(maxTotalEvaluations) : null,
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
    diagnosticCategories: { ...(plannerStats.diagnosticCategories ?? {}) },
    tierStats: cloneTierStats(plannerStats.tierStats),
    lastAcceptedWaypoint: pointCell(anchor),
    lastCandidateStage: plannerStats.lastCandidateStage ?? null
  };
}

function debugTemporalGreedyLoop({ iteration, anchor, remainingFuel, duration, candidateCount, feasibleCandidateCount, plannerStats, loopStartStats } = {}) {
  if (!globalThis.ANCHOR_DEBUG_TEMPORAL_GREEDY) return;
  const delta = {
    rejectedBlocked: Number(plannerStats?.blockedCandidates ?? 0) - Number(loopStartStats?.blockedCandidates ?? 0),
    rejectedUnsafe: Number(plannerStats?.stochasticRiskCandidates ?? 0) - Number(loopStartStats?.stochasticRiskCandidates ?? 0),
    rejectedDepleted: Number(plannerStats?.depletedCandidates ?? 0) - Number(loopStartStats?.depletedCandidates ?? 0),
    rejectedCollision: Number(plannerStats?.collisionConflictCandidates ?? 0) - Number(loopStartStats?.collisionConflictCandidates ?? 0),
    rejectedClustered: Number(plannerStats?.clusteredCandidates ?? 0) - Number(loopStartStats?.clusteredCandidates ?? 0),
    rejectedDeploymentZone: Number(plannerStats?.deploymentZoneRejectedCandidates ?? 0) - Number(loopStartStats?.deploymentZoneRejectedCandidates ?? 0),
    rejectedFuel: Number(plannerStats?.fuelRejectedCandidates ?? 0) - Number(loopStartStats?.fuelRejectedCandidates ?? 0),
    rejectedTime: Number(plannerStats?.timeRejectedCandidates ?? 0) - Number(loopStartStats?.timeRejectedCandidates ?? 0),
    rejectedUnreachable: Number(plannerStats?.unreachableCandidates ?? 0) - Number(loopStartStats?.unreachableCandidates ?? 0)
  };
  globalThis.console?.debug?.('[TemporalGreedy][Step]', {
    stepIndex: iteration,
    currentTime: round(anchor?.t ?? 0),
    remainingFuel: round(remainingFuel),
    currentCell: pointCell(anchor),
    candidateCount,
    feasibleCandidateCount,
    acceptedCandidate: null,
    acceptedScore: null,
    ...delta,
    stopCandidateStage: plannerStats?.lastCandidateStage ?? null,
    missionDuration: round(duration)
  });
}

function debugTemporalGreedyCandidateTier({
  agentId,
  stepIndex,
  plannedTime,
  missionDuration,
  tierStats,
  acceptedCandidate
} = {}) {
  if (!globalThis.ANCHOR_DEBUG_TEMPORAL_GREEDY) return;
  const stats = cloneTierStats(tierStats);
  for (const [tier, summary] of Object.entries(stats)) {
    globalThis.console?.debug?.('[TemporalGreedy][CandidateTier]', {
      agentId,
      stepIndex,
      plannedTime: round(plannedTime),
      missionDuration: round(missionDuration),
      tier,
      candidateCount: summary.candidates,
      feasibleCandidateCount: Math.max(0, summary.candidates - summary.rejected),
      acceptedCandidate: acceptedCandidate?.stage === tier ? pointCell(acceptedCandidate) : null,
      rejectionSummary: summary.rejections
    });
  }
}

function debugTemporalGreedyEarlyStop({ stop, anchor, duration, remainingFuel, plannerStats } = {}) {
  if (!globalThis.ANCHOR_DEBUG_TEMPORAL_GREEDY) return;
  const plannedTime = Number(anchor?.t ?? stop?.stopTime ?? 0);
  if (!Number(duration) || plannedTime >= Number(duration) * 0.8) return;
  globalThis.console?.warn?.('[TemporalGreedy][EarlyStop]', {
    plannedTime: round(plannedTime),
    missionDuration: round(duration),
    fuelRemaining: round(remainingFuel ?? stop?.remainingFuel ?? 0),
    stopReason: stop?.stopReason ?? null,
    tier1Summary: plannerStats?.tierStats?.high_value ?? null,
    tier2Summary: plannerStats?.tierStats?.moderate_value ?? null,
    tier3Summary: plannerStats?.tierStats?.safe_continuation ?? null,
    lastPosition: pointCell(anchor)
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

function debugTemporalGreedyBeforeAppendValidation({
  agentId,
  from,
  to,
  waypointIndex,
  endpointOk,
  segmentOk,
  fullPrefixOk,
  rejectionReason,
  inDeploymentZone,
  deploymentZoneSampleValue,
  accepted
} = {}) {
  if (!globalThis.ANCHOR_DEBUG_TEMPORAL_GREEDY) return;
  globalThis.console?.debug?.('[TemporalGreedy][BeforeAppendValidation]', {
    agentId,
    fromCell: pointCell(from),
    toCell: pointCell(to),
    waypointIndex,
    endpointOk,
    segmentOk,
    fullPrefixOk,
    rejectionReason,
    inDeploymentZone,
    deploymentZoneSampleValue,
    accepted
  });
}

function debugTemporalGreedyDeploymentZoneFilter({
  cell,
  inDeploymentZone,
  originalValue,
  effectiveValue,
  rejectedAsSampleTarget
} = {}) {
  if (!globalThis.ANCHOR_DEBUG_TEMPORAL_GREEDY) return;
  globalThis.console?.debug?.('[TemporalGreedy][DeploymentZoneFilter]', {
    cell: pointCell(cell),
    inDeploymentZone,
    originalValue,
    effectiveValue,
    rejectedAsSampleTarget
  });
}

function debugTemporalGreedyRejectBlockedSegment({
  from,
  to,
  blockedCell,
  traversedCells,
  reason,
  candidateScore
} = {}) {
  if (!globalThis.ANCHOR_DEBUG_TEMPORAL_GREEDY) return;
  globalThis.console?.debug?.('[TemporalGreedy][RejectBlockedSegment]', {
    fromCell: pointCell(from),
    toCell: pointCell(to),
    blockedCell: pointCell(blockedCell),
    traversedCells: (traversedCells ?? []).map(pointCell),
    reason,
    candidateScore
  });
}

function debugTemporalGreedyAcceptedSegment({ agentId, waypointIndex, candidate } = {}) {
  if (globalThis.ANCHOR_DEBUG_ROUTE_SEGMENTS) {
    globalThis.console?.debug?.('[TemporalGreedy][ContinuousSegmentAccepted]', {
      from: pointCell(candidate?.from ?? candidate?.segment?.from),
      to: pointCell(candidate),
      sampledCells: (candidate?.segment?.sampledCells ?? candidate?.execution?.pathCells ?? candidate?.segment?.pathCells ?? []).map(pointCell),
      pathValue: round(candidate?.pathValue ?? 0, 3),
      energyCost: round(candidate?.executionEnergy ?? candidate?.execution?.energyCost ?? candidate?.segment?.energy ?? 0),
      eta: round(candidate?.execution?.travelTime ?? candidate?.segment?.estimatedTravelTime ?? 0),
      valid: true
    });
  }
  if (!globalThis.ANCHOR_DEBUG_TEMPORAL_GREEDY) return;
  globalThis.console?.debug?.('[TemporalGreedy][AcceptedSegment]', {
    agentId,
    waypointIndex,
    fromPlannedCell: pointCell(candidate?.segment?.from ?? candidate?.from),
    fromExpectedPosition: pointCell(candidate?.from ?? candidate?.segment?.from),
    toCell: pointCell(candidate),
    expectedArrivalPosition: candidate?.expectedArrivalPosition
      ? { x: round(candidate.expectedArrivalPosition.x, 3), y: round(candidate.expectedArrivalPosition.y, 3), t: round(candidate.expectedArrivalPosition.t ?? candidate.arrivalTime, 3) }
      : null,
    pathCells: (candidate?.execution?.pathCells ?? candidate?.segment?.pathCells ?? []).map(pointCell),
    validationOk: true,
    terrainClearance: estimateTerrainClearance(candidate?.execution?.pathCells ?? candidate?.segment?.pathCells ?? []),
    currentDriftRisk: candidate?.stochasticRisk ?? null,
    travelTime: round(candidate?.execution?.travelTime ?? candidate?.segment?.estimatedTravelTime ?? 0),
    fuelCost: round(candidate?.executionEnergy ?? candidate?.execution?.energyCost ?? candidate?.segment?.energy ?? 0)
  });
  globalThis.console?.debug?.('[TemporalGreedy][AcceptedWaypoint]', {
    agentId,
    waypointIndex,
    fromExpectedPosition: pointCell(candidate?.from ?? candidate?.segment?.from),
    fromPlannedCell: pointCell(candidate?.segment?.from ?? candidate?.from),
    toCell: pointCell(candidate),
    expectedArrivalPosition: candidate?.expectedArrivalPosition
      ? { x: round(candidate.expectedArrivalPosition.x, 3), y: round(candidate.expectedArrivalPosition.y, 3), t: round(candidate.expectedArrivalPosition.t ?? candidate.arrivalTime, 3) }
      : null,
    validationOk: true,
    travelTime: round(candidate?.execution?.travelTime ?? candidate?.segment?.estimatedTravelTime ?? 0),
    fuelCost: round(candidate?.executionEnergy ?? candidate?.execution?.energyCost ?? candidate?.segment?.energy ?? 0),
    pathValue: round(candidate?.pathValue ?? 0, 3),
    clusterPenalty: round(candidate?.clusterPenalty ?? 0, 3),
    duplicatePenalty: round(candidate?.duplicatePenalty ?? 0, 3),
    totalScore: round(candidate?.score ?? 0, 3)
  });
}

function debugTemporalGreedyRejectedSegment({
  agentId,
  from,
  to,
  reason,
  blockedCell,
  pathCells,
  routeBlockDiagnostic,
  simulationEquivalentCheck
} = {}) {
  if (globalThis.ANCHOR_DEBUG_ROUTE_SEGMENTS) {
    globalThis.console?.debug?.('[TemporalGreedy][ContinuousSegmentRejected]', {
      from: pointCell(from),
      to: pointCell(to),
      reason,
      blockedCells: routeBlockDiagnostic?.blocking?.blockedCell ? [routeBlockDiagnostic.blocking.blockedCell] : blockedCell ? [pointCell(blockedCell)] : [],
      clearanceViolations: []
    });
  }
  if (!globalThis.ANCHOR_DEBUG_TEMPORAL_GREEDY) return;
  globalThis.console?.debug?.('[TemporalGreedy][RejectedSegment]', {
    agentId,
    fromCell: pointCell(from),
    toCell: pointCell(to),
    reason,
    blockedCell: pointCell(blockedCell),
    pathCells: (pathCells ?? []).map(pointCell),
    routeBlockDiagnostic,
    simulationEquivalentCheck
  });
  globalThis.console?.debug?.('[TemporalGreedy][RejectedCandidate]', {
    agentId,
    fromExpectedPosition: pointCell(from),
    toCell: pointCell(to),
    reason,
    blockedCell: pointCell(blockedCell),
    routeBlockDiagnostic,
    clusterPenalty: round(to?.clusterPenalty ?? 0, 3),
    duplicatePenalty: round(to?.duplicatePenalty ?? 0, 3),
    validationResult: simulationEquivalentCheck
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

function estimateTerrainClearance(pathCells = []) {
  return pathCells.length ? 1 : null;
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
  const rejectionSummary = (stop.agents ?? []).map((agentStop) => agentStop.accounting?.rejectedCandidates ?? agentStop.diagnostics?.rejectionSummary ?? {});
  const rejectedBlocked = rejectionSummary.reduce((sum, item) => sum + Number(item.blocked ?? 0), 0);
  const rejectedDeploymentZone = rejectionSummary.reduce((sum, item) => sum + Number(item.deploymentZone ?? 0), 0);
  const rejectedUnreachable = rejectionSummary.reduce((sum, item) => sum + Number(item.unreachable ?? 0), 0);
  const rejectedClustered = rejectionSummary.reduce((sum, item) => sum + Number(item.clustered ?? 0), 0);
  globalThis.console?.debug?.('[TemporalGreedy][Summary]', {
    acceptedWaypoints,
    rejectedBlocked,
    rejectedDeploymentZone,
    rejectedUnreachable,
    rejectedClustered,
    plannedTime: stop.stopTime ?? 0,
    missionDuration: Number(level?.world?.time?.duration ?? 0),
    fuelUsed: Math.max(0, fuelBudget - Number(stop.remainingFuel ?? fuelBudget)),
    fuelBudget,
    stopReason: stop.stopReason,
    rejectionSummary
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

function debugTemporalGreedyBlockedSegmentEscapedValidation(audit) {
  if (!globalThis.ANCHOR_DEBUG_TEMPORAL_GREEDY) return;
  const issue = audit?.agentResults
    ?.flatMap((result) => (result.issues ?? []).map((candidate) => ({ agentId: result.agentId, ...candidate })))
    ?.find((candidate) => candidate.severity === 'error' && isRouteBlockedIssue(candidate));
  if (!issue) return;
  globalThis.console?.warn?.('[TemporalGreedy][BlockedSegmentEscapedValidation]', {
    agentId: issue.agentId,
    fromWaypoint: issue.from ?? null,
    toWaypoint: issue.to ?? null,
    blockedCell: issue.blockedAt ?? null
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

function getMaxWaypointTravelTime(level, waypoint, currentTime = 0) {
  if (!waypoint) return Infinity;
  const plannedT = Number(waypoint.t ?? waypoint.estimatedArrivalTime ?? waypoint.window);
  const planningWindow = Number(level?.world?.time?.planningWindow ?? 3);
  if (Number.isFinite(plannedT)) return Math.max(planningWindow * 3, plannedT + planningWindow * 2 - Number(currentTime ?? 0));
  return Math.max(12, planningWindow * 4);
}

function buildDeploymentZoneCellSet(level) {
  return new Set(getDeploymentZones(level).flatMap((zone) => zone.cells ?? []).map(cellKey));
}

function isDeploymentZoneCell(deploymentZoneCells, cell) {
  return Boolean(deploymentZoneCells?.has?.(cellKey(cell)));
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

function isFinitePoint(point) {
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y));
}
