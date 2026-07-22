 const SIMULATION_LAUNCH_PROFILER_VERSION = 'simulation-launch-profiler-flow-r2a-1';

 const SIMULATION_LAUNCH_STAGES = Object.freeze([
  'prepareLaunchSnapshot',
  'validateLaunchSnapshot',
  'constructSimulationEngine',
  'constructTruthWorld',
  'resolveCurrentSource',
  'normalizeCurrentCube',
  'createCurrentSampler',
  'initializeAgents',
  'buildInitialSimulationState',
  'buildSimulationRenderViewModel',
  'createThreeRenderer',
  'createTerrainLayers',
  'createWaterColumnLayers',
  'createCurrentGlyphLayer',
  'uploadCurrentBuffers',
  'firstRenderSubmission',
  'bindSimulationControls',
  'interactive'
]);

const COUNTER_KEYS = Object.freeze([
  'environmentArtifactBuildCount',
  'environmentSamplerCreateCount',
  'environmentValidationCount',
  'currentCubeBuildCount',
  'currentCubeNormalizeCount',
  'currentCubeDigestCount',
  'currentSamplerCreateCount',
  'currentSampleCallCount',
  'currentViewModelBuildCount',
  'currentGlyphLayerBuildCount',
  'currentGlyphBufferAllocationCount',
  'currentGlyphBufferUpdateCount',
  'renderSubmissionCount'
]);

