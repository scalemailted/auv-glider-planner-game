import { normalizeWaterColumnConfig, waterColumnLayerMetadata } from '../science/WaterColumnSchema.js';
import { buildLegacySurfaceOnlyWaterColumnConfig, isLegacySurfaceOnlyMission, waterColumnMissionConfigSummary } from '../science/WaterColumnMissionDefaults.js';
import { buildBottomBoundaryViewModel, bottomBoundaryViewModelSummary } from './BottomBoundaryViewModel.js';
import { buildOperationalDepthLayerViewModel, operationalDepthLayerViewModelSummary } from './OperationalDepthLayerViewModel.js';
import { createVolumetricMissionCoordinateModel } from './VolumetricMissionCoordinates.js';
import { buildRealizedDiveTrajectory, diveTrajectoryViewModelSummary } from './DiveTrajectoryViewModel.js';
import {
  buildPlannedDiveSegmentsForRoutes,
  plannedDiveSegmentViewModelSummary
} from './PlannedDiveSegmentViewModel.js';

export const VOLUMETRIC_MISSION_WORLD_VIEW_MODEL_VERSION = 'volumetric-mission-world-view-model-three-r1-2a';

export function buildVolumetricMissionWorldViewModel(options = {}) {
  const base = options.baseViewModel ?? {};
  return augmentMissionWorldWithVolumetricModel(base, options);
}

