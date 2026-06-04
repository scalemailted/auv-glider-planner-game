import { seededUnit } from '../random/SeededRng.js';
import { normalizeSamplingRules } from './MissionRules.js';

export function updateSampling(agent, world, missionState, t) {
  const sample = findBestSampleCell(agent, world, missionState, t);
  if (!sample || sample.expectedValue < (missionState.roiThreshold ?? 0.15)) return null;

  const key = `${sample.x},${sample.y}`;
  const rules = missionState.samplingRules ?? normalizeSamplingRules(missionState);
  const window = getMissionWindow(missionState, t);
  const history = missionState.sampleHistory?.get(key) ?? null;
  const outcome = classifySamplingOutcome({ key, sample, history, rules, window, missionState });

  if (outcome.blocked) {
    const duplicateKey = `${agent.id}:${key}:${outcome.reason}`;
    if (missionState.duplicateSamples?.has(duplicateKey)) return null;
    missionState.duplicateSamples?.add(duplicateKey);
    incrementMetric(missionState, 'duplicateSamples');
    if (outcome.reason === 'cooldown') incrementMetric(missionState, 'cooldownSuppressedSamples');
    return {
      type: 'duplicateSample',
      t,
      agentId: agent.id,
      x: sample.x,
      y: sample.y,
      samplingMode: rules.mode,
      reason: outcome.reason,
      valueMultiplier: outcome.multiplier,
      window
    };
  }

  const sampleWindowKey = `${agent.id}:${key}:${window}`;
  if (outcome.windowLimited && missionState.sampleWindows?.has(sampleWindowKey)) return null;

  missionState.sampled.add(key);
  missionState.sampleHistory?.set(key, {
    count: (history?.count ?? 0) + 1,
    lastT: t,
    lastWindow: window
  });
  missionState.sampleWindows?.add(sampleWindowKey);
  if (outcome.duplicate) incrementMetric(missionState, 'duplicateSamples');
  if (outcome.depleted) incrementMetric(missionState, 'depletedSamples');
  if (outcome.cooldownActive) incrementMetric(missionState, 'cooldownSuppressedSamples');
  if (rules.mode === 'persistent') incrementMetric(missionState, 'persistentSamples');

  const realizedValue = sample.realizedValue * outcome.multiplier;
  const expectedValue = sample.expectedValue * outcome.multiplier;
  agent.sampleScore += realizedValue;
  agent.expectedSampleScore = (agent.expectedSampleScore ?? 0) + expectedValue;

  return {
    type: 'sample',
    t,
    agentId: agent.id,
    x: sample.x,
    y: sample.y,
    value: realizedValue,
    expectedValue,
    baseValue: sample.realizedValue,
    baseExpectedValue: sample.expectedValue,
    rewardValue: sample.value,
    probability: sample.probability,
    manifested: sample.manifested,
    roiScoringMode: missionState.roiScoringMode ?? 'expectedValue',
    rngSeed: missionState.rngSeed ?? null,
    outcomeRoll: sample.outcomeRoll,
    samplingMode: rules.mode,
    duplicate: outcome.duplicate,
    depleted: outcome.depleted,
    cooldownActive: outcome.cooldownActive,
    valueMultiplier: outcome.multiplier,
    window
  };
}

