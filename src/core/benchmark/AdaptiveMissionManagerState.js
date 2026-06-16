import { normalizeAdaptiveManagerPolicyId, normalizeAdaptiveDiagnosisId } from './AdaptiveMissionManagerContract.js';
import { normalizeMissionObjectiveId } from './MissionObjectiveTaxonomy.js';

export const ADAPTIVE_MISSION_MANAGER_STATE_VERSION = 'adaptive-manager-state-p6';

export const ADAPTIVE_MANAGER_STATUS_IDS = [
  'idle',
  'awaitingEvidence',
  'diagnosisReady',
  'objectiveUpdated',
  'routePlanningNeeded',
  'executingExistingRoute',
  'complete',
  'placeholderOnly'
];

export function createAdaptiveMissionManagerState(options = {}) {
  const currentObjectiveId = normalizeMissionObjectiveId(options.currentObjectiveId ?? options.objectiveId ?? 'reconnaissanceSurvey');
  const episodeId = String(options.episodeId ?? 'adaptive-preview-episode');
  const initialHistory = normalizeObjectiveHistory(options.objectiveHistory);
  return {
    type: 'anchor.benchmark.adaptive-manager-state',
    version: ADAPTIVE_MISSION_MANAGER_STATE_VERSION,
    episodeId,
    benchmarkMode: 'adaptiveBenchmark',
    policyId: normalizeAdaptiveManagerPolicyId(options.policyId),
    currentObjectiveId,
    objectiveHistory: initialHistory.length ? initialHistory : [{
      time: finiteNumber(options.time, 0),
      objectiveId: currentObjectiveId,
      transitionId: 'initialObjective',
      authority: 'missionManager',
      rationale: 'Initial objective for adaptive benchmark preview.'
    }],
    diagnosisHistory: normalizeDiagnosisHistory(options.diagnosisHistory),
    evidenceHistory: normalizeArray(options.evidenceHistory),
    surfacingEvents: normalizeArray(options.surfacingEvents),
    decisionCount: Math.max(0, Math.round(finiteNumber(options.decisionCount, 0))),
    lastDecisionTime: options.lastDecisionTime === null ? null : nullableFiniteNumber(options.lastDecisionTime, null),
    routeAuthority: 'playerOrSolver',
    objectiveAuthority: 'missionManager',
    status: normalizeStatus(options.status ?? 'awaitingEvidence'),
    warnings: normalizeStringList(options.warnings)
  };
}

export function applyAdaptiveEvidenceSnapshot(stateInput = {}, evidenceInput = {}) {
  const state = createAdaptiveMissionManagerState(stateInput);
  const evidence = cloneJson(evidenceInput);
  const diagnosisId = evidence?.diagnosis?.primaryDiagnosis ?? evidence?.primaryDiagnosis;
  const diagnosisHistory = diagnosisId
    ? [...state.diagnosisHistory, {
        time: finiteNumber(evidence.time, state.lastDecisionTime ?? 0),
        diagnosisId: normalizeAdaptiveDiagnosisId(diagnosisId),
        confidence: clamp01(evidence.diagnosis?.confidence ?? evidence.confidence, 0),
        rationale: evidence.diagnosis?.rationale ?? evidence.rationale ?? 'Diagnosis supplied with evidence snapshot.'
      }]
    : state.diagnosisHistory;
  return {
    ...state,
    evidenceHistory: [...state.evidenceHistory, evidence],
    diagnosisHistory,
    status: 'diagnosisReady',
    lastDecisionTime: finiteNumber(evidence?.time, state.lastDecisionTime ?? 0),
    warnings: [...state.warnings]
  };
}

