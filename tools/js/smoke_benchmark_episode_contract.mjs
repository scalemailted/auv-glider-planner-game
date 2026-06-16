import assert from 'node:assert/strict';

import {
  BENCHMARK_ATTEMPT_SOURCE_IDS,
  BENCHMARK_EPISODE_PHASES,
  createBenchmarkEpisodeConfig,
  createBenchmarkEpisodeState,
  normalizeBenchmarkAttemptSource,
  normalizeBenchmarkExecutionStatus,
  validateBenchmarkEpisodeConfig
} from '../../src/core/benchmark/BenchmarkEpisodeContract.js';

for (const phase of ['setup', 'briefing', 'planning', 'readyToExecute', 'executing', 'debrief', 'complete', 'aborted']) {
  assert.ok(BENCHMARK_EPISODE_PHASES.includes(phase), `episode phase exists: ${phase}`);
}

for (const source of ['manualPlayer', 'greedyPlanner', 'importedSolver', 'externalSolver', 'oraclePlanner', 'benchmarkPlaceholder']) {
  assert.ok(BENCHMARK_ATTEMPT_SOURCE_IDS.includes(source), `attempt source exists: ${source}`);
}

assert.equal(normalizeBenchmarkAttemptSource('manual'), 'manualPlayer');
assert.equal(normalizeBenchmarkAttemptSource('temporalGreedy'), 'greedyPlanner');
assert.equal(normalizeBenchmarkExecutionStatus('timeout'), 'timedOut');

const planner = createBenchmarkEpisodeConfig({ benchmarkMode: 'plannerBenchmark' });
const adaptive = createBenchmarkEpisodeConfig({ benchmarkMode: 'adaptiveBenchmark' });
const full = createBenchmarkEpisodeConfig({ benchmarkMode: 'fullAutonomyBenchmark' });

for (const config of [planner, adaptive, full]) {
  assert.equal(config.type, 'anchor.benchmark.episode-config');
  assert.equal(validateBenchmarkEpisodeConfig(config).status, 'PASS', `${config.benchmarkMode} validates`);
}

assert.ok(planner.allowedAttemptSources.includes('manualPlayer'), 'planner permits manualPlayer');
assert.ok(planner.allowedAttemptSources.includes('greedyPlanner'), 'planner permits greedyPlanner');
assert.ok(planner.allowedAttemptSources.includes('importedSolver'), 'planner permits importedSolver');
assert.ok(full.allowedAttemptSources.includes('externalSolver'), 'full autonomy permits solver/agent-like external solver source');
assert.ok(full.allowedAttemptSources.includes('benchmarkPlaceholder'), 'full autonomy remains placeholder-compatible');

const state = createBenchmarkEpisodeState({ episodeConfig: planner, phase: 'planning', activeAttemptSource: 'manual' });
assert.equal(state.phase, 'planning');
assert.equal(state.activeAttemptSource, 'manualPlayer');
assert.ok(state.episodeId.includes('plannerBenchmark'), 'episode id includes benchmark mode');

assert.equal(validateBenchmarkEpisodeConfig({}).status, 'FAIL', 'validation catches missing mode');

console.log('smoke_benchmark_episode_contract: ok');
