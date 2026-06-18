import assert from 'node:assert/strict';
import { createFakeDocument } from './mig_r2_smoke_helpers.mjs';
import { createAnchorAppShell, setAnchorShellLayout } from '../../src/app/shell/AnchorAppShell.js';

const documentRef = createFakeDocument();
const shell = createAnchorAppShell({ documentRef });
for (const layout of ['productHub', 'setup', 'briefing', 'missionWorkspace', 'simulationWorkspace', 'debrief', 'legacyLab']) {
  assert.equal(setAnchorShellLayout(shell, layout), layout);
  assert.equal(shell.getDebugState().activeLayoutId, layout);
}
console.log('smoke_anchor_shell_layouts: ok');
