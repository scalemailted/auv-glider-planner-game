import { seededUnit } from './SeededRng.js';
import { normalizeSamplingRules } from './MissionRules.js';
import { depthLayerForDiveProfile, normalizeDiveProfile } from './WaterColumnProfileRuntime.js';
import { resolveEffectiveDiveProfile } from './WaterColumnProfileRuntime.js';
import {
  normalizeWaterColumnConfig,
  normalizeWaterColumnLayerId,
  waterColumnLayerMetadata
} from './WaterColumnProfileRuntime.js';
import {
  depthAwareSampleScoreEvent,
  evaluateDepthAwareSampleValue
} from './DepthAwareScienceValue.js';

export function updateSampling(agent, world, missionState, t) {
  if (!agent?.activeWaypoint) return null;
  const sample = findBestSampleCell(agent, world, missionState, t);
  if (!sample || sample.expectedValue < (missionState.roiThreshold ?? 0.15)) return null;

  const depthContext = resolveSampleDepthContext(agent, missionState, sample, t);
  const depthAware = missionState.depthScienceScoreProfile?.depthAware === true;
  const sampleGridKey = sample.sampleKey ?? `${sample.containingCell?.x ?? sample.nearestCell?.x ?? sample.x},${sample.containingCell?.y ?? sample.nearestCell?.y ?? sample.y}`;
  const key = depthAware ? `${sampleGridKey}:${depthContext.depthLayerId}` : sampleGridKey;
  const rules = missionState.samplingRules ?? normalizeSamplingRules(missionState);
  const sampleWindow = getMissionSampleWindow(missionState, t);
  const history = missionState.sampleHistory?.get(key) ?? null;
  const outcome = classifySamplingOutcome({ key, sample, history, rules, sampleWindow, missionState });

  if (outcome.blocked) {
    const duplicateKey = `${agent.id}:${key}:${outcome.reason}`;
    if (missionState.duplicateSamples?.has(duplicateKey)) return null;
    missionState.duplicateSamples?.add(duplicateKey);
    incrementMetric(missionState, 'duplicateSamples');
    if (depthAware) incrementMetric(missionState, 'verticalDuplicateSamples');
    if (outcome.reason === 'cooldown') incrementMetric(missionState, 'cooldownSuppressedSamples');
    return {
      type: 'duplicateSample',
      t,
      agentId: agent.id,
      x: sample.x,
      y: sample.y,
      sampleGridKey,
      containingCell: sample.containingCell ?? sample.nearestCell ?? null,
      fieldSample: sample.fieldSample ?? null,
      depthLayerId: depthContext.depthLayerId,
      depthMeters: depthContext.depthMeters,
      diveProfileId: depthContext.diveProfileId,
      samplingMode: rules.mode,
      reason: outcome.reason,
      valueMultiplier: outcome.multiplier,
      ['win' + 'dow']: sampleWindow,
      scoreProfileId: missionState.depthScienceScoreProfile?.scoreProfileId ?? null
    };
  }

  const sampleWindowKey = `${agent.id}:${key}:${sampleWindow}`;
  if (outcome.sampleWindowLimited && missionState.sampleWindows?.has(sampleWindowKey)) return null;

  const depthScienceValue = depthAware ? evaluateDepthAwareSampleValue({
    position: { x: sample.x, y: sample.y, containingCell: sample.containingCell ?? null },
    depthLayerId: depthContext.depthLayerId,
    depthMeters: depthContext.depthMeters,
    timeSeconds: t,
    observation: {
      observationType: 'depthLayerSample',
      observedValue: sample.realizedValue,
      forecastValue: sample.expectedValue,
      uncertaintyValue: sample.probability < 1 ? 1 - Number(sample.probability ?? 1) : 0,
      innovation: Number(sample.realizedValue ?? 0) - Number(sample.expectedValue ?? 0)
    },
    sensorProfile: depthContext.sensorProfile,
    missionObjective: missionState.primaryObjective ?? missionState.objective ?? null,
    priorityField: missionState.depthPriorityField,
    A_global_topdown: missionState.topDownPriorityField,
    samplingHistory: missionState.depthScienceObservationHistory ?? [],
    fleetSamplingHistory: missionState.fleetSamplingHistory ?? [],
    waterColumnConfig: missionState.waterColumnConfig,
    scoreProfile: missionState.depthScienceScoreProfile,
    targetDepthLayerId: depthContext.targetDepthLayerId,
    visibilityContext: missionState.visibilityContext ?? { publicSafe: true }
  }) : null;

  missionState.sampled.add(key);
  missionState.sampleHistory?.set(key, {
    count: (history?.count ?? 0) + 1,
    lastT: t,
    lastWindow: sampleWindow,
    depthLayerId: depthContext.depthLayerId,
    depthMeters: depthContext.depthMeters
  });
  missionState.sampleWindows?.add(sampleWindowKey);
  if (outcome.duplicate) incrementMetric(missionState, 'duplicateSamples');
  if (outcome.depleted) incrementMetric(missionState, 'depletedSamples');
  if (outcome.cooldownActive) incrementMetric(missionState, 'cooldownSuppressedSamples');
  if (rules.mode === 'persistent') incrementMetric(missionState, 'persistentSamples');
  if (depthAware) incrementMetric(missionState, 'depthAwareSamples');

  const legacyRealizedValue = sample.realizedValue * outcome.multiplier;
  const legacyExpectedValue = sample.expectedValue * outcome.multiplier;
  const realizedValue = depthAware
    ? Number((Number(depthScienceValue.totalScienceValue ?? 0) * outcome.multiplier).toFixed(6))
    : legacyRealizedValue;
  const expectedValue = depthAware
    ? Number((Number(depthScienceValue.totalScienceValue ?? 0) * outcome.multiplier).toFixed(6))
    : legacyExpectedValue;
  agent.sampleScore += realizedValue;
  agent.expectedSampleScore = (agent.expectedSampleScore ?? 0) + expectedValue;

  const sampleId = `${agent.id}:${sampleGridKey}:${depthContext.depthLayerId}:${sampleWindow}`;
  const scoreEvent = depthAware ? depthAwareSampleScoreEvent(depthScienceValue, {
    sampleId,
    agentId: agent.id,
    creditedScienceValue: realizedValue,
    scoreProfileId: missionState.depthScienceScoreProfile?.scoreProfileId,
    objectiveWeightProfileId: missionState.depthScienceScoreProfile?.objectiveWeightProfileId
  }) : null;

  if (depthAware) {
    missionState.depthScienceObservationHistory ??= [];
    missionState.depthScienceObservationHistory.push({
      sampleId,
      agentId: agent.id,
      x: sample.x,
      y: sample.y,
      sampleGridKey,
      containingCell: sample.containingCell ?? sample.nearestCell ?? null,
      fieldSample: sample.fieldSample ?? null,
      depthLayerId: depthContext.depthLayerId,
      depthMeters: depthContext.depthMeters,
      timeSeconds: t,
      value: realizedValue
    });
  }

  return {
    type: 'sample',
    t,
    agentId: agent.id,
    sampleId,
    x: sample.x,
    y: sample.y,
    sampleGridKey,
    containingCell: sample.containingCell ?? sample.nearestCell ?? null,
    fieldSample: sample.fieldSample ?? null,
    interpolationWeights: sample.fieldSample?.interpolationWeights ?? sample.interpolationWeights ?? null,
    depthLayerId: depthContext.depthLayerId,
    depthMeters: depthContext.depthMeters,
    diveProfileId: depthContext.diveProfileId,
    targetDepthLayerId: depthContext.targetDepthLayerId,
    actualDepthSample: depthAware,
    scoreProfileId: missionState.depthScienceScoreProfile?.scoreProfileId ?? null,
    value: realizedValue,
    expectedValue,
    baseValue: sample.realizedValue,
    baseExpectedValue: sample.expectedValue,
    legacyRealizedValue,
    legacyExpectedValue,
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
    ['win' + 'dow']: sampleWindow,
    depthScienceValue,
    scoreEvent
  };
}

