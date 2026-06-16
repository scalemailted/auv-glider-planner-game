import { computeObservationSurpriseBatch, observationSurpriseSummary } from './ObservationSurpriseModel.js';
import { computeEvidenceCoherence, evidenceCoherenceSummary } from './EvidenceCoherenceModel.js';
import { createForecastCorrectionState, forecastCorrectionSummary, updateForecastCorrectionState } from './ForecastCorrectionState.js';
import { createHiddenEventHypothesisState, hiddenEventHypothesisSummary, updateHiddenEventHypothesisState } from './HiddenEventHypothesisState.js';
import {
  classifyScienceDiagnosis,
  normalizeScienceDiagnosisId,
  recommendedObjectiveForScienceDiagnosis,
  scienceBoundaryNotA,
  scienceDiagnosisLabel
} from './ScienceDiagnosisTypes.js';

export const SCIENCE_DISCOVERY_LIFECYCLE_VERSION = 'science-discovery-lifecycle-p9';

export function createScienceDiscoveryState(options = {}) {
  const primaryDiagnosis = normalizeScienceDiagnosisId(options.primaryDiagnosis ?? 'insufficientEvidence');
  return {
    type: 'anchor.science.discovery-state',
    version: SCIENCE_DISCOVERY_LIFECYCLE_VERSION,
    episodeId: String(options.episodeId ?? 'science-discovery-preview'),
    primaryDiagnosis,
    primaryDiagnosisLabel: scienceDiagnosisLabel(primaryDiagnosis),
    diagnosisClass: classifyScienceDiagnosis(primaryDiagnosis),
    confidence: clamp01(options.confidence, 0),
    recommendedObjectiveId: options.recommendedObjectiveId ?? recommendedObjectiveForScienceDiagnosis(primaryDiagnosis, options),
    forecastCorrection: createForecastCorrectionState(options.forecastCorrection ?? {}),
    hiddenEventHypothesis: createHiddenEventHypothesisState(options.hiddenEventHypothesis ?? {}),
    publicSafe: true,
    usesProductionDataAssimilation: false,
    usesCalibratedOceanForecast: false,
    usesMARL: false,
    notes: normalizeStringList(options.notes),
    notA: scienceBoundaryNotA()
  };
}

export function analyzeScienceEvidence({ observations = [], context = {}, previousState = null, options = {} } = {}) {
  const surpriseRows = computeObservationSurpriseBatch(observations, options.surpriseOptions ?? options);
  const surpriseSummary = observationSurpriseSummary(surpriseRows, options.surpriseOptions ?? options);
  const coherence = computeEvidenceCoherence(observations, options.coherenceOptions ?? options);
  const decision = chooseScienceDiagnosis({ surpriseSummary, coherence, context, options });
  const primaryDiagnosis = normalizeScienceDiagnosisId(options.primaryDiagnosis ?? decision.primaryDiagnosis);
  const recommendedObjectiveId = options.recommendedObjectiveId ?? recommendedObjectiveForScienceDiagnosis(primaryDiagnosis, {
    ...context,
    currentObjectiveId: context.currentObjectiveId ?? options.currentObjectiveId,
    eventFamily: context.eventFamily ?? options.eventFamily
  });
  const forecastCorrection = updateForecastCorrectionState(previousState?.forecastCorrection ?? {}, {
    ...surpriseSummary,
    ...coherence,
    diagnosisId: primaryDiagnosis,
    confidence: decision.confidence,
    evidenceConfidence: coherence.evidenceConfidence,
    explainedByForecastError: decision.explainedByForecastError
  }, { eventFamily: context.eventFamily, notes: decision.notes });
  const hiddenEventHypothesis = updateHiddenEventHypothesisState(previousState?.hiddenEventHypothesis ?? {}, {
    ...coherence,
    diagnosisId: primaryDiagnosis,
    confidence: decision.confidence,
    evidenceConfidence: coherence.evidenceConfidence,
    explainedByForecastError: decision.explainedByForecastError,
    contradictoryEvidence: decision.contradictoryEvidence,
    eventFamily: context.eventFamily ?? 'unknownAnomaly',
    regionEstimate: estimateRegion(surpriseRows)
  }, { eventFamily: context.eventFamily, notes: decision.notes });
  const state = createScienceDiscoveryState({
    episodeId: context.episodeId ?? options.episodeId,
    primaryDiagnosis,
    confidence: decision.confidence,
    recommendedObjectiveId,
    forecastCorrection,
    hiddenEventHypothesis,
    notes: decision.notes
  });

  return {
    type: 'anchor.science.discovery-update',
    version: SCIENCE_DISCOVERY_LIFECYCLE_VERSION,
    episodeId: state.episodeId,
    createdAt: options.createdAt ?? null,
    primaryDiagnosis,
    primaryDiagnosisLabel: state.primaryDiagnosisLabel,
    diagnosisClass: state.diagnosisClass,
    confidence: state.confidence,
    recommendedObjectiveId,
    surpriseSummary,
    coherenceSummary: evidenceCoherenceSummary(coherence),
    forecastCorrection: forecastCorrectionSummary(forecastCorrection),
    hiddenEventHypothesis: hiddenEventHypothesisSummary(hiddenEventHypothesis),
    state,
    publicSafe: true,
    hiddenTruthIncluded: false,
    usesProductionDataAssimilation: false,
    usesCalibratedOceanForecast: false,
    usesMARL: false,
    warnings: mergeUnique([...(coherence.warnings ?? []), ...(decision.warnings ?? [])]),
    notes: mergeUnique([
      ...decision.notes,
      'Forecast correction means the expected field existed but was wrong.',
      'Hidden event hypothesis means observations may indicate a phenomenon not represented in the forecast.',
      'P9 uses transparent educational heuristics, not production data assimilation.'
    ]),
    notA: scienceBoundaryNotA()
  };
}

