export function clipLineToTerrain(start, end, level, { stepsPerCell = 4 } = {}) {
  if (!isFinitePoint(start) || !isFinitePoint(end)) {
    return {
      valid: false,
      points: [],
      blockedAt: end ?? null,
      lastValid: start ?? { x: 0, y: 0 },
      reason: 'invalidPoint'
    };
  }
  const distance = Math.max(1, Math.hypot(end.x - start.x, end.y - start.y));
  const stepScale = Number.isFinite(Number(stepsPerCell)) && Number(stepsPerCell) > 0 ? Number(stepsPerCell) : 4;
  const maxSteps = Math.max(32, (level?.world?.grid?.width ?? 10) * (level?.world?.grid?.height ?? 10) * 2);
  const steps = Math.min(maxSteps, Math.max(1, Math.ceil(distance * stepScale)));
  const points = [];
  let lastValid = { x: start.x, y: start.y };

  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    const point = {
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t
    };
    const cell = { x: Math.round(point.x), y: Math.round(point.y) };
    if (!isWaterCell(level, cell.x, cell.y)) {
      return {
        valid: false,
        points,
        blockedAt: cell,
        lastValid
      };
    }
    lastValid = { x: point.x, y: point.y };
    points.push(point);
  }

  return { valid: true, points, blockedAt: null, lastValid };
}

export function estimateRouteEnergy(start, target, level, agent, frame, {
  driftGain = 0.5,
  energyPerCell = 1
} = {}) {
  const clipped = clipLineToTerrain(start, target, level);
  const endpoint = clipped.valid ? target : clipped.lastValid;
  const dx = endpoint.x - start.x;
  const dy = endpoint.y - start.y;
  const distance = Math.hypot(dx, dy);
  const direction = normalize(dx, dy);
  const current = sampleCurrent(frame, level, start.x, start.y);
  const currentAssist = current[0] * direction.x + current[1] * direction.y;
  const crossCurrent = current[0] * -direction.y + current[1] * direction.x;
  const alignmentPenalty = Math.max(-0.5, Math.min(0.9, -currentAssist * driftGain));
  const crossPenalty = Math.min(0.38, Math.abs(crossCurrent) * driftGain * 0.24);
  const depthPenalty = sampleDepthPenalty(level, endpoint.x, endpoint.y);
  const energy = Math.max(0, distance * energyPerCell * (1 + alignmentPenalty + crossPenalty + depthPenalty));
  const budget = Number(agent?.battery ?? 0);
  const notes = [];
  if (!clipped.valid) notes.push('Route blocked by land');
  if (currentAssist > 0.08) notes.push('Current assist: helpful');
  if (currentAssist < -0.08) notes.push('Against current: costly');
  if (Math.abs(crossCurrent) > 0.12) notes.push('Cross-current uncertainty');
  if (depthPenalty > 0) notes.push('Shallow/depth penalty');
  if (budget && energy > budget) notes.push('Energy exceeds battery');

  return {
    valid: clipped.valid,
    energy,
    distance,
    currentAssist,
    crossCurrent,
    energyModifier: 1 + alignmentPenalty + crossPenalty + depthPenalty,
    depthPenalty,
    blockedAt: clipped.blockedAt,
    lastValid: clipped.lastValid,
    reachable: !budget || energy <= budget,
    notes
  };
}

function isWaterCell(level, x, y) {
  const grid = level?.world?.grid ?? {};
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) return false;
  return !level?.layers?.terrain?.[y]?.[x];
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
