import assert from 'node:assert/strict';

import {
  buildBenchmarkRouteReviewViewModel,
  routeReviewSummary,
  segmentRiskSummary
} from '../../src/core/benchmark/BenchmarkRouteReviewViewModel.js';

const plan = {
  type: 'anchor.plan',
  agentPlans: [{
    agentId: 'g1',
    selectedStart: { x: 0, y: 0 },
    waypoints: [{ x: 2, y: 1, t: 1, segmentDistance: 3, segmentEnergy: 2 }]
  }]
};
const result = {
  resultId: 'route-review-result',
  planName: 'Manual Player Plan',
  summary: { routeLength: 7, energyUsed: 5, hazardsHit: 1, duplicateSamples: 2, missedWaypoints: 1 },
  events: [
    { type: 'hazard', time: 1 },
    { type: 'duplicateSample', time: 2 },
    { type: 'missedWaypoint', time: 3 }
  ]
};
const routeExecutionRecord = {
  type: 'anchor.benchmark.route-execution',
  episodeId: 'route-review-episode',
  attemptId: 'route-review-attempt',
  resultId: result.resultId,
  attemptSource: 'manualPlayer',
  routeSourceLabel: 'Manual Player Plan',
  fairnessLabel: 'Forecast-only',
  waypointCount: 2,
  segmentCount: 2,
  metrics: { routeLength: 7, energyUsed: 5, elapsedTime: 3, hazardsHit: 1, duplicateSamples: 2, missedWaypoints: 1 },
  segments: [
    { segmentIndex: 0, from: { x: 0, y: 0 }, to: { x: 1, y: 1 }, startTime: 0, endTime: 1, distance: 2, energy: 1.5, currentAssist: 0.2, crossCurrent: 0.1, status: 'completed' },
    { segmentIndex: 1, from: { x: 1, y: 1 }, to: { x: 2, y: 1 }, startTime: 1, endTime: 3, distance: 5, energy: 3.5, currentAssist: -0.1, crossCurrent: 0.7, hazardPenalty: 2, status: 'completed', warnings: ['near hazard'] }
  ]
};
const review = buildBenchmarkRouteReviewViewModel({ routeExecutionRecord, plan, result });
assert.equal(review.attemptId, 'route-review-attempt', 'attempt id preserved');
assert.equal(review.routeLength, 7, 'route length summarized');
assert.equal(review.energyUsed, 5, 'energy summarized');
assert.equal(review.hazardEvents, 1, 'hazards summarized');
assert.equal(review.duplicateSampleEvents, 1, 'duplicate event count uses events when present');
assert.equal(review.missedWaypointEvents, 1, 'missed waypoint summarized');
assert.equal(review.segmentCards.length, 2, 'segment cards generated');
assert.equal(review.segmentCards[1].duration, 2, 'segment duration derived');
assert.equal(segmentRiskSummary(review.segmentCards).riskySegmentCount, 1, 'risky segment detected');
assert.equal(routeReviewSummary(review).routeLength, 7, 'route review summary includes length');

const partial = buildBenchmarkRouteReviewViewModel({ routeExecutionRecord: { metrics: { energyUsed: 2 }, segments: [] }, plan, result: { summary: {} } });
assert.ok(partial.warnings.some((warning) => /partial/i.test(warning)), 'partial segment data warns');
assert.equal(partial.segmentCards.length, 1, 'partial route can derive plan segment card');

const before = JSON.stringify(plan);
buildBenchmarkRouteReviewViewModel({ routeExecutionRecord, plan, result });
assert.equal(JSON.stringify(plan), before, 'route review does not mutate plan');

console.log('smoke_benchmark_route_review_view_model: ok');