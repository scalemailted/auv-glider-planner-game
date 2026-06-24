import assert from 'node:assert/strict';
import { normalizePlan } from '../../src/core/planning/WaypointPlan.js';
import { createSegmentFlightPlanDraft, updateSegmentFlightPlanDraft } from '../../src/core/planning/SegmentFlightPlanCommands.js';
import { createDiveUxR1Fixture } from './dive_ux_r1_test_fixture.mjs';

const fx = createDiveUxR1Fixture();
const draft = createSegmentFlightPlanDraft(fx.plan, { agentId: 'glider-1', waypointIndex: 1, level: fx.level, mission: fx.mission });
const edited = updateSegmentFlightPlanDraft(draft, { diveProfileId: 'deepDive' }, { level: fx.level, mission: fx.mission });
const exported = JSON.parse(JSON.stringify(fx.plan));
assert.equal(JSON.stringify(exported).includes('selectedSegmentFlightPlanDraft'), false);
const imported = normalizePlan(exported, fx.level, fx.mission);
assert.equal(imported.agentPlans[0].waypoints[1].diveProfileId, 'thermoclineDive');
assert.equal(edited.flightPlan.profileId, 'deepDive');
console.log('audit_segment_profile_export_ownership: ok');
