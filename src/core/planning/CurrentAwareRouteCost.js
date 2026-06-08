import { sampleCurrentField } from '../currents/CurrentFieldSampler.js';
import { getFrameAtTime } from '../time/MissionTime.js';

export function estimateCurrentAwareSegment({
  start,
  end,
  level,
  agent = null,
  frame = null,
  mission = null,
  startTime = null,
  driftGain = 0.5,
  energyPerCell = 1,
  samples = null
} = {}) {
  const dx = Number(end?.x) - Number(start?.x);
  const dy = Number(end?.y) - Number(start?.y);
  const distance = Math.hypot(dx, dy);
  const direction = normalize(dx, dy);
  const perpendicular = { x: -direction.y, y: direction.x };
  const baseSpeed = Math.max(0.05, Number(agent?.maxSpeed ?? agent?.speed ?? mission?.physics?.speed ?? 1));
  const gain = finiteNumber(driftGain, 0.5);
  const stepCount = Math.max(1, Math.min(12, Math.round(Number(samples ?? Math.max(4, Math.ceil(distance * 1.5))))));
  const stepDistance = distance / stepCount;
  const initialTime = Number.isFinite(Number(startTime)) ? Number(startTime) : Number(frame?.t ?? 0);
  let elapsed = 0;
  let energy = 0;
  let assistSum = 0;
  let crossSum = 0;
  let magnitudeSum = 0;
  let effectiveSpeedSum = 0;
  let shorelineRiskValue = 0;
  let shorelineRisk = null;
  let depthPenaltySum = 0;
  let minEffectiveSpeed = Infinity;
  let maxEffectiveSpeed = 0;
  const sampled = [];

  if (distance <= 1e-9) {
    return emptySegmentCost({ frame, startTime: initialTime, baseSpeed });
  }

  for (let index = 0; index < stepCount; index += 1) {
    const ratio = (index + 0.5) / stepCount;
    const x = Number(start.x) + dx * ratio;
    const y = Number(start.y) + dy * ratio;
    const sampleTime = initialTime + elapsed;
    const sampleFrame = frameForTime(level, frame, sampleTime);
    const current = sampleCurrentField({ frame: sampleFrame, level, x, y, time: sampleTime });
    const along = current.u * direction.x + current.v * direction.y;
    const cross = current.u * perpendicular.x + current.v * perpendicular.y;
    const speed = clamp(baseSpeed + gain * along, baseSpeed * 0.18, baseSpeed * 1.85);
    const stepTime = stepDistance / speed;
    const depthPenalty = sampleDepthPenalty(level, x, y);
    const risk = current.contributors?.shorelineRisk ?? null;
    const riskValue = Number(risk?.value ?? 0);
    const multiplier = currentEnergyMultiplier({
      alongTrackCurrent: along,
      crossTrackCurrent: cross,
      currentMagnitude: current.magnitude,
      driftGain: gain,
      shorelineRisk: riskValue,
      depthPenalty
    });
    const stepEnergy = stepDistance * finiteNumber(energyPerCell, 1) * multiplier;
    elapsed += stepTime;
    energy += stepEnergy;
    assistSum += along;
    crossSum += cross;
    magnitudeSum += current.magnitude;
    effectiveSpeedSum += speed;
    depthPenaltySum += depthPenalty;
    minEffectiveSpeed = Math.min(minEffectiveSpeed, speed);
    maxEffectiveSpeed = Math.max(maxEffectiveSpeed, speed);
    if (riskValue > shorelineRiskValue) {
      shorelineRiskValue = riskValue;
      shorelineRisk = risk;
    }
    sampled.push({
      x,
      y,
      t: sampleTime,
      current: { u: current.u, v: current.v, magnitude: current.magnitude },
      alongTrackCurrent: along,
      crossTrackCurrent: cross,
      speedOverGround: speed,
      energyMultiplier: multiplier,
      shorelineRisk: risk
    });
  }

  const currentAssist = assistSum / stepCount;
  const crossCurrent = crossSum / stepCount;
  const currentMagnitude = magnitudeSum / stepCount;
  const effectiveSpeed = effectiveSpeedSum / stepCount;
  const baseEnergy = distance * finiteNumber(energyPerCell, 1);
  const energyModifier = baseEnergy > 0 ? energy / baseEnergy : 1;
  const result = {
    distance,
    pathDistance: distance,
    eta: elapsed,
    estimatedTravelTime: elapsed,
    energy,
    baseEnergy,
    energyModifier,
    currentAssist,
    alongTrackCurrent: currentAssist,
    crossCurrent,
    crossTrackCurrent: crossCurrent,
    currentMagnitude,
    currentVector: averageVector(sampled),
    effectiveSpeed,
    speedOverGround: effectiveSpeed,
    minEffectiveSpeed,
    maxEffectiveSpeed,
    baseSpeed,
    driftGain: gain,
    depthPenalty: depthPenaltySum / stepCount,
    shorelineRisk,
    beachingRisk: shorelineRisk,
    currentLabel: currentAlignmentLabel(currentAssist, crossCurrent, baseSpeed),
    movementModel: 'current-aware-segment-integration',
    sampledPoints: sampled
  };
  debugCurrentAwareRouteCost({ start, end, missionTime: initialTime, desiredDirection: direction, ...result });
  return result;
}

