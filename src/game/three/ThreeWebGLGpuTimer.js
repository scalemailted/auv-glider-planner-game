export const THREE_WEBGL_GPU_TIMER_VERSION = 'three-webgl-gpu-timer-r1-2a-4-4';

const DEFAULT_MAX_PENDING_QUERIES = 8;
const NS_TO_MS = 1 / 1_000_000;

export function createThreeWebGLGpuTimer(gl = null, options = {}) {
  const maxPendingQueries = clampInteger(options.maxPendingQueries, DEFAULT_MAX_PENDING_QUERIES, 1, 32);
  const extension = gl?.getExtension?.('EXT_disjoint_timer_query_webgl2') ?? null;
  const supported = Boolean(gl && extension && typeof gl.createQuery === 'function');
  return {
    type: 'anchor.renderer.three-webgl-gpu-timer',
    version: THREE_WEBGL_GPU_TIMER_VERSION,
    gl,
    extension,
    supported,
    maxPendingQueries,
    activeQuery: null,
    pendingQueries: [],
    samplesMilliseconds: [],
    pendingQueryCount: 0,
    resolvedQueryCount: 0,
    disjointCount: 0,
    droppedQueryCount: 0,
    disposed: false,
    ownsPlanning: false,
    ownsSimulationState: false,
    ownsScoring: false,
    changesOfficialBrowserScoring: false,
    usesBlockingReadback: false
  };
}

export function beginThreeGpuTimerQuery(timer) {
  if (!timer?.supported || timer.disposed || timer.activeQuery) return false;
  pollThreeGpuTimer(timer);
  if (timer.pendingQueries.length >= timer.maxPendingQueries) {
    timer.droppedQueryCount += 1;
    return false;
  }
  const gl = timer.gl;
  const query = gl.createQuery?.();
  if (!query) return false;
  gl.beginQuery?.(timer.extension.TIME_ELAPSED_EXT, query);
  timer.activeQuery = query;
  return true;
}

export function endThreeGpuTimerQuery(timer) {
  if (!timer?.supported || timer.disposed || !timer.activeQuery) return false;
  timer.gl.endQuery?.(timer.extension.TIME_ELAPSED_EXT);
  timer.pendingQueries.push(timer.activeQuery);
  timer.pendingQueryCount = timer.pendingQueries.length;
  timer.activeQuery = null;
  pollThreeGpuTimer(timer);
  return true;
}

export function pollThreeGpuTimer(timer) {
  if (!timer?.supported || timer.disposed) return timer;
  const gl = timer.gl;
  const ext = timer.extension;
  const disjoint = Boolean(gl.getParameter?.(ext.GPU_DISJOINT_EXT));
  const remaining = [];
  for (const query of timer.pendingQueries) {
    const available = Boolean(gl.getQueryParameter?.(query, gl.QUERY_RESULT_AVAILABLE));
    if (!available) {
      remaining.push(query);
      continue;
    }
    if (disjoint) {
      timer.disjointCount += 1;
      gl.deleteQuery?.(query);
      continue;
    }
    const nanoseconds = Number(gl.getQueryParameter?.(query, gl.QUERY_RESULT));
    if (Number.isFinite(nanoseconds)) {
      timer.samplesMilliseconds.push(Math.max(0, nanoseconds * NS_TO_MS));
      if (timer.samplesMilliseconds.length > 120) timer.samplesMilliseconds.splice(0, timer.samplesMilliseconds.length - 120);
      timer.resolvedQueryCount += 1;
    }
    gl.deleteQuery?.(query);
  }
  timer.pendingQueries = remaining;
  timer.pendingQueryCount = remaining.length;
  return timer;
}

export function disposeThreeGpuTimer(timer) {
  if (!timer || timer.disposed) return timer;
  timer.disposed = true;
  const gl = timer.gl;
  if (timer.activeQuery) gl?.deleteQuery?.(timer.activeQuery);
  for (const query of timer.pendingQueries ?? []) gl?.deleteQuery?.(query);
  timer.activeQuery = null;
  timer.pendingQueries = [];
  timer.pendingQueryCount = 0;
  return timer;
}

export function threeGpuTimerSummary(timer = null) {
  if (!timer) return inactiveSummary();
  pollThreeGpuTimer(timer);
  const stats = sampleStats(timer.samplesMilliseconds ?? []);
  return {
    type: 'anchor.renderer.three-webgl-gpu-timer-summary',
    version: THREE_WEBGL_GPU_TIMER_VERSION,
    gpuTimingSupported: timer.supported === true,
    gpuPendingQueryCount: Number(timer.pendingQueryCount ?? timer.pendingQueries?.length ?? 0),
    gpuResolvedQueryCount: Number(timer.resolvedQueryCount ?? 0),
    gpuDisjointCount: Number(timer.disjointCount ?? 0),
    gpuDroppedQueryCount: Number(timer.droppedQueryCount ?? 0),
    gpuAverageMilliseconds: timer.supported ? round(stats.average) : null,
    gpuP95Milliseconds: timer.supported ? round(stats.p95) : null,
    sampleCount: timer.samplesMilliseconds?.length ?? 0,
    disposed: timer.disposed === true,
    usesBlockingReadback: false,
    ownsPlanning: false,
    ownsSimulationState: false,
    ownsScoring: false
  };
}

function inactiveSummary() {
  return {
    type: 'anchor.renderer.three-webgl-gpu-timer-summary',
    version: THREE_WEBGL_GPU_TIMER_VERSION,
    gpuTimingSupported: false,
    gpuPendingQueryCount: 0,
    gpuResolvedQueryCount: 0,
    gpuDisjointCount: 0,
    gpuDroppedQueryCount: 0,
    gpuAverageMilliseconds: null,
    gpuP95Milliseconds: null,
    sampleCount: 0,
    disposed: true,
    usesBlockingReadback: false,
    ownsPlanning: false,
    ownsSimulationState: false,
    ownsScoring: false
  };
}

function sampleStats(samples) {
  if (!samples.length) return { average: 0, p95: 0 };
  const sorted = [...samples].sort((a, b) => a - b);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  return { average: total / sorted.length, p95: sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * 0.95) - 1))] ?? 0 };
}

function clampInteger(value, fallback, min, max) {
  const numeric = Math.round(Number(value));
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
}

function round(value, digits = 3) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Number(numeric.toFixed(digits)) : 0;
}
