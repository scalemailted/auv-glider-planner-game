import assert from 'node:assert/strict';

import { extractRouteGeometryFromRouteExecutionRecord } from '../../src/core/benchmark/BenchmarkRouteGeometryAdapter.js';
import {
  benchmarkRouteOverlayLayerOptions,
  benchmarkRouteOverlaySummary,
  buildBenchmarkRouteOverlayViewModel,
  selectBenchmarkRouteSegment,
  selectBenchmarkWaypoint
} from '../../src/core/benchmark/BenchmarkRouteOverlayViewModel.js';

const record = {
  type: 'anchor.benchmark.route-execution',
  benchmarkMode: 'plannerBenchmark',
  episodeId: 'overlay-episode',
  attemptId: 'overlay-attempt',
  attemptSource: 'manualPlayer',
  routeSourceLabel: 'Manual Player Plan',
  fairnessLabel: 'Forecast-only',
  validation: { status: 'executable', executable: true },
  metrics: { finalScore: 12, energyUsed: 9 },
  segments: [
    { segmentIndex: 0, from: { x: 0, y: 0 }, to: { x: 1, y: 1 }, energy: 1, currentAssist: 0.4, sampleValue: 6, status: 'completed' },
    { segmentIndex: 1, from: { x: 1, y: 1 }, to: { x: 3, y: 2 }, energy: 8, currentAssist: -0.3, currentOpposition: 0.5, crossCurrent: 0.9, hazardPenalty: 2, status: 'completed', warnings: ['hazard'] },
    { segmentIndex: 2, from: { x: 3, y: 2 }, to: { x: 4, y: 4 }, energy: 3, status: 'missedWaypoint' }
  ]
};
const routeGeometry = extractRouteGeometryFromRouteExecutionRecord(record);
const routeReviewViewModel = { warnings: ['review warning'], segmentCount: 3 };
const comparisonViewModel = { benchmarkMode: 'plannerBenchmark', episodeId: 'overlay-episode', attempts: [{ attemptId: 'overlay-attempt', routeSourceLabel: 'Manual Player Plan', fairnessLabel: 'Forecast-only', metrics: {} }] };

const defaultVm = buildBenchmarkRouteOverlayViewModel({ routeExecutionRecord: record, routeGeometry, routeReviewViewModel, comparisonViewModel });
assert.equal(defaultVm.selectedOverlayLayer, 'routeStatus', 'routeStatus is default');
assert.ok(defaultVm.overlayLayerOptions.some((layer) => layer.id === 'energyCost'), 'energy layer exists');
assert.equal(benchmarkRouteOverlayLayerOptions().length >= 9, true, 'layer options are exposed');
assert.ok(defaultVm.segments.some((segment) => segment.className === 'segment-good'), 'completed class exists');
assert.ok(defaultVm.segments.some((segment) => segment.className === 'segment-danger'), 'missed/failed class exists');
assert.equal(defaultVm.usesNewPlanner, false, 'view model does not add planner');
assert.equal(defaultVm.usesMissionScoringRedesign, false, 'view model does not redesign scoring');
assert.equal(defaultVm.usesMARL, false, 'view model excludes MARL');

const hazardVm = buildBenchmarkRouteOverlayViewModel({ routeGeometry, selectedOverlayLayer: 'hazards' });
assert.ok(hazardVm.segments.some((segment) => segment.className === 'hazard-risk'), 'hazard semantic class exists');
const currentVm = buildBenchmarkRouteOverlayViewModel({ routeGeometry, selectedOverlayLayer: 'currentAssist' });
assert.ok(currentVm.segments.some((segment) => segment.className === 'current-assist'), 'current assist semantic class exists');
const opposedVm = buildBenchmarkRouteOverlayViewModel({ routeGeometry, selectedOverlayLayer: 'currentOpposition' });
assert.ok(opposedVm.segments.some((segment) => segment.className === 'current-opposed'), 'current opposition semantic class exists');
const energyVm = buildBenchmarkRouteOverlayViewModel({ routeGeometry, selectedOverlayLayer: 'energyCost' });
assert.ok(energyVm.segments.some((segment) => segment.className === 'energy-high'), 'energy-high semantic class exists');

const selectedSegmentVm = selectBenchmarkRouteSegment(defaultVm, 1);
assert.equal(selectedSegmentVm.selectedSegment.index, 1, 'selected segment works');
const selectedWaypointVm = selectBenchmarkWaypoint(defaultVm, 2);
assert.equal(selectedWaypointVm.selectedWaypoint.index, 2, 'selected waypoint works');
assert.equal(benchmarkRouteOverlaySummary(selectedSegmentVm).selectedSegmentIndex, 1, 'summary includes selected segment');

const missingVm = buildBenchmarkRouteOverlayViewModel({ routeGeometry: null });
assert.ok(missingVm.warnings.length > 0, 'missing geometry produces warning');
assert.equal(missingVm.usesNewPlanner, false, 'missing geometry view model still excludes planner');


const multiAttemptVm = buildBenchmarkRouteOverlayViewModel({
  attemptSet: {
    episodeId: 'overlay-episode',
    benchmarkMode: 'plannerBenchmark',
    attempts: [{
      attemptId: 'manual-route',
      attemptSource: 'manualPlayer',
      routeSourceLabel: 'Manual Route',
      fairnessLabel: 'Forecast-only',
      routeGeometry,
      metrics: { finalScore: 12 }
    }, {
      attemptId: 'solver-route',
      attemptSource: 'importedSolver',
      routeSourceLabel: 'Imported Solver',
      fairnessLabel: 'Forecast-only',
      routeGeometry: {
        waypoints: [{ x: 0, y: 0 }, { x: 4, y: 1 }],
        segments: [{ from: { x: 0, y: 0 }, to: { x: 4, y: 1 }, status: 'completed' }]
      },
      metrics: { finalScore: 15 }
    }]
  },
  activeAttempt: { attemptId: 'manual-route', routeSourceLabel: 'Manual Route', routeGeometry },
  routeGeometry,
  selectedOverlayLayer: 'attemptComparison',
  selectedOverlayAttemptId: 'solver-route'
});
assert.equal(multiAttemptVm.attemptComparison.multiAttemptOverlayAvailable, true, 'multi-attempt route overlay is available');
assert.equal(multiAttemptVm.attemptComparison.routeGeometryCount, 2, 'multi-attempt route geometry count is exposed');
assert.equal(multiAttemptVm.selectedOverlayAttemptId, 'solver-route', 'selected overlay attempt id is exposed');
assert.ok(multiAttemptVm.attemptRoutes.some((route) => route.className === 'attempt-primary'), 'primary route class exists');
assert.ok(multiAttemptVm.attemptRoutes.some((route) => route.className === 'attempt-secondary'), 'secondary route class exists');
console.log('smoke_benchmark_route_overlay_view_model: ok');