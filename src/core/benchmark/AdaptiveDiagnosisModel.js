import {
  adaptiveDiagnosisById,
  ADAPTIVE_DIAGNOSIS_IDS,
  createAdaptiveMissionManagerConfig,
  normalizeAdaptiveDiagnosisId
} from './AdaptiveMissionManagerContract.js';
import {
  classifyScienceDiagnosis,
  normalizeScienceDiagnosisId,
  recommendedObjectiveForScienceDiagnosis,
  scienceDiagnosisLabel
} from '../science/ScienceDiagnosisTypes.js';
import { scienceDiscoverySummary } from '../science/ScienceDiscoveryLifecycle.js';

export const ADAPTIVE_DIAGNOSIS_MODEL_VERSION = 'adaptive-diagnosis-model-p6';

const DIAGNOSIS_COMPONENTS = {
  agreesWithForecast: 'forecast agreement',
  reduceUncertainty: 'uncertainty',
  likelyForecastError: 'forecast error',
  possibleHiddenEvent: 'hidden event suspicion',
  likelyHiddenEvent: 'hidden event confidence',
  boundaryAmbiguous: 'boundary ambiguity',
  staleRegionNeedsRevisit: 'staleness',
  sourceLikelyUpstream: 'source localization',
  hazardOrReachabilityIssue: 'hazard or reachability pressure',
  insufficientEvidence: 'insufficient recent evidence',
  likelyNoiseOrFalseAlarm: 'noise or false alarm risk'
};

export function createAdaptiveEvidenceSnapshot(options = {}) {
  return {
    type: 'anchor.benchmark.adaptive-evidence-snapshot',
    version: ADAPTIVE_DIAGNOSIS_MODEL_VERSION,
    time: finiteNumber(options.time, 0),
    episodeId: String(options.episodeId ?? 'adaptive-preview-episode'),
    benchmarkMode: 'adaptiveBenchmark',
    observationCount: Math.max(0, Math.round(finiteNumber(options.observationCount, 0))),
    recentObservationCount: Math.max(0, Math.round(finiteNumber(options.recentObservationCount, options.observationCount ?? 0))),
    meanUncertainty: clamp01(options.meanUncertainty, 0),
    maxUncertainty: clamp01(options.maxUncertainty, options.meanUncertainty ?? 0),
    meanSurprise: clamp01(options.meanSurprise, 0),
    maxSurprise: clamp01(options.maxSurprise, options.meanSurprise ?? 0),
    forecastErrorScore: clamp01(options.forecastErrorScore, 0),
    hiddenEventConfidence: clamp01(options.hiddenEventConfidence, 0),
    noiseFalseAlarmRisk: clamp01(options.noiseFalseAlarmRisk, 0),
    boundaryAmbiguityScore: clamp01(options.boundaryAmbiguityScore, 0),
    stalenessScore: clamp01(options.stalenessScore, 0),
    sourceLocalizationScore: clamp01(options.sourceLocalizationScore, 0),
    hazardPressure: clamp01(options.hazardPressure, 0),
    reachabilityPressure: clamp01(options.reachabilityPressure, 0),
    activeObjectiveId: String(options.activeObjectiveId ?? 'reconnaissanceSurvey'),
    previousObjectiveId: String(options.previousObjectiveId ?? options.activeObjectiveId ?? 'reconnaissanceSurvey'),
    candidateObjectives: normalizeStringList(options.candidateObjectives ?? [
      'reduceUncertainty',
      'validateForecast',
      'confirmHiddenEvent',
      'mapBoundary',
      'localizeSource',
      'revisitStaleRegion',
      'exploitKnownValue'
    ]),
    fieldsAvailable: normalizeStringList(options.fieldsAvailable ?? [
      'observations',
      'beliefRoi',
      'expectedUncertainty',
      'forecastValidation',
      'hiddenEventProbability',
      'staleness'
    ]),
    scienceDiscovery: normalizeScienceDiscovery(options.scienceDiscovery ?? options.scienceDiagnostics ?? options.diagnostics?.scienceDiscoverySummary),
    primaryScienceDiagnosis: normalizePrimaryScienceDiagnosis(options.primaryScienceDiagnosis ?? options.scienceDiscovery?.primaryDiagnosis ?? options.scienceDiagnostics?.primaryDiagnosis ?? options.diagnostics?.scienceDiscoverySummary?.primaryDiagnosis),
    surpriseSummary: cloneJson(options.surpriseSummary ?? options.scienceDiscovery?.surpriseSummary ?? options.scienceDiagnostics?.surpriseSummary ?? null),
    coherenceSummary: cloneJson(options.coherenceSummary ?? options.scienceDiscovery?.coherenceSummary ?? options.scienceDiagnostics?.coherenceSummary ?? null),
    forecastCorrectionSummary: cloneJson(options.forecastCorrectionSummary ?? options.forecastCorrection ?? options.scienceDiscovery?.forecastCorrection ?? options.scienceDiagnostics?.forecastCorrection ?? null),
    hiddenEventHypothesisSummary: cloneJson(options.hiddenEventHypothesisSummary ?? options.hiddenEventHypothesis ?? options.scienceDiscovery?.hiddenEventHypothesis ?? options.scienceDiagnostics?.hiddenEventHypothesis ?? null),
    diagnostics: cloneJson(options.diagnostics ?? {}),
    notes: normalizeStringList(options.notes)
  };
}