let activeProfiler = null;
let fallbackProfiler = null;

 function createSimulationLaunchProfiler(options = {}) {
  const now = timeNow();
  const profiler = {
    type: 'anchor.runtime.simulation-launch-profiler',
    version: SIMULATION_LAUNCH_PROFILER_VERSION,
    status: 'initializing',
    lastCompletedStage: null,
    activeStage: null,
    launchStartedAt: now,
    interactiveAt: null,
    totalLaunchDurationMs: null,
    stageStartedAt: {},
    stageDurationsMs: {},
    mainThreadHeartbeatCount: 0,
    maximumHeartbeatGapMs: 0,
    longTaskCount: 0,
    maximumObservedTaskMs: 0,
    missionId: options.missionId ?? options.mission?.id ?? options.mission?.missionId ?? null,
    scenarioId: options.scenarioId ?? options.level?.id ?? options.level?.levelId ?? null,
    agentCount: Number(options.agentCount ?? options.mission?.agents?.length ?? 0),
    currentFieldId: null,
    currentFieldDigest: null,
    currentEastCount: 0,
    currentNorthCount: 0,
    currentDepthCount: 0,
    currentTimeCount: 0,
    currentScalarCount: 0,
    environmentPackageVersion: options.level?.meta?.environmentPackageVersion ?? options.level?.environmentArtifactSummary?.environmentPackageVersion ?? null,
    environmentManifestDigest: options.level?.meta?.environmentManifestDigest ?? options.level?.environmentArtifactSummary?.manifestDigest ?? null,
    environmentArtifactDigest: options.level?.meta?.environmentArtifactDigest ?? options.level?.environmentArtifactSummary?.artifactDigest ?? null,
    bathymetryArtifactDigest: options.level?.meta?.environmentComponentDigests?.bathymetryArtifactDigest ?? options.level?.environmentArtifactSummary?.componentDigests?.bathymetryArtifactDigest ?? null,
    currentArtifactDigests: options.level?.meta?.environmentComponentDigests?.currentFieldDigests ?? options.level?.environmentArtifactSummary?.componentDigests?.currentFieldDigests ?? {},
    scalarArtifactDigests: options.level?.meta?.environmentComponentDigests?.scalarFieldDigests ?? options.level?.environmentArtifactSummary?.componentDigests?.scalarFieldDigests ?? {},
    fieldRoleSummary: options.level?.meta?.environmentFieldRoleSummary ?? options.level?.environmentArtifactSummary?.fieldRoleSummary ?? [],
    environmentValidationSummary: options.level?.meta?.environmentValidationSummary ?? options.level?.environmentArtifactSummary?.validationSummary ?? null,
    environmentArtifactBuildCount: 0,
    environmentSamplerCreateCount: 0,
    environmentValidationCount: 0,
    currentCubeBuildCount: 0,
    currentCubeNormalizeCount: 0,
    currentCubeDigestCount: 0,
    currentSamplerCreateCount: 0,
    currentSampleCallCount: 0,
    currentViewModelBuildCount: 0,
    currentGlyphLayerBuildCount: 0,
    currentGlyphBufferAllocationCount: 0,
    currentGlyphBufferUpdateCount: 0,
    activeRendererCount: 0,
    activeRafCount: 0,
    renderSubmissionCount: 0,
    estimatedCurrentBytes: 0,
    estimatedRenderBufferBytes: 0,
    degradedPresentation: false,
    launchAbortedCleanly: false,
    safeCurrentDisplayMode: options.safeCurrentDisplayMode === true,
    warnings: [],
    failures: [],
    heartbeatTimer: null,
    heartbeatLastAt: now
  };
  for (const stage of SIMULATION_LAUNCH_STAGES) profiler.stageDurationsMs[stage] = null;
  return profiler;
}

 function startSimulationLaunchProfiler(options = {}) {
  stopHeartbeat(activeProfiler);
  activeProfiler = createSimulationLaunchProfiler(options);
  startHeartbeat(activeProfiler);
  publishSimulationLaunchDebug(activeProfiler);
  return activeProfiler;
}

 function getActiveSimulationLaunchProfiler() {
  if (activeProfiler) return activeProfiler;
  fallbackProfiler ??= createSimulationLaunchProfiler({});
  return fallbackProfiler;
}

 function resetSimulationLaunchProfiler() {
  stopHeartbeat(activeProfiler);
  activeProfiler = null;
  fallbackProfiler = null;
  publishSimulationLaunchDebug(null);
}

 function markSimulationLaunchStage(stage, patch = {}) {
  const profiler = getActiveSimulationLaunchProfiler();
  const id = normalizeStage(stage);
  const now = timeNow();
  if (profiler.activeStage && profiler.activeStage !== id) completeStage(profiler, profiler.activeStage, now);
  profiler.activeStage = id;
  profiler.stageStartedAt[id] = now;
  Object.assign(profiler, compactPatch(patch));
  publishSimulationLaunchDebug(profiler);
  return profiler;
}

 function completeSimulationLaunchStage(stage, patch = {}) {
  const profiler = getActiveSimulationLaunchProfiler();
  const now = timeNow();
  completeStage(profiler, normalizeStage(stage), now);
  Object.assign(profiler, compactPatch(patch));
  publishSimulationLaunchDebug(profiler);
  return profiler;
}

 function completeSimulationLaunchProfiler(status = 'interactive', patch = {}) {
  const profiler = getActiveSimulationLaunchProfiler();
  const now = timeNow();
  if (profiler.activeStage) completeStage(profiler, profiler.activeStage, now);
  profiler.status = status;
  profiler.activeStage = null;
  profiler.interactiveAt = profiler.interactiveAt ?? now;
  profiler.totalLaunchDurationMs = round(now - profiler.launchStartedAt, 3);
  Object.assign(profiler, compactPatch(patch));
  stopHeartbeat(profiler);
  publishSimulationLaunchDebug(profiler);
  return profiler;
}

 function failSimulationLaunchProfiler(reason, patch = {}) {
  const profiler = getActiveSimulationLaunchProfiler();
  profiler.status = 'failed';
  profiler.launchAbortedCleanly = patch.launchAbortedCleanly === true;
  if (reason) profiler.failures.push(String(reason));
  Object.assign(profiler, compactPatch(patch));
  stopHeartbeat(profiler);
  publishSimulationLaunchDebug(profiler);
  return profiler;
}

 function incrementSimulationLaunchCounter(key, amount = 1) {
  if (!COUNTER_KEYS.includes(key)) return getActiveSimulationLaunchProfiler();
  const profiler = getActiveSimulationLaunchProfiler();
  profiler[key] = Number(profiler[key] ?? 0) + Number(amount ?? 1);
  publishSimulationLaunchDebug(profiler);
  return profiler;
}

 function addSimulationLaunchWarning(message) {
  const profiler = getActiveSimulationLaunchProfiler();
  if (message) profiler.warnings.push(String(message));
  publishSimulationLaunchDebug(profiler);
  return profiler;
}

 function addSimulationLaunchFailure(message) {
  const profiler = getActiveSimulationLaunchProfiler();
  if (message) profiler.failures.push(String(message));
  publishSimulationLaunchDebug(profiler);
  return profiler;
}

 function setSimulationLaunchCurrentField(field = {}) {
  const profiler = getActiveSimulationLaunchProfiler();
  const east = field.eastAxisMeters?.length ?? 0;
  const north = field.northAxisMeters?.length ?? 0;
  const depth = field.depthAxisMeters?.length ?? 0;
  const time = field.timeAxisSeconds?.length ?? 0;
  const scalarCount = east * north * depth * time;
  profiler.currentFieldId = field.id ?? field.sourceMetadata?.fieldId ?? profiler.currentFieldId ?? null;
  profiler.currentFieldDigest = field.digest ?? profiler.currentFieldDigest ?? null;
  profiler.currentEastCount = east;
  profiler.currentNorthCount = north;
  profiler.currentDepthCount = depth;
  profiler.currentTimeCount = time;
  profiler.currentScalarCount = scalarCount;
  profiler.estimatedCurrentBytes = estimateCurrentFieldBytes(field);
  publishSimulationLaunchDebug(profiler);
  return profiler;
}

 function setSimulationLaunchEnvironmentArtifact(environmentArtifactOrSummary = {}) {
  const profiler = getActiveSimulationLaunchProfiler();
  const summary = environmentArtifactOrSummary?.type === 'anchor.environment.artifact-summary'
    ? environmentArtifactOrSummary
    : environmentArtifactOrSummary?.environmentArtifactSummary ?? environmentArtifactOrSummary;
  profiler.environmentPackageVersion = summary.environmentPackageVersion ?? summary.version ?? 'anchor-environment-env-pkg-r1';
  profiler.environmentManifestDigest = summary.environmentManifestDigest ?? summary.manifestDigest ?? profiler.environmentManifestDigest ?? null;
  profiler.environmentArtifactDigest = summary.environmentArtifactDigest ?? summary.artifactDigest ?? profiler.environmentArtifactDigest ?? null;
  profiler.bathymetryArtifactDigest = summary.componentDigests?.bathymetryArtifactDigest ?? summary.bathymetryArtifactDigest ?? profiler.bathymetryArtifactDigest ?? null;
  profiler.currentArtifactDigests = summary.componentDigests?.currentFieldDigests ?? summary.currentFieldDigests ?? profiler.currentArtifactDigests ?? {};
  profiler.scalarArtifactDigests = summary.componentDigests?.scalarFieldDigests ?? summary.scalarFieldDigests ?? profiler.scalarArtifactDigests ?? {};
  profiler.fieldRoleSummary = Array.isArray(summary.fieldRoleSummary) ? summary.fieldRoleSummary : profiler.fieldRoleSummary;
  profiler.environmentValidationSummary = summary.validationSummary ?? summary.environmentValidationSummary ?? profiler.environmentValidationSummary ?? null;
  publishSimulationLaunchDebug(profiler);
  return profiler;
}

 function setSimulationLaunchRendererCounts(summary = {}) {
  const profiler = getActiveSimulationLaunchProfiler();
  profiler.activeRendererCount = Number(summary.activeRendererCount ?? summary.rendererCount ?? profiler.activeRendererCount ?? 0);
  profiler.activeRafCount = Number(summary.activeRafCount ?? summary.rafCount ?? profiler.activeRafCount ?? 0);
  profiler.estimatedRenderBufferBytes = Number(summary.estimatedRenderBufferBytes ?? profiler.estimatedRenderBufferBytes ?? 0);
  publishSimulationLaunchDebug(profiler);
  return profiler;
}

 function setSimulationLaunchPresentationDegraded(message) {
  const profiler = getActiveSimulationLaunchProfiler();
  profiler.degradedPresentation = true;
  if (message) profiler.warnings.push(String(message));
  publishSimulationLaunchDebug(profiler);
  return profiler;
}

 function simulationLaunchDebugSnapshot(profiler = getActiveSimulationLaunchProfiler()) {
  if (!profiler) return null;
  return {
    version: SIMULATION_LAUNCH_PROFILER_VERSION,
    status: profiler.status,
    lastCompletedStage: profiler.lastCompletedStage,
    activeStage: profiler.activeStage,
    launchStartedAt: round(profiler.launchStartedAt, 3),
    interactiveAt: profiler.interactiveAt == null ? null : round(profiler.interactiveAt, 3),
    totalLaunchDurationMs: profiler.totalLaunchDurationMs == null ? null : round(profiler.totalLaunchDurationMs, 3),
    stageDurationsMs: { ...profiler.stageDurationsMs },
    mainThreadHeartbeatCount: profiler.mainThreadHeartbeatCount,
    maximumHeartbeatGapMs: round(profiler.maximumHeartbeatGapMs, 3),
    longTaskCount: profiler.longTaskCount,
    maximumObservedTaskMs: round(profiler.maximumObservedTaskMs, 3),
    missionId: profiler.missionId,
    scenarioId: profiler.scenarioId,
    agentCount: profiler.agentCount,
    currentFieldId: profiler.currentFieldId,
    currentFieldDigest: profiler.currentFieldDigest,
    currentEastCount: profiler.currentEastCount,
    currentNorthCount: profiler.currentNorthCount,
    currentDepthCount: profiler.currentDepthCount,
    currentTimeCount: profiler.currentTimeCount,
    currentScalarCount: profiler.currentScalarCount,
    environmentPackageVersion: profiler.environmentPackageVersion ?? null,
    environmentManifestDigest: profiler.environmentManifestDigest ?? null,
    environmentArtifactDigest: profiler.environmentArtifactDigest ?? null,
    bathymetryArtifactDigest: profiler.bathymetryArtifactDigest ?? null,
    currentArtifactDigests: { ...(profiler.currentArtifactDigests ?? {}) },
    scalarArtifactDigests: { ...(profiler.scalarArtifactDigests ?? {}) },
    fieldRoleSummary: Array.isArray(profiler.fieldRoleSummary) ? [...profiler.fieldRoleSummary] : [],
    environmentValidationSummary: profiler.environmentValidationSummary ?? null,
    environmentArtifactBuildCount: profiler.environmentArtifactBuildCount ?? 0,
    environmentSamplerCreateCount: profiler.environmentSamplerCreateCount ?? 0,
    environmentValidationCount: profiler.environmentValidationCount ?? 0,
    currentCubeBuildCount: profiler.currentCubeBuildCount,
    currentCubeNormalizeCount: profiler.currentCubeNormalizeCount,
    currentCubeDigestCount: profiler.currentCubeDigestCount,
    currentSamplerCreateCount: profiler.currentSamplerCreateCount,
    currentSampleCallCount: profiler.currentSampleCallCount,
    currentViewModelBuildCount: profiler.currentViewModelBuildCount,
    currentGlyphLayerBuildCount: profiler.currentGlyphLayerBuildCount,
    currentGlyphBufferAllocationCount: profiler.currentGlyphBufferAllocationCount,
    currentGlyphBufferUpdateCount: profiler.currentGlyphBufferUpdateCount,
    activeRendererCount: profiler.activeRendererCount,
    activeRafCount: profiler.activeRafCount,
    renderSubmissionCount: profiler.renderSubmissionCount,
    estimatedCurrentBytes: profiler.estimatedCurrentBytes,
    estimatedRenderBufferBytes: profiler.estimatedRenderBufferBytes,
    degradedPresentation: profiler.degradedPresentation === true,
    launchAbortedCleanly: profiler.launchAbortedCleanly === true,
    safeCurrentDisplayMode: profiler.safeCurrentDisplayMode === true,
    warnings: [...profiler.warnings],
    failures: [...profiler.failures]
  };
}

 function publishSimulationLaunchDebug(profiler = activeProfiler) {
  if (typeof globalThis !== 'undefined') globalThis.ANCHOR_SIMULATION_LAUNCH_DEBUG = profiler ? simulationLaunchDebugSnapshot(profiler) : null;
  return profiler;
}

 function estimateCurrentFieldBytes(field = {}) {
  const east = field.eastAxisMeters?.length ?? 0;
  const north = field.northAxisMeters?.length ?? 0;
  const depth = field.depthAxisMeters?.length ?? 0;
  const time = field.timeAxisSeconds?.length ?? 0;
  const cells = east * north * depth * time;
  const components = 2 + (field.wDownMetersPerSecond ? 1 : 0);
  const vectorBytes = cells * components * 8;
  const maskBytes = east * north;
  const bottomBytes = east * north * 8;
  const axisBytes = (east + north + depth + time) * 8;
  return Math.max(0, Math.round(vectorBytes + maskBytes + bottomBytes + axisBytes));
}

