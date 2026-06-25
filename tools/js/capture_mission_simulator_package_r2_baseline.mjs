import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { missionSimulator } from './mission_simulator_package_test_helpers.mjs';
import { runMissionSimulatorParityHarness } from './mission_simulator_parity_harness.mjs';

const fixturePath = path.resolve('tests/fixtures/mission_simulator_package_r2_parity.json');
const update = process.argv.includes('--update');
const record = buildRecord();

if (update) {
  await mkdir(path.dirname(fixturePath), { recursive: true });
  await writeFile(fixturePath, JSON.stringify(record, null, 2) + '\n', 'utf8');
  console.log('capture_mission_simulator_package_r2_baseline: updated', { fixturePath, digest: record.digest });
} else {
  if (!existsSync(fixturePath)) throw new Error('Missing parity fixture ' + fixturePath + '. Run with --update after reviewing output.');
  const expected = JSON.parse(await readFile(fixturePath, 'utf8'));
  assert.deepEqual(record, expected);
  console.log('capture_mission_simulator_package_r2_baseline: ok', { fixturePath, digest: record.digest });
}

export function buildRecord() {
  const harness = runMissionSimulatorParityHarness();
  const out = {
    type: 'anchor.mission-simulator.package-r2-parity-baseline',
    version: 'sim-pkg-r2',
    generatedAt: 'deterministic-static-record',
    harness,
    cases: [
      { id: 'package-kernel-snapshot-restore', ...harness.packageKernel },
      { id: 'production-simulation-engine-adapter', ...harness.productionAdapter }
    ]
  };
  out.digest = missionSimulator.stableDigest({ ...out, digest: null });
  return out;
}