export function validateAdaptiveEvidenceSnapshot(evidence = {}) {
  const errors = [];
  const warnings = [];
  if (!evidence || typeof evidence !== 'object') {
    return { status: 'FAIL', valid: false, errors: ['Adaptive evidence snapshot must be an object.'], warnings };
  }
  if (evidence.benchmarkMode !== 'adaptiveBenchmark') errors.push('benchmarkMode must be adaptiveBenchmark.');
  if (!evidence.episodeId) errors.push('episodeId is required.');
  for (const key of numericEvidenceKeys()) {
    if (!Number.isFinite(Number(evidence[key]))) errors.push(`${key} must be finite.`);
  }
  for (const key of normalizedScoreKeys()) {
    const value = Number(evidence[key]);
    if (Number.isFinite(value) && (value < 0 || value > 1)) warnings.push(`${key} is outside [0, 1] and will be normalized by the model.`);
  }
  if (!Array.isArray(evidence.fieldsAvailable)) warnings.push('fieldsAvailable should list the layers used by the manager.');
  return {
    status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS',
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function computeAdaptiveDiagnosisScores(evidenceInput = {}, configInput = {}) {
  const evidence = createAdaptiveEvidenceSnapshot(evidenceInput);
  const config = configInput?.type === 'anchor.benchmark.adaptive-manager-config'
    ? configInput
    : createAdaptiveMissionManagerConfig(configInput);
  const thresholds = config.thresholds ?? {};
  const weights = config.weights ?? {};
  const observationStrength = clamp01(evidence.observationCount / 8, 0);
  const recentStrength = clamp01(evidence.recentObservationCount / 4, 0);
  const coherentObservationStrength = Math.max(0.2, (observationStrength + recentStrength) / 2);
  const uncertaintyScore = Math.max(evidence.meanUncertainty, evidence.maxUncertainty * 0.9);
  const surpriseScore = Math.max(evidence.meanSurprise, evidence.maxSurprise * 0.85);
  const forecastError = Math.max(evidence.forecastErrorScore, (surpriseScore + evidence.forecastErrorScore) / 2) * coherentObservationStrength;
  const hiddenPossible = Math.max(
    evidence.hiddenEventConfidence * 0.72 + surpriseScore * 0.18 + evidence.forecastErrorScore * 0.1 - evidence.noiseFalseAlarmRisk * 0.28,
    0
  );
  const hiddenLikely = Math.max(evidence.hiddenEventConfidence * 0.82 + surpriseScore * 0.12 - evidence.noiseFalseAlarmRisk * 0.22, 0);
  const agrees = Math.max(
    (1 - evidence.forecastErrorScore) * (1 - surpriseScore * 0.7) * (1 - evidence.meanUncertainty * 0.45) * (1 - evidence.hiddenEventConfidence * 0.6) * coherentObservationStrength,
    0
  );
  const insufficient = evidence.observationCount <= 0
    ? 0.86
    : evidence.recentObservationCount <= 1
      ? 0.56 * finiteMultiplier(weights.evidenceConservatism, 1)
      : Math.max(0.08, 0.32 - evidence.recentObservationCount * 0.035);
  const rawScores = {
    agreesWithForecast: agrees,
    reduceUncertainty: uncertaintyScore * (1 - evidence.hiddenEventConfidence * 0.25) * (1 - evidence.hazardPressure * 0.12),
    likelyForecastError: Math.max(forecastError * 0.75 + surpriseScore * 0.2 - evidence.noiseFalseAlarmRisk * 0.35, 0),
    possibleHiddenEvent: hiddenPossible,
    likelyHiddenEvent: hiddenLikely,
    boundaryAmbiguous: evidence.boundaryAmbiguityScore,
    staleRegionNeedsRevisit: evidence.stalenessScore,
    sourceLikelyUpstream: evidence.sourceLocalizationScore,
    hazardOrReachabilityIssue: Math.max(evidence.hazardPressure, evidence.reachabilityPressure),
    insufficientEvidence: insufficient,
    likelyNoiseOrFalseAlarm: evidence.noiseFalseAlarmRisk * (0.72 + (1 - recentStrength) * 0.2)
  };
  const weighted = {
    agreesWithForecast: rawScores.agreesWithForecast,
    reduceUncertainty: rawScores.reduceUncertainty * finiteMultiplier(weights.uncertainty, 1),
    likelyForecastError: rawScores.likelyForecastError * finiteMultiplier(weights.forecastError, 1),
    possibleHiddenEvent: rawScores.possibleHiddenEvent * finiteMultiplier(weights.hiddenEvent, 1),
    likelyHiddenEvent: rawScores.likelyHiddenEvent * finiteMultiplier(weights.hiddenEvent, 1),
    boundaryAmbiguous: rawScores.boundaryAmbiguous * finiteMultiplier(weights.boundary, 1),
    staleRegionNeedsRevisit: rawScores.staleRegionNeedsRevisit * finiteMultiplier(weights.staleness, 1),
    sourceLikelyUpstream: rawScores.sourceLikelyUpstream * finiteMultiplier(weights.sourceLocalization, 1),
    hazardOrReachabilityIssue: rawScores.hazardOrReachabilityIssue * finiteMultiplier(weights.hazard, 1),
    insufficientEvidence: rawScores.insufficientEvidence,
    likelyNoiseOrFalseAlarm: rawScores.likelyNoiseOrFalseAlarm
  };
  return Object.fromEntries(ADAPTIVE_DIAGNOSIS_IDS.map((id) => [id, roundScore(clamp01(weighted[id], 0))]));
}

export function computeAdaptiveDiagnosis(evidenceInput = {}, configInput = {}) {
  const evidence = createAdaptiveEvidenceSnapshot(evidenceInput);
  const config = configInput?.type === 'anchor.benchmark.adaptive-manager-config'
    ? configInput
    : createAdaptiveMissionManagerConfig(configInput);
  const baseScores = computeAdaptiveDiagnosisScores(evidence, config);
  const scienceOverride = scienceOverrideForEvidence(evidence);
  const scores = scienceOverride
    ? { ...baseScores, [scienceOverride.adaptiveDiagnosisId]: roundScore(Math.max(baseScores[scienceOverride.adaptiveDiagnosisId] ?? 0, scienceOverride.confidence)) }
    : baseScores;
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [scoredPrimary, scoredConfidence = 0] = entries[0] ?? ['insufficientEvidence', 0];
  const primaryDiagnosis = scienceOverride?.adaptiveDiagnosisId ?? scoredPrimary;
  const confidence = scienceOverride ? Math.max(scienceOverride.confidence, scoredConfidence) : scoredConfidence;
  const normalizedPrimary = normalizeAdaptiveDiagnosisId(primaryDiagnosis);
  const diagnosisDefinition = adaptiveDiagnosisById(normalizedPrimary);
  const recommendedTransitionId = scienceOverride?.recommendedTransitionId ?? transitionForDiagnosis(normalizedPrimary, evidence.activeObjectiveId);
  const recommendedObjectiveId = scienceOverride?.recommendedObjectiveId ?? objectiveForDiagnosis(normalizedPrimary, evidence.activeObjectiveId);
  const secondaryDiagnoses = entries
    .slice(1)
    .filter(([, score]) => score >= Math.max(0.25, confidence - 0.28))
    .slice(0, 3)
    .map(([id, score]) => ({
      id,
      label: adaptiveDiagnosisById(id).label,
      score
    }));
  const diagnosis = {
    type: 'anchor.benchmark.adaptive-diagnosis',
    version: ADAPTIVE_DIAGNOSIS_MODEL_VERSION,
    benchmarkMode: 'adaptiveBenchmark',
    episodeId: evidence.episodeId,
    time: evidence.time,
    primaryDiagnosis: normalizedPrimary,
    primaryDiagnosisLabel: diagnosisDefinition.label,
    secondaryDiagnoses,
    scores,
    confidence: roundScore(confidence),
    recommendedTransitionId,
    recommendedObjectiveId,
    recommendedResponse: recommendedResponseForTransition(recommendedTransitionId),
    primaryScienceDiagnosis: scienceOverride?.scienceDiagnosisId ?? evidence.primaryScienceDiagnosis ?? evidence.scienceDiscovery?.primaryDiagnosis ?? null,
    primaryScienceDiagnosisLabel: scienceOverride?.scienceDiagnosisId ? scienceDiagnosisLabel(scienceOverride.scienceDiagnosisId) : null,
    scienceDiagnosisClass: scienceOverride?.diagnosisClass ?? (evidence.primaryScienceDiagnosis ? classifyScienceDiagnosis(evidence.primaryScienceDiagnosis) : null),
    scienceDiscovery: scienceOverride?.summary ?? evidence.scienceDiscovery ?? null,
    forecastCorrectionSummary: evidence.forecastCorrectionSummary ?? scienceOverride?.summary?.forecastCorrection ?? null,
    hiddenEventHypothesisSummary: evidence.hiddenEventHypothesisSummary ?? scienceOverride?.summary?.hiddenEventHypothesis ?? null,
    rationale: scienceOverride ? scienceAdaptiveDiagnosisExplanation({ scienceOverride, primaryDiagnosis: normalizedPrimary, scores, evidence, confidence }) : adaptiveDiagnosisExplanation({ primaryDiagnosis: normalizedPrimary, scores, evidence, confidence }),
    warnings: diagnosisWarnings(normalizedPrimary, evidence, config, scienceOverride)
  };
  return diagnosis;
}

export function adaptiveDiagnosisExplanation(diagnosisInput = {}) {
  const id = normalizeAdaptiveDiagnosisId(diagnosisInput.primaryDiagnosis ?? diagnosisInput.id);
  const label = adaptiveDiagnosisById(id).label;
  const evidence = diagnosisInput.evidence ?? {};
  const scores = diagnosisInput.scores ?? {};
  const score = Number.isFinite(Number(scores[id])) ? Number(scores[id]) : Number(diagnosisInput.confidence ?? 0);
  const component = DIAGNOSIS_COMPONENTS[id] ?? 'evidence';
  const activeObjective = evidence.activeObjectiveId ? ` Active objective: ${evidence.activeObjectiveId}.` : '';
  return `${label}: ${component} is the strongest transparent rule signal (score ${score.toFixed(2)}).${activeObjective} This is an educational rule diagnosis, not Bayesian inference or production data assimilation.`;
}

function scienceOverrideForEvidence(evidence = {}) {
  const source = evidence.scienceDiscovery ?? evidence.scienceDiagnostics ?? null;
  const summary = source ? scienceDiscoverySummary(source) : null;
  const scienceDiagnosisId = normalizePrimaryScienceDiagnosis(evidence.primaryScienceDiagnosis ?? summary?.primaryDiagnosis ?? source?.primaryDiagnosis);
  if (!scienceDiagnosisId) return null;
  const adaptiveDiagnosisId = adaptiveDiagnosisForScience(scienceDiagnosisId);
  const confidence = clamp01(summary?.confidence ?? source?.confidence ?? evidence.coherenceSummary?.evidenceConfidence ?? 0.55, 0.55);
  const recommendedObjectiveId = summary?.recommendedObjectiveId ?? recommendedObjectiveForScienceDiagnosis(scienceDiagnosisId, {
    currentObjectiveId: evidence.activeObjectiveId,
    eventFamily: source?.hiddenEventHypothesis?.eventFamily ?? evidence.hiddenEventHypothesisSummary?.eventFamily
  });
  return {
    scienceDiagnosisId,
    adaptiveDiagnosisId,
    confidence,
    diagnosisClass: classifyScienceDiagnosis(scienceDiagnosisId),
    recommendedObjectiveId,
    recommendedTransitionId: scienceTransitionForObjective(scienceDiagnosisId, recommendedObjectiveId, evidence.activeObjectiveId),
    summary
  };
}

function adaptiveDiagnosisForScience(scienceDiagnosisId) {
  const normalized = normalizeScienceDiagnosisId(scienceDiagnosisId);
  if (normalized === 'agreesWithForecast') return 'agreesWithForecast';
  if (['forecastDisplacement', 'forecastIntensityError', 'forecastTimingError', 'forecastDepthMismatch', 'boundaryShift'].includes(normalized)) return 'likelyForecastError';
  if (normalized === 'possibleHiddenEvent') return 'possibleHiddenEvent';
  if (normalized === 'likelyHiddenEvent' || normalized === 'hiddenEventConfirmed') return 'likelyHiddenEvent';
  if (normalized === 'mixedForecastErrorAndHiddenEvent') return 'possibleHiddenEvent';
  if (normalized === 'likelySensorNoise') return 'likelyNoiseOrFalseAlarm';
  return 'insufficientEvidence';
}

function scienceTransitionForObjective(scienceDiagnosisId, recommendedObjectiveId, activeObjectiveId) {
  const normalized = normalizeScienceDiagnosisId(scienceDiagnosisId);
  if (normalized === 'agreesWithForecast') return activeObjectiveId === 'exploitKnownValue' ? 'keepCurrentObjective' : 'switchToExploitKnownValue';
  if (normalized === 'likelySensorNoise' || normalized === 'insufficientEvidence') return 'pauseForMoreEvidence';
  return {
    reduceUncertainty: 'switchToReduceUncertainty',
    validateForecast: 'switchToValidateForecast',
    confirmHiddenEvent: 'switchToConfirmHiddenEvent',
    mapBoundary: 'switchToMapBoundary',
    trackFeature: 'switchToTrackFeature',
    localizeSource: 'switchToLocalizeSource',
    revisitStaleRegion: 'switchToRevisitStaleRegion',
    exploitKnownValue: 'switchToExploitKnownValue'
  }[recommendedObjectiveId] ?? 'keepCurrentObjective';
}

function scienceAdaptiveDiagnosisExplanation({ scienceOverride, primaryDiagnosis, scores, evidence, confidence }) {
  const scienceLabel = scienceDiagnosisLabel(scienceOverride.scienceDiagnosisId);
  const base = adaptiveDiagnosisExplanation({ primaryDiagnosis, scores, evidence, confidence });
  return `${base} P9 science discovery primary diagnosis is ${scienceLabel}; forecast-correction and hidden-event states are educational summaries, not production data assimilation.`;
}
function transitionForDiagnosis(id, activeObjectiveId) {
  const current = String(activeObjectiveId ?? 'reconnaissanceSurvey');
  if (id === 'agreesWithForecast') return current === 'exploitKnownValue' ? 'keepCurrentObjective' : 'switchToExploitKnownValue';
  return {
    reduceUncertainty: 'switchToReduceUncertainty',
    likelyForecastError: 'switchToValidateForecast',
    possibleHiddenEvent: 'switchToConfirmHiddenEvent',
    likelyHiddenEvent: 'switchToConfirmHiddenEvent',
    boundaryAmbiguous: 'switchToMapBoundary',
    staleRegionNeedsRevisit: 'switchToRevisitStaleRegion',
    sourceLikelyUpstream: 'switchToLocalizeSource',
    hazardOrReachabilityIssue: 'keepCurrentObjective',
    insufficientEvidence: 'pauseForMoreEvidence',
    likelyNoiseOrFalseAlarm: 'pauseForMoreEvidence'
  }[id] ?? 'keepCurrentObjective';
}

function objectiveForDiagnosis(id, activeObjectiveId) {
  if (id === 'agreesWithForecast') return activeObjectiveId === 'exploitKnownValue' ? activeObjectiveId : 'exploitKnownValue';
  return {
    reduceUncertainty: 'reduceUncertainty',
    likelyForecastError: 'validateForecast',
    possibleHiddenEvent: 'confirmHiddenEvent',
    likelyHiddenEvent: 'confirmHiddenEvent',
    boundaryAmbiguous: 'mapBoundary',
    staleRegionNeedsRevisit: 'revisitStaleRegion',
    sourceLikelyUpstream: 'localizeSource',
    hazardOrReachabilityIssue: activeObjectiveId ?? 'reconnaissanceSurvey',
    insufficientEvidence: activeObjectiveId ?? 'reconnaissanceSurvey',
    likelyNoiseOrFalseAlarm: activeObjectiveId ?? 'reconnaissanceSurvey'
  }[id] ?? activeObjectiveId ?? 'reconnaissanceSurvey';
}

function recommendedResponseForTransition(transitionId) {
  return {
    keepCurrentObjective: 'Keep the current objective and flag route-risk context for the player or solver.',
    switchToReduceUncertainty: 'Recommend an uncertainty-reduction objective before committing to exploitation.',
    switchToValidateForecast: 'Recommend forecast-validation sampling where observations disagree with belief.',
    switchToConfirmHiddenEvent: 'Recommend follow-up samples to confirm or reject a hidden event.',
    switchToMapBoundary: 'Recommend boundary mapping around the ambiguous front or event edge.',
    switchToTrackFeature: 'Recommend tracking the evolving feature in later adaptive execution.',
    switchToLocalizeSource: 'Recommend source-localization sampling near upstream evidence.',
    switchToRevisitStaleRegion: 'Recommend revisiting high-value stale regions.',
    switchToExploitKnownValue: 'Recommend exploiting known high-value regions.',
    pauseForMoreEvidence: 'Pause objective switching until more reliable evidence arrives.'
  }[transitionId] ?? 'Keep the current objective.';
}

function diagnosisWarnings(id, evidence, config, scienceOverride = null) {
  const warnings = [];
  if (id === 'hazardOrReachabilityIssue') warnings.push('Hazard or reachability pressure is high; route choice remains outside the P6 mission-manager contract.');
  if (id === 'insufficientEvidence') warnings.push('Evidence is too sparse for a confident objective switch.');
  if (id === 'likelyNoiseOrFalseAlarm') warnings.push('Noise or false-alarm risk is high; the manager avoids overreacting to weak evidence.');
  if (scienceOverride) warnings.push('P9 science discovery diagnostics are transparent educational heuristics, not production data assimilation.');
  if (scienceOverride?.scienceDiagnosisId === 'mixedForecastErrorAndHiddenEvent') warnings.push('Forecast correction and hidden-event explanations both remain plausible; confirm the event before treating it as a new source.');
  if (evidence.hazardPressure >= Number(config.thresholds?.hazardPressure ?? 0.65)) warnings.push('High hazard pressure should be handled by the route planner or player in a later phase.');
  return warnings;
}

function normalizeScienceDiscovery(value) {
  if (!value || typeof value !== 'object') return null;
  return cloneJson(value.discoverySummary ? value : scienceDiscoverySummary(value));
}

function normalizePrimaryScienceDiagnosis(value) {
  if (!value) return null;
  return normalizeScienceDiagnosisId(value, null);
}
function numericEvidenceKeys() {
  return ['time', 'observationCount', 'recentObservationCount', ...normalizedScoreKeys()];
}

function normalizedScoreKeys() {
  return [
    'meanUncertainty',
    'maxUncertainty',
    'meanSurprise',
    'maxSurprise',
    'forecastErrorScore',
    'hiddenEventConfidence',
    'noiseFalseAlarmRisk',
    'boundaryAmbiguityScore',
    'stalenessScore',
    'sourceLocalizationScore',
    'hazardPressure',
    'reachabilityPressure'
  ];
}

function normalizeStringList(value) {
  return Array.isArray(value)
    ? value.map((entry) => String(entry ?? '').trim()).filter(Boolean)
    : [];
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function finiteMultiplier(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
}

function clamp01(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : fallback;
}

function roundScore(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(4)) : 0;
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}





