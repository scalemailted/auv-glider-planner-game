import assert from 'node:assert/strict';
import { buildPlannedDiveSegmentViewModel } from '../../src/core/rendering/PlannedDiveSegmentViewModel.js';
import { buildRealizedDiveTrajectory } from '../../src/core/rendering/DiveTrajectoryViewModel.js';
import { TEST_WATER_COLUMN_CONFIG } from './water_column_smoke_helpers.mjs';

const predicted = buildPlannedDiveSegmentViewModel({
  agentId: 'glider-1',
  segmentId: 'planned-vs-realized',
  startWaypoint: { id: 'wp-a', x: 0, y: 1 },
  targetWaypoint: { id: 'wp-b', x: 6, y: 3, diveProfileId: 'sawtoothProfile', targetDepthLayerId: 'deep' },
  waterColumnConfig: TEST_WATER_COLUMN_CONFIG,
  bottomBoundary: { bottomDepthField: Array.from({ length: 5 }, () => Array.from({ length: 8 }, () => 180)) },
  requestedMaximumDepthMeters: 110,
  cycleCount: 2
});
const frozenPrediction = JSON.stringify(predicted.predictedDivePath);
const actualPoints = [
  { x: 0, y: 1, depthMeters: 0, timeSeconds: 0 },
  { x: 2.2, y: 1.7, depthMeters: 65, timeSeconds: 400 },
  { x: 4.5, y: 2.6, depthMeters: 96, timeSeconds: 800 }
];
const growing = buildRealizedDiveTrajectory({ agentId: 'glider-1', diveProfileId: 'sawtoothProfile', points: actualPoints });
actualPoints.push({ x: 6.4, y: 3.2, depthMeters: 0, timeSeconds: 1200 });
const completed = buildRealizedDiveTrajectory({ agentId: 'glider-1', diveProfileId: 'sawtoothProfile', points: actualPoints });
assert.equal(JSON.stringify(predicted.predictedDivePath), frozenPrediction, 'planned trajectory remains frozen while actual path grows');
assert.equal(growing.points.length < completed.points.length, true, 'actual trajectory grows independently');
const maxPredictedDepth = Math.max(...predicted.predictedDivePath.map((point) => point.depthMeters));
const maxActualDepth = Math.max(...completed.points.map((point) => point.depthMeters));
const surfacingOffset = Math.hypot(
  Number(predicted.predictedSurfacingPosition.x ?? 0) - Number(completed.surfacingPoint.x ?? 0),
  Number(predicted.predictedSurfacingPosition.y ?? 0) - Number(completed.surfacingPoint.y ?? 0)
);
assert.equal(Number.isFinite(maxPredictedDepth), true, 'predicted depth metric is finite');
assert.equal(Number.isFinite(maxActualDepth), true, 'actual depth metric is finite');
assert.equal(Number.isFinite(surfacingOffset), true, 'surfacing comparison metric is finite');
assert.equal(predicted.predictedSamples.every((sample) => sample.createsScoreEvent === false), true, 'predicted samples do not score');
console.log(JSON.stringify({ ok: true, maxPredictedDepth, maxActualDepth, surfacingOffset }));