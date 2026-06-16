import assert from 'node:assert/strict';

import {
  buildBenchmarkRunRecordFromResult,
  buildRouteExecutionRecordFromResult,
  extractBenchmarkMetricsFromResult,
  inferBenchmarkFairnessLabel
} from '../../src/core/benchmark/BenchmarkResultAdapter.js';

const level = {
  levelId: 'level-fixture',
  instanceId: 'instance-fixture',
  meta: { seed: 'adapter-smoke' }
};
const mission = {
  missionId: 'mission-fixture',
  agents: [{ id: 'g1' }],
  objectives: [{ id: 'obj-1', type: 'reconnaissanceSurvey', description: 'Survey fixture cells.' }]
};
const plan = {
  type: 'anchor.plan',
  planId: 'plan-fixture',
  meta: { valid: true, planner: { usesForecast: true } },
  agentPlans: [{
    agentId: 'g1',
    selectedStart: { x: 0, y: 0 },
    waypoints: [
      { x: 2, y: 2, t: 1, action: 'sample', segmentEnergy: 2, currentAssist: 0.1 }
    ]
  }]
};
const result = {
  resultId: 'result-fixture',
  levelId: 'level-fixture',
  missionId: 'mission-fixture',
  summary: {
    finalScore: 88,
    sampleScore: 40,
    energyUsed: 12,
    hazardsHit: 1,
    duplicateSamples: 2,
    completedWaypoints: 1,
    missedWaypoints: 0,
    expectedValueRegret: 5
  },
  events: [{ type: 'sample', time: 1, agentId: 'g1', x: 2, y: 2, value: 9 }]
};

const before = JSON.stringify({ level, mission, plan, result });

const runRecord = buildBenchmarkRunRecordFromResult({
  benchmarkModeConfig: { benchmarkMode: 'plannerBenchmark', informationAccessTier: 'forecastOnly' },
  level,
  mission,
  plan,
  result,
  attemptSource: 'manualPlayer',
  routeSourceLabel: 'Manual Player Plan'
});
assert.equal(runRecord.type, 'anchor.benchmark.run');
assert.equal(runRecord.benchmarkMode, 'plannerBenchmark');
assert.equal(runRecord.diagnostics.routeExecutionSummary.finalScore, 88);
assert.equal(runRecord.actions.length, 1);
assert.equal(runRecord.objectives.length, 1);

const routeRecord = buildRouteExecutionRecordFromResult({
  benchmarkModeConfig: { benchmarkMode: 'plannerBenchmark', informationAccessTier: 'forecastOnly' },
  level,
  mission,
  plan,
  result,
  attemptSource: 'importedSolver'
});
assert.equal(routeRecord.type, 'anchor.benchmark.route-execution');
assert.equal(routeRecord.attemptSource, 'importedSolver');
assert.equal(routeRecord.metrics.finalScore, 88);
assert.equal(routeRecord.metrics.sampleScore, 40);
assert.equal(routeRecord.metrics.energyUsed, 12);
assert.equal(routeRecord.metrics.hazardsHit, 1);

const sparseMetrics = extractBenchmarkMetricsFromResult({});
assert.equal(sparseMetrics.finalScore, null, 'missing optional fields do not crash');

assert.equal(inferBenchmarkFairnessLabel({ informationAccessTier: 'oracleTruth' }), 'Oracle / truth-assisted');
assert.equal(inferBenchmarkFairnessLabel({ informationAccessTier: 'forecastOnly' }), 'Forecast-only');
assert.equal(inferBenchmarkFairnessLabel({ informationAccessTier: 'beliefOnly' }), 'Belief-only');

assert.equal(JSON.stringify({ level, mission, plan, result }), before, 'adapter does not mutate inputs');

console.log('smoke_benchmark_result_adapter: ok');
