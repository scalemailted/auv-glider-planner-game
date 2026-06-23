import assert from 'node:assert/strict';
import { validatePlanForExecution } from '../../src/core/planning/PlanExecutionValidator.js';
import { SimulationEngine } from '../../src/core/sim/SimulationEngine.js';
import { createNormalGeneratedCurrentScenario, summarizeIdleAgents } from './flow_r2a4_production_helpers.mjs';

const fixture = createNormalGeneratedCurrentScenario({ seed: 'flow-r2a4-execute-handoff' });
const validation = validatePlanForExecution({ level: fixture.level, mission: fixture.mission, plan: fixture.plan });
assert.equal(validation.ok, true, validation.errors.join('; '));
assert.equal(validation.warnings.some((warning) => /has no waypoints and will idle/.test(warning)), true, 'idle optional gliders produce a clear warning');
assert.deepEqual(summarizeIdleAgents(fixture.plan, fixture.activeAgentId).map((agent) => agent.waypointCount), [0, 0], 'only the active glider has a route');

const engine = new SimulationEngine({ level: fixture.level, mission: fixture.mission, plan: fixture.plan, time: 0 });
assert.equal(engine.aborted, false, engine.abortReason ?? 'engine starts without aborting');
engine.runUntilComplete(220);
const result = engine.getResult();
const activeTrajectory = result.trajectories.find((trajectory) => trajectory.agentId === fixture.activeAgentId);
const idleTrajectories = result.trajectories.filter((trajectory) => trajectory.agentId !== fixture.activeAgentId);

assert.ok(activeTrajectory?.history?.length > 1, 'active routed glider produces a trajectory');
assert.equal(idleTrajectories.length, 2, 'idle optional gliders remain represented');
for (const trajectory of idleTrajectories) {
  assert.equal(trajectory.history.every((point) => Number(point.depthMeters ?? 0) === 0), true, `${trajectory.agentId} remains surfaced`);
  assert.equal(trajectory.history.some((point) => point.idleControl === true), true, `${trajectory.agentId} is marked as an idle control`);
}
assert.equal(result.events.some((event) => event.agentId !== fixture.activeAgentId && /sample/i.test(event.type ?? '')), false, 'idle gliders fabricate no sample observations');
assert.equal(result.summary.stopReason?.aborted === true, false, 'simulation does not abort');

console.log('smoke_current_execute_handoff: ok', {
  activeAgentId: fixture.activeAgentId,
  warningCount: validation.warnings.length,
  frameCount: result.frames.length,
  eventCount: result.events.length
});
