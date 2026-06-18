import { assert, createFakeDocument, fakeElement } from './mig_r2_smoke_helpers.mjs';
import { createAnchorAppShell } from '../../src/app/shell/AnchorAppShell.js';

const documentRef = createFakeDocument();
const shell = createAnchorAppShell({ documentRef, gameRoot: fakeElement('div'), root: fakeElement('body') });
const node = fakeElement('main');
shell.mountView('mainMenu', { mount: () => node, unmount: () => { node.unmounted = true; } });
assert(shell.getDebugState().activeViewId === 'mainMenu', 'Shell should track active view.');
assert(shell.getDebugState().usesPhaserCanvas === false, 'DOM shell should not use Phaser canvas.');
console.log('smoke_anchor_app_shell ok');
