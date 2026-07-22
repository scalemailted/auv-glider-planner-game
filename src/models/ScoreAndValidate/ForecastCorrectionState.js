const ScienceDiagnosisTypes = require('./ScienceDiagnosisTypes.js')
const FORECAST_CORRECTION_STATE_VERSION = 'forecast-correction-state-p9';

 const FORECAST_CORRECTION_STATUSES = Object.freeze([
  'notStarted',
  'collectingEvidence',
  'correctionCandidate',
  'correctionActive',
  'correctionRejected',
  'correctionValidated'
]);

 function createForecastCorrectionState(options = {}) {
  const diagnosisId = ScienceDiagnosisTypes.normalizeScienceDiagnosisId(options.diagnosisId ?? options.primaryDiagnosis ?? 'agreesWithForecast');
  return {
    type: 'anchor.science.forecast-correction',
    stateType: 'anchor.science.forecast-correction-state',
    version: FORECAST_CORRECTION_STATE_VERSION,
    status: normalizeStatus(options.status ?? 'notStarted'),
    diagnosisId,
    confidence: clamp01(options.confidence, 0),
    evidenceCount: Math.max(0, Math.round(Number(options.evidenceCount ?? 0) || 0)),
    correction: normalizeCorrection(options.correction ?? options),
    recommendedObjectiveId: options.recommendedObjectiveId ?? ScienceDiagnosisTypes.recommendedObjectiveForScienceDiagnosis(diagnosisId, options),
    publicSafe: true,
    usesProductionDataAssimilation: false,
    usesCalibratedOceanForecast: false,
    notes: normalizeStringList(options.notes),
    notA: ScienceDiagnosisTypes.scienceBoundaryNotA()
  };
}

 function updateForecastCorrectionState(previous = {}, evidence = {}, options = {}) {
  const diagnosisId = ScienceDiagnosisTypes.normalizeScienceDiagnosisId(options.diagnosisId ?? evidence.primaryDiagnosis ?? evidence.diagnosisId ?? previous.diagnosisId ?? 'agreesWithForecast');
  const confidence = clamp01(options.confidence ?? evidence.evidenceConfidence ?? evidence.confidence ?? previous.confidence, 0);
  const evidenceCount = Math.max(0, Math.round(Number(options.evidenceCount ?? evidence.highSurpriseCount ?? evidence.observationCount ?? previous.evidenceCount ?? 0) || 0));
  const priorStatus = normalizeStatus(previous.status ?? 'notStarted');
  const forecastLike = ['forecastDisplacement', 'forecastIntensityError', 'forecastTimingError', 'forecastDepthMismatch', 'boundaryShift'].includes(diagnosisId);
  let status = priorStatus;
  if (!forecastLike && diagnosisId === 'agreesWithForecast') status = confidence >= 0.6 ? 'correctionValidated' : 'collectingEvidence';
  else if (!forecastLike) status = priorStatus === 'correctionActive' ? 'correctionRejected' : 'collectingEvidence';
  else if (confidence >= 0.78 && evidenceCount >= 4) status = 'correctionActive';
  else if (confidence >= 0.45 && evidenceCount >= 2) status = 'correctionCandidate';
  else status = 'collectingEvidence';

  return createForecastCorrectionState({
    ...previous,
    status: options.status ?? status,
    diagnosisId,
    confidence,
    evidenceCount,
    correction: classifyForecastCorrection({ ...evidence, diagnosisId }, options),
    recommendedObjectiveId: ScienceDiagnosisTypes.recommendedObjectiveForScienceDiagnosis(diagnosisId, options),
    notes: mergeUnique([...(previous.notes ?? []), ...(options.notes ?? []), 'Forecast correction means the expected field existed but was wrong.'])
  });
}

 function classifyForecastCorrection(evidence = {}, options = {}) {
  const diagnosisId = ScienceDiagnosisTypes.normalizeScienceDiagnosisId(evidence.diagnosisId ?? evidence.primaryDiagnosis ?? options.diagnosisId ?? 'forecastIntensityError');
  const kind = {
    forecastDisplacement: 'spatialOffset',
    forecastIntensityError: 'intensityBias',
    forecastTimingError: 'timingOffset',
    forecastDepthMismatch: 'depthLayerMismatch',
    boundaryShift: 'boundaryOffset',
    agreesWithForecast: 'none'
  }[diagnosisId] ?? 'none';
  const direction = evidence.meanInnovation == null
    ? null
    : Number(evidence.meanInnovation) > 0
      ? 'forecastTooLow'
      : Number(evidence.meanInnovation) < 0
        ? 'forecastTooHigh'
        : 'neutral';
  return {
    kind,
    direction,
    magnitudeHint: finiteOrNull(evidence.meanAbsInnovation ?? evidence.meanSurprise),
    publicSafe: true,
    note: 'Transparent educational correction state only; no field assimilation is applied.'
  };
}

 function forecastCorrectionSummary(state = {}) {
  const normalized = createForecastCorrectionState(state);
  return {
    type: normalized.type,
    stateType: normalized.stateType,
    status: normalized.status,
    diagnosisId: normalized.diagnosisId,
    confidence: normalized.confidence,
    evidenceCount: normalized.evidenceCount,
    correctionKind: normalized.correction?.kind ?? null,
    recommendedObjectiveId: normalized.recommendedObjectiveId,
    publicSafe: true,
    usesProductionDataAssimilation: false,
    usesCalibratedOceanForecast: false
  };
}

function normalizeCorrection(value = {}) {
  return {
    kind: String(value.kind ?? 'none'),
    direction: value.direction ?? null,
    magnitudeHint: finiteOrNull(value.magnitudeHint),
    publicSafe: value.publicSafe !== false,
    note: value.note ?? 'Transparent educational correction state only; no field assimilation is applied.'
  };
}

function normalizeStatus(value) { return FORECAST_CORRECTION_STATUSES.includes(value) ? value : 'notStarted'; }
function normalizeStringList(value) { return Array.isArray(value) ? value.map((entry) => String(entry ?? '').trim()).filter(Boolean) : []; }
function mergeUnique(values) { return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value ?? '').trim()).filter(Boolean))]; }
function clamp01(value, fallback = 0) { const number = Number(value); return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : fallback; }
function finiteOrNull(value) { const number = Number(value); return Number.isFinite(number) ? Number(number.toFixed(4)) : null; }

module.exports = {FORECAST_CORRECTION_STATE_VERSION, FORECAST_CORRECTION_STATUSES, createForecastCorrectionState, updateForecastCorrectionState, classifyForecastCorrection, forecastCorrectionSummary}