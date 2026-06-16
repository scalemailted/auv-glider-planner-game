import assert from 'node:assert/strict';

import {
  BENCHMARK_EPISODE_RUNTIME_VERSION,
  createBenchmarkEpisodeId,
  derivePlannerBenchmarkEpisodeFromLevel,
  initializePlannerBenchmarkEpisode,
  validatePlannerBenchmarkRuntimeContext
} from '../../src/core/benchmark/BenchmarkEpisodeRuntime.js';

assert.equal(BENCHMARK_EPISODE_RUNTIME_VERSION, 'benchmark-episode-runtime-p2', 'runtime version');

const context = initializePlannerBenchmarkEpisode({
  levelId: 'level-runtime',
  missionId: 'mission-runtime',
  seed: 'runtime-smoke',
  informationAccessTier: 'forecastOnly',
  activeAttemptSource: 'manualPlayer',
  createdAt: '2026-06-16T00:00:00.000Z'
});

assert.equal(context.benchmarkMode, 'plannerBenchmark', 'planner benchmark context');
assert.ok(context.episodeId.length > 0, 'episodeId is non-empty');
assert.equal(context.objectiveAuthority, 'fixed', 'fixed objective authority');
assert.equal(context.routeAuthority, 'playerOrSolver', 'player-or-solver route authority');
assert.equal(context.fairnessLabel, 'Forecast-only', 'fairness inferred from forecast-only tier');
assert.equal(validatePlannerBenchmarkRuntimeContext(context).status, 'PASS', 'valid context passes validation');

const generatedId = createBenchmarkEpisodeId({
  benchmarkMode: 'plannerBenchmark',
  levelId: 'level-runtime',
  createdAt: '2026-06-16T00:00:00.000Z'
});
assert.ok(generatedId.includes('plannerBenchmark'), 'generated ID includes mode');

assert.equal(derivePlannerBenchmarkEpisodeFromLevel({ levelId: 'no-metadata' }), null, 'missing metadata does not auto-create');
assert.equal(
  derivePlannerBenchmarkEpisodeFromLevel({ levelId: 'with-default' }, { createIfMissing: true })?.benchmarkMode,
  'plannerBenchmark',
  'explicit default creation works'
);

const invalid = validatePlannerBenchmarkRuntimeContext({
  benchmarkMode: 'adaptiveBenchmark',
  episodeId: '',
  objectiveAuthority: 'missionManager',
  routeAuthority: 'playerOrSolver'
});
assert.equal(invalid.status, 'FAIL', 'invalid context fails validation');

console.log('smoke_benchmark_episode_runtime: ok');

