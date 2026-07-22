 const MISSION_SCORING_SCHEMA_VERSION = 'mission-scoring-schema-score-r1';

 const MISSION_SCORE_PROFILE_IDS = Object.freeze([
  'balancedMission',
  'surveyReconnaissance',
  'reduceUncertainty',
  'validateForecast',
  'mapBoundary',
  'confirmHiddenEvent',
  'localizeSource',
  'trackMovingFeature',
  'revisitStaleRegion',
  'persistentMonitoring',
  'energyConservation',
  'hazardAvoidance',
  'cooperativeCoverage',
  'fleetSourceLocalization'
]);

 const MISSION_SCORE_GROUP_IDS = Object.freeze([
  'science',
  'feasibility',
  'efficiency',
  'safety',
  'missionManagement',
  'fleetCoordination'
]);

 const MISSION_SCORE_STATUS_IDS = Object.freeze([
  'complete',
  'partial',
  'insufficientData',
  'incompatibleComparison',
  'invalid'
]);

 const MISSION_REGRET_REFERENCE_IDS = Object.freeze([
  'none',
  'configuredBaseline',
  'bestKnownCompatibleAttempt',
  'oracleAttemptIfAvailable',
  'theoreticalUpperBound',
  'componentTarget'
]);

 const MISSION_SCORE_DATA_SOURCE_IDS = Object.freeze([
  'publicObservation',
  'publicBelief',
  'publicForecast',
  'publicMissionRecord',
  'refereeOnlyDerived',
  'oracleDerived',
  'debugOnly'
]);

 const MISSION_SCORE_COMPONENT_IDS = Object.freeze([
  'scienceValueCollected',
  'uncertaintyReduction',
  'forecastValidation',
  'hiddenEventConfirmation',
  'sourceLocalization',
  'boundaryMapping',
  'featureTracking',
  'stalenessRevisit',
  'verticalCoverage',
  'observationDiversity',
  'samplingRedundancy',
  'missionCompletion',
  'waypointCompletion',
  'arrivalStatus',
  'motionFeasibility',
  'trackError',
  'bottomClearance',
  'constraintCompliance',
  'communicationCompletion',
  'energyEfficiency',
  'energyRemaining',
  'missionDuration',
  'realizedDistance',
  'currentUtilization',
  'controlEffort',
  'payloadEfficiency',
  'hazardExposure',
  'constraintViolations',
  'bottomClearanceWarnings',
  'collisionRisk',
  'communicationLoss',
  'objectiveTransitionQuality',
  'evidenceFollowupQuality',
  'surfacingDecisionQuality',
  'cooperativeCoverage',
  'fleetRedundancy',
  'contributionBalance',
  'communicationCoordination'
]);

 const MISSION_SCORE_BOUNDARY_NOT_A = Object.freeze([
  'not official browser scoring',
  'not route planning',
  'not route optimization',
  'not operational certification',
  'not SeaExplorer-validated',
  'not MARL/RL'
]);

 function normalizeMissionScoreProfileId(id) {
  return normalizeId(id, MISSION_SCORE_PROFILE_IDS, 'balancedMission');
}

 function normalizeMissionScoreComponentId(id) {
  return normalizeId(id, MISSION_SCORE_COMPONENT_IDS, null);
}

 function normalizeMissionScoreGroupId(id) {
  return normalizeId(id, MISSION_SCORE_GROUP_IDS, null);
}

 function normalizeMissionScoreStatusId(id) {
  return normalizeId(id, MISSION_SCORE_STATUS_IDS, 'insufficientData');
}

 function normalizeMissionRegretReferenceId(id) {
  return normalizeId(id, MISSION_REGRET_REFERENCE_IDS, 'none');
}

 function createMissionScoreConfig(options = {}) {
  const profileId = normalizeMissionScoreProfileId(options.profileId ?? options.scoreProfileId);
  const visibilityTier = String(options.visibilityTier ?? 'publicScenario');
  return {
    type: 'anchor.benchmark.score-config',
    version: MISSION_SCORING_SCHEMA_VERSION,
    profileId,
    profileVersion: String(options.profileVersion ?? 'score-profile-score-r1'),
    objectiveId: String(options.objectiveId ?? 'reconnaissanceSurvey'),
    scoreScale: finiteNumber(options.scoreScale, 100),
    minimumCoverageFraction: clamp01(options.minimumCoverageFraction, 0.45),
    missingMetricPolicy: String(options.missingMetricPolicy ?? 'explicitUnavailableNoCredit'),
    visibilityTier,
    allowRefereeOnlyPostMissionMetrics: options.allowRefereeOnlyPostMissionMetrics === true,
    regretReference: normalizeMissionRegretReferenceId(options.regretReference ?? options.regretReferenceId ?? 'none'),
    changesOfficialBrowserScoring: false,
    notA: MISSION_SCORE_BOUNDARY_NOT_A.slice()
  };
}

 function createMissionScoreComponentDefinition(options = {}) {
  return {
    id: String(options.id ?? ''),
    groupId: normalizeMissionScoreGroupId(options.groupId) ?? 'science',
    label: String(options.label ?? options.id ?? 'Unnamed component'),
    description: String(options.description ?? ''),
    direction: normalizeDirection(options.direction),
    unit: String(options.unit ?? 'unitless'),
    defaultBounds: normalizeBounds(options.defaultBounds),
    defaultTarget: normalizeTarget(options.defaultTarget),
    dataSources: normalizeDataSources(options.dataSources),
    refereeOnly: options.refereeOnly === true,
    applicableObjectives: Array.isArray(options.applicableObjectives) ? options.applicableObjectives.map(String) : ['balancedMission'],
    explanation: String(options.explanation ?? ''),
    missingDataMeaning: String(options.missingDataMeaning ?? 'Metric was unavailable and earns no shadow-score credit.'),
    notA: Array.isArray(options.notA) ? options.notA.map(String) : ['not official browser scoring']
  };
}

 function validateMissionScoreConfig(config = {}) {
  const errors = [];
  const warnings = [];
  if (!config || typeof config !== 'object') errors.push('Score config must be an object.');
  if (config?.type !== 'anchor.benchmark.score-config') errors.push(`Expected type anchor.benchmark.score-config, got ${config?.type ?? 'missing'}.`);
  if (!MISSION_SCORE_PROFILE_IDS.includes(config?.profileId)) errors.push(`Unknown score profile ${config?.profileId ?? 'missing'}.`);
  if (!Number.isFinite(Number(config?.scoreScale)) || Number(config.scoreScale) <= 0) errors.push('scoreScale must be positive and finite.');
  if (!Number.isFinite(Number(config?.minimumCoverageFraction))) errors.push('minimumCoverageFraction must be finite.');
  if (config?.changesOfficialBrowserScoring !== false) errors.push('changesOfficialBrowserScoring must be false.');
  for (const phrase of MISSION_SCORE_BOUNDARY_NOT_A) {
    if (!(config?.notA ?? []).includes(phrase)) errors.push(`Missing boundary: ${phrase}.`);
  }
  if (config?.allowRefereeOnlyPostMissionMetrics === true && !/referee|oracle|debug|post/i.test(String(config.visibilityTier))) {
    warnings.push('Referee-only metrics are enabled; public s must label derived metrics clearly.');
  }
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

 function validateMissionScoreComponentDefinition(component = {}) {
  const errors = [];
  const warnings = [];
  if (!MISSION_SCORE_COMPONENT_IDS.includes(component?.id)) errors.push(`Unknown component id ${component?.id ?? 'missing'}.`);
  if (!MISSION_SCORE_GROUP_IDS.includes(component?.groupId)) errors.push(`Unknown group id ${component?.groupId ?? 'missing'}.`);
  if (!['higherIsBetter', 'lowerIsBetter', 'targetRange', 'binaryPass', 'categorical'].includes(component?.direction)) errors.push(`Invalid direction ${component?.direction ?? 'missing'}.`);
  if (!component?.unit) warnings.push(`${component?.id ?? 'component'} should declare a unit.`);
  if (!Array.isArray(component?.dataSources) || !component.dataSources.length) errors.push(`${component?.id ?? 'component'} must declare data sources.`);
  for (const source of component?.dataSources ?? []) {
    if (!MISSION_SCORE_DATA_SOURCE_IDS.includes(source)) errors.push(`${component?.id ?? 'component'} has unknown data source ${source}.`);
  }
  if (component?.refereeOnly === true && !(component?.dataSources ?? []).some((source) => ['refereeOnlyDerived', 'oracleDerived', 'debugOnly'].includes(source))) {
    errors.push(`${component.id} is refereeOnly but lacks a referee/oracle/debug data source.`);
  }
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

 function missionScoreConfigSummary(config = {}) {
  const normalized = createMissionScoreConfig(config);
  const validation = validateMissionScoreConfig(normalized);
  return {
    type: 'anchor.benchmark.score-config-summary',
    version: MISSION_SCORING_SCHEMA_VERSION,
    profileId: normalized.profileId,
    profileVersion: normalized.profileVersion,
    objectiveId: normalized.objectiveId,
    scoreScale: normalized.scoreScale,
    minimumCoverageFraction: normalized.minimumCoverageFraction,
    visibilityTier: normalized.visibilityTier,
    allowRefereeOnlyPostMissionMetrics: normalized.allowRefereeOnlyPostMissionMetrics,
    regretReference: normalized.regretReference,
    changesOfficialBrowserScoring: false,
    valid: validation.valid,
    warnings: validation.warnings,
    notA: normalized.notA.slice()
  };
}

function normalizeId(id, allowed, fallback) {
  const text = String(id ?? '');
  return allowed.includes(text) ? text : fallback;
}

function normalizeDirection(value) {
  return ['higherIsBetter', 'lowerIsBetter', 'targetRange', 'binaryPass', 'categorical'].includes(value) ? value : 'higherIsBetter';
}

function normalizeDataSources(values) {
  const list = Array.isArray(values) ? values : ['publicMissionRecord'];
  const normalized = [...new Set(list.map(String).filter((entry) => MISSION_SCORE_DATA_SOURCE_IDS.includes(entry)))];
  return normalized.length ? normalized : ['publicMissionRecord'];
}

function normalizeBounds(value) {
  if (!value) return null;
  if (Array.isArray(value)) return { min: finiteOrNull(value[0]), max: finiteOrNull(value[1]) };
  return { min: finiteOrNull(value.min), max: finiteOrNull(value.max) };
}

function normalizeTarget(value) {
  if (!value) return null;
  if (Array.isArray(value)) return { min: finiteOrNull(value[0]), max: finiteOrNull(value[1]) };
  if (typeof value === 'object') return { min: finiteOrNull(value.min ?? value.targetMin), max: finiteOrNull(value.max ?? value.targetMax), value: finiteOrNull(value.value) };
  return { value: finiteOrNull(value) };
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp01(value, fallback = 0) {
  const number = finiteNumber(value, fallback);
  return Math.max(0, Math.min(1, number));
}

module.exports = {MISSION_SCORING_SCHEMA_VERSION, MISSION_SCORE_PROFILE_IDS, MISSION_SCORE_GROUP_IDS, MISSION_SCORE_STATUS_IDS, MISSION_REGRET_REFERENCE_IDS, MISSION_SCORE_DATA_SOURCE_IDS, MISSION_SCORE_COMPONENT_IDS, MISSION_SCORE_BOUNDARY_NOT_A, normalizeMissionScoreProfileId, normalizeMissionScoreComponentId, normalizeMissionScoreGroupId, normalizeMissionScoreStatusId, normalizeMissionRegretReferenceId, createMissionScoreConfig, createMissionScoreComponentDefinition, validateMissionScoreConfig, validateMissionScoreComponentDefinition, missionScoreConfigSummary}