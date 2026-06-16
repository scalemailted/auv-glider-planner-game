import {
  addBenchmarkAttempt,
  benchmarkAttemptSummary,
  compareBenchmarkAttempts,
  createBenchmarkAttempt,
  createBenchmarkAttemptSet
} from './BenchmarkAttemptRegistry.js';
import { normalizeBenchmarkAttemptSource } from './BenchmarkEpisodeContract.js';
import { createRouteExecutionMetrics } from './BenchmarkRouteExecutionRecord.js';

export const BENCHMARK_ATTEMPT_SESSION_VERSION = 'benchmark-attempt-session-p2';

export function createBenchmarkAttemptSession(options = {}) {
  const attemptSet = createBenchmarkAttemptSet({
    episodeId: options.episodeId,
    benchmarkMode: options.benchmarkMode ?? 'plannerBenchmark',
    attempts: options.attempts ?? [],
    createdAt: options.createdAt,
    notes: options.notes
  });
  return {
    type: 'anchor.benchmark.attempt-session',
    version: BENCHMARK_ATTEMPT_SESSION_VERSION,
    episodeId: attemptSet.episodeId,
    benchmarkMode: attemptSet.benchmarkMode,
    attempts: attemptSet.attempts,
    comparison: attemptSet.comparison,
    createdAt: options.createdAt ?? attemptSet.createdAt,
    updatedAt: options.updatedAt ?? options.createdAt ?? attemptSet.createdAt,
    notes: Array.isArray(options.notes) ? [...options.notes] : []
  };
}

export function addResultToBenchmarkAttemptSession(session, resultContext = {}) {
  const base = createBenchmarkAttemptSession(session ?? {
    episodeId: resultContext.episodeId,
    benchmarkMode: resultContext.benchmarkMode
  });
  const runRecord = resultContext.runRecord ?? resultContext.runRecordExport?.runRecord ?? null;
  const routeExecutionRecord = resultContext.routeExecutionRecord ?? resultContext.routeExecutionExport ?? null;
  const result = resultContext.result ?? {};
  const source = normalizeBenchmarkAttemptSource(
    resultContext.attemptSource
      ?? routeExecutionRecord?.attemptSource
      ?? runRecord?.diagnostics?.attemptSource
      ?? result?.benchmarkMetadata?.attemptSource
      ?? 'manualPlayer'
  );
  const attempt = createBenchmarkAttempt({
    episodeId: resultContext.episodeId ?? base.episodeId ?? routeExecutionRecord?.episodeId ?? runRecord?.diagnostics?.episodeId,
    benchmarkMode: resultContext.benchmarkMode ?? base.benchmarkMode ?? routeExecutionRecord?.benchmarkMode ?? runRecord?.benchmarkMode,
    attemptId: resultContext.attemptId ?? routeExecutionRecord?.attemptId ?? result?.attemptId,
    attemptSource: source,
    routeSourceLabel: resultContext.routeSourceLabel ?? routeExecutionRecord?.routeSourceLabel ?? result?.planName ?? result?.source,
    fairnessLabel: resultContext.fairnessLabel ?? routeExecutionRecord?.fairnessLabel ?? runRecord?.fairnessLabel,
    planId: resultContext.planId ?? routeExecutionRecord?.planId,
    resultId: resultContext.resultId ?? routeExecutionRecord?.resultId ?? result?.resultId ?? result?.id,
    status: resultContext.status ?? routeExecutionRecord?.validation?.status ?? 'completed',
    routeExecutionRecord,
    runRecord,
    metrics: createRouteExecutionMetrics(resultContext.metrics ?? routeExecutionRecord?.metrics ?? result?.summary ?? {}),
    notes: resultContext.notes
  });
  const attempts = replaceMatchingAttempt(base.attempts, attempt);
  return createBenchmarkAttemptSession({
    ...base,
    attempts,
    updatedAt: new Date().toISOString()
  });
}

export function benchmarkAttemptSessionSummary(session = {}) {
  const normalized = createBenchmarkAttemptSession(session);
  return {
    episodeId: normalized.episodeId,
    benchmarkMode: normalized.benchmarkMode,
    attemptCount: normalized.attempts.length,
    attempts: normalized.attempts.map(benchmarkAttemptSummary),
    comparison: compareBenchmarkAttempts(normalized.attempts)
  };
}

export function serializeBenchmarkAttemptSession(session = {}) {
  return createBenchmarkAttemptSession(session);
}

export function deserializeBenchmarkAttemptSession(payload = {}) {
  return createBenchmarkAttemptSession(payload);
}

function replaceMatchingAttempt(attempts, nextAttempt) {
  const key = attemptKey(nextAttempt);
  const existing = Array.isArray(attempts) ? attempts : [];
  const retained = existing.filter((attempt) => attemptKey(attempt) !== key);
  return addBenchmarkAttempt(createBenchmarkAttemptSet({ attempts: retained, episodeId: nextAttempt.episodeId, benchmarkMode: nextAttempt.benchmarkMode }), nextAttempt).attempts;
}

function attemptKey(attempt = {}) {
  return [
    attempt.episodeId ?? 'episode',
    attempt.attemptSource ?? 'source',
    attempt.resultId ?? attempt.planId ?? attempt.attemptId ?? 'attempt'
  ].join('::');
}

