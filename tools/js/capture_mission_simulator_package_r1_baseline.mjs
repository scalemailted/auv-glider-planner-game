import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createMissionSimulationInputFixture, missionSimulator, runSmallEngineRecord } from './mission_simulator_package_test_helpers.mjs';

const fixturePath = path.resolve('tests/fixtures/mission_simulator_package_r1_parity.json');
const update = process.argv.includes('--update');
const record = buildRecord();

if (update) {
  await mkdir(path.dirname(fixturePath), { recursive: true });
  await writeFile(fixturePath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  console.log('capture_mission_simulator_package_r1_baseline: updated', { fixturePath, digest: record.digest, cases: record.cases.length });
} else {
  if (!existsSync(fixturePath)) throw new Error(`Missing parity fixture ${fixturePath}. Run with --update after reviewing output.`);
  const expected = JSON.parse(await readFile(fixturePath, 'utf8'));
  assert.deepEqual(record, expected);
  console.log('capture_mission_simulator_package_r1_baseline: ok', { fixturePath, digest: record.digest, cases: record.cases.length });
}

export function buildRecord() {
  const input = createMissionSimulationInputFixture();
  const simulator = missionSimulator.createMissionSimulator(input);
  const initialStateDigest = simulator.state.stateDigest;
  missionSimulator.stepMissionSimulator(simulator, { type: 'step', dtSeconds: 1 });
  const snapshot = missionSimulator.missionSimulationSnapshot(simulator);
  const restored = missionSimulator.restoreMissionSimulationSnapshot(snapshot, { input });
  missionSimulator.stepMissionSimulator(simulator, { type: 'step', dtSeconds: 1 });
  missionSimulator.stepMissionSimulator(restored, { type: 'step', dtSeconds: 1 });
  const packageCase = {
    id: 'package-kernel-fixture',
    inputDigest: input.inputDigest,
    manifestDigest: input.manifest.manifestDigest,
    environmentArtifactDigest: input.environmentArtifactDigest,
    planDigest: input.planDigest,
    initialStateDigest,
    finalStateDigest: simulator.state.stateDigest,
    restoredFinalStateDigest: restored.state.stateDigest,
    eventCount: missionSimulator.missionSimulationEvents(simulator).length,
    observationCount: missionSimulator.missionSimulationObservations(simulator).length,
    rawMetrics: missionSimulator.missionSimulationRawMetrics(simulator),
    snapshotDigest: snapshot.snapshotDigest,
    resultDigest: missionSimulator.missionSimulationResultDigest(simulator)
  };
  const productionCase = { id: 'production-simulation-engine-adapter', ...runSmallEngineRecord() };
  const cases = [packageCase, productionCase];
  const out = {
    type: 'anchor.mission-simulator.package-r1-parity-baseline',
    version: 'sim-pkg-r1',
    packageVersion: missionSimulator.PACKAGE_VERSION,
    generatedAt: 'deterministic-static-record',
    cases
  };
  out.digest = missionSimulator.stableDigest({ ...out, digest: null });
  return out;
}