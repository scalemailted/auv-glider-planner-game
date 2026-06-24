import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PLAYWRIGHT_GROUPS } from './playwright_groups.mjs';

const smoke = await readFile('tests/e2e/smoke.spec.js', 'utf8');
const core = PLAYWRIGHT_GROUPS.find((group) => group.id === 'coreMission');
assert.ok(core, 'coreMission group exists');
assert.ok(smoke.includes("waitForAnchorAppReady(page, { routeId: 'main-menu' })"), 'smoke.spec uses the production readiness helper');
assert.ok(smoke.includes("waitForAnchorRoute(page, 'main-menu')"), 'main-menu helper uses route readiness');

const lines = smoke.split(/\r?\n/);
const violations = [];
for (let index = 0; index < lines.length; index += 1) {
  if (!/await page\.goto\('\/'\);/.test(lines[index])) continue;
  let cursor = index + 1;
  while (cursor < lines.length && lines[cursor].trim() === '') cursor += 1;
  if (!/await waitForAnchorAppReady\(page, \{ routeId: 'main-menu' \}\);/.test(lines[cursor] ?? '')) {
    violations.push(`tests/e2e/smoke.spec.js:${index + 1}: root goto is not followed by app readiness`);
  }
}
assert.deepEqual(violations, [], `Root boot readiness violations:\n${violations.join('\n')}`);

const requiredTitles = [
  'Cold Repo Root Boot Reaches Main Menu Through Package Modules',
  'Cold Pages Subpath Boot Reaches Main Menu Through Package Modules',
  'Core Mission Tests Use the Production Readiness Contract',
  'Main Menu Boot Does Not Generate Mission Science',
  'Repeated App Boot and Teardown Leave No Runtime Processes',
  'Current Package Loads After Stable Main Menu Boot'
];
for (const title of requiredTitles) {
  assert.equal(core.patterns.some((pattern) => pattern.test(title)), true, `${title} is assigned to coreMission`);
}
console.log('PASS audit_core_mission_readiness_waits');