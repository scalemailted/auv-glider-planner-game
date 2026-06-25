import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { compactFieldRecord, createPackageFixtureField, digestValue, scalarProcesses, selectedSamples } from './scalar_package_test_helpers.mjs';

const fixturePath = path.resolve('tests/fixtures/scalar_package_r1_parity.json');
const update = process.argv.includes('--update');
const record = await buildRecord();

if (update) {
  await mkdir(path.dirname(fixturePath), { recursive: true });
  await writeFile(fixturePath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  console.log('capture_scalar_package_r1_baseline: updated', { fixturePath, digest: record.digest, cases: record.cases.length });
} else {
  if (!existsSync(fixturePath)) throw new Error(`Missing parity fixture ${fixturePath}. Run with --update after reviewing output.`);
  const expected = JSON.parse(await readFile(fixturePath, 'utf8'));
  assert.deepEqual(record, expected);
  console.log('capture_scalar_package_r1_baseline: ok', { fixturePath, digest: record.digest, cases: record.cases.length });
}

export async function buildRecord() {
  const cases = [];
  cases.push(recordCase('linearFixture', createPackageFixtureField({ id: 'scalar-package-r1-linear-fixture' }), [0, 50, 100]));
  for (const id of ['linearDepthTime', 'uniformControl', 'decayingPatch', 'sourcePatch', 'gaussianDiffusionProxy']) {
    cases.push(recordCase(id, scalarProcesses.createManufacturedScalarField(id), [0, 300, 600, 900]));
  }
  const record = {
    type: 'anchor.scalar-processes.package-r1-parity-baseline',
    version: 'process-pkg-r1',
    packageVersion: scalarProcesses.PACKAGE_VERSION,
    generatedAt: 'deterministic-static-record',
    cases
  };
  record.digest = digestValue({ ...record, digest: null });
  return record;
}

function recordCase(id, field, times) {
  const samples = selectedSamples(field, times);
  return {
    manifestConfigId: id,
    ...compactFieldRecord(field, samples)
  };
}
