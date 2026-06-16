import { missionObjectiveById, normalizeMissionObjectiveId } from './MissionObjectiveTaxonomy.js';
import { adaptiveLegRecordSummary, createAdaptiveLegRecord, validateAdaptiveLegRecord } from './AdaptiveLegRecord.js';

export const ADAPTIVE_EPISODE_SESSION_VERSION = 'adaptive-episode-session-p8';

const SESSION_STATUS_VALUES = new Set([
  'initialized',
  'planningLeg',
  'executingLeg',
  'surfacingReview',
  'nextLegReady',
  'complete',
  'aborted'
]);

export function createAdaptiveEpisodeSession(options = {}) {
  const runtime = options.runtimeContext ?? options.adaptiveRuntimeContext ?? options;
  const managerState = options.adaptiveManagerState ?? runtime.adaptiveManagerState ?? runtime.managerState ?? {};
  const objectiveId = normalizeMissionObjectiveId(
    options.currentObjectiveId
      ?? options.activeObjectiveId
      ?? options.currentObjective?.id
      ?? runtime.activeObjective?.id
      ?? managerState.currentObjectiveId
      ?? 'reconnaissanceSurvey'
  );
  const objective = missionObjectiveById(objectiveId);
  const createdAt = options.createdAt ?? new Date().toISOString();
  const session = {
    type: 'anchor.benchmark.adaptive-episode-session',
    version: ADAPTIVE_EPISODE_SESSION_VERSION,
    episodeId: stringOrNull(options.episodeId ?? runtime.episodeId ?? managerState.episodeId) ?? 'adaptive-preview-episode',
    benchmarkMode: 'adaptiveBenchmark',
    policyId: stringOrNull(options.policyId ?? runtime.adaptiveManagerConfig?.policyId ?? runtime.managerConfig?.policyId ?? managerState.policyId) ?? 'transparentRuleManager',
    informationAccessTier: stringOrNull(options.informationAccessTier ?? runtime.informationAccessTier) ?? 'beliefOnly',
    worldModelTier: stringOrNull(options.worldModelTier ?? runtime.worldModelTier) ?? 'stochasticBelief',
    objectiveAuthority: 'missionManager',
    routeAuthority: 'playerOrSolver',
    fairnessLabel: stringOrNull(options.fairnessLabel ?? runtime.fairnessLabel) ?? 'Belief-only',
    currentLegIndex: Math.max(0, Math.round(finiteNumber(options.currentLegIndex ?? options.activeLegIndex ?? runtime.activeLegIndex, 0))),
    currentObjectiveId: objective.id,
    currentObjectiveLabel: options.currentObjectiveLabel ?? objective.label,
    status: normalizeSessionStatus(options.status ?? 'initialized'),
    legs: normalizeLegs(options.legs),
    surfacingDecisions: normalizeArray(options.surfacingDecisions),
    nextLegHandoffs: normalizeArray(options.nextLegHandoffs),
    objectiveHistory: normalizeObjectiveHistory(options.objectiveHistory ?? managerState.objectiveHistory, objective, options.currentLegIndex ?? runtime.activeLegIndex ?? 0),
    evidenceHistory: normalizeArray(options.evidenceHistory),
    diagnosisHistory: normalizeArray(options.diagnosisHistory),
    createdAt,
    updatedAt: options.updatedAt ?? createdAt,
    warnings: normalizeStringList(options.warnings),
    notes: normalizeStringList(options.notes)
  };
  return synchronizeSession(session);
}

export function addAdaptiveLegToSession(session, legRecord) {
  const base = createAdaptiveEpisodeSession(session);
  const record = createAdaptiveLegRecord({ episodeId: base.episodeId, ...cloneJson(legRecord) });
  const legs = upsertByKey(base.legs, record, (entry) => `leg:${entry.legIndex}`, chooseMoreCompleteLeg);
  return synchronizeSession({
    ...base,
    legs,
    currentLegIndex: Math.max(base.currentLegIndex, record.legIndex),
    status: statusFromLeg(record),
    evidenceHistory: appendEvidence(base.evidenceHistory, record.evidence, record.legIndex),
    diagnosisHistory: appendDiagnosis(base.diagnosisHistory, record.diagnosis, record.legIndex),
    objectiveHistory: appendObjectiveHistoryFromLeg(base.objectiveHistory, record),
    updatedAt: new Date().toISOString()
  });
}