export function currentEnergyMultiplier({
  alongTrackCurrent = 0,
  crossTrackCurrent = 0,
  currentMagnitude = 0,
  driftGain = 0.5,
  shorelineRisk = 0,
  depthPenalty = 0
} = {}) {
  const gain = finiteNumber(driftGain, 0.5);
  const opposition = Math.max(0, -Number(alongTrackCurrent));
  const assist = Math.max(0, Number(alongTrackCurrent));
  const cross = Math.abs(Number(crossTrackCurrent));
  const magnitude = Math.max(0, Number(currentMagnitude));
  return clamp(
    1
      + opposition * gain * 0.72
      + cross * gain * 0.28
      + Math.max(0, Number(shorelineRisk)) * 0.22
      + Math.max(0, Number(depthPenalty))
      - assist * gain * 0.38 * Math.min(1.2, 0.5 + magnitude),
    0.45,
    2.6
  );
}

export function computeHeadingCurrentComponents(currentVector = {}, direction = {}) {
  const current = Array.isArray(currentVector)
    ? { u: Number(currentVector[0] ?? 0), v: Number(currentVector[1] ?? 0) }
    : { u: Number(currentVector.u ?? currentVector.x ?? 0), v: Number(currentVector.v ?? currentVector.y ?? 0) };
  const unit = normalize(direction.x, direction.y);
  const perpendicular = { x: -unit.y, y: unit.x };
  return {
    desiredDirection: unit,
    currentVector: current,
    currentMagnitude: Math.hypot(current.u, current.v),
    alongTrackCurrent: current.u * unit.x + current.v * unit.y,
    crossTrackCurrent: current.u * perpendicular.x + current.v * perpendicular.y
  };
}

export function currentAlignmentLabel(currentAssist, crossCurrent, baseSpeed = 1) {
  const speed = Math.max(0.05, Number(baseSpeed) || 1);
  if (currentAssist > speed * 0.1 && Math.abs(crossCurrent) < speed * 0.18) return 'current assisted';
  if (currentAssist < -speed * 0.1) return 'against current';
  if (Math.abs(crossCurrent) > speed * 0.14) return 'cross-current risk';
  return 'current neutral';
}

function frameForTime(level, frame, time) {
  if (!level || !frame) return frame;
  const source = frame.source === 'forecast' ? level.layers?.forecast?.frames : level.layers?.truth?.frames;
  const frames = source?.length ? source : level.layers?.truth?.frames;
  return getFrameAtTime(frames ?? [], time, level.world?.time?.dt ?? 1) ?? frame;
}

function sampleDepthPenalty(level, x, y) {
  const width = level?.world?.grid?.width ?? 1;
  const height = level?.world?.grid?.height ?? 1;
  const depth = level?.layers?.depth?.[clampIndex(y, height)]?.[clampIndex(x, width)];
  if (depth === undefined) return 0;
  return Number(depth) < 0.32 ? 0.22 : 0;
}

function averageVector(samples = []) {
  if (!samples.length) return { u: 0, v: 0 };
  return {
    u: samples.reduce((sum, sample) => sum + Number(sample.current?.u ?? 0), 0) / samples.length,
    v: samples.reduce((sum, sample) => sum + Number(sample.current?.v ?? 0), 0) / samples.length
  };
}

function emptySegmentCost({ frame = null, startTime = 0, baseSpeed = 1 } = {}) {
  return {
    distance: 0,
    pathDistance: 0,
    eta: 0,
    estimatedTravelTime: 0,
    energy: 0,
    baseEnergy: 0,
    energyModifier: 1,
    currentAssist: 0,
    alongTrackCurrent: 0,
    crossCurrent: 0,
    crossTrackCurrent: 0,
    currentMagnitude: 0,
    currentVector: { u: 0, v: 0 },
    effectiveSpeed: baseSpeed,
    speedOverGround: baseSpeed,
    minEffectiveSpeed: baseSpeed,
    maxEffectiveSpeed: baseSpeed,
    baseSpeed,
    driftGain: 0,
    depthPenalty: 0,
    shorelineRisk: null,
    beachingRisk: null,
    currentLabel: 'current neutral',
    movementModel: 'current-aware-segment-integration',
    sampledPoints: [],
    frameTime: frame?.t ?? startTime
  };
}

function debugCurrentAwareRouteCost(details = {}) {
  if (!globalThis.ANCHOR_DEBUG_CURRENT_COST) return;
  globalThis.console?.debug?.('[CurrentAwareRouteCost]', details);
}

function normalize(x, y) {
  const length = Math.hypot(Number(x), Number(y));
  if (!Number.isFinite(length) || length <= 1e-9) return { x: 0, y: 0 };
  return { x: Number(x) / length, y: Number(y) / length };
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function clampIndex(value, max) {
  return Math.max(0, Math.min(max - 1, Math.floor(Number(value) || 0)));
}
