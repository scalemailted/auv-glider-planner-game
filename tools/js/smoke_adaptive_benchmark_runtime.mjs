import assert from 'node:assert/strict';

import {
  adaptiveBenchmarkRuntimeSummary,
  createAdaptiveBenchmarkEpisodeId,
  initializeAdaptiveBenchmarkEpisode,
  validateAdaptiveBenchmarkRuntimeContext
} from '../../src/core/benchmark/AdaptiveBenchmarkRuntime.js';

const episodeId = createAdaptiveBenchmarkEpisodeId({ seed: 'runtime-smoke', createdAt: '2026-06-16T00:00:00.000Z' });
assert.match(episodeId, /^adaptiveBenchmark-runtime-smoke-/);

const context = initializeAdaptiveBenchmarkEpisode({ episodeId: 'adaptive-runtime-smoke', currentObjectiveId: 'reduceUncertainty' });
assert.equal(context.benchmarkMode, 'adaptiveBenchmark');
assert.equal(context.objectiveAuthority, 'missionManager');
assert.equal(context.routeAuthority, 'playerOrSolver');
assert.equal(context.activeLegIndex, 0);
assert.equal(context.activeObjective.id, 'reduceUncertainty');
assert.equal(validateAdaptiveBenchmarkRuntimeContext(context).valid, true);

const invalid = validateAdaptiveBenchmarkRuntimeContext({ benchmarkMode: 'adaptiveBenchmark', objectiveAuthority: 'missionManager', routeAuthority: 'playerOrSolver' });
assert.equal(invalid.valid, false);
assert(invalid.errors.some((message) => message.includes('episodeId')));

const summary = adaptiveBenchmarkRuntimeSummary(context);
assert.equal(summary.routeAuthority, 'playerOrSolver');
assert(!JSON.stringify(summary).toLowerCase().includes('marl/rl implementation'));

console.log('smoke_adaptive_benchmark_runtime: ok');
