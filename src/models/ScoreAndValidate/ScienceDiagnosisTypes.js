 const SCIENCE_DIAGNOSIS_TYPES_VERSION = 'science-diagnosis-types-p9';

 const SCIENCE_RECORD_TYPES = Object.freeze([
  'anchor.science.forecast-correction',
  'anchor.science.hidden-event-hypothesis',
  'anchor.science.discovery-update',
  'anchor.science.discovery-state',
  'anchor.headless.science-diagnostics'
]);

 const FORECAST_CORRECTION_DIAGNOSIS_IDS = Object.freeze([
  'agreesWithForecast',
  'forecastDisplacement',
  'forecastIntensityError',
  'forecastTimingError',
  'forecastDepthMismatch',
  'boundaryShift'
]);

 const HIDDEN_EVENT_HYPOTHESIS_IDS = Object.freeze([
  'insufficientEvidence',
  'possibleHiddenEvent',
  'likelyHiddenEvent',
  'hiddenEventConfirmed',
  'likelySensorNoise',
  'mixedForecastErrorAndHiddenEvent',
  'hiddenBloomLayer',
  'thermoclineLayerEvent',
  'deepPlumeHypothesis',
  'surfaceOnlyMissedSubsurfaceFeature',
  'insufficientVerticalCoverage'
]);

 const SCIENCE_DIAGNOSIS_IDS = Object.freeze([
  ...FORECAST_CORRECTION_DIAGNOSIS_IDS,
  ...HIDDEN_EVENT_HYPOTHESIS_IDS
]);

 const SCIENCE_DIAGNOSIS_LABELS = Object.freeze({
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
  mixedForecastErrorAndHiddenEvent: 'Mixed Forecast Error And Hidden Event',
  hiddenBloomLayer: 'Hidden Bloom Layer',
  thermoclineLayerEvent: 'Thermocline Layer Event',
  deepPlumeHypothesis: 'Deep Plume Hypothesis',
  surfaceOnlyMissedSubsurfaceFeature: 'Surface-Only Missed Subsurface Feature',
  insufficientVerticalCoverage: 'Insufficient Vertical Coverage'
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
  mixed: 'mixedForecastErrorAndHiddenEvent',
  hiddenSubsurfaceBloom: 'hiddenBloomLayer',
  thermoclineEvent: 'thermoclineLayerEvent',
  deepPlume: 'deepPlumeHypothesis',
  surfaceMissedSubsurface: 'surfaceOnlyMissedSubsurfaceFeature',
  verticalCoverageSparse: 'insufficientVerticalCoverage'
});

 function normalizeScienceDiagnosisId(id, fallback = 'insufficientEvidence') {
  const value = String(id ?? '').trim();
  if (SCIENCE_DIAGNOSIS_IDS.includes(value)) return value;
  return DIAGNOSIS_ALIASES[value] ?? fallback;
}

 function scienceDiagnosisLabel(id) {
  const normalized = normalizeScienceDiagnosisId(id);
  return SCIENCE_DIAGNOSIS_LABELS[normalized] ?? SCIENCE_DIAGNOSIS_LABELS.insufficientEvidence;
}

 function isForecastCorrectionDiagnosis(id) {
  return FORECAST_CORRECTION_DIAGNOSIS_IDS.includes(normalizeScienceDiagnosisId(id));
}

 function isHiddenEventHypothesisDiagnosis(id) {
  return HIDDEN_EVENT_HYPOTHESIS_IDS.includes(normalizeScienceDiagnosisId(id));
}

 function classifyScienceDiagnosis(id) {
  const normalized = normalizeScienceDiagnosisId(id);
  if (normalized === 'agreesWithForecast') return 'forecastAgreement';
  if (normalized === 'insufficientEvidence') return 'insufficientEvidence';
  if (normalized === 'likelySensorNoise') return 'sensorNoise';
  if (['hiddenBloomLayer', 'thermoclineLayerEvent', 'deepPlumeHypothesis', 'surfaceOnlyMissedSubsurfaceFeature'].includes(normalized)) return 'hiddenEventHypothesis';
  if (normalized === 'insufficientVerticalCoverage') return 'insufficientEvidence';
  if (normalized === 'mixedForecastErrorAndHiddenEvent') return 'mixed';
  if (FORECAST_CORRECTION_DIAGNOSIS_IDS.includes(normalized)) return 'forecastCorrection';
  if (HIDDEN_EVENT_HYPOTHESIS_IDS.includes(normalized)) return 'hiddenEventHypothesis';
  return 'unknown';
}

 function recommendedObjectiveForScienceDiagnosis(id, context = {}) {
  const normalized = normalizeScienceDiagnosisId(id);
  if (normalized === 'agreesWithForecast') return context.currentObjectiveId ?? 'reconnaissanceSurvey';
  if (['forecastDisplacement', 'forecastIntensityError', 'forecastTimingError', 'forecastDepthMismatch'].includes(normalized)) return 'validateForecast';
  if (normalized === 'boundaryShift') return 'mapBoundary';
  if (normalized === 'possibleHiddenEvent' || normalized === 'likelyHiddenEvent' || normalized === 'hiddenBloomLayer' || normalized === 'thermoclineLayerEvent' || normalized === 'deepPlumeHypothesis' || normalized === 'surfaceOnlyMissedSubsurfaceFeature') return 'confirmHiddenEvent';
  if (normalized === 'hiddenEventConfirmed') return sourceLikeEventFamily(context.eventFamily) ? 'localizeSource' : 'mapBoundary';
  if (normalized === 'mixedForecastErrorAndHiddenEvent') return 'confirmHiddenEvent';
  if (normalized === 'likelySensorNoise' || normalized === 'insufficientEvidence' || normalized === 'insufficientVerticalCoverage') return context.currentObjectiveId ?? 'reconnaissanceSurvey';
  return context.currentObjectiveId ?? 'reconnaissanceSurvey';
}

 function scienceDiagnosisDescriptor(id, context = {}) {
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

 function scienceBoundaryNotA() {
  return [
    'not production data assimilation',
    'not calibrated ocean forecast',
    'not hidden-truth oracle for public planning',
    'not MARL/RL',
    'not a new planner'
  ];
}

 function validateScienceRecordType(type) {
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

module.exports = {SCIENCE_DIAGNOSIS_TYPES_VERSION, SCIENCE_RECORD_TYPES, FORECAST_CORRECTION_DIAGNOSIS_IDS, HIDDEN_EVENT_HYPOTHESIS_IDS, SCIENCE_DIAGNOSIS_IDS, SCIENCE_DIAGNOSIS_LABELS, normalizeScienceDiagnosisId, scienceDiagnosisLabel, isForecastCorrectionDiagnosis, isHiddenEventHypothesisDiagnosis, classifyScienceDiagnosis, recommendedObjectiveForScienceDiagnosis, scienceDiagnosisDescriptor, scienceBoundaryNotA, validateScienceRecordType}