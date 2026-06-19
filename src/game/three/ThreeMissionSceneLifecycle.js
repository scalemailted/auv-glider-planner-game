export const THREE_MISSION_SCENE_LIFECYCLE_VERSION = 'three-mission-scene-lifecycle-r1-1e';

const RESOURCE_KINDS = new Set([
  'renderer',
  'animationFrame',
  'cameraController',
  'interactionController',
  'resizeObserver',
  'eventListener',
  'DOM overlay',
  'canvas',
  'timer',
  'subscription',
  'debugHandle'
]);

export function createThreeMissionSceneLifecycle(options = {}) {
  return {
    type: 'anchor.renderer.three-mission-scene-lifecycle',
    version: THREE_MISSION_SCENE_LIFECYCLE_VERSION,
    sceneKey: options.sceneKey ?? 'unknown',
    resources: [],
    disposed: false,
    disposeReason: null,
    duplicateRegistrationCount: 0,
    disposeErrorCount: 0,
    disposedCounts: {},
    registeredAt: Date.now?.() ?? 0
  };
}

export function registerThreeMissionSceneResource(lifecycle, kind, resource) {
  if (!lifecycle || resource == null) return lifecycle;
  const normalizedKind = RESOURCE_KINDS.has(kind) ? kind : String(kind ?? 'subscription');
  const exists = lifecycle.resources.some((entry) => entry.resource === resource || (entry.resource?.id && entry.resource.id === resource?.id && entry.kind === normalizedKind));
  if (exists) {
    lifecycle.duplicateRegistrationCount = Number(lifecycle.duplicateRegistrationCount ?? 0) + 1;
    return lifecycle;
  }
  lifecycle.resources.push({ kind: normalizedKind, resource, disposed: false });
  return lifecycle;
}

export function disposeThreeMissionSceneLifecycle(lifecycle, reason = 'dispose') {
  if (!lifecycle) return null;
  lifecycle.resources = Array.isArray(lifecycle.resources) ? lifecycle.resources : [];
  lifecycle.disposedCounts ??= {};
  if (lifecycle.disposed) return lifecycle;
  lifecycle.disposed = true;
  lifecycle.disposeReason = reason;
  for (let index = lifecycle.resources.length - 1; index >= 0; index -= 1) {
    const entry = lifecycle.resources[index];
    if (!entry || entry.disposed) continue;
    try {
      disposeResource(entry.kind, entry.resource);
      entry.disposed = true;
      lifecycle.disposedCounts[entry.kind] = Number(lifecycle.disposedCounts[entry.kind] ?? 0) + 1;
    } catch (error) {
      entry.error = String(error?.message ?? error);
      lifecycle.disposeErrorCount = Number(lifecycle.disposeErrorCount ?? 0) + 1;
    }
  }
  return lifecycle;
}

export function threeMissionSceneLifecycleSummary(lifecycle = null) {
  if (!lifecycle) return inactiveLifecycleSummary();
  const resources = Array.isArray(lifecycle.resources) ? lifecycle.resources : [];
  const counts = {};
  const disposedCounts = {};
  for (const entry of resources) {
    if (!entry) continue;
    counts[entry.kind] = Number(counts[entry.kind] ?? 0) + 1;
    if (entry.disposed) disposedCounts[entry.kind] = Number(disposedCounts[entry.kind] ?? 0) + 1;
  }
  const mergedDisposedCounts = { ...disposedCounts, ...(lifecycle.disposedCounts ?? {}) };
  const disposedResourceCount = resources.filter((entry) => entry?.disposed).length;
  const activeResourceCount = Math.max(0, resources.length - disposedResourceCount);
  return {
    type: 'anchor.renderer.three-mission-scene-lifecycle-summary',
    version: THREE_MISSION_SCENE_LIFECYCLE_VERSION,
    status: lifecycle.disposed === true ? 'disposed' : 'active',
    sceneKey: lifecycle.sceneKey ?? 'unknown',
    disposed: lifecycle.disposed === true,
    disposeReason: lifecycle.disposeReason ?? null,
    resourceCount: resources.length,
    registeredResourceCount: resources.length,
    activeResourceCount,
    disposedResourceCount,
    counts,
    disposedCounts: mergedDisposedCounts,
    duplicateRegistrationCount: Number(lifecycle.duplicateRegistrationCount ?? 0),
    disposeErrorCount: Number(lifecycle.disposeErrorCount ?? 0),
    warnings: []
  };
}

function inactiveLifecycleSummary() {
  return {
    type: 'anchor.renderer.three-mission-scene-lifecycle-summary',
    version: THREE_MISSION_SCENE_LIFECYCLE_VERSION,
    status: 'inactive',
    sceneKey: 'unknown',
    disposed: true,
    disposeReason: null,
    resourceCount: 0,
    registeredResourceCount: 0,
    activeResourceCount: 0,
    disposedResourceCount: 0,
    counts: {},
    disposedCounts: {},
    duplicateRegistrationCount: 0,
    disposeErrorCount: 0,
    warnings: []
  };
}

function disposeResource(kind, resource) {
  if (resource == null) return;
  if (kind === 'animationFrame') {
    const id = typeof resource === 'number' ? resource : resource.id ?? resource.animationFrame;
    if (id != null) globalThis.cancelAnimationFrame?.(id);
    return;
  }
  if (kind === 'eventListener') {
    resource.target?.removeEventListener?.(resource.type, resource.listener, resource.options);
    return;
  }
  if (kind === 'resizeObserver') {
    resource.disconnect?.();
    return;
  }
  if (kind === 'DOM overlay' || kind === 'canvas') {
    resource.remove?.();
    return;
  }
  if (kind === 'timer') {
    if (typeof resource === 'number') {
      globalThis.clearTimeout?.(resource);
      globalThis.clearInterval?.(resource);
      return;
    }
    resource.remove?.();
    resource.destroy?.();
    resource.cancel?.();
    resource.clear?.();
    return;
  }
  resource.dispose?.();
  resource.destroy?.();
  resource.clear?.();
  resource.remove?.();
}
