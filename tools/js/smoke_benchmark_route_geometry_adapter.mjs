import assert from 'node:assert/strict';

import {
  WAYPOINT_ONLY_SEGMENT_WARNING,
  buildRouteSegmentGeometry,
  extractRouteGeometryFromPlan,
  extractRouteGeometryFromRouteExecutionRecord,
  normalizeBenchmarkRouteGeometry,
  routeGeometryBounds,
  routeGeometryStats,
  validateBenchmarkRouteGeometry
} from '../../src/core/benchmark/BenchmarkRouteGeometryAdapter.js';

const plan = {
  type: 'anchor.plan',
  planId: 'geometry-plan',
  meta: { name: 'Unsafe <script> Route' },
  agentPlans: [{
    agentId: 'g1',
    selectedStart: { x: 0, y: 0 },
    waypoints: [
      { id: 'wp-a', x: 2, y: 1, t: 1, segmentDistance: 2.2, segmentEnergy: 3, currentAssist: 0.4 },
      { id: 'wp-b', x: 4, y: 3, t: 2, warnings: ['near hazard'] }
    ]
  }]
};
const before = JSON.stringify(plan);
const planGeometry = extractRouteGeometryFromPlan(plan);
assert.equal(JSON.stringify(plan), before, 'plan input is not mutated');
assert.equal(planGeometry.planId, 'geometry-plan', 'plan id is preserved');
assert.equal(planGeometry.partial, true, 'plan-only geometry is partial');
assert.ok(planGeometry.warnings.includes(WAYPOINT_ONLY_SEGMENT_WARNING), 'waypoint-only warning appears');
assert.equal(planGeometry.waypoints.length, 3, 'start plus two waypoints are present');
assert.equal(planGeometry.segments.length, 2, 'straight-line plan segments are built');
assert.equal(validateBenchmarkRouteGeometry(planGeometry).valid, true, 'plan geometry validates');

const builtSegments = buildRouteSegmentGeometry(planGeometry.waypoints, { idPrefix: 'straight' });
assert.equal(builtSegments.length, 2, 'straight-line segment helper builds segments');
assert.ok(Number.isFinite(routeGeometryBounds(planGeometry).maxX), 'bounds are finite');
assert.ok(routeGeometryStats(planGeometry).finiteBounds, 'stats report finite bounds');

const routeExecutionRecord = {
  type: 'anchor.benchmark.route-execution',
  benchmarkMode: 'plannerBenchmark',
  episodeId: 'geometry-episode',
  attemptId: 'geometry-attempt',
  attemptSource: 'manualPlayer',
  routeSourceLabel: 'Manual Player Plan',
  fairnessLabel: 'Forecast-only',
  planId: 'geometry-plan',
  resultId: 'geometry-result',
  validation: { status: 'executable', executable: true, warnings: [] },
  metrics: { finalScore: 10, energyUsed: 5 },
  segments: [
    { segmentIndex: 0, from: { x: 0, y: 0 }, to: { x: 1, y: 1 }, distance: 1.4, energy: 2, currentAssist: 0.25, crossCurrent: 0.1, status: 'completed' },
    { segmentIndex: 1, from: { x: 1, y: 1 }, to: { x: 2, y: 3 }, distance: 2.2, energy: 3, currentOpposition: 0.4, crossCurrent: 0.8, hazardPenalty: 1, status: 'completed', warnings: ['hazard exposure'] }
  ]
};
const recordBefore = JSON.stringify(routeExecutionRecord);
const recordGeometry = extractRouteGeometryFromRouteExecutionRecord(routeExecutionRecord);
assert.equal(JSON.stringify(routeExecutionRecord), recordBefore, 'route execution record input is not mutated');
assert.equal(recordGeometry.segments.length, 2, 'route execution segments are preserved');
assert.equal(recordGeometry.segments[1].hazardPenalty, 1, 'hazard penalty is preserved');
assert.equal(recordGeometry.partial, false, 'record with segment outcome metrics is not partial');
assert.equal(routeGeometryStats(recordGeometry).hazardSegmentCount, 1, 'hazard segment stats are computed');

const empty = normalizeBenchmarkRouteGeometry(null);
assert.equal(empty.partial, true, 'missing geometry normalizes to partial');
assert.doesNotThrow(() => validateBenchmarkRouteGeometry(empty), 'missing geometry validation does not crash');

console.log('smoke_benchmark_route_geometry_adapter: ok');