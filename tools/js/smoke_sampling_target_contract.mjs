import assert from 'node:assert/strict';
import {
  createContinuousScienceTarget,
  validateContinuousScienceTarget,
  attachScienceTargetToSegment,
  detachScienceTargetFromSegment
} from '../../src/core/science/ContinuousScienceTarget.js';

const target = createContinuousScienceTarget({
  id: 'target-1',
  geometryType: 'layerPoint',
  position: { x: 2.25, y: 3.5, depthMeters: 42 },
  depthLayerId: 'thermocline',
  depthInterval: { minDepthMeters: 38, maxDepthMeters: 48 },
  desiredSampleCount: 2
});
const attached = attachScienceTargetToSegment(target, 'route-1-segment-1');
const detached = detachScienceTargetFromSegment(attached, 'route-1-segment-1');
const validation = validateContinuousScienceTarget(attached);
assert.equal(validation.valid, true, validation.errors.join('; '));
assert.equal(attached.executable, false, 'sampling target is non-executable');
assert.equal(attached.navigationAuthority, false, 'sampling target has no navigation authority');
assert.equal(attached.boundaryFlags.canCreateScoreWithoutObservation, false, 'sampling target has no score authority');
assert.equal(attached.position.x, 2.25, 'continuous x preserved');
assert.equal(attached.position.y, 3.5, 'continuous y preserved');
assert.equal(attached.position.depthMeters, 42, 'canonical depth preserved');
assert.deepEqual(attached.depthInterval, { minDepthMeters: 38, maxDepthMeters: 48 }, 'depth interval preserved');
assert.deepEqual(attached.attachedSegmentIds, ['route-1-segment-1'], 'segment attachment preserved');
assert.deepEqual(detached.attachedSegmentIds, [], 'segment detach works');
console.log(JSON.stringify({ ok: true, targetId: target.id, attached: attached.attachedSegmentIds }));