export function addAdaptiveSurfacingDecisionToSession(session, decision) {
  const base = createAdaptiveEpisodeSession(session);
  const normalized = compactObject(decision ?? {});
  const legIndex = Math.max(0, Math.round(finiteNumber(normalized.legIndex, base.currentLegIndex)));
  const surfacingDecisions = upsertByKey(base.surfacingDecisions, { ...normalized, legIndex }, decisionKey, chooseMoreCompleteObject);
  const transition = normalized.objectiveTransition ?? {};
  return synchronizeSession({
    ...base,
    surfacingDecisions,
    currentLegIndex: Math.max(base.currentLegIndex, legIndex),
    status: transition?.toObjectiveId ? 'nextLegReady' : 'surfacingReview',
    evidenceHistory: appendEvidence(base.evidenceHistory, normalized.evidence, legIndex),
    diagnosisHistory: appendDiagnosis(base.diagnosisHistory, normalized.diagnosis, legIndex),
    objectiveHistory: appendObjectiveHistory(base.objectiveHistory, {
      legIndex,
      time: normalized.time ?? transition.time ?? 0,
      fromObjectiveId: transition.fromObjectiveId ?? normalized.previousObjective?.id ?? base.currentObjectiveId,
      toObjectiveId: transition.toObjectiveId ?? normalized.recommendedObjective?.id ?? base.currentObjectiveId,
      diagnosisId: normalized.diagnosis?.primaryDiagnosis ?? null,
      confidence: normalized.diagnosis?.confidence ?? null,
      rationale: transition.rationale ?? normalized.rationale ?? 'Adaptive surfacing decision.',
      status: transition.transitionId ?? 'surfacingDecision'
    }),
    updatedAt: new Date().toISOString()
  });
}

export function addAdaptiveNextLegHandoffToSession(session, handoff) {
  const base = createAdaptiveEpisodeSession(session);
  const normalized = compactObject(handoff ?? {});
  const legIndex = Math.max(0, Math.round(finiteNumber(normalized.legIndex, base.currentLegIndex + 1)));
  const objectiveId = normalizeMissionObjectiveId(normalized.recommendedObjectiveId ?? normalized.transition?.toObjectiveId ?? base.currentObjectiveId);
  const objective = missionObjectiveById(objectiveId);
  return synchronizeSession({
    ...base,
    nextLegHandoffs: upsertByKey(base.nextLegHandoffs, { ...normalized, legIndex }, handoffKey, chooseMoreCompleteObject),
    currentLegIndex: Math.max(base.currentLegIndex, legIndex),
    currentObjectiveId: objective.id,
    currentObjectiveLabel: objective.label,
    status: 'nextLegReady',
    objectiveHistory: appendObjectiveHistory(base.objectiveHistory, {
      legIndex,
      time: normalized.time ?? normalized.transition?.time ?? 0,
      fromObjectiveId: normalized.transition?.fromObjectiveId ?? base.currentObjectiveId,
      toObjectiveId: objective.id,
      diagnosisId: normalized.evidenceSummary?.primaryDiagnosis ?? null,
      confidence: null,
      rationale: normalized.transition?.rationale ?? 'Next-leg handoff accepted for planning.',
      status: 'nextLegReady'
    }),
    updatedAt: new Date().toISOString()
  });
}

export function updateAdaptiveSessionCurrentObjective(session, objective) {
  const base = createAdaptiveEpisodeSession(session);
  const objectiveId = normalizeMissionObjectiveId(typeof objective === 'string' ? objective : objective?.id ?? objective?.objectiveId ?? base.currentObjectiveId);
  const resolved = missionObjectiveById(objectiveId);
  return synchronizeSession({
    ...base,
    currentObjectiveId: resolved.id,
    currentObjectiveLabel: resolved.label,
    objectiveHistory: appendObjectiveHistory(base.objectiveHistory, {
      legIndex: base.currentLegIndex,
      time: objective?.time ?? 0,
      fromObjectiveId: base.currentObjectiveId,
      toObjectiveId: resolved.id,
      diagnosisId: null,
      confidence: null,
      rationale: objective?.rationale ?? 'Current adaptive objective updated.',
      status: 'currentObjectiveUpdated'
    }),
    updatedAt: new Date().toISOString()
  });
}

