import { captureBathymetryPackageR1Baseline } from './capture_bathymetry_package_r1_baseline.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const fixture = JSON.parse(await fs.readFile('tests/fixtures/bathymetry_package_r1_parity.json', 'utf8'));
const current = captureBathymetryPackageR1Baseline();
assert.deepEqual(current, fixture);
console.log('audit_bathymetry_package_parity: ok', { records: current.records.length });