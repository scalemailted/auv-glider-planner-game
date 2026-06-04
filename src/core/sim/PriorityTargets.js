export const DEFAULT_PRIORITY_TARGET_RULES = {
  enabled: true,
  captureMode: 'once',
  showFutureTargets: false,
  showActiveOnly: true
};

export function normalizePriorityTargetRules(missionOrRules = {}) {
  const rules = missionOrRules.rules ?? missionOrRules;
  const input = rules?.priorityTargets ?? {};
  return {
    ...DEFAULT_PRIORITY_TARGET_RULES,
    ...input,
    enabled: input.enabled !== false,
    captureMode: input.captureMode ?? DEFAULT_PRIORITY_TARGET_RULES.captureMode,
    showFutureTargets: Boolean(input.showFutureTargets ?? DEFAULT_PRIORITY_TARGET_RULES.showFutureTargets),
    showActiveOnly: input.showActiveOnly !== false
  };
}

export function normalizePriorityTargets(level) {
  const targets = level?.layers?.priorityTargets ?? level?.layers?.temporalObjectives ?? level?.layers?.goldStarTargets ?? [];
  return targets
    .map((target, index) => normalizePriorityTarget(target, index))
    .filter(Boolean);
}

export function getActivePriorityTargets(level, t) {
  return normalizePriorityTargets(level)
    .map((target) => ({ ...target, position: getPriorityTargetPosition(target, t) }))
    .filter((target) => target.position?.active && isFinitePoint(target.position));
}

export function getPriorityTargetPosition(target, t) {
  const time = Number(t ?? 0);
  const frames = normalizeTargetFrames(target);
  if (!frames.length) return null;
  let previous = null;
  let next = null;
  for (const frame of frames) {
    if (Number(frame.t) <= time) previous = frame;
    if (Number(frame.t) > time) {
      next = frame;
      break;
    }
  }
  if (!previous) return { t: time, active: false };
  const base = previous;
  if (!base?.active) return { ...base, active: false };
  if (!isFinitePoint(base)) return { ...base, active: false };
  if (next?.active && isFinitePoint(base) && isFinitePoint(next) && Number(next.t) !== Number(base.t)) {
    const ratio = clamp01((time - Number(base.t)) / (Number(next.t) - Number(base.t)));
    return {
      t: time,
      x: lerp(Number(base.x), Number(next.x), ratio),
      y: lerp(Number(base.y), Number(next.y), ratio),
      active: true
    };
  }
  return { ...base, t: time, active: true };
}

export function isPriorityTargetActive(target, t) {
  return Boolean(getPriorityTargetPosition(target, t)?.active);
}

export function checkPriorityTargetCapture(agent, level, missionState, t) {
  const rules = missionState.priorityTargetRules ?? DEFAULT_PRIORITY_TARGET_RULES;
  if (rules.enabled === false) return [];
  const events = [];
  const multiplier = Number(missionState.priorityTargetValueMultiplier ?? 1);
  const allowShared = Boolean(missionState.allowSharedPriorityCapture);
  for (const target of getActivePriorityTargets(level, t)) {
    const position = target.position;
    const radius = Math.max(0.05, Number(target.radius ?? 0.75));
    const distance = Math.hypot(Number(agent.x) - Number(position.x), Number(agent.y) - Number(position.y));
    if (distance > radius) continue;
    const targetId = target.id;
    const captured = missionState.capturedPriorityTargets?.has(targetId);
    const agentCaptureKey = `${agent.id}:${targetId}`;
    if (captured && !allowShared) {
      if (!missionState.priorityTargetDuplicateAttempts?.has(agentCaptureKey)) {
        missionState.priorityTargetDuplicateAttempts?.add(agentCaptureKey);
        incrementPriorityMetric(missionState, 'duplicates');
        events.push({
          type: 'priorityTargetDuplicate',
          t,
          agentId: agent.id,
          targetId
        });
      }
      continue;
    }
    const value = round(Number(target.value ?? 0) * multiplier, 3);
    missionState.capturedPriorityTargets?.add(targetId);
    missionState.priorityTargetCaptures?.push({
      targetId,
      agentId: agent.id,
      t,
      x: round(position.x, 3),
      y: round(position.y, 3),
      value
    });
    incrementPriorityMetric(missionState, 'captured');
    missionState.priorityTargetScore = round(Number(missionState.priorityTargetScore ?? 0) + value, 3);
    events.push({
      type: 'priorityTargetCaptured',
      t,
      agentId: agent.id,
      targetId,
      label: target.label,
      x: round(position.x, 3),
      y: round(position.y, 3),
      value
    });
  }
  return events;
}

export function summarizePriorityTargets(level, missionState = {}) {
  const targets = normalizePriorityTargets(level);
  const capturedIds = [...(missionState.capturedPriorityTargets ?? new Set())];
  const captured = capturedIds.length;
  const available = targets.filter((target) => normalizeTargetFrames(target).some((frame) => frame.active)).length;
  return {
    available,
    captured,
    missed: Math.max(0, available - captured),
    score: round(Number(missionState.priorityTargetScore ?? 0), 3),
    capturedIds,
    captures: [...(missionState.priorityTargetCaptures ?? [])],
    duplicates: Number(missionState.priorityTargetMetrics?.duplicates ?? 0)
  };
}

function normalizePriorityTarget(target, index) {
  if (!target) return null;
  const frames = normalizeTargetFrames(target);
  if (!frames.length) return null;
  return {
    ...target,
    id: target.id ?? `priority_target_${index + 1}`,
    label: target.label ?? 'Priority Sample',
    value: Number.isFinite(Number(target.value)) ? Number(target.value) : 200,
    radius: Number.isFinite(Number(target.radius)) ? Number(target.radius) : 0.75,
    captureMode: target.captureMode ?? 'once',
    frames
  };
}

function normalizeTargetFrames(target) {
  const rawFrames = Array.isArray(target?.frames) && target.frames.length
    ? target.frames
    : intervalFrames(target);
  return rawFrames
    .map((frame) => normalizeTargetFrame(frame, target))
    .filter((frame) => Number.isFinite(frame.t) && (frame.active === false || isFinitePoint(frame)))
    .sort((a, b) => a.t - b.t);
}

function normalizeTargetFrame(frame, target) {
  const active = frame.active !== false;
  const x = Number(frame.x ?? target.x);
  const y = Number(frame.y ?? target.y);
  const normalized = {
    t: Number(frame.t ?? 0),
    active
  };
  if (Number.isFinite(x)) normalized.x = x;
  if (Number.isFinite(y)) normalized.y = y;
  return normalized;
}

function intervalFrames(target) {
  if (!isFinitePoint(target)) return [];
  const startTime = Number(target.startTime ?? target.t ?? 0);
  const endTime = Number(target.endTime ?? startTime + 1);
  if (!Number.isFinite(startTime)) return [];
  const frames = [{ t: startTime, x: Number(target.x), y: Number(target.y), active: true }];
  if (Number.isFinite(endTime) && endTime > startTime) frames.push({ t: endTime, active: false });
  return frames;
}

function incrementPriorityMetric(missionState, key) {
  missionState.priorityTargetMetrics ??= {};
  missionState.priorityTargetMetrics[key] = Number(missionState.priorityTargetMetrics[key] ?? 0) + 1;
}

function isFinitePoint(point) {
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function round(value, digits = 3) {
  return Number(Number(value).toFixed(digits));
}