export function adaptiveEpisodeSessionSummary(sessionInput = {}) {
  const session = createAdaptiveEpisodeSession(sessionInput);
  const validation = validateAdaptiveEpisodeSession(session);
  return {
    type: session.type,
    version: session.version,
    episodeId: session.episodeId,
    benchmarkMode: session.benchmarkMode,
    policyId: session.policyId,
    currentLegIndex: session.currentLegIndex,
    currentObjectiveId: session.currentObjectiveId,
    currentObjectiveLabel: session.currentObjectiveLabel,
    status: session.status,
    legCount: session.legs.length,
    surfacingDecisionCount: session.surfacingDecisions.length,
    nextLegHandoffCount: session.nextLegHandoffs.length,
    objectiveHistoryCount: session.objectiveHistory.length,
    evidenceHistoryCount: session.evidenceHistory.length,
    diagnosisHistoryCount: session.diagnosisHistory.length,
    objectiveAuthority: session.objectiveAuthority,
    routeAuthority: session.routeAuthority,
    updatedAt: session.updatedAt,
    valid: validation.valid,
    warnings: validation.warnings
  };
}

export function validateAdaptiveEpisodeSession(session = {}) {
  const errors = [];
  const warnings = [];
  if (!session || typeof session !== 'object') errors.push('Adaptive episode session must be an object.');
  if (session?.type !== 'anchor.benchmark.adaptive-episode-session') errors.push(`Expected type anchor.benchmark.adaptive-episode-session, got ${session?.type ?? 'missing'}.`);
  if (!stringOrNull(session?.episodeId)) errors.push('episodeId is required.');
  if (session?.benchmarkMode !== 'adaptiveBenchmark') errors.push('benchmarkMode must be adaptiveBenchmark.');
  if (session?.objectiveAuthority !== 'missionManager') errors.push('objectiveAuthority must be missionManager.');
  if (session?.routeAuthority !== 'playerOrSolver') errors.push('routeAuthority must be playerOrSolver.');
  if (!Array.isArray(session?.legs)) errors.push('legs must be an array.');
  if (!Array.isArray(session?.surfacingDecisions)) errors.push('surfacingDecisions must be an array.');
  if (!Array.isArray(session?.objectiveHistory)) errors.push('objectiveHistory must be an array.');
  if (!SESSION_STATUS_VALUES.has(session?.status)) warnings.push(`Unknown adaptive session status: ${session?.status ?? 'missing'}.`);
  for (const leg of Array.isArray(session?.legs) ? session.legs : []) {
    const validation = validateAdaptiveLegRecord(leg);
    warnings.push(...validation.errors.map((error) => `leg ${leg?.legIndex ?? '?'}: ${error}`), ...validation.warnings.map((warning) => `leg ${leg?.legIndex ?? '?'}: ${warning}`));
  }
  return { status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', valid: errors.length === 0, errors, warnings: uniqueStrings([...warnings, ...(session?.warnings ?? [])]) };
}

export function serializeAdaptiveEpisodeSession(session) {
  return JSON.stringify(createAdaptiveEpisodeSession(session));
}

export function deserializeAdaptiveEpisodeSession(payload) {
  const parsed = typeof payload === 'string' ? JSON.parse(payload) : cloneJson(payload);
  return createAdaptiveEpisodeSession(parsed);
}

function synchronizeSession(session) {
  const legs = normalizeLegs(session.legs);
  const currentLegIndex = Math.max(0, ...legs.map((leg) => finiteNumber(leg.legIndex, 0)), finiteNumber(session.currentLegIndex, 0));
  const objectiveId = normalizeMissionObjectiveId(session.currentObjectiveId ?? legs.at(-1)?.objectiveId ?? 'reconnaissanceSurvey');
  const objective = missionObjectiveById(objectiveId);
  return {
    ...session,
    currentLegIndex,
    currentObjectiveId: objective.id,
    currentObjectiveLabel: session.currentObjectiveLabel ?? objective.label,
    legs,
    surfacingDecisions: normalizeArray(session.surfacingDecisions),
    nextLegHandoffs: normalizeArray(session.nextLegHandoffs),
    objectiveHistory: normalizeObjectiveHistory(session.objectiveHistory, objective, currentLegIndex),
    evidenceHistory: normalizeArray(session.evidenceHistory),
    diagnosisHistory: normalizeArray(session.diagnosisHistory),
    warnings: uniqueStrings(session.warnings),
    notes: normalizeStringList(session.notes)
  };
}

function normalizeLegs(legs) {
  return (Array.isArray(legs) ? legs : []).map((leg) => createAdaptiveLegRecord(leg)).sort((a, b) => a.legIndex - b.legIndex);
}

function normalizeObjectiveHistory(history, objective, legIndex = 0) {
  const normalized = (Array.isArray(history) ? history : []).map((entry) => ({
    legIndex: Math.max(0, Math.round(finiteNumber(entry.legIndex, legIndex))),
    time: finiteNumber(entry.time, 0),
    fromObjectiveId: stringOrNull(entry.fromObjectiveId),
    toObjectiveId: normalizeMissionObjectiveId(entry.toObjectiveId ?? entry.objectiveId ?? objective.id),
    diagnosisId: stringOrNull(entry.diagnosisId),
    confidence: finiteOrNull(entry.confidence),
    rationale: stringOrNull(entry.rationale) ?? 'Adaptive objective history entry.',
    status: stringOrNull(entry.status ?? entry.transitionId) ?? 'objective',
    createdAt: entry.createdAt ?? entry.timeStamp ?? null
  }));
  if (!normalized.length) {
    normalized.push({
      legIndex: Math.max(0, Math.round(finiteNumber(legIndex, 0))),
      time: 0,
      fromObjectiveId: null,
      toObjectiveId: objective.id,
      diagnosisId: null,
      confidence: null,
      rationale: 'Adaptive episode initialized with current objective.',
      status: 'initialized',
      createdAt: null
    });
  }
  return normalized;
}

function appendObjectiveHistoryFromLeg(history, leg) {
  if (!leg?.objectiveTransition?.toObjectiveId && !leg?.nextLegHandoff?.recommendedObjectiveId) return history;
  return appendObjectiveHistory(history, {
    legIndex: leg.legIndex,
    time: leg.objectiveTransition?.time ?? leg.evidence?.time ?? 0,
    fromObjectiveId: leg.objectiveTransition?.fromObjectiveId ?? leg.objectiveId,
    toObjectiveId: leg.objectiveTransition?.toObjectiveId ?? leg.nextLegHandoff?.recommendedObjectiveId,
    diagnosisId: leg.diagnosis?.primaryDiagnosis ?? null,
    confidence: leg.diagnosis?.confidence ?? null,
    rationale: leg.objectiveTransition?.rationale ?? 'Adaptive leg objective transition.',
    status: leg.status
  });
}

function appendObjectiveHistory(history, entry) {
  const objectiveId = normalizeMissionObjectiveId(entry.toObjectiveId ?? entry.objectiveId ?? 'reconnaissanceSurvey');
  const normalized = {
    legIndex: Math.max(0, Math.round(finiteNumber(entry.legIndex, 0))),
    time: finiteNumber(entry.time, 0),
    fromObjectiveId: stringOrNull(entry.fromObjectiveId),
    toObjectiveId: objectiveId,
    diagnosisId: stringOrNull(entry.diagnosisId),
    confidence: finiteOrNull(entry.confidence),
    rationale: stringOrNull(entry.rationale) ?? 'Adaptive objective history entry.',
    status: stringOrNull(entry.status) ?? 'objective',
    createdAt: entry.createdAt ?? new Date().toISOString()
  };
  const key = `${normalized.legIndex}:${normalized.fromObjectiveId ?? 'none'}:${normalized.toObjectiveId}:${normalized.status}`;
  const existing = (Array.isArray(history) ? history : []).filter((item) => `${item.legIndex}:${item.fromObjectiveId ?? 'none'}:${item.toObjectiveId}:${item.status}` !== key);
  return [...existing, normalized].sort((a, b) => a.legIndex - b.legIndex || a.time - b.time);
}

function appendEvidence(history, evidence, legIndex) {
  if (!evidence) return history;
  return upsertByKey(history, { legIndex, evidence: compactObject(evidence), time: evidence.time ?? 0 }, (entry) => `evidence:${entry.legIndex}`, chooseMoreCompleteObject);
}

function appendDiagnosis(history, diagnosis, legIndex) {
  if (!diagnosis) return history;
  return upsertByKey(history, { legIndex, diagnosis: compactObject(diagnosis), diagnosisId: diagnosis.primaryDiagnosis ?? diagnosis.id ?? null, confidence: diagnosis.confidence ?? null }, (entry) => `diagnosis:${entry.legIndex}:${entry.diagnosisId ?? 'unknown'}`, chooseMoreCompleteObject);
}

function upsertByKey(values, next, keyFn, choose = chooseMoreCompleteObject) {
  const map = new Map();
  for (const value of Array.isArray(values) ? values : []) map.set(keyFn(value), cloneJson(value));
  const key = keyFn(next);
  map.set(key, choose(map.get(key), next));
  return [...map.values()];
}

function chooseMoreCompleteLeg(existing, incoming) {
  if (!existing) return incoming;
  return completenessScore(incoming) >= completenessScore(existing) ? { ...existing, ...incoming, metrics: { ...(existing.metrics ?? {}), ...(incoming.metrics ?? {}) } } : existing;
}

function chooseMoreCompleteObject(existing, incoming) {
  if (!existing) return incoming;
  return completenessScore(incoming) >= completenessScore(existing) ? { ...existing, ...incoming } : existing;
}

function completenessScore(value = {}) {
  if (!value || typeof value !== 'object') return 0;
  return Object.values(value).reduce((sum, entry) => sum + (entry == null ? 0 : Array.isArray(entry) ? Math.min(entry.length, 4) : typeof entry === 'object' ? Object.keys(entry).length : 1), 0);
}

function statusFromLeg(record) {
  if (record.status === 'failed') return 'aborted';
  if (record.nextLegHandoff || record.status === 'nextObjectiveRecommended') return 'nextLegReady';
  if (record.diagnosis || record.objectiveTransition) return 'surfacingReview';
  if (record.runRecord || record.routeExecutionRecord || record.resultId) return 'executingLeg';
  return 'planningLeg';
}

function decisionKey(decision) {
  return `decision:${decision.legIndex ?? 0}:${decision.objectiveTransition?.transitionId ?? decision.time ?? 'decision'}`;
}

function handoffKey(handoff) {
  return `handoff:${handoff.legIndex ?? 0}:${handoff.recommendedObjectiveId ?? handoff.transition?.toObjectiveId ?? 'objective'}`;
}

function normalizeSessionStatus(value) {
  const status = String(value ?? 'initialized');
  return SESSION_STATUS_VALUES.has(status) ? status : 'initialized';
}

function compactObject(value, depth = 0) {
  if (value == null) return null;
  if (depth > 8) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, 120).map((entry) => compactObject(entry, depth + 1));
  if (typeof value !== 'object') return value;
  const omitted = new Set(['truth', 'truthField', 'truthFields', 'hiddenTruth', 'hiddenOcean', 'forecastMembers', 'frames', 'trajectories', 'debugTrace', 'simulationTrace', 'rawResult', 'rawLevel', 'level', 'mission', 'plan']);
  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    if (omitted.has(key)) continue;
    out[key] = compactObject(entry, depth + 1);
  }
  return out;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.map((entry) => compactObject(entry)) : [];
}

function stringOrNull(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeStringList(values) {
  return Array.isArray(values) ? values.map((value) => String(value ?? '').trim()).filter(Boolean) : [];
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value ?? '').trim()).filter(Boolean))];
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}
