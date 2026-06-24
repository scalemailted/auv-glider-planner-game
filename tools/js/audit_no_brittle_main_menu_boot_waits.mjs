import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const files = ['tests/e2e/smoke.spec.js', 'tests/e2e/flow_pkg_r1_1_boot_readiness.spec.js'];
const violations = [];
for (const file of files) {
  const text = await readFile(file, 'utf8');
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    if (!/page\.goto\('\/'\)/.test(lines[index])) continue;
    let cursor = index + 1;
    let sawReadiness = false;
    for (; cursor < Math.min(lines.length, index + 8); cursor += 1) {
      if (/waitForAnchorAppReady/.test(lines[cursor])) { sawReadiness = true; break; }
      if (/#main-menu-hub|MainMenuScene|waitForSelector/.test(lines[cursor])) break;
    }
    if (!sawReadiness) violations.push(`${file}:${index + 1}: root goto reaches selector/scene checks before readiness`);
  }
  const staleSelectorWait = /waitForSelector\(\s*['"]#main-menu-hub['"][^)]*timeout\s*:\s*5000/s.test(text);
  if (staleSelectorWait) violations.push(`${file}: stale 5s #main-menu-hub waitForSelector`);
}
assert.deepEqual(violations, [], `Brittle main-menu boot waits found:\n${violations.join('\n')}`);
console.log('PASS audit_no_brittle_main_menu_boot_waits');