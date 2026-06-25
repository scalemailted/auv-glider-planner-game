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
