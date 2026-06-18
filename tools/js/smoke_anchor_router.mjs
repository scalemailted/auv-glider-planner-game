import { assert } from './mig_r2_smoke_helpers.mjs';
import { createAnchorRouter } from '../../src/app/router/AnchorRouter.js';

const events = [];
const router = createAnchorRouter({ windowRef: null });
router.subscribe((route) => events.push(route.id));
router.navigate('missionBriefing');
router.navigate('missionPlanning');
router.openLegacyScene('flowDemo');
assert(router.currentRoute.id === 'legacyPhaser', 'Router should navigate to legacy route.');
assert(router.currentRoute.requiresPhaser === true, 'Legacy route should mark Phaser requirement.');
assert(events.includes('missionPlanning'), 'Router should notify planning route.');
assert(router.getDebugState().productionRoutesUsePhaser === false, 'Production routes should not require Phaser.');
console.log('smoke_anchor_router ok');
