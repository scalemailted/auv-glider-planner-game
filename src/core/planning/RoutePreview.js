import { estimateSegmentBeachingRisk } from './ShorelineRisk.js';
import { evaluateReachability, explainSegmentBlockage } from './Navigability.js';

export function clipLineToTerrain(start, end, level, { stepsPerCell = 4, mission = null } = {}) {
  void stepsPerCell;
  const blockage = explainSegmentBlockage(start, end, { level, mission });
  return {
    valid: blockage.ok,
    points: blockage.cells.map((cell) => ({ x: cell.x, y: cell.y })),
    blockedAt: blockage.blockedAt,
    lastValid: blockage.lastValid ?? start ?? { x: 0, y: 0 },
    reason: blockage.reason,
    traversedCells: blockage.cells,
    blockedCells: blockage.blockedCells
  };
}

export function estimateRouteEnergy(start, target, level, agent, frame, {
  driftGain = 0.5,
  energyPerCell = 1,
  mission = null
} = {}) {
  const clipped = clipLineToTerrain(start, target, level, { mission });
  const reachability = evaluateReachability(start, target, { level, mission });
  const endpoint = clipped.valid ? target : clipped.lastValid;
  const dx = endpoint.x - start.x;
  const dy = endpoint.y - start.y;
  const lineDistance = Math.hypot(dx, dy);
  const distance = reachability.reachable
    ? Math.max(lineDistance, Number(reachability.distance ?? lineDistance))
    : lineDistance;
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
  if (reachability.reachable === false && clipped.valid) notes.push('No legal navigable path');
  if (currentAssist > 0.08) notes.push('Current assist: helpful');
  if (currentAssist < -0.08) notes.push('Against current: costly');
  if (Math.abs(crossCurrent) > 0.12) notes.push('Cross-current uncertainty');
  if (depthPenalty > 0) notes.push('Shallow/depth penalty');
  if (beachingRisk.value >= 0.5) notes.push('Shoreline current beaching risk');
  if (budget && energy > budget) notes.push('Energy exceeds battery');

  return {
    valid: clipped.valid && reachability.reachable !== false,
    energy,
    distance,
    pathDistance: reachability.reachable ? reachability.distance : Infinity,
    currentAssist,
    crossCurrent,
    energyModifier: 1 + alignmentPenalty + crossPenalty + depthPenalty,
    depthPenalty,
    beachingRisk,
    beachingPenalty,
    blockedAt: clipped.blockedAt ?? reachability.blockedCell ?? target ?? null,
    lastValid: clipped.lastValid,
    reachable: reachability.reachable !== false && (!budget || energy <= budget),
    reachability,
    notes
  };
}

function sampleCurrent(frame, level, x, y) {
  const cx = clampIndex(x, level?.world?.grid?.width ?? 1);
  const cy = clampIndex(y, level?.world?.grid?.height ?? 1);
  return frame?.current?.[cy]?.[cx] ?? [0, 0];
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
