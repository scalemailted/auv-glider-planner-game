const MissionScoringSchema = require('./MissionScoringSchema.js')
const MissionScoreComponents = require('./MissionScoreComponents.js')
const MISSION_SCORE_AGGREGATOR_VERSION = 'mission-score-aggregator-score-r1';

 function aggregateScoreGroup(metrics = [], groupId, profile = {}, options = {}) {
  const metricList = Array.isArray(metrics) ? metrics : metrics?.metrics ?? [];
  const componentWeights = profile?.componentWeights ?? {};
  let availableWeightedSum = 0;
  let availableWeight = 0;
  let configuredWeight = 0;
  const componentScores = [];
  for (const metric of metricList) {
    const definition = MissionScoreComponents.missionScoreComponentById(metric.componentId);
    if (!definition || definition.groupId !== groupId) continue;
    const weight = Number(componentWeights[metric.componentId] ?? 0);
    if (weight <= 0) continue;
    configuredWeight += weight;
    const available = metric.available === true && Number.isFinite(Number(metric.normalizedValue));
    if (available) {
      availableWeightedSum += weight * Number(metric.normalizedValue);
      availableWeight += weight;
    }
    componentScores.push({
      componentId: metric.componentId,
      groupId,
      weight,
      rawValue: metric.rawValue ?? null,
      normalizedValue: available ? Number(metric.normalizedValue) : null,
      available,
      contribution: available ? round(weight * Number(metric.normalizedValue)) : null,
      warnings: metric.warnings ?? []
    });
  }
  const coverageFraction = configuredWeight > 0 ? availableWeight / configuredWeight : null;
  const scoreScale = Number(options.scoreScale ?? 100);
  const score = availableWeight > 0 ? clamp(scoreScale * availableWeightedSum / availableWeight, 0, scoreScale) : null;
  return {
    groupId,
    score: score === null ? null : round(score),
    coverageFraction: coverageFraction === null ? null : round(coverageFraction),
    availableWeight: round(availableWeight),
    configuredWeight: round(configuredWeight),
    componentScores,
    status: configuredWeight === 0 ? 'insufficientData' : coverageFraction >= Number(options.minimumCoverageFraction ?? 0) ? 'complete' : availableWeight > 0 ? 'partial' : 'insufficientData'
  };
}

 function aggregateMissionOutcomeScore({ normalizedMetrics, profile, scoreConfig, options = {} } = {}) {
  const config = MissionScoringSchema.createMissionScoreConfig({ ...(scoreConfig ?? {}), profileId: profile?.id ?? scoreConfig?.profileId, minimumCoverageFraction: scoreConfig?.minimumCoverageFraction ?? profile?.minimumCoverageFraction });
  const metricList = Array.isArray(normalizedMetrics?.metrics) ? normalizedMetrics.metrics : Array.isArray(normalizedMetrics) ? normalizedMetrics : [];
  const groupScores = MISSION_SCORE_GROUP_IDS.map((groupId) => aggregateScoreGroup(metricList, groupId, profile, { scoreScale: config.scoreScale, minimumCoverageFraction: 0 })).filter((group) => group.configuredWeight > 0);
  const componentWeights = profile?.componentWeights ?? {};
  let availableWeightedSum = 0;
  let availableWeight = 0;
  let configuredWeight = 0;
  const componentScores = [];
  for (const metric of metricList) {
    const weight = Number(componentWeights[metric.componentId] ?? 0);
    if (weight <= 0) continue;
    configuredWeight += weight;
    const definition = MissionScoreComponents.missionScoreComponentById(metric.componentId);
    const available = metric.available === true && Number.isFinite(Number(metric.normalizedValue));
    if (available) {
      availableWeightedSum += weight * Number(metric.normalizedValue);
      availableWeight += weight;
    }
    componentScores.push({
      componentId: metric.componentId,
      groupId: definition?.groupId ?? null,
      weight,
      rawValue: metric.rawValue ?? null,
      normalizedValue: available ? Number(metric.normalizedValue) : null,
      available,
      contribution: available ? round(weight * Number(metric.normalizedValue)) : null,
      dataSource: metric.dataSource ?? null,
      refereeOnlyDerived: metric.refereeOnlyDerived === true,
      warnings: metric.warnings ?? []
    });
  }
  const coverageFraction = configuredWeight > 0 ? availableWeight / configuredWeight : 0;
  const missingRequiredComponents = (profile?.requiredComponents ?? []).filter((componentId) => !componentScores.some((score) => score.componentId === componentId && score.available));
  const coverageOk = coverageFraction >= config.minimumCoverageFraction;
  const status = configuredWeight <= 0 || !coverageOk ? 'insufficientData' : missingRequiredComponents.length ? 'partial' : 'complete';
  const compositeScore = status === 'insufficientData' ? null : clamp(config.scoreScale * availableWeightedSum / Math.max(availableWeight, 1e-9), 0, config.scoreScale);
  return {
    type: 'anchor.benchmark.mission-score',
    version: MISSION_SCORE_AGGREGATOR_VERSION,
    scoreConfig: config,
    profile: { id: profile?.id ?? config.profileId, version: profile?.version ?? config.profileVersion, label: profile?.label ?? config.profileId },
    status,
    compositeScore: compositeScore === null ? null : round(compositeScore),
    groupScores,
    componentScores,
    coverageFraction: round(coverageFraction),
    availableWeight: round(availableWeight),
    configuredWeight: round(configuredWeight),
    missingRequiredComponents,
    warnings: [
      ...(coverageOk ? [] : [`Coverage ${round(coverageFraction)} is below required ${config.minimumCoverageFraction}. Composite score is withheld.`]),
      ...(missingRequiredComponents.length ? [`Missing required components: ${missingRequiredComponents.join(', ')}`] : [])
    ],
    changesOfficialBrowserScoring: false,
    notA: ['not official browser scoring', 'not route planner', 'not policy evaluation for RL', 'not operational certification']
  };
}

 function missionScoreAggregationSummary(result = {}) {
  return {
    type: 'anchor.benchmark.mission-score-summary',
    version: MISSION_SCORE_AGGREGATOR_VERSION,
    status: result?.status ?? 'invalid',
    compositeScore: result?.compositeScore ?? null,
    coverageFraction: result?.coverageFraction ?? 0,
    availableWeight: result?.availableWeight ?? 0,
    configuredWeight: result?.configuredWeight ?? 0,
    scienceScore: groupScore(result, 'science'),
    feasibilityScore: groupScore(result, 'feasibility'),
    efficiencyScore: groupScore(result, 'efficiency'),
    safetyScore: groupScore(result, 'safety'),
    missionManagementScore: groupScore(result, 'missionManagement'),
    fleetCoordinationScore: groupScore(result, 'fleetCoordination'),
    changesOfficialBrowserScoring: false
  };
}

function groupScore(result, groupId) {
  return (result?.groupScores ?? []).find((group) => group.groupId === groupId)?.score ?? null;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value)));
}

function round(value) {
  return Number(Number(value ?? 0).toFixed(6));
}

module.exports = {aggregateScoreGroup, aggregateMissionOutcomeScore, missionScoreAggregationSummary}