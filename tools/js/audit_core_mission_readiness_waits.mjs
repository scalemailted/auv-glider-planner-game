import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PLAYWRIGHT_GROUPS } from './playwright_groups.mjs';

const files = [
  "tests/e2e/product_hub_and_labs.spec.js",
  "tests/e2e/mission_planning.spec.js",
  "tests/e2e/environment_rendering.spec.js",
  "tests/e2e/workspace_and_challenge_setup.spec.js",
  "tests/e2e/simulation_and_terrain.spec.js"
];
const helper = await readFile('tests/e2e/helpers/SmokeSpecShared.js', 'utf8');
const core = PLAYWRIGHT_GROUPS.find((group) => group.id === 'coreMission');
assert.ok(core, 'coreMission group exists');
assert.ok(helper.includes("waitForAnchorAppReady(page, { routeId: 'main-menu' })"), 'shared helper uses the production readiness helper');
assert.ok(helper.includes("waitForAnchorRoute(page, 'main-menu')"), 'main-menu helper uses route readiness');

const violations = [];
for (const file of files) {
  const text = await readFile(file, 'utf8');
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].includes("await page.goto('/');")) continue;
    let sawReadiness = false;
    for (let cursor = index + 1; cursor < Math.min(lines.length, index + 8); cursor += 1) {
      if ((lines[cursor] ?? '').includes("await waitForAnchorAppReady(page, { routeId: 'main-menu' });")) {
        sawReadiness = true;
        break;
      }
    }
    if (!sawReadiness) violations.push(`${file}:${index + 1}: root goto is not followed by app readiness`);
  }
}
assert.deepEqual(violations, [], `Root boot readiness violations:
${violations.join('\n')}`);

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
