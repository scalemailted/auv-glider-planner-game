import assert from 'node:assert/strict';
import { setGliderDefaultFlightPlan } from '../../src/core/planning/SegmentFlightPlanCommands.js';
import { createDiveUxR1Fixture } from './dive_ux_r1_test_fixture.mjs';

const fx = createDiveUxR1Fixture();
const result = setGliderDefaultFlightPlan(fx.plan, { agentId: 'glider-1', patch: { diveProfileId: 'deepDive', targetDepthLayerId: 'deep' }, level: fx.level, mission: fx.mission });
const glider1 = fx.plan.agentPlans.find((plan) => plan.agentId === 'glider-1');
const glider2 = fx.plan.agentPlans.find((plan) => plan.agentId === 'glider-2');
assert.equal(result.status, 'applied');
assert.equal(glider1.diveProfileId, 'deepDive');
assert.notEqual(glider2.diveProfileId, 'deepDive');
console.log('smoke_segment_profile_glider_default: ok', { agent: glider1.agentId, profile: glider1.diveProfileId });
