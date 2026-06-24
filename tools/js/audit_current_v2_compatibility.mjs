import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildRecord } from './capture_current_package_r1_baseline.mjs';
const expected = JSON.parse(await readFile('tests/fixtures/current_package_r1_parity.json', 'utf8'));
const actual = await buildRecord();
assert.deepEqual(actual, expected);
console.log('audit_current_v2_compatibility: ok', { digest: actual.digest, cases: actual.cases.length });