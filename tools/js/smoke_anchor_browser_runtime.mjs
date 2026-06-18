import { assert, createFakeDocument } from './mig_r2_smoke_helpers.mjs';
import { createAnchorBrowserRuntime } from '../../src/app/runtime/AnchorBrowserRuntime.js';

const documentRef = createFakeDocument();
const runtime = createAnchorBrowserRuntime({ documentRef, windowRef: null, services: { loadTutorialMission: async () => ({}) } });
assert(runtime.getDebugState().normalRoutesInstantiatePhaser === false, 'Runtime normal routes must not instantiate Phaser.');
runtime.router.navigate('missionSetup');
assert(globalThis.ANCHOR_APP_RUNTIME_DEBUG?.version === 'anchor-browser-runtime-mig-r2', 'Runtime debug object should publish.');
console.log('smoke_anchor_browser_runtime ok');
