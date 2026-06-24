import assert from 'node:assert/strict';
import { buildMissionRouteSegments } from '../../src/core/planning/MissionRouteSegment.js';
import { updateSegmentFlightPlan } from '../../src/core/planning/SegmentFlightPlanCommands.js';
import { createDiveUxR1Fixture } from './dive_ux_r1_test_fixture.mjs';

const fx = createDiveUxR1Fixture();
const result = updateSegmentFlightPlan(fx.plan, { agentId: 'glider-1', waypointIndex: 1, patch: { diveProfileId: 'deepDive', targetDepthLayerId: 'deep', cycleCount: 2 }, level: fx.level, mission: fx.mission });
const segments = buildMissionRouteSegments(fx.plan, { level: fx.level, mission: fx.mission });
assert.equal(result.status, 'applied');
assert.equal(segments[1].flightProfile.profileId, 'deepDive');
assert.equal(segments[0].flightProfile.profileId, 'shallowDive');
console.log('smoke_segment_profile_apply_command: ok', { changed: result.changed, segmentId: result.segmentId });
