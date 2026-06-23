import assert from 'node:assert/strict';
import { createNormalGeneratedCurrentScenario, buildNormalGeneratedCurrentViewModel, summarizeIdleAgents } from './flow_r2a4_production_helpers.mjs';

const fixture = createNormalGeneratedCurrentScenario({ seed: 'flow-r2a4-default-audit' });
const view = buildNormalGeneratedCurrentViewModel({ fixture });

assert.equal(fixture.mission.agents.length >= 3, true, 'normal generated challenge keeps the configured fleet controls');
assert.equal(fixture.plan.agentPlans.find((agentPlan) => agentPlan.agentId === fixture.activeAgentId)?.waypoints.length > 0, true, 'Glider 1 has executable route intent');
assert.deepEqual(summarizeIdleAgents(fixture.plan, fixture.activeAgentId).map((agent) => agent.waypointCount), [0, 0], 'Glider 2 and Glider 3 may remain idle');
assert.equal(fixture.state.ui.showCurrents, true, 'normal generated mission requests currents by default');
assert.equal(view.presentationDebug.currentPresentationEnabled, true, 'normal generated mission current presentation is enabled');
assert.equal(view.currentDebug.calibratedForecast, false, 'normal generated current field is not claimed as calibrated forecast');

console.log('audit_current_normal_mission_defaults: ok');
