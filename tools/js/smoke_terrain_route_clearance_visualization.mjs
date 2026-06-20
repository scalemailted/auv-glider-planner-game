import assert from 'node:assert/strict';

import { buildPlannedDiveSegmentViewModel } from '../../src/core/rendering/PlannedDiveSegmentViewModel.js';
import { TEST_WATER_COLUMN_CONFIG } from './water_column_smoke_helpers.mjs';

const bottomDepthField = Array.from({ length: 5 }, (_row, y) => Array.from({ length: 9 }, (_cell, x) => x < 4 ? 42 + y : 180));
const segment = buildPlannedDiveSegmentViewModel({
  agentId: 'glider-1',
  segmentId: 'terrain-clearance-visual',
  startWaypoint: { id: 'wp-a', x: 0, y: 2 },
  targetWaypoint: { id: 'wp-b', x: 8, y: 2, diveProfileId: 'deepDive', targetDepthLayerId: 'deep' },
  waterColumnConfig: TEST_WATER_COLUMN_CONFIG,
  bottomBoundary: { bottomDepthField },
  requestedMaximumDepthMeters: 140,
  requiredBottomClearanceMeters: 10,
  sampleCount: 72
});

assert.equal(segment.bottomClearance.terrainLimited, true);
assert.ok(segment.bottomClearance.minimumClearanceMeters >= 9.999999);
assert.ok(segment.predictedDivePath.every((point) => point.depthMeters <= point.bottomDepthMeters - 9.999999));
assert.notEqual(segment.warningCodes.indexOf('TERRAIN_LIMITED'), -1, 'terrain-limited route exposes warning code');
console.log('smoke_terrain_route_clearance_visualization: ok');
