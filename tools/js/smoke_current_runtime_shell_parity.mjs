import assert from 'node:assert/strict';
import { buildNormalGeneratedCurrentViewModel } from './flow_r2a4_production_helpers.mjs';

const defaultShell = buildNormalGeneratedCurrentViewModel({ seed: 'flow-r2a4-shell-parity', runtimeShell: 'default' });
const nextShell = buildNormalGeneratedCurrentViewModel({ fixture: defaultShell, runtimeShell: 'next' });

assert.equal(defaultShell.presentationDebug.currentPresentationEnabled, true, 'default shell current contract enables currents');
assert.equal(nextShell.presentationDebug.currentPresentationEnabled, true, 'next shell current contract enables currents');
assert.equal(defaultShell.presentationDebug.normalizedDisplayMode, nextShell.presentationDebug.normalizedDisplayMode, 'shells share display mode normalization');
assert.equal(defaultShell.presentationDebug.rendererDisplayMode, nextShell.presentationDebug.rendererDisplayMode, 'shells share renderer mode normalization');
assert.equal(defaultShell.presentationDebug.sourceVectorSampleCount, nextShell.presentationDebug.sourceVectorSampleCount, 'shells share source current counts');
assert.equal(nextShell.presentationDebug.runtimeShell, 'next');
assert.equal(defaultShell.presentationDebug.displayLayerChangesCurrent, false);
assert.equal(nextShell.presentationDebug.displayLayerChangesCurrent, false);

console.log('smoke_current_runtime_shell_parity: ok', {
  mode: defaultShell.presentationDebug.normalizedDisplayMode,
  sourceVectorSampleCount: defaultShell.presentationDebug.sourceVectorSampleCount
});
