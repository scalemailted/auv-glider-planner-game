import {
  publishAnchorRuntimeSelectionDebug,
  resolveAnchorProductionRuntime
} from '../app/production/AnchorRuntimeSelector.js';

const selection = resolveAnchorProductionRuntime(globalThis.location, globalThis.localStorage);
const debug = publishAnchorRuntimeSelectionDebug(selection);

try {
  if (selection.resolvedRuntime === 'next') {
    await import('../app/production/AnchorProductionBootstrap.js');
  } else {
    await import('./phaser/PhaserProductionBootstrap.js');
  }
} catch (error) {
  debug.failures.push(String(error?.message ?? error));
  if (selection.resolvedRuntime === 'next') {
    debug.fallbackReason = 'next-shell-bootstrap-failed';
    debug.resolvedRuntime = selection.defaultRuntime;
    await import('./phaser/PhaserProductionBootstrap.js');
  } else {
    const root = globalThis.document?.getElementById?.('game-root');
    if (root) {
      root.innerHTML = '<main class="center-screen-overlay"><section class="center-panel"><h1>ANCHOR failed to start</h1><p>Open the browser console for details.</p></section></main>';
    }
    throw error;
  }
}
