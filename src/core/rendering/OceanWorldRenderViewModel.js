import { waterColumnLayerMetadata } from '../science/WaterColumnSchema.js';

export const OCEAN_WORLD_RENDER_VIEW_MODEL_VERSION = 'ocean-world-render-view-model-gfx-arch-r1';

export function buildOceanWorldRenderViewModel({
  missionConfig,
  waterColumnSummary,
  bathymetrySummary,
  motionTrajectory,
  observations,
  tracks,
  plan,
  scienceDiagnostics,
  options = {}
} = {}) {
  const depthLayerIds = depthLayersFrom(waterColumnSummary, missionConfig);
  const plannedWaypoints = motionTrajectory?.plannedWaypoints ?? extractPlanWaypoints(plan);
  const realizedTrack = motionTrajectory?.realizedTrack ?? tracks ?? [];
  const sampled = motionTrajectory?.sampledObservations ?? observations ?? [];
  const grid = missionConfig?.world?.grid ?? missionConfig?.grid ?? options.grid ?? {};
  const warnings = [];
  if (JSON.stringify({ waterColumnSummary, bathymetrySummary, motionTrajectory, observations, tracks, plan, scienceDiagnostics }).includes('T_hiddenTruth')) {
    warnings.push('Input referenced hidden truth; render view model omits hidden truth arrays and identifiers.');
  }
  return {
    type: 'anchor.rendering.ocean-world-view-model',
    version: OCEAN_WORLD_RENDER_VIEW_MODEL_VERSION,
    id: String(options.id ?? 'ocean-world-render-view-model'),
    label: String(options.label ?? 'Ocean World Render View Model'),
    grid: {
      width: finiteNumber(grid.width, finiteNumber(options.width, 0)),
      height: finiteNumber(grid.height, finiteNumber(options.height, 0))
    },
    bathymetrySummary: compactBathymetrySummary(bathymetrySummary),
    waterSurface: {
      z: 0,
      label: 'Water Surface',
      rendererHint: 'future transparent surface mesh'
    },
    depthLayers: depthLayerIds.map((id, index) => ({
      id,
      index,
      ...waterColumnLayerMetadata(id),
      rendererHint: 'future semi-transparent depth slice'
    })),
    surfaceWaypoints: compactWaypoints(plannedWaypoints.filter((point) => !point.depthLayerId || point.depthLayerId === 'surface')),
    plannedPath: compactWaypoints(plannedWaypoints),
    realizedTrajectory: compactTrack(realizedTrack),
    samplingPoints: compactObservations(sampled),
    diveProfilePath: compactDiveProfilePath(realizedTrack, plannedWaypoints),
    flowOverlaySummary: compactFlowOverlaySummary(realizedTrack, options.flowOverlaySummary),
    waterColumnSummary: compactWaterColumnSummary(waterColumnSummary),
    scienceDiagnosticsSummary: compactScienceDiagnostics(scienceDiagnostics),
    warnings,
    boundaryFlags: {
      ownsSimulationState: false,
      ownsScoring: false,
      ownsPlanning: false,
      usesWebGPUFluid: false,
      usesMARL: false
    },
    notA: ['not simulation authority', 'not scoring authority', 'not planner', 'not WebGPU fluid simulation', 'not MARL/RL']
  };
}

export function oceanWorldRenderViewModelSummary(viewModel = {}) {
  return {
    type: 'anchor.rendering.ocean-world-view-model-summary',
    version: OCEAN_WORLD_RENDER_VIEW_MODEL_VERSION,
    depthLayerCount: viewModel.depthLayers?.length ?? 0,
    plannedPathPointCount: viewModel.plannedPath?.length ?? 0,
    realizedTrajectoryPointCount: viewModel.realizedTrajectory?.length ?? 0,
    samplingPointCount: viewModel.samplingPoints?.length ?? 0,
    hasBathymetrySummary: Boolean(viewModel.bathymetrySummary?.present),
    hasWaterColumnSummary: Boolean(viewModel.waterColumnSummary?.present),
    verticalCoverage: viewModel.waterColumnSummary?.verticalCoverage ?? null,
    ownsSimulationState: viewModel.boundaryFlags?.ownsSimulationState === true ? true : false,
    ownsScoring: viewModel.boundaryFlags?.ownsScoring === true ? true : false,
    ownsPlanning: viewModel.boundaryFlags?.ownsPlanning === true ? true : false,
    usesWebGPUFluid: viewModel.boundaryFlags?.usesWebGPUFluid === true ? true : false,
    usesMARL: viewModel.boundaryFlags?.usesMARL === true ? true : false,
    warningCount: viewModel.warnings?.length ?? 0
  };
}

function depthLayersFrom(summary, missionConfig) {
  const ids = summary?.waterColumnConfig?.depthLayerIds
    ?? summary?.depthLayerIds
    ?? missionConfig?.waterColumnConfig?.depthLayerIds
    ?? missionConfig?.world?.waterColumn?.depthLayerIds
    ?? ['surface', 'thermocline', 'deep'];
  return [...new Set((Array.isArray(ids) ? ids : ['surface', 'thermocline', 'deep']).map(String))];
}

