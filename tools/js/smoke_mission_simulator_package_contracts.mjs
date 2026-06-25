import { assert, createMissionSimulationInputFixture, missionSimulator } from './mission_simulator_package_test_helpers.mjs';

const input = createMissionSimulationInputFixture();
assert.equal(missionSimulator.validateMissionSimulationManifest(input.manifest).valid, true);
assert.equal(missionSimulator.validateMissionSimulationInput(input).valid, true);
assert.match(missionSimulator.missionSimulationManifestDigest(input.manifest), /^fnv1a32:/);
assert.match(missionSimulator.missionSimulationInputDigest(input), /^fnv1a32:/);
assert.equal(input.environmentArtifactDigest, input.environmentArtifact.artifactDigest);
assert.equal(input.manifest.claimBoundary.operationalVehicleCertification, false);
assert.equal(input.manifest.claimBoundary.certifiedNavigationSystem, false);
assert.equal(input.manifest.claimBoundary.calibratedVehicleTwin, false);

const simulator = missionSimulator.createMissionSimulator(input);
const initialDigest = simulator.state.stateDigest;
assert.equal(missionSimulator.validateMissionSimulator(simulator).valid, true);
assert.equal(simulator.state.timeSeconds, 0);
assert.equal(simulator.runtime.environmentSamplerCreateCount, 1);

const step = missionSimulator.stepMissionSimulator(simulator, { type: 'step', dtSeconds: 1 });
assert.equal(step.accepted, true);
assert.equal(step.nextTimeSeconds, 1);
assert.notEqual(simulator.state.stateDigest, initialDigest);
assert.equal(missionSimulator.missionSimulationEvents(simulator).every((event) => event.digest), true);
assert.equal(missionSimulator.missionSimulationObservations(simulator).every((observation) => observation.digest), true);
assert.equal(Number.isFinite(missionSimulator.missionSimulationRawMetrics(simulator).energyUsed), true);

const snapshot = missionSimulator.missionSimulationSnapshot(simulator);
assert.doesNotThrow(() => structuredClone(snapshot));
const restored = missionSimulator.restoreMissionSimulationSnapshot(snapshot, { input });
const restoredStep = missionSimulator.stepMissionSimulator(restored, { type: 'step', dtSeconds: 1 });
const continuedStep = missionSimulator.stepMissionSimulator(simulator, { type: 'step', dtSeconds: 1 });
assert.equal(restoredStep.state.stateDigest, continuedStep.state.stateDigest);

const reset = missionSimulator.resetMissionSimulator(simulator);
assert.equal(reset.state.timeSeconds, 0);
assert.equal(reset.state.stateDigest, initialDigest);

const dive = missionSimulator.advanceGliderDiveStateMachine({ agentId: 'g1', position: { x: 0, y: 0, depthMeters: 0 }, divePhase: 'surfaced' }, {
  dt: 1,
  segmentProgress: 0.25,
  waterColumnConfig: { depthLayerIds: ['surface', 'shallow', 'thermocline', 'midwater', 'deep'], diveProfileId: 'sawtoothProfile' },
  diveProfileId: 'sawtoothProfile',
  targetDepthLayerId: 'deep',
  localBathymetryMeters: 200
});
assert.equal(dive.model.operationallyCalibrated, false);
assert(dive.targetDepthMeters > 0);
assert(dive.state.position.depthMeters > 0);
assert.equal(dive.effectiveDiveProfile.profileId, 'sawtoothProfile');

const decision = missionSimulator.applyMissionSimulationDecision(simulator, { action: 'continueMission' });
assert.equal(decision.status, 'accepted');
const finished = missionSimulator.finishMissionSimulator(simulator, { maxSteps: 5, terminalReason: 'operatorFinish' });
assert.equal(finished.terminal, true);
assert.equal(missionSimulator.missionSimulationTerminalSummary(finished).terminal, true);
assert.match(missionSimulator.missionSimulationResultDigest(finished), /^fnv1a32:/);

const debug = missionSimulator.missionSimulatorDebugSummary(finished);
assert.equal(debug.packageOwnsEnvironmentGeneration, false);
assert.equal(debug.packageOwnsPlanning, false);
assert.equal(debug.packageOwnsScoring, false);
assert.equal(debug.packageOwnsRendering, false);
assert.equal(debug.packageUsesThree, false);
assert.equal(debug.packageUsesPhaser, false);
assert.equal(debug.packageUsesDom, false);
console.log('smoke_mission_simulator_package_contracts: ok', { inputDigest: input.inputDigest, finalDigest: finished.state.stateDigest });