export function augmentMissionWorldWithVolumetricModel(baseViewModel = {}, options = {}) {
  const level = options.level ?? baseViewModel.level ?? null;
  const mission = options.mission ?? baseViewModel.mission ?? null;
  const plan = options.plan ?? baseViewModel.plan ?? null;
  const displaySettings = options.displaySettings ?? baseViewModel.displaySettings ?? {};
  const grid = baseViewModel.grid ?? level?.world?.grid ?? { width: 10, height: 10 };
  const explicitWaterColumnConfig = displaySettings.waterColumnConfig
    ?? options.waterColumnConfig
    ?? level?.world?.waterColumnConfig
    ?? mission?.world?.waterColumnConfig
    ?? mission?.waterColumnConfig
    ?? null;
  const rawWaterColumnConfig = explicitWaterColumnConfig ?? buildLegacySurfaceOnlyWaterColumnConfig({
    level,
    mission,
    reason: 'No mission waterColumnConfig reached the volumetric view model.'
  });
  const normalizedWaterColumnConfig = normalizeWaterColumnConfig(rawWaterColumnConfig);
  const waterColumnConfig = {
    ...rawWaterColumnConfig,
    ...normalizedWaterColumnConfig,
    source: rawWaterColumnConfig.source ?? (explicitWaterColumnConfig ? 'explicitScenarioConfig' : 'importedLegacySurfaceFallback'),
    defaultDisplayMode: rawWaterColumnConfig.defaultDisplayMode ?? (normalizedWaterColumnConfig.depthLayerIds.length > 1 ? 'explodedLayers' : 'physicalDepth'),
    defaultPlanningLayerId: rawWaterColumnConfig.defaultPlanningLayerId ?? (normalizedWaterColumnConfig.depthLayerIds.includes('thermocline') ? 'thermocline' : normalizedWaterColumnConfig.depthLayerIds[0] ?? 'surface'),
    defaultDiveProfileId: rawWaterColumnConfig.defaultDiveProfileId ?? normalizedWaterColumnConfig.diveProfileId ?? 'surfaceOnly'
  };
  const configSummary = waterColumnMissionConfigSummary(waterColumnConfig);
  const legacySurfaceOnlyFallback = isLegacySurfaceOnlyMission(waterColumnConfig);
  const waterColumnUi = displaySettings.waterColumn ?? options.waterColumn ?? {};
  const verticalExaggeration = finiteNumber(waterColumnUi.verticalExaggeration ?? displaySettings.verticalExaggeration ?? baseViewModel.coordinateSystem?.verticalExaggeration, 1);
  const verticalDisplayMode = normalizeVerticalDisplayMode(waterColumnUi.verticalDisplayMode ?? displaySettings.verticalDisplayMode ?? waterColumnConfig.defaultDisplayMode);
  const bottomBoundary = buildBottomBoundaryViewModel({ level, grid, bathymetry: options.bathymetry ?? level?.bathymetry ?? null });
  const layerFields = buildLayerFields({ baseViewModel, waterColumnConfig, grid, selectedFieldId: waterColumnUi.selectedScalarFieldId ?? displaySettings.selectedScalarFieldId });
  const layerCurrents = buildLayerCurrents({ baseViewModel, waterColumnConfig });
  const activeDepthLayerId = normalizeActiveLayer(waterColumnUi.activeDepthLayerId ?? displaySettings.activeDepthLayerId, waterColumnConfig);
  const operational = buildOperationalDepthLayerViewModel({
    waterColumnConfig,
    bottomBoundary,
    grid,
    coordinateSystem: baseViewModel.coordinateSystem,
    verticalDisplayMode,
    activeDepthLayerId,
    visibleLayerIds: waterColumnUi.visibleLayerIds,
    hiddenLayerIds: waterColumnUi.hiddenLayerIds,
    globalOpacity: waterColumnUi.globalOpacity,
    activeLayerEmphasis: waterColumnUi.activeLayerEmphasis,
    layerFields,
    layerCurrents,
    currentField: baseViewModel.vectorFieldLayer
  });
  const coordinateSystem = baseViewModel.coordinateSystem ? { ...baseViewModel.coordinateSystem, verticalExaggeration } : baseViewModel.coordinateSystem;
  const coordinateModel = createVolumetricMissionCoordinateModel({
    coordinateSystem,
    verticalDisplayMode,
    depthLayers: operational.layers
  });
  const plannedRoutes = (baseViewModel.routes ?? []).map((route) => ({
    ...route,
    diveProfileId: diveProfileForRoute(route, plan, mission, waterColumnConfig),
    targetDepthLayerId: targetLayerForRoute(route, activeDepthLayerId),
    maximumDepthMeters: Number(waterColumnUi.maximumDiveDepthMeters ?? 0) || null,
    cycleCount: Number(waterColumnUi.cycleCount ?? 0) || null,
    sampleIntervalSeconds: Number(waterColumnUi.sampleIntervalSeconds ?? 0) || null
  }));
  const scienceTargets = baseViewModel.scienceTargets ?? options.scienceTargets ?? plan?.scienceTargets ?? [];
  const plannedDiveSegments = buildPlannedDiveSegmentsForRoutes({
    routes: plannedRoutes,
    waterColumnConfig,
    bottomBoundary,
    vectorFieldLayer: baseViewModel.vectorFieldLayer,
    layerFields,
    activeDepthLayerId,
    level,
    requestedMaximumDepthMeters: Number(waterColumnUi.maximumDiveDepthMeters ?? 0) || null,
    cycleCount: Number(waterColumnUi.cycleCount ?? 0) || null,
    sampleIntervalSeconds: Number(waterColumnUi.sampleIntervalSeconds ?? 0) || null,
    scienceTargets
  });
  const predictedDiveTrajectories = plannedDiveSegments.map(plannedSegmentToDiveTrajectory).filter((trajectory) => trajectory.points.length >= 2);
  const realizedDiveTrajectories = buildRealizedTrajectories(baseViewModel, waterColumnConfig);
  const observations = depthAwareObservations(baseViewModel.observations ?? [], waterColumnConfig);
  const samplePoints = observations.map((observation) => ({ ...observation, kind: 'samplePoint' }));
  const gliderPoses = depthAwareGliderPoses(baseViewModel.gliders ?? [], realizedDiveTrajectories, waterColumnConfig);
  const selectedDepthCell = buildSelectedDepthCell({
    baseViewModel,
    activeDepthLayerId,
    operational,
    bottomBoundary,
    layerFields,
    layerCurrents,
    selectedFieldId: waterColumnUi.selectedScalarFieldId ?? baseViewModel.scalarFieldLayer?.id ?? 'sampleValue'
  });
  const warnings = [
    ...(baseViewModel.warnings ?? []),
    ...(operational.warnings ?? []),
    ...(bottomBoundary.warnings ?? [])
  ];
  return {
    ...baseViewModel,
    version: baseViewModel.version ?? VOLUMETRIC_MISSION_WORLD_VIEW_MODEL_VERSION,
    volumetricVersion: VOLUMETRIC_MISSION_WORLD_VIEW_MODEL_VERSION,
    coordinateModel,
    verticalExaggeration,
    verticalDisplayMode,
    waterColumnConfig,
    waterColumnConfigSource: configSummary.source,
    waterColumnConfigVersion: configSummary.configVersion,
    waterColumnFallbackUsed: legacySurfaceOnlyFallback,
    waterColumnFallbackReason: waterColumnConfig.compatibility?.fallbackReason ?? null,
    modernMissionExpectedVolumetric: configSummary.modernMissionExpectedVolumetric === true,
    waterSurface: baseViewModel.waterSurface ?? { id: 'waterSurface', label: 'Water Surface', elevation: 0, visible: true },
    depthLayers: operational.layers,
    operationalDepthLayerModel: operational,
    bottomBoundary,
    activeDepthLayerId,
    selectedFieldId: waterColumnUi.selectedScalarFieldId ?? baseViewModel.scalarFieldLayer?.id ?? 'sampleValue',
    layerFields,
    layerCurrents,
    layerMasks: operational.validDepthMask,
    plannedRoutes,
    scienceTargets,
    plannedDiveSegments,
    predictedDiveTrajectories,
    realizedDiveTrajectories,
    gliderPoses,
    observations,
    samplePoints,
    selectedCellDepth: selectedDepthCell,
    selectedDepthCell,
    selectedRouteSegment: options.selectedRouteSegment ?? null,
    selectedGlider: gliderPoses.find((pose) => pose.selected) ?? gliderPoses[0] ?? null,
    visibility: {
      ...(baseViewModel.visibility ?? {}),
      depthLayers: baseViewModel.visibility?.depthLayers !== false,
      waterColumn: true,
      activeLayerOnlyCurrents: waterColumnUi.currentDisplayMode === 'activeLayerOnly'
    },
    warnings,
    boundaryFlags: {
      ...(baseViewModel.boundaryFlags ?? {}),
      usesFree3DPlanning: false,
      usesHorizontalWaypoints: true,
      usesDiveProfiles: true,
      ownsSimulation: false,
      ownsSimulationState: false,
      ownsScoring: false,
      ownsPlanning: false,
      changesCanonicalDepth: false,
      changesOfficialBrowserScoring: false,
      usesWebGPUFluid: false,
      usesNewPlanner: false,
      explicitWaterColumnConfig: Boolean(explicitWaterColumnConfig),
      waterColumnConfigSource: configSummary.source,
      waterColumnConfigVersion: configSummary.configVersion,
      waterColumnFallbackUsed: legacySurfaceOnlyFallback,
      waterColumnFallbackReason: waterColumnConfig.compatibility?.fallbackReason ?? null,
      modernMissionExpectedVolumetric: configSummary.modernMissionExpectedVolumetric === true,
      legacySurfaceOnlyFallback
    }
  };
}

