import {
  initializeAnchorAppBootDebug,
  markAnchorAppBootFailure,
  markAnchorAppBootMilestone
} from '../app/production/AnchorAppBootReadiness.js';
import {
  publishAnchorRuntimeSelectionDebug,
  resolveAnchorProductionRuntime
} from '../app/production/AnchorRuntimeSelector.js';

const selection = resolveAnchorProductionRuntime(globalThis.location, globalThis.localStorage);
initializeAnchorAppBootDebug({
  requestedRuntimeShell: selection.requestedRuntime,
  resolvedRuntimeShell: selection.resolvedRuntime,
  sourceMode: 'browser-esm',
  basePath: globalThis.location ? globalThis.location.pathname.replace(/[^/]*$/, '') : '/'
});
const debug = publishAnchorRuntimeSelectionDebug(selection);
markAnchorAppBootMilestone('main-module-ready');
try {
  await import('../../packages/contracts/src/index.js');
  markAnchorAppBootMilestone('package-contracts-ready');
  await import('../../packages/bathymetry/src/index.js');
  markAnchorAppBootMilestone('package-bathymetry-ready');
  await import('../../packages/currents/src/index.js');
  markAnchorAppBootMilestone('package-currents-ready');
} catch (error) {
  markAnchorAppBootFailure('package-module-import', error);
  throw error;
}

try {
  if (selection.resolvedRuntime === 'next') {
    await import('../app/production/AnchorProductionBootstrap.js');
  } else {
    await import('./phaser/PhaserProductionBootstrap.js');
  }
} catch (error) {
  debug.failures.push(String(error?.message ?? error));
  markAnchorAppBootFailure('runtime-bootstrap', error);
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