export function applyAdaptiveObjectiveTransition(stateInput = {}, transitionInput = {}) {
  const state = createAdaptiveMissionManagerState(stateInput);
  const transition = cloneJson(transitionInput);
  const toObjectiveId = normalizeMissionObjectiveId(transition?.toObjectiveId ?? state.currentObjectiveId);
  const diagnosisId = normalizeAdaptiveDiagnosisId(transition?.diagnosisId);
  const decisionTime = finiteNumber(transition?.time, state.lastDecisionTime ?? 0);
  const diagnosisHistory = transition?.diagnosisId
    ? [...state.diagnosisHistory, {
        time: decisionTime,
        diagnosisId,
        confidence: clamp01(transition?.confidence, 0),
        rationale: transition?.rationale ?? 'Objective transition diagnosis.'
      }]
    : state.diagnosisHistory;
  return {
    ...state,
    currentObjectiveId: toObjectiveId,
    objectiveHistory: [...state.objectiveHistory, {
      time: decisionTime,
      objectiveId: toObjectiveId,
      fromObjectiveId: normalizeMissionObjectiveId(transition?.fromObjectiveId ?? state.currentObjectiveId),
      transitionId: String(transition?.transitionId ?? 'keepCurrentObjective'),
      authority: 'missionManager',
      rationale: String(transition?.rationale ?? 'Adaptive objective transition applied.')
    }],
    diagnosisHistory,
    decisionCount: state.decisionCount + 1,
    lastDecisionTime: decisionTime,
    routeAuthority: 'playerOrSolver',
    objectiveAuthority: 'missionManager',
    status: 'routePlanningNeeded',
    warnings: mergeUnique([...state.warnings, ...normalizeStringList(transition?.notes)])
  };
}

export function adaptiveMissionManagerStateSummary(stateInput = {}) {
  const state = createAdaptiveMissionManagerState(stateInput);
  return {
    type: state.type,
    version: state.version,
    episodeId: state.episodeId,
    benchmarkMode: state.benchmarkMode,
    policyId: state.policyId,
    currentObjectiveId: state.currentObjectiveId,
    objectiveHistoryCount: state.objectiveHistory.length,
    evidenceCount: state.evidenceHistory.length,
    diagnosisCount: state.diagnosisHistory.length,
    surfacingEventCount: state.surfacingEvents.length,
    decisionCount: state.decisionCount,
    status: state.status,
    objectiveAuthority: state.objectiveAuthority,
    routeAuthority: state.routeAuthority
  };
}

export function validateAdaptiveMissionManagerState(state = {}) {
  const errors = [];
  const warnings = [];
  if (!state || typeof state !== 'object') {
    return { status: 'FAIL', valid: false, errors: ['Adaptive mission manager state must be an object.'], warnings };
  }
  if (state.type !== 'anchor.benchmark.adaptive-manager-state') errors.push(`Expected type anchor.benchmark.adaptive-manager-state, got ${state.type ?? 'missing'}.`);
  if (!state.episodeId) errors.push('episodeId is required.');
  if (state.benchmarkMode !== 'adaptiveBenchmark') errors.push('benchmarkMode must be adaptiveBenchmark.');
  if (state.objectiveAuthority !== 'missionManager') errors.push('objectiveAuthority must be missionManager.');
  if (state.routeAuthority !== 'playerOrSolver') errors.push('routeAuthority must be playerOrSolver.');
  if (!ADAPTIVE_MANAGER_STATUS_IDS.includes(state.status)) errors.push(`Unknown status: ${state.status ?? 'missing'}.`);
  if (!Array.isArray(state.objectiveHistory)) errors.push('objectiveHistory must be an array.');
  if (!Array.isArray(state.diagnosisHistory)) errors.push('diagnosisHistory must be an array.');
  if (!Array.isArray(state.evidenceHistory)) errors.push('evidenceHistory must be an array.');
  if (!Array.isArray(state.surfacingEvents)) errors.push('surfacingEvents must be an array.');
  if (!Number.isFinite(Number(state.decisionCount))) errors.push('decisionCount must be finite.');
  return {
    status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS',
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function normalizeObjectiveHistory(history) {
  return Array.isArray(history)
    ? history.map((entry) => ({ ...entry, objectiveId: normalizeMissionObjectiveId(entry?.objectiveId) })).filter((entry) => entry.objectiveId)
    : [];
}

function normalizeDiagnosisHistory(history) {
  return Array.isArray(history)
    ? history.map((entry) => ({ ...entry, diagnosisId: normalizeAdaptiveDiagnosisId(entry?.diagnosisId ?? entry?.primaryDiagnosis) }))
    : [];
}

function normalizeStatus(status) {
  const value = String(status ?? '').trim();
  return ADAPTIVE_MANAGER_STATUS_IDS.includes(value) ? value : 'awaitingEvidence';
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.map((entry) => cloneJson(entry)) : [];
}

function normalizeStringList(value) {
  return Array.isArray(value)
    ? value.map((entry) => String(entry ?? '').trim()).filter(Boolean)
    : [];
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

function nullableFiniteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp01(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : fallback;
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}
