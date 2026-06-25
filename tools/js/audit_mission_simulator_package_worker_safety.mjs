import assert from 'node:assert/strict';
import * as sim from '../../packages/mission-simulator/src/index.js';
import { createMissionSimulationInputFixture } from './mission_simulator_package_test_helpers.mjs';

const input = createMissionSimulationInputFixture();
const clonedInput = structuredClone(input);
assert.equal(clonedInput.inputDigest, input.inputDigest);
const simulator = sim.createMissionSimulator(input);
sim.stepMissionSimulator(simulator, { type: 'step', dtSeconds: 1 });
const snapshot = sim.missionSimulationSnapshot(simulator);
const clonedSnapshot = structuredClone(snapshot);
assert.equal(clonedSnapshot.snapshotDigest, snapshot.snapshotDigest);
assert.equal(JSON.stringify(clonedSnapshot).includes('function'), false);
assert.equal(snapshot.environmentArtifactDigest, input.environmentArtifactDigest);
console.log('audit_mission_simulator_package_worker_safety: ok', { snapshotDigest: snapshot.snapshotDigest });