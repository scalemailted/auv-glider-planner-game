import { buildRouteSegmentsForAgent } from './RouteSegmentBuilder.js';
import { estimateRouteEnergy } from './RoutePreview.js';
import { getPlanningFrame } from '../sim/ChallengeMode.js';
import { getTimeConfig } from '../time/MissionTime.js';
import { normalizeROIValue } from '../sim/ROIValue.js';
import { getActivePriorityTargets, normalizePriorityTargets } from '../sim/PriorityTargets.js';
import { estimateDeadReckoningCone } from '../navigation/NavigationUncertainty.js';
import { normalizeWaypointKind, waypointKindLabel } from './WaypointSemantics.js';

const DEFAULT_LOOKAHEAD_HOURS = 9;
const DEFAULT_BLOCK_SIZE_HOURS = 3;

export function gradeRouteContributions({
  level,
  mission,
  plan,
  selectedAgentId = null,
  challengeMode = 'perfectKnowledge',
  revealTruth = false,
  forecastMemberId = null,
  blockSizeHours = DEFAULT_BLOCK_SIZE_HOURS,
  lookaheadHours = DEFAULT_LOOKAHEAD_HOURS
} = {}) {
  const agentPlans = (plan?.agentPlans ?? [])
    .filter((agentPlan) => !selectedAgentId || agentPlan.agentId === selectedAgentId);
  const agentSummaries = agentPlans.map((agentPlan) => gradeAgentRoute({
    level,
    mission,
    plan,
    agentPlan,
    challengeMode,
    revealTruth,
    forecastMemberId,
    lookaheadHours
  })).filter(Boolean);
  const segments = agentSummaries.flatMap((summary) => summary.segments);
  const blocks = aggregateSegmentGradesByBlock(segments, { level, blockSizeHours });
  const overall = summarizeOverallRouteGrade(segments, blocks);
  return {
    schemaVersion: 'segment-contribution-v1',
    blockSizeHours,
    lookaheadHours,
    overall,
    agents: agentSummaries,
    segments,
    blocks
  };
}

function gradeAgentRoute({ level, mission, plan, agentPlan, challengeMode, revealTruth, forecastMemberId, lookaheadHours }) {
  const agent = (mission?.agents ?? []).find((candidate) => candidate.id === agentPlan?.agentId);
  if (!agent || !agentPlan) return null;
  const route = buildRouteSegmentsForAgent({ level, mission, agent, agentPlan });
  const sampledCells = new Set();
  const context = { level, mission, challengeMode, revealTruth, forecastMemberId, sampledCells, lookaheadHours, agent };
  const segments = route.segments.map((segment, index) => gradeSegment(segment, index, context));
  return {
    agentId: agent.id,
    grade: gradeFromScore(average(segments.map((segment) => segment.numericScore))),
    numericScore: round(average(segments.map((segment) => segment.numericScore))),
    segments
  };
}

