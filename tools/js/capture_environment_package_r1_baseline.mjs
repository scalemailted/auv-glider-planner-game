import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { compactEnvironmentRecord, createFixtureBathymetry, createFixtureCurrent, createFixtureEnvironment, createFixtureScalar, environment } from './environment_package_test_helpers.mjs';

const fixturePath = path.resolve('tests/fixtures/environment_package_r1_parity.json');
const update = process.argv.includes('--update');
const record = buildRecord();

if (update) {
  await mkdir(path.dirname(fixturePath), { recursive: true });
  await writeFile(fixturePath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  console.log('capture_environment_package_r1_baseline: updated', { fixturePath, digest: record.digest, cases: record.cases.length });
} else {
  if (!existsSync(fixturePath)) throw new Error(`Missing parity fixture ${fixturePath}. Run with --update after reviewing output.`);
  const expected = JSON.parse(await readFile(fixturePath, 'utf8'));
  assert.deepEqual(record, expected);
  console.log('capture_environment_package_r1_baseline: ok', { fixturePath, digest: record.digest, cases: record.cases.length });
}

export function buildRecord() {
  const cases = [
    recordCase('public-composed-environment', createFixtureEnvironment({ id: 'env-pkg-r1-public' })),
    recordCase('hidden-truth-roles', createFixtureEnvironment({ id: 'env-pkg-r1-hidden', hiddenCurrent: true, hiddenScalar: true })),
    recordCase('different-component-resolution', createFixtureEnvironment({
      id: 'env-pkg-r1-different-resolution',
      bathymetry: createFixtureBathymetry({ id: 'env-pkg-r1-different-resolution-bathy' }),
      current: createFixtureCurrent({ id: 'env-pkg-r1-different-resolution-current', eastAxisMeters: [0, 2.5, 5, 7.5, 10], northAxisMeters: [0, 5, 10], wetMask: [[true, true, true, true, true], [true, true, true, true, true], [true, true, true, true, true]], bottomDepthMeters: [[120, 120, 120, 120, 120], [120, 115, 110, 105, 100], [120, 110, 100, 90, 80]] }),
      scalar: createFixtureScalar({ id: 'env-pkg-r1-different-resolution-scalar', xAxis: [0, 3, 7, 10], yAxis: [0, 10] })
    }))
  ];
  const record = {
    type: 'anchor.environment.package-r1-parity-baseline',
    version: 'env-pkg-r1',
    packageVersion: environment.PACKAGE_VERSION,
    generatedAt: 'deterministic-static-record',
    cases
  };
  record.digest = environment.stableDigest({ ...record, digest: null });
  return record;
}

function recordCase(id, artifact) {
  return {
    manifestConfigId: id,
    ...compactEnvironmentRecord(artifact)
  };
}