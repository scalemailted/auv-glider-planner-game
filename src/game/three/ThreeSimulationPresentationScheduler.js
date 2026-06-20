export const THREE_SIMULATION_PRESENTATION_SCHEDULER_VERSION = 'three-simulation-presentation-scheduler-r1-2a-4-3';

export const SIMULATION_PRESENTATION_DIRTY_CATEGORIES = Object.freeze([
  'vehiclePose',
  'simulationStatus',
  'realizedTrajectory',
  'observations',
  'surfacingEvents',
  'routeStatus',
  'plannedRoute',
  'samplingTargets',
  'scalarField',
  'currentVectors',
  'waterColumn',
  'bathymetry',
  'selection',
  'labels',
  'hud',
  'rightPanel',
  'timeline',
  'performanceDebug'
]);

const DIRTY_SET = new Set(SIMULATION_PRESENTATION_DIRTY_CATEGORIES);
const DEFAULT_MAX_HZ = 30;

export function createThreeSimulationPresentationScheduler(options = {}) {
  const now = typeof options.now === 'function' ? options.now : defaultNow;
  const maxHz = positiveNumber(options.maxHz, DEFAULT_MAX_HZ);
  return {
    type: 'anchor.renderer.three-simulation-presentation-scheduler',
    version: THREE_SIMULATION_PRESENTATION_SCHEDULER_VERSION,
    ownsSimulationState: false,
    ownsScoring: false,
    ownsPlanning: false,
    disposed: false,
    paused: options.paused === true,
    pending: false,
    latestSnapshot: null,
    dirtyCategories: new Set(),
    reasons: [],
    lastConsumeTimestamp: null,
    minFrameIntervalMilliseconds: 1000 / maxHz,
    maxHz,
    now,
    counters: {
      engineStepCount: 0,
      snapshotPublishCount: 0,
      presentationRequestCount: 0,
      coalescedPresentationRequestCount: 0,
      presentationFrameCount: 0,
      skippedWhilePausedCount: 0,
      disposedRequestCount: 0,
      latestSnapshotSequence: 0
    }
  };
}

export function publishSimulationPresentationSnapshot(scheduler, snapshot = {}, options = {}) {
  if (!scheduler || scheduler.disposed) return scheduler;
  scheduler.latestSnapshot = {
    ...(snapshot ?? {}),
    sequence: Number(snapshot?.sequence ?? scheduler.counters.latestSnapshotSequence + 1)
  };
  scheduler.counters.latestSnapshotSequence = scheduler.latestSnapshot.sequence;
  scheduler.counters.snapshotPublishCount += 1;
  if (Number.isFinite(Number(options.engineStepCount))) scheduler.counters.engineStepCount = Number(options.engineStepCount);
  return scheduler;
}

export function markSimulationPresentationDirty(scheduler, categories = [], reason = 'dirty') {
  if (!scheduler) return scheduler;
  if (scheduler.disposed) {
    scheduler.counters.disposedRequestCount += 1;
    return scheduler;
  }
  const normalized = normalizeCategories(categories);
  if (!normalized.length) normalized.push('performanceDebug');
  if (scheduler.pending) scheduler.counters.coalescedPresentationRequestCount += 1;
  scheduler.counters.presentationRequestCount += 1;
  scheduler.pending = true;
  for (const category of normalized) scheduler.dirtyCategories.add(category);
  if (reason) {
    scheduler.reasons.push(String(reason));
    if (scheduler.reasons.length > 12) scheduler.reasons.splice(0, scheduler.reasons.length - 12);
  }
  return scheduler;
}

export function scheduleSimulationPresentationFrame(scheduler) {
  if (!scheduler || scheduler.disposed || scheduler.paused || !scheduler.pending) return false;
  return true;
}

export function consumeSimulationPresentationFrame(scheduler, timestamp = scheduler?.now?.() ?? defaultNow(), options = {}) {
  if (!scheduler || scheduler.disposed) return emptyFrame('disposed');
  if (scheduler.paused && options.force !== true) {
    scheduler.counters.skippedWhilePausedCount += scheduler.pending ? 1 : 0;
    return emptyFrame('paused');
  }
  if (!scheduler.pending && options.force !== true) return emptyFrame('clean');
  const t = finiteNumber(timestamp, scheduler.now?.() ?? defaultNow());
  const sinceLast = scheduler.lastConsumeTimestamp == null ? Infinity : t - scheduler.lastConsumeTimestamp;
  if (options.force !== true && sinceLast < scheduler.minFrameIntervalMilliseconds) return emptyFrame('cadence');
  const dirtyCategories = [...scheduler.dirtyCategories];
  scheduler.dirtyCategories.clear();
  scheduler.pending = false;
  scheduler.lastConsumeTimestamp = t;
  scheduler.counters.presentationFrameCount += 1;
  return {
    shouldPresent: true,
    reason: 'present',
    timestamp: t,
    snapshot: scheduler.latestSnapshot,
    dirtyCategories,
    reasons: [...scheduler.reasons],
    counters: { ...scheduler.counters }
  };
}

