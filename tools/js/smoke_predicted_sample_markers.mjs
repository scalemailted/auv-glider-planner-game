import assert from 'node:assert/strict';
import { buildPlannedDiveSegmentViewModel } from '../../src/core/rendering/PlannedDiveSegmentViewModel.js';
import { TEST_WATER_COLUMN_CONFIG, makeGrid, makeScalarValues } from './water_column_smoke_helpers.mjs';

const grid = makeGrid(9, 5);
const values = makeScalarValues(grid);
const fields = {
  sampleValue: Object.fromEntries(TEST_WATER_COLUMN_CONFIG.depthLayerIds.map((id) => [id, { values }])),
  A_global_depth: Object.fromEntries(TEST_WATER_COLUMN_CONFIG.depthLayerIds.map((id) => [id, values]))
};
const segment = buildPlannedDiveSegmentViewModel({
  agentId: 'glider-1',
  segmentId: 'sample-marker-segment',
  startWaypoint: { id: 'wp-a', x: 0, y: 1 },
  targetWaypoint: { id: 'wp-b', x: 8, y: 3, diveProfileId: 'sawtoothProfile', targetDepthLayerId: 'thermocline' },
  waterColumnConfig: TEST_WATER_COLUMN_CONFIG,
  bottomBoundary: { bottomDepthField: Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => 180)) },
  layerFields: fields,
  requestedMaximumDepthMeters: 80,
  cycleCount: 2,
  sampleIntervalSeconds: 180
});
assert.equal(segment.predictedSamples.length > 0, true, 'predicted samples are emitted');
assert.equal(segment.predictedSamples.every((sample) => sample.depthMeters > 0.5), true, 'predicted samples are at depth, not projected to surface');
assert.equal(segment.predictedSamples.every((sample) => sample.createsScoreEvent === false), true, 'predicted samples do not create score events');
assert.equal(segment.predictedSamples.every((sample) => sample.markerType === 'expectedSample'), true, 'sample markers are labeled as expected samples');
assert.equal(segment.predictedSamples.some((sample) => Number.isFinite(Number(sample.expectedScienceValue))), true, 'science metadata is present');
assert.equal(segment.expectedScience.createsScoreEvents, false, 'expected science summary does not award score');
console.log(JSON.stringify({ ok: true, predictedSamples: segment.predictedSamples.length, byLayer: segment.expectedScience.samplesByLayer }));