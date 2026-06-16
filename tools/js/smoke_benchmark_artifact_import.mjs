import assert from 'node:assert/strict';

import {
  BENCHMARK_IMPORT_SUPPORTED_TYPES,
  extractAttemptFromBenchmarkArtifact,
  mergeBenchmarkArtifactsIntoAttemptSession,
  normalizeImportedBenchmarkArtifact,
  parseBenchmarkArtifact,
  validateBenchmarkArtifactCompatibility
} from '../../src/core/benchmark/BenchmarkArtifactImport.js';
import { createBenchmarkAttemptSession } from '../../src/core/benchmark/BenchmarkAttemptSession.js';

const routeExecution = {
  type: 'anchor.benchmark.route-execution',
  benchmarkMode: 'plannerBenchmark',
  episodeId: 'episode-p5',
  attemptId: 'attempt-route',
  attemptSource: 'manualPlayer',
  routeSourceLabel: 'Manual Player Plan',
  fairnessLabel: 'Forecast-Only',
  planId: 'plan-1',
  resultId: 'result-1',
  validation: { status: 'completed', executable: true },
  metrics: { finalScore: 42, energyUsed: 11, hazardsHit: 0, duplicateSamples: 1 },
  segments: [
    { segmentIndex: 0, from: { x: 0, y: 0 }, to: { x: 2, y: 1 }, energy: 3, status: 'completed' }
  ]
};

assert.ok(BENCHMARK_IMPORT_SUPPORTED_TYPES.includes('anchor.benchmark.route-execution'), 'route execution import type is supported');
const parsed = parseBenchmarkArtifact(JSON.stringify(routeExecution));
assert.equal(parsed.status, 'PASS', 'route execution parses');
assert.equal(parsed.artifacts.length, 1, 'one artifact parsed');
const artifact = normalizeImportedBenchmarkArtifact(routeExecution);
assert.equal(artifact.artifactType, 'anchor.benchmark.route-execution', 'artifact classified');
assert.equal(artifact.hasRouteGeometry, true, 'route geometry detected');
const compatible = validateBenchmarkArtifactCompatibility({ artifact, currentEpisode: { episodeId: 'episode-p5', benchmarkMode: 'plannerBenchmark' } });
assert.equal(compatible.compatible, true, 'matching episode is compatible');
const mismatch = validateBenchmarkArtifactCompatibility({ artifact, currentEpisode: { episodeId: 'other-episode', benchmarkMode: 'plannerBenchmark' } });
assert.equal(mismatch.referenceOnly, true, 'mismatched episode is reference-only');
const extracted = extractAttemptFromBenchmarkArtifact({ artifact });
assert.equal(extracted.attempts.length, 1, 'attempt extracted');
assert.equal(extracted.attempts[0].routeGeometry.segments.length, 1, 'attempt carries route geometry');
const merged = mergeBenchmarkArtifactsIntoAttemptSession({
  session: createBenchmarkAttemptSession({ episodeId: 'episode-p5', benchmarkMode: 'plannerBenchmark' }),
  artifacts: [artifact],
  currentEpisode: { episodeId: 'episode-p5', benchmarkMode: 'plannerBenchmark' }
});
assert.equal(merged.mergedCount, 1, 'compatible artifact merges');
assert.equal(merged.session.attempts.length, 1, 'session has merged attempt');

console.log('smoke_benchmark_artifact_import: ok');