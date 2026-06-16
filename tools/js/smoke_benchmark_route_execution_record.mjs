import assert from 'node:assert/strict';

import {
  createRouteExecutionMetrics,
  createRouteExecutionRecord,
  createRouteValidationSummary,
  summarizeRouteExecutionRecord,
  validateRouteExecutionRecord
} from '../../src/core/benchmark/BenchmarkRouteExecutionRecord.js';

const validation = createRouteValidationSummary({
  errors: ['waypoint 1 blocked by terrain'],
  warnings: ['waypoint 2 is after mission duration'],
  fuelFailureCount: 0
});
assert.equal(validation.status, 'invalidPlan');
assert.equal(validation.executable, false);
assert.equal(validation.hardFailures.length, 1);
assert.equal(validation.warnings.length, 1);
assert.equal(validation.blockedSegmentCount, 1);
assert.equal(validation.overDurationCount, 1);

const metrics = createRouteExecutionMetrics({
  summary: {
    finalScore: 42,
    sampleScore: 18,
    energyUsed: 7,
    hazardsHit: 1,
    duplicateSamples: 0,
    completedWaypoints: 3
  }
});
assert.equal(metrics.finalScore, 42);
assert.equal(metrics.forecastRegret, null, 'missing metrics remain null');

const record = createRouteExecutionRecord({
  benchmarkMode: 'plannerBenchmark',
  episodeId: 'episode-1',
  attemptId: 'attempt-1',
  attemptSource: 'manualPlayer',
  routeSourceLabel: 'Manual Player Plan',
  fairnessLabel: 'Forecast-only',
  levelId: 'level-a',
  missionId: 'mission-a',
  planId: 'plan-a',
  resultId: 'result-a',
  waypointCount: 3,
  validation,
  metrics,
  segments: [
    { agentId: 'g1', from: { x: 1, y: 1 }, to: { x: 2, y: 2 }, distance: 1.4, energy: 0.5, status: 'completed' }
  ]
});

assert.equal(validateRouteExecutionRecord(record).status, 'PASS');
const summary = summarizeRouteExecutionRecord(record);
assert.equal(summary.finalScore, 42);
assert.equal(summary.energyUsed, 7);
assert.equal(summary.hazardsHit, 1);
assert.equal(summary.completedWaypoints, 3);
assert.equal(summary.waypointCount, 3);

assert.equal(validateRouteExecutionRecord({}).status, 'FAIL', 'invalid record fails clearly');

console.log('smoke_benchmark_route_execution_record: ok');