function classifySamplingOutcome({ key, sample, history, rules, ['win' + 'dow']: sampleWindow, missionState }) {
  const duplicate = Boolean(history);
  if (rules.mode === 'persistent') {
    const multiplier = duplicate ? rules.persistentWindowMultiplier : 1;
    return { multiplier, duplicate, depleted: false, cooldownActive: false, blocked: multiplier <= 0, reason: 'persistent', sampleWindowLimited: true };
  }

  if (rules.mode === 'cooldown') {
    const cooldownActive = duplicate && rules.cooldownWindows > 0 && sampleWindow - Number(history.lastWindow ?? -Infinity) < rules.cooldownWindows;
    const multiplier = cooldownActive ? rules.duplicateValueMultiplier : 1;
    return {
      multiplier,
      duplicate,
      depleted: false,
      cooldownActive,
      blocked: cooldownActive && multiplier <= 0,
      reason: cooldownActive ? 'cooldown' : 'sample',
      sampleWindowLimited: true
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
      sampleWindowLimited: true
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
    sampleWindowLimited: true
  };
}

function hasLocalDepletion(key, sample, missionState, rules) {
  if (!missionState.sampled?.size) return false;
  const radius = Number(rules.localDepletionRadius ?? 0);
  if (radius <= 0) return missionState.sampled.has(key);
  for (const sampledKey of missionState.sampled) {
    const { x, y } = parseSampleKey(sampledKey);
    if (Math.hypot(sample.x - x, sample.y - y) <= radius) return true;
  }
  return false;
}

function getMissionSampleWindow(missionState, t) {
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
      const roi = world.sampleROIObject?.(x, y, t, agent.depthMeters ?? 0) ?? { value: world.sampleROI(x, y, t), probability: 1, expectedValue: world.sampleROI(x, y, t) };
      const outcome = resolveROIOutcome(roi, x, y, missionState);
      if (!best || roi.expectedValue > best.expectedValue) best = { x, y, ...roi, ...outcome };
    }
  }

  if (!best) return null;
  const sampleX = round(agent.x, 3);
  const sampleY = round(agent.y, 3);
  const containingCell = { x: best.x, y: best.y, col: best.x, row: best.y };
  const continuousSampling = (missionState.fieldSamplingProfileId ?? missionState.plan?.fieldSamplingProfileId ?? missionState.plan?.meta?.fieldSamplingProfileId) !== 'legacyNearestCellV1';
  const continuousRoi = continuousSampling
    ? world.sampleROIObject?.(sampleX, sampleY, t, agent.depthMeters ?? 0)
    : null;
  const roi = continuousRoi?.volumetricSample ? continuousRoi : best;
  const outcome = resolveROIOutcome(roi, containingCell.x, containingCell.y, missionState);
  return {
    ...best,
    ...roi,
    ...outcome,
    x: sampleX,
    y: sampleY,
    containingCell,
    nearestCell: containingCell,
    sampleKey: `${containingCell.x},${containingCell.y}`,
    fieldSample: continuousRoi?.volumetricSample ?? best.volumetricSample ?? null,
    interpolationWeights: continuousRoi?.volumetricSample?.interpolationWeights ?? null
  };
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

