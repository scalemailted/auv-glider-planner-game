import assert from 'node:assert/strict';
import {
  BENCHMARK_MODE_IDS,
  BENCHMARK_MODE_OPTIONS,
  INFORMATION_ACCESS_TIERS,
  WORLD_MODEL_TIERS,
  benchmarkModeById,
  benchmarkModeOptions,
  benchmarkModeSummary,
  createBenchmarkModeConfig,
  informationAccessTierById,
  normalizeBenchmarkModeId,
  validateBenchmarkModeConfig,
  worldModelTierById
} from '../../src/core/benchmark/BenchmarkModeContract.js';
import {
  benchmarkModeDebugFlags,
  benchmarkModeVisibleLayers,
  createBenchmarkModeState
} from '../../src/core/benchmark/BenchmarkModeState.js';
import { buildBenchmarkModeConfigExport } from '../../src/core/benchmark/BenchmarkModeExporter.js';

const expectedModes = {
  plannerBenchmark: {
    label: 'Planner Benchmark',
    objectiveAuthority: 'fixed',
    routeAuthority: 'playerOrSolver',
    informationAccessTier: 'forecastOnly'
  },
  adaptiveBenchmark: {
    label: 'Adaptive Benchmark',
    objectiveAuthority: 'missionManager',
    routeAuthority: 'playerOrSolver',
    informationAccessTier: 'beliefOnly'
  },
  fullAutonomyBenchmark: {
    label: 'Full Autonomy Benchmark',
    objectiveAuthority: 'solverOrAgent',
    routeAuthority: 'solverOrAgent',
    informationAccessTier: 'beliefOnly'
  }
};

assert.deepEqual(BENCHMARK_MODE_IDS, Object.keys(expectedModes), 'benchmark mode IDs are stable');
assert.equal(benchmarkModeOptions().length, 3, 'three benchmark mode options');

for (const [id, expected] of Object.entries(expectedModes)) {
  const mode = benchmarkModeById(id);
  assert.equal(mode.label, expected.label, `${id} label`);
  const config = createBenchmarkModeConfig({ benchmarkMode: id });
  assert.equal(config.objectiveAuthority, expected.objectiveAuthority, `${id} objective authority`);
  assert.equal(config.routeAuthority, expected.routeAuthority, `${id} route authority`);
  assert.equal(config.informationAccessTier, expected.informationAccessTier, `${id} default information access`);
  assert.equal(validateBenchmarkModeConfig(config).status, 'PASS', `${id} config validates`);
  assert.equal(benchmarkModeSummary(config).benchmarkMode, id, `${id} summary mode`);
  assert.ok(benchmarkModeVisibleLayers(config).length > 0, `${id} visible layers`);
  assert.equal(benchmarkModeDebugFlags(config).usesMARL, false, `${id} does not implement MARL`);
  assert.equal(benchmarkModeDebugFlags(config).usesMissionScoring, false, `${id} does not implement mission scoring`);
  assert.ok(buildBenchmarkModeConfigExport(config).benchmarkModeConfig, `${id} export has config`);
  assert.ok(createBenchmarkModeState(config).implementedSystems.includes('samplingPriorityDemo'), `${id} references S1 prerequisite`);
  assert.ok(createBenchmarkModeState(config).implementedSystems.includes('flowCoupledSamplingDemo'), `${id} references S2 prerequisite`);
}

for (const tier of ['oracleTruth', 'forecastOnly', 'beliefOnly', 'debugAll']) {
  assert.ok(INFORMATION_ACCESS_TIERS.some((entry) => entry.id === tier), `information tier ${tier}`);
  assert.equal(informationAccessTierById(tier).id, tier, `information tier lookup ${tier}`);
}

for (const tier of ['deterministicOracle', 'stochasticBelief', 'flowCoupledAction', 'plannerMission']) {
  assert.ok(WORLD_MODEL_TIERS.some((entry) => entry.id === tier), `world tier ${tier}`);
  assert.equal(worldModelTierById(tier).id, tier, `world tier lookup ${tier}`);
}

assert.equal(normalizeBenchmarkModeId('not-a-mode'), 'plannerBenchmark', 'invalid mode falls back safely');
assert.equal(validateBenchmarkModeConfig({}).status, 'FAIL', 'invalid config fails clearly');
assert.equal(BENCHMARK_MODE_OPTIONS.find((mode) => mode.id === 'fullAutonomyBenchmark').implemented, false, 'full autonomy remains placeholder');

console.log('smoke_benchmark_mode_contract: ok');
