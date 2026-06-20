export const THREE_MISSION_PERFORMANCE_MONITOR_VERSION = 'three-mission-performance-monitor-r1-2a-4-2';

const DEFAULT_WINDOW_SIZE = 360;
const DEFAULT_LONG_TASK_MS = 50;

export function createThreeMissionPerformanceMonitor(options = {}) {
  const windowSize = clampInteger(options.windowSize, DEFAULT_WINDOW_SIZE, 5, 2400);
  return {
    type: 'anchor.renderer.three-mission-performance-monitor',
    version: THREE_MISSION_PERFORMANCE_MONITOR_VERSION,
    enabled: options.enabled !== false,
    windowSize,
    frameMilliseconds: new Array(windowSize),
    frameIndex: 0,
    sampleCount: 0,
    totalSampleCount: 0,
    measurementWindowStart: null,
    lastFrameTimestamp: null,
    activeFrameStart: null,
    latestRendererInfo: null,
    latestRenderWorkMilliseconds: 0,
    longTaskThresholdMilliseconds: positiveNumber(options.longTaskThresholdMilliseconds, DEFAULT_LONG_TASK_MS),
    eventCounts: {},
    eventDetails: {},
    warnings: [],
    createdAt: now()
  };
}

export function beginThreePerformanceFrame(monitor, timestamp = now()) {
  if (!monitor?.enabled) return monitor;
  const t = finiteNumber(timestamp, now());
  if (monitor.measurementWindowStart == null) monitor.measurementWindowStart = t;
  if (monitor.lastFrameTimestamp != null && Number.isFinite(Number(monitor.lastFrameTimestamp))) {
    pushFrameSample(monitor, Math.max(0, t - Number(monitor.lastFrameTimestamp)));
  }
  monitor.lastFrameTimestamp = t;
  monitor.activeFrameStart = t;
  return monitor;
}

export function endThreePerformanceFrame(monitor, timestamp = now(), rendererInfo = null) {
  if (!monitor?.enabled) return monitor;
  const t = finiteNumber(timestamp, now());
  if (Number.isFinite(Number(monitor.activeFrameStart))) {
    monitor.latestRenderWorkMilliseconds = Math.max(0, t - Number(monitor.activeFrameStart));
  }
  monitor.latestRendererInfo = normalizeRendererInfo(rendererInfo ?? monitor.latestRendererInfo);
  return monitor;
}

export function recordThreePerformanceEvent(monitor, type, details = {}) {
  if (!monitor?.enabled || !type) return monitor;
  const key = String(type);
  monitor.eventCounts[key] = Number(monitor.eventCounts[key] ?? 0) + 1;
  if (details && Object.keys(details).length) monitor.eventDetails[key] = { ...details, count: monitor.eventCounts[key] };
  return monitor;
}

export function resetThreePerformanceWindow(monitor) {
  if (!monitor) return monitor;
  monitor.frameMilliseconds = new Array(clampInteger(monitor.windowSize, DEFAULT_WINDOW_SIZE, 5, 2400));
  monitor.frameIndex = 0;
  monitor.sampleCount = 0;
  monitor.totalSampleCount = 0;
  monitor.measurementWindowStart = null;
  monitor.lastFrameTimestamp = null;
  monitor.activeFrameStart = null;
  monitor.latestRenderWorkMilliseconds = 0;
  monitor.latestRendererInfo = null;
  monitor.eventCounts = {};
  monitor.eventDetails = {};
  monitor.warnings = [];
  return monitor;
}

export function threeMissionPerformanceSummary(monitor = null) {
  if (!monitor) return inactiveSummary();
  const samples = frameSamples(monitor);
  const stats = sampleStats(samples);
  const duration = measurementDuration(monitor, samples);
  const info = normalizeRendererInfo(monitor.latestRendererInfo);
  const warnings = [...(monitor.warnings ?? [])];
  if (monitor.sampleCount >= monitor.windowSize && monitor.totalSampleCount > monitor.windowSize) warnings.push('Frame window is bounded; oldest samples were rolled off.');
  return {
    type: 'anchor.renderer.three-mission-performance-summary',
    version: THREE_MISSION_PERFORMANCE_MONITOR_VERSION,
    enabled: monitor.enabled !== false,
    status: samples.length ? 'measuring' : 'idle',
    measurementWindowStart: monitor.measurementWindowStart,
    measurementWindowDuration: duration,
    sampleCount: samples.length,
    totalSampleCount: Number(monitor.totalSampleCount ?? samples.length),
    windowSize: Number(monitor.windowSize ?? DEFAULT_WINDOW_SIZE),
    averageFrameMilliseconds: round(stats.average),
    medianFrameMilliseconds: round(stats.median),
    p95FrameMilliseconds: round(stats.p95),
    p99FrameMilliseconds: round(stats.p99),
    maximumFrameMilliseconds: round(stats.maximum),
    framesOver33Milliseconds: countOver(samples, 33.3),
    framesOver50Milliseconds: countOver(samples, 50),
    framesOver100Milliseconds: countOver(samples, 100),
    longFrameCount: countOver(samples, 50),
    longTaskCount: countOver(samples, positiveNumber(monitor.longTaskThresholdMilliseconds, DEFAULT_LONG_TASK_MS)),
    latestRenderWorkMilliseconds: round(monitor.latestRenderWorkMilliseconds),
    rendererCalls: Number(info.render.calls ?? 0),
    rendererTriangles: Number(info.render.triangles ?? 0),
    rendererLines: Number(info.render.lines ?? 0),
    rendererPoints: Number(info.render.points ?? 0),
    rendererGeometries: Number(info.memory.geometries ?? 0),
    rendererTextures: Number(info.memory.textures ?? 0),
    eventCounts: { ...(monitor.eventCounts ?? {}) },
    eventDetails: { ...(monitor.eventDetails ?? {}) },
    warnings,
    ownsPlanning: false,
    ownsSimulationState: false,
    ownsScoring: false,
    changesOfficialBrowserScoring: false,
    exposesHiddenTruth: false
  };
}