function gradeSegment(segment, index, context) {
  const { level, mission, challengeMode, revealTruth, forecastMemberId, sampledCells, lookaheadHours, agent } = context;
  const fromTime = finiteOr(segment.from?.estimatedArrivalTime, finiteOr(segment.from?.t, 0));
  const frame = getPlanningFrame(level, fromTime, { challengeMode, revealTruth, forecastMemberId });
  const estimate = estimateRouteEnergy(segment.from, segment.to, level, agent, frame, {
    driftGain: mission?.physics?.driftGain ?? 0.5,
    energyPerCell: mission?.physics?.energyPerCell ?? 1,
    mission
  });
  const duration = Math.max(0.05, finiteOr(segment.to?.estimatedArrivalTime, finiteOr(segment.to?.t, fromTime + finiteOr(estimate.eta, estimate.estimatedTravelTime ?? 0))) - fromTime);
  const timeEnd = fromTime + duration;
  const segmentCells = uniqueCells(segment.sampledCells ?? estimate.sampledCells ?? []);
  const immediateSampleReward = scoreSampleReward({ level, frame, cells: segmentCells, sampledCells });
  const starReward = scoreStarReward({ level, cells: segmentCells, t0: fromTime, t1: timeEnd });
  const futureSetupValue = scoreFutureSetup({
    level,
    mission,
    from: segment.from,
    to: segment.to,
    t0: fromTime,
    t1: timeEnd,
    challengeMode,
    revealTruth,
    forecastMemberId,
    lookaheadHours
  });
  const hazardExposure = countHazards(level, segmentCells);
  const currentAssistValue = clamp(Number(estimate.currentAssist ?? 0) * 22, -12, 12);
  const coverageValue = coverageCredit(segment, level, timeEnd);
  const energyCostPenalty = clamp(Number(estimate.energy ?? 0) * 0.18, 0, 28);
  const hazardPenalty = hazardExposure * 18;
  const shorelineRiskPenalty = clamp(Number(estimate.beachingRisk?.value ?? 0) * 24, 0, 24);
  const crossCurrentPenalty = clamp(Math.abs(Number(estimate.crossCurrent ?? 0)) * 10, 0, 10);
  const timeCostPenalty = clamp(duration * 1.4, 0, 16);
  const deadReckoningCone = estimateDeadReckoningCone({
    from: segment.from,
    to: segment.to,
    durationHours: duration,
    level,
    mission,
    frame,
    segmentCells,
    segmentIndex: index,
    agentId: agent.id
  });
  const navigationUncertaintyPenalty = clamp(Number(deadReckoningCone.risk?.penalty ?? 0), 0, 26);
  const weights = normalizeRouteGradeWeights(mission?.rules?.routeGradeWeights ?? mission?.scoring?.routeGradeWeights ?? level?.meta?.generationConfig?.routeGradeWeights);
  const waypointKind = normalizeWaypointKind(segment.to);
  const rawScore = 58
    + immediateSampleReward * weights.immediateSampleReward
    + starReward * weights.starReward
    + futureSetupValue * weights.futureSetupValue
    + currentAssistValue * weights.currentAssistValue
    + coverageValue * weights.coverageValue
    - energyCostPenalty * weights.energyCostPenalty
    - hazardPenalty * weights.hazardPenalty
    - shorelineRiskPenalty * weights.shorelineRiskPenalty
    - crossCurrentPenalty * weights.crossCurrentPenalty
    - timeCostPenalty * weights.timeCostPenalty
    - navigationUncertaintyPenalty * weights.navigationUncertaintyPenalty
    - (estimate.valid === false || segment.valid === false ? 38 : 0);
  const numericScore = Math.max(0, Math.min(100, rawScore));
  const components = {
    immediateSampleReward: round(immediateSampleReward),
    starReward: round(starReward),
    futureSetupValue: round(futureSetupValue),
    currentAssistValue: round(currentAssistValue),
    coverageValue: round(coverageValue),
    energyCostPenalty: round(energyCostPenalty),
    hazardPenalty: round(hazardPenalty),
    shorelineRiskPenalty: round(shorelineRiskPenalty),
    crossCurrentPenalty: round(crossCurrentPenalty),
    timeCostPenalty: round(timeCostPenalty),
    navigationUncertaintyPenalty: round(navigationUncertaintyPenalty)
  };
  const roleLabels = segmentRoles({ components, estimate, hazardExposure, segment, deadReckoningCone });
  return {
    segmentId: `${agent.id}:segment:${index + 1}`,
    agentId: agent.id,
    fromWaypointIndex: Number.isInteger(segment.from?.waypointIndex) ? segment.from.waypointIndex : null,
    toWaypointIndex: Number.isInteger(segment.to?.waypointIndex) ? segment.to.waypointIndex : index,
    timeStart: round(fromTime),
    timeEnd: round(timeEnd),
    durationHours: round(duration),
    roleLabels,
    grade: gradeFromScore(numericScore),
    numericScore: round(numericScore),
    components,
    diagnostics: {
      currentAssist: round(Number(estimate.currentAssist ?? 0)),
      crossCurrent: round(Number(estimate.crossCurrent ?? 0)),
      hazardExposure,
      shorelineRisk: round(Number(estimate.beachingRisk?.value ?? 0)),
      deadReckoningCone,
      navigationUncertainty: {
        level: deadReckoningCone.level,
        enabled: deadReckoningCone.enabled,
        coneWidthCells: deadReckoningCone.coneWidthCells,
        risk: deadReckoningCone.risk,
        seededOffset: deadReckoningCone.seededOffset ?? null
      },
      energy: round(Number(estimate.energy ?? 0)),
      eta: round(Number(estimate.eta ?? estimate.estimatedTravelTime ?? 0)),
      valid: estimate.valid !== false && segment.valid !== false,
      waypointKind,
      waypointKindLabel: waypointKindLabel(waypointKind),
      routePreviewSemantics: waypointKind === 'surface'
        ? 'Surface Update: GPS correction, forecast/communication refresh, replanning point.'
        : waypointKind === 'terminalCarryThrough'
          ? 'Terminal carry-through: travels toward this command until mission time expires.'
          : 'Submerged navigation intent: dead-reckoned command waypoint.',
      futureTarget: futureTargetLabel(level, segment.to, timeEnd, lookaheadHours),
      notes: segmentNotes({ components, estimate, hazardExposure, segment, deadReckoningCone }),
      missionMode: mission?.meta?.missionMode ?? level?.meta?.missionMode ?? null,
      routeGradeWeights: weights
    }
  };
}

