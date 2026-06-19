import assert from 'node:assert/strict';
import { buildPlannedDiveSegmentViewModel } from '../../src/core/rendering/PlannedDiveSegmentViewModel.js';
import { TEST_WATER_COLUMN_CONFIG } from './water_column_smoke_helpers.mjs';

function flatBottom(width, height, depthMeters = 220) {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => depthMeters));
}

const longSegment = buildPlannedDiveSegmentViewModel({
  agentId: 'glider-1',
  segmentId: 'long-multi-yo',
  startWaypoint: { id: 'wp-a', x: 0, y: 2 },
  targetWaypoint: { id: 'wp-b', x: 12, y: 2, diveProfileId: 'fullProfile', targetDepthLayerId: 'deep' },
  waterColumnConfig: TEST_WATER_COLUMN_CONFIG,
  bottomBoundary: { bottomDepthField: flatBottom(14, 5) },
  requestedMaximumDepthMeters: 120,
  cycleCount: 4,
  sampleCount: 96
});
assert.equal(longSegment.requestedCycleCount, 4, 'long segment records requested cycles');
assert.equal(longSegment.cycleCount >= 4, true, 'long segment supports requested multi-yo cycles');
assert.equal(new Set(longSegment.predictedDivePath.map((point) => point.cycleIndex)).size >= 4, true, 'long segment path has multiple cycle indices');
assert.equal(longSegment.bottomTurns.length >= 4, true, 'long segment renders bottom turns for repeated yo cycles');

const shortSegment = buildPlannedDiveSegmentViewModel({
  agentId: 'glider-1',
  segmentId: 'short-multi-yo',
  startWaypoint: { id: 'wp-a', x: 0, y: 2 },
  targetWaypoint: { id: 'wp-b', x: 1, y: 2, diveProfileId: 'fullProfile', targetDepthLayerId: 'deep' },
  waterColumnConfig: TEST_WATER_COLUMN_CONFIG,
  bottomBoundary: { bottomDepthField: flatBottom(4, 4) },
  requestedMaximumDepthMeters: 120,
  cycleCount: 5,
  sampleCount: 32
});
assert.equal(shortSegment.cycleCount < shortSegment.requestedCycleCount, true, 'short segment truncates requested cycles');
assert.equal(shortSegment.profileTruncationReason, 'segment too short', 'truncation reason is explicit');
assert.equal(shortSegment.warningCodes.includes('CYCLES_TRUNCATED'), true, 'truncation warning is exposed');
assert.equal(shortSegment.predictedDivePath.every((point) => point.depthMeters >= 0), true, 'no impossible negative-depth geometry');
console.log(JSON.stringify({ ok: true, longCycles: longSegment.cycleCount, shortCycles: shortSegment.cycleCount, reason: shortSegment.profileTruncationReason }));