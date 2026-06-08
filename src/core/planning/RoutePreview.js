import { estimateSegmentBeachingRisk } from './ShorelineRisk.js';
import { explainSegmentBlockage } from './Navigability.js';
import { estimateCurrentAwareSegment } from './CurrentAwareRouteCost.js';

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
  const segmentCost = estimateCurrentAwareSegment({
    start,
    end: endpoint,
    level,
    agent,
    frame,
    mission,
    startTime: frame?.t ?? start?.t ?? 0,
    driftGain,
    energyPerCell
  });
  const currentAssist = segmentCost.currentAssist;
  const crossCurrent = segmentCost.crossCurrent;
  const depthPenalty = segmentCost.depthPenalty;
  const beachingRisk = estimateSegmentBeachingRisk({ level, frame, start, end: endpoint });
  const beachingPenalty = Math.max(Number(segmentCost.beachingRisk?.value ?? 0), Number(beachingRisk.value ?? 0)) * 0.18;
  const energy = Math.max(0, segmentCost.energy + distance * energyPerCell * beachingPenalty);
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
    eta: segmentCost.eta,
    estimatedTravelTime: segmentCost.estimatedTravelTime,
    distance,
    pathDistance: distance,
    currentAssist,
    crossCurrent,
    alongTrackCurrent: segmentCost.alongTrackCurrent,
    crossTrackCurrent: segmentCost.crossTrackCurrent,
    currentMagnitude: segmentCost.currentMagnitude,
    currentVector: segmentCost.currentVector,
    effectiveSpeed: segmentCost.effectiveSpeed,
    speedOverGround: segmentCost.speedOverGround,
    energyModifier: segmentCost.energyModifier + beachingPenalty,
    depthPenalty,
    beachingRisk,
    beachingPenalty,
    blockedAt: clipped.blockedAt ?? null,
    lastValid: clipped.lastValid,
    reachable: clipped.valid !== false && (!budget || energy <= budget),
    movementModel: segmentCost.movementModel,
    sampledCells: clipped.traversedCells ?? [],
    sampledPoints: segmentCost.sampledPoints,
    notes
  };
}

function isFinitePoint(point) {
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y));
}