function scoreSampleReward({ level, frame, cells, sampledCells }) {
  let total = 0;
  for (const cell of cells) {
    const key = cellKey(cell);
    const multiplier = sampledCells.has(key) ? 0.25 : 1;
    const roi = normalizeROIValue(frame?.roi?.[cell.y]?.[cell.x] ?? level?.layers?.truth?.frames?.[0]?.roi?.[cell.y]?.[cell.x] ?? 0);
    const value = Number(roi.expectedValue ?? 0) * 28 * multiplier;
    if (value > 0.4) sampledCells.add(key);
    total += value;
  }
  return clamp(total, 0, 30);
}

function scoreStarReward({ level, cells, t0, t1 }) {
  if (!cells.length) return 0;
  const samples = Math.max(2, Math.ceil(Math.max(0.1, t1 - t0)));
  let total = 0;
  for (let i = 0; i <= samples; i += 1) {
    const t = t0 + (t1 - t0) * (i / samples);
    for (const target of getActivePriorityTargets(level, t)) {
      const pos = target.position;
      const radius = Math.max(0.75, Number(target.radius ?? 0.75));
      if (cells.some((cell) => Math.hypot(cell.x - pos.x, cell.y - pos.y) <= radius)) {
        total += clamp(Number(target.value ?? 200) / 9, 0, 28);
      }
    }
  }
  return clamp(total, 0, 34);
}

function scoreFutureSetup({ level, mission, from, to, t0, t1, challengeMode, revealTruth, forecastMemberId, lookaheadHours }) {
  const before = futurePotential({ level, mission, point: from, t: t0, challengeMode, revealTruth, forecastMemberId, lookaheadHours });
  const after = futurePotential({ level, mission, point: to, t: t1, challengeMode, revealTruth, forecastMemberId, lookaheadHours });
  return clamp((after.score - before.score) * 34, 0, 32);
}

function futurePotential({ level, point, t, challengeMode, revealTruth, forecastMemberId, lookaheadHours }) {
  if (!isFinitePoint(point)) return { score: 0, target: null };
  let best = { score: 0, target: null };
  const duration = getTimeConfig(level).duration;
  const end = Math.min(duration, t + lookaheadHours);
  for (let time = t; time <= end + 0.001; time += 1.5) {
    for (const target of getActivePriorityTargets(level, time)) {
      const pos = target.position;
      const distance = Math.hypot(Number(point.x) - Number(pos.x), Number(point.y) - Number(pos.y));
      const score = clamp((Number(target.value ?? 200) / 200) / (1 + distance * 0.35), 0, 1.2);
      if (score > best.score) best = { score, target: { type: 'star', id: target.id, label: target.label, t: time } };
    }
    const frame = getPlanningFrame(level, time, { challengeMode, revealTruth, forecastMemberId });
    const roi = bestNearbyRoi(frame, point);
    if (roi.score > best.score) best = { score: roi.score, target: { type: 'roi', x: roi.x, y: roi.y, t: time } };
  }
  return best;
}

function bestNearbyRoi(frame, point) {
  let best = { score: 0, x: null, y: null };
  const grid = frame?.roi ?? [];
  for (let y = 0; y < grid.length; y += 2) {
    for (let x = 0; x < (grid[y]?.length ?? 0); x += 2) {
      const value = Number(normalizeROIValue(grid[y][x]).expectedValue ?? 0);
      if (value <= 0) continue;
      const distance = Math.hypot(Number(point.x) - x, Number(point.y) - y);
      const score = value / (1 + distance * 0.25);
      if (score > best.score) best = { score, x, y };
    }
  }
  return best;
}

