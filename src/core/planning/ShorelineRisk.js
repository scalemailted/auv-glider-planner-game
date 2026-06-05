import { sampleCurrentField } from '../currents/CurrentFieldSampler.js';

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

export function estimateStochasticCurrentRiskAtCell({
  level = null,
  frame = null,
  x,
  y,
  stochasticMode = false,
  shoreRiskRadius = 2
} = {}) {
  if (!stochasticMode) return { value: 0, blocking: false, warning: false, reasons: [], message: '' };
  const beaching = estimateBeachingRiskAtCell({ level, frame, x, y, maxDistance: shoreRiskRadius });
  if (!Number.isFinite(beaching.shoreDistance)) {
    return {
      value: currentConfidence(frame, level, x, y).known ? 0 : 0.18,
      blocking: false,
      warning: !currentConfidence(frame, level, x, y).known,
      reasons: currentConfidence(frame, level, x, y).known ? [] : ['unknown current in open water'],
      forecastConfidence: currentConfidence(frame, level, x, y).value,
      shoreDistance: Infinity,
      currentTowardLand: 0,
      currentKnown: currentConfidence(frame, level, x, y).known,
      message: currentConfidence(frame, level, x, y).known ? '' : 'Unknown current increases open-water uncertainty.'
    };
  }
  const confidence = currentConfidence(frame, level, x, y);
  const lowConfidence = !confidence.known || confidence.value < 0.55;
  const mediumConfidence = confidence.known && confidence.value < 0.72;
  const close = beaching.shoreDistance <= 1.15;
  const near = beaching.shoreDistance <= shoreRiskRadius;
  const toward = Number(beaching.currentTowardLand ?? 0) > 0.08;
  const strongToward = Number(beaching.currentTowardLand ?? 0) > 0.16;
  const reasons = [];
  let value = Number(beaching.value ?? 0);
  if (near && lowConfidence) {
    value = Math.max(value, close ? 0.92 : 0.76);
    reasons.push('low-confidence current near land');
  } else if (near && mediumConfidence) {
    value = Math.max(value, close ? 0.68 : 0.46);
    reasons.push('uncertain current near land');
  }
  if (near && toward) {
    value = Math.max(value, strongToward ? 0.88 : 0.62);
    reasons.push('forecast current toward land');
  }
  const blocking = close && (lowConfidence || strongToward);
  const warning = blocking || value >= 0.5;
  return {
    value: clamp01(value),
    blocking,
    warning,
    reasons,
    forecastConfidence: confidence.value,
    shoreDistance: beaching.shoreDistance,
    currentTowardLand: beaching.currentTowardLand,
    currentMagnitude: beaching.currentMagnitude,
    currentKnown: confidence.known,
    nearestLand: beaching.nearestLand,
    directionToLand: beaching.directionToLand,
    message: reasons.length
      ? `${reasons.join('; ')}; adverse drift could beach the glider.`
      : beaching.message
  };
}

export function estimateStochasticSegmentCurrentRisk({
  level = null,
  frame = null,
  start = null,
  end = null,
  stochasticMode = false
} = {}) {
  if (!stochasticMode || !isFinitePoint(start) || !isFinitePoint(end)) {
    return { value: 0, blocking: false, warning: false, samples: [], reasons: [], message: '' };
  }
  const distance = Math.max(1, Math.hypot(Number(end.x) - Number(start.x), Number(end.y) - Number(start.y)));
  const steps = Math.max(1, Math.ceil(distance * 3));
  const samples = [];
  let worst = { value: 0, blocking: false, warning: false, reasons: [] };
  for (let index = 0; index <= steps; index += 1) {
    const ratio = index / steps;
    const x = Number(start.x) + (Number(end.x) - Number(start.x)) * ratio;
    const y = Number(start.y) + (Number(end.y) - Number(start.y)) * ratio;
    const risk = estimateStochasticCurrentRiskAtCell({ level, frame, x, y, stochasticMode });
    const sample = { x: Math.round(x), y: Math.round(y), ...risk };
    samples.push(sample);
    if (risk.value > Number(worst.value ?? 0) || (risk.blocking && !worst.blocking)) worst = sample;
  }
  return {
    ...worst,
    samples,
    warning: Boolean(worst.warning || worst.blocking || Number(worst.value ?? 0) >= 0.5),
    message: worst.message ?? ''
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

function sampleCurrent(frame, level, x, y) {
  return sampleCurrentField({ frame, level, x, y });
}

function currentConfidence(frame, level, x, y) {
  const grid = level?.world?.grid ?? {};
  const cx = clampIndex(x, Number(grid.width ?? 1));
  const cy = clampIndex(y, Number(grid.height ?? 1));
  const value = frame?.confidence?.[cy]?.[cx] ?? frame?.forecastConfidence;
  const numeric = Number(value);
  return {
    known: Number.isFinite(numeric),
    value: Number.isFinite(numeric) ? Math.max(0, Math.min(1, numeric)) : 0
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

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function clampIndex(value, max) {
  return Math.max(0, Math.min(Math.max(0, Number(max) - 1), Math.round(Number(value) || 0)));
}

function isFinitePoint(point) {
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y));
}
