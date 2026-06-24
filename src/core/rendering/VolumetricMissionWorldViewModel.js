import { normalizeWaterColumnConfig, waterColumnLayerMetadata } from '../science/WaterColumnSchema.js';
import { resolveEffectiveDiveProfile } from '../motion/EffectiveDiveProfileResolver.js';
import { buildMissionRouteSegments, missionRouteSegmentSummary } from '../planning/MissionRouteSegment.js';
import { buildLegacySurfaceOnlyWaterColumnConfig, isLegacySurfaceOnlyMission, waterColumnMissionConfigSummary } from '../science/WaterColumnMissionDefaults.js';
import { buildBottomBoundaryViewModel, bottomBoundaryViewModelSummary } from './BottomBoundaryViewModel.js';
import { buildOperationalDepthLayerViewModel, operationalDepthLayerViewModelSummary } from './OperationalDepthLayerViewModel.js';
import { createVolumetricMissionCoordinateModel } from './VolumetricMissionCoordinates.js';
import { buildRealizedDiveTrajectory, diveTrajectoryViewModelSummary } from './DiveTrajectoryViewModel.js';
import {
  buildPlannedDiveSegmentsForRoutes,
  plannedDiveSegmentViewModelSummary
} from './PlannedDiveSegmentViewModel.js';
import {
  buildWaterColumnLayerExplorerViewModel,
  waterColumnLayerExplorerSummary
} from './WaterColumnLayerExplorerViewModel.js';
import {
  currentSourceTimeFrameSignature,
  isExplicitCurrentSafeMode,
  normalizeCurrentDisplayMode as normalizeSharedCurrentDisplayMode,
  resolveCurrentPresentationTimeSeconds
} from './CurrentPresentationState.js';
import { planningTimelineBridgeSummary } from '../time/PlanningTimelineTimeBridge.js';

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
  const renderPhase = options.phase ?? baseViewModel.phase ?? options.options?.phase ?? baseViewModel.options?.phase ?? 'planning';
  const rawActiveTimelineTime = finiteNumber(options.activeTimeSeconds ?? baseViewModel.activeTimeSeconds ?? baseViewModel.simulationStatus?.timeSeconds, 0);
  const planningTimelineTimeBridge = planningTimelineBridgeSummary(level, rawActiveTimelineTime, {
    phase: renderPhase,
    simulationStatus: options.simulationStatus ?? baseViewModel.simulationStatus ?? null,
    timeSeconds: options.simulationState?.timeSeconds ?? baseViewModel.simulationState?.timeSeconds ?? null
  });
  const canonicalActiveTimeSeconds = planningTimelineTimeBridge.currentPresentationTimeSeconds;
  const currentPresentationTimeSeconds = resolveCurrentPresentationTimeSeconds({
    ...baseViewModel,
    activeTimeSeconds: canonicalActiveTimeSeconds,
    currentActiveTimeSeconds: baseViewModel.currentActiveTimeSeconds ?? canonicalActiveTimeSeconds,
    currentPresentationTimeSeconds: canonicalActiveTimeSeconds,
    simulationStatus: options.simulationStatus ?? baseViewModel.simulationStatus
  }, canonicalActiveTimeSeconds);
  const allLayerFieldTexturesEnabled = waterColumnUi.fieldDisplayMode === 'allLayers' || waterColumnUi.showFieldOnAllLayers === true;
  const verticalExaggeration = finiteNumber(waterColumnUi.verticalExaggeration ?? displaySettings.verticalExaggeration ?? baseViewModel.coordinateSystem?.verticalExaggeration, 1);
  const verticalDisplayMode = normalizeVerticalDisplayMode(waterColumnUi.verticalDisplayMode ?? displaySettings.verticalDisplayMode ?? waterColumnConfig.defaultDisplayMode);
  const bottomBoundary = buildBottomBoundaryViewModel({ level, grid, bathymetry: options.bathymetry ?? level?.bathymetry ?? null });
  const layerFields = buildLayerFields({ baseViewModel, waterColumnConfig, grid, selectedFieldId: waterColumnUi.selectedScalarFieldId ?? displaySettings.selectedScalarFieldId });
  const layerCurrents = buildLayerCurrents({ baseViewModel, waterColumnConfig });
  const activeDepthLayerId = normalizeActiveLayer(waterColumnUi.activeDepthLayerId ?? displaySettings.activeDepthLayerId, waterColumnConfig);
  const currentActiveDepthLayerId = resolveActiveDepthLayerForCurrent({
    requestedLayerId: activeDepthLayerId,
    waterColumnUi,
    baseViewModel,
    waterColumnConfig
  });
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
  const routeSegments = buildMissionRouteSegments(plan, { level, mission, waterColumnConfig });
  const segmentFlightPlans = routeSegments.map((segment) => segment.flightProfile).filter(Boolean);
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
    routeSegments,
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
  const waterColumnExplorer = buildWaterColumnLayerExplorerViewModel({
    level,
    mission,
    plan,
    grid,
    baseViewModel,
    waterColumnConfig,
    bottomBoundary,
    operationalDepthLayerModel: operational,
    activeVariable: waterColumnUi.activeVariable ?? waterColumnUi.selectedScalarFieldId ?? displaySettings.selectedScalarFieldId ?? baseViewModel.scalarFieldLayer?.id ?? 'scienceValue',
    activeLayerId: activeDepthLayerId,
    comparisonLayerId: waterColumnUi.comparisonLayerId,
    displayMode: waterColumnUi.layerExplorerMode ?? waterColumnUi.displayMode ?? verticalDisplayMode,
    displaySettings: waterColumnUi,
    activeTimeSeconds: currentPresentationTimeSeconds,
    selectedLocation: baseViewModel.selectedCell ?? baseViewModel.selection?.selectedCell ?? baseViewModel.interactionViewModel?.hoveredCell ?? null
  });
  const selectedDepthCell = buildSelectedDepthCell({
    baseViewModel,
    activeDepthLayerId,
    operational,
    bottomBoundary,
    layerFields,
    layerCurrents,
    selectedFieldId: waterColumnUi.selectedScalarFieldId ?? baseViewModel.scalarFieldLayer?.id ?? 'sampleValue'
  });
  const currentVisualization = buildCurrentVisualizationSummary({
    waterColumnUi,
    waterColumnExplorer,
    activeDepthLayerId: currentActiveDepthLayerId,
    activeTimeSeconds: currentPresentationTimeSeconds,
    showCurrents: displaySettings.showCurrents ?? baseViewModel.visibility?.currentVectors ?? true
  });
  const currentSourceFrameSignature = currentSourceTimeFrameSignature({
    ...baseViewModel,
    waterColumnExplorer,
    currentVisualization,
    activeTimeSeconds: currentPresentationTimeSeconds,
    currentPresentationTimeSeconds
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
    displaySettings: { ...(baseViewModel.displaySettings ?? {}), ...displaySettings, waterColumn: { ...waterColumnUi, qualityProfile: waterColumnUi.qualityProfile ?? displaySettings.qualityProfile ?? 'balanced', fieldDisplayMode: allLayerFieldTexturesEnabled ? 'allLayers' : 'activeLayerOnly', showFieldOnAllLayers: allLayerFieldTexturesEnabled } },
    waterColumn: { ...waterColumnUi, qualityProfile: waterColumnUi.qualityProfile ?? displaySettings.qualityProfile ?? 'balanced', fieldDisplayMode: allLayerFieldTexturesEnabled ? 'allLayers' : 'activeLayerOnly', showFieldOnAllLayers: allLayerFieldTexturesEnabled },
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
    routeSegments,
    segmentFlightPlans,
    scienceTargets,
    plannedDiveSegments,
    predictedDiveTrajectories,
    realizedDiveTrajectories,
    gliderPoses,
    observations,
    samplePoints,
    selectedCellDepth: selectedDepthCell,
    selectedDepthCell,
    waterColumnExplorer,
    currentVisualization,
    currentVisualizationAvailable: currentVisualization.currentVisualizationAvailable,
    currentPresentationRequested: currentVisualization.currentPresentationRequested,
    currentPresentationEnabled: currentVisualization.currentPresentationEnabled,
    currentDisplayMode: currentVisualization.currentDisplayMode,
    currentActiveLayerId: currentVisualization.currentActiveLayerId,
    currentActiveDepthLayerId,
    currentActiveDepthMeters: currentVisualization.currentActiveDepthMeters,
    currentActiveTimeSeconds: currentVisualization.currentActiveTimeSeconds,
    currentPresentationTimeSeconds,
    currentSourceTimeFrameSignature: currentSourceFrameSignature,
    planningTimelineTimeBridge,
    missionTimelineTime: planningTimelineTimeBridge.missionTimelineTime,
    missionTimelineTimeHours: planningTimelineTimeBridge.missionTimelineTimeHours,
    missionTimelineTimeSeconds: planningTimelineTimeBridge.missionTimelineTimeSeconds,
    currentPresentationTimeSource: planningTimelineTimeBridge.sourceTimeAuthority,
    currentVectorSampleCount: currentVisualization.currentVectorSampleCount,
    currentVectorValidCount: currentVisualization.currentVectorValidCount,
    selectedRouteSegment: options.selectedRouteSegment ?? null,
    selectedGlider: gliderPoses.find((pose) => pose.selected) ?? gliderPoses[0] ?? null,
    visibility: {
      ...(baseViewModel.visibility ?? {}),
      depthLayers: baseViewModel.visibility?.depthLayers !== false,
      waterColumn: true,
      activeLayerOnlyFields: !allLayerFieldTexturesEnabled,
      activeLayerOnlyCurrents: ['activeLayerOnly', 'activeSlice', 'activeCurrentSlice'].includes(waterColumnUi.currentDisplayMode ?? 'activeSlice')
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

export function volumetricCurrentDebugPayload(viewModel = {}, rendererSummary = null, options = {}) {
  const explorer = viewModel.waterColumnExplorer ?? {};
  const fieldSummary = explorer.currentFieldSummary ?? {};
  const currentActiveLayerId = viewModel.currentActiveLayerId ?? viewModel.currentVisualization?.currentActiveLayerId ?? explorer.currentActiveLayerId ?? explorer.activeLayerId;
  const activeLayer = (explorer.layers ?? []).find((layer) => layer.id === currentActiveLayerId) ?? explorer.layers?.[0] ?? null;
  const activeVectors = (activeLayer?.currentField?.vectors ?? []).filter((vector) => vector.visible !== false);
  const contextVectors = (explorer.layers ?? []).filter((layer) => layer.id !== activeLayer?.id).reduce((sum, layer) => sum + (layer.currentField?.vectors ?? []).filter((vector) => vector.visible !== false).length, 0);
  const selectedSourceCurrent = selectCurrentSampleForLayer(explorer.selectedCurrentProfile?.samplesByDepth ?? [], activeLayer?.id ?? explorer.activeLayerId);
  const bridge = viewModel.planningTimelineTimeBridge ?? {};
  const selectedRenderedCurrent = selectedSourceCurrent ? { ...selectedSourceCurrent } : null;
  const glider = (viewModel.gliderPoses ?? viewModel.gliders ?? []).find((candidate) => candidate.selected) ?? (viewModel.gliderPoses ?? viewModel.gliders ?? [])[0] ?? null;
  const gliderSampledCurrent = glider?.currentVector ? {
    uEastMetersPerSecond: numberOrNull(glider.currentVector.u),
    vNorthMetersPerSecond: numberOrNull(glider.currentVector.v),
    wDownMetersPerSecond: numberOrNull(glider.currentVector.w) ?? 0,
    depthMeters: numberOrNull(glider.depthMeters),
    timeSeconds: numberOrNull(viewModel.activeTimeSeconds)
  } : null;
  const renderedGliderCurrent = nearestRenderedCurrent(activeLayer?.currentField?.vectors ?? [], glider);
  const currentVisualization = viewModel.currentVisualization ?? {};
  const waterColumnUi = viewModel.waterColumn ?? viewModel.displaySettings?.waterColumn ?? {};
  const allCurrentLayerIds = (explorer.layers ?? []).map((layer) => layer.id).filter(Boolean);
  const hiddenCurrentLayerIds = new Set(Array.isArray(waterColumnUi.hiddenLayerIds) ? waterColumnUi.hiddenLayerIds.map(String) : []);
  const explicitVisibleCurrentLayerIds = Array.isArray(waterColumnUi.visibleLayerIds) && waterColumnUi.visibleLayerIds.length ? new Set(waterColumnUi.visibleLayerIds.map(String)) : null;
  const visibleCurrentLayerIds = allCurrentLayerIds.filter((id) => !hiddenCurrentLayerIds.has(String(id)) && (!explicitVisibleCurrentLayerIds || explicitVisibleCurrentLayerIds.has(String(id))));
  const safeModeExplicit = explicitCurrentSafeMode();
  const presentationRequested = safeModeExplicit ? false : currentVisualization.currentPresentationRequested !== false;
  const presentationEnabled = presentationRequested && rendererSummary?.currentGlyphPresentationFailed !== true && (rendererSummary?.visibleVectorInstanceCount ?? rendererSummary?.glyphInstanceCount ?? 0) > 0;
  const noVisibleVectorsReason = presentationEnabled
    ? null
    : safeModeExplicit
      ? 'Safe Display mode'
      : rendererSummary?.currentGlyphPresentationFailed === true
        ? 'presentation initialization failed'
        : !activeLayer
          ? 'no active layer'
          : activeVectors.length === 0
            ? 'no finite samples'
            : 'current layer outside view or hidden';
  return {
    type: 'anchor.debug.volumetric-current',
    version: 'volumetric-current-debug-flow-r2a',
    fieldId: fieldSummary.fieldId ?? explorer.currentCube?.id ?? null,
    sourceTier: fieldSummary.sourceTier ?? explorer.currentCube?.sourceMetadata?.sourceTier ?? null,
    sourceType: fieldSummary.sourceType ?? explorer.currentCube?.sourceMetadata?.sourceType ?? null,
    equationFamily: fieldSummary.equationFamily ?? explorer.currentCube?.sourceMetadata?.equationFamily ?? null,
    sourceId: fieldSummary.sourceMetadata?.sourceId ?? explorer.currentCube?.sourceMetadata?.sourceId ?? null,
    componentIds: fieldSummary.componentIds ?? explorer.currentCube?.sourceMetadata?.componentIds ?? (explorer.currentCube?.sourceMetadata?.components ?? []).map((component) => component.id).filter(Boolean),
    depthDependent: fieldSummary.depthDependent === true || explorer.currentCube?.sourceMetadata?.depthDependent === true,
    timeDependent: fieldSummary.timeDependent === true || explorer.currentCube?.sourceMetadata?.timeDependent === true,
    usesManufacturedField: (fieldSummary.sourceTier ?? explorer.currentCube?.sourceMetadata?.sourceTier) === 'manufacturedAnalytical',
    usesScientificallyConstrainedSyntheticField: (fieldSummary.sourceTier ?? explorer.currentCube?.sourceMetadata?.sourceTier) === 'scientificallyConstrainedSynthetic',
    usesRealHycom: fieldSummary.usesRealHycom === true,
    usesRealMarineCopernicus: fieldSummary.usesRealMarineCopernicus === true,
    calibratedForecast: fieldSummary.calibratedForecast === true,
    coordinateFrame: fieldSummary.coordinateFrame ?? explorer.currentCube?.coordinateFrame ?? null,
    eastSampleCount: fieldSummary.eastSampleCount ?? explorer.currentCube?.eastAxisMeters?.length ?? 0,
    northSampleCount: fieldSummary.northSampleCount ?? explorer.currentCube?.northAxisMeters?.length ?? 0,
    depthSampleCount: fieldSummary.depthSampleCount ?? explorer.currentCube?.depthAxisMeters?.length ?? 0,
    timeSampleCount: fieldSummary.timeSampleCount ?? explorer.currentCube?.timeAxisSeconds?.length ?? 0,
    sourceDepthCount: fieldSummary.depthSampleCount ?? explorer.currentCube?.depthAxisMeters?.length ?? 0,
    sourceTimeCount: fieldSummary.timeSampleCount ?? explorer.currentCube?.timeAxisSeconds?.length ?? 0,
    sourceDepthMeters: fieldSummary.sourceDepthMeters ?? explorer.currentCube?.depthAxisMeters ?? [],
    sourceTimeSeconds: fieldSummary.sourceTimeSeconds ?? explorer.currentCube?.timeAxisSeconds ?? [],
    temporalBoundaryMode: fieldSummary.temporalBoundaryMode ?? explorer.currentCube?.temporalBoundaryMode ?? explorer.currentCube?.sourceMetadata?.temporalBoundaryMode ?? null,
    temporalPeriodSeconds: fieldSummary.temporalPeriodSeconds ?? explorer.currentCube?.temporalPeriodSeconds ?? explorer.currentCube?.sourceMetadata?.temporalPeriodSeconds ?? null,
    validTimeStartSeconds: fieldSummary.validTimeStartSeconds ?? explorer.currentCube?.validTimeStartSeconds ?? explorer.currentCube?.sourceMetadata?.validTimeStartSeconds ?? null,
    validTimeEndSeconds: fieldSummary.validTimeEndSeconds ?? explorer.currentCube?.validTimeEndSeconds ?? explorer.currentCube?.sourceMetadata?.validTimeEndSeconds ?? null,
    planningTimelineTimeBridge: Object.keys(bridge).length ? bridge : null,
    planningTimelineTimeUnits: bridge.displayUnits ?? null,
    missionTimelineTime: bridge.missionTimelineTime ?? null,
    missionTimelineTimeHours: bridge.missionTimelineTimeHours ?? null,
    missionTimelineTimeSeconds: bridge.missionTimelineTimeSeconds ?? viewModel.currentPresentationTimeSeconds ?? null,
    currentTimeConversionMultiplier: bridge.timeUnitMultiplier ?? null,
    activeLayerId: currentVisualization.currentActiveLayerId ?? viewModel.currentActiveLayerId ?? explorer.activeLayerId ?? viewModel.activeDepthLayerId ?? null,
    activeDepthMeters: currentVisualization.currentActiveDepthMeters ?? explorer.activeDepthMeters ?? activeLayer?.representativeDepthMeters ?? null,
    canonicalMissionTimeSeconds: bridge.missionTimelineTimeSeconds ?? viewModel.simulationStatus?.timeSeconds ?? viewModel.activeTimeSeconds ?? explorer.activeTimeSeconds ?? 0,
    activeTimeSeconds: explorer.activeTimeSeconds ?? viewModel.activeTimeSeconds ?? 0,
    currentPresentationTimeSeconds: resolveCurrentPresentationTimeSeconds(viewModel, explorer.activeTimeSeconds ?? viewModel.activeTimeSeconds ?? 0),
    samplerInputTimeSeconds: selectedSourceCurrent?.currentSampleTimeSeconds ?? selectedSourceCurrent?.timeSeconds ?? explorer.activeTimeSeconds ?? viewModel.activeTimeSeconds ?? 0,
    sourceTimeFrameSignature: currentSourceTimeFrameSignature(viewModel),
    currentPresentationRequested: presentationRequested,
    currentPresentationEnabled: presentationEnabled,
    currentDisplayMode: currentVisualization.currentDisplayMode ?? normalizeCurrentDisplayMode(viewModel.waterColumn?.currentDisplayMode ?? viewModel.displaySettings?.waterColumn?.currentDisplayMode ?? 'activeSlice'),
    activeCurrentDisplayMode: rendererSummary?.activeCurrentDisplayMode ?? currentVisualization.currentDisplayMode ?? normalizeCurrentDisplayMode(viewModel.waterColumn?.currentDisplayMode ?? viewModel.displaySettings?.waterColumn?.currentDisplayMode ?? 'activeSlice'),
    currentSafeModeExplicit: safeModeExplicit,
    currentActiveLayerId: currentVisualization.currentActiveLayerId ?? explorer.activeLayerId ?? viewModel.activeDepthLayerId ?? null,
    currentActiveDepthMeters: currentVisualization.currentActiveDepthMeters ?? explorer.activeDepthMeters ?? activeLayer?.representativeDepthMeters ?? null,
    currentActiveTimeSeconds: currentVisualization.currentActiveTimeSeconds ?? explorer.activeTimeSeconds ?? viewModel.activeTimeSeconds ?? 0,
    currentPresentationTimeSeconds: resolveCurrentPresentationTimeSeconds(viewModel, explorer.activeTimeSeconds ?? viewModel.activeTimeSeconds ?? 0),
    sourceTimeFrameSignature: currentSourceTimeFrameSignature(viewModel),
    activeDisplayMode: currentVisualization.currentDisplayMode ?? normalizeCurrentDisplayMode(viewModel.waterColumn?.currentDisplayMode ?? viewModel.displaySettings?.waterColumn?.currentDisplayMode ?? 'activeSlice'),
    sourceVectorSampleCount: rendererSummary?.sourceVectorSampleCount ?? activeVectors.length,
    finiteVectorSampleCount: rendererSummary?.finiteVectorSampleCount ?? activeVectors.length,
    nonzeroVectorSampleCount: rendererSummary?.nonzeroVectorSampleCount ?? activeVectors.filter((vector) => Math.hypot(Number(vector.uEastMetersPerSecond ?? vector.u ?? 0), Number(vector.vNorthMetersPerSecond ?? vector.v ?? 0)) > 1e-5).length,
    canonicalMagnitudeMinimum: rendererSummary?.canonicalMagnitudeMinimum ?? fieldSummary.diagnostics?.speedMinimum ?? fieldSummary.speedStatistics?.min ?? null,
    canonicalMagnitudeMean: rendererSummary?.canonicalMagnitudeMean ?? fieldSummary.diagnostics?.speedMean ?? fieldSummary.speedStatistics?.mean ?? null,
    canonicalMagnitudeMaximum: rendererSummary?.canonicalMagnitudeMaximum ?? fieldSummary.diagnostics?.speedMaximum ?? fieldSummary.speedStatistics?.max ?? null,
    calmThresholdMetersPerSecond: rendererSummary?.calmThresholdMetersPerSecond ?? fieldSummary.calmThresholdMetersPerSecond ?? fieldSummary.diagnostics?.calmThresholdMetersPerSecond ?? explorer.currentCube?.sourceMetadata?.calmThresholdMetersPerSecond ?? null,
    calmVectorCount: rendererSummary?.calmVectorCount ?? fieldSummary.calmVectorCount ?? fieldSummary.diagnostics?.calmVectorCount ?? 0,
    calmMarkerInstanceCount: rendererSummary?.calmMarkerInstanceCount ?? 0,
    distinctMagnitudeBinCount: rendererSummary?.distinctMagnitudeBinCount ?? activeVectorsMagnitudeBinCount(activeVectors),
    terrainMaskedVectorCount: rendererSummary?.terrainMaskedVectorCount ?? activeVectors.filter((vector) => vector.masked === true || vector.wet === false).length,
    belowBottomVectorCount: rendererSummary?.belowBottomVectorCount ?? activeVectors.filter((vector) => vector.belowBottom === true).length,
    visibleVectorInstanceCount: rendererSummary?.visibleVectorInstanceCount ?? rendererSummary?.glyphInstanceCount ?? 0,
    activeGlyphCount: rendererSummary?.activeGlyphCount ?? 0,
    contextGlyphCount: rendererSummary?.contextGlyphCount ?? contextVectors,
    volumetricGlyphCount: rendererSummary?.volumetricGlyphCount ?? 0,
    visibleDepthIds: rendererSummary?.visibleDepthIds ?? (explorer.layers ?? []).map((layer) => layer.id),
    allCurrentLayerIds,
    hiddenCurrentLayerIds: [...hiddenCurrentLayerIds],
    visibleCurrentLayerIds,
    visibleDepthCount: rendererSummary?.visibleDepthCount ?? (explorer.layers ?? []).length,
    distinctDepthVectorCount: distinctCurrentVectorCountByDepth(explorer.layers ?? []),
    distinctTimeVectorCount: distinctCurrentVectorCountByTime(explorer.currentCube ?? null),
    lowerDepthMeters: selectedSourceCurrent?.lowerDepthMeters ?? null,
    upperDepthMeters: selectedSourceCurrent?.upperDepthMeters ?? null,
    depthInterpolationFraction: selectedSourceCurrent?.depthInterpolationFraction ?? null,
    lowerTimeSeconds: selectedSourceCurrent?.lowerTimeSeconds ?? null,
    upperTimeSeconds: selectedSourceCurrent?.upperTimeSeconds ?? null,
    timeInterpolationFraction: selectedSourceCurrent?.timeInterpolationFraction ?? null,
    currentSampleTimeSeconds: selectedSourceCurrent?.currentSampleTimeSeconds ?? null,
    wrappedCurrentTimeSeconds: selectedSourceCurrent?.wrappedCurrentTimeSeconds ?? null,
    timeWrappedPeriodically: selectedSourceCurrent?.timeWrappedPeriodically === true || activeVectors.some((vector) => vector.timeWrappedPeriodically === true),
    timeClampedToBoundary: selectedSourceCurrent?.timeClampedToBoundary === true || activeVectors.some((vector) => vector.timeClampedToBoundary === true),
    timeClampedUnexpectedly: selectedSourceCurrent?.timeClampedUnexpectedly === true || activeVectors.some((vector) => vector.timeClampedUnexpectedly === true),
    timeOutsideValidRange: selectedSourceCurrent?.timeOutsideValidRange === true || activeVectors.some((vector) => vector.timeOutsideValidRange === true),
    currentFrameDigest: activeVectors[0]?.currentFrameDigest ?? null,
    canonicalCurrentDigest: `canonical-${hashStable({ source: fieldSummary.digest ?? explorer.currentCube?.digest ?? null, time: selectedSourceCurrent?.currentSampleTimeSeconds ?? explorer.activeTimeSeconds ?? 0, u: selectedSourceCurrent?.uEastMetersPerSecond ?? null, v: selectedSourceCurrent?.vNorthMetersPerSecond ?? null })}`,
    renderSampleDigest: rendererSummary?.currentDataDigest ?? `render-${hashStable({ time: selectedRenderedCurrent?.timeSeconds ?? explorer.activeTimeSeconds ?? 0, u: selectedRenderedCurrent?.uEastMetersPerSecond ?? null, v: selectedRenderedCurrent?.vNorthMetersPerSecond ?? null })}`,
    directionAttributeDigest: rendererSummary?.currentDirectionDigest ?? rendererSummary?.instancedCurrentGlyphSummary?.currentDirectionDigest ?? null,
    magnitudeAttributeDigest: rendererSummary?.currentMagnitudeDigest ?? rendererSummary?.instancedCurrentGlyphSummary?.currentMagnitudeDigest ?? null,
    visibilityAttributeDigest: rendererSummary?.currentVisibilityDigest ?? rendererSummary?.instancedCurrentGlyphSummary?.currentVisibilityDigest ?? null,
    instanceMatrixDigest: rendererSummary?.currentMatrixDigest ?? rendererSummary?.instancedCurrentGlyphSummary?.currentMatrixDigest ?? null,
    directionAttributeVersion: rendererSummary?.currentDirectionAttributeVersion ?? rendererSummary?.instancedCurrentGlyphSummary?.currentDirectionAttributeVersion ?? 0,
    magnitudeAttributeVersion: rendererSummary?.currentMagnitudeAttributeVersion ?? rendererSummary?.instancedCurrentGlyphSummary?.currentMagnitudeAttributeVersion ?? 0,
    visibilityAttributeVersion: rendererSummary?.currentVisibilityAttributeVersion ?? rendererSummary?.instancedCurrentGlyphSummary?.currentVisibilityAttributeVersion ?? 0,
    instanceMatrixVersion: rendererSummary?.currentMatrixAttributeVersion ?? rendererSummary?.instancedCurrentGlyphSummary?.currentMatrixAttributeVersion ?? 0,
    directionBufferUploadCount: rendererSummary?.currentDirectionBufferUploadCount ?? rendererSummary?.instancedCurrentGlyphSummary?.currentDirectionBufferUploadCount ?? 0,
    magnitudeBufferUploadCount: rendererSummary?.currentMagnitudeBufferUploadCount ?? rendererSummary?.instancedCurrentGlyphSummary?.currentMagnitudeBufferUploadCount ?? 0,
    visibilityBufferUploadCount: rendererSummary?.currentVisibilityBufferUploadCount ?? rendererSummary?.instancedCurrentGlyphSummary?.currentVisibilityBufferUploadCount ?? 0,
    matrixBufferUploadCount: rendererSummary?.currentMatrixBufferUploadCount ?? rendererSummary?.instancedCurrentGlyphSummary?.currentMatrixBufferUploadCount ?? 0,
    currentLayerUpdateCount: rendererSummary?.currentLayerUpdateCount ?? rendererSummary?.instancedCurrentGlyphSummary?.currentLayerUpdateCount ?? 0,
    currentLayerSkippedUpdateCount: rendererSummary?.currentLayerSkippedUpdateCount ?? rendererSummary?.instancedCurrentGlyphSummary?.currentLayerSkippedUpdateCount ?? 0,
    currentLayerSkipReason: rendererSummary?.currentLayerSkipReason ?? rendererSummary?.instancedCurrentGlyphSummary?.currentLayerSkipReason ?? null,
    timelineBindingPass: Math.abs(Number(resolveCurrentPresentationTimeSeconds(viewModel, explorer.activeTimeSeconds ?? viewModel.activeTimeSeconds ?? 0)) - Number(bridge.missionTimelineTimeSeconds ?? viewModel.simulationStatus?.timeSeconds ?? viewModel.activeTimeSeconds ?? explorer.activeTimeSeconds ?? 0)) <= 1e-3,
    samplerTimePass: Math.abs(Number(selectedSourceCurrent?.currentSampleTimeSeconds ?? selectedSourceCurrent?.timeSeconds ?? explorer.activeTimeSeconds ?? 0) - Number(resolveCurrentPresentationTimeSeconds(viewModel, explorer.activeTimeSeconds ?? viewModel.activeTimeSeconds ?? 0))) <= 1e-3 || selectedSourceCurrent?.timeWrappedPeriodically === true,
    renderSampleTimePass: selectedRenderedCurrent?.timeSeconds == null || Math.abs(Number(selectedRenderedCurrent.timeSeconds) - Number(selectedSourceCurrent?.currentSampleTimeSeconds ?? explorer.activeTimeSeconds ?? 0)) <= 1e-3,
    nextFrameDigest: selectedSourceCurrent?.upperTimeSeconds != null ? String(fieldSummary.digest ?? explorer.currentCube?.digest ?? 'current') + ':' + selectedSourceCurrent.upperTimeSeconds : null,
    glyphMeshVisible: rendererSummary?.glyphMeshVisible === true,
    glyphParentVisible: rendererSummary?.glyphParentVisible === true,
    glyphFrustumCulled: rendererSummary?.glyphFrustumCulled === true,
    glyphBoundsInFrustum: rendererSummary?.glyphBoundsInFrustum ?? null,
    glyphLengthMinimum: rendererSummary?.glyphLengthMinimum ?? rendererSummary?.glyphMinimumScale ?? null,
    glyphLengthMean: rendererSummary?.glyphLengthMean ?? null,
    glyphLengthMaximum: rendererSummary?.glyphLengthMaximum ?? rendererSummary?.glyphMaximumScale ?? null,

    glyphMinimumScale: rendererSummary?.glyphMinimumScale ?? null,
    glyphMaximumScale: rendererSummary?.glyphMaximumScale ?? null,
    glyphOpacity: rendererSummary?.glyphOpacity ?? null,
    glyphDepthTest: rendererSummary?.glyphDepthTest ?? null,
    glyphDepthWrite: rendererSummary?.glyphDepthWrite ?? null,
    glyphRenderOrder: rendererSummary?.glyphRenderOrder ?? null,
    glyphLayerOffsetWorld: rendererSummary?.glyphLayerOffsetWorld ?? null,
    glyphBoundsMinimum: rendererSummary?.glyphBoundsMinimum ?? null,
    glyphBoundsMaximum: rendererSummary?.glyphBoundsMaximum ?? null,
    glyphBoundsRadius: rendererSummary?.glyphBoundsRadius ?? null,
    cameraNear: rendererSummary?.cameraNear ?? null,
    cameraFar: rendererSummary?.cameraFar ?? null,
    shaderCompileStatus: rendererSummary?.currentGlyphPresentationFailed === true ? 'failed' : 'not-applicable-fixed-pipeline-material',
    shaderLinkStatus: rendererSummary?.currentGlyphPresentationFailed === true ? 'failed' : 'not-applicable-fixed-pipeline-material',
    webglContextLost: rendererSummary?.webglContextLost === true,
    visiblePixelEvidenceAvailable: false,
    visiblePixelDifferenceCount: 0,
    visiblePixelDifferenceRatio: 0,
    noVisibleVectorsReason,
    activeVectorCount: activeVectors.length,
    contextVectorCount: contextVectors,
    glyphInstanceCount: rendererSummary?.glyphInstanceCount ?? rendererSummary?.instancedCurrentGlyphSummary?.glyphInstanceCount ?? 0,
    glyphDrawCallCount: rendererSummary?.glyphDrawCallCount ?? rendererSummary?.instancedCurrentGlyphSummary?.glyphDrawCallCount ?? 0,
    glyphDrawCallPolicy: rendererSummary?.drawCallPolicy ?? rendererSummary?.instancedCurrentGlyphSummary?.drawCallPolicy ?? 'one shared instanced mesh for current glyphs',
    glyphBufferUpdateCount: rendererSummary?.glyphBufferUpdateCount ?? rendererSummary?.instancedCurrentGlyphSummary?.glyphBufferUpdateCount ?? 0,
    glyphObjectCreateCount: rendererSummary?.glyphObjectCreateCount ?? rendererSummary?.instancedCurrentGlyphSummary?.glyphObjectCreateCount ?? 0,
    currentSourceDigest: fieldSummary.digest ?? explorer.currentCube?.digest ?? explorer.activeCurrentSourceDigest ?? null,
    currentPackageVersion: 'anchor-currents-flow-pkg-r1',
    currentManifestDigest: explorer.currentCube?.manifestDigest ?? explorer.currentCube?.sourceMetadata?.environmentManifestDigest ?? null,
    currentArtifactDigest: fieldSummary.digest ?? explorer.currentCube?.digest ?? explorer.activeCurrentSourceDigest ?? null,
    currentSourceTier: fieldSummary.sourceTier ?? explorer.currentCube?.sourceMetadata?.sourceTier ?? null,
    currentCoordinateFrame: fieldSummary.coordinateFrame ?? explorer.currentCube?.coordinateFrame ?? null,
    currentAxisCounts: {
      east: fieldSummary.eastSampleCount ?? explorer.currentCube?.eastAxisMeters?.length ?? 0,
      north: fieldSummary.northSampleCount ?? explorer.currentCube?.northAxisMeters?.length ?? 0,
      depth: fieldSummary.depthSampleCount ?? explorer.currentCube?.depthAxisMeters?.length ?? 0,
      time: fieldSummary.timeSampleCount ?? explorer.currentCube?.timeAxisSeconds?.length ?? 0
    },
    currentValidationStatus: explorer.currentCube ? 'PASS' : null,
    packageUsesThree: false,
    packageUsesPhaser: false,
    packageUsesDom: false,
    packageAcceptsDisplayHours: false,
    packageTimeUnit: 'seconds',
    selectedSourceCurrent,
    selectedRenderedCurrent,
    selectedCurrentDelta: currentDelta(selectedSourceCurrent, selectedRenderedCurrent),
    gliderSampledCurrent,
    renderedGliderCurrent,
    renderedGliderCurrentDelta: currentDelta(gliderSampledCurrent, renderedGliderCurrent),
    gliderCurrentDelta: currentDelta(gliderSampledCurrent, renderedGliderCurrent),
    terrainDigest: options.terrainDigest ?? rendererSummary?.terrainSourceDigest ?? null,
    wetMaskDigest: explorer.currentCube?.wetMask ? `wet-${hashStable(explorer.currentCube.wetMask)}` : null,
    activeRendererCount: rendererSummary?.activeRendererCount ?? 0,
    activeRafCount: rendererSummary?.activeRafCount ?? 0,
    currentCubeBuildCount: rendererSummary?.currentCubeBuildCount ?? null,
    currentSamplerCreateCount: rendererSummary?.currentSamplerCreateCount ?? null,
    usesWallClockTime: false,
    rendererOwnsCurrent: false,
    displayChangesPhysics: false,

    displayLayerChangesCurrent: false,
    changesOfficialScoring: false,
    usesNewPlanner: false,
    usesWebGpu: false,
    divergenceRms: fieldSummary.divergenceRms ?? null,
    divergenceMaximum: fieldSummary.divergenceMaximum ?? null,
    vorticityMean: fieldSummary.vorticityMean ?? null,
    vorticityMaximum: fieldSummary.vorticityMaximum ?? null,
    coastlineNormalSpeedRms: fieldSummary.coastlineNormalSpeedRms ?? null,
    coastlineNormalSpeedMaximum: fieldSummary.coastlineNormalSpeedMaximum ?? null,
    verticalShearRms: fieldSummary.verticalShearRms ?? null,
    temporalChangeRms: fieldSummary.temporalChangeRms ?? null,
    alongIsobathFraction: fieldSummary.alongIsobathFraction ?? null,
    crossIsobathFraction: fieldSummary.crossIsobathFraction ?? null,
    alongIsobathSpeedRms: fieldSummary.alongIsobathSpeedRms ?? fieldSummary.diagnostics?.alongIsobathSpeedRms ?? null,
    crossIsobathSpeedRms: fieldSummary.crossIsobathSpeedRms ?? fieldSummary.diagnostics?.crossIsobathSpeedRms ?? null,
    adjacentDirectionDifferenceMeanDegrees: fieldSummary.adjacentDirectionDifferenceMeanDegrees ?? fieldSummary.diagnostics?.adjacentDirectionDifferenceMeanDegrees ?? null,
    adjacentDirectionDifferenceP50Degrees: fieldSummary.adjacentDirectionDifferenceP50Degrees ?? fieldSummary.diagnostics?.adjacentDirectionDifferenceP50Degrees ?? null,
    adjacentDirectionDifferenceP95Degrees: fieldSummary.adjacentDirectionDifferenceP95Degrees ?? fieldSummary.diagnostics?.adjacentDirectionDifferenceP95Degrees ?? null,
    adjacentMagnitudeDifferenceMean: fieldSummary.adjacentMagnitudeDifferenceMean ?? fieldSummary.diagnostics?.adjacentMagnitudeDifferenceMean ?? null,
    adjacentMagnitudeDifferenceP95: fieldSummary.adjacentMagnitudeDifferenceP95 ?? fieldSummary.diagnostics?.adjacentMagnitudeDifferenceP95 ?? null,
    spatialAutocorrelation: fieldSummary.spatialAutocorrelation ?? fieldSummary.diagnostics?.spatialAutocorrelation ?? null,
    estimatedCorrelationLengthMeters: fieldSummary.estimatedCorrelationLengthMeters ?? fieldSummary.diagnostics?.estimatedCorrelationLengthMeters ?? null,
    coherentRegionCount: fieldSummary.coherentRegionCount ?? fieldSummary.diagnostics?.coherentRegionCount ?? null,
    calmRegionCount: fieldSummary.calmRegionCount ?? fieldSummary.diagnostics?.calmRegionCount ?? null,
    cellwiseDirectionNoiseScore: fieldSummary.cellwiseDirectionNoiseScore ?? fieldSummary.diagnostics?.cellwiseDirectionNoiseScore ?? null,
    lowFrequencyEnergyFraction: fieldSummary.lowFrequencyEnergyFraction ?? fieldSummary.diagnostics?.lowFrequencyEnergyFraction ?? null,
    highFrequencyEnergyFraction: fieldSummary.highFrequencyEnergyFraction ?? fieldSummary.diagnostics?.highFrequencyEnergyFraction ?? null,
    canyonExchangeVectorCount: fieldSummary.canyonExchangeVectorCount ?? fieldSummary.diagnostics?.canyonExchangeVectorCount ?? 0,
    undeclaredCrossShelfVectorCount: fieldSummary.undeclaredCrossShelfVectorCount ?? fieldSummary.diagnostics?.undeclaredCrossShelfVectorCount ?? 0,
    landVectorCount: fieldSummary.landVectorCount ?? 0,
    diagnosticsBelowBottomVectorCount: fieldSummary.belowBottomVectorCount ?? 0,
    warnings: [...(explorer.warnings ?? [])],
    failures: []
  };
}

function buildCurrentVisualizationSummary({ waterColumnUi = {}, waterColumnExplorer = {}, activeDepthLayerId = null, activeTimeSeconds = 0, showCurrents = true } = {}) {
  const displayMode = normalizeCurrentDisplayMode(waterColumnUi.currentDisplayMode ?? 'activeSlice');
  const activeLayer = (waterColumnExplorer.layers ?? []).find((layer) => layer.id === activeDepthLayerId) ?? waterColumnExplorer.layers?.find((layer) => layer.id === waterColumnExplorer.activeLayerId) ?? waterColumnExplorer.layers?.[0] ?? null;
  const vectors = (activeLayer?.currentField?.vectors ?? []).filter((vector) => vector.visible !== false);
  const finite = vectors.filter((vector) => Number.isFinite(Number(vector.uEastMetersPerSecond ?? vector.u)) && Number.isFinite(Number(vector.vNorthMetersPerSecond ?? vector.v)));
  return {
    type: 'anchor.rendering.current-visualization-summary',
    version: 'current-visualization-summary-flow-r2a-2',
    currentVisualizationAvailable: vectors.length > 0,
    currentPresentationRequested: showCurrents !== false,
    currentPresentationEnabled: showCurrents !== false && vectors.length > 0,
    currentDisplayMode: displayMode,
    currentLayerMode: waterColumnUi.currentLayerMode ?? 'followSelectedGlider',
    currentActiveLayerId: activeLayer?.id ?? activeDepthLayerId ?? waterColumnExplorer.activeLayerId ?? null,
    currentActiveDepthMeters: waterColumnExplorer.activeDepthMeters ?? activeLayer?.representativeDepthMeters ?? null,
    currentActiveTimeSeconds: waterColumnExplorer.activeTimeSeconds ?? activeTimeSeconds ?? 0,
    currentPresentationTimeSeconds: waterColumnExplorer.activeTimeSeconds ?? activeTimeSeconds ?? 0,
    currentVectorSampleCount: vectors.length,
    currentVectorValidCount: finite.length,
    currentVectorDensity: waterColumnUi.currentVectorDensity ?? 'balanced',
    currentMagnitudeScale: Number(waterColumnUi.currentMagnitudeScale ?? 1.8),
    currentColorMode: waterColumnUi.currentColorMode ?? 'speed',
    showContextCurrents: waterColumnUi.showContextCurrents === true,
    usesFullCurrentCubeClone: false
  };
}

function normalizeCurrentDisplayMode(mode) {
  return normalizeSharedCurrentDisplayMode(mode);
}
function explicitCurrentSafeMode() {
  return isExplicitCurrentSafeMode();
}
function selectCurrentSampleForLayer(samples = [], layerId = null) {
  return samples.find((sample) => sample.layerId === layerId) ?? samples[0] ?? null;
}

function nearestRenderedCurrent(vectors = [], glider = null) {
  if (!glider) return null;
  let best = null;
  let bestDistance = Infinity;
  for (const vector of vectors) {
    const distance = Math.hypot(Number(vector.x ?? 0) - Number(glider.x ?? 0), Number(vector.y ?? 0) - Number(glider.y ?? 0));
    if (distance < bestDistance) { best = vector; bestDistance = distance; }
  }
  if (!best) return null;
  return {
    uEastMetersPerSecond: numberOrNull(best.uEastMetersPerSecond ?? best.u),
    vNorthMetersPerSecond: numberOrNull(best.vNorthMetersPerSecond ?? best.v),
    wDownMetersPerSecond: numberOrNull(best.w) ?? 0,
    depthMeters: numberOrNull(best.depthMeters),
    timeSeconds: numberOrNull(best.timeSeconds)
  };
}

function distinctCurrentVectorCountByDepth(layers = []) {
  const signatures = new Set();
  for (const layer of layers) {
    const vector = (layer.currentField?.vectors ?? []).find((candidate) => candidate.visible !== false && Number.isFinite(Number(candidate.uEastMetersPerSecond ?? candidate.u)) && Number.isFinite(Number(candidate.vNorthMetersPerSecond ?? candidate.v)));
    if (vector) signatures.add(`${round(vector.uEastMetersPerSecond ?? vector.u, 4)},${round(vector.vNorthMetersPerSecond ?? vector.v, 4)}`);
  }
  return signatures.size;
}

function distinctCurrentVectorCountByTime(field = null) {
  if (!field?.uEastMetersPerSecond?.length) return 0;
  for (let z = 0; z < (field.depthAxisMeters?.length ?? 0); z += 1) {
    const depth = Number(field.depthAxisMeters?.[z] ?? z);
    for (let y = 0; y < (field.northAxisMeters?.length ?? 0); y += 1) {
      for (let x = 0; x < (field.eastAxisMeters?.length ?? 0); x += 1) {
        const wet = field.wetMask?.[y]?.[x] !== false;
        const bottom = Number(field.bottomDepthMeters?.[y]?.[x] ?? Infinity);
        if (!wet || depth > bottom + 1e-6) continue;
        const signatures = new Set();
        for (let t = 0; t < (field.timeAxisSeconds?.length ?? 0); t += 1) signatures.add(`${round(field.uEastMetersPerSecond?.[t]?.[z]?.[y]?.[x], 4)},${round(field.vNorthMetersPerSecond?.[t]?.[z]?.[y]?.[x], 4)}`);
        if (signatures.size > 1) return signatures.size;
      }
    }
  }
  return 1;
}
function activeVectorsMagnitudeBinCount(vectors = []) {
  const values = vectors.map((vector) => Number(vector.magnitudeMetersPerSecond ?? vector.magnitude)).filter(Number.isFinite);
  if (!values.length) return 0;
  const max = Math.max(...values, 0.001);
  return new Set(values.map((value) => Math.floor(value / Math.max(0.001, max / 8)))).size;
}

function currentDelta(a = null, b = null) {
  if (!a || !b) return null;
  const du = Number(b.uEastMetersPerSecond ?? 0) - Number(a.uEastMetersPerSecond ?? 0);
  const dv = Number(b.vNorthMetersPerSecond ?? 0) - Number(a.vNorthMetersPerSecond ?? 0);
  return { du: round(du), dv: round(dv), magnitude: round(Math.hypot(du, dv)) };
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
    routeSegmentCount: model.routeSegments?.length ?? 0,
    segmentFlightPlanCount: model.segmentFlightPlans?.length ?? 0,
    routeSegmentSummaries: (model.routeSegments ?? []).map(missionRouteSegmentSummary),
    waterColumnExplorer: waterColumnLayerExplorerSummary(model.waterColumnExplorer ?? {}),
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
    activeTexturedSlabCount: rendererSummary?.activeTexturedSlabCount ?? slabSummary.activeTexturedSlabCount ?? 0,
    contextOutlineSlabCount: rendererSummary?.contextOutlineSlabCount ?? slabSummary.contextOutlineSlabCount ?? 0,
    allLayerFieldTexturesEnabled: rendererSummary?.allLayerFieldTexturesEnabled === true || viewModel.waterColumn?.showFieldOnAllLayers === true,
    contextSlabMode: rendererSummary?.contextSlabMode ?? (viewModel.waterColumn?.fieldDisplayMode === 'allLayers' ? 'textured' : 'outline'),
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
    activeVariable: viewModel.waterColumnExplorer?.activeVariable ?? viewModel.selectedFieldId ?? null,
    selectedDiveProfileId: options.selectedDiveProfileId ?? selectedRoute?.diveProfileId ?? viewModel.waterColumnConfig?.diveProfileId ?? null,
    selectedTargetDepthLayerId: options.selectedTargetDepthLayerId ?? selectedRoute?.targetDepthLayerId ?? viewModel.activeDepthLayerId ?? null,
    plannedDiveSegmentCount: volumetricSummary.plannedDiveSegmentCount ?? 0,
    routeSegmentCount: volumetricSummary.routeSegmentCount ?? viewModel.routeSegments?.length ?? 0,
    segmentFlightPlanCount: volumetricSummary.segmentFlightPlanCount ?? viewModel.segmentFlightPlans?.length ?? 0,
    waterColumnExplorer: volumetricSummary.waterColumnExplorer ?? waterColumnLayerExplorerSummary(viewModel.waterColumnExplorer ?? {}),
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
  return resolveEffectiveDiveProfile({
    route,
    agentPlan,
    agent,
    mission,
    waterColumnConfig,
    routeWaypointCount: route.points?.length ?? (agentPlan?.waypoints?.length != null ? Number(agentPlan.waypoints.length) + 1 : null),
    executableSegmentCount: route.points?.length != null ? Math.max(0, Number(route.points.length) - 1) : (agentPlan?.waypoints?.length != null ? Math.max(0, Number(agentPlan.waypoints.length)) : null)
  }).profileId;
}

function targetLayerForRoute(route, activeDepthLayerId) {
  return route.targetDepthLayerId ?? route.points?.find((point) => point.targetDepthLayerId)?.targetDepthLayerId ?? activeDepthLayerId;
}

function resolveActiveDepthLayerForCurrent({ requestedLayerId = null, waterColumnUi = {}, baseViewModel = {}, waterColumnConfig = {} } = {}) {
  const requested = normalizeActiveLayer(requestedLayerId, waterColumnConfig);
  if (waterColumnUi.currentLayerMode === 'manualActiveLayer') return requested;
  const gliders = baseViewModel.gliderPoses ?? baseViewModel.gliders ?? [];
  const selected = gliders.find((candidate) => candidate.selected) ?? gliders[0] ?? null;
  const depthMeters = actualGliderDepthMeters(selected);
  if (!Number.isFinite(depthMeters)) return requested;
  return nearestLayerForDepth(depthMeters, waterColumnConfig) ?? requested;
}

function actualGliderDepthMeters(glider = null) {
  if (!glider) return null;
  const explicit = numberOrNull(glider.depthMeters ?? glider.actualDepthMeters);
  if (Number.isFinite(explicit)) return Math.max(0, explicit);
  const z = numberOrNull(glider.z);
  return Number.isFinite(z) ? Math.max(0, -z) : null;
}

function nearestLayerForDepth(depthMeters, config = {}) {
  const candidates = (config.depthLayerIds ?? []).filter((id) => id !== 'integratedWaterColumn');
  if (!candidates.length) return null;
  let best = candidates[0];
  let bestDistance = Infinity;
  for (const id of candidates) {
    const nominal = numberOrNull(config.layerMetadata?.[id]?.nominalDepthMeters ?? waterColumnLayerMetadata(id).nominalDepthMeters);
    if (!Number.isFinite(nominal)) continue;
    const distance = Math.abs(Number(depthMeters) - nominal);
    if (distance < bestDistance) {
      best = id;
      bestDistance = distance;
    }
  }
  return best;
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




function hashStable(value) {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
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
