import { assert, createFakeDocument } from './mig_r2_smoke_helpers.mjs';
import { createLegacyPhaserIslandHost } from '../../src/app/legacy/LegacyPhaserIslandHost.js';

const host = createLegacyPhaserIslandHost({ documentRef: createFakeDocument() });
const debug = host.getDebugState();
assert(debug.mounted === false, 'Legacy host should start unmounted.');
assert(debug.normalRuntimeDependency === false, 'Legacy host should not be a normal runtime dependency.');
assert(globalThis.ANCHOR_LEGACY_PHASER_DEBUG?.version === 'legacy-phaser-island-host-mig-r2', 'Legacy debug object should publish.');
console.log('smoke_legacy_phaser_island_host ok');