function compactBathymetrySummary(summary) {
  return {
    present: Boolean(summary),
    minDepthMeters: finiteOrNull(summary?.minDepthMeters ?? summary?.minDepth),
    maxDepthMeters: finiteOrNull(summary?.maxDepthMeters ?? summary?.maxDepth),
    meanDepthMeters: finiteOrNull(summary?.meanDepthMeters ?? summary?.meanDepth),
    source: summary?.source ?? null,
    rendererHint: 'future seafloor mesh'
  };
}

function compactWaterColumnSummary(summary) {
  return {
    present: Boolean(summary),
    depthLayerIds: summary?.waterColumnConfig?.depthLayerIds ?? summary?.depthLayerIds ?? [],
    diveProfileId: summary?.diveProfile?.profileId ?? summary?.waterColumnConfig?.diveProfileId ?? null,
    observationCountsByDepth: clonePlain(summary?.observationCountsByDepth ?? {}),
    trackCountsByDepth: clonePlain(summary?.trackCountsByDepth ?? {}),
    verticalCoverage: summary?.verticalCoverage ?? summary?.observationSummary?.verticalCoverage ?? null,
    publicSafe: summary?.publicSafe !== false,
    hiddenTruthIncluded: false
  };
}

function compactScienceDiagnostics(diagnostics) {
  return diagnostics ? {
    present: true,
    primaryDiagnosis: diagnostics.primaryDiagnosis ?? diagnostics.summary?.primaryDiagnosis ?? null,
    recommendedObjective: diagnostics.recommendedObjective ?? diagnostics.summary?.recommendedObjective ?? null,
    publicSafe: diagnostics.hiddenTruthIncluded !== true
  } : { present: false };
}

function extractPlanWaypoints(plan) {
  const agentPlan = Array.isArray(plan?.agentPlans) ? plan.agentPlans.find((entry) => Array.isArray(entry.waypoints)) : null;
  return agentPlan?.waypoints ?? plan?.waypoints ?? [];
}

function compactWaypoints(points = []) {
  return (Array.isArray(points) ? points : []).map((point, index) => ({
    id: point.waypointId ?? point.id ?? `waypoint-${index + 1}`,
    x: finiteNumber(point.x, 0),
    y: finiteNumber(point.y, 0),
    zIndex: finiteOrNull(point.zIndex ?? point.z),
    depthLayerId: point.depthLayerId ?? point.depthLayer ?? null,
    depthMeters: finiteOrNull(point.depthMeters),
    timeSeconds: finiteOrNull(point.timeSeconds ?? point.t)
  }));
}

function compactTrack(points = []) {
  return (Array.isArray(points) ? points : []).map((point, index) => ({
    id: point.id ?? `track-${index + 1}`,
    x: finiteNumber(point.x, 0),
    y: finiteNumber(point.y, 0),
    zIndex: finiteOrNull(point.zIndex ?? point.z),
    depthLayerId: point.depthLayerId ?? point.depthLayer ?? null,
    depthMeters: finiteOrNull(point.depthMeters),
    timeSeconds: finiteOrNull(point.timeSeconds ?? point.t),
    currentAssist: finiteOrNull(point.currentAssist),
    crossCurrent: finiteOrNull(point.crossCurrent),
    trackError: finiteOrNull(point.trackError),
    energyRemaining: finiteOrNull(point.energyRemaining)
  }));
}

function compactObservations(observations = []) {
  return (Array.isArray(observations) ? observations : []).map((observation, index) => ({
    id: observation.observationId ?? observation.id ?? `sample-${index + 1}`,
    x: finiteNumber(observation.x, 0),
    y: finiteNumber(observation.y, 0),
    zIndex: finiteOrNull(observation.zIndex ?? observation.z),
    depthLayerId: observation.depthLayerId ?? observation.depthLayer ?? null,
    depthMeters: finiteOrNull(observation.depthMeters),
    timeSeconds: finiteOrNull(observation.timeSeconds ?? observation.t),
    observedValue: finiteOrNull(observation.observedValue ?? observation.value),
    surprise: finiteOrNull(observation.surprise),
    visibilityTier: 'publicScenario'
  }));
}

function compactDiveProfilePath(track, plannedWaypoints) {
  const source = Array.isArray(track) && track.length ? track : plannedWaypoints;
  return (Array.isArray(source) ? source : []).map((point, index) => ({
    index,
    timeSeconds: finiteOrNull(point.timeSeconds ?? point.t),
    depthLayerId: point.depthLayerId ?? point.depthLayer ?? null,
    depthMeters: finiteOrNull(point.depthMeters)
  })).filter((entry) => entry.depthLayerId || entry.depthMeters !== null);
}

function compactFlowOverlaySummary(track, fallback) {
  if (fallback) return clonePlain(fallback);
  const list = Array.isArray(track) ? track : [];
  return {
    present: list.some((point) => point.flowU !== undefined || point.flowV !== undefined || point.currentAssist !== undefined),
    sampleCount: list.length,
    meanCurrentAssist: mean(list.map((point) => point.currentAssist)),
    meanCrossCurrent: mean(list.map((point) => point.crossCurrent)),
    rendererHint: 'future vector glyph or particle overlay'
  };
}

function clonePlain(value) {
  return value && typeof value === 'object' ? JSON.parse(JSON.stringify(value)) : value;
}

function mean(values) {
  const finite = values.map(Number).filter(Number.isFinite);
  return finite.length ? round(finite.reduce((sum, value) => sum + value, 0) / finite.length) : 0;
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function round(value) {
  return Number(Number(value ?? 0).toFixed(6));
}