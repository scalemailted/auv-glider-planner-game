import assert from 'node:assert/strict';
import {
  buildPlannedDiveSegmentViewModel,
  validatePlannedDiveSegmentViewModel,
  plannedDiveSegmentViewModelSummary
} from '../../src/core/rendering/PlannedDiveSegmentViewModel.js';
import { TEST_WATER_COLUMN_CONFIG, makeGrid, makeBottomDepthField, makeScalarValues, makeVectors } from './water_column_smoke_helpers.mjs';

function layerFields(grid) {
  const values = makeScalarValues(grid);
  return {
    sampleValue: Object.fromEntries(TEST_WATER_COLUMN_CONFIG.depthLayerIds.map((id) => [id, { values }])),
    A_global_depth: Object.fromEntries(TEST_WATER_COLUMN_CONFIG.depthLayerIds.map((id) => [id, values]))
  };
}

const grid = makeGrid(8, 6);
const segment = buildPlannedDiveSegmentViewModel({
  agentId: 'glider-1',
  segmentId: 'smoke-segment-1',
  startWaypoint: { id: 'wp-a', x: 0, y: 1 },
  targetWaypoint: { id: 'wp-b', x: 7, y: 4, diveProfileId: 'sawtoothProfile', targetDepthLayerId: 'deep' },
  waterColumnConfig: TEST_WATER_COLUMN_CONFIG,
  bottomBoundary: { bottomDepthField: makeBottomDepthField(grid) },
  vectorFieldLayer: { vectors: makeVectors(grid) },
  layerFields: layerFields(grid),
  requestedMaximumDepthMeters: 120,
  cycleCount: 2,
  sampleIntervalSeconds: 240
});
const validation = validatePlannedDiveSegmentViewModel(segment);
assert.equal(validation.valid, true, validation.errors.join('; '));
assert.equal(segment.startSurfacePosition.depthMeters, 0, 'surface start remains at zero depth');
assert.equal(segment.targetSurfacePosition.depthMeters, 0, 'surface target remains at zero depth');
assert.equal(segment.diveProfileId, 'sawtoothProfile', 'profile is preserved');
assert.equal(segment.targetDepthLayerId, 'deep', 'target layer is preserved');
assert.equal(segment.predictedDivePath.some((point) => point.depthMeters > 0), true, 'predicted path contains underwater points');
assert.equal(segment.cycleCount >= 1, true, 'cycles are represented');
assert.equal(segment.layerCrossings.length > 0, true, 'layer crossings are represented');
assert.equal(segment.predictedSamples.length > 0, true, 'predicted samples are represented');
assert.equal(segment.boundaryFlags.ownsPlanning, false, 'view model does not own planning');
assert.equal(segment.boundaryFlags.ownsSimulation, false, 'view model does not own simulation');
assert.equal(segment.boundaryFlags.ownsScoring, false, 'view model does not own scoring');
assert.equal(segment.boundaryFlags.usesArbitraryXYZWaypoints, false, 'surface waypoints are not arbitrary XYZ controls');
assert.equal(JSON.stringify(segment).includes('isObject3D'), false, 'segment view model has no Three object dependency');
console.log(JSON.stringify({ ok: true, summary: plannedDiveSegmentViewModelSummary(segment) }));