import { createAdaptiveEvidenceSnapshot, validateAdaptiveEvidenceSnapshot } from './AdaptiveDiagnosisModel.js';
import { normalizeMissionObjectiveId } from './MissionObjectiveTaxonomy.js';
import { extractBenchmarkMetadata } from './BenchmarkMetadata.js';

export const ADAPTIVE_EVIDENCE_ADAPTER_VERSION = 'adaptive-evidence-adapter-p7';

export function buildAdaptiveEvidenceFromResult({ result = {}, plan = null, mission = null, level = null, routeExecutionRecord = null, runRecord = null, previousManagerState = null, options = {} } = {}) {
  const source = cloneJson(result ?? {});
  const observationSummary = extractObservationSummary(source);
  const uncertaintySummary = extractUncertaintySummary(source);
  const forecastErrorSummary = extractForecastErrorSummary(source);
  const hiddenEventSummary = extractHiddenEventSummary(source);
  const stalenessSummary = extractStalenessSummary(source);
  const boundarySummary = extractBoundarySummary(source);
  const hazardSummary = extractHazardReachabilitySummary(source);
  const metadata = extractBenchmarkMetadata(source) ?? extractBenchmarkMetadata(plan) ?? extractBenchmarkMetadata(mission) ?? extractBenchmarkMetadata(level) ?? {};
  const warnings = mergeUnique([
    ...observationSummary.warnings,
    ...uncertaintySummary.warnings,
    ...forecastErrorSummary.warnings,
    ...hiddenEventSummary.warnings,
    ...stalenessSummary.warnings,
    ...boundarySummary.warnings,
    ...hazardSummary.warnings
  ]);
  const activeObjectiveId = normalizeMissionObjectiveId(options.activeObjectiveId ?? previousManagerState?.currentObjectiveId ?? source.adaptiveBenchmark?.activeObjective?.id ?? source.adaptiveBenchmark?.activeObjectiveId ?? metadata.activeObjectiveId ?? metadata.objectiveId ?? 'reconnaissanceSurvey');
  const previousObjectiveId = normalizeMissionObjectiveId(options.previousObjectiveId ?? previousManagerState?.objectiveHistory?.at?.(-2)?.objectiveId ?? previousManagerState?.objectiveHistory?.at?.(-1)?.objectiveId ?? activeObjectiveId);
  const fieldsAvailable = mergeUnique([
    ...observationSummary.fieldsAvailable,
    ...uncertaintySummary.fieldsAvailable,
    ...forecastErrorSummary.fieldsAvailable,
    ...hiddenEventSummary.fieldsAvailable,
    ...stalenessSummary.fieldsAvailable,
    ...boundarySummary.fieldsAvailable,
    ...hazardSummary.fieldsAvailable,
    ...(Array.isArray(options.fieldsAvailable) ? options.fieldsAvailable : [])
  ]);
  return createAdaptiveEvidenceSnapshot({
    time: finiteNumber(options.time ?? source.simTime ?? source.summary?.simTime ?? maxEventTime(source.events), 0),
    episodeId: String(options.episodeId ?? previousManagerState?.episodeId ?? metadata.episodeId ?? 'adaptive-preview-episode'),
    observationCount: observationSummary.observationCount,
    recentObservationCount: observationSummary.recentObservationCount,
    meanUncertainty: uncertaintySummary.meanUncertainty,
    maxUncertainty: uncertaintySummary.maxUncertainty,
    meanSurprise: forecastErrorSummary.meanSurprise,
    maxSurprise: forecastErrorSummary.maxSurprise,
    forecastErrorScore: forecastErrorSummary.forecastErrorScore,
    hiddenEventConfidence: hiddenEventSummary.hiddenEventConfidence,
    noiseFalseAlarmRisk: hiddenEventSummary.noiseFalseAlarmRisk,
    boundaryAmbiguityScore: boundarySummary.boundaryAmbiguityScore,
    stalenessScore: stalenessSummary.stalenessScore,
    sourceLocalizationScore: hiddenEventSummary.sourceLocalizationScore,
    hazardPressure: hazardSummary.hazardPressure,
    reachabilityPressure: hazardSummary.reachabilityPressure,
    activeObjectiveId,
    previousObjectiveId,
    candidateObjectives: options.candidateObjectives ?? previousManagerState?.allowedObjectives ?? previousManagerState?.candidateObjectives,
    fieldsAvailable,
    diagnostics: {
      version: ADAPTIVE_EVIDENCE_ADAPTER_VERSION,
      observationSummary: stripWarnings(observationSummary),
      uncertaintySummary: stripWarnings(uncertaintySummary),
      forecastErrorSummary: stripWarnings(forecastErrorSummary),
      hiddenEventSummary: stripWarnings(hiddenEventSummary),
      stalenessSummary: stripWarnings(stalenessSummary),
      boundarySummary: stripWarnings(boundarySummary),
      hazardReachabilitySummary: stripWarnings(hazardSummary),
      routeExecutionRecordAvailable: Boolean(routeExecutionRecord),
      runRecordAvailable: Boolean(runRecord),
      partialEvidence: warnings.length > 0,
      warnings
    },
    notes: [
      'Evidence snapshot adapted from an existing simulator/debrief result.',
      ...(warnings.length ? ['Evidence is partial because the current result does not contain all uncertainty or observation fields.'] : []),
      ...(Array.isArray(options.notes) ? options.notes : [])
    ]
  });
}