export function pauseSimulationPresentationScheduler(scheduler) {
  if (scheduler && !scheduler.disposed) scheduler.paused = true;
  return scheduler;
}

export function resumeSimulationPresentationScheduler(scheduler) {
  if (scheduler && !scheduler.disposed) scheduler.paused = false;
  return scheduler;
}

export function disposeSimulationPresentationScheduler(scheduler) {
  if (!scheduler || scheduler.disposed) return scheduler;
  scheduler.disposed = true;
  scheduler.pending = false;
  scheduler.dirtyCategories.clear();
  scheduler.latestSnapshot = null;
  return scheduler;
}

export function threeSimulationPresentationSchedulerSummary(scheduler) {
  if (!scheduler) return { type: 'anchor.renderer.three-simulation-presentation-scheduler-summary', version: THREE_SIMULATION_PRESENTATION_SCHEDULER_VERSION, status: 'inactive' };
  return {
    type: 'anchor.renderer.three-simulation-presentation-scheduler-summary',
    version: THREE_SIMULATION_PRESENTATION_SCHEDULER_VERSION,
    status: scheduler.disposed ? 'disposed' : scheduler.paused ? 'paused' : scheduler.pending ? 'pending' : 'idle',
    ownsSimulationState: false,
    ownsScoring: false,
    ownsPlanning: false,
    maxHz: scheduler.maxHz,
    minFrameIntervalMilliseconds: round(scheduler.minFrameIntervalMilliseconds),
    pending: scheduler.pending === true,
    dirtyCategories: [...(scheduler.dirtyCategories ?? [])],
    latestSnapshotSequence: Number(scheduler.counters?.latestSnapshotSequence ?? 0),
    engineStepCount: Number(scheduler.counters?.engineStepCount ?? 0),
    snapshotPublishCount: Number(scheduler.counters?.snapshotPublishCount ?? 0),
    presentationRequestCount: Number(scheduler.counters?.presentationRequestCount ?? 0),
    coalescedPresentationRequestCount: Number(scheduler.counters?.coalescedPresentationRequestCount ?? 0),
    presentationFrameCount: Number(scheduler.counters?.presentationFrameCount ?? 0),
    skippedWhilePausedCount: Number(scheduler.counters?.skippedWhilePausedCount ?? 0),
    disposedRequestCount: Number(scheduler.counters?.disposedRequestCount ?? 0),
    reasons: [...(scheduler.reasons ?? [])]
  };
}

export function dirtyCategoriesForSimulationPresentationEvent(kind, options = {}) {
  switch (kind) {
    case 'motionSnapshot':
      return ['vehiclePose', 'simulationStatus', ...(options.newTrajectoryPoint ? ['realizedTrajectory'] : []), ...(options.routeStatusChanged ? ['routeStatus'] : []), ...(options.includeHud ? ['hud'] : [])];
    case 'observation':
      return ['observations', 'hud', 'rightPanel'];
    case 'surfacing':
      return ['surfacingEvents', 'routeStatus', 'hud', 'rightPanel', 'timeline'];
    case 'scalarFieldFrame':
      return ['scalarField'];
    case 'currentFieldFrame':
      return ['currentVectors'];
    case 'cameraOnly':
      return [];
    case 'selection':
      return ['selection', 'rightPanel'];
    case 'plannedRoute':
      return ['plannedRoute', 'samplingTargets', 'labels', 'rightPanel', 'timeline'];
    case 'waterColumn':
      return ['waterColumn', 'scalarField', 'currentVectors', 'labels'];
    case 'terminal':
      return ['vehiclePose', 'simulationStatus', 'realizedTrajectory', 'observations', 'surfacingEvents', 'routeStatus', 'hud', 'rightPanel', 'timeline', 'performanceDebug'];
    default:
      return ['performanceDebug'];
  }
}

function normalizeCategories(categories) {
  const list = Array.isArray(categories) ? categories : [categories];
  return [...new Set(list.map((item) => String(item ?? '').trim()).filter((item) => DIRTY_SET.has(item)))];
}

function emptyFrame(reason) {
  return { shouldPresent: false, reason, timestamp: null, snapshot: null, dirtyCategories: [], reasons: [], counters: {} };
}

function defaultNow() {
  return globalThis.performance?.now?.() ?? Date.now?.() ?? 0;
}

function finiteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function positiveNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function round(value, digits = 3) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Number(numeric.toFixed(digits)) : 0;
}
