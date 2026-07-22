const MissionScoreComponents = require('./MissionScoreComponents.js')
const MissionScoringSchema = require('./MissionScoringSchema.js')
const MISSION_SCORE_PROFILES_VERSION = 'mission-score-profiles-score-r1';

const BASE_WEIGHTS = Object.freeze({
  scienceValueCollected: 1.0,
  uncertaintyReduction: 1.0,
  forecastValidation: 0.6,
  boundaryMapping: 0.5,
  verticalCoverage: 0.5,
  observationDiversity: 0.5,
  samplingRedundancy: 0.5,
  missionCompletion: 0.8,
  waypointCompletion: 0.5,
  motionFeasibility: 0.7,
  energyEfficiency: 0.4,
  energyRemaining: 0.3,
  missionDuration: 0.25,
  hazardExposure: 0.7,
  constraintViolations: 0.7,
  bottomClearanceWarnings: 0.4,
  evidenceFollowupQuality: 0.3
});

 const MISSION_SCORE_PROFILES = Object.freeze([
  profile('balancedMission', 'Balanced Mission', 'Balances science value, feasibility, efficiency, and safety.', ['reconnaissanceSurvey'], BASE_WEIGHTS, ['scienceValueCollected', 'missionCompletion', 'motionFeasibility'], [], 0.45),
  profile('surveyReconnaissance', 'Survey Reconnaissance', 'Rewards broad, diverse reconnaissance with practical completion.', ['surveyReconnaissance', 'reconnaissanceSurvey'], weights(BASE_WEIGHTS, { observationDiversity: 1.1, verticalCoverage: 0.9, scienceValueCollected: 1.1, waypointCompletion: 0.7 }), ['scienceValueCollected', 'observationDiversity', 'missionCompletion'], [], 0.45),
  profile('reduceUncertainty', 'Reduce Uncertainty', 'Emphasizes uncertainty reduction and coverage over raw anomaly magnitude.', ['reduceUncertainty'], weights(BASE_WEIGHTS, { uncertaintyReduction: 2.2, verticalCoverage: 1.0, observationDiversity: 0.9, scienceValueCollected: 0.45 }), ['uncertaintyReduction', 'verticalCoverage'], [], 0.5),
  profile('validateForecast', 'Validate Forecast', 'Emphasizes forecast validation and representative sampling while keeping hidden-event confirmation separate.', ['validateForecast'], weights(BASE_WEIGHTS, { forecastValidation: 2.0, observationDiversity: 1.0, uncertaintyReduction: 0.8, hiddenEventConfirmation: 0.15 }), ['forecastValidation', 'observationDiversity'], ['hiddenEventConfirmation'], 0.5),
  profile('mapBoundary', 'Map Boundary', 'Rewards cross-front or boundary sampling geometry rather than only sampling the feature center.', ['mapBoundary'], weights(BASE_WEIGHTS, { boundaryMapping: 2.1, observationDiversity: 0.9, verticalCoverage: 0.7, scienceValueCollected: 0.55 }), ['boundaryMapping', 'observationDiversity'], [], 0.48),
  profile('confirmHiddenEvent', 'Confirm Hidden Event', 'Rewards coherent post-mission evidence and follow-up; one noisy sample is not enough.', ['confirmHiddenEvent'], weights(BASE_WEIGHTS, { hiddenEventConfirmation: 2.2, evidenceFollowupQuality: 1.0, forecastValidation: 0.5, observationDiversity: 0.7 }), ['hiddenEventConfirmation', 'evidenceFollowupQuality'], ['forecastValidation'], 0.42, ['hiddenEventConfirmation']),
  profile('localizeSource', 'Localize Source', 'Rewards narrowing source-region evidence while preserving safety and feasibility.', ['localizeSource'], weights(BASE_WEIGHTS, { sourceLocalization: 2.0, evidenceFollowupQuality: 0.9, observationDiversity: 0.7 }), ['sourceLocalization', 'missionCompletion'], [], 0.42),
  profile('trackMovingFeature', 'Track Moving Feature', 'Rewards repeated time-aware observations of a moving feature.', ['trackMovingFeature'], weights(BASE_WEIGHTS, { featureTracking: 2.0, missionDuration: 0.5, observationDiversity: 0.6 }), ['featureTracking', 'missionCompletion'], [], 0.4),
  profile('revisitStaleRegion', 'Revisit Stale Region', 'Rewards revisiting stale or under-observed cells while avoiding redundancy.', ['revisitStaleRegion'], weights(BASE_WEIGHTS, { stalenessRevisit: 2.0, samplingRedundancy: 1.0, observationDiversity: 0.8 }), ['stalenessRevisit', 'observationDiversity'], [], 0.4),
  profile('persistentMonitoring', 'Persistent Monitoring', 'Rewards sustained coverage, revisits, and adaptive follow-up quality.', ['persistentMonitoring'], weights(BASE_WEIGHTS, { stalenessRevisit: 1.4, objectiveTransitionQuality: 0.9, surfacingDecisionQuality: 0.7, verticalCoverage: 0.7 }), ['missionCompletion', 'stalenessRevisit'], [], 0.4),
  profile('energyConservation', 'Energy Conservation', 'Emphasizes energy remaining and energy efficiency while still requiring mission value.', ['energyConservation'], weights(BASE_WEIGHTS, { energyEfficiency: 1.8, energyRemaining: 1.8, missionDuration: 0.7, scienceValueCollected: 0.55 }), ['energyEfficiency', 'energyRemaining', 'scienceValueCollected'], [], 0.45),
  profile('hazardAvoidance', 'Hazard Avoidance', 'Emphasizes safe completion and low exposure while preserving mission value.', ['hazardAvoidance'], weights(BASE_WEIGHTS, { hazardExposure: 2.0, constraintViolations: 1.6, bottomClearanceWarnings: 1.1, missionCompletion: 0.9 }), ['hazardExposure', 'constraintViolations', 'missionCompletion'], [], 0.45),
  profile('cooperativeCoverage', 'Cooperative Coverage', 'Future fleet profile placeholder; only valid when fleet metrics are present.', ['cooperativeCoverage'], weights(BASE_WEIGHTS, { cooperativeCoverage: 1.5, fleetRedundancy: 1.0, contributionBalance: 0.8 }), ['cooperativeCoverage'], ['fleetRedundancy', 'contributionBalance'], 0.55),
  profile('fleetSourceLocalization', 'Fleet Source Localization', 'Future fleet source-localization placeholder; only valid when fleet metrics are present.', ['fleetSourceLocalization'], weights(BASE_WEIGHTS, { sourceLocalization: 1.6, cooperativeCoverage: 1.0, communicationCoordination: 0.7 }), ['sourceLocalization', 'cooperativeCoverage'], ['communicationCoordination'], 0.55)
]);

 function missionScoreProfileById(id) {
  const normalized = MissionScoringSchema.normalizeMissionScoreProfileId(id);
  return MISSION_SCORE_PROFILES.find((profileEntry) => profileEntry.id === normalized) ?? MISSION_SCORE_PROFILES[0];
}

 function missionScoreProfileOptions() {
  return MISSION_SCORE_PROFILES.map(({ id, label, description, minimumCoverageFraction }) => ({ id, label, description, minimumCoverageFraction }));
}

 function missionScoreProfileForObjective(objectiveId) {
  const text = String(objectiveId ?? '');
  return MISSION_SCORE_PROFILES.find((profileEntry) => profileEntry.objectiveIds.includes(text)) ?? missionScoreProfileById('balancedMission');
}

 function validateMissionScoreProfile(profileEntry = {}) {
  const errors = [];
  const warnings = [];
  if (!MISSION_SCORE_PROFILE_IDS.includes(profileEntry?.id)) errors.push(`Unknown score profile id ${profileEntry?.id ?? 'missing'}.`);
  const ids = new Set(MISSION_SCORE_COMPONENTS.map((component) => component.id));
  for (const [componentId, weight] of Object.entries(profileEntry?.componentWeights ?? {})) {
    if (!ids.has(componentId)) errors.push(`${profileEntry.id} references unknown component ${componentId}.`);
    if (!Number.isFinite(Number(weight)) || Number(weight) < 0) errors.push(`${profileEntry.id} has invalid weight for ${componentId}.`);
  }
  for (const componentId of profileEntry?.requiredComponents ?? []) {
    if (!ids.has(componentId)) errors.push(`${profileEntry.id} requires unknown component ${componentId}.`);
    if (!Number(profileEntry.componentWeights?.[componentId])) warnings.push(`${profileEntry.id} requires ${componentId} but gives it no weight.`);
  }
  if (!Number.isFinite(Number(profileEntry?.minimumCoverageFraction))) errors.push(`${profileEntry.id} lacks minimumCoverageFraction.`);
  if ((profileEntry?.notA ?? []).some((entry) => /official browser score/i.test(entry) && !/^not/i.test(entry))) errors.push(`${profileEntry.id} appears to claim official scoring.`);
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

 function missionScoreProfileSummary(profileEntry = {}) {
  const profileValue = missionScoreProfileById(profileEntry.id ?? profileEntry.profileId ?? profileEntry);
  const validation = validateMissionScoreProfile(profileValue);
  return {
    type: 'anchor.benchmark.score-profile',
    version: MISSION_SCORE_PROFILES_VERSION,
    id: profileValue.id,
    profileId: profileValue.id,
    profileVersion: profileValue.version,
    label: profileValue.label,
    objectiveIds: profileValue.objectiveIds.slice(),
    componentCount: Object.keys(profileValue.componentWeights).length,
    requiredComponents: profileValue.requiredComponents.slice(),
    minimumCoverageFraction: profileValue.minimumCoverageFraction,
    refereeOnlyComponents: profileValue.refereeOnlyComponents.slice(),
    changesOfficialBrowserScoring: false,
    valid: validation.valid,
    warnings: validation.warnings,
    notA: profileValue.notA.slice()
  };
}

function profile(id, label, description, objectiveIds, componentWeights, requiredComponents, optionalComponents, minimumCoverageFraction, refereeOnlyComponents = []) {
  return Object.freeze({
    id,
    version: MISSION_SCORE_PROFILES_VERSION,
    label,
    description,
    objectiveIds: objectiveIds.map(String),
    componentWeights: freezeWeights(componentWeights),
    requiredComponents: requiredComponents.map(String),
    optionalComponents: optionalComponents.map(String),
    minimumCoverageFraction,
    refereeOnlyComponents: refereeOnlyComponents.map(String),
    comparisonRules: {
      requireSameProfileVersion: true,
      requireSameObjective: true,
      requireSameVisibilityTier: true,
      bestKnownAttemptIsNotOptimalProof: true
    },
    explanation: description,
    changesOfficialBrowserScoring: false,
    notA: [...MissionScoringSchema.MISSION_SCORE_BOUNDARY_NOT_A, 'not one opaque universal profile']
  });
}

function weights(base, overrides = {}) {
  return { ...base, ...overrides };
}

function freezeWeights(value) {
  const result = {};
  for (const [key, weight] of Object.entries(value ?? {})) {
    if (MissionScoreComponents.missionScoreComponentById(key)) result[key] = Number(weight);
  }
  return Object.freeze(result);
}

module.exports = {MISSION_SCORE_PROFILES, missionScoreProfileById, missionScoreProfileOptions, missionScoreProfileForObjective, validateMissionScoreProfile, missionScoreProfileSummary}