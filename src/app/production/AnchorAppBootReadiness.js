export const ANCHOR_APP_BOOT_READINESS_VERSION = 'flow-pkg-r1-1-app-boot-readiness';

const ROUTE_ALIASES = new Map([
  ['mainMenu', 'main-menu'],
  ['main-menu', 'main-menu'],
  ['productHub', 'main-menu'],
  ['home', 'main-menu'],
  ['missionSetup', 'mission-setup'],
  ['missionBriefing', 'mission-briefing'],
  ['missionPlanning', 'mission-planning'],
  ['missionSimulation', 'mission-simulation'],
  ['missionDebrief', 'mission-debrief'],
  ['missionReplayReview', 'mission-replay-review'],
  ['missionEditor', 'mission-editor'],
  ['headlessBundleViewer', 'headless-bundle-viewer']
]);

const STAGE_FLAGS = Object.freeze({
  'index-ready': 'indexReady',
  'main-module-ready': 'mainModuleReady',
  'package-contracts-ready': 'contractsPackageReady',
  'package-bathymetry-ready': 'bathymetryPackageReady',
  'package-currents-ready': 'currentsPackageReady',
  'app-shell-ready': 'appConstructed',
  'phaser-vendor-ready': 'phaserAvailable',
  'phaser-game-ready': 'phaserGameCreated',
  'main-menu-scene-ready': 'mainMenuSceneStarted',
  'main-menu-dom-ready': 'mainMenuDomCommitted',
  'input-handlers-bound': 'inputHandlersBound',
  'app-ready': 'ready'
});

export function initializeAnchorAppBootDebug(options = {}) {
  const existing = globalThis.ANCHOR_APP_BOOT_DEBUG ?? null;
  const now = nowMs();
  const debug = {
    version: ANCHOR_APP_BOOT_READINESS_VERSION,
    requestedRuntimeShell: options.requestedRuntimeShell ?? null,
    resolvedRuntimeShell: options.resolvedRuntimeShell ?? null,
    sourceMode: options.sourceMode ?? 'browser-esm',
    basePath: options.basePath ?? basePathFromLocation(),
    startedAtMs: now,
    indexReady: globalThis.document?.readyState !== 'loading',
    mainModuleReady: false,
    contractsPackageReady: false,
    bathymetryPackageReady: false,
    currentsPackageReady: false,
    appConstructed: false,
    phaserAvailable: false,
    phaserGameCreated: false,
    mainMenuSceneStarted: false,
    mainMenuDomCommitted: false,
    inputHandlersBound: false,
    ready: false,
    currentRoute: null,
    visibleRoute: null,
    milestones: [],
    durations: {},
    packageModuleRequests: [],
    bootAttemptCount: Number(existing?.bootAttemptCount ?? 0) + 1,
    duplicateBootCount: Number(existing?.duplicateBootCount ?? 0) + (existing ? 1 : 0),
    lastFailureStage: null,
    lastFailure: null,
    warnings: []
  };
  globalThis.ANCHOR_APP_BOOT_DEBUG = debug;
  markAnchorAppBootMilestone('bootstrap-start');
  if (debug.indexReady) markAnchorAppBootMilestone('index-ready', { documentReadyState: globalThis.document?.readyState ?? null });
  return debug;
}

export function markAnchorAppBootMilestone(stage, details = {}) {
  const debug = ensureBootDebug();
  const timestampMs = nowMs();
  const elapsedMs = roundMs(timestampMs - Number(debug.startedAtMs ?? timestampMs));
  const normalizedStage = String(stage ?? 'unknown');
  const flag = STAGE_FLAGS[normalizedStage];
  if (flag) debug[flag] = true;
  if (normalizedStage.startsWith('package-')) {
    const packageId = normalizedStage.replace(/^package-/, '').replace(/-ready$/, '');
    if (!debug.packageModuleRequests.includes(packageId)) debug.packageModuleRequests.push(packageId);
  }
  debug.milestones.push({ stage: normalizedStage, timestampMs: roundMs(timestampMs), elapsedMs, ...compactDetails(details) });
  recomputeDurations(debug);
  publishDomReadiness(debug);
  return debug;
}

