import { assert } from './mig_r2_smoke_helpers.mjs';
import { ANCHOR_ROUTE_IDS, createAnchorRoute, hashForAnchorRoute, routeFromHash, validateAnchorRoute } from '../../src/app/router/AnchorRouteContract.js';

const route = createAnchorRoute(ANCHOR_ROUTE_IDS.missionPlanning);
assert(route.id === 'missionPlanning', 'missionPlanning route should normalize.');
assert(route.requiresPhaser === false, 'Production planning route must not require Phaser.');
assert(hashForAnchorRoute(route) === '#/mission/planning', 'Planning hash should be stable.');
const legacy = routeFromHash('#/legacy/FlowFieldDemoScene');
assert(legacy.requiresPhaser === true, 'Legacy route should require Phaser island.');
assert(validateAnchorRoute(legacy).valid, 'Legacy route should validate.');
console.log('smoke_anchor_route_contract ok');