export function createThreePerformanceDebugPayload(input = {}) {
  const rendererSummary = input.rendererSummary ?? null;
  const performanceSummary = input.performanceSummary ?? rendererSummary?.performanceSummary ?? inactiveSummary();
  const counters = {
    ...(rendererSummary?.performanceCounters ?? {}),
    ...(performanceSummary.eventCounts ?? {}),
    ...(input.counters ?? {})
  };
  const camera = input.cameraControllerSummary ?? rendererSummary?.cameraController ?? {};
  const activeRendererCount = input.activeRendererCount ?? (rendererSummary && rendererSummary.disposed !== true ? 1 : 0);
  const activeRafCount = input.activeRafCount ?? (rendererSummary && rendererSummary.activeRafCount != null ? rendererSummary.activeRafCount : activeRendererCount);
  const warnings = [
    ...(performanceSummary.warnings ?? []),
    ...(rendererSummary?.objectGrowthWarnings ?? []),
    ...(input.warnings ?? [])
  ].filter(Boolean);
  const cameraGestureCount = Number(input.cameraGestureCount
    ?? counters.cameraGesture
    ?? (Number(camera.cameraOrbitChangeCount ?? 0) + Number(camera.cameraPanChangeCount ?? 0) + Number(camera.cameraZoomChangeCount ?? 0)));
  const forbiddenCameraWork = Number(input.modelBuildCountDuringCameraGesture ?? counters.modelBuildDuringCameraGesture ?? 0)
    + Number(input.predictionBuildCountDuringCameraGesture ?? counters.predictionBuildDuringCameraGesture ?? 0)
    + Number(input.textureUpdateCountDuringCameraGesture ?? counters.textureUpdateDuringCameraGesture ?? 0)
    + Number(input.panelRenderCountDuringCameraGesture ?? counters.panelRenderDuringCameraGesture ?? 0)
    + Number(input.timelineRenderCountDuringCameraGesture ?? counters.timelineRenderDuringCameraGesture ?? 0);
  const averageFrameMilliseconds = round(performanceSummary.averageFrameMilliseconds ?? 0);
  const medianFrameMilliseconds = round(performanceSummary.medianFrameMilliseconds ?? 0);
  const p95FrameMilliseconds = round(performanceSummary.p95FrameMilliseconds ?? 0);
  const p99FrameMilliseconds = round(performanceSummary.p99FrameMilliseconds ?? 0);
  const maximumFrameMilliseconds = Math.max(round(performanceSummary.maximumFrameMilliseconds ?? 0), averageFrameMilliseconds, medianFrameMilliseconds, p95FrameMilliseconds, p99FrameMilliseconds);
  const status = activeRendererCount === 0 && activeRafCount === 0
    ? 'inactive'
    : forbiddenCameraWork > 0 || warnings.some((warning) => /duplicate|stale|forbidden/i.test(String(warning)))
      ? 'warning'
      : 'ok';
  return {
    type: 'anchor.renderer.three-mission-performance-debug',
    version: THREE_MISSION_PERFORMANCE_MONITOR_VERSION,
    enabled: performanceSummary.enabled !== false,
    qualityProfile: input.qualityProfile ?? 'balanced',
    measurementWindowStart: performanceSummary.measurementWindowStart ?? null,
    measurementWindowDuration: round(performanceSummary.measurementWindowDuration ?? 0),
    sampleCount: Number(performanceSummary.sampleCount ?? 0),
    averageFrameMilliseconds,
    medianFrameMilliseconds,
    p95FrameMilliseconds,
    p99FrameMilliseconds,
    maximumFrameMilliseconds,
    framesOver33Milliseconds: Number(performanceSummary.framesOver33Milliseconds ?? 0),
    framesOver50Milliseconds: Number(performanceSummary.framesOver50Milliseconds ?? 0),
    framesOver100Milliseconds: Number(performanceSummary.framesOver100Milliseconds ?? 0),
    longFrameCount: Number(performanceSummary.longFrameCount ?? 0),
    rendererCalls: Number(rendererSummary?.rendererCalls ?? performanceSummary.rendererCalls ?? 0),
    rendererTriangles: Number(rendererSummary?.rendererTriangles ?? performanceSummary.rendererTriangles ?? 0),
    rendererLines: Number(rendererSummary?.rendererLines ?? performanceSummary.rendererLines ?? 0),
    rendererPoints: Number(rendererSummary?.rendererPoints ?? performanceSummary.rendererPoints ?? 0),
    sceneObjectCount: Number(rendererSummary?.sceneObjectCount ?? 0),
    geometryCount: Number(rendererSummary?.geometryCount ?? rendererSummary?.threeGeometryCount ?? 0),
    materialCount: Number(rendererSummary?.materialCount ?? rendererSummary?.threeMaterialCount ?? 0),
    textureCount: Number(rendererSummary?.textureCount ?? rendererSummary?.threeTextureCount ?? 0),
    labelObjectCount: Number(rendererSummary?.labelObjectCount ?? rendererSummary?.slabLabelCount ?? 0),
    currentGlyphCount: Number(rendererSummary?.currentGlyphCount ?? rendererSummary?.currentVectorGlyphCount ?? Math.floor(Number(rendererSummary?.currentVectorObjectCount ?? 0) / 2)),
    slabObjectCount: Number(rendererSummary?.slabObjectCount ?? 0),
    routeObjectCount: Number(rendererSummary?.routeObjectCount ?? 0),
    predictedDiveObjectCount: Number(rendererSummary?.predictedDiveObjectCount ?? rendererSummary?.plannedDiveTrajectorySummary?.objectCount ?? 0),
    samplingTargetObjectCount: Number(rendererSummary?.samplingTargetObjectCount ?? rendererSummary?.samplingTargetSummary?.targetObjectCount ?? 0),
    missionViewModelBuildCount: Number(input.missionViewModelBuildCount ?? counters.missionViewModelBuild ?? 0),
    predictedTrajectoryBuildCount: Number(input.predictedTrajectoryBuildCount ?? counters.predictedTrajectoryBuild ?? 0),
    predictedTrajectoryCacheHitCount: Number(input.predictedTrajectoryCacheHitCount ?? counters.predictedTrajectoryCacheHit ?? 0),
    predictedTrajectoryCacheMissCount: Number(input.predictedTrajectoryCacheMissCount ?? counters.predictedTrajectoryCacheMiss ?? 0),
    fieldTextureUpdateCount: Number(input.fieldTextureUpdateCount ?? counters.fieldTextureUpdate ?? 0),
    currentBufferUpdateCount: Number(input.currentBufferUpdateCount ?? counters.currentBufferUpdate ?? 0),
    routeGeometryUpdateCount: Number(input.routeGeometryUpdateCount ?? counters.routeGeometryUpdate ?? 0),
    samplingTargetGeometryUpdateCount: Number(input.samplingTargetGeometryUpdateCount ?? counters.samplingTargetGeometryUpdate ?? 0),
    missionConsoleRenderCount: Number(input.missionConsoleRenderCount ?? counters.missionConsoleRender ?? 0),
    rightPanelRenderCount: Number(input.rightPanelRenderCount ?? counters.rightPanelRender ?? 0),
    timelineRenderCount: Number(input.timelineRenderCount ?? counters.timelineRender ?? 0),
    activeRendererCount: Number(activeRendererCount),
    activeRafCount: Number(activeRafCount),
    cameraGestureCount,
    modelBuildCountDuringCameraGesture: Number(input.modelBuildCountDuringCameraGesture ?? counters.modelBuildDuringCameraGesture ?? 0),
    predictionBuildCountDuringCameraGesture: Number(input.predictionBuildCountDuringCameraGesture ?? counters.predictionBuildDuringCameraGesture ?? 0),
    textureUpdateCountDuringCameraGesture: Number(input.textureUpdateCountDuringCameraGesture ?? counters.textureUpdateDuringCameraGesture ?? 0),
    panelRenderCountDuringCameraGesture: Number(input.panelRenderCountDuringCameraGesture ?? counters.panelRenderDuringCameraGesture ?? 0),
    timelineRenderCountDuringCameraGesture: Number(input.timelineRenderCountDuringCameraGesture ?? counters.timelineRenderDuringCameraGesture ?? 0),
    resourceGrowthWarningCount: Number(input.resourceGrowthWarningCount ?? rendererSummary?.objectGrowthWarnings?.length ?? 0),
    duplicateRendererWarningCount: Number(input.duplicateRendererWarningCount ?? Math.max(0, Number(activeRendererCount) - 1)),
    duplicateRafWarningCount: Number(input.duplicateRafWarningCount ?? Math.max(0, Number(activeRafCount) - 1)),
    staleResourceWarningCount: Number(input.staleResourceWarningCount ?? 0),
    idleRenderRequestsPerSecond: round(input.idleRenderRequestsPerSecond ?? 0),
    activeGestureRenderRequestsPerSecond: round(input.activeGestureRenderRequestsPerSecond ?? 0),
    renderOnDemandEnabled: input.renderOnDemandEnabled === true,
    continuousAnimationReason: input.continuousAnimationReason ?? (activeRendererCount > 0 ? 'legacy-continuous-render-loop' : null),
    status,
    warnings
  };
}

