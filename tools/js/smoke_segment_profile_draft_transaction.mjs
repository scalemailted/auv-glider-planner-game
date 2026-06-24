import assert from 'node:assert/strict';
import { createSegmentFlightPlanDraft, updateSegmentFlightPlanDraft } from '../../src/core/planning/SegmentFlightPlanCommands.js';
import { createDiveUxR1Fixture, digest } from './dive_ux_r1_test_fixture.mjs';

const fx = createDiveUxR1Fixture();
const before = digest(fx.plan);
const draft = createSegmentFlightPlanDraft(fx.plan, { agentId: 'glider-1', waypointIndex: 1, level: fx.level, mission: fx.mission });
const edited = updateSegmentFlightPlanDraft(draft, { diveProfileId: 'deepDive', targetDepthLayerId: 'deep', cycleCount: 2 }, { level: fx.level, mission: fx.mission });
assert.equal(digest(fx.plan), before, 'draft update must not mutate canonical plan');
assert.equal(edited.dirty, true);
assert.equal(edited.flightPlan.profileId, 'deepDive');
console.log('smoke_segment_profile_draft_transaction: ok', { before, dirty: edited.dirty });
