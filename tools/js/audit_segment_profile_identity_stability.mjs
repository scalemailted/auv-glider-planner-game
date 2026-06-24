import assert from 'node:assert/strict';
import { buildMissionRouteSegments } from '../../src/core/planning/MissionRouteSegment.js';
import { moveWaypointUp } from '../../src/core/planning/WaypointPlan.js';
import { createDiveUxR1Fixture } from './dive_ux_r1_test_fixture.mjs';

const fx = createDiveUxR1Fixture();
moveWaypointUp(fx.plan, 'glider-1', 1);
const segments = buildMissionRouteSegments(fx.plan, { level: fx.level, mission: fx.mission });
assert.equal(segments[0].target.id, 'wp-2');
assert.equal(segments[0].flightProfile.profileId, 'thermoclineDive');
assert.equal(segments[1].target.id, 'wp-1');
assert.equal(segments[1].flightProfile.profileId, 'shallowDive');
console.log('audit_segment_profile_identity_stability: ok');
