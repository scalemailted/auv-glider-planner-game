import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { SimulationEngine } from '../../src/core/sim/SimulationEngine.js';
import { simulationWorldRenderInputFromScene, simulationWorldRenderInputSummary } from '../../src/core/rendering/SimulationWorldStateAdapter.js';
import { buildSimulationWorldRenderViewModel, validateSimulationWorldRenderViewModel } from '../../src/core/rendering/SimulationWorldRenderViewModel.js';

const level = JSON.parse(await readFile('levels/tutorial_01_currents.json', 'utf8'));
const mission = JSON.parse(await readFile('missions/tutorial_sampling.json', 'utf8'));
const plan = { agentPlans: [{ agentId: 'glider_01', waypoints: [{ id: 'wp-1', x: 2, y: 2 }, { id: 'wp-2', x: 5, y: 5 }] }] };
const engine = new SimulationEngine({ level, mission: structuredClone(mission), plan });
engine.step(1, { force: true });
const scene = { app: { state: { level, mission, plan, selectedAgentId: 'glider_01', ui: {}, playback: { time: engine.t, speedScale: 1 }, mode: 'simulation' } }, engine };
const input = simulationWorldRenderInputFromScene(scene);
const summary = simulationWorldRenderInputSummary(input);
assert.equal(summary.ownsSimulationState, false);
assert.equal(summary.computesVehicleMotion, false);
assert.ok(summary.realizedTrajectoryPointCount >= 1);
const vm = buildSimulationWorldRenderViewModel(input);
const validation = validateSimulationWorldRenderViewModel(vm);
assert.equal(validation.valid, true, validation.errors.join('; '));
assert.equal(vm.boundaryFlags.advancesSimulationClock, false);
assert.equal(vm.boundaryFlags.ownsScoring, false);
console.log('smoke_simulation_world_state_adapter: ok', summary);