export function validateVolumetricMissionWorldViewModel(model = {}) {
  const errors = [];
  const warnings = [...(model.warnings ?? [])];
  if (!Array.isArray(model.depthLayers) || !model.depthLayers.length) errors.push('Volumetric mission view model needs depthLayers.');
  if (model.boundaryFlags?.usesFree3DPlanning) errors.push('Volumetric mission view model must not enable free 3D planning.');
  if (model.boundaryFlags?.ownsSimulation || model.boundaryFlags?.ownsSimulationState) errors.push('Volumetric mission view model must not own simulation.');
  if (model.boundaryFlags?.ownsScoring) errors.push('Volumetric mission view model must not own scoring.');
  if (model.boundaryFlags?.ownsPlanning) errors.push('Volumetric mission view model must not own planning.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings, summary: volumetricMissionWorldViewModelSummary(model) };
}

export function volumetricMissionWorldViewModelSummary(model = {}) {
  return {
    type: 'anchor.rendering.volumetric-mission-world-summary',
    version: VOLUMETRIC_MISSION_WORLD_VIEW_MODEL_VERSION,
    verticalDisplayMode: model.verticalDisplayMode ?? null,
    activeDepthLayerId: model.activeDepthLayerId ?? null,
    selectedFieldId: model.selectedFieldId ?? null,
    depthLayerCount: model.depthLayers?.length ?? 0,
    visibleDepthLayerCount: (model.depthLayers ?? []).filter((layer) => layer.visible !== false).length,
    plannedDiveSegmentCount: model.plannedDiveSegments?.length ?? 0,
    scienceTargetCount: model.scienceTargets?.length ?? 0,
    plannedDiveSegmentSummaries: (model.plannedDiveSegments ?? []).map(plannedDiveSegmentViewModelSummary),
    predictedTrajectoryCount: model.predictedDiveTrajectories?.length ?? 0,
    predictedTrajectoryPointCount: (model.predictedDiveTrajectories ?? []).reduce((sum, item) => sum + (item.points?.length ?? 0), 0),
    realizedTrajectoryCount: model.realizedDiveTrajectories?.length ?? 0,
    realizedTrajectoryPointCount: (model.realizedDiveTrajectories ?? []).reduce((sum, item) => sum + (item.points?.length ?? 0), 0),
    observationCount: model.observations?.length ?? 0,
    samplePointCount: model.samplePoints?.length ?? 0,
    operationalDepthLayers: operationalDepthLayerViewModelSummary(model.operationalDepthLayerModel ?? {}),
    bottomBoundary: bottomBoundaryViewModelSummary(model.bottomBoundary ?? {}),
    predictedDiveSummaries: (model.predictedDiveTrajectories ?? []).map(diveTrajectoryViewModelSummary),
    selectedPlannedDiveSegment: plannedDiveSegmentViewModelSummary((model.plannedDiveSegments ?? [])[0] ?? {}),
    displayMetadataOnly: model.coordinateModel?.displayMetadataOnly === true,
    verticalExaggeration: model.verticalExaggeration ?? model.coordinateSystem?.verticalExaggeration ?? null,
    usesFree3DPlanning: model.boundaryFlags?.usesFree3DPlanning === true,
    usesHorizontalWaypoints: model.boundaryFlags?.usesHorizontalWaypoints !== false,
    usesDiveProfiles: model.boundaryFlags?.usesDiveProfiles !== false,
    ownsPlanning: model.boundaryFlags?.ownsPlanning === true,
    ownsSimulation: model.boundaryFlags?.ownsSimulation === true || model.boundaryFlags?.ownsSimulationState === true,
    ownsScoring: model.boundaryFlags?.ownsScoring === true,
    changesCanonicalDepth: model.boundaryFlags?.changesCanonicalDepth === true,
    changesOfficialBrowserScoring: model.boundaryFlags?.changesOfficialBrowserScoring === true,
    publicSafe: model.boundaryFlags?.includesHiddenTruth !== true,
    explicitWaterColumnConfig: model.boundaryFlags?.explicitWaterColumnConfig === true,
    waterColumnConfigSource: model.boundaryFlags?.waterColumnConfigSource ?? model.waterColumnConfigSource ?? model.waterColumnConfig?.source ?? null,
    waterColumnConfigVersion: model.boundaryFlags?.waterColumnConfigVersion ?? model.waterColumnConfigVersion ?? model.waterColumnConfig?.defaultsVersion ?? model.waterColumnConfig?.version ?? null,
    waterColumnFallbackUsed: model.boundaryFlags?.waterColumnFallbackUsed === true || model.boundaryFlags?.legacySurfaceOnlyFallback === true,
    waterColumnFallbackReason: model.boundaryFlags?.waterColumnFallbackReason ?? model.waterColumnFallbackReason ?? null,
    legacySurfaceOnlyFallback: model.boundaryFlags?.legacySurfaceOnlyFallback === true,
    modernMissionExpectedVolumetric: model.boundaryFlags?.modernMissionExpectedVolumetric === true,
    warnings: [...(model.warnings ?? [])]
  };
}

export function waterColumnRenderDebugPayload(viewModel = {}, rendererSummary = null, options = {}) {
  const volumetricSummary = volumetricMissionWorldViewModelSummary(viewModel);
  const operationalSummary = volumetricSummary.operationalDepthLayers ?? operationalDepthLayerViewModelSummary(viewModel.operationalDepthLayerModel ?? {});
  const bottomSummary = volumetricSummary.bottomBoundary ?? bottomBoundaryViewModelSummary(viewModel.bottomBoundary ?? {});
  const depthLayers = viewModel.depthLayers ?? [];
  const visibleDepthLayers = depthLayers.filter((layer) => layer.visible !== false && layer.id !== 'waterSurface');
  const visibleWorldYValues = visibleDepthLayers.map((layer) => Number(viewModel.verticalDisplayMode === 'explodedLayers' ? layer.explodedWorldY : layer.physicalWorldY)).filter(Number.isFinite);
  const separation = layerSeparationMetrics(visibleWorldYValues, visibleDepthLayers.map((layer) => layer.id));
  const selectedDepthCell = viewModel.selectedDepthCell ?? viewModel.selectedCellDepth ?? null;
  const selectedRoute = viewModel.plannedRoutes?.[0] ?? null;
  const boundary = viewModel.boundaryFlags ?? {};
  const slabSummary = rendererSummary?.operationalDepthSlabSummary ?? {};
  const displayDigest = volumetricDisplayStateDigest(viewModel);
  const physicalExplodedStateDigestMatch = options.physicalExplodedStateDigestMatch ?? Boolean(displayDigest);
  return {
    type: 'anchor.renderer.water-column-debug',
    version: VOLUMETRIC_MISSION_WORLD_VIEW_MODEL_VERSION,
    phase: options.phase ?? viewModel.phase ?? null,
    configSource: volumetricSummary.waterColumnConfigSource ?? viewModel.waterColumnConfig?.source ?? null,
    configVersion: volumetricSummary.waterColumnConfigVersion ?? viewModel.waterColumnConfig?.defaultsVersion ?? viewModel.waterColumnConfig?.version ?? null,
    fallbackUsed: volumetricSummary.waterColumnFallbackUsed === true,
    fallbackReason: volumetricSummary.waterColumnFallbackReason ?? null,
    verticalDisplayMode: viewModel.verticalDisplayMode ?? null,
    verticalScale: viewModel.coordinateModel?.verticalScale ?? ((viewModel.coordinateSystem?.depthScale ?? null) === null ? null : Number(viewModel.coordinateSystem?.depthScale ?? 0) * Number(viewModel.coordinateSystem?.verticalExaggeration ?? 1)),
    verticalExaggeration: viewModel.verticalExaggeration ?? viewModel.coordinateSystem?.verticalExaggeration ?? 1,
    canonicalDepthDigest: canonicalDepthDigest(viewModel),
    displayDepthDigest: displayDepthDigest(viewModel),
    activeDepthLayerId: viewModel.activeDepthLayerId ?? null,
    canonicalLayerCount: operationalSummary.canonicalLayerCount ?? viewModel.waterColumnConfig?.depthLayerIds?.length ?? 0,
    availableLayerCount: operationalSummary.layerCount ?? depthLayers.length,
    visibleLayerCount: visibleDepthLayers.length,
    interactiveLayerCount: visibleDepthLayers.filter((layer) => layer.interactive !== false).length,
    layerIds: operationalSummary.layerIds ?? depthLayers.map((layer) => layer.id),
    visibleLayerIds: visibleDepthLayers.map((layer) => layer.id),
    layerDepthMeters: operationalSummary.layerDepthMeters ?? Object.fromEntries(depthLayers.map((layer) => [layer.id, layer.representativeDepthMeters])),
    layerWorldY: operationalSummary.layerWorldY ?? Object.fromEntries(depthLayers.map((layer) => [layer.id, layer.physicalWorldY])),
    slabObjectCount: rendererSummary?.slabObjectCount ?? slabSummary.slabObjectCount ?? slabSummary.slabCount ?? 0,
    slabTextureCount: rendererSummary?.slabTextureCount ?? slabSummary.slabTextureCount ?? slabSummary.textureCount ?? 0,
    slabLabelCount: rendererSummary?.slabLabelCount ?? slabSummary.slabLabelCount ?? slabSummary.labelCount ?? 0,
    volumeFrameObjectCount: rendererSummary?.volumeFrameObjectCount ?? 0,
    depthTickCount: rendererSummary?.depthTickCount ?? 0,
    uniqueLayerWorldYCount: separation.uniqueCount,
    minimumLayerWorldYSeparation: separation.minimumSeparation,
    maximumLayerWorldYSeparation: separation.maximumSeparation,
    waterColumnVolumeHeightWorld: separation.volumeHeight,
    coplanarLayerPairs: separation.coplanarPairs,
    selectedDepthCell,
    selectedDepthLayerId: selectedDepthCell?.depthLayerId ?? viewModel.activeDepthLayerId ?? null,
    selectedDepthMeters: selectedDepthCell?.depthMeters ?? null,
    selectedDiveProfileId: options.selectedDiveProfileId ?? selectedRoute?.diveProfileId ?? viewModel.waterColumnConfig?.diveProfileId ?? null,
    selectedTargetDepthLayerId: options.selectedTargetDepthLayerId ?? selectedRoute?.targetDepthLayerId ?? viewModel.activeDepthLayerId ?? null,
    plannedDiveSegmentCount: volumetricSummary.plannedDiveSegmentCount ?? 0,
    scienceTargetCount: volumetricSummary.scienceTargetCount ?? viewModel.scienceTargets?.length ?? 0,
    selectedPlannedDiveSegment: volumetricSummary.selectedPlannedDiveSegment ?? null,
    predictedTrajectoryPointCount: volumetricSummary.predictedTrajectoryPointCount ?? 0,
    realizedTrajectoryPointCount: volumetricSummary.realizedTrajectoryPointCount ?? 0,
    canonicalObservationCount: options.canonicalObservationCount ?? viewModel.observations?.length ?? 0,
    threeObservationCount: rendererSummary?.observationObjectCount ?? viewModel.observations?.length ?? 0,
    validDepthMaskCounts: operationalSummary.waterCellCounts ?? {},
    maskedBySeabedCounts: viewModel.operationalDepthLayerModel?.maskedBySeabedCounts ?? {},
    currentVectorObjectCount: rendererSummary?.currentVectorObjectCount ?? 0,
    fieldTextureCount: rendererSummary?.slabTextureCount ?? 0,
    bottomBoundaryAvailable: Boolean(viewModel.bottomBoundary?.bottomDepthField),
    bottomBoundaryWorldY: separation.bottomBoundaryWorldY,
    bottomDepthRange: bottomSummary.depthRange ?? { min: bottomSummary.minimumDepth ?? viewModel.bottomBoundary?.minimumDepth ?? null, max: bottomSummary.maximumDepth ?? viewModel.bottomBoundary?.maximumDepth ?? null },
    physicalExplodedStateDigestMatch,
    displayStateDigest: displayDigest,
    explicitWaterColumnConfig: boundary.explicitWaterColumnConfig === true,
    legacySurfaceOnlyFallback: boundary.legacySurfaceOnlyFallback === true,
    defaultDisplayModeApplied: options.defaultDisplayModeApplied ?? (viewModel.displayDefaults?.waterColumnApplied === true) ?? false,
    cameraPresetId: options.cameraPresetId ?? rendererSummary?.camera?.preset ?? null,
    modernMissionExpectedVolumetric: boundary.modernMissionExpectedVolumetric === true,
    modernMissionActuallyVolumetric: boundary.modernMissionExpectedVolumetric === true && boundary.waterColumnFallbackUsed !== true && (operationalSummary.canonicalLayerCount ?? 0) > 1 && visibleDepthLayers.length > 1,
    usesFree3DPlanning: boundary.usesFree3DPlanning === true,
    usesHorizontalWaypoints: boundary.usesHorizontalWaypoints !== false,
    usesDiveProfiles: boundary.usesDiveProfiles !== false,
    ownsSimulation: boundary.ownsSimulation === true || boundary.ownsSimulationState === true,
    ownsPlanning: boundary.ownsPlanning === true,
    ownsScoring: boundary.ownsScoring === true,
    changesCanonicalDepth: boundary.changesCanonicalDepth === true,
    changesOfficialBrowserScoring: boundary.changesOfficialBrowserScoring === true,
    usesWebGPUFluid: boundary.usesWebGPUFluid === true,
    usesNewPlanner: boundary.usesNewPlanner === true,
    lifecycleCleanupErrorCount: Number(options.lifecycleCleanupErrorCount ?? 0),
    publicSafe: boundary.includesHiddenTruth !== true
  };
}

export function volumetricDisplayStateDigest(model = {}) {
  return JSON.stringify({
    plan: digestRoutes(model.plannedRoutes ?? model.routes ?? []),
    profiles: (model.predictedDiveTrajectories ?? []).map((trajectory) => ({ id: trajectory.id, profile: trajectory.diveProfileId, target: trajectory.targetDepthLayerId, maxDepth: trajectory.maximumDepthMeters })),
    plannedDiveSegments: (model.plannedDiveSegments ?? []).map((segment) => ({ id: segment.segmentId, profile: segment.diveProfileId, target: segment.targetDepthLayerId, cycles: segment.cycleCount, pointCount: segment.predictedDivePath?.length ?? 0 })),
    scienceTargets: (model.scienceTargets ?? []).map((target) => ({ id: target.id ?? target.targetId, x: target.x ?? target.position?.x, y: target.y ?? target.position?.y, depthMeters: target.depthMeters ?? target.position?.depthMeters, depthLayerId: target.depthLayerId, attachedSegmentIds: target.attachedSegmentIds ?? [] })),
    observations: (model.observations ?? []).map((observation) => ({ id: observation.id, x: observation.x, y: observation.y, depthMeters: observation.depthMeters, depthLayerId: observation.depthLayerId })),
    gliders: (model.gliderPoses ?? []).map((pose) => ({ id: pose.agentId, x: pose.x, y: pose.y, depthMeters: pose.depthMeters, depthLayerId: pose.depthLayerId })),
    boundaryFlags: model.boundaryFlags
  });
}

function plannedSegmentToDiveTrajectory(segment = {}) {
  return {
    type: 'anchor.rendering.dive-trajectory-view-model',
    version: segment.version,
    trajectoryKind: 'predicted',
    id: `${segment.segmentId}-predicted-dive`,
    routeId: segment.segmentId,
    routeSegmentId: segment.segmentId,
    segmentId: segment.segmentId,
    agentId: segment.agentId ?? null,
    diveProfileId: segment.diveProfileId ?? null,
    targetDepthLayerId: segment.targetDepthLayerId ?? null,
    maximumDepthMeters: segment.achievableMaximumDepthMeters ?? null,
    points: segment.predictedDivePath ?? [],
    start: segment.predictedDivePath?.[0] ?? null,
    targetDepth: segment.achievableMaximumDepthMeters ?? null,
    bottomTurn: segment.bottomTurns?.[0] ?? null,
    bottomTurns: segment.bottomTurns ?? [],
    surfacingPoint: segment.predictedSurfacingPosition ?? segment.predictedDivePath?.at?.(-1) ?? null,
    layerCrossings: segment.layerCrossings ?? [],
    predictedSampleLocations: segment.predictedSamples ?? [],
    warningCodes: segment.warningCodes ?? [],
    warnings: segment.warnings ?? [],
    ownsPlanning: false,
    ownsSimulation: false,
    ownsScoring: false,
    usesFull3DPlanning: false,
    publicSafe: true
  };
}
function buildLayerFields({ baseViewModel, waterColumnConfig, grid, selectedFieldId }) {
  const scalar = baseViewModel.scalarFieldLayer ?? {};
  const baseValues = normalize2dField(scalar.values, grid, 0);
  const selected = selectedFieldId ?? scalar.id ?? 'sampleValue';
  const byField = { [selected]: {}, sampleValue: {}, A_global_depth: {}, A_global_topdown: baseValues };
  waterColumnConfig.depthLayerIds.forEach((id, index) => {
    const factor = layerScalarFactor(id, index);
    const values = baseValues.map((row) => row.map((value) => value == null ? null : round(Number(value) * factor)));
    byField[selected][id] = { id: selected, depthLayerId: id, values, width: grid.width, height: grid.height, min: scalar.min ?? 0, max: scalar.max ?? 1, opacity: scalar.opacity ?? 0.72, sourceVisibility: scalar.sourceVisibility ?? 'publicScenario' };
    byField.sampleValue[id] = byField[selected][id];
    byField.A_global_depth[id] = values;
  });
  byField.integratedWaterColumn = { id: 'A_global_topdown', depthLayerId: 'integratedWaterColumn', values: baseValues, width: grid.width, height: grid.height, min: scalar.min ?? 0, max: scalar.max ?? 1, opacity: scalar.opacity ?? 0.72, sourceVisibility: scalar.sourceVisibility ?? 'publicScenario' };
  return byField;
}

function buildLayerCurrents({ baseViewModel, waterColumnConfig }) {
  const vectors = baseViewModel.vectorFieldLayer?.vectors ?? [];
  return Object.fromEntries(waterColumnConfig.depthLayerIds.map((id, index) => [id, {
    id: `current-${id}`,
    depthLayerId: id,
    vectors: vectors.map((vector) => ({ ...vector, id: `${vector.id ?? 'current'}-${id}`, depthLayerId: id, z: index, w: verticalCurrentCue(id, vector), magnitude: round(Math.hypot(Number(vector.u ?? 0), Number(vector.v ?? 0), Number(verticalCurrentCue(id, vector)))) }))
  }]));
}

function buildRealizedTrajectories(baseViewModel, waterColumnConfig) {
  const records = [...(baseViewModel.realizedTrajectories ?? []), ...(baseViewModel.sampledTrajectories ?? [])];
  return records.map((trajectory) => buildRealizedDiveTrajectory({ ...trajectory, waterColumnConfig, diveProfileId: trajectory.diveProfileId })).filter((trajectory) => trajectory.points.length > 0);
}

function depthAwareObservations(observations, waterColumnConfig) {
  return observations.map((observation, index) => {
    const depthLayerId = observation.depthLayerId ?? observation.depthLayer ?? waterColumnConfig.depthLayerIds[Math.min(index, waterColumnConfig.depthLayerIds.length - 1)] ?? 'surface';
    const depthMeters = finiteNumber(observation.depthMeters, waterColumnLayerMetadata(depthLayerId).nominalDepthMeters ?? 0);
    return { ...observation, depthLayerId, depthLayer: depthLayerId, depthMeters, z: -depthMeters, hiddenTruthIncluded: false, sourceVisibility: observation.sourceVisibility ?? 'publicResult' };
  });
}

function depthAwareGliderPoses(gliders, realizedDiveTrajectories, waterColumnConfig) {
  return gliders.map((glider) => {
    const trajectory = realizedDiveTrajectories.find((candidate) => candidate.agentId === glider.agentId || candidate.agentId === glider.id);
    const last = trajectory?.points?.at(-1);
    const depthLayerId = glider.depthLayerId ?? last?.depthLayerId ?? waterColumnConfig.depthLayerIds[0] ?? 'surface';
    const depthMeters = finiteNumber(glider.depthMeters, last?.depthMeters ?? waterColumnLayerMetadata(depthLayerId).nominalDepthMeters ?? 0);
    return { ...glider, depthLayerId, depthMeters, z: -depthMeters, divePhase: last?.phase ?? (depthMeters > 0 ? 'submerged' : 'surface') };
  });
}

function buildSelectedDepthCell({ baseViewModel, activeDepthLayerId, operational, bottomBoundary, layerFields, layerCurrents, selectedFieldId }) {
  const selected = baseViewModel.selectedCell ?? baseViewModel.selection?.selectedCell ?? baseViewModel.interactionViewModel?.hoveredCell ?? null;
  if (!selected) return null;
  const col = Math.round(Number(selected.col ?? selected.x));
  const row = Math.round(Number(selected.row ?? selected.y));
  const layer = operational.layers.find((candidate) => candidate.id === activeDepthLayerId) ?? operational.layers.find((candidate) => candidate.interactive) ?? operational.layers[0];
  const valid = layer?.validCellMask?.[row]?.[col] === true;
  const bottomDepth = Number(bottomBoundary.bottomDepthField?.[row]?.[col] ?? 0);
  const depthMeters = Number(layer?.representativeDepthMeters ?? 0);
  const field = layerFields?.[selectedFieldId]?.[layer?.id]?.values ?? layerFields?.sampleValue?.[layer?.id]?.values ?? layerFields?.integratedWaterColumn?.values ?? [];
  const vector = (layerCurrents?.[layer?.id]?.vectors ?? []).find((candidate) => Math.round(candidate.x) === col && Math.round(candidate.y) === row) ?? null;
  return {
    col,
    row,
    x: col,
    y: row,
    depthLayerId: layer?.id ?? activeDepthLayerId,
    depthMeters,
    layerName: layer?.label ?? activeDepthLayerId,
    localBottomDepthMeters: bottomDepth,
    bottomClearanceMeters: round(bottomDepth - depthMeters),
    valid,
    inaccessibleReason: valid ? null : bottomBoundary.landMask?.[row]?.[col] ? 'land' : bottomDepth < depthMeters ? 'belowSeabed' : 'outsideOperationalDomain',
    scalarValue: numberOrNull(field?.[row]?.[col]),
    samplingPriority: numberOrNull(layerFields?.A_global_depth?.[layer?.id]?.[row]?.[col]),
    belief: null,
    uncertainty: null,
    currentU: numberOrNull(vector?.u),
    currentV: numberOrNull(vector?.v),
    currentW: numberOrNull(vector?.w),
    speed: vector ? round(Math.hypot(Number(vector.u ?? 0), Number(vector.v ?? 0), Number(vector.w ?? 0))) : null,
    hazard: null,
    lastSampleTime: null,
    observationCount: 0,
    hiddenTruthIncluded: false,
    publicSafe: true
  };
}

function diveProfileForRoute(route, plan, mission, waterColumnConfig) {
  const agentPlan = (plan?.agentPlans ?? []).find((candidate) => candidate.agentId === route.agentId);
  const agent = (mission?.agents ?? []).find((candidate) => candidate.id === route.agentId || candidate.agentId === route.agentId);
  return route.diveProfileId ?? agentPlan?.diveProfileId ?? agent?.diveProfileId ?? waterColumnConfig.diveProfileId ?? 'surfaceOnly';
}

function targetLayerForRoute(route, activeDepthLayerId) {
  return route.targetDepthLayerId ?? route.points?.find((point) => point.targetDepthLayerId)?.targetDepthLayerId ?? activeDepthLayerId;
}

function normalizeActiveLayer(value, config) {
  const text = String(value ?? '').trim();
  if (config.depthLayerIds.includes(text) || text === 'integratedWaterColumn') return text;
  return config.depthLayerIds.includes('thermocline') ? 'thermocline' : config.depthLayerIds[0] ?? 'surface';
}

function normalizeVerticalDisplayMode(value) {
  return value === 'explodedLayers' ? 'explodedLayers' : 'physicalDepth';
}

function normalize2dField(values, grid, fallback = 0) {
  return Array.from({ length: grid.height }, (_row, y) => Array.from({ length: grid.width }, (_cell, x) => {
    const value = Number(values?.[y]?.[x]);
    return Number.isFinite(value) ? value : fallback;
  }));
}

function layerScalarFactor(id, index) {
  if (id === 'surface') return 1;
  if (id === 'shallow') return 0.93;
  if (id === 'thermocline') return 1.12;
  if (id === 'midwater') return 0.84;
  if (id === 'deep') return 0.76;
  return Math.max(0.55, 1 - index * 0.08);
}

function verticalCurrentCue(id, vector) {
  const base = Number(vector.w ?? 0);
  if (Number.isFinite(base) && Math.abs(base) > 0) return base;
  if (id === 'thermocline') return 0.035;
  if (id === 'deep') return -0.025;
  return 0;
}

function digestRoutes(routes) {
  return routes.map((route) => ({ id: route.id, agentId: route.agentId, points: (route.points ?? []).map((point) => ({ x: point.x, y: point.y })) }));
}

function finiteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function numberOrNull(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function round(value, digits = 6) {
  return Number(Number(value ?? 0).toFixed(digits));
}




function layerSeparationMetrics(worldYValues = [], layerIds = []) {
  const rounded = worldYValues.map((value) => round(value, 6));
  const unique = [...new Set(rounded)];
  const sorted = [...unique].sort((a, b) => a - b);
  const separations = [];
  for (let index = 1; index < sorted.length; index += 1) separations.push(round(Math.abs(sorted[index] - sorted[index - 1]), 6));
  const coplanarPairs = [];
  for (let i = 0; i < rounded.length; i += 1) {
    for (let j = i + 1; j < rounded.length; j += 1) {
      if (Math.abs(rounded[i] - rounded[j]) <= 1e-6) coplanarPairs.push([layerIds[i], layerIds[j]]);
    }
  }
  const min = sorted.length ? Math.min(...sorted) : 0;
  const max = sorted.length ? Math.max(...sorted) : 0;
  return {
    uniqueCount: unique.length,
    minimumSeparation: separations.length ? Math.min(...separations) : 0,
    maximumSeparation: separations.length ? Math.max(...separations) : 0,
    volumeHeight: round(Math.abs(max - min), 6),
    bottomBoundaryWorldY: round(min - 0.45, 6),
    coplanarPairs
  };
}

function canonicalDepthDigest(model = {}) {
  return JSON.stringify({
    targets: (model.scienceTargets ?? []).map((target) => ({ id: target.id ?? target.targetId, depthMeters: target.depthMeters ?? target.position?.depthMeters, depthLayerId: target.depthLayerId })),
    segments: (model.plannedDiveSegments ?? []).map((segment) => ({ id: segment.segmentId, maxDepth: segment.achievableMaximumDepthMeters, targetLayer: segment.targetDepthLayerId }))
  });
}

function displayDepthDigest(model = {}) {
  return JSON.stringify({
    verticalDisplayMode: model.verticalDisplayMode ?? null,
    verticalExaggeration: model.verticalExaggeration ?? model.coordinateSystem?.verticalExaggeration ?? null,
    layerWorldY: model.coordinateModel?.layerWorldY ?? {},
    selectedTargetWorldY: (model.scienceTargets ?? []).map((target) => ({ id: target.id ?? target.targetId, depthMeters: target.depthMeters ?? target.position?.depthMeters }))
  });
}