export function scienceDiscoverySummary(update = {}) {
  const source = update?.type === 'anchor.headless.science-diagnostics' ? update.discoveryUpdate ?? update : update;
  return {
    type: 'anchor.science.discovery-summary',
    version: SCIENCE_DISCOVERY_LIFECYCLE_VERSION,
    present: Boolean(source?.primaryDiagnosis),
    episodeId: source?.episodeId ?? null,
    primaryDiagnosis: source?.primaryDiagnosis ?? null,
    primaryDiagnosisLabel: source?.primaryDiagnosisLabel ?? (source?.primaryDiagnosis ? scienceDiagnosisLabel(source.primaryDiagnosis) : null),
    diagnosisClass: source?.diagnosisClass ?? (source?.primaryDiagnosis ? classifyScienceDiagnosis(source.primaryDiagnosis) : null),
    confidence: finiteOrNull(source?.confidence),
    recommendedObjectiveId: source?.recommendedObjectiveId ?? null,
    forecastCorrectionStatus: source?.forecastCorrection?.status ?? null,
    hiddenEventStatus: source?.hiddenEventHypothesis?.status ?? null,
    surprise: source?.surpriseSummary ?? null,
    coherence: source?.coherenceSummary ?? null,
    publicSafe: source?.publicSafe !== false,
    hiddenTruthIncluded: source?.hiddenTruthIncluded === true,
    usesProductionDataAssimilation: source?.usesProductionDataAssimilation === true,
    usesCalibratedOceanForecast: source?.usesCalibratedOceanForecast === true,
    usesMARL: source?.usesMARL === true
  };
}

export function buildScienceDiagnosticsArtifact(update = {}, options = {}) {
  const summary = scienceDiscoverySummary(update);
  return {
    type: 'anchor.headless.science-diagnostics',
    version: SCIENCE_DISCOVERY_LIFECYCLE_VERSION,
    createdAt: options.createdAt ?? update.createdAt ?? null,
    episodeId: options.episodeId ?? update.episodeId ?? summary.episodeId,
    source: options.source ?? 'science-discovery-lifecycle',
    publicSafe: true,
    hiddenTruthIncluded: false,
    primaryDiagnosis: summary.primaryDiagnosis,
    primaryDiagnosisLabel: summary.primaryDiagnosisLabel,
    diagnosisClass: summary.diagnosisClass,
    confidence: summary.confidence,
    recommendedObjectiveId: summary.recommendedObjectiveId,
    surpriseSummary: update.surpriseSummary ?? summary.surprise,
    coherenceSummary: update.coherenceSummary ?? summary.coherence,
    forecastCorrection: update.forecastCorrection ?? null,
    hiddenEventHypothesis: update.hiddenEventHypothesis ?? null,
    discoverySummary: summary,
    discoveryUpdate: compactScienceUpdate(update),
    usesProductionDataAssimilation: false,
    usesCalibratedOceanForecast: false,
    usesMARL: false,
    notes: mergeUnique([...(update.notes ?? []), 'Science diagnostics are compact public-safe summaries; hidden truth fields are not embedded.']),
    notA: scienceBoundaryNotA()
  };
}

