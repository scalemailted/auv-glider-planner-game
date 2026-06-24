import assert from 'node:assert/strict';
import { buildMissionRouteSegments } from '../../src/core/planning/MissionRouteSegment.js';
import { normalizePlan } from '../../src/core/planning/WaypointPlan.js';
import { updateSegmentFlightPlan } from '../../src/core/planning/SegmentFlightPlanCommands.js';
import { createDiveUxR1Fixture } from './dive_ux_r1_test_fixture.mjs';

const fx = createDiveUxR1Fixture();
updateSegmentFlightPlan(fx.plan, { agentId: 'glider-1', waypointIndex: 1, patch: { diveProfileId: 'deepDive', targetDepthLayerId: 'deep', samplingPhase: 'ascent' }, level: fx.level, mission: fx.mission });
const roundtrip = normalizePlan(JSON.parse(JSON.stringify(fx.plan)), fx.level, fx.mission);
const segments = buildMissionRouteSegments(roundtrip, { level: fx.level, mission: fx.mission });
assert.equal(segments[1].flightProfile.profileId, 'deepDive');
assert.equal(segments[1].flightProfile.samplingPhase, 'ascent');
console.log('smoke_segment_profile_export_roundtrip: ok', { profile: segments[1].flightProfile.profileId, phase: segments[1].flightProfile.samplingPhase });