function resolveSampleDepthContext(agent, missionState, sample, t) {
  const config = normalizeWaterColumnConfig(missionState.waterColumnConfig ?? { depthLayerIds: ['surface'], diveProfileId: 'surfaceOnly' });
  const activeWaypoint = agent.activeWaypoint ?? null;
  const agentPlan = (missionState.plan?.agentPlans ?? []).find((plan) => plan.agentId === agent.id) ?? null;
  const effectiveDiveProfile = resolveEffectiveDiveProfile({
    targetWaypoint: activeWaypoint,
    agentPlan,
    agent,
    mission: missionState.mission,
    level: missionState.level,
    waterColumnConfig: config,
    routeWaypointCount: agentPlan?.waypoints?.length != null ? Number(agentPlan.waypoints.length) + 1 : null,
    executableSegmentCount: agentPlan?.waypoints?.length != null ? Math.max(0, Number(agentPlan.waypoints.length)) : null
  });
  const profileId = effectiveDiveProfile.profileId;
  const targetDepthLayerId = normalizeWaterColumnLayerId(
    activeWaypoint?.targetDepthLayerId
      ?? activeWaypoint?.depthLayerId
      ?? activeWaypoint?.depthLayer
      ?? effectiveDiveProfile.targetDepthLayerId
      ?? missionState.defaultTargetDepthLayerId
      ?? config.defaultLayerIds?.[0]
      ?? 'surface',
    config.depthLayerIds[0] ?? 'surface'
  );
  const explicitLayer = activeWaypoint?.depthLayerId ?? activeWaypoint?.depthLayer ?? activeWaypoint?.targetDepthLayerId ?? null;
  const profile = normalizeDiveProfile(profileId, config);
  const progress = routeProgressForAgent(agent, agentPlan, missionState, t);
  const profileLayer = depthLayerForDiveProfile(profile, progress);
  const actualDepthMeters = Number(agent.depthMeters);
  const actualLayer = Number.isFinite(actualDepthMeters) ? depthLayerForMeters(actualDepthMeters, config, targetDepthLayerId) : null;
  const depthLayerId = normalizeWaterColumnLayerId(actualLayer ?? explicitLayer ?? (profile.id === 'surfaceOnly' ? 'surface' : profileLayer), targetDepthLayerId);
  const safeLayerId = config.depthLayerIds.includes(depthLayerId) ? depthLayerId : config.depthLayerIds[0] ?? 'surface';
  const metadata = waterColumnLayerMetadata(safeLayerId);
  return {
    depthLayerId: safeLayerId,
    depthMeters: Number.isFinite(actualDepthMeters) ? Number(actualDepthMeters.toFixed(3)) : Number(metadata.nominalDepthMeters ?? 0),
    divePhase: agent.divePhase ?? null,
    diveProfileId: profile.id,
    targetDepthLayerId,
    routeProgress: progress,
    sensorProfile: activeWaypoint?.sensorProfile ?? missionState.sensorProfile ?? null,
    sample
  };
}

