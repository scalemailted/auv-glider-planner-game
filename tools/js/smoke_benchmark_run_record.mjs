import assert from 'node:assert/strict';
import {
  BENCHMARK_RUN_RECORD_VERSION,
  createBenchmarkActionRecord,
  createBenchmarkEpisodeTrace,
  createBenchmarkObjectiveRecord,
  createBenchmarkObservationRecord,
  createBenchmarkRewardRecord,
  createBenchmarkRunRecord,
  summarizeBenchmarkRunRecord,
  validateBenchmarkRunRecord
} from '../../src/core/benchmark/BenchmarkRunRecord.js';

const observation = createBenchmarkObservationRecord({
  time: 12.25,
  gliderId: 'g1',
  position: { x: 4, y: 7 },
  sensorType: 'scalarSample',
  observedValue: 0.8,
  expectedValue: 0.6,
  surprise: 0.2,
  beliefUpdateId: 'belief-1'
});
assert.equal(observation.innovation, 0.2, 'observation innovation is derived');

const action = createBenchmarkActionRecord({
  time: 13,
  gliderId: 'g1',
  actionType: 'targetSample',
  target: { x: 5, y: 7 },
  source: 'manual',
  allowedInformation: 'beliefOnly',
  actionValue: 0.71,
  routeId: 'route-1'
});
assert.equal(action.allowedInformation, 'beliefOnly', 'action allowedInformation normalizes');

const objective = createBenchmarkObjectiveRecord({
  time: 10,
  objectiveId: 'obj-1',
  objectiveType: 'mapBoundary',
  authority: 'missionManager',
  rationale: 'front uncertainty increased',
  status: 'active'
});
assert.equal(objective.objectiveType, 'mapBoundary', 'objective type preserved');

const reward = createBenchmarkRewardRecord({
  time: 20,
  rewardType: 'scoreProxy',
  value: 3.5,
  components: { roi: 2, energy: -0.5 },
  note: 'skeleton reward'
});
assert.equal(reward.value, 3.5, 'reward value normalizes');

const record = createBenchmarkRunRecord({
  benchmarkMode: 'adaptiveBenchmark',
  scenarioId: 'smoke-scenario',
  seed: 'seed-1',
  objectives: [objective],
  observations: [observation],
  actions: [action],
  rewards: [reward],
  notes: ['empty traces are also valid in P0']
});
assert.equal(record.type, 'anchor.benchmark.run', 'run record type');
assert.equal(record.version, BENCHMARK_RUN_RECORD_VERSION, 'run record version');
assert.equal(record.benchmarkMode, 'adaptiveBenchmark', 'run benchmark mode');
assert.equal(record.fairnessLabel, 'Belief-only', 'run includes fairness label');
assert.equal(validateBenchmarkRunRecord(record).status, 'PASS', 'populated record validates');

const emptyRecord = createBenchmarkRunRecord({ benchmarkMode: 'plannerBenchmark' });
assert.equal(validateBenchmarkRunRecord(emptyRecord).status, 'PASS', 'empty trace arrays are valid skeleton');
assert.equal(emptyRecord.objectives.length, 0, 'empty objectives allowed');
assert.equal(emptyRecord.observations.length, 0, 'empty observations allowed');
assert.equal(emptyRecord.actions.length, 0, 'empty actions allowed');
assert.equal(emptyRecord.rewards.length, 0, 'empty rewards allowed');

const invalid = createBenchmarkRunRecord({});
assert.equal(validateBenchmarkRunRecord(invalid).status, 'FAIL', 'missing benchmarkMode is caught');

const trace = createBenchmarkEpisodeTrace(record);
assert.equal(trace.type, 'anchor.benchmark.episode-trace', 'episode trace type');
assert.equal(trace.actions.length, 1, 'episode trace carries actions');

const summary = summarizeBenchmarkRunRecord(record);
assert.equal(summary.rewardCount, 1, 'summary reward count');
assert.equal(summary.totalReward, 3.5, 'summary total reward');

console.log('smoke_benchmark_run_record: ok');
