import {
  bathymetryFeatureSummary,
  bathymetryFieldStats,
  createCoastalOperationalBathymetry,
  extractCoastlineEdges
} from '../science/BathymetryFieldModel.js';
import { normalizeWaterColumnConfig, waterColumnLayerMetadata } from '../science/WaterColumnSchema.js';
import { buildBathymetrySurfaceViewModel } from './BathymetrySurfaceViewModel.js';
import { buildBathymetryMeshGeometry } from './BathymetryMeshGeometry.js';
import { extractCoastlineSegments } from './CoastlineGeometry.js';
import { buildBathymetryContourGeometry } from './BathymetryContourGeometry.js';
import {
  buildOceanWorldGeometry,
  diveProfilePathFromTracks,
  realizedTrajectoryGeometry,
  samplingPointsFromObservations,
  surfaceWaypointsFromPlan
} from '../science/OceanWorldGeometryAdapter.js';

export const BATHYMETRY_WORLD_RENDER_VIEW_MODEL_VERSION = 'bathymetry-world-render-view-model-gfx-r2';

export function buildBathymetryWorldRenderViewModel({
  bathymetry,
  bathymetrySummary,
  waterColumnSummary,
  waterColumnConfig,
  plan,
  tracks,
  observations,
  motionTrajectory,
  scienceDiagnostics,
  options = {}
} = {}) {
  const field = bathymetry ?? createCoastalOperationalBathymetry(options.bathymetryOptions ?? options);
  const water = normalizeWaterColumnConfig(waterColumnConfig ?? waterColumnSummary?.waterColumnConfig ?? { depthLayerIds: ['surface', 'thermocline', 'deep'] });
  const stats = bathymetrySummary?.type === 'anchor.science.bathymetry-field-stats' ? bathymetrySummary : bathymetryFieldStats(field);
  const featureSummary = field.featureSummary ?? bathymetryFeatureSummary(field);
  const bathymetrySurface = buildBathymetrySurfaceViewModel({
    bathymetry: field,
    grid: { width: field.width, height: field.height },
    coordinateProfileId: 'bathymetry-world-cell-center-v1',
    sourceMetadata: field.sourceMetadata,
    terrainFeatures: field.terrainFeatures
  });
  const terrainMesh = buildBathymetryMeshGeometry({
    surfaceModel: bathymetrySurface,
    verticalExaggeration: options.verticalExaggeration ?? field.config?.verticalExaggeration ?? 1.5,
    horizontalScale: options.horizontalScale ?? 1,
    depthScale: options.depthScale ?? 0.055
  });
  const coastlineGeometry = extractCoastlineSegments({ surfaceModel: bathymetrySurface });
  const contourGeometry = buildBathymetryContourGeometry({ surfaceModel: bathymetrySurface, levels: options.contourDepthsMeters });
  const geometry = buildOceanWorldGeometry({
    missionConfig: { world: { width: field.width, height: field.height, waterColumnConfig: water, bathymetryConfig: field.config } },
    bathymetry: field,
    waterColumnConfig: water,
    observations,
    tracks,
    motionTrajectory,
    plan,
    options: {
      flowOverlaySummary: { present: true, currentField: 'F(x,y,z,t)', note: 'Terrain-flow accumulation is not ocean current.' },
      waterColumnSummary
    }
  });
  const surfaceWaypoints = surfaceWaypointsFromPlan(plan ?? motionTrajectory ?? {}, options);
  const samplingPoints = samplingPointsFromObservations(observations ?? motionTrajectory?.sampledObservations ?? [], options);
  const plannedPath = publicPlannedPath(plan ?? motionTrajectory ?? {}, options);
  const realizedTrajectory = realizedTrajectoryGeometry(motionTrajectory, tracks, options);
  const diveProfilePath = diveProfilePathFromTracks(tracks ?? motionTrajectory?.realizedTrack ?? plannedPath, options);
  const flowVectors = createFlowVectors(field, options);
  const depthLayers = createDepthLayers(water, field, terrainMesh, options);
  const visibilityFlags = defaultVisibilityFlags(options.visibilityFlags ?? options.layerVisibility);
  const boundaryFlags = {
    ownsSimulationState: false,
    ownsScoring: false,
    ownsPlanning: false,
    usesFull3DPlanning: false,
    usesWebGPUFluid: false,
    usesMARL: false,
    usesHydrodynamicSolver: false,
    usesTerrainFlowAsOceanCurrent: false,
    usesEnable3D: false
  };
  return scrubHidden({
    type: 'anchor.rendering.bathymetry-world-view-model',
    version: BATHYMETRY_WORLD_RENDER_VIEW_MODEL_VERSION,
    terrainGrid: cloneGrid(field.depthMeters),
    landMask: bathymetrySurface.landMask,
    coastlineEdges: field.coastlineEdges ?? extractCoastlineEdges(bathymetrySurface.landMask),
    coastlineGeometry,
    contourGeometry,
    bathymetrySurface,
    terrainMeshGeometry: terrainMesh,
    terrainMesh,
    depthRange: featureSummary.depthRange ?? { minDepthMeters: stats.minDepthMeters, maxDepthMeters: stats.maxDepthMeters },
    featureIds: field.featureIds ?? featureSummary.featureIds ?? [],
    bottomHazardZones: field.bottomHazardZones ?? [],
    waterSurface: {
      id: 'waterSurface',
      label: 'Water Surface',
      elevation: 0,
      width: field.width,
      height: field.height,
      publicSafe: true
    },
    depthLayers,
    surfaceWaypoints: normalizeRenderPoints(surfaceWaypoints, 'surface-waypoint'),
    samplingPoints: normalizeRenderPoints(samplingPoints, 'sampling-point'),
    plannedPath: normalizeRenderPoints(plannedPath, 'planned-path-point'),
    realizedTrajectory: normalizeRenderPoints(realizedTrajectory, 'realized-trajectory-point'),
    diveProfilePath: normalizeRenderPoints(diveProfilePath, 'dive-profile-path-point'),
    flowVectors,
    visibilityFlags,
    boundaryFlags,
    summaries: {
      bathymetry: stats,
      featureSummary,
      waterColumn: waterColumnSummary ?? null,
      oceanWorld: geometry.summary ?? null,
      scienceDiagnostics: summarizeScienceDiagnostics(scienceDiagnostics)
    },
    publicSafe: true,
    containsHiddenTruth: false,
    calibratedSurveyData: false,
    notA: ['not full 3D route planning', 'not hydrodynamic solver', 'not calibrated ocean forecast', 'not hidden truth payload']
  });
}

