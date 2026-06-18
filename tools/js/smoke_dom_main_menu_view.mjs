import { assert, createFakeDocument } from './mig_r2_smoke_helpers.mjs';
import { createMainMenuView } from '../../src/app/views/MainMenuView.js';
import { createAnchorAppShell } from '../../src/app/shell/AnchorAppShell.js';

const documentRef = createFakeDocument();
let setupCalled = false;
const view = createMainMenuView({ lifecycleController: { beginSetup: () => { setupCalled = true; }, loadTutorialMission: async () => ({}) }, router: { openLegacyScene: () => {} } });
const shell = createAnchorAppShell({ documentRef });
const node = view.mount({ documentRef, shell });
assert(node.children.length > 0, 'Main menu should render DOM children.');
assert(view.getDebugState().contract.usesPhaserScene === false, 'Main menu should not use a Phaser scene.');
console.log('smoke_dom_main_menu_view ok');