function classifySamplingOutcome({ key, sample, history, rules, window, missionState }) {
  const duplicate = Boolean(history);
  if (rules.mode === 'persistent') {
    const multiplier = duplicate ? rules.persistentWindowMultiplier : 1;
    return { multiplier, duplicate, depleted: false, cooldownActive: false, blocked: multiplier <= 0, reason: 'persistent', windowLimited: true };
  }

  if (rules.mode === 'cooldown') {
    const cooldownActive = duplicate && rules.cooldownWindows > 0 && window - Number(history.lastWindow ?? -Infinity) < rules.cooldownWindows;
    const multiplier = cooldownActive ? rules.duplicateValueMultiplier : 1;
    return {
      multiplier,
      duplicate,
      depleted: false,
      cooldownActive,
      blocked: cooldownActive && multiplier <= 0,
      reason: cooldownActive ? 'cooldown' : 'sample',
      windowLimited: true
    };
  }

  if (rules.mode === 'diminishing') {
    const locallyDepleted = hasLocalDepletion(key, sample, missionState, rules);
    const multiplier = locallyDepleted ? rules.depletionFactor : 1;
    return {
      multiplier,
      duplicate: duplicate || locallyDepleted,
      depleted: locallyDepleted,
      cooldownActive: false,
      blocked: locallyDepleted && multiplier <= 0,
      reason: locallyDepleted ? 'depleted' : 'sample',
      windowLimited: true
    };
  }

  const multiplier = duplicate ? rules.duplicateValueMultiplier : 1;
  return {
    multiplier,
    duplicate,
    depleted: false,
    cooldownActive: false,
    blocked: duplicate && multiplier <= 0,
    reason: duplicate ? 'duplicate' : 'sample',
    windowLimited: true
  };
}

function hasLocalDepletion(key, sample, missionState, rules) {
  if (!missionState.sampled?.size) return false;
  const radius = Number(rules.localDepletionRadius ?? 0);
  if (radius <= 0) return missionState.sampled.has(key);
  for (const sampledKey of missionState.sampled) {
    const [x, y] = sampledKey.split(',').map(Number);
    if (Math.hypot(sample.x - x, sample.y - y) <= radius) return true;
  }
  return false;
}

function getMissionWindow(missionState, t) {
  const planningWindow = Number(missionState.planningWindow ?? 1);
  if (!Number.isFinite(planningWindow) || planningWindow <= 0) return 0;
  return Math.max(0, Math.floor(Number(t ?? 0) / planningWindow));
}

function incrementMetric(missionState, key) {
  missionState.samplingMetrics ??= {};
  missionState.samplingMetrics[key] = (missionState.samplingMetrics[key] ?? 0) + 1;
}

function findBestSampleCell(agent, world, missionState, t) {
  const radius = missionState.samplingRadius ?? agent.samplingRadius ?? 0.75;
  const minX = Math.max(0, Math.floor(agent.x - radius));
  const maxX = Math.min(world.grid.width - 1, Math.ceil(agent.x + radius));
  const minY = Math.max(0, Math.floor(agent.y - radius));
  const maxY = Math.min(world.grid.height - 1, Math.ceil(agent.y + radius));
  let best = null;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dist = Math.hypot(agent.x - x, agent.y - y);
      if (dist > radius) continue;
      const roi = world.sampleROIObject?.(x, y, t) ?? { value: world.sampleROI(x, y, t), probability: 1, expectedValue: world.sampleROI(x, y, t) };
      const outcome = resolveROIOutcome(roi, x, y, missionState);
      if (!best || roi.expectedValue > best.expectedValue) best = { x, y, ...roi, ...outcome };
    }
  }

  return best;
}

function resolveROIOutcome(roi, x, y, missionState) {
  const mode = missionState.roiScoringMode ?? 'expectedValue';
  if (mode !== 'realizedStochastic') {
    return {
      realizedValue: roi.expectedValue,
      manifested: true,
      outcomeRoll: null
    };
  }

  const key = `${x},${y}`;
  if (!missionState.roiOutcomes) missionState.roiOutcomes = new Map();
  if (!missionState.roiOutcomes.has(key)) {
    const roll = seededUnit(`${missionState.rngSeed ?? 'anchor'}:${key}`);
    const manifested = roll <= Number(roi.probability ?? 1);
    missionState.roiOutcomes.set(key, {
      manifested,
      outcomeRoll: Number(roll.toFixed(6)),
      realizedValue: manifested ? Number(roi.value ?? 0) : 0
    });
  }
  return missionState.roiOutcomes.get(key);
}