function normalizeStage(stage) {
  const id = String(stage ?? '').trim();
  return SIMULATION_LAUNCH_STAGES.includes(id) ? id : id || 'unknown';
}

function completeStage(profiler, stage, now = timeNow()) {
  const start = profiler.stageStartedAt?.[stage];
  if (Number.isFinite(Number(start))) {
    const duration = Math.max(0, now - Number(start));
    profiler.stageDurationsMs[stage] = round(duration, 3);
    if (duration > 50) {
      profiler.longTaskCount += 1;
      profiler.maximumObservedTaskMs = Math.max(profiler.maximumObservedTaskMs, duration);
    }
  }
  profiler.lastCompletedStage = stage;
  if (profiler.activeStage === stage) profiler.activeStage = null;
}

function startHeartbeat(profiler) {
  if (!profiler || typeof globalThis === 'undefined' || typeof globalThis.setInterval !== 'function') return;
  profiler.heartbeatLastAt = timeNow();
  profiler.heartbeatTimer = globalThis.setInterval(() => {
    const now = timeNow();
    const gap = now - Number(profiler.heartbeatLastAt ?? now);
    profiler.heartbeatLastAt = now;
    profiler.mainThreadHeartbeatCount += 1;
    profiler.maximumHeartbeatGapMs = Math.max(Number(profiler.maximumHeartbeatGapMs ?? 0), gap);
    if (gap > 500) {
      profiler.longTaskCount += 1;
      profiler.maximumObservedTaskMs = Math.max(Number(profiler.maximumObservedTaskMs ?? 0), gap);
    }
    publishSimulationLaunchDebug(profiler);
  }, 250);
  if (typeof profiler.heartbeatTimer?.unref === 'function') profiler.heartbeatTimer.unref();
}