export function buildAdaptiveEvidenceFromUncertaintyDiagnostics(diagnostics = {}, options = {}) {
  const source = cloneJson(diagnostics ?? {});
  return createAdaptiveEvidenceSnapshot({
    ...options,
    episodeId: options.episodeId ?? source.episodeId ?? 'adaptive-uncertainty-diagnostics',
    observationCount: source.observationCount ?? source.samples?.count ?? 0,
    recentObservationCount: source.recentObservationCount ?? source.samples?.recentCount ?? source.observationCount ?? 0,
    meanUncertainty: source.meanUncertainty ?? source.uncertainty?.mean,
    maxUncertainty: source.maxUncertainty ?? source.uncertainty?.max,
    meanSurprise: source.meanSurprise ?? source.surprise?.mean,
    maxSurprise: source.maxSurprise ?? source.surprise?.max,
    forecastErrorScore: source.forecastErrorScore ?? source.forecastError?.score,
    hiddenEventConfidence: source.hiddenEventConfidence ?? source.hiddenEvent?.confidence,
    noiseFalseAlarmRisk: source.noiseFalseAlarmRisk ?? source.falseAlarmRisk,
    fieldsAvailable: mergeUnique(['uncertaintyDiagnostics', ...(Array.isArray(options.fieldsAvailable) ? options.fieldsAvailable : [])]),
    diagnostics: { version: ADAPTIVE_EVIDENCE_ADAPTER_VERSION, source: 'uncertaintyDiagnostics', raw: source },
    notes: ['Evidence adapted from uncertainty diagnostics.']
  });
}

export function buildAdaptiveEvidenceFromSamplingPriority(debugOrExport = {}, options = {}) {
  const source = cloneJson(debugOrExport ?? {});
  const diagnostics = source.diagnostics ?? source.summary ?? source;
  return createAdaptiveEvidenceSnapshot({
    ...options,
    episodeId: options.episodeId ?? source.episodeId ?? 'adaptive-sampling-priority',
    observationCount: diagnostics.observationCount ?? 0,
    recentObservationCount: diagnostics.recentObservationCount ?? diagnostics.observationCount ?? 0,
    meanUncertainty: diagnostics.meanUncertainty ?? diagnostics.expectedUncertaintyMean,
    maxUncertainty: diagnostics.maxUncertainty ?? diagnostics.expectedUncertaintyMax,
    forecastErrorScore: diagnostics.forecastValidationScore ?? diagnostics.forecastErrorScore,
    hiddenEventConfidence: diagnostics.hiddenEventConfidence ?? diagnostics.hiddenEventProbability,
    boundaryAmbiguityScore: diagnostics.boundaryAmbiguityScore ?? diagnostics.boundaryStrength,
    stalenessScore: diagnostics.stalenessScore ?? diagnostics.staleness,
    hazardPressure: diagnostics.hazardPressure ?? diagnostics.hazardPenalty,
    fieldsAvailable: mergeUnique(['samplingPriority', ...(Array.isArray(options.fieldsAvailable) ? options.fieldsAvailable : [])]),
    diagnostics: { version: ADAPTIVE_EVIDENCE_ADAPTER_VERSION, source: 'samplingPriority', raw: source },
    notes: ['Evidence adapted from Sampling Priority diagnostics.']
  });
}

