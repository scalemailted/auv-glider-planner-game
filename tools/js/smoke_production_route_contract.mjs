import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ANCHOR_PRODUCTION_ROUTES, validateAnchorProductionRoute } from '../../src/app/production/AnchorProductionRoute.js';

const ids = ANCHOR_PRODUCTION_ROUTES.map((route) => route.id);
assert.equal(new Set(ids).size, ids.length, 'route IDs must be unique');
for (const route of ANCHOR_PRODUCTION_ROUTES) {
  assert.equal(validateAnchorProductionRoute(route.id).valid, true, `${route.id} must validate`);
  assert.ok(route.leftRegion?.id, `${route.id} requires left region metadata`);
  assert.ok(route.centerRegion?.id, `${route.id} requires center region metadata`);
  assert.ok(route.rightRegion?.id, `${route.id} requires right region metadata`);
  assert.ok(route.defaultFocusSelector, `${route.id} requires a focus target`);
}
const source = readFileSync('src/app/production/AnchorProductionRoute.js', 'utf8');
assert.doesNotMatch(source, /from\s+['"][^'"]*phaser/i, 'route contract must not import Phaser');
console.log(`production route contract smoke passed: ${ids.length} routes`);
