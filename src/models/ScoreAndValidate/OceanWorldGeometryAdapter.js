const BathymetrySchema = require('./BathymetrySchema.js')
const BathymetryFieldModel = require('./BathymetryFieldModel.js')
const BathymetryMeshModel = require('./BathymetryMeshModel.js')
const WaterColumnSchema = require('./WaterColumnSchema.js')
const OCEAN_WORLD_GEOMETRY_ADAPTER_VERSION = 'ocean-world-geometry-adapter-env-r1';

 function buildOceanWorldGeometry({
  missionConfig,
  fieldPack,
  bathymetry,
  waterColumnConfig,
  observations,
  tracks,
  motionTrajectory,
  plan,
  options = {}
} = {}) {
  const bathymetryConfig = BathymetrySchema.createBathymetryConfig(options.bathymetryConfig ?? bathymetry?.config ?? missionConfig?.world?.bathymetryConfig ?? {
    width: missionConfig?.world?.width ?? fieldPack?.grid?.width ?? options.width,
    height: missionConfig?.world?.height ?? fieldPack?.grid?.height ?? options.height
  });
  const waterConfig = WaterColumnSchema.normalizeWaterColumnConfig(waterColumnConfig ?? missionConfig?.world?.waterColumnConfig ?? {
    depthLayerIds: missionConfig?.world?.depthLayers ?? fieldPack?.grid?.depthLayers
  });
  const mesh = BathymetryMeshModel.createBathymetryMesh({ bathymetry, bathymetryConfig, waterColumnConfig: waterConfig, stride: options.meshStride ?? 1 });
  const surfaceWaypoints = surfaceWaypointsFromPlan(plan ?? missionConfig?.plan, options);
  const samplingPoints = samplingPointsFromObservations(observations ?? motionTrajectory?.sampledObservations, options);
  const realized = realizedTrajectoryGeometry(motionTrajectory, tracks, options);
  const plannedPath = plannedPathFromPlan(plan ?? motionTrajectory ?? {}, options);
  const diveProfilePath = diveProfilePathFromTracks(tracks ?? motionTrajectory?.realizedTrack ?? plannedPath, options);
  const geometry = {
    type: 'anchor.science.ocean-world-geometry',
    version: OCEAN_WORLD_GEOMETRY_ADAPTER_VERSION,
    bathymetrySummary: bathymetry ? BathymetryFieldModel.bathymetryFieldStats(bathymetry) : bathymetryConfigSummaryFromConfig(bathymetryConfig),
    bathymetryFeatureSummary: bathymetry ? BathymetryFieldModel.bathymetryFeatureSummary(bathymetry) : { featureIds: bathymetryConfig.features.map((feature) => feature.id), publicSafe: true },
    bathymetryMeshSummary: BathymetryMeshModel.bathymetryMeshSummary(mesh),
    waterSurface: BathymetryMeshModel.createWaterSurfacePlane({ bathymetryConfig }),
    bottomSurface: mesh.bottomSurface,
    depthLayerPlanes: BathymetryMeshModel.createDepthLayerPlanes(waterConfig, bathymetryConfig, options),
    surfaceWaypoints,
    plannedPath,
    realizedTrajectory: realized,
    samplingPoints,
    diveProfilePath,
    waterColumnLayers: waterColumnLayerGeometry(waterConfig, bathymetryConfig, options),
    flowOverlaySummary: options.flowOverlaySummary ?? compactFlowSummary(fieldPack, tracks ?? motionTrajectory?.realizedTrack),
    waterColumnSummary: options.waterColumnSummary ?? null,
    motionDynamicsSummary: options.motionDynamicsSummary ?? motionTrajectory?.motionDiagnostics?.summary ?? null,
    publicSafe: true,
    generatedRoute: false,
    ownsSimulationState: false,
    ownsScoring: false,
    ownsPlanning: false,
    usesFull3DPlanning: false,
    usesHydrodynamicSolver: false,
    usesTerrainFlowAsOceanCurrent: false,
    usesWebGPUFluid: false,
    usesMARL: false
  };
  geometry.summary = oceanWorldGeometrySummary(geometry);
  return geometry;
}

 function surfaceWaypointsFromPlan(plan, options = {}) {
  const waypoints = plan?.plannedWaypoints ?? plan?.waypoints ?? plan?.agentPlans?.[0]?.waypoints ?? [];
  return clonePoints(waypoints).map((point, index) => ({
    id: point.waypointId ?? point.id ?? `surface-waypoint-${index + 1}`,
    x: finiteNumber(point.x, 0),
    y: finiteNumber(point.y, 0),
    z: 0,
    depthMeters: 0,
    depthLayerId: 'surface',
    kind: 'surface-waypoint',
    routeIntent: true,
    order: index,
    label: options.labelPrefix ? `${options.labelPrefix} ${index + 1}` : `WP ${index + 1}`
  }));
}

 function samplingPointsFromObservations(observations, options = {}) {
  return clonePoints(observations ?? []).map((point, index) => ({
    id: point.observationId ?? point.id ?? `sampling-point-${index + 1}`,
    x: finiteNumber(point.x, 0),
    y: finiteNumber(point.y, 0),
    z: -finiteNumber(point.depthMeters, depthForLayer(point.depthLayerId ?? point.depthLayer)),
    depthMeters: finiteNumber(point.depthMeters, depthForLayer(point.depthLayerId ?? point.depthLayer)),
    depthLayerId: point.depthLayerId ?? point.depthLayer ?? options.defaultDepthLayerId ?? 'surface',
    value: finiteOrNull(point.observedValue ?? point.value),
    kind: 'subsurface-sampling-point',
    collectedObservation: true,
    order: index
  }));
}

 function diveProfilePathFromTracks(tracks, options = {}) {
  return clonePoints(tracks ?? []).map((point, index) => ({
    id: point.id ?? `dive-profile-${index + 1}`,
    x: finiteNumber(point.x, 0),
    y: finiteNumber(point.y, 0),
    z: -finiteNumber(point.depthMeters, depthForLayer(point.depthLayerId ?? point.depthLayer)),
    depthMeters: finiteNumber(point.depthMeters, depthForLayer(point.depthLayerId ?? point.depthLayer)),
    depthLayerId: point.depthLayerId ?? point.depthLayer ?? options.defaultDepthLayerId ?? null,
    timeSeconds: finiteOrNull(point.timeSeconds ?? point.t),
    kind: 'dive-profile-path-point',
    order: index
  })).filter((point) => point.depthLayerId || point.depthMeters > 0);
}

 function realizedTrajectoryGeometry(motionTrajectory, tracks, options = {}) {
  const source = motionTrajectory?.realizedTrack ?? tracks ?? [];
  return clonePoints(source).map((point, index) => ({
    id: point.id ?? `realized-trajectory-${index + 1}`,
    x: finiteNumber(point.x, 0),
    y: finiteNumber(point.y, 0),
    z: -finiteNumber(point.depthMeters, depthForLayer(point.depthLayerId ?? point.depthLayer)),
    depthMeters: finiteNumber(point.depthMeters, depthForLayer(point.depthLayerId ?? point.depthLayer)),
    depthLayerId: point.depthLayerId ?? point.depthLayer ?? options.defaultDepthLayerId ?? null,
    timeSeconds: finiteOrNull(point.timeSeconds ?? point.t),
    trackError: finiteOrNull(point.trackError),
    kind: 'realized-trajectory-point',
    order: index
  }));
}

 function waterColumnLayerGeometry(waterColumnConfig, bathymetryConfig, options = {}) {
  const water = WaterColumnSchema.normalizeWaterColumnConfig(waterColumnConfig ?? {});
  const bathy = BathymetrySchema.createBathymetryConfig(bathymetryConfig ?? options);
  return water.depthLayerIds.map((id) => {
    const meta = WaterColumnSchema.waterColumnLayerMetadata(id);
    return {
      id,
      label: meta.label ?? id,
      nominalDepthMeters: meta.nominalDepthMeters ?? 0,
      thicknessMeters: meta.thicknessMeters ?? null,
      plane: BathymetryMeshModel.createDepthLayerPlanes({ ...water, depthLayerIds: [id] }, bathy, options)[0],
      publicSafe: true
    };
  });
}

 function oceanWorldGeometrySummary(geometry = {}) {
  const sampledLayers = [...new Set((geometry.samplingPoints ?? []).map((point) => point.depthLayerId).filter(Boolean))];
  return {
    type: 'anchor.science.ocean-world-geometry-summary',
    version: OCEAN_WORLD_GEOMETRY_ADAPTER_VERSION,
    hasBathymetrySummary: Boolean(geometry.bathymetrySummary),
    bathymetryDepthRange: {
      minDepthMeters: geometry.bathymetrySummary?.minDepthMeters ?? 0,
      maxDepthMeters: geometry.bathymetrySummary?.maxDepthMeters ?? 0
    },
    bathymetryFeatureIds: geometry.bathymetryFeatureSummary?.featureIds ?? [],
    waterSurface: Boolean(geometry.waterSurface),
    bottomSurface: Boolean(geometry.bottomSurface),
    depthLayerPlaneCount: geometry.depthLayerPlanes?.length ?? 0,
    surfaceWaypointCount: geometry.surfaceWaypoints?.length ?? 0,
    samplingPointCount: geometry.samplingPoints?.length ?? 0,
    plannedPathPointCount: geometry.plannedPath?.length ?? 0,
    realizedTrajectoryPointCount: geometry.realizedTrajectory?.length ?? 0,
    diveProfilePathCount: geometry.diveProfilePath?.length ?? 0,
    hasDiveProfilePath: Boolean(geometry.diveProfilePath?.length),
    sampledDepthLayers: sampledLayers,
    publicSafe: geometry.publicSafe !== false,
    generatedRoute: false,
    ownsSimulationState: false,
    ownsScoring: false,
    ownsPlanning: false,
    usesFull3DPlanning: false,
    usesHydrodynamicSolver: false,
    usesTerrainFlowAsOceanCurrent: false,
    usesWebGPUFluid: false,
    usesMARL: false
  };
}

 function validateOceanWorldGeometry(geometry = {}) {
  const errors = [];
  const warnings = [];
  if (geometry?.type !== 'anchor.science.ocean-world-geometry') errors.push(`Expected type anchor.science.ocean-world-geometry, got ${geometry?.type ?? 'missing'}.`);
  if (!geometry?.waterSurface) errors.push('Ocean world geometry requires waterSurface.');
  if (!geometry?.bottomSurface) errors.push('Ocean world geometry requires bottomSurface.');
  if (!Array.isArray(geometry?.depthLayerPlanes) || !geometry.depthLayerPlanes.length) warnings.push('Ocean world geometry has no depth-layer planes.');
  if (geometry?.ownsPlanning || geometry?.generatedRoute) errors.push('Ocean world geometry must not generate or own routes.');
  if (geometry?.usesFull3DPlanning || geometry?.usesHydrodynamicSolver || geometry?.usesTerrainFlowAsOceanCurrent || geometry?.usesMARL) errors.push('Ocean world geometry violated ENV-R1 boundary flags.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

function plannedPathFromPlan(plan, options = {}) {
  const source = plan?.plannedWaypoints ?? plan?.waypoints ?? plan?.agentPlans?.[0]?.waypoints ?? [];
  return clonePoints(source).map((point, index) => ({
    id: point.waypointId ?? point.id ?? `planned-path-${index + 1}`,
    x: finiteNumber(point.x, 0),
    y: finiteNumber(point.y, 0),
    z: -finiteNumber(point.depthMeters, depthForLayer(point.depthLayerId ?? point.depthLayer)),
    depthMeters: finiteNumber(point.depthMeters, depthForLayer(point.depthLayerId ?? point.depthLayer)),
    depthLayerId: point.depthLayerId ?? point.depthLayer ?? options.defaultDepthLayerId ?? 'surface',
    kind: 'planned-path-point',
    routeIntent: true,
    order: index
  }));
}

function compactFlowSummary(fieldPack, tracks = []) {
  const track = Array.isArray(tracks) ? tracks : [];
  return {
    present: Boolean(fieldPack?.fields?.F_u || fieldPack?.fields?.F_v || track.some((point) => point.flowU !== undefined || point.flowV !== undefined)),
    currentField: 'F(x,y,z,t)',
    sampleCount: track.length,
    terrainFlowAccumulationIsOceanCurrent: false,
    note: 'Currents remain F(x,y,z,t); terrain-flow accumulation is not ocean current.'
  };
}

function bathymetryConfigSummaryFromConfig(config) {
  return {
    type: 'anchor.science.bathymetry-field-stats',
    width: config.width,
    height: config.height,
    minDepthMeters: config.minDepthMeters,
    maxDepthMeters: config.maxDepthMeters,
    meanDepthMeters: null,
    waterCellCount: null,
    landCellCount: null,
    finite: true
  };
}

function depthForLayer(id) {
  const meta = WaterColumnSchema.waterColumnLayerMetadata(id ?? 'surface');
  return finiteNumber(meta.nominalDepthMeters, 0);
}

function clonePoints(value) {
  return JSON.parse(JSON.stringify(Array.isArray(value) ? value : []));
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

module.exports = {buildOceanWorldGeometry, surfaceWaypointsFromPlan, samplingPointsFromObservations, diveProfilePathFromTracks, realizedTrajectoryGeometry, waterColumnLayerGeometry, oceanWorldGeometrySummary, validateOceanWorldGeometry}