export function markAnchorAppBootFailure(stage, error) {
  const debug = ensureBootDebug();
  debug.lastFailureStage = String(stage ?? 'unknown');
  debug.lastFailure = String(error?.message ?? error ?? 'unknown boot failure');
  debug.ready = false;
  debug.milestones.push({ stage: 'boot-failure', failedStage: debug.lastFailureStage, message: debug.lastFailure, timestampMs: roundMs(nowMs()) });
  publishDomReadiness(debug);
  return debug;
}

export function markAnchorRouteReady(routeId, options = {}) {
  const debug = ensureBootDebug();
  const route = normalizeAnchorRouteId(routeId);
  debug.currentRoute = route;
  debug.visibleRoute = route;
  if (options.resolvedRuntimeShell) debug.resolvedRuntimeShell = options.resolvedRuntimeShell;
  if (route === 'main-menu') {
    markAnchorAppBootMilestone('main-menu-dom-ready', options);
    markAnchorAppBootMilestone('input-handlers-bound', options);
  }
  if (options.ready !== false) markAnchorAppBootMilestone('app-ready', { route });
  debug.ready = true;
  publishDomReadiness(debug);
  dispatchReadyEvent(debug);
  return debug;
}

export function normalizeAnchorRouteId(routeId) {
  const raw = String(routeId ?? '').trim();
  return ROUTE_ALIASES.get(raw) ?? (raw.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`).replace(/^-/, '') || null);
}

export function anchorAppBootSummary() {
  const debug = ensureBootDebug();
  return {
    version: debug.version,
    ready: debug.ready === true,
    route: debug.currentRoute,
    resolvedRuntimeShell: debug.resolvedRuntimeShell,
    bootAttemptCount: debug.bootAttemptCount,
    duplicateBootCount: debug.duplicateBootCount,
    lastStage: debug.milestones.at?.(-1)?.stage ?? null,
    lastFailureStage: debug.lastFailureStage,
    lastFailure: debug.lastFailure,
    durations: { ...debug.durations }
  };
}

function ensureBootDebug() {
  if (!globalThis.ANCHOR_APP_BOOT_DEBUG) return initializeAnchorAppBootDebug();
  return globalThis.ANCHOR_APP_BOOT_DEBUG;
}

function recomputeDurations(debug) {
  const first = new Map();
  for (const milestone of debug.milestones) {
    if (!first.has(milestone.stage)) first.set(milestone.stage, Number(milestone.elapsedMs ?? 0));
  }
  const duration = (from, to) => first.has(from) && first.has(to) ? roundMs(first.get(to) - first.get(from)) : null;
  debug.durations = {
    indexToMainModuleMs: duration('index-ready', 'main-module-ready'),
    mainModuleToAppMs: duration('main-module-ready', 'app-shell-ready'),
    appToPhaserMs: duration('app-shell-ready', 'phaser-game-ready'),
    phaserToMainMenuMs: duration('phaser-game-ready', 'main-menu-dom-ready'),
    totalBootMs: first.has('app-ready') ? first.get('app-ready') : null
  };
}

function publishDomReadiness(debug) {
  const route = debug.currentRoute ?? '';
  for (const element of [globalThis.document?.body, globalThis.document?.getElementById?.('game-root'), globalThis.document?.getElementById?.('modal-root')]) {
    if (!element?.setAttribute) continue;
    element.setAttribute('data-anchor-app-ready', debug.ready === true ? 'true' : 'false');
    if (route) element.setAttribute('data-anchor-route', route);
  }
}

function dispatchReadyEvent(debug) {
  if (!globalThis.document?.dispatchEvent || debug.__readyEventDispatched === true) return;
  debug.__readyEventDispatched = true;
  globalThis.document.dispatchEvent(new CustomEvent('anchor:app-ready', { detail: anchorAppBootSummary() }));
}

function basePathFromLocation() {
  const pathname = globalThis.location?.pathname ?? '/';
  return pathname.replace(/[^/]*$/, '') || '/';
}

function compactDetails(details) {
  const output = {};
  for (const [key, value] of Object.entries(details ?? {})) {
    if (value == null) output[key] = value;
    else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') output[key] = value;
  }
  return output;
}

function nowMs() {
  return Number(globalThis.performance?.now?.() ?? Date.now());
}

function roundMs(value) {
  return Math.round(Number(value ?? 0) * 1000) / 1000;
}
