import assert from 'node:assert/strict';
import { buildPlannedDiveSegmentViewModel, validatePlannedDiveSegmentViewModel } from '../../src/core/rendering/PlannedDiveSegmentViewModel.js';
import { TEST_WATER_COLUMN_CONFIG } from './water_column_smoke_helpers.mjs';

const shallowBottom = Array.from({ length: 5 }, () => Array.from({ length: 8 }, () => 45));
const segment = buildPlannedDiveSegmentViewModel({
  agentId: 'glider-1',
  segmentId: 'terrain-limited-segment',
  startWaypoint: { id: 'wp-a', x: 0, y: 2 },
  targetWaypoint: { id: 'wp-b', x: 7, y: 2, diveProfileId: 'deepDive', targetDepthLayerId: 'deep' },
  waterColumnConfig: TEST_WATER_COLUMN_CONFIG,
  bottomBoundary: { bottomDepthField: shallowBottom },
  requestedMaximumDepthMeters: 120,
  requiredBottomClearanceMeters: 10,
  sampleCount: 64
});
const validation = validatePlannedDiveSegmentViewModel(segment);
assert.equal(validation.valid, true, validation.errors.join('; '));
assert.equal(segment.bottomClearance.terrainLimited, true, 'route is terrain limited by shallow bottom');
assert.equal(segment.warningCodes.includes('TERRAIN_LIMITED'), true, 'terrain warning is exposed');
assert.equal(Math.max(...segment.predictedDivePath.map((point) => point.depthMeters)) <= 35.000001, true, 'requested depth is reduced by clearance');
assert.equal(segment.predictedDivePath.every((point) => Number(point.clearanceMeters) >= 9.999999), true, 'path does not penetrate bottom boundary');
assert.equal(segment.bottomClearance.hardInvalid, false, 'clipped preview avoids hard seabed penetration');
console.log(JSON.stringify({ ok: true, maxDepth: segment.achievableMaximumDepthMeters, clearance: segment.bottomClearance }));