export function bathymetryWorldRenderViewModelSummary(viewModel = {}) {
  return {
    type: 'anchor.rendering.bathymetry-world-view-model-summary',
    version: BATHYMETRY_WORLD_RENDER_VIEW_MODEL_VERSION,
    terrainVertexCount: viewModel.terrainMeshGeometry?.vertexCount ?? viewModel.terrainMesh?.vertexCount ?? 0,
    terrainTriangleCount: viewModel.terrainMeshGeometry?.triangleCount ?? viewModel.terrainMesh?.triangleCount ?? 0,
    coastlineEdgeCount: viewModel.coastlineGeometry?.segmentCount ?? viewModel.coastlineEdges?.length ?? 0,
    contourSegmentCount: viewModel.contourGeometry?.segmentCount ?? 0,
    sourceDigest: viewModel.bathymetrySurface?.sourceDigest ?? viewModel.terrainMeshGeometry?.sourceDigest ?? null,
    depthLayerCount: viewModel.depthLayers?.length ?? 0,
    surfaceWaypointCount: viewModel.surfaceWaypoints?.length ?? 0,
    samplingPointCount: viewModel.samplingPoints?.length ?? 0,
    plannedPathPointCount: viewModel.plannedPath?.length ?? 0,
    realizedTrajectoryPointCount: viewModel.realizedTrajectory?.length ?? 0,
    flowVectorCount: viewModel.flowVectors?.length ?? 0,
    featureIds: viewModel.featureIds ?? [],
    depthRange: viewModel.depthRange ?? null,
    publicSafe: viewModel.publicSafe !== false,
    ownsSimulationState: viewModel.boundaryFlags?.ownsSimulationState === true,
    ownsScoring: viewModel.boundaryFlags?.ownsScoring === true,
    ownsPlanning: viewModel.boundaryFlags?.ownsPlanning === true,
    usesFull3DPlanning: viewModel.boundaryFlags?.usesFull3DPlanning === true,
    usesWebGPUFluid: viewModel.boundaryFlags?.usesWebGPUFluid === true,
    usesMARL: viewModel.boundaryFlags?.usesMARL === true,
    usesHydrodynamicSolver: viewModel.boundaryFlags?.usesHydrodynamicSolver === true,
    usesTerrainFlowAsOceanCurrent: viewModel.boundaryFlags?.usesTerrainFlowAsOceanCurrent === true
  };
}

function createDepthLayers(water, bathymetry, terrainMesh, options = {}) {
  const width = bathymetry?.width ?? terrainMesh.width ?? 1;
  const height = bathymetry?.height ?? terrainMesh.height ?? 1;
  const depthScale = terrainMesh.depthScale ?? 0.055;
  const vertical = terrainMesh.verticalExaggeration ?? 1.5;
  return (water.depthLayerIds ?? ['surface', 'thermocline', 'deep']).map((id) => {
    const meta = waterColumnLayerMetadata(id);
    const depthMeters = Number(meta.nominalDepthMeters ?? (id === 'surface' ? 0 : bathymetry?.config?.maxDepthMeters * 0.5)) || 0;
    return {
      id,
      label: meta.label ?? id,
      depthMeters,
      y: -depthMeters * depthScale * vertical,
      width,
      height,
      color: layerColor(id),
      opacity: Number(options.layerOpacity ?? 0.2),
      publicSafe: true
    };
  });
}

