export const BEACHING_RISK_NONE = {
  level: 'none',
  value: 0,
  shoreDistance: Infinity,
  currentTowardLand: 0,
  currentMagnitude: 0,
  costPenalty: 0,
  energyMultiplier: 1,
  nearestLand: null,
  directionToLand: null,
  message: ''
};

export function estimateBeachingRiskAtCell({ level = null, frame = null, x, y, maxDistance = 2 } = {}) {
  const cx = Math.round(Number(x));
  const cy = Math.round(Number(y));
  if (!isInsideLevel(level, cx, cy)) return { ...BEACHING_RISK_NONE, level: 'blocked', value: 1, message: 'outside map' };
  if (isLandCell(level, cx, cy)) return { ...BEACHING_RISK_NONE, level: 'blocked', value: 1, shoreDistance: 0, message: 'terrain' };

  const nearestLand = findNearestLand(level, cx, cy, maxDistance);
  if (!nearestLand) return { ...BEACHING_RISK_NONE };

  const directionToLand = normalize(nearestLand.x - cx, nearestLand.y - cy);
  const current = sampleCurrent(frame, level, cx, cy);
  const currentMagnitude = Math.hypot(current.u, current.v);
  const currentTowardLand = current.u * directionToLand.x + current.v * directionToLand.y;
  const close = nearestLand.distance <= 1.01;
  const near = nearestLand.distance <= 2.01;
  const toward = currentTowardLand > 0.08;
  const strongToward = currentTowardLand > 0.16;
  const strongCurrent = currentMagnitude > 0.55;

  let levelName = 'none';
  let value = 0;
  if (close && (strongToward || (toward && strongCurrent))) {
    levelName = 'high';
    value = 0.85;
  } else if ((close && toward) || (near && strongToward) || (close && strongCurrent && currentTowardLand > 0.03)) {
    levelName = 'medium';
    value = 0.55;
  } else if (near && toward) {
    levelName = 'low';
    value = 0.25;
  } else if (close) {
    levelName = 'low';
    value = currentTowardLand < -0.08 ? 0.08 : 0.14;
  }

  return {
    level: levelName,
    value,
    shoreDistance: nearestLand.distance,
    currentTowardLand,
    currentMagnitude,
    costPenalty: value * 3,
    energyMultiplier: 1 + value * 0.18,
    nearestLand: { x: nearestLand.x, y: nearestLand.y },
    directionToLand,
    current: { u: current.u, v: current.v },
    message: value > 0
      ? `Shoreline current may beach near (${cx}, ${cy})`
      : ''
  };
}

export function estimateSegmentBeachingRisk({ level = null, frame = null, start = null, end = null } = {}) {
  if (!isFinitePoint(start) || !isFinitePoint(end)) return { ...BEACHING_RISK_NONE, samples: [] };
  const distance = Math.max(1, Math.hypot(Number(end.x) - Number(start.x), Number(end.y) - Number(start.y)));
  const steps = Math.max(1, Math.ceil(distance * 3));
  const samples = [];
  let worst = { ...BEACHING_RISK_NONE };
  for (let index = 0; index <= steps; index += 1) {
    const ratio = index / steps;
    const x = Number(start.x) + (Number(end.x) - Number(start.x)) * ratio;
    const y = Number(start.y) + (Number(end.y) - Number(start.y)) * ratio;
    const risk = estimateBeachingRiskAtCell({ level, frame, x, y });
    samples.push({ x: Math.round(x), y: Math.round(y), ...risk });
    if (risk.value > worst.value) worst = { x: Math.round(x), y: Math.round(y), ...risk };
  }
  return {
    ...worst,
    samples,
    warning: worst.value >= 0.5,
    message: worst.value >= 0.5
      ? `${worst.level === 'high' ? 'High' : 'Moderate'} shoreline current risk near (${worst.x}, ${worst.y}); route may beach if drift increases.`
      : worst.message
  };
}

export function isBeachingRisk(risk) {
  return Number(risk?.value ?? 0) >= 0.5;
}

function findNearestLand(level, x, y, maxDistance) {
  let best = null;
  const radius = Math.max(1, Math.ceil(Number(maxDistance) || 2));
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const tx = x + dx;
      const ty = y + dy;
      if (!isInsideLevel(level, tx, ty) || !isLandCell(level, tx, ty)) continue;
      const distance = Math.hypot(dx, dy);
      if (distance > maxDistance) continue;
      if (!best || distance < best.distance) best = { x: tx, y: ty, distance };
    }
  }
  return best;
}

function sampleCurrent(frame, level, x, y) {
  const grid = level?.world?.grid ?? {};
  const cx = clampIndex(x, Number(grid.width ?? 1));
  const cy = clampIndex(y, Number(grid.height ?? 1));
  const vector = frame?.current?.[cy]?.[cx] ?? [0, 0];
  return {
    u: finiteNumber(vector[0], 0),
    v: finiteNumber(vector[1], 0)
  };
}

function isLandCell(level, x, y) {
  return Boolean(level?.layers?.terrain?.[y]?.[x]);
}

function isInsideLevel(level, x, y) {
  const grid = level?.world?.grid ?? {};
  return x >= 0 && y >= 0 && x < Number(grid.width ?? 0) && y < Number(grid.height ?? 0);
}

function normalize(x, y) {
  const length = Math.hypot(Number(x), Number(y));
  if (!Number.isFinite(length) || length <= 1e-9) return { x: 0, y: 0 };
  return { x: Number(x) / length, y: Number(y) / length };
}

function finiteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clampIndex(value, max) {
  return Math.max(0, Math.min(Math.max(0, Number(max) - 1), Math.round(Number(value) || 0)));
}

function isFinitePoint(point) {
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y));
}
