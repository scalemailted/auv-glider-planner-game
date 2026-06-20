import assert from 'node:assert/strict';
import { buildPlannedDiveSegmentViewModel } from '../../src/core/rendering/PlannedDiveSegmentViewModel.js';
import { TEST_WATER_COLUMN_CONFIG } from './water_column_smoke_helpers.mjs';

const bottom = Array.from({ length: 5 }, () => Array.from({ length: 8 }, () => 180));
const base = {
  agentId: 'g1',
  segmentId: 'route-1-segment-1',
  startWaypoint: { id: 'wp-a', x: 0, y: 2 },
  targetWaypoint: { id: 'wp-b', x: 6, y: 2, diveProfileId: 'sawtoothProfile', targetDepthLayerId: 'deep', scienceTargetIds: ['covered'] },
  waterColumnConfig: TEST_WATER_COLUMN_CONFIG,
  bottomBoundary: { bottomDepthField: bottom },
  requestedMaximumDepthMeters: 110,
  cycleCount: 2,
  sampleCount: 90
};
const segment = buildPlannedDiveSegmentViewModel({
  ...base,
  scienceTargets: [
    { id: 'covered', position: { x: 3, y: 2, depthMeters: 105 }, depthLayerId: 'deep', attachedSegmentIds: ['route-1-segment-1'], horizontalRadius: 1.5, verticalRadius: 20, desiredSampleCount: 1 },
    { id: 'unreachable', position: { x: 3, y: 2, depthMeters: 165 }, depthLayerId: 'deep', attachedSegmentIds: ['route-1-segment-1'], horizontalRadius: 1.2, verticalRadius: 8 }
  ]
});
const covered = segment.targetCoverage.find((item) => item.targetId === 'covered');
const unreachable = segment.targetCoverage.find((item) => item.targetId === 'unreachable');
assert.ok(['COVERED', 'PARTIALLY_COVERED', 'CROSSED_WITHOUT_SAMPLE'].includes(covered.status), 'target has a coverage status');
assert.equal(unreachable.status, 'UNREACHABLE', 'unreachable target reported');
assert.equal(segment.predictedSamples.every((sample) => sample.createsScoreEvent === false), true, 'predicted samples do not create score');
console.log(JSON.stringify({ ok: true, coverage: segment.targetCoverage.map((item) => [item.targetId, item.status]) }));