export function inactiveThreePerformanceDebugPayload(patch = {}) {
  return createThreePerformanceDebugPayload({
    performanceSummary: inactiveSummary(),
    activeRendererCount: 0,
    activeRafCount: 0,
    qualityProfile: patch.qualityProfile ?? 'balanced',
    warnings: patch.warnings ?? []
  });
}

function pushFrameSample(monitor, value) {
  const sample = Math.max(0, finiteNumber(value, 0));
  monitor.frameMilliseconds[monitor.frameIndex] = sample;
  monitor.frameIndex = (monitor.frameIndex + 1) % monitor.windowSize;
  monitor.sampleCount = Math.min(monitor.windowSize, Number(monitor.sampleCount ?? 0) + 1);
  monitor.totalSampleCount = Number(monitor.totalSampleCount ?? 0) + 1;
}

function frameSamples(monitor) {
  const count = Math.min(Number(monitor.sampleCount ?? 0), Number(monitor.windowSize ?? 0));
  if (!count) return [];
  const samples = [];
  for (let offset = 0; offset < count; offset += 1) {
    const index = (monitor.frameIndex - count + offset + monitor.windowSize) % monitor.windowSize;
    const value = Number(monitor.frameMilliseconds[index]);
    if (Number.isFinite(value)) samples.push(value);
  }
  return samples;
}

