import assert from 'node:assert/strict';
import { buildMissionRouteSegments } from '../../src/core/planning/MissionRouteSegment.js';
import { applySegmentFlightPlanToRemaining } from '../../src/core/planning/SegmentFlightPlanCommands.js';
import { createDiveUxR1Fixture } from './dive_ux_r1_test_fixture.mjs';

const fx = createDiveUxR1Fixture();
const result = applySegmentFlightPlanToRemaining(fx.plan, { agentId: 'glider-1', waypointIndex: 0, patch: { diveProfileId: 'deepDive', targetDepthLayerId: 'deep' }, level: fx.level, mission: fx.mission });
const segments = buildMissionRouteSegments(fx.plan, { level: fx.level, mission: fx.mission });
assert.equal(segments[0].flightProfile.profileId, 'shallowDive', 'selected segment is not changed by Apply Remaining');
assert.equal(segments[1].flightProfile.profileId, 'deepDive');
assert.equal(segments[2].flightProfile.profileId, 'deepDive');
assert.equal(result.changedWaypointIds.length, 2);
console.log('smoke_segment_profile_apply_remaining: ok', { changed: result.changedWaypointIds });
