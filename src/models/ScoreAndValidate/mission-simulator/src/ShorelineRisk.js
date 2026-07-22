 const BEACHING_RISK_NONE = {
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

 function estimateBeachingRiskAtCell({ level = null, frame = null, x, y, maxDistance = 2 } = {}) {
  const cx = Math.round(Number(x));
  const cy = Math.round(Number(y));
  if (!isInsideLevel(level, cx, cy)) return { ...BEACHING_RISK_NONE, level: 'blocked', value: 1, message: 'outside map' };
  if (isLandCell(level, cx, cy)) return { ...BEACHING_RISK_NONE, level: 'blocked', value: 1, shoreDistance: 0, message: 'terrain' };

  const nearestLand = findNearestLand(level, cx, cy, maxDistance);
  if (!nearestLand) return { ...BEACHING_RISK_NONE };

  const directionToLand = normalize(nearestLand.x - cx, nearestLand.y - cy);
  const current = sampleCurrent(frame, cx, cy);
  const samplerRisk = current.contributors?.shorelineRisk ?? null;
  const currentMagnitude = Number(samplerRisk?.currentMagnitude ?? Math.hypot(current.u, current.v));
  const currentTowardLand = Number(samplerRisk?.currentTowardLand ?? (current.u * directionToLand.x + current.v * directionToLand.y));
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

  const samplerValue = Number(samplerRisk?.value ?? 0);
  if (samplerValue > value) {
    value = samplerValue;
    levelName = samplerRisk?.level ?? levelName;
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
    topologyAdjustment: current.contributors?.topologyAdjustment ?? null,
    message: value > 0 ? `Shoreline current may beach near (${cx}, ${cy})` : ''
  };
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

function sampleCurrent(frame, x, y) {
  const vector = frame?.current?.[Math.round(Number(y))]?.[Math.round(Number(x))] ?? [0, 0];
  const u = Number(Array.isArray(vector) ? vector[0] : vector.u ?? 0);
  const v = Number(Array.isArray(vector) ? vector[1] : vector.v ?? 0);
  return {
    u: Number.isFinite(u) ? u : 0,
    v: Number.isFinite(v) ? v : 0,
    contributors: Array.isArray(vector) ? null : vector.contributors ?? null
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

module.exports = {BEACHING_RISK_NONE, estimateBeachingRiskAtCell}