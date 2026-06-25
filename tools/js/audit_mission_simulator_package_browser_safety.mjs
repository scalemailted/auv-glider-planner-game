import assert from 'node:assert/strict';
import * as sim from '../../packages/mission-simulator/src/index.js';
import { createMissionSimulationInputFixture } from './mission_simulator_package_test_helpers.mjs';

const input = createMissionSimulationInputFixture();
const simulator = sim.createMissionSimulator(input);
sim.stepMissionSimulator(simulator, { type: 'step', dtSeconds: 1 });
const debug = sim.missionSimulatorDebugSummary(simulator);
assert.equal(sim.PACKAGE_VERSION, 'anchor-mission-simulator-sim-pkg-r1');
assert.equal(debug.packageUsesThree, false);
assert.equal(debug.packageUsesPhaser, false);
assert.equal(debug.packageUsesDom, false);
assert.equal(debug.packageOwnsScoring, false);
assert.equal(debug.packageOwnsRendering, false);
assert.equal(debug.canonicalTimeUnit, 'seconds');
assert.equal(debug.canonicalDepthConvention, 'positiveDownMeters');
assert.doesNotThrow(() => structuredClone(sim.missionSimulationSnapshot(simulator)));
console.log('audit_mission_simulator_package_browser_safety: ok', { inputDigest: input.inputDigest, stateDigest: simulator.state.stateDigest });