function chooseScienceDiagnosis({ surpriseSummary, coherence, context = {}, options = {} }) {
  const count = Number(surpriseSummary.count ?? 0);
  const highCount = Number(coherence.highSurpriseCount ?? 0);
  const confidence = clamp01(coherence.evidenceConfidence ?? 0);
  const meanSurprise = Number(surpriseSummary.meanSurprise ?? 0);
  const maxSurprise = Number(surpriseSummary.maxSurprise ?? 0);
  const forecastCanExplain = context.forecastCanExplain !== false;
  const hiddenPrior = clamp01(context.hiddenEventPrior ?? options.hiddenEventPrior ?? 0);
  const warnings = [];
  const notes = [];

  if (count <= 0) return diagnosisDecision('insufficientEvidence', 0.08, false, false, warnings, ['No observations were available.']);
  if (count < 2 && maxSurprise < 3) return diagnosisDecision('insufficientEvidence', 0.22, false, false, warnings, ['Only sparse low-surprise evidence was available.']);
  if (maxSurprise < 1.5 && meanSurprise < 1.1) return diagnosisDecision('agreesWithForecast', 0.62, true, false, warnings, ['Observed values are close to the expected forecast or belief.']);
  if (highCount <= 1 && confidence < 0.38) return diagnosisDecision('likelySensorNoise', Math.max(0.35, confidence), false, false, warnings, ['Elevated surprise is not coherent enough to switch objectives.']);
  if (confidence >= 0.5 && forecastCanExplain && hiddenPrior >= 0.45) return diagnosisDecision('mixedForecastErrorAndHiddenEvent', Math.max(confidence, 0.58), true, false, warnings, ['Both forecast correction and hidden-event follow-up remain plausible.']);
  if (confidence >= 0.45 && forecastCanExplain) return diagnosisDecision(forecastDiagnosisForContext(context), Math.max(confidence, 0.5), true, false, warnings, ['Coherent surprise can be represented as a forecast correction.']);
  if (confidence >= 0.45 && !forecastCanExplain) return diagnosisDecision((context.confirmationEvidence === true || options.confirmationEvidence === true) ? 'hiddenEventConfirmed' : 'likelyHiddenEvent', Math.max(confidence, 0.55), false, false, warnings, ['Coherent surprise is not explained by the expected forecast field.']);
  if (meanSurprise >= 2.5 || maxSurprise >= 4) return diagnosisDecision('possibleHiddenEvent', Math.max(confidence, 0.42), false, false, warnings, ['Surprise is elevated but needs follow-up evidence.']);
  return diagnosisDecision('insufficientEvidence', Math.max(confidence, 0.25), false, false, warnings, notes);
}

function diagnosisDecision(primaryDiagnosis, confidence, explainedByForecastError, contradictoryEvidence, warnings, notes) {
  return { primaryDiagnosis, confidence: clamp01(confidence), explainedByForecastError, contradictoryEvidence, warnings, notes };
}

function forecastDiagnosisForContext(context = {}) {
  const hint = String(context.forecastIssueHint ?? context.forecastCorrectionKind ?? '').toLowerCase();
  if (/displace|offset|shift/.test(hint)) return 'forecastDisplacement';
  if (/time|phase/.test(hint)) return 'forecastTimingError';
  if (/depth|layer/.test(hint)) return 'forecastDepthMismatch';
  if (/bound/.test(hint)) return 'boundaryShift';
  return 'forecastIntensityError';
}

function estimateRegion(rows = []) {
  const points = rows.filter((row) => Number(row.surprise) >= 3 && Number.isFinite(Number(row.x)) && Number.isFinite(Number(row.y)));
  if (!points.length) return null;
  const x = points.reduce((total, row) => total + Number(row.x), 0) / points.length;
  const y = points.reduce((total, row) => total + Number(row.y), 0) / points.length;
  const maxDistance = points.reduce((best, row) => Math.max(best, Math.hypot(Number(row.x) - x, Number(row.y) - y)), 0);
  return { x: round(x), y: round(y), radius: round(Math.max(1, maxDistance)), note: 'Approximate public-safe evidence centroid.' };
}

function compactScienceUpdate(update = {}) {
  return {
    type: update.type ?? 'anchor.science.discovery-update',
    version: update.version ?? SCIENCE_DISCOVERY_LIFECYCLE_VERSION,
    episodeId: update.episodeId ?? null,
    primaryDiagnosis: update.primaryDiagnosis ?? null,
    diagnosisClass: update.diagnosisClass ?? null,
    confidence: finiteOrNull(update.confidence),
    recommendedObjectiveId: update.recommendedObjectiveId ?? null,
    forecastCorrection: update.forecastCorrection ?? null,
    hiddenEventHypothesis: update.hiddenEventHypothesis ?? null,
    surpriseSummary: update.surpriseSummary ?? null,
    coherenceSummary: update.coherenceSummary ?? null,
    publicSafe: true,
    hiddenTruthIncluded: false
  };
}

function normalizeStringList(value) { return Array.isArray(value) ? value.map((entry) => String(entry ?? '').trim()).filter(Boolean) : []; }
function mergeUnique(values) { return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value ?? '').trim()).filter(Boolean))]; }
function clamp01(value, fallback = 0) { const number = Number(value); return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : fallback; }
function finiteOrNull(value) { const number = Number(value); return Number.isFinite(number) ? Number(number.toFixed(4)) : null; }
function round(value) { const number = Number(value); return Number.isFinite(number) ? Number(number.toFixed(4)) : null; }

