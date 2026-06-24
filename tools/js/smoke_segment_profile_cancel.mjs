import assert from 'node:assert/strict';
import { createSegmentFlightPlanDraft, updateSegmentFlightPlanDraft } from '../../src/core/planning/SegmentFlightPlanCommands.js';
import { createDiveUxR1Fixture, digest } from './dive_ux_r1_test_fixture.mjs';

const fx = createDiveUxR1Fixture();
const before = digest(fx.plan);
const draft = createSegmentFlightPlanDraft(fx.plan, { agentId: 'glider-1', waypointIndex: 1, level: fx.level, mission: fx.mission });
updateSegmentFlightPlanDraft(draft, { diveProfileId: 'deepDive' }, { level: fx.level, mission: fx.mission });
const canceled = createSegmentFlightPlanDraft(fx.plan, { agentId: 'glider-1', waypointIndex: 1, level: fx.level, mission: fx.mission });
assert.equal(digest(fx.plan), before);
assert.equal(canceled.dirty, false);
assert.equal(canceled.flightPlan.profileId, 'thermoclineDive');
console.log('smoke_segment_profile_cancel: ok', { digest: before });
