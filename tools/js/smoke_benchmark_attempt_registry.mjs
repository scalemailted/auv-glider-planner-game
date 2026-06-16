import assert from 'node:assert/strict';

import {
  addBenchmarkAttempt,
  benchmarkAttemptSummary,
  compareBenchmarkAttempts,
  createBenchmarkAttempt,
  createBenchmarkAttemptSet
} from '../../src/core/benchmark/BenchmarkAttemptRegistry.js';

const empty = createBenchmarkAttemptSet({ episodeId: 'episode-1', benchmarkMode: 'plannerBenchmark' });
assert.equal(empty.type, 'anchor.benchmark.attempt-set');
assert.equal(empty.attempts.length, 0);
assert.equal(empty.comparison.attemptCount, 0);

const manual = createBenchmarkAttempt({
  episodeId: 'episode-1',
  attemptSource: 'manualPlayer',
  routeSourceLabel: 'Manual Player Plan',
  fairnessLabel: 'Forecast-only',
  status: 'completed',
  metrics: { finalScore: 50, sampleScore: 30, energyUsed: 10, hazardsHit: 1, duplicateSamples: 0 }
});
const greedy = createBenchmarkAttempt({
  episodeId: 'episode-1',
  attemptSource: 'greedyPlanner',
  routeSourceLabel: 'Greedy Planner',
  fairnessLabel: 'Forecast-only',
  status: 'completed',
  metrics: { finalScore: 65, sampleScore: 25, energyUsed: 8, hazardsHit: 0, duplicateSamples: 1 }
});

let set = addBenchmarkAttempt(empty, manual);
set = addBenchmarkAttempt(set, greedy);
assert.equal(set.attempts.length, 2);
assert.equal(set.comparison.bestFinalScore.routeSourceLabel, 'Greedy Planner');
assert.equal(set.comparison.lowestEnergyUsed.routeSourceLabel, 'Greedy Planner');
assert.equal(set.comparison.highestSampleScore.routeSourceLabel, 'Manual Player Plan');
assert.deepEqual(set.comparison.fairnessLabels, ['Forecast-only']);

const summary = benchmarkAttemptSummary(manual);
assert.equal(summary.routeSourceLabel, 'Manual Player Plan');
assert.equal(summary.fairnessLabel, 'Forecast-only');

const comparison = compareBenchmarkAttempts([manual, greedy]);
assert.equal(comparison.fewestHazardsHit.routeSourceLabel, 'Greedy Planner');

console.log('smoke_benchmark_attempt_registry: ok');
