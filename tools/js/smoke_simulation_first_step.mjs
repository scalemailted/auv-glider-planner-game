function assert(condition, message) {
  if (!condition) throw new Error(message);
}

import { SimulationEngine } from '../../src/core/sim/SimulationEngine.js';

const zeros = (w, h, value = 0) => Array.from({ length: h }, () => Array(w).fill(value));
const currents = (w, h) => Array.from({ length: h }, () => Array.from({ length: w }, () => [0, 0]));
const level = {
  levelId: 'first-step-level',
  world: { grid: { width: 6, height: 6 }, time: { dt: 1, duration: 8 } },
  layers: { terrain: zeros(6, 6), hazards: zeros(6, 6), truth: { frames: [{ t: 0, current: currents(6, 6), roi: zeros(6, 6) }] } },
  meta: { seed: 'first-step' }
};
const mission = { missionId: 'first-step-mission', agents: [{ id: 'g1', label: 'Glider 1', start: { x: 1, y: 1 }, maxSpeed: 1.5, battery: 100 }], rules: {}, scoring: {} };
const plan = { schemaVersion: '2.0', type: 'anchor.plan', agentPlans: [{ agentId: 'g1', selectedStart: { x: 1, y: 1 }, waypoints: [{ id: 'w1', x: 4, y: 1, action: 'sample', t: 3 }] }] };
const engine = new SimulationEngine({ level, mission, plan, time: 0 });
const before = { t: engine.t, stepCount: engine.stepCount, x: engine.agents[0].x, y: engine.agents[0].y, history: engine.agents[0].history.length, energy: engine.agents[0].energy ?? engine.agents[0].battery };
engine.stepOnce();
const after = { t: engine.t, stepCount: engine.stepCount, x: engine.agents[0].x, y: engine.agents[0].y, history: engine.agents[0].history.length, energy: engine.agents[0].energy ?? engine.agents[0].battery };
assert(after.stepCount > before.stepCount, 'step count should increase');
assert(after.t > before.t, 'simulation time should advance');
assert(after.history >= before.history, 'trajectory history should not shrink');
assert(after.x !== before.x || after.y !== before.y || engine.aborted || engine.routeFailureDecision?.active, 'agent should move or report a canonical blocking state');
assert(engine.plan === plan, 'engine must own canonical plan reference, not a renderer plan');
console.log('smoke_simulation_first_step passed');