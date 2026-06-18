import assert from 'node:assert/strict';
import { allManifestRoutes, assertRouteContentParity } from './dom_parity_audit_lib.mjs';

const rows = [];
for (const routeId of allManifestRoutes()) {
  try {
    assertRouteContentParity(routeId);
    rows.push(`${routeId}: PASS`);
  } catch (error) {
    rows.push(`${routeId}: FAIL ${error.message}`);
  }
}
const failures = rows.filter((row) => row.includes(': FAIL'));
console.log(rows.join('\n'));
assert.deepEqual(failures, []);