function sampleStats(samples) {
  if (!samples.length) return { average: 0, median: 0, p95: 0, p99: 0, maximum: 0 };
  const sorted = [...samples].sort((a, b) => a - b);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  return {
    average: total / sorted.length,
    median: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
    maximum: sorted.at(-1) ?? 0
  };
}

function percentile(sorted, fraction) {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1));
  return sorted[index];
}

function countOver(samples, threshold) {
  return samples.filter((value) => value > threshold).length;
}

function measurementDuration(monitor, samples) {
  if (!samples.length) return 0;
  return samples.reduce((sum, value) => sum + value, 0);
}

function normalizeRendererInfo(info = null) {
  return {
    render: {
      calls: Number(info?.render?.calls ?? 0),
      triangles: Number(info?.render?.triangles ?? 0),
      lines: Number(info?.render?.lines ?? 0),
      points: Number(info?.render?.points ?? 0)
    },
    memory: {
      geometries: Number(info?.memory?.geometries ?? 0),
      textures: Number(info?.memory?.textures ?? 0)
    }
  };
}

function inactiveSummary() {
  return {
    type: 'anchor.renderer.three-mission-performance-summary',
    version: THREE_MISSION_PERFORMANCE_MONITOR_VERSION,
    enabled: false,
    status: 'inactive',
    measurementWindowStart: null,
    measurementWindowDuration: 0,
    sampleCount: 0,
    totalSampleCount: 0,
    windowSize: DEFAULT_WINDOW_SIZE,
    averageFrameMilliseconds: 0,
    medianFrameMilliseconds: 0,
    p95FrameMilliseconds: 0,
    p99FrameMilliseconds: 0,
    maximumFrameMilliseconds: 0,
    framesOver33Milliseconds: 0,
    framesOver50Milliseconds: 0,
    framesOver100Milliseconds: 0,
    longFrameCount: 0,
    longTaskCount: 0,
    rendererCalls: 0,
    rendererTriangles: 0,
    rendererLines: 0,
    rendererPoints: 0,
    rendererGeometries: 0,
    rendererTextures: 0,
    eventCounts: {},
    eventDetails: {},
    warnings: [],
    ownsPlanning: false,
    ownsSimulationState: false,
    ownsScoring: false,
    changesOfficialBrowserScoring: false,
    exposesHiddenTruth: false
  };
}

function now() {
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

function clampInteger(value, fallback, min, max) {
  const numeric = Math.round(Number(value));
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
}

function round(value, digits = 3) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Number(numeric.toFixed(digits)) : 0;
}
