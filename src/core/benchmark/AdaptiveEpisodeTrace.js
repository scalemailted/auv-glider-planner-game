export const ADAPTIVE_EPISODE_TRACE_VERSION = 'adaptive-episode-trace-p7';

export function createAdaptiveEpisodeTrace(options = {}) {
  return {
    type: 'anchor.benchmark.adaptive-episode-trace',
    version: ADAPTIVE_EPISODE_TRACE_VERSION,
    episodeId: String(options.episodeId ?? options.runtimeContext?.episodeId ?? 'adaptive-preview-episode'),
    benchmarkMode: 'adaptiveBenchmark',
    policyId: String(options.policyId ?? options.runtimeContext?.adaptiveManagerConfig?.policyId ?? options.managerConfig?.policyId ?? 'transparentRuleManager'),
    informationAccessTier: String(options.informationAccessTier ?? options.runtimeContext?.informationAccessTier ?? 'beliefOnly'),
    objectiveAuthority: 'missionManager',
    routeAuthority: 'playerOrSolver',
    legs: normalizeArray(options.legs),
    surfacingDecisions: normalizeArray(options.surfacingDecisions),
    objectiveHistory: normalizeArray(options.objectiveHistory ?? options.runtimeContext?.adaptiveManagerState?.objectiveHistory),
    evidenceHistory: normalizeArray(options.evidenceHistory),
    diagnostics: cloneJson(options.diagnostics ?? {}),
    exports: normalizeArray(options.exports),
    notes: normalizeStringList(options.notes)
  };
}

export function appendAdaptiveSurfacingDecision(traceInput = {}, decision = {}) {
  const trace = createAdaptiveEpisodeTrace(traceInput);
  const normalizedDecision = cloneJson(decision ?? {});
  const transition = normalizedDecision.objectiveTransition ?? {};
  return {
    ...trace,
    surfacingDecisions: [...trace.surfacingDecisions, normalizedDecision],
    objectiveHistory: appendObjectiveHistory(trace.objectiveHistory, transition, normalizedDecision),
    evidenceHistory: normalizedDecision.evidence ? [...trace.evidenceHistory, cloneJson(normalizedDecision.evidence)] : trace.evidenceHistory,
    diagnostics: {
      ...(trace.diagnostics ?? {}),
      lastPrimaryDiagnosis: normalizedDecision.diagnosis?.primaryDiagnosis ?? trace.diagnostics?.lastPrimaryDiagnosis ?? null,
      lastRecommendedObjectiveId: transition.toObjectiveId ?? normalizedDecision.recommendedObjective?.id ?? null
    }
  };
}

export function appendAdaptiveLegResult(traceInput = {}, resultRecord = {}) {
  const trace = createAdaptiveEpisodeTrace(traceInput);
  const record = cloneJson(resultRecord ?? {});
  const legIndex = Number.isFinite(Number(record.legIndex)) ? Number(record.legIndex) : trace.legs.length;
  const leg = {
    legIndex,
    objectiveId: record.objectiveId ?? record.activeObjectiveId ?? record.objective?.id ?? null,
    planId: record.planId ?? record.plan?.planId ?? record.plan?.id ?? null,
    resultId: record.resultId ?? record.result?.resultId ?? record.result?.id ?? null,
    routeExecutionRecord: cloneJson(record.routeExecutionRecord ?? null),
    runRecord: cloneJson(record.runRecord ?? null),
    status: String(record.status ?? 'completed')
  };
  return { ...trace, legs: [...trace.legs, leg] };
}

export function adaptiveEpisodeTraceSummary(traceInput = {}) {
  const trace = createAdaptiveEpisodeTrace(traceInput);
  return {
    type: trace.type,
    episodeId: trace.episodeId,
    benchmarkMode: trace.benchmarkMode,
    policyId: trace.policyId,
    legCount: trace.legs.length,
    surfacingDecisionCount: trace.surfacingDecisions.length,
    objectiveHistoryCount: trace.objectiveHistory.length,
    evidenceHistoryCount: trace.evidenceHistory.length,
    objectiveAuthority: trace.objectiveAuthority,
    routeAuthority: trace.routeAuthority
  };
}

export function validateAdaptiveEpisodeTrace(trace = {}) {
  const errors = [];
  const warnings = [];
  if (!trace || typeof trace !== 'object') errors.push('Adaptive episode trace must be an object.');
  if (trace?.type !== 'anchor.benchmark.adaptive-episode-trace') errors.push(`Expected type anchor.benchmark.adaptive-episode-trace, got ${trace?.type ?? 'missing'}.`);
  if (!trace?.episodeId) errors.push('episodeId is required.');
  if (trace?.benchmarkMode !== 'adaptiveBenchmark') errors.push('benchmarkMode must be adaptiveBenchmark.');
  if (trace?.objectiveAuthority !== 'missionManager') errors.push('objectiveAuthority must be missionManager.');
  if (trace?.routeAuthority !== 'playerOrSolver') errors.push('routeAuthority must be playerOrSolver.');
  if (!Array.isArray(trace?.legs)) errors.push('legs must be an array.');
  if (!Array.isArray(trace?.surfacingDecisions)) errors.push('surfacingDecisions must be an array.');
  if (!Array.isArray(trace?.objectiveHistory)) warnings.push('objectiveHistory should be an array.');
  return { status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', valid: errors.length === 0, errors, warnings };
}

function appendObjectiveHistory(history, transition = {}, decision = {}) {
  if (!transition?.toObjectiveId) return history;
  return [...history, {
    time: decision.time ?? transition.time ?? 0,
    objectiveId: transition.toObjectiveId,
    fromObjectiveId: transition.fromObjectiveId ?? null,
    transitionId: transition.transitionId ?? 'keepCurrentObjective',
    authority: 'missionManager',
    rationale: transition.rationale ?? decision.rationale ?? 'Adaptive surfacing decision.'
  }];
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.map((entry) => cloneJson(entry)) : [];
}

function normalizeStringList(value) {
  return Array.isArray(value) ? value.map((entry) => String(entry ?? '').trim()).filter(Boolean) : [];
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}
