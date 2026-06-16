export const SCIENCE_DIAGNOSIS_TYPES_VERSION = 'science-diagnosis-types-p9';

export const SCIENCE_RECORD_TYPES = Object.freeze([
  'anchor.science.forecast-correction',
  'anchor.science.hidden-event-hypothesis',
  'anchor.science.discovery-update',
  'anchor.science.discovery-state',
  'anchor.headless.science-diagnostics'
]);

export const FORECAST_CORRECTION_DIAGNOSIS_IDS = Object.freeze([
  'agreesWithForecast',
  'forecastDisplacement',
  'forecastIntensityError',
  'forecastTimingError',
  'forecastDepthMismatch',
  'boundaryShift'
]);

export const HIDDEN_EVENT_HYPOTHESIS_IDS = Object.freeze([
  'insufficientEvidence',
  'possibleHiddenEvent',
  'likelyHiddenEvent',
  'hiddenEventConfirmed',
  'likelySensorNoise',
  'mixedForecastErrorAndHiddenEvent'
]);

export const SCIENCE_DIAGNOSIS_IDS = Object.freeze([
  ...FORECAST_CORRECTION_DIAGNOSIS_IDS,
  ...HIDDEN_EVENT_HYPOTHESIS_IDS
]);

export const SCIENCE_DIAGNOSIS_LABELS = Object.freeze({
  agreesWithForecast: 'Agrees With Forecast',
  forecastDisplacement: 'Forecast Displacement',
  forecastIntensityError: 'Forecast Intensity Error',
  forecastTimingError: 'Forecast Timing Error',
  forecastDepthMismatch: 'Forecast Depth Mismatch',
  boundaryShift: 'Boundary Shift',
  insufficientEvidence: 'Insufficient Evidence',
  possibleHiddenEvent: 'Possible Hidden Event',
  likelyHiddenEvent: 'Likely Hidden Event',
  hiddenEventConfirmed: 'Hidden Event Confirmed',
  likelySensorNoise: 'Likely Sensor Noise',
  mixedForecastErrorAndHiddenEvent: 'Mixed Forecast Error And Hidden Event'
});

const DIAGNOSIS_ALIASES = Object.freeze({
  forecastError: 'forecastIntensityError',
  likelyForecastError: 'forecastIntensityError',
  intensityError: 'forecastIntensityError',
  displacement: 'forecastDisplacement',
  displacedForecast: 'forecastDisplacement',
  timingError: 'forecastTimingError',
  depthMismatch: 'forecastDepthMismatch',
  boundaryAmbiguous: 'boundaryShift',
  boundaryError: 'boundaryShift',
  possibleHiddenPlume: 'possibleHiddenEvent',
  hiddenPlumeCandidate: 'possibleHiddenEvent',
  likelyHiddenPlume: 'likelyHiddenEvent',
  sourceLikelyUpstream: 'hiddenEventConfirmed',
  confirmedHiddenEvent: 'hiddenEventConfirmed',
  likelyNoiseOrFalseAlarm: 'likelySensorNoise',
  falseAlarm: 'likelySensorNoise',
  noise: 'likelySensorNoise',
  mixed: 'mixedForecastErrorAndHiddenEvent'
});

export function normalizeScienceDiagnosisId(id, fallback = 'insufficientEvidence') {
  const value = String(id ?? '').trim();
  if (SCIENCE_DIAGNOSIS_IDS.includes(value)) return value;
  return DIAGNOSIS_ALIASES[value] ?? fallback;
}

export function scienceDiagnosisLabel(id) {
  const normalized = normalizeScienceDiagnosisId(id);
  return SCIENCE_DIAGNOSIS_LABELS[normalized] ?? SCIENCE_DIAGNOSIS_LABELS.insufficientEvidence;
}

export function isForecastCorrectionDiagnosis(id) {
  return FORECAST_CORRECTION_DIAGNOSIS_IDS.includes(normalizeScienceDiagnosisId(id));
}

export function isHiddenEventHypothesisDiagnosis(id) {
  return HIDDEN_EVENT_HYPOTHESIS_IDS.includes(normalizeScienceDiagnosisId(id));
}

export function classifyScienceDiagnosis(id) {
  const normalized = normalizeScienceDiagnosisId(id);
  if (normalized === 'agreesWithForecast') return 'forecastAgreement';
  if (normalized === 'insufficientEvidence') return 'insufficientEvidence';
  if (normalized === 'likelySensorNoise') return 'sensorNoise';
  if (normalized === 'mixedForecastErrorAndHiddenEvent') return 'mixed';
  if (FORECAST_CORRECTION_DIAGNOSIS_IDS.includes(normalized)) return 'forecastCorrection';
  if (HIDDEN_EVENT_HYPOTHESIS_IDS.includes(normalized)) return 'hiddenEventHypothesis';
  return 'unknown';
}

export function recommendedObjectiveForScienceDiagnosis(id, context = {}) {
  const normalized = normalizeScienceDiagnosisId(id);
  if (normalized === 'agreesWithForecast') return context.currentObjectiveId ?? 'reconnaissanceSurvey';
  if (['forecastDisplacement', 'forecastIntensityError', 'forecastTimingError', 'forecastDepthMismatch'].includes(normalized)) return 'validateForecast';
  if (normalized === 'boundaryShift') return 'mapBoundary';
  if (normalized === 'possibleHiddenEvent' || normalized === 'likelyHiddenEvent') return 'confirmHiddenEvent';
  if (normalized === 'hiddenEventConfirmed') return sourceLikeEventFamily(context.eventFamily) ? 'localizeSource' : 'mapBoundary';
  if (normalized === 'mixedForecastErrorAndHiddenEvent') return 'confirmHiddenEvent';
  if (normalized === 'likelySensorNoise' || normalized === 'insufficientEvidence') return context.currentObjectiveId ?? 'reconnaissanceSurvey';
  return context.currentObjectiveId ?? 'reconnaissanceSurvey';
}

export function scienceDiagnosisDescriptor(id, context = {}) {
  const diagnosisId = normalizeScienceDiagnosisId(id);
  return {
    diagnosisId,
    label: scienceDiagnosisLabel(diagnosisId),
    class: classifyScienceDiagnosis(diagnosisId),
    recommendedObjectiveId: recommendedObjectiveForScienceDiagnosis(diagnosisId, context),
    publicSafe: true,
    notA: scienceBoundaryNotA()
  };
}

export function scienceBoundaryNotA() {
  return [
    'not production data assimilation',
    'not calibrated ocean forecast',
    'not hidden-truth oracle for public planning',
    'not MARL/RL',
    'not a new planner'
  ];
}

export function validateScienceRecordType(type) {
  const ok = SCIENCE_RECORD_TYPES.includes(type);
  return {
    ok,
    status: ok ? 'PASS' : 'FAIL',
    type: ok ? type : null,
    errors: ok ? [] : [`Unknown P9 science record type: ${type ?? 'missing'}.`]
  };
}

function sourceLikeEventFamily(value) {
  return /source|plume|release|river|oil|chemical|spill/i.test(String(value ?? ''));
}
