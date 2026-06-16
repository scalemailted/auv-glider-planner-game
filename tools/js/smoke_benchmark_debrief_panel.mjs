import assert from 'node:assert/strict';

import { buildBenchmarkComparisonViewModel } from '../../src/core/benchmark/BenchmarkComparisonViewModel.js';
import { buildBenchmarkRouteReviewViewModel } from '../../src/core/benchmark/BenchmarkRouteReviewViewModel.js';
import {
  benchmarkAttemptComparisonHtml,
  benchmarkDebriefPanelHtml,
  benchmarkExportPanelHtml,
  benchmarkFairnessBadgeHtml,
  benchmarkMetricCardHtml,
  benchmarkRouteReviewHtml
} from '../../src/ui/benchmark/BenchmarkDebriefPanel.js';

const comparison = buildBenchmarkComparisonViewModel({
  attemptSet: {
    episodeId: 'panel-episode',
    benchmarkMode: 'plannerBenchmark',
    attempts: [{
      attemptId: 'bad<script>',
      attemptSource: 'manualPlayer',
      routeSourceLabel: 'Manual <script>alert(1)</script>',
      fairnessLabel: 'Forecast-only',
      metrics: { finalScore: 30, energyUsed: 8, hazardsHit: 0, duplicateSamples: 1, missedWaypoints: 0 }
    }]
  }
});
const routeReview = buildBenchmarkRouteReviewViewModel({
  routeExecutionRecord: {
    attemptId: 'panel-route',
    attemptSource: 'manualPlayer',
    routeSourceLabel: 'Manual Player Plan',
    fairnessLabel: 'Forecast-only',
    metrics: { routeLength: 4, energyUsed: 8, hazardsHit: 0 },
    segments: [{ segmentIndex: 0, from: { x: 0, y: 0 }, to: { x: 1, y: 1 }, distance: 4, energy: 8, status: 'completed' }]
  }
});
const html = benchmarkDebriefPanelHtml({ ...comparison, routeReview, exportState: { comparison: true } });
assert.ok(html.includes('Planner Benchmark'), 'panel includes Planner Benchmark');
assert.ok(html.includes('Attempt Comparison'), 'panel includes Attempt Comparison');
assert.ok(html.includes('Route Review'), 'panel includes Route Review');
assert.ok(html.includes('Forecast-Only'), 'panel includes fairness label');
assert.ok(html.includes('Export Benchmark Run Record'), 'panel includes run-record export');
assert.ok(html.includes('Export Route Execution Record'), 'panel includes route export');
assert.ok(html.includes('Export Benchmark Attempt Set'), 'panel includes attempt-set export');
assert.ok(html.includes('Export Benchmark Comparison'), 'panel includes comparison export');
assert.ok(html.includes('no new planner'), 'panel includes no-new-planner boundary');
assert.ok(html.includes('no scoring redesign'), 'panel includes no-scoring-redesign boundary');
assert.ok(!html.includes('<script>alert'), 'unsafe text is escaped');
const unsafeCard = benchmarkMetricCardHtml({ label: 'Unsafe <b>', value: '<script>alert(1)</script>' });
assert.ok(!unsafeCard.includes('<script>alert'), 'metric card does not emit unsafe script tag');
assert.ok(unsafeCard.includes('&lt;script&gt;'), 'metric card escapes unsafe text safely');
assert.ok(benchmarkAttemptComparisonHtml(comparison).includes('Attempt Comparison'), 'comparison helper renders');
assert.ok(benchmarkRouteReviewHtml(routeReview).includes('Route Review'), 'route review helper renders');
assert.ok(benchmarkExportPanelHtml({ comparison: true }).includes('Export Benchmark Comparison'), 'export helper renders comparison button');
assert.ok(benchmarkFairnessBadgeHtml('oracleTruth').includes('Oracle / Truth-Assisted'), 'fairness badge maps oracle truth label');

console.log('smoke_benchmark_debrief_panel: ok');