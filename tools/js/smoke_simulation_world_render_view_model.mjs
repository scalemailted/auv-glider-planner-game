import assert from 'node:assert/strict';

import { buildSimulationWorldRenderViewModel, validateSimulationWorldRenderViewModel, simulationWorldRenderViewModelSummary } from '../../src/core/rendering/SimulationWorldRenderViewModel.js';

const level = { levelId: 'smoke-level', world: { grid: { width: 4, height: 4 }, time: { duration: 12, dt: 1 } }, layers: { terrain: [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], roi: [[0,0,0,0],[0,1,0,0],[0,0.5,0,0],[0,0,0,0]] } };
const mission = { missionId: 'smoke-mission', agents: [{ id: 'glider_01', start: { x: 1, y: 1 }, battery: 100 }] };
const plan = { agentPlans: [{ agentId: 'glider_01', waypoints: [{ x: 2, y: 2, t: 2 }] }] };
const vm = buildSimulationWorldRenderViewModel({
  level,
  mission,
  plan,
  selectedAgentId: 'glider_01',
  activeTimeSeconds: 3,
  gliders: [{ id: 'glider_01', x: 1.6, y: 1.7, batteryFraction: 0.9, status: 'enroute' }],
  realizedTrajectories: [{ agentId: 'glider_01', points: [{ x: 1, y: 1, t: 0 }, { x: 1.6, y: 1.7, t: 3 }] }],
  observations: [{ type: 'sample', agentId: 'glider_01', x: 2, y: 2, t: 3, value: 1 }],
  surfacingEvents: [{ type: 'surfaced', agentId: 'glider_01', x: 1.6, y: 1.7, t: 3 }],
  simulationStatus: { status: 'running', running: true, timeSeconds: 3 },
  scoreSummary: { finalScore: 12 }
});
const validation = validateSimulationWorldRenderViewModel(vm);
assert.equal(validation.valid, true, validation.errors.join('; '));
const summary = simulationWorldRenderViewModelSummary(vm);
assert.equal(summary.realizedTrajectoryCount, 1);
assert.equal(summary.realizedTrajectoryPointCount, 2);
assert.equal(summary.observationCount, 1);
assert.equal(summary.surfacingEventCount, 1);
assert.equal(summary.ownsSimulationState, false);
assert.equal(summary.advancesSimulationClock, false);
assert.equal(summary.computesVehicleMotion, false);
assert.equal(summary.generatesObservations, false);
console.log('smoke_simulation_world_render_view_model: ok', summary);
