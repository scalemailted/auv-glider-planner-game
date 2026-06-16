import assert from 'node:assert/strict';

import {
  benchmarkComparisonSummary,
  benchmarkMetricDefinitions,
  buildBenchmarkComparisonViewModel,
  compareBenchmarkAttemptMetrics,
  rankBenchmarkAttempts
} from '../../src/core/benchmark/BenchmarkComparisonViewModel.js';

const empty = buildBenchmarkComparisonViewModel({ attemptSet: { episodeId: 'empty', attempts: [] } });
assert.equal(empty.attemptCount, 0, 'empty attempt set has zero attempts');
assert.ok(empty.warnings.some((warning) => /No benchmark attempts/i.test(warning)), 'empty attempt set warns');

const one = buildBenchmarkComparisonViewModel({
  attemptSet: {
    episodeId: 'one-episode',
    benchmarkMode: 'plannerBenchmark',
    attempts: [{
      attemptId: 'manual-1',
      attemptSource: 'manualPlayer',
      routeSourceLabel: 'Manual Player Plan',
      fairnessLabel: 'Forecast-only',
      metrics: { finalScore: 12, energyUsed: 4, hazardsHit: 0 }
    }]
  }
});
assert.equal(one.attemptCount, 1, 'one attempt normalizes');
assert.equal(one.bestAttemptByScore.attemptId, 'manual-1', 'single attempt is best score');
assert.equal(one.attempts[0].routeSourceLabel, 'Manual Plan', 'manual source gets student label');
assert.equal(one.attempts[0].fairnessLabel, 'Forecast-Only', 'fairness label normalizes');

const multiAttempts = [
  { attemptId: 'manual', attemptSource: 'manualPlayer', routeSourceLabel: 'Manual Player Plan', fairnessLabel: 'forecastOnly', metrics: { finalScore: 20, sampleScore: 8, energyUsed: 8, hazardsHit: 1, duplicateSamples: 2 } },
  { attemptId: 'greedy', attemptSource: 'greedyPlanner', routeSourceLabel: 'Greedy Planner', fairnessLabel: 'forecastOnly', metrics: { finalScore: 24, sampleScore: 9, energyUsed: 12, hazardsHit: 0, duplicateSamples: 0 } },
  { attemptId: 'imported', attemptSource: 'importedSolver', routeSourceLabel: 'Imported Solver', fairnessLabel: 'beliefOnly', metrics: { finalScore: 18, sampleScore: null, energyUsed: 5, hazardsHit: 0, duplicateSamples: null } }
];
const multi = buildBenchmarkComparisonViewModel({
  attemptSet: { episodeId: 'multi-episode', benchmarkMode: 'plannerBenchmark', attempts: multiAttempts }
});
assert.equal(multi.attemptCount, 3, 'manual/greedy/imported attempts normalize');
assert.equal(multi.bestAttemptByScore.attemptId, 'greedy', 'best score is correct');
assert.equal(multi.lowestEnergyAttempt.attemptId, 'imported', 'lowest energy is correct');
assert.equal(multi.safestAttempt.attemptId, 'greedy', 'safest route ranks zero hazards first');
assert.equal(rankBenchmarkAttempts(multi.attempts, 'energyUsed')[0].attemptId, 'imported', 'energy ranking lower is better');
assert.equal(compareBenchmarkAttemptMetrics(multiAttempts).bestAttemptByScore.attemptId, 'greedy', 'compare helper returns best score');
assert.ok(benchmarkMetricDefinitions().some((metric) => metric.id === 'forecastRegret'), 'metric definitions include forecast regret');
assert.ok(multi.explanation.includes('does not add a new planner'), 'explanation mentions no new planner');
assert.ok(multi.explanation.includes('redesign scoring'), 'explanation mentions no scoring redesign');
assert.equal(benchmarkComparisonSummary(multi).attemptCount, 3, 'summary includes attempt count');

const nullMetrics = buildBenchmarkComparisonViewModel({
  attemptSet: { episodeId: 'nulls', attempts: [{ attemptId: 'nulls', attemptSource: 'manualPlayer', fairnessLabel: 'Forecast-only', metrics: { finalScore: null } }] }
});
assert.equal(nullMetrics.bestAttemptByScore, null, 'null metrics do not crash or rank');

console.log('smoke_benchmark_comparison_view_model: ok');