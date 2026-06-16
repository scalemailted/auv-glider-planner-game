import assert from 'node:assert/strict';

import {
  buildBenchmarkAttemptSetExportFromResult,
  buildBenchmarkRouteExecutionExportFromResult,
  buildBenchmarkRunRecordExportFromResult
} from '../../src/core/io/ResultExporter.js';

const level = {
  levelId: 'export-level',
  instanceId: 'export-instance',
  meta: {
    seed: 'export-smoke',
    benchmarkMetadata: {
      benchmarkMode: 'plannerBenchmark',
      benchmarkModeConfigVersion: 'benchmark-mode-contract-p0',
      episodeId: 'export-episode',
      informationAccessTier: 'forecastOnly',
      objectiveAuthority: 'fixed',
      routeAuthority: 'playerOrSolver',
      fairnessLabel: 'Forecast-only',
      worldModelTier: 'flowCoupledAction'
    }
  }
};
const mission = {
  missionId: 'export-mission',
  agents: [{ id: 'g1' }],
  objectives: [{ id: 'survey', type: 'reconnaissanceSurvey', description: 'Survey fixture cells.' }]
};
const plan = {
  type: 'anchor.plan',
  planId: 'export-plan',
  meta: { valid: true },
  agentPlans: [{ agentId: 'g1', waypoints: [{ x: 2, y: 2, t: 1, segmentEnergy: 2 }] }]
};
const result = {
  resultId: 'export-result',
  source: 'manual',
  planName: 'Manual Player Plan',
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

const runExport = buildBenchmarkRunRecordExportFromResult({ level, mission, plan, result });
assert.equal(runExport.type, 'anchor.benchmark.run-record', 'run-record export type');
assert.equal(runExport.runRecord.type, 'anchor.benchmark.run', 'inner run record type');
assert.equal(runExport.benchmarkMode, 'plannerBenchmark', 'run export benchmark mode');
assert.equal(runExport.objectiveAuthority, 'fixed', 'fixed objective authority');
assert.equal(runExport.routeAuthority, 'playerOrSolver', 'player-or-solver route authority');
assert.equal(runExport.boundaryFlags.usesNewPlanner, false, 'run export does not add planner');
assert.equal(runExport.boundaryFlags.usesMissionScoringRedesign, false, 'run export does not redesign scoring');
assert.equal(runExport.runRecord.diagnostics.routeExecutionSummary.finalScore, 88, 'metrics survive run normalization');

const routeExport = buildBenchmarkRouteExecutionExportFromResult({ level, mission, plan, result });
assert.equal(routeExport.type, 'anchor.benchmark.route-execution', 'route-execution export type');
assert.equal(routeExport.attemptSource, 'manualPlayer', 'route attempt source normalized');
assert.equal(routeExport.metrics.finalScore, 88, 'route final score survives');
assert.equal(routeExport.metrics.energyUsed, 12, 'route energy survives');

const attemptSet = buildBenchmarkAttemptSetExportFromResult({ level, mission, plan, result });
assert.equal(attemptSet.type, 'anchor.benchmark.attempt-set', 'attempt-set export type');
assert.equal(attemptSet.episodeId, 'export-episode', 'attempt set episode');
assert.equal(attemptSet.attempts.length, 1, 'attempt set includes current attempt');

const sparse = buildBenchmarkRouteExecutionExportFromResult({
  level,
  mission,
  plan,
  result: { resultId: 'sparse-result', summary: {} }
});
assert.equal(sparse.metrics.finalScore, null, 'missing optional metrics export as null');

console.log('smoke_benchmark_result_exports: ok');