function publicPlannedPath(plan, options = {}) {
  const source = plan?.plannedWaypoints ?? plan?.waypoints ?? plan?.agentPlans?.[0]?.waypoints ?? [];
  return cloneArray(source).map((point, index) => ({
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

function createFlowVectors(bathymetry, options = {}) {
  const depth = bathymetry?.depthMeters ?? [];
  const height = depth.length;
  const width = depth[0]?.length ?? 0;
  const land = bathymetry?.landMask ?? bathymetry?.landSeaMask ?? [];
  const step = Math.max(3, Math.round(Number(options.flowVectorStride ?? Math.min(width, height) / 7) || 5));
  const vectors = [];
  for (let y = step; y < height - 1; y += step) {
    for (let x = Math.max(1, step); x < width - 1; x += step) {
      const isLand = land[y]?.[x] === true || land[y]?.[x] === 'land' || Number(depth[y]?.[x] ?? 0) <= 0;
      if (isLand) continue;
      const nx = width <= 1 ? 0 : x / (width - 1);
      const ny = height <= 1 ? 0 : y / (height - 1);
      const u = 0.42 + 0.24 * Math.sin(ny * Math.PI * 2.2);
      const v = 0.22 * Math.cos(nx * Math.PI * 2.8 + ny * 1.7);
      vectors.push({ id: `flow-${x}-${y}`, x, y, z: -4, u: round(u), v: round(v), magnitude: round(Math.sqrt(u * u + v * v)), currentField: 'F(x,y,z,t)' });
    }
  }
  return vectors;
}

function normalizeRenderPoints(points = [], fallbackKind = 'point') {
  return cloneArray(points).map((point, index) => ({
    id: point.id ?? point.waypointId ?? point.observationId ?? `${fallbackKind}-${index + 1}`,
    x: finiteNumber(point.x, 0),
    y: finiteNumber(point.y, 0),
    z: finiteNumber(point.z, -finiteNumber(point.depthMeters, depthForLayer(point.depthLayerId ?? point.depthLayer))),
    depthMeters: finiteNumber(point.depthMeters, Math.max(0, -finiteNumber(point.z, 0))),
    depthLayerId: point.depthLayerId ?? point.depthLayer ?? null,
    value: finiteOrNull(point.value ?? point.observedValue),
    timeSeconds: finiteOrNull(point.timeSeconds ?? point.t),
    kind: point.kind ?? fallbackKind,
    order: Number.isFinite(Number(point.order)) ? Number(point.order) : index,
    routeIntent: point.routeIntent === true,
    collectedObservation: point.collectedObservation === true || fallbackKind === 'sampling-point'
  }));
}

function defaultVisibilityFlags(input = {}) {
  return {
    bathymetry: input.bathymetry !== false,
    waterSurface: input.waterSurface !== false,
    surface: input.surface !== false,
    thermocline: input.thermocline !== false,
    deep: input.deep !== false,
    surfaceWaypoints: input.surfaceWaypoints !== false,
    samplingPoints: input.samplingPoints !== false,
    plannedRoute: input.plannedRoute ?? input.plannedPath ?? true,
    realizedTrajectory: input.realizedTrajectory !== false,
    diveProfilePath: input.diveProfilePath !== false,
    flowVectors: input.flowVectors !== false
  };
}

function summarizeScienceDiagnostics(scienceDiagnostics) {
  if (!scienceDiagnostics) return null;
  return {
    type: scienceDiagnostics.type ?? 'anchor.science.diagnostics-summary',
    primaryDiagnosis: scienceDiagnostics.primaryDiagnosis ?? scienceDiagnostics.summary?.primaryDiagnosis ?? null,
    publicSafe: scienceDiagnostics.publicSafe !== false,
    containsHiddenTruth: false
  };
}

function scrubHidden(value) {
  const text = JSON.stringify(value, (_key, entry) => {
    if (_key === 'T_hiddenTruth' || _key === 'hiddenTruth' || _key === 'trueRoi') return undefined;
    return entry;
  });
  return JSON.parse(text);
}

function layerColor(id) {
  return { surface: '#8fe9ff', thermocline: '#f6d365', deep: '#cba6f7' }[id] ?? '#9cb4d8';
}

function depthForLayer(id) {
  return { surface: 0, thermocline: 35, deep: 120 }[id] ?? 0;
}

function cloneGrid(grid = []) {
  return (Array.isArray(grid) ? grid : []).map((row) => (Array.isArray(row) ? row.map((value) => Number(value) || 0) : []));
}

function cloneArray(value = []) {
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

function round(value) {
  return Number(Number(value ?? 0).toFixed(6));
}
