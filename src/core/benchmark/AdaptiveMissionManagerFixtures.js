import { createAdaptiveMissionManagerConfig } from './AdaptiveMissionManagerContract.js';
import { createAdaptiveEvidenceSnapshot, computeAdaptiveDiagnosis } from './AdaptiveDiagnosisModel.js';
import { selectNextAdaptiveObjective } from './AdaptiveObjectivePolicy.js';
import { applyAdaptiveEvidenceSnapshot, applyAdaptiveObjectiveTransition, createAdaptiveMissionManagerState } from './AdaptiveMissionManagerState.js';

export const ADAPTIVE_MANAGER_FIXTURE_IDS = [
  'agreesWithForecast',
  'highUncertainty',
  'shiftedFrontForecastError',
  'possibleHiddenPlume',
  'hiddenBloomLayer',
  'noisyFalseAlarm',
  'staleMonitoringRevisit',
  'boundaryAmbiguity',
  'sourceLocalization',
  'hazardPressure'
];

const FIXTURES = {
  agreesWithForecast: fixture('agreesWithForecast', 'Agrees With Forecast', 'Synthetic observations match the belief field, so the manager can exploit known value.', 'exploitKnownValue', {
    observationCount: 14,
    recentObservationCount: 6,
    meanUncertainty: 0.18,
    maxUncertainty: 0.28,
    meanSurprise: 0.08,
    maxSurprise: 0.15,
    forecastErrorScore: 0.08,
    hiddenEventConfidence: 0.04,
    noiseFalseAlarmRisk: 0.06,
    activeObjectiveId: 'reconnaissanceSurvey'
  }),
  highUncertainty: fixture('highUncertainty', 'High Uncertainty', 'Synthetic belief uncertainty is high while hidden-event evidence is weak, so reduce uncertainty first.', 'reduceUncertainty', {
    observationCount: 8,
    recentObservationCount: 4,
    meanUncertainty: 0.82,
    maxUncertainty: 0.92,
    meanSurprise: 0.18,
    maxSurprise: 0.24,
    forecastErrorScore: 0.16,
    hiddenEventConfidence: 0.08,
    noiseFalseAlarmRisk: 0.07,
    activeObjectiveId: 'reconnaissanceSurvey'
  }),
  shiftedFrontForecastError: fixture('shiftedFrontForecastError', 'Shifted Front Forecast Error', 'Synthetic observations are coherent but displaced from the forecast front, so validate forecast.', 'validateForecast', {
    observationCount: 16,
    recentObservationCount: 7,
    meanUncertainty: 0.36,
    maxUncertainty: 0.54,
    meanSurprise: 0.78,
    maxSurprise: 0.88,
    forecastErrorScore: 0.86,
    hiddenEventConfidence: 0.18,
    noiseFalseAlarmRisk: 0.06,
    boundaryAmbiguityScore: 0.38,
    activeObjectiveId: 'mapBoundary'
  }),
  possibleHiddenPlume: fixture('possibleHiddenPlume', 'Possible Hidden Plume', 'Synthetic observations weakly suggest a hidden plume, so follow up before treating it as truth.', 'confirmHiddenEvent', {
    observationCount: 10,
    recentObservationCount: 5,
    meanUncertainty: 0.42,
    maxUncertainty: 0.62,
    meanSurprise: 0.56,
    maxSurprise: 0.72,
    forecastErrorScore: 0.42,
    hiddenEventConfidence: 0.69,
    noiseFalseAlarmRisk: 0.12,
    sourceLocalizationScore: 0.32,
    activeObjectiveId: 'validateForecast'
  }),
  hiddenBloomLayer: fixture('hiddenBloomLayer', 'Hidden Bloom Layer', 'Synthetic hidden-event confidence is strong, so the manager recommends confirmation samples.', 'confirmHiddenEvent', {
    observationCount: 18,
    recentObservationCount: 8,
    meanUncertainty: 0.34,
    maxUncertainty: 0.52,
    meanSurprise: 0.66,
    maxSurprise: 0.81,
    forecastErrorScore: 0.36,
    hiddenEventConfidence: 0.88,
    noiseFalseAlarmRisk: 0.08,
    activeObjectiveId: 'reconnaissanceSurvey'
  }),
  noisyFalseAlarm: fixture('noisyFalseAlarm', 'Noisy False Alarm', 'Synthetic evidence is sparse and noisy, so the manager pauses objective switching.', 'reconnaissanceSurvey', {
    observationCount: 2,
    recentObservationCount: 1,
    meanUncertainty: 0.44,
    maxUncertainty: 0.58,
    meanSurprise: 0.42,
    maxSurprise: 0.54,
    forecastErrorScore: 0.32,
    hiddenEventConfidence: 0.2,
    noiseFalseAlarmRisk: 0.9,
    activeObjectiveId: 'reconnaissanceSurvey'
  }),
  staleMonitoringRevisit: fixture('staleMonitoringRevisit', 'Stale Monitoring Revisit', 'Synthetic high-value monitoring cells have become stale, so revisit them.', 'revisitStaleRegion', {
    observationCount: 9,
    recentObservationCount: 3,
    meanUncertainty: 0.38,
    maxUncertainty: 0.5,
    meanSurprise: 0.16,
    maxSurprise: 0.24,
    forecastErrorScore: 0.14,
    hiddenEventConfidence: 0.08,
    noiseFalseAlarmRisk: 0.08,
    stalenessScore: 0.9,
    activeObjectiveId: 'exploitKnownValue'
  }),
  boundaryAmbiguity: fixture('boundaryAmbiguity', 'Boundary Ambiguity', 'Synthetic front location is uncertain, so map the boundary before exploiting it.', 'mapBoundary', {
    observationCount: 12,
    recentObservationCount: 5,
    meanUncertainty: 0.45,
    maxUncertainty: 0.64,
    meanSurprise: 0.34,
    maxSurprise: 0.48,
    forecastErrorScore: 0.32,
    hiddenEventConfidence: 0.16,
    noiseFalseAlarmRisk: 0.08,
    boundaryAmbiguityScore: 0.86,
    activeObjectiveId: 'validateForecast'
  }),
  sourceLocalization: fixture('sourceLocalization', 'Source Localization', 'Synthetic plume evidence points upstream, so localize the source rather than only confirming the event.', 'localizeSource', {
    observationCount: 15,
    recentObservationCount: 6,
    meanUncertainty: 0.38,
    maxUncertainty: 0.57,
    meanSurprise: 0.48,
    maxSurprise: 0.62,
    forecastErrorScore: 0.3,
    hiddenEventConfidence: 0.5,
    noiseFalseAlarmRisk: 0.06,
    sourceLocalizationScore: 0.88,
    activeObjectiveId: 'confirmHiddenEvent'
  }),
  hazardPressure: fixture('hazardPressure', 'Hazard Pressure', 'Synthetic reachability or hazard pressure is high, so the manager keeps the objective and flags route risk.', 'reconnaissanceSurvey', {
    observationCount: 11,
    recentObservationCount: 4,
    meanUncertainty: 0.32,
    maxUncertainty: 0.48,
    meanSurprise: 0.18,
    maxSurprise: 0.3,
    forecastErrorScore: 0.18,
    hiddenEventConfidence: 0.08,
    noiseFalseAlarmRisk: 0.08,
    hazardPressure: 0.9,
    reachabilityPressure: 0.74,
    activeObjectiveId: 'reconnaissanceSurvey'
  })
};