function depthLayerForMeters(depthMeters, config, fallback = 'surface') {
  const depth = Number(depthMeters);
  if (!Number.isFinite(depth)) return fallback;
  let best = { id: fallback, distance: Infinity };
  for (const id of config.depthLayerIds ?? []) {
    const layerDepth = Number(waterColumnLayerMetadata(id).nominalDepthMeters ?? 0);
    const distance = Math.abs(layerDepth - depth);
    if (distance < best.distance) best = { id, distance };
  }
  return best.id ?? fallback;
}

function routeProgressForAgent(agent, agentPlan, missionState, t) {
  const total = Math.max(1, Number(agentPlan?.waypoints?.length ?? 1));
  const indexProgress = total <= 1 ? 0 : Math.max(0, Math.min(1, Number(agent.currentWaypointIndex ?? 0) / (total - 1)));
  const duration = Number(missionState.missionDuration ?? missionState.duration ?? 0);
  const timeProgress = duration > 0 ? Math.max(0, Math.min(1, Number(t ?? 0) / duration)) : indexProgress;
  return Number(((indexProgress + timeProgress) / 2).toFixed(6));
}

function round(value, digits = 3) {
  return Number(Number(value ?? 0).toFixed(digits));
}

function parseSampleKey(key) {
  const [xy] = String(key).split(':');
  const [x, y] = xy.split(',').map(Number);
  return { x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 };
}