export function aggregateSegmentGradesByBlock(segments = [], { level = null, blockSizeHours = DEFAULT_BLOCK_SIZE_HOURS } = {}) {
  const duration = getTimeConfig(level).duration;
  const blockSize = Math.max(0.1, Number(blockSizeHours) || DEFAULT_BLOCK_SIZE_HOURS);
  const count = Math.max(1, Math.ceil(duration / blockSize));
  return Array.from({ length: count }, (_, index) => {
    const start = index * blockSize;
    const end = Math.min(duration, start + blockSize);
    const overlapping = segments
      .map((segment) => ({ segment, weight: overlapWeight(segment, start, end) }))
      .filter((entry) => entry.weight > 0);
    const components = sumWeightedComponents(overlapping);
    const score = overlapping.length
      ? overlapping.reduce((sum, entry) => sum + entry.segment.numericScore * entry.weight, 0) / overlapping.reduce((sum, entry) => sum + entry.weight, 0)
      : 55;
    return {
      blockId: `block:${index + 1}`,
      timeStart: round(start),
      timeEnd: round(end),
      durationHours: round(end - start),
      grade: gradeFromScore(score),
      numericScore: round(score),
      roleLabels: blockRoles(overlapping.map((entry) => entry.segment)),
      components,
      segmentIds: overlapping.map((entry) => entry.segment.segmentId)
    };
  });
}

function summarizeOverallRouteGrade(segments, blocks) {
  const segmentScore = average(segments.map((segment) => segment.numericScore));
  const blockScore = average(blocks.map((block) => block.numericScore));
  const numericScore = round(Number.isFinite(segmentScore) ? segmentScore * 0.7 + blockScore * 0.3 : blockScore);
  return {
    grade: gradeFromScore(numericScore),
    numericScore,
    segmentCount: segments.length,
    blockCount: blocks.length,
    components: sumComponents(segments.map((segment) => segment.components))
  };
}

function segmentRoles({ components, estimate, hazardExposure, segment, deadReckoningCone }) {
  const roles = [];
  if (components.immediateSampleReward >= 8) roles.push('sampling');
  if (components.starReward >= 8) roles.push('objective');
  if (components.futureSetupValue >= 8) roles.push('positioning');
  if (components.currentAssistValue >= 3) roles.push('current-assisted');
  if (hazardExposure > 0 || components.shorelineRiskPenalty >= 10 || estimate.valid === false || segment.valid === false) roles.push('risky');
  if (deadReckoningCone?.risk?.warning || components.navigationUncertaintyPenalty >= 8) roles.push('navigation-risk');
  if (segment.to?.terminalCarryThrough || segment.to?.intentionalOverDuration || segment.to?.runtimeBehavior === 'truncate_at_mission_end') roles.push('carry-through');
  if (!roles.length) roles.push('transit');
  return roles;
}

function segmentNotes({ components, estimate, hazardExposure, segment, deadReckoningCone }) {
  const notes = [];
  if (components.futureSetupValue >= 8) notes.push('Improves access to future reward.');
  if (components.immediateSampleReward >= 8) notes.push('Collects meaningful sample value.');
  if (components.starReward >= 8) notes.push('Reaches an active priority target.');
  if (components.currentAssistValue >= 3) notes.push('Uses favorable current.');
  if (hazardExposure > 0) notes.push('Crosses hazard exposure.');
  if (components.shorelineRiskPenalty >= 10) notes.push('Shoreline current risk.');
  if (deadReckoningCone?.enabled && components.navigationUncertaintyPenalty >= 4) {
    notes.push('Dead-reckoning cone overlaps land or hazard risk.');
  }
  if (deadReckoningCone?.enabled && Number(deadReckoningCone.coneWidthCells ?? 0) >= 1.2) {
    notes.push('Surface sooner to shrink navigation uncertainty.');
  }
  if (estimate.valid === false || segment.valid === false) notes.push('Route segment is blocked.');
  if (segment.to?.terminalCarryThrough) notes.push('Terminal carry-through coverage.');
  return notes;
}