function stopHeartbeat(profiler) {
  if (!profiler?.heartbeatTimer || typeof globalThis === 'undefined' || typeof globalThis.clearInterval !== 'function') return;
  globalThis.clearInterval(profiler.heartbeatTimer);
  profiler.heartbeatTimer = null;
}

function compactPatch(patch = {}) {
  const result = {};
  for (const [key, value] of Object.entries(patch ?? {})) {
    if (Array.isArray(value) && value.length && typeof value[0] === 'object') continue;
    result[key] = value;
  }
  return result;
}

function timeNow() {
  return Number(globalThis.performance?.now?.() ?? Date.now?.() ?? 0);
}

function round(value, digits = 3) {
  const n = Number(value);
  return Number.isFinite(n) ? Number(n.toFixed(digits)) : 0;
}

module.exports = {SIMULATION_LAUNCH_PROFILER_VERSION, SIMULATION_LAUNCH_STAGES, createSimulationLaunchProfiler, startSimulationLaunchProfiler, getActiveSimulationLaunchProfiler, resetSimulationLaunchProfiler, markSimulationLaunchStage, completeSimulationLaunchStage, completeSimulationLaunchProfiler, failSimulationLaunchProfiler, incrementSimulationLaunchCounter, addSimulationLaunchWarning, addSimulationLaunchFailure, setSimulationLaunchCurrentField, setSimulationLaunchEnvironmentArtifact, setSimulationLaunchRendererCounts, setSimulationLaunchPresentationDegraded, simulationLaunchDebugSnapshot, publishSimulationLaunchDebug, estimateCurrentFieldBytes}