export function buildAdaptiveEvidenceFromFlowCoupledSampling(debugOrExport = {}, options = {}) {
  const source = cloneJson(debugOrExport ?? {});
  const diagnostics = source.diagnostics ?? source.summary ?? source;
  return createAdaptiveEvidenceSnapshot({
    ...options,
    episodeId: options.episodeId ?? source.episodeId ?? 'adaptive-flow-coupled-sampling',
    observationCount: diagnostics.observationCount ?? 0,
    recentObservationCount: diagnostics.recentObservationCount ?? diagnostics.observationCount ?? 0,
    meanUncertainty: diagnostics.meanUncertainty,
    maxUncertainty: diagnostics.maxUncertainty,
    forecastErrorScore: diagnostics.forecastErrorScore ?? diagnostics.forecastValidationScore,
    hiddenEventConfidence: diagnostics.hiddenEventConfidence,
    hazardPressure: diagnostics.hazardPressure ?? diagnostics.hazardPenalty,
    reachabilityPressure: diagnostics.reachabilityPressure ?? diagnostics.unreachablePenalty,
    sourceLocalizationScore: diagnostics.sourceLocalizationScore,
    fieldsAvailable: mergeUnique(['flowCoupledSampling', 'gliderActionValue', ...(Array.isArray(options.fieldsAvailable) ? options.fieldsAvailable : [])]),
    diagnostics: { version: ADAPTIVE_EVIDENCE_ADAPTER_VERSION, source: 'flowCoupledSampling', raw: source },
    notes: ['Evidence adapted from Flow-Coupled Sampling diagnostics.']
  });
}

export function extractObservationSummary(result = {}) {
  const events = Array.isArray(result.events) ? result.events : [];
  const sampleEvents = events.filter((event) => ['sample', 'observation', 'surfaceObservation', 'sampleCollected'].includes(event?.type));
  const explicit = result.observations ?? result.samples ?? result.summary?.observations ?? null;
  const explicitCount = Array.isArray(explicit) ? explicit.length : finiteNumber(explicit?.count ?? result.summary?.observationCount ?? result.summary?.samplesUploaded, null);
  const observationCount = Math.max(0, Math.round(finiteNumber(explicitCount, sampleEvents.length)));
  const recentObservationCount = Math.max(0, Math.round(finiteNumber(result.summary?.recentObservationCount ?? result.adaptiveEvidence?.recentObservationCount, Math.min(observationCount, sampleEvents.length || observationCount))));
  const warnings = [];
  if (!observationCount) warnings.push('No explicit observation/sample count was found; diagnosis may be conservative.');
  return { observationCount, recentObservationCount, sampleEventCount: sampleEvents.length, fieldsAvailable: observationCount || sampleEvents.length ? ['observations'] : [], warnings };
}

export function extractUncertaintySummary(result = {}) {
  const source = result.adaptiveEvidence ?? result.uncertainty ?? result.forecastConfidence ?? result.ensembleMetrics ?? result.debriefMetrics?.uncertainty ?? {};
  const meanUncertainty = clamp01(source.meanUncertainty ?? source.mean ?? source.expectedUncertaintyMean ?? result.summary?.meanUncertainty, null);
  const maxUncertainty = clamp01(source.maxUncertainty ?? source.max ?? source.expectedUncertaintyMax ?? result.summary?.maxUncertainty, meanUncertainty);
  const warnings = [];
  if (meanUncertainty == null) warnings.push('Uncertainty fields were not present in the result.');
  return { meanUncertainty: meanUncertainty ?? 0, maxUncertainty: maxUncertainty ?? meanUncertainty ?? 0, fieldsAvailable: meanUncertainty == null ? [] : ['expectedUncertainty'], warnings };
}

export function extractForecastErrorSummary(result = {}) {
  const source = result.adaptiveEvidence ?? result.regret ?? result.forecastError ?? result.ensembleMetrics ?? result.forecastConfidence ?? {};
  const forecastErrorScore = clamp01(source.forecastErrorScore ?? source.forecastRegret ?? source.regretRatio ?? source.ensembleRegretEstimate ?? result.summary?.forecastErrorScore, null);
  const meanSurprise = clamp01(source.meanSurprise ?? source.surpriseMean ?? source.meanInnovation ?? forecastErrorScore, null);
  const maxSurprise = clamp01(source.maxSurprise ?? source.surpriseMax ?? source.maxInnovation ?? meanSurprise, meanSurprise);
  const warnings = [];
  if (forecastErrorScore == null && meanSurprise == null) warnings.push('Forecast-error or surprise fields were not present in the result.');
  return { forecastErrorScore: forecastErrorScore ?? 0, meanSurprise: meanSurprise ?? 0, maxSurprise: maxSurprise ?? 0, fieldsAvailable: forecastErrorScore == null && meanSurprise == null ? [] : ['forecastValidation'], warnings };
}

