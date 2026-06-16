import assert from 'node:assert/strict';

import {
  buildBenchmarkAttemptSetExportFromResult,
  buildBenchmarkComparisonExportFromResult,
  buildBenchmarkRouteExecutionExportFromResult,
  buildBenchmarkRunRecordExportFromResult
} from '../../src/core/io/ResultExporter.js';

const level = {
  levelId: 'comparison-level',
  instanceId: 'comparison-instance',
  meta: {
    seed: 'comparison-smoke',
    benchmarkMetadata: {
      benchmarkMode: 'plannerBenchmark',
      episodeId: 'comparison-episode',
      informationAccessTier: 'forecastOnly',
      objectiveAuthority: 'fixed',
      routeAuthority: 'playerOrSolver',
      fairnessLabel: 'Forecast-only',
      worldModelTier: 'flowCoupledAction'
    }
  }
};
const mission = { missionId: 'comparison-mission', agents: [{ id: 'g1' }] };
const plan = { type: 'anchor.plan', planId: 'comparison-plan', meta: { valid: true }, agentPlans: [{ agentId: 'g1', selectedStart: { x: 0, y: 0 }, waypoints: [{ x: 2, y: 2, t: 1, segmentEnergy: 3, segmentDistance: 4 }] }] };
const result = { resultId: 'comparison-result', source: 'manual', planName: 'Manual Player Plan', summary: { finalScore: 50, sampleScore: 20, energyUsed: 6, hazardsHit: 0, duplicateSamples: 1, missedWaypoints: 0, routeLength: 4 }, events: [] };
const comparisonExport = buildBenchmarkComparisonExportFromResult({ level, mission, plan, result });
assert.equal(comparisonExport.type, 'anchor.benchmark.comparison', 'comparison export type exists');
assert.equal(comparisonExport.benchmarkMode, 'plannerBenchmark', 'comparison benchmark mode');
assert.ok(comparisonExport.rankings.finalScore.length >= 1, 'comparison export includes rankings');
assert.ok(comparisonExport.routeReview, 'comparison export includes route review');
assert.ok(comparisonExport.fairnessLabels.includes('Forecast-Only'), 'comparison export includes fairness labels');
assert.equal(comparisonExport.usesNewPlanner, false, 'comparison export does not add planner');
assert.equal(comparisonExport.usesMissionScoringRedesign, false, 'comparison export does not redesign scoring');
assert.equal(comparisonExport.usesMARL, false, 'comparison export excludes MARL');
assert.ok(comparisonExport.availableBenchmarkExports.includes('anchor.benchmark.comparison'), 'comparison export lists all benchmark export types');

assert.equal(buildBenchmarkRunRecordExportFromResult({ level, mission, plan, result }).type, 'anchor.benchmark.run-record', 'run-record export still exists');
assert.equal(buildBenchmarkRouteExecutionExportFromResult({ level, mission, plan, result }).type, 'anchor.benchmark.route-execution', 'route-execution export still exists');
assert.equal(buildBenchmarkAttemptSetExportFromResult({ level, mission, plan, result }).type, 'anchor.benchmark.attempt-set', 'attempt-set export still exists');

console.log('smoke_benchmark_comparison_export: ok');