function coverageCredit(segment, level, timeEnd) {
  if (segment.to?.terminalCarryThrough || segment.to?.intentionalOverDuration || segment.to?.runtimeBehavior === 'truncate_at_mission_end') return 14;
  const duration = getTimeConfig(level).duration;
  if (duration > 0 && timeEnd >= duration * 0.85) return 5;
  return 0;
}

function futureTargetLabel(level, point, time, lookaheadHours) {
  const target = futurePotential({ level, point, t: time, lookaheadHours }).target;
  if (!target) return null;
  if (target.type === 'star') return target.label ?? target.id ?? 'future star';
  return `ROI near (${target.x}, ${target.y})`;
}

function countHazards(level, cells) {
  return cells.reduce((sum, cell) => sum + (Number(level?.layers?.hazards?.[cell.y]?.[cell.x] ?? 0) > 0 ? 1 : 0), 0);
}

function blockRoles(segments) {
  const counts = new Map();
  for (const segment of segments) for (const role of segment.roleLabels ?? []) counts.set(role, (counts.get(role) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([role]) => role);
}

function sumWeightedComponents(entries) {
  const result = {};
  for (const { segment, weight } of entries) {
    for (const [key, value] of Object.entries(segment.components ?? {})) {
      result[key] = round(Number(result[key] ?? 0) + Number(value ?? 0) * weight);
    }
  }
  return result;
}

function sumComponents(componentsList) {
  const result = {};
  for (const components of componentsList) {
    for (const [key, value] of Object.entries(components ?? {})) {
      result[key] = round(Number(result[key] ?? 0) + Number(value ?? 0));
    }
  }
  return result;
}

function overlapWeight(segment, blockStart, blockEnd) {
  const start = Number(segment.timeStart ?? 0);
  const end = Math.max(start + 0.001, Number(segment.timeEnd ?? start));
  const overlap = Math.max(0, Math.min(end, blockEnd) - Math.max(start, blockStart));
  return overlap / Math.max(0.001, end - start);
}

export function gradeFromScore(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return 'N/A';
  if (value >= 97) return 'A+';
  if (value >= 93) return 'A';
  if (value >= 90) return 'A-';
  if (value >= 87) return 'B+';
  if (value >= 83) return 'B';
  if (value >= 80) return 'B-';
  if (value >= 77) return 'C+';
  if (value >= 73) return 'C';
  if (value >= 70) return 'C-';
  if (value >= 67) return 'D+';
  if (value >= 63) return 'D';
  if (value >= 60) return 'D-';
  return 'F';
}

function uniqueCells(cells) {
  const seen = new Set();
  const result = [];
  for (const cell of cells ?? []) {
    const x = Math.round(Number(cell?.x));
    const y = Math.round(Number(cell?.y));
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const key = `${x},${y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ x, y });
  }
  return result;
}

function cellKey(cell) {
  return `${Math.round(Number(cell?.x))},${Math.round(Number(cell?.y))}`;
}

function average(values) {
  const finite = values.map(Number).filter(Number.isFinite);
  return finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : NaN;
}

function finiteOr(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clamp(value, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.max(min, Math.min(max, numeric));
}

function normalizeRouteGradeWeights(weights = {}) {
  return {
    immediateSampleReward: weightFor(weights.immediateSampleReward),
    starReward: weightFor(weights.starReward),
    futureSetupValue: weightFor(weights.futureSetupValue),
    currentAssistValue: weightFor(weights.currentAssistValue),
    coverageValue: weightFor(weights.coverageValue),
    energyCostPenalty: weightFor(weights.energyCostPenalty),
    hazardPenalty: weightFor(weights.hazardPenalty),
    shorelineRiskPenalty: weightFor(weights.shorelineRiskPenalty),
    crossCurrentPenalty: weightFor(weights.crossCurrentPenalty),
    timeCostPenalty: weightFor(weights.timeCostPenalty),
    navigationUncertaintyPenalty: weightFor(weights.navigationUncertaintyPenalty)
  };
}

function weightFor(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(3, number)) : 1;
}

function round(value, digits = 2) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Number(numeric.toFixed(digits)) : 0;
}

function isFinitePoint(point) {
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y));
}
