import assert from 'node:assert/strict';

const originalDocument = globalThis.document;
const originalLocation = globalThis.location;
const originalPerformance = globalThis.performance;
const originalCustomEvent = globalThis.CustomEvent;
const attrs = new Map();
const element = { setAttribute: (key, value) => attrs.set(key, value) };

globalThis.document = {
  readyState: 'complete',
  body: element,
  getElementById: () => element,
  dispatchEvent: (event) => { globalThis.__anchorBootSmokeEvent = event; return true; }
};
globalThis.location = { pathname: '/' };
globalThis.performance = { now: () => 100 };
globalThis.CustomEvent = class CustomEvent {
  constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
};

globalThis.ANCHOR_APP_BOOT_DEBUG = null;
const readiness = await import('../../src/app/production/AnchorAppBootReadiness.js');
const debug = readiness.initializeAnchorAppBootDebug({ requestedRuntimeShell: 'default', resolvedRuntimeShell: 'default', basePath: '/' });
readiness.markAnchorAppBootMilestone('main-module-ready');
readiness.markAnchorAppBootMilestone('package-contracts-ready');
readiness.markAnchorAppBootMilestone('package-bathymetry-ready');
readiness.markAnchorAppBootMilestone('package-currents-ready');
readiness.markAnchorAppBootMilestone('app-shell-ready');
readiness.markAnchorAppBootMilestone('phaser-vendor-ready');
readiness.markAnchorAppBootMilestone('phaser-game-ready');
readiness.markAnchorAppBootMilestone('main-menu-scene-ready');
readiness.markAnchorRouteReady('productHub', { resolvedRuntimeShell: 'default', inputHandlersBound: true });

assert.equal(debug.version, readiness.ANCHOR_APP_BOOT_READINESS_VERSION, 'boot readiness version is exported');
assert.equal(debug.ready, true, 'route ready marks app ready');
assert.equal(debug.currentRoute, 'main-menu', 'productHub route aliases to main-menu');
assert.equal(debug.contractsPackageReady, true, 'contracts package flag is tracked');
assert.equal(debug.bathymetryPackageReady, true, 'bathymetry package flag is tracked');
assert.equal(debug.currentsPackageReady, true, 'currents package flag is tracked');
assert.equal(debug.inputHandlersBound, true, 'input handler readiness is tracked');
assert.equal(attrs.get('data-anchor-app-ready'), 'true', 'DOM readiness attribute is emitted');
assert.equal(attrs.get('data-anchor-route'), 'main-menu', 'DOM route attribute is emitted');
assert.equal(globalThis.__anchorBootSmokeEvent.type, 'anchor:app-ready', 'ready event is dispatched');
assert.equal(readiness.anchorAppBootSummary().route, 'main-menu', 'summary exposes route');
assert.equal(debug.packageModuleRequests.includes('currents'), true, 'package imports are summarized compactly');
assert.equal(Object.prototype.hasOwnProperty.call(debug.durations, 'totalBootMs'), true, 'duration summary is available');

globalThis.document = originalDocument;
globalThis.location = originalLocation;
globalThis.performance = originalPerformance;
globalThis.CustomEvent = originalCustomEvent;
delete globalThis.__anchorBootSmokeEvent;
delete globalThis.ANCHOR_APP_BOOT_DEBUG;

console.log('PASS smoke_anchor_app_boot_contract');