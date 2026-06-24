import assert from 'node:assert/strict';
import { buildMissionRouteSegments } from '../../src/core/planning/MissionRouteSegment.js';
import { moveWaypointUp, removeWaypoint } from '../../src/core/planning/WaypointPlan.js';
import { createDiveUxR1Fixture } from './dive_ux_r1_test_fixture.mjs';

const fx = createDiveUxR1Fixture();
moveWaypointUp(fx.plan, 'glider-1', 1);
const reordered = buildMissionRouteSegments(fx.plan, { level: fx.level, mission: fx.mission });
assert.equal(reordered[0].target.id, 'wp-2');
assert.equal(reordered[0].flightProfile.profileId, 'thermoclineDive', 'profile follows destination waypoint identity');
removeWaypoint(fx.plan, 'glider-1', 0);
const afterDelete = buildMissionRouteSegments(fx.plan, { level: fx.level, mission: fx.mission });
assert.equal(afterDelete.some((segment) => segment.target.id === 'wp-2'), false);
console.log('smoke_segment_profile_reorder_identity: ok', { reordered: reordered.map((segment) => segment.id), afterDelete: afterDelete.map((segment) => segment.id) });