export function extractHiddenEventSummary(result = {}) {
  const source = result.adaptiveEvidence ?? result.hiddenEvent ?? result.stochastic ?? result.summary ?? {};
  const hiddenEventConfidence = clamp01(source.hiddenEventConfidence ?? source.hiddenEventProbability ?? source.unknownEventProbability, null);
  const noiseFalseAlarmRisk = clamp01(source.noiseFalseAlarmRisk ?? source.falseAlarmRisk, null);
  const sourceLocalizationScore = clamp01(source.sourceLocalizationScore ?? source.sourceLikelihood, null);
  const warnings = [];
  if (hiddenEventConfidence == null) warnings.push('Hidden-event confidence was not present in the result.');
  return { hiddenEventConfidence: hiddenEventConfidence ?? 0, noiseFalseAlarmRisk: noiseFalseAlarmRisk ?? 0, sourceLocalizationScore: sourceLocalizationScore ?? 0, fieldsAvailable: hiddenEventConfidence == null ? [] : ['hiddenEventProbability'], warnings };
}

export function extractStalenessSummary(result = {}) {
  const source = result.adaptiveEvidence ?? result.staleness ?? result.summary ?? {};
  const stalenessScore = clamp01(source.stalenessScore ?? source.staleness ?? source.ageOfInformation, null);
  const warnings = [];
  if (stalenessScore == null) warnings.push('Staleness fields were not present in the result.');
  return { stalenessScore: stalenessScore ?? 0, fieldsAvailable: stalenessScore == null ? [] : ['staleness'], warnings };
}

export function extractBoundarySummary(result = {}) {
  const source = result.adaptiveEvidence ?? result.boundary ?? result.summary ?? {};
  const boundaryAmbiguityScore = clamp01(source.boundaryAmbiguityScore ?? source.boundaryStrength ?? source.gradientAmbiguity, null);
  const warnings = [];
  if (boundaryAmbiguityScore == null) warnings.push('Boundary ambiguity fields were not present in the result.');
  return { boundaryAmbiguityScore: boundaryAmbiguityScore ?? 0, fieldsAvailable: boundaryAmbiguityScore == null ? [] : ['boundaryStrength'], warnings };
}

export function extractHazardReachabilitySummary(result = {}) {
  const summary = result.summary ?? {};
  const risk = result.risk ?? {};
  const routeQuality = result.routeQuality ?? {};
  const hazardEvents = Number(summary.hazardsHit ?? 0) + Number(summary.mobileHazardsHit ?? 0);
  const hazardPressure = clamp01(result.adaptiveEvidence?.hazardPressure ?? risk.hazardPressure ?? summary.hazardPressure ?? (hazardEvents > 0 ? Math.min(1, hazardEvents / 3) : null), null);
  const reachabilityPressure = clamp01(result.adaptiveEvidence?.reachabilityPressure ?? routeQuality.reachabilityPressure ?? summary.reachabilityPressure ?? (summary.missedWaypoints ? Math.min(1, Number(summary.missedWaypoints) / 3) : null), null);
  const warnings = [];
  if (hazardPressure == null && reachabilityPressure == null) warnings.push('Hazard/reachability pressure was not present in the result.');
  return { hazardPressure: hazardPressure ?? 0, reachabilityPressure: reachabilityPressure ?? 0, fieldsAvailable: hazardPressure == null && reachabilityPressure == null ? [] : ['hazard'], warnings };
}

export function validateAdaptiveEvidenceFromResult(evidence = {}) {
  return validateAdaptiveEvidenceSnapshot(evidence);
}

function maxEventTime(events = []) {
  if (!Array.isArray(events) || !events.length) return 0;
  return events.reduce((max, event) => Math.max(max, finiteNumber(event?.time ?? event?.t, 0)), 0);
}

function stripWarnings(value = {}) {
  const clone = { ...value };
  delete clone.warnings;
  return clone;
}

function mergeUnique(values) {
  const output = [];
  for (const value of values) {
    const normalized = String(value ?? '').trim();
    if (normalized && !output.includes(normalized)) output.push(normalized);
  }
  return output;
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp01(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(1, number));
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}
