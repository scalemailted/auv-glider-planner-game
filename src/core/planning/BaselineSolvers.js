import { createEmptyPlan, addWaypoint } from './WaypointPlan.js';
import { roiScalar } from '../sim/ROIValue.js';
import { getMobileHazardsAtTime } from '../sim/MobileHazards.js';
import { depthEnergyMultiplier } from '../sim/DepthLayer.js';
import { getPlanningFrame } from '../sim/ChallengeMode.js';
import { normalizePriorityTargets, getPriorityTargetPosition } from '../sim/PriorityTargets.js';
import { estimateTemporalSegment } from './TemporalWaypointPlanner.js';
import { applyRouteAuditToPlan, validateRoutePlanForExecution } from './RouteValidityAudit.js';
import { isCellNavigable } from './Navigability.js';

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

  const cells = [];
  const grid = level?.world?.grid ?? {};
  const cellCount = Math.max(1, Number(grid.width ?? 1) * Number(grid.height ?? 1));
  const maxWaypoints = Math.max(1, Number(options.maxWaypoints ?? Math.min(cellCount, Math.max(24, Math.ceil(Number(level?.world?.time?.duration ?? 24) * 3)))));
  const maxPlannerIterations = Math.max(maxWaypoints, Number(options.maxPlannerIterations ?? maxWaypoints + agentsSafetyMargin(mission)));
  const minPositiveScoreThreshold = Number(options.minPositiveScoreThreshold ?? 0);
  const startedAt = globalThis.performance?.now?.() ?? Date.now();
  const maxRuntimeMs = Number(options.maxRuntimeMs ?? 800);
  const duration = Number(level?.world?.time?.duration ?? 0);
  const priorityTargets = normalizePriorityTargets(level);
  for (let y = 0; y < level.world.grid.height; y += 1) {
    for (let x = 0; x < level.world.grid.width; x += 1) {
      if (!isCellNavigable(level, mission, x, y).ok) continue;
      cells.push({ x, y });
    }
  }

  const agents = mission.agents ?? [];
  const globalSampled = new Set();
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
    globalSampled.add(cellKey(anchor));
    let stop = null;
    for (let index = 0; index < maxWaypoints; index += 1) {
      if ((globalThis.performance?.now?.() ?? Date.now()) - startedAt > maxRuntimeMs) {
        stop = buildStop('plannerSafetyLimitReached', anchor, remainingFuel, duration, { waypointCount: index });
        break;
      }
      if (index >= maxPlannerIterations) {
        stop = buildStop('maxWaypointSafetyLimitReached', anchor, remainingFuel, duration, { waypointCount: index });
        break;
      }
      if (duration && Number(anchor.t ?? 0) >= duration) {
        stop = buildStop('missionTimeExhausted', anchor, remainingFuel, duration, { waypointCount: index });
        break;
      }
      if (Number.isFinite(remainingFuel) && remainingFuel <= 0) {
        stop = buildStop('remainingFuelExhausted', anchor, remainingFuel, duration, { waypointCount: index });
        break;
      }
      const candidate = chooseTemporalCell({
        level,
        mission,
        agent,
        anchor,
        remainingFuel,
        cells,
        sampled: globalSampled,
        priorityTargets,
        challengeMode: options.challengeMode ?? level.challengeMode ?? 'perfectKnowledge',
        revealTruth: Boolean(options.revealTruth),
        forecastMemberId: options.forecastMemberId ?? null,
        duration
      });
      if (!candidate) {
        stop = buildStop('noReachableCandidates', anchor, remainingFuel, duration, { waypointCount: index });
        break;
      }
      if (candidate.value + candidate.priorityBonus <= 0 || candidate.score <= minPositiveScoreThreshold) {
        stop = buildStop('noPositiveReachableCandidates', anchor, remainingFuel, duration, {
          waypointCount: index,
          bestScore: round(candidate.score),
          bestValue: round(candidate.value + candidate.priorityBonus)
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
        note: `temporal=${candidate.value.toFixed(3)} priority=${candidate.priorityBonus.toFixed(1)} energy=${candidate.segment.energy.toFixed(1)} score=${candidate.score.toFixed(3)}`
      });
      globalSampled.add(cellKey(candidate));
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
    if (!stop) stop = buildStop('maxWaypointSafetyLimitReached', anchor, remainingFuel, duration, { waypointCount: maxWaypoints });
    agentStops.push({ agentId: agent.id, ...stop });
  }
  plan.meta.greedyStop = summarizeStops(agentStops, duration);
  plan.meta.greedyStopsByAgent = agentStops;
  validateAndRepairBaselinePlan(plan, level, mission);

  return plan;
}

function validateAndRepairBaselinePlan(plan, level, mission) {
  let audit = validateRoutePlanForExecution({ level, mission, plan });
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
          stop.stopReason = 'segmentBlockedDuringValidation';
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
  if (!audit.ok) plan.meta.stopReason = 'routeValidationFailed';
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
  challengeMode,
  revealTruth,
  forecastMemberId,
  duration
}) {
  let best = null;
  for (const cell of cells) {
    if (sampled.has(cellKey(cell))) continue;
    if (cell.x === Math.round(anchor.x) && cell.y === Math.round(anchor.y)) continue;
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
    if (!segment.valid) continue;
    if (duration && arrivalTime > duration) continue;
    if (Number.isFinite(remainingFuel) && segment.energy > remainingFuel) continue;

    const arrivalFrame = getPlanningFrame(level, arrivalTime, { challengeMode, revealTruth, forecastMemberId });
    const value = roiScalar(arrivalFrame?.roi?.[cell.y]?.[cell.x] ?? 0, 'expectedValue');
    const probability = roiScalar(arrivalFrame?.roi?.[cell.y]?.[cell.x] ?? 0, 'probability');
    const priorityBonus = priorityTargetBonus(priorityTargets, cell, arrivalTime);
    const hazardPenalty = Number(level.layers?.hazards?.[cell.y]?.[cell.x] ?? 0) * 40;
    const mobileRisk = mobileHazardRisk(level, cell.x, cell.y, arrivalTime);
    const depthPenalty = Math.max(0, depthEnergyMultiplier(level, mission, cell.x, cell.y) - 1);
    const ensembleRisk = ensembleDisagreementAt(level, cell.x, cell.y, arrivalTime, { challengeMode, forecastMemberId });
    const energyPenalty = Number(segment.energy ?? 0) * 0.35;
    const travelTimePenalty = Number(segment.estimatedTravelTime ?? 0) * 0.08;
    const score = value
      + priorityBonus
      - energyPenalty
      - travelTimePenalty
      - hazardPenalty
      - mobileRisk * 12
      - depthPenalty * 18
      - ensembleRisk * 12;
    const candidate = {
      ...cell,
      segment,
      arrivalTime,
      window: windowForTime(level, arrivalTime),
      value,
      probability,
      priorityBonus,
      score
    };
    if (!best || candidate.score > best.score) best = candidate;
  }
  return best;
}

function priorityTargetBonus(targets, cell, time) {
  let bonus = 0;
  for (const target of targets) {
    const position = getPriorityTargetPosition(target, time);
    if (!position?.active) continue;
    const radius = Math.max(0.05, Number(target.radius ?? 0.75));
    const distance = Math.hypot(Number(cell.x) - Number(position.x), Number(cell.y) - Number(position.y));
    if (distance <= radius + 0.5) bonus += Number(target.value ?? 0);
  }
  return bonus;
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

function round(value, digits = 2) {
  return Number(Number(value || 0).toFixed(digits));
}
