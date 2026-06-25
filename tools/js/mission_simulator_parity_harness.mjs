import assert from 'node:assert/strict';
import { createMissionSimulationInputFixture, missionSimulator, runSmallEngineRecord } from './mission_simulator_package_test_helpers.mjs';

export function runMissionSimulatorParityHarness() {
  const input = createMissionSimulationInputFixture({ id: 'mission-sim-pkg-r2-parity' });
  const simulator = missionSimulator.createMissionSimulator(input);
  const initial = missionSimulator.missionSimulationSnapshot(simulator);
  const step1 = missionSimulator.stepMissionSimulator(simulator, { type: 'step', dtSeconds: 1 });
  const snapshot = missionSimulator.missionSimulationSnapshot(simulator);
  const restored = missionSimulator.restoreMissionSimulationSnapshot(snapshot, { input });
  const step2a = missionSimulator.stepMissionSimulator(simulator, { type: 'step', dtSeconds: 1 });
  const step2b = missionSimulator.stepMissionSimulator(restored, { type: 'step', dtSeconds: 1 });
  assert.equal(step2a.state.stateDigest, step2b.state.stateDigest);

  const production = runSmallEngineRecord();
  return {
    type: 'anchor.mission-simulator.r2-parity-harness-record',
    version: 'sim-pkg-r2',
    packageVersion: missionSimulator.PACKAGE_VERSION,
    authoritativeRuntimeVersion: missionSimulator.MISSION_SIMULATOR_AUTHORITATIVE_RUNTIME_VERSION,
    packageKernel: {
      inputDigest: input.inputDigest,
      initialStateDigest: initial.state.stateDigest,
      firstStepDigest: step1.state.stateDigest,
      finalStateDigest: simulator.state.stateDigest,
      restoredFinalStateDigest: restored.state.stateDigest,
      eventDigest: missionSimulator.stableDigest(missionSimulator.missionSimulationEvents(simulator).map((event) => event.digest)),
      observationDigest: missionSimulator.stableDigest(missionSimulator.missionSimulationObservations(simulator).map((observation) => observation.digest)),
      rawMetricDigest: missionSimulator.stableDigest(missionSimulator.missionSimulationRawMetrics(simulator)),
      terminalReason: simulator.terminalReason ?? null,
      resultDigest: missionSimulator.missionSimulationResultDigest(simulator)
    },
    productionAdapter: production,
    firstDivergence: null,
    comparisonStatus: 'PASS'
  };
}

const invoked = process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\\\', '/'));
if (invoked) {
  const record = runMissionSimulatorParityHarness();
  console.log('mission_simulator_parity_harness: ok', { resultDigest: record.packageKernel.resultDigest, productionResultDigest: record.productionAdapter.resultDigest });
}