export function adaptiveManagerFixtureOptions() {
  return ADAPTIVE_MANAGER_FIXTURE_IDS.map((id) => ({
    id,
    label: FIXTURES[id].label,
    expectedObjectiveId: FIXTURES[id].expectedObjectiveId,
    teachingNote: FIXTURES[id].teachingNote
  }));
}

export function createAdaptiveManagerFixture(id = 'shiftedFrontForecastError', options = {}) {
  const fixtureId = normalizeFixtureId(id);
  const definition = FIXTURES[fixtureId];
  const episodeId = String(options.episodeId ?? `adaptive-${fixtureId}-episode`);
  const managerConfig = createAdaptiveMissionManagerConfig({
    policyId: options.policyId,
    informationAccessTier: options.informationAccessTier,
    worldModelTier: options.worldModelTier,
    notes: [`Synthetic fixture: ${definition.label}.`, ...(Array.isArray(options.notes) ? options.notes : [])]
  });
  const initialState = createAdaptiveMissionManagerState({
    episodeId,
    policyId: managerConfig.policyId,
    currentObjectiveId: definition.evidence.activeObjectiveId,
    status: 'awaitingEvidence'
  });
  const evidence = createAdaptiveEvidenceSnapshot({
    ...definition.evidence,
    ...cloneJson(options.evidenceOverrides ?? {}),
    episodeId,
    time: options.time ?? definition.evidence.time ?? 0,
    fieldsAvailable: definition.fieldsAvailable,
    notes: [`Synthetic fixture input for ${definition.label}.`]
  });
  return {
    fixtureId,
    label: definition.label,
    managerConfig,
    initialState,
    evidence,
    expectedObjectiveId: definition.expectedObjectiveId,
    teachingNote: definition.teachingNote,
    synthetic: true,
    notA: [
      'not production autonomy',
      'not route planning',
      'not mission scoring',
      'not MARL/RL',
      'not calibrated ocean data assimilation'
    ]
  };
}

export function runAdaptiveManagerFixture(id = 'shiftedFrontForecastError', options = {}) {
  const fixture = createAdaptiveManagerFixture(id, options);
  const diagnosis = computeAdaptiveDiagnosis(fixture.evidence, fixture.managerConfig);
  const withEvidence = applyAdaptiveEvidenceSnapshot(fixture.initialState, { ...fixture.evidence, diagnosis });
  const selection = selectNextAdaptiveObjective({
    diagnosis,
    currentObjective: fixture.initialState.currentObjectiveId,
    objectiveHistory: fixture.initialState.objectiveHistory,
    managerConfig: fixture.managerConfig,
    missionContext: {
      episodeId: fixture.initialState.episodeId,
      time: fixture.evidence.time,
      observationCount: fixture.evidence.observationCount,
      recentObservationCount: fixture.evidence.recentObservationCount,
      fieldsAvailable: fixture.evidence.fieldsAvailable
    }
  });
  const managerState = applyAdaptiveObjectiveTransition(withEvidence, selection.transitionRecord);
  return {
    ...fixture,
    diagnosis,
    transition: selection.transitionRecord,
    objectiveSelection: selection,
    managerState,
    expectedObjectiveId: fixture.expectedObjectiveId,
    matchesExpectedObjective: selection.transitionRecord.toObjectiveId === fixture.expectedObjectiveId
  };
}

function fixture(id, label, teachingNote, expectedObjectiveId, evidence) {
  return {
    id,
    label,
    teachingNote,
    expectedObjectiveId,
    evidence: {
      time: 120,
      boundaryAmbiguityScore: 0,
      stalenessScore: 0,
      sourceLocalizationScore: 0,
      hazardPressure: 0,
      reachabilityPressure: 0,
      ...evidence
    },
    fieldsAvailable: [
      'observations',
      'beliefRoi',
      'expectedUncertainty',
      'forecastValidation',
      'hiddenEventProbability',
      'boundaryStrength',
      'staleness',
      'hazard'
    ]
  };
}

function normalizeFixtureId(id) {
  const value = String(id ?? '').trim();
  const aliases = {
    agrees: 'agreesWithForecast',
    uncertainty: 'highUncertainty',
    shiftedFront: 'shiftedFrontForecastError',
    forecastError: 'shiftedFrontForecastError',
    hiddenPlume: 'possibleHiddenPlume',
    bloom: 'hiddenBloomLayer',
    noisy: 'noisyFalseAlarm',
    stale: 'staleMonitoringRevisit',
    boundary: 'boundaryAmbiguity',
    source: 'sourceLocalization',
    hazard: 'hazardPressure'
  };
  return aliases[value] ?? (ADAPTIVE_MANAGER_FIXTURE_IDS.includes(value) ? value : 'shiftedFrontForecastError');
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}
