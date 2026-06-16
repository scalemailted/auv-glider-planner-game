import {
  normalizeBenchmarkAttemptSource,
  normalizeBenchmarkExecutionStatus
} from './BenchmarkEpisodeContract.js';
import { createRouteExecutionMetrics } from './BenchmarkRouteExecutionRecord.js';

export const BENCHMARK_ATTEMPT_SET_VERSION = 'benchmark-attempt-set-p1';

export { normalizeBenchmarkAttemptSource };

export function createBenchmarkAttempt(options = {}) {
  const metrics = options.metrics
    ?? options.routeExecutionRecord?.metrics
    ?? options.runRecord?.diagnostics?.routeExecutionSummary
    ?? {};
  return {
    attemptId: String(options.attemptId ?? makeId('attempt')),
    episodeId: stringOrNull(options.episodeId),
    benchmarkMode: String(options.benchmarkMode ?? options.routeExecutionRecord?.benchmarkMode ?? options.runRecord?.benchmarkMode ?? 'plannerBenchmark'),
    attemptSource: normalizeBenchmarkAttemptSource(options.attemptSource ?? options.routeExecutionRecord?.attemptSource),
    routeSourceLabel: String(options.routeSourceLabel ?? options.routeExecutionRecord?.routeSourceLabel ?? 'Benchmark Attempt'),
    fairnessLabel: String(options.fairnessLabel ?? options.routeExecutionRecord?.fairnessLabel ?? options.runRecord?.fairnessLabel ?? 'Unknown fairness'),
    planId: stringOrNull(options.planId ?? options.routeExecutionRecord?.planId),
    resultId: stringOrNull(options.resultId ?? options.routeExecutionRecord?.resultId),
    status: normalizeBenchmarkExecutionStatus(options.status ?? options.routeExecutionRecord?.validation?.status ?? 'notStarted'),
    routeExecutionRecord: cloneJson(options.routeExecutionRecord ?? null),
    runRecord: cloneJson(options.runRecord ?? null),
    routeGeometry: cloneJson(options.routeGeometry ?? options.routeOverlay?.geometry ?? options.routeOverlayExport?.geometry ?? null),
    importMetadata: cloneJson(options.importMetadata ?? null),
    metrics: createRouteExecutionMetrics(metrics),
    createdAt: options.createdAt ?? new Date().toISOString(),
    updatedAt: options.updatedAt ?? options.createdAt ?? new Date().toISOString(),
    notes: normalizeStringList(options.notes)
  };
}

export function createBenchmarkAttemptSet(options = {}) {
  const attempts = Array.isArray(options.attempts) ? options.attempts.map(createBenchmarkAttempt) : [];
  return {
    type: 'anchor.benchmark.attempt-set',
    version: BENCHMARK_ATTEMPT_SET_VERSION,
    episodeId: stringOrNull(options.episodeId),
    benchmarkMode: String(options.benchmarkMode ?? 'plannerBenchmark'),
    attempts,
    comparison: compareBenchmarkAttempts(attempts),
    createdAt: options.createdAt ?? new Date().toISOString(),
    updatedAt: options.updatedAt ?? options.createdAt ?? new Date().toISOString(),
    notes: normalizeStringList(options.notes)
  };
}

export function addBenchmarkAttempt(attemptSet, attempt) {
  const set = createBenchmarkAttemptSet(attemptSet ?? {});
  const nextAttempt = createBenchmarkAttempt({ episodeId: set.episodeId, benchmarkMode: set.benchmarkMode, ...attempt });
  const attempts = [...set.attempts, nextAttempt];
  return {
    ...set,
    attempts,
    comparison: compareBenchmarkAttempts(attempts)
  };
}

export function benchmarkAttemptSummary(attempt = {}) {
  const metrics = attempt.metrics ?? {};
  return {
    attemptId: attempt.attemptId ?? null,
    attemptSource: attempt.attemptSource ?? null,
    routeSourceLabel: attempt.routeSourceLabel ?? null,
    fairnessLabel: attempt.fairnessLabel ?? null,
    status: attempt.status ?? null,
    finalScore: metrics.finalScore ?? null,
    sampleScore: metrics.sampleScore ?? null,
    energyUsed: metrics.energyUsed ?? null,
    hazardsHit: metrics.hazardsHit ?? null,
    duplicateSamples: metrics.duplicateSamples ?? null
  };
}

export function compareBenchmarkAttempts(attempts = []) {
  const normalized = (Array.isArray(attempts) ? attempts : []).map((attempt) => (
    attempt?.attemptId ? attempt : createBenchmarkAttempt(attempt)
  ));
  const summaries = normalized.map(benchmarkAttemptSummary);
  return {
    attemptCount: summaries.length,
    routeSourceLabels: summaries.map((attempt) => attempt.routeSourceLabel).filter(Boolean),
    fairnessLabels: [...new Set(summaries.map((attempt) => attempt.fairnessLabel).filter(Boolean))],
    bestFinalScore: chooseMetric(summaries, 'finalScore', false),
    lowestEnergyUsed: chooseMetric(summaries, 'energyUsed', true),
    highestSampleScore: chooseMetric(summaries, 'sampleScore', false),
    fewestHazardsHit: chooseMetric(summaries, 'hazardsHit', true),
    leastDuplicateSamples: chooseMetric(summaries, 'duplicateSamples', true)
  };
}

function chooseMetric(rows, metric, lowerIsBetter) {
  const scored = rows.filter((row) => Number.isFinite(Number(row[metric])));
  if (!scored.length) return null;
  const sorted = [...scored].sort((a, b) => lowerIsBetter ? Number(a[metric]) - Number(b[metric]) : Number(b[metric]) - Number(a[metric]));
  const winner = sorted[0];
  return {
    attemptId: winner.attemptId,
    attemptSource: winner.attemptSource,
    routeSourceLabel: winner.routeSourceLabel,
    value: winner[metric]
  };
}

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeStringList(values) {
  return Array.isArray(values) ? values.map((value) => String(value ?? '').trim()).filter(Boolean) : [];
}

function stringOrNull(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}
