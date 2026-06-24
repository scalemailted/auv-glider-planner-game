import assert from 'node:assert/strict';
import { buildMissionRouteSegments } from '../../src/core/planning/MissionRouteSegment.js';
import { createMissionExecutionSnapshot, createMissionLaunchPayload } from '../../src/core/simulation/MissionExecutionSnapshot.js';
import { updateSegmentFlightPlan } from '../../src/core/planning/SegmentFlightPlanCommands.js';
import { createDiveUxR1Fixture } from './dive_ux_r1_test_fixture.mjs';

const fx = createDiveUxR1Fixture();
updateSegmentFlightPlan(fx.plan, { agentId: 'glider-1', waypointIndex: 1, patch: { diveProfileId: 'deepDive', targetDepthLayerId: 'deep' }, level: fx.level, mission: fx.mission });
const snapshot = createMissionExecutionSnapshot({ level: fx.level, mission: fx.mission, plan: fx.plan, selectedAgentId: 'glider-1' });
const payload = createMissionLaunchPayload({ snapshot });
const segments = buildMissionRouteSegments(payload.plan ?? fx.plan, { level: payload.level, mission: payload.mission });
assert.equal(segments[1].flightProfile.profileId, 'deepDive');
console.log('smoke_segment_profile_launch_parity: ok', { profile: segments[1].flightProfile.profileId });
