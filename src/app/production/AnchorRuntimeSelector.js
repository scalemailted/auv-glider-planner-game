export const ANCHOR_RUNTIME_SELECTOR_VERSION = 'three-r3a-runtime-selector';
export const DEFAULT_ANCHOR_RUNTIME = 'phaser';
export const NEXT_ANCHOR_RUNTIME = 'next';

const VALID_RUNTIME_IDS = new Set([DEFAULT_ANCHOR_RUNTIME, NEXT_ANCHOR_RUNTIME, 'default', 'current', 'legacy']);

export function resolveAnchorProductionRuntime(locationLike = globalThis.location, storageLike = globalThis.localStorage) {
  const requestedRuntime = readRequestedRuntime(locationLike, storageLike);
  const normalized = normalizeRuntimeId(requestedRuntime);
  const fallbackReason = requestedRuntime && !VALID_RUNTIME_IDS.has(String(requestedRuntime))
    ? `Unknown runtimeShell "${String(requestedRuntime)}"; using default.`
    : null;
  return {
    type: 'anchor.runtime.selection',
    version: ANCHOR_RUNTIME_SELECTOR_VERSION,
    requestedRuntime: requestedRuntime ?? null,
    resolvedRuntime: normalized,
    defaultRuntime: DEFAULT_ANCHOR_RUNTIME,
    loadedPhaser: Boolean(globalThis.Phaser?.Game),
    instantiatedPhaser: Boolean(globalThis.__anchorPhaserApp?.phaser),
    loadedThree: false,
    fallbackReason,
    failures: []
  };
}

export function publishAnchorRuntimeSelectionDebug(selection = resolveAnchorProductionRuntime()) {
  const debug = {
    requestedRuntime: selection.requestedRuntime ?? null,
    resolvedRuntime: selection.resolvedRuntime ?? DEFAULT_ANCHOR_RUNTIME,
    defaultRuntime: selection.defaultRuntime ?? DEFAULT_ANCHOR_RUNTIME,
    loadedPhaser: Boolean(selection.loadedPhaser),
    instantiatedPhaser: Boolean(selection.instantiatedPhaser),
    loadedThree: Boolean(selection.loadedThree),
    fallbackReason: selection.fallbackReason ?? null,
    failures: Array.isArray(selection.failures) ? selection.failures : []
  };
  globalThis.ANCHOR_RUNTIME_SELECTION_DEBUG = debug;
  return debug;
}

export function markAnchorRuntimePhaserLoaded(loaded = true) {
  const debug = ensureDebug();
  debug.loadedPhaser = Boolean(loaded || globalThis.Phaser?.Game);
  return debug;
}

export function markAnchorRuntimePhaserInstantiated(instantiated = true) {
  const debug = ensureDebug();
  debug.instantiatedPhaser = Boolean(instantiated || globalThis.__anchorPhaserApp?.phaser);
  return debug;
}

export function markAnchorRuntimeThreeLoaded(loaded = true) {
  const debug = ensureDebug();
  debug.loadedThree = Boolean(loaded);
  return debug;
}

function readRequestedRuntime(locationLike, storageLike) {
  let queryRuntime = null;
  try {
    const search = String(locationLike?.search ?? '');
    const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
    queryRuntime = params.get('runtimeShell') ?? params.get('runtime');
  } catch {
    queryRuntime = null;
  }
  if (queryRuntime) return queryRuntime;
  try {
    return storageLike?.getItem?.('ANCHOR_RUNTIME_SHELL') ?? null;
  } catch {
    return null;
  }
}

function normalizeRuntimeId(value) {
  const normalized = String(value ?? '').trim();
  if (normalized === NEXT_ANCHOR_RUNTIME) return NEXT_ANCHOR_RUNTIME;
  return DEFAULT_ANCHOR_RUNTIME;
}

function ensureDebug() {
  if (!globalThis.ANCHOR_RUNTIME_SELECTION_DEBUG) {
    return publishAnchorRuntimeSelectionDebug(resolveAnchorProductionRuntime());
  }
  return globalThis.ANCHOR_RUNTIME_SELECTION_DEBUG;
}
