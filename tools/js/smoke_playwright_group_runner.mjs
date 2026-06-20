import assert from 'node:assert/strict';
import { auditPlaywrightGroupCoverage, grepForGroup, PLAYWRIGHT_GROUPS } from './playwright_groups.mjs';

const titles = PLAYWRIGHT_GROUPS.flatMap((group) => group.patterns.map((pattern) => pattern.source.replace(/^\^/, '').replace(/\$$/, '').replace(/\\\//g, '/')));
const audit = auditPlaywrightGroupCoverage(titles);
assert.equal(audit.valid, true, 'sample group titles are assigned exactly once');
for (const group of PLAYWRIGHT_GROUPS) {
  assert.ok(grepForGroup(group.id).length > 0, `${group.id} grep is non-empty`);
  assert.ok(audit.byGroup[group.id].length > 0, `${group.id} has sample tests`);
}
console.log('PASS smoke_playwright_group_runner');
