import { normalizeScienceDiagnosisId, recommendedObjectiveForScienceDiagnosis, scienceBoundaryNotA } from './ScienceDiagnosisTypes.js';

export const HIDDEN_EVENT_HYPOTHESIS_STATE_VERSION = 'hidden-event-hypothesis-state-p9';

export const HIDDEN_EVENT_HYPOTHESIS_STATUSES = Object.freeze([
  'notStarted',
  'collectingEvidence',
  'hypothesisCandidate',
  'hypothesisLikely',
  'confirmed',
  'rejected',
  'falseAlarmLikely'
]);

export function createHiddenEventHypothesisState(options = {}) {
  const diagnosisId = normalizeScienceDiagnosisId(options.diagnosisId ?? options.primaryDiagnosis ?? 'insufficientEvidence');
  return {
    type: 'anchor.science.hidden-event-hypothesis',
    version: HIDDEN_EVENT_HYPOTHESIS_STATE_VERSION,
    hypothesisId: String(options.hypothesisId ?? `hypothesis-${diagnosisId}`),
    status: normalizeStatus(options.status ?? 'notStarted'),
    diagnosisId,
    confidence: clamp01(options.confidence, 0),
    evidenceCount: Math.max(0, Math.round(Number(options.evidenceCount ?? 0) || 0)),
    eventFamily: String(options.eventFamily ?? 'unknownAnomaly'),
    regionEstimate: normalizeRegion(options.regionEstimate),
    recommendedObjectiveId: options.recommendedObjectiveId ?? recommendedObjectiveForScienceDiagnosis(diagnosisId, options),
    publicSafe: true,
    usesProductionDataAssimilation: false,
    usesCalibratedOceanForecast: false,
    notes: normalizeStringList(options.notes),
    notA: scienceBoundaryNotA()
  };
}

export function updateHiddenEventHypothesisState(previous = {}, evidence = {}, options = {}) {
  const diagnosisId = normalizeScienceDiagnosisId(options.diagnosisId ?? evidence.primaryDiagnosis ?? evidence.diagnosisId ?? previous.diagnosisId ?? 'insufficientEvidence');
  const confidence = clamp01(options.confidence ?? evidence.evidenceConfidence ?? evidence.confidence ?? previous.confidence, 0);
  const evidenceCount = Math.max(0, Math.round(Number(options.evidenceCount ?? evidence.highSurpriseCount ?? evidence.observationCount ?? previous.evidenceCount ?? 0) || 0));
  const explainedByForecastError = Boolean(options.explainedByForecastError ?? evidence.explainedByForecastError);
  const contradictory = Boolean(options.contradictoryEvidence ?? evidence.contradictoryEvidence);
  let status = normalizeStatus(previous.status ?? 'notStarted');

  if (diagnosisId === 'likelySensorNoise') status = 'falseAlarmLikely';
  else if (diagnosisId === 'insufficientEvidence') status = evidenceCount ? 'collectingEvidence' : 'notStarted';
  else if (contradictory) status = 'rejected';
  else if (explainedByForecastError && diagnosisId !== 'hiddenEventConfirmed') status = 'collectingEvidence';
  else if (diagnosisId === 'hiddenEventConfirmed' || (confidence >= 0.84 && evidenceCount >= 4)) status = 'confirmed';
  else if (diagnosisId === 'likelyHiddenEvent' || confidence >= 0.66) status = 'hypothesisLikely';
  else if (diagnosisId === 'possibleHiddenEvent' || confidence >= 0.38) status = 'hypothesisCandidate';
  else status = 'collectingEvidence';

  return createHiddenEventHypothesisState({
    ...previous,
    status: options.status ?? status,
    diagnosisId,
    confidence,
    evidenceCount,
    eventFamily: options.eventFamily ?? evidence.eventFamily ?? previous.eventFamily ?? 'unknownAnomaly',
    regionEstimate: options.regionEstimate ?? evidence.regionEstimate ?? previous.regionEstimate,
    recommendedObjectiveId: recommendedObjectiveForScienceDiagnosis(diagnosisId, { ...options, eventFamily: options.eventFamily ?? evidence.eventFamily ?? previous.eventFamily }),
    notes: mergeUnique([...(previous.notes ?? []), ...(options.notes ?? []), 'Hidden event hypothesis means observations may indicate a phenomenon not represented in the forecast.'])
  });
}

export function hiddenEventHypothesisSummary(state = {}) {
  const normalized = createHiddenEventHypothesisState(state);
  return {
    type: normalized.type,
    hypothesisId: normalized.hypothesisId,
    status: normalized.status,
    diagnosisId: normalized.diagnosisId,
    confidence: normalized.confidence,
    evidenceCount: normalized.evidenceCount,
    eventFamily: normalized.eventFamily,
    recommendedObjectiveId: normalized.recommendedObjectiveId,
    publicSafe: true,
    usesProductionDataAssimilation: false,
    usesCalibratedOceanForecast: false
  };
}

function normalizeRegion(region = null) {
  if (!region || typeof region !== 'object') return null;
  return {
    x: finiteOrNull(region.x ?? region.cx),
    y: finiteOrNull(region.y ?? region.cy),
    radius: finiteOrNull(region.radius ?? region.r),
    note: region.note ? String(region.note) : 'Public-safe approximate region only.'
  };
}

function normalizeStatus(value) { return HIDDEN_EVENT_HYPOTHESIS_STATUSES.includes(value) ? value : 'notStarted'; }
function normalizeStringList(value) { return Array.isArray(value) ? value.map((entry) => String(entry ?? '').trim()).filter(Boolean) : []; }
function mergeUnique(values) { return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value ?? '').trim()).filter(Boolean))]; }
function clamp01(value, fallback = 0) { const number = Number(value); return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : fallback; }
function finiteOrNull(value) { const number = Number(value); return Number.isFinite(number) ? Number(number.toFixed(4)) : null; }
