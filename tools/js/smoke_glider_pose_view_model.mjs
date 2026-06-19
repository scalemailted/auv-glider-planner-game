import assert from 'node:assert/strict';
import { buildGliderPoseViewModel, validateGliderPoseViewModel } from '../../src/core/rendering/GliderPoseViewModel.js';

const canonical = buildGliderPoseViewModel({ agentId: 'g1', x: 1, y: 2, headingRadians: Math.PI / 3, pitchRadians: 0.1, groundRelativeVelocity: { x: 0, y: 1 } });
assert.equal(validateGliderPoseViewModel(canonical).valid, true);
assert.equal(canonical.orientationSource, 'canonicalHeading');
assert.equal(canonical.courseSource, 'groundVelocity');
assert.notEqual(canonical.headingRadians, canonical.courseOverGroundRadians);
const fallback = buildGliderPoseViewModel({ agentId: 'g2', x: 2, y: 2, history: [{ x: 1, y: 1 }, { x: 2, y: 1 }] });
assert.equal(fallback.orientationSource, 'trajectoryTangent');
const startup = buildGliderPoseViewModel({ agentId: 'g3', x: 0, y: 0, targetWaypoint: { x: 1, y: 0 }, priorTrajectoryPoint: { x: 0, y: 0 } });
assert.equal(startup.orientationSource, 'plannedSegmentFallback');
console.log('smoke_glider_pose_view_model passed');
