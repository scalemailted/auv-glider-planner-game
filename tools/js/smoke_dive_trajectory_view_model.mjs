import assert from 'node:assert/strict';
import { buildPredictedDiveTrajectory, buildRealizedDiveTrajectory, validateDiveTrajectoryViewModel } from '../../src/core/rendering/DiveTrajectoryViewModel.js';
import { TEST_WATER_COLUMN_CONFIG } from './water_column_smoke_helpers.mjs';

const predicted = buildPredictedDiveTrajectory({
  route: [{ x: 0, y: 0 }, { x: 3, y: 2 }, { x: 5, y: 4 }],
  waterColumnConfig: TEST_WATER_COLUMN_CONFIG,
  diveProfileId: 'sawtoothProfile',
  targetDepthLayerId: 'deep'
});
const realized = buildRealizedDiveTrajectory({
  agentId: 'glider-1',
  points: [{ x: 0, y: 0, depthMeters: 0 }, { x: 2, y: 1, depthMeters: 35 }, { x: 4, y: 3, depthMeters: 0 }]
});
for (const trajectory of [predicted, realized]) {
  const validation = validateDiveTrajectoryViewModel(trajectory);
  assert.equal(validation.valid, true, validation.errors.join('; '));
  assert.equal(trajectory.usesFull3DPlanning, false);
  assert.equal(trajectory.ownsSimulation, false);
}
assert.equal(predicted.points.some((point) => point.depthLayerId === 'deep'), true);
console.log(JSON.stringify({ ok: true, predictedPoints: predicted.points.length, realizedPoints: realized.points.length }));
