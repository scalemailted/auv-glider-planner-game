import assert from 'node:assert/strict';

import { extractRouteGeometryFromPlan } from '../../src/core/benchmark/BenchmarkRouteGeometryAdapter.js';
import { buildBenchmarkRouteOverlayViewModel } from '../../src/core/benchmark/BenchmarkRouteOverlayViewModel.js';
import {
  benchmarkRouteOverlayControlsHtml,
  benchmarkRouteOverlayLegendHtml,
  benchmarkRouteOverlayPanelHtml,
  benchmarkRouteOverlaySvgHtml,
  benchmarkRouteSegmentDetailsHtml,
  benchmarkRouteWaypointDetailsHtml
} from '../../src/ui/benchmark/BenchmarkRouteOverlayPanel.js';

const geometry = extractRouteGeometryFromPlan({
  type: 'anchor.plan',
  planId: 'panel-plan',
  meta: { name: 'Unsafe <script>alert(1)</script>' },
  agentPlans: [{
    agentId: 'g1',
    selectedStart: { x: 0, y: 0 },
    waypoints: [{ id: 'wp-1', x: 2, y: 2, segmentEnergy: 3, warnings: ['warn <b>'] }]
  }]
});
const viewModel = buildBenchmarkRouteOverlayViewModel({ routeGeometry: geometry, selectedSegmentIndex: 0, selectedWaypointIndex: 1 });
const html = benchmarkRouteOverlayPanelHtml(viewModel);
assert.ok(html.includes('Route Overlay'), 'HTML includes Route Overlay');
assert.ok(html.includes('benchmark-route-svg') || html.includes('benchmark-route-empty'), 'SVG or fallback exists');
assert.ok(html.includes('Route Review Layer'), 'HTML includes layer control');
assert.ok(html.includes('benchmark-route-legend'), 'HTML includes legend');
assert.ok(html.includes('Segment Details'), 'HTML includes segment details');
assert.ok(html.includes('Waypoint Details'), 'HTML includes waypoint details');
assert.ok(html.includes('does not compute a new path'), 'HTML includes no-new-path boundary');
assert.ok(html.includes('Segment-level metrics are partial'), 'HTML includes partial geometry copy');
assert.ok(!html.includes('<script>alert'), 'unsafe script label is escaped');
assert.ok(html.includes('&lt;script&gt;'), 'escaped unsafe label is visible safely');
assert.ok(benchmarkRouteOverlayControlsHtml(viewModel).includes('data-benchmark-route-layer'), 'controls helper renders selector');
assert.ok(benchmarkRouteOverlaySvgHtml(viewModel).includes('<svg'), 'svg helper renders svg');
assert.ok(benchmarkRouteOverlayLegendHtml(viewModel).includes('benchmark-route-legend'), 'legend helper renders');
assert.ok(benchmarkRouteSegmentDetailsHtml(viewModel).includes('data-benchmark-route-segment'), 'segment helper renders select buttons');
assert.ok(benchmarkRouteWaypointDetailsHtml(viewModel).includes('data-benchmark-route-waypoint'), 'waypoint helper renders select buttons');


const comparisonViewModel = { benchmarkMode: 'plannerBenchmark', episodeId: 'panel-episode', attempts: [{ attemptId: 'a', routeSourceLabel: 'A' }, { attemptId: 'b', routeSourceLabel: 'B' }] };
const multiVm = buildBenchmarkRouteOverlayViewModel({
  attemptSet: {
    episodeId: 'panel-episode',
    benchmarkMode: 'plannerBenchmark',
    attempts: [{ attemptId: 'a', routeGeometry: geometry, routeSourceLabel: 'A' }, { attemptId: 'b', routeGeometry: geometry, routeSourceLabel: 'B' }]
  },
  comparisonViewModel,
  routeGeometry: geometry,
  selectedOverlayLayer: 'attemptComparison'
});
const multiHtml = benchmarkRouteOverlaySvgHtml(multiVm);
assert.ok(multiHtml.includes('benchmark-route-comparison-segments'), 'multi-attempt SVG renders comparison segments');
assert.ok(benchmarkRouteOverlayPanelHtml(multiVm).includes('data-benchmark-overlay-attempt'), 'panel renders overlay attempt selector');
console.log('smoke_benchmark_route_overlay_panel: ok');