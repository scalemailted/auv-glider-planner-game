import { estimateSegmentBeachingRisk } from './ShorelineRisk.js';
import { explainSegmentBlockage } from './Navigability.js';
import { sampleCurrentVector } from '../currents/CurrentFieldSampler.js';

export function clipLineToTerrain(start, end, level, { stepsPerCell = 4, mission = null } = {}) {
  void stepsPerCell;
  const blockage = explainSegmentBlockage(start, end, { level, mission });
  const endpoint = blockage.ok ? end : blockage.lastValid ?? start ?? { x: 0, y: 0 };
  return {
    valid: blockage.ok,
    points: [start, endpoint].filter(isFinitePoint),
    blockedAt: blockage.blockedAt,
    lastValid: blockage.lastValid ?? start ?? { x: 0, y: 0 },
    reason: blockage.reason,
    traversedCells: blockage.cells,
    sampledCells: blockage.cells,
    sampledPoints: blockage.sampledPoints ?? [],
    blockedCells: blockage.blockedCells
  };
}

export function estimateRouteEnergy(start, target, level, agent, frame, {
  driftGain = 0.5,
  energyPerCell = 1,
  mission = null
} = {}) {
  const clipped = clipLineToTerrain(start, target, level, { mission });
  const endpoint = clipped.valid ? target : clipped.lastValid;
  const dx = endpoint.x - start.x;
  const dy = endpoint.y - start.y;
  const lineDistance = Math.hypot(dx, dy);
  const distance = lineDistance;
  const direction = normalize(dx, dy);
  const current = sampleCurrent(frame, level, start.x, start.y);
  const currentAssist = current[0] * direction.x + current[1] * direction.y;
  const crossCurrent = current[0] * -direction.y + current[1] * direction.x;
  const alignmentPenalty = Math.max(-0.5, Math.min(0.9, -currentAssist * driftGain));
  const crossPenalty = Math.min(0.38, Math.abs(crossCurrent) * driftGain * 0.24);
  const depthPenalty = sampleDepthPenalty(level, endpoint.x, endpoint.y);
  const beachingRisk = estimateSegmentBeachingRisk({ level, frame, start, end: endpoint });
  const beachingPenalty = Number(beachingRisk.value ?? 0) * 0.18;
  const energy = Math.max(0, distance * energyPerCell * (1 + alignmentPenalty + crossPenalty + depthPenalty + beachingPenalty));
  const budget = Number(agent?.battery ?? 0);
  const notes = [];
  if (!clipped.valid) notes.push('Route blocked by land');
  if (currentAssist > 0.08) notes.push('Current assist: helpful');
  if (currentAssist < -0.08) notes.push('Against current: costly');
  if (Math.abs(crossCurrent) > 0.12) notes.push('Cross-current uncertainty');
  if (depthPenalty > 0) notes.push('Shallow/depth penalty');
  if (beachingRisk.value >= 0.5) notes.push('Shoreline current beaching risk');
  if (budget && energy > budget) notes.push('Energy exceeds battery');

  return {
    valid: clipped.valid,
    energy,
    distance,
    pathDistance: distance,
    currentAssist,
    crossCurrent,
    energyModifier: 1 + alignmentPenalty + crossPenalty + depthPenalty,
    depthPenalty,
    beachingRisk,
    beachingPenalty,
    blockedAt: clipped.blockedAt ?? null,
    lastValid: clipped.lastValid,
    reachable: clipped.valid !== false && (!budget || energy <= budget),
    movementModel: 'continuous-segment',
    sampledCells: clipped.traversedCells ?? [],
    notes
  };
}

function sampleCurrent(frame, level, x, y) {
  return sampleCurrentVector({ frame, level, x, y });
}

function sampleDepthPenalty(level, x, y) {
  const depth = level?.layers?.depth?.[clampIndex(y, level?.world?.grid?.height ?? 1)]?.[clampIndex(x, level?.world?.grid?.width ?? 1)];
  if (depth === undefined) return 0;
  return Number(depth) < 0.32 ? 0.22 : 0;
}

function normalize(x, y) {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function clampIndex(value, max) {
  return Math.max(0, Math.min(max - 1, Math.floor(value)));
}

function isFinitePoint(point) {
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y));
}
