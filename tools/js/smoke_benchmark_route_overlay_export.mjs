import assert from 'node:assert/strict';

import {
  buildBenchmarkAttemptSetExportFromResult,
  buildBenchmarkComparisonExportFromResult,
  buildBenchmarkRouteExecutionExportFromResult,
  buildBenchmarkRouteOverlayExportFromResult,
  buildBenchmarkRunRecordExportFromResult
} from '../../src/core/io/ResultExporter.js';

const level = {
  levelId: 'overlay-level',
  instanceId: 'overlay-instance',
  meta: {
    seed: 'overlay-smoke',
    benchmarkMetadata: {
      benchmarkMode: 'plannerBenchmark',
      episodeId: 'overlay-episode',
      informationAccessTier: 'forecastOnly',
      objectiveAuthority: 'fixed',
      routeAuthority: 'playerOrSolver',
      fairnessLabel: 'Forecast-only',
      worldModelTier: 'flowCoupledAction'
    }
  }
};
const mission = { missionId: 'overlay-mission', agents: [{ id: 'g1' }] };
const plan = {
  type: 'anchor.plan',
  planId: 'overlay-plan',
  meta: { valid: true },
  agentPlans: [{
    agentId: 'g1',
    selectedStart: { x: 0, y: 0 },
    waypoints: [
      { x: 2, y: 2, t: 1, segmentEnergy: 3, segmentDistance: 4, currentAssist: 0.3 },
      { x: 4, y: 3, t: 2, segmentEnergy: 6, segmentDistance: 3, crossCurrent: 0.7, hazardPenalty: 1 }
    ]
  }]
};
const result = {
  resultId: 'overlay-result',
  source: 'manual',
  planName: 'Manual Player Plan',
  summary: { finalScore: 50, sampleScore: 20, energyUsed: 9, hazardsHit: 1, duplicateSamples: 0, missedWaypoints: 0, routeLength: 7 },
  events: []
};
const overlayExport = buildBenchmarkRouteOverlayExportFromResult({ level, mission, plan, result, selectedOverlayLayer: 'energyCost' });
assert.equal(overlayExport.type, 'anchor.benchmark.route-overlay', 'route overlay export type exists');
assert.equal(overlayExport.selectedOverlayLayer, 'energyCost', 'route overlay export preserves selected layer');
assert.ok(overlayExport.geometry, 'route overlay export includes geometry');
assert.ok(overlayExport.overlayViewModelSummary, 'route overlay export includes summary');
assert.equal(overlayExport.usesNewPlanner, false, 'route overlay export does not add planner');
assert.equal(overlayExport.usesMissionScoringRedesign, false, 'route overlay export does not redesign scoring');
assert.equal(overlayExport.usesMARL, false, 'route overlay export excludes MARL');

const comparisonExport = buildBenchmarkComparisonExportFromResult({ level, mission, plan, result });
assert.equal(comparisonExport.type, 'anchor.benchmark.comparison', 'comparison export still exists');
assert.ok(comparisonExport.availableBenchmarkExports.includes('anchor.benchmark.route-overlay'), 'comparison lists route overlay export');
assert.equal(buildBenchmarkRunRecordExportFromResult({ level, mission, plan, result }).type, 'anchor.benchmark.run-record', 'run-record export still exists');
assert.equal(buildBenchmarkRouteExecutionExportFromResult({ level, mission, plan, result }).type, 'anchor.benchmark.route-execution', 'route-execution export still exists');
assert.equal(buildBenchmarkAttemptSetExportFromResult({ level, mission, plan, result }).type, 'anchor.benchmark.attempt-set', 'attempt-set export still exists');

console.log('smoke_benchmark_route_overlay_export: ok');