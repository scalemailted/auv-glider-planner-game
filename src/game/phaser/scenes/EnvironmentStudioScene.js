import * as THREE from 'three';
import { markAnchorRouteReady } from '../../../app/production/AnchorAppBootReadiness.js';
import { beginScenario, markBriefingSeen } from '../../../core/scenario/ScenarioState.js';
import { downloadJSON, readJSONFile } from '../../../core/io/ImportExport.js';
import {
  ENVIRONMENT_STUDIO_BATHYMETRY_SOURCES,
  ENVIRONMENT_STUDIO_BATHYMETRY_ARCHETYPES,
  ENVIRONMENT_STUDIO_COASTLINE_ORIENTATIONS,
  ENVIRONMENT_STUDIO_CAMERA_PRESETS,
  ENVIRONMENT_STUDIO_DOMAIN_PROFILES,
  ENVIRONMENT_STUDIO_MISSION_SCALES,
  ENVIRONMENT_STUDIO_PANEL_SECTIONS,
  ENVIRONMENT_STUDIO_PREVIEW_DETAILS,
  ENVIRONMENT_STUDIO_PREVIEW_MODES,
  ENVIRONMENT_STUDIO_REGIONAL_TEMPLATES,
  NO_REFERENCE_DATA_FIXTURE,
  REFERENCE_BATHYMETRY_BLOCKED_MESSAGE,
  REFERENCE_BATHYMETRY_LAYER_OPTIONS,
  REFERENCE_BATHYMETRY_SOURCE_MODES,
  SYNTHETIC_WORLD_LAYER_OPTIONS,
  SYNTHETIC_WORLD_STYLES,
  buildEnvironmentStudioProject,
  buildEnvironmentStudioReferenceBenchmarkBundle,
  buildEnvironmentStudioReferencePlanningLaunch,
  clearEnvironmentStudioReferenceWindow,
  clearEnvironmentStudioWorldWindow,
  composeEnvironmentStudioReferenceEnvironment,
  createReferenceBathymetryPatchRequest,
  createReferenceBathymetryMultiTilePatchRequest,
  createEnvironmentStudioMosaic,
  createEnvironmentStudioSession,
  domainProfileById,
  environmentStudioDebugPayload,
  environmentStudioInspectorViewModel,
  environmentStudioSessionSummary,
  generateEnvironmentStudioRegionFromReferenceWindow,
  generateEnvironmentStudioRegionFromAtlasWindow,
  generateEnvironmentStudioRegionFromWorldWindow,
  generateEnvironmentStudioTile,
  importEnvironmentStudioProject,
  loadEnvironmentStudioReferenceFixture,
  patchEnvironmentStudioDomain,
  patchEnvironmentStudioReferenceWindow,
  patchEnvironmentStudioOperationalWindow,
  patchEnvironmentStudioWorldWindow,
  randomizeEnvironmentStudioAtlasSeed,
  randomizeEnvironmentStudioWorldSeed,
  referenceBathymetryVisualMetrics,
  regenerateEnvironmentStudioFields,
  refreshEnvironmentStudioSession,
  selectEnvironmentStudioObject,
  selectEnvironmentStudioReferenceWindow,
  selectEnvironmentStudioOperationalWindow,
  selectEnvironmentStudioWorldWindow,
  setEnvironmentStudioArchetype,
  setEnvironmentStudioAtlasPreset,
  setEnvironmentStudioPreviewCameraState,
  setEnvironmentStudioPreviewMode,
  setEnvironmentStudioReferenceBathymetryManifest,
  setEnvironmentStudioReferenceLayer,
  setEnvironmentStudioSourceMode,
  setEnvironmentStudioWorldLayer,
  setEnvironmentStudioWorldSeed,
  setEnvironmentStudioWorldStyle,
  setEnvironmentStudioWorldGeneratorParameters,
  setEnvironmentStudioWorldView,
  updateEnvironmentStudioRegionalRecipe,
  validateEnvironmentStudioReferenceLaunch,
  validateEnvironmentStudioProject
} from '../../../core/editor/EnvironmentStudioProject.js';
import {
  OPERATIONAL_WINDOW_PRESETS,
  SYNTHETIC_OCEAN_ATLAS_PRESETS,
  sampleAtlasLayer
} from '../../../core/editor/SyntheticOceanAtlas.js';
import {
  syntheticGlobeLayerColor,
  syntheticGlobeViewportVisualMetrics
} from '../../../core/editor/SyntheticGlobeWorld.js';
import {
  REFERENCE_ATLAS_FOCUS_ZOOM,
  REFERENCE_ATLAS_MAX_ZOOM,
  referenceAtlasBoundsFromDrag,
  referenceAtlasNormalizedToLonLat,
  referenceAtlasPanView,
  referenceAtlasPatchOverlays,
  referenceAtlasViewport,
  referenceAtlasViewForCenter,
  referenceAtlasZoomView,
  referenceFixtureAtLonLat
} from '../../../core/editor/ReferenceBathymetryAtlas.js';
import {
  REFERENCE_BATHYMETRY_TILE_LIBRARY_MANIFEST_PATH,
  loadMeshLod,
  loadReferenceTileLibrary,
  loadTileSet,
  referenceTileLibraryDebugState,
  referenceTileLibraryFixtures
} from '../../../core/editor/ReferenceBathymetryTileLibrary.js';
import {
  REFERENCE_ATLAS_BUDGET_BLOCKED_MESSAGE,
  REFERENCE_ATLAS_MIN_USEFUL_WINDOW_KM,
  REFERENCE_ATLAS_MULTITILE_MESSAGE,
  REFERENCE_ATLAS_OPERATIONAL_WINDOW_PRESETS,
  REFERENCE_ATLAS_RECOMMENDED_WINDOW_KM,
  REFERENCE_ATLAS_TINY_SELECTION_MESSAGE,
  estimateReferenceAtlasOperationalWindow,
  referenceAtlasBoundsForKilometerWindow,
  referenceAtlasBoundsForOperationalPreset
} from '../../../core/editor/ReferenceAtlasBoundaryBudget.js';
import {
  REFERENCE_ATLAS_RECTANGLE_DRAG_MODES,
  REFERENCE_ATLAS_RECTANGLE_HIT_TARGET_PX,
  hitTestReferenceAtlasRectangle,
  referenceAtlasCursorForDragMode,
  referenceAtlasRectangleGeometry,
  referenceAtlasUpdateBoundsForDrag
} from '../../../core/editor/ReferenceAtlasInteractionModel.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export const ENVIRONMENT_STUDIO_SCENE_VERSION = 'environment-staging-scene-r1';

function createReferenceAtlasPerfState() {
  return {
    atlasInteractionActive: false,
    lastInteractionType: null,
    pointerDownCount: 0,
    pointerMoveCount: 0,
    pointerUpCount: 0,
    panCommitCount: 0,
    wheelCount: 0,
    wheelCommitCount: 0,
    zoomCommitCount: 0,
    boundaryDrawStartCount: 0,
    boundaryPreviewCount: 0,
    boundaryCommitCount: 0,
    rasterRenderCount: 0,
    fullRasterRenderCount: 0,
    appRenderCount: 0,
    consoleRenderCount: 0,
    sceneRestartCount: 0,
    listenerAttachCount: 0,
    listenerDetachCount: 0,
    activeListenerCount: 0,
    lastFrameMs: 0,
    maxFrameMs: 0,
    longTaskCount: 0,
    longTaskThresholdMs: 500,
    cacheHitCount: 0,
    cacheMissCount: 0,
    lastCacheKey: null,
    hiddenTruthExposed: false,
    rawExternalDataPathExposed: false
  };
}

function createReferenceAtlasRectangleEditorState() {
  return {
    enabled: true,
    activeHandle: null,
    activeDragMode: REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.none,
    hoverHandle: null,
    movedCount: 0,
    resizedEdgeCount: 0,
    resizedCornerCount: 0,
    tinySelectionHandled: false,
    lastResizePreservedOppositeEdge: true,
    lastBudgetStatus: null,
    lastPatchAvailability: null
  };
}

function referenceAtlasStageFacts(session = {}) {
  const selectedBounds = session.selectedReferenceWindow?.bounds ?? null;
  const selected = Boolean(selectedBounds);
  const availability = session.selectedReferenceAvailability ?? null;
  const boundaryBudget = session.selectedReferenceBoundaryBudget ?? availability?.boundaryBudget ?? null;
  const matchedFixture = availability?.matchedFixture ?? null;
  const matchedFixtureRole = availability?.matchedFixtureRole ?? matchedFixture?.role ?? null;
  const tileSetId = matchedFixture?.tileLibraryTileSetId
    ?? matchedFixture?.tileSetId
    ?? availability?.matchedTileSetId
    ?? availability?.matchedFixtureId
    ?? null;
  const tileSetRole = matchedFixture?.tileLibraryRole
    ?? (matchedFixtureRole === 'missionReadyPatch'
        ? 'missionReadyTileSet'
        : matchedFixtureRole === 'lowResolutionReferencePatch'
          ? 'lowResolutionFallbackTileSet'
          : matchedFixture?.coverageRole ?? null);
  const multiTileRequired = boundaryBudget?.budgetStatus === 'MULTI_TILE_REQUIRED'
    || boundaryBudget?.multiTileRecommended === true
    || boundaryBudget?.recommendedAction === 'exportMultiTilePatchRequest';
  const blocked = boundaryBudget?.budgetStatus === 'BLOCKED';
  const operationalWindow = boundaryBudget?.operationalWindow
    ?? availability?.operationalWindow
    ?? session.selectedReferenceOperationalWindow
    ?? null;
  const operationalSelectionStatus = !selected
    ? 'NONE'
    : operationalWindow?.validSelection === false
      ? 'INVALID'
      : 'VALID';
  const generationBudgetStatus = boundaryBudget?.budgetStatus ?? null;
  const missionReadyTileSet = selected
    && availability?.available === true
    && (matchedFixtureRole === 'missionReadyPatch' || tileSetRole === 'missionReadyTileSet')
    && Boolean(tileSetId);
  const stagedMultiTileAvailable = selected
    && availability?.available === true
    && Boolean(tileSetId)
    && (
      tileSetRole === 'stagedMultiTileTileSet'
      || matchedFixture?.budgetClass === 'multiTileStaged'
      || matchedFixture?.coverageRole === 'stagedMultiTileRegion'
      || matchedFixture?.rasterTiles?.kind === 'multiRasterJson'
    );
  const lowResolutionFallback = selected
    && availability?.available === true
    && !missionReadyTileSet
    && (matchedFixtureRole === 'lowResolutionReferencePatch' || tileSetRole === 'lowResolutionFallbackTileSet');
  const continueToBathymetryEnabled = (missionReadyTileSet || stagedMultiTileAvailable) && !multiTileRequired && !blocked;
  const multiTileRequestEnabled = selected
    && multiTileRequired
    && boundaryBudget?.patchRequestAllowed !== false;
  const patchRequestEnabled = selected
    && !continueToBathymetryEnabled
    && !multiTileRequestEnabled
    && boundaryBudget?.patchRequestAllowed !== false
    && (availability?.available !== true || blocked || boundaryBudget?.recommendedAction === 'exportPatchRequest');
  const inspectFallbackEnabled = lowResolutionFallback && !multiTileRequired;
  const coarsePreviewAvailable = selected
    && operationalSelectionStatus === 'VALID'
    && boundaryBudget?.patchRequestAllowed !== false;
  return {
    selected,
    selectedBounds,
    availability,
    boundaryBudget,
    operationalWindow,
    matchedFixture,
    tileSetId,
    tileSetRole,
    matchedFixtureId: availability?.matchedFixtureId ?? matchedFixture?.fixtureId ?? null,
    matchedFixtureRole,
    boundaryBudgetStatus: boundaryBudget?.budgetStatus ?? null,
    operationalSelectionStatus,
    generationBudgetStatus,
    multiTileRequired,
    blocked,
    missionReadyTileSet,
    stagedMultiTileAvailable,
    lowResolutionFallback,
    coarsePreviewAvailable,
    continueToBathymetryEnabled,
    patchRequestEnabled,
    multiTileRequestEnabled,
    inspectFallbackEnabled,
    loadPatchEnabled: missionReadyTileSet && !blocked && !multiTileRequired
  };
}

function atlasAction({
  visible = true,
  enabled = false,
  label,
  reason = '',
  variant = 'disabled'
}) {
  return { visible, enabled, label, reason, variant: enabled ? variant : 'disabled' };
}

export function deriveAtlasBoundaryActions(selectionState = {}) {
  const facts = referenceAtlasStageFacts(selectionState);
  const noSelectionReason = 'Select a hosted mission-ready region first.';
  const unstagedReason = 'No hosted mission-ready tile is staged for this region.';
  const multiTileReason = 'Multi-tile preprocessing is required before browser loading.';
  const coarsePreviewReason = 'Open an immediate coarse overview for inspection only; high-resolution staging remains required for mission launch.';
  const fallbackReason = 'A low-resolution fallback is staged for inspection only.';
  const hostedReason = 'Hosted mission-ready tile is staged for this region.';
  const actions = {
    continueToBathymetry: atlasAction({
      label: 'Continue to 3D Bathymetry',
      reason: facts.selected ? unstagedReason : noSelectionReason
    }),
    openCoarsePreview: atlasAction({
      label: 'Open Coarse Regional Preview',
      reason: facts.selected ? 'The selected region is not a valid operational area.' : 'Select a valid operational area first.'
    }),
    loadMissionPatch: atlasAction({
      label: 'Load Mission Patch',
      reason: facts.selected ? unstagedReason : noSelectionReason
    }),
    inspectFallback: atlasAction({
      label: 'Inspect Low-Resolution Fallback',
      reason: facts.selected ? 'No low-resolution fallback is selected.' : noSelectionReason
    }),
    exportPatchRequest: atlasAction({
      label: 'Export Patch Request',
      reason: facts.selected ? 'Patch request export is unavailable for this selection.' : 'Select an unstaged region first.'
    }),
    exportMultiTileRequest: atlasAction({
      label: 'Export Multi-Tile Patch Request',
      reason: facts.selected ? 'Multi-tile request export is unavailable for this selection.' : 'Select a Gulf-scale or basin-scale region first.',
      visible: false
    })
  };

  let primaryAction = 'none';
  if (facts.coarsePreviewAvailable) {
    actions.openCoarsePreview = atlasAction({
      label: 'Open Coarse Regional Preview',
      enabled: true,
      reason: coarsePreviewReason,
      variant: 'secondary'
    });
  }
  if (facts.continueToBathymetryEnabled) {
    actions.continueToBathymetry = atlasAction({
      label: 'Continue to 3D Bathymetry',
      enabled: true,
      reason: hostedReason,
      variant: 'primary'
    });
    actions.loadMissionPatch = atlasAction({
      label: 'Load Mission Patch',
      enabled: true,
      reason: 'Legacy staged-patch load path remains available for compatibility.',
      variant: 'secondary'
    });
    actions.exportPatchRequest = atlasAction({
      label: 'Export Patch Request',
      reason: 'Hosted mission-ready tile is already staged; no patch request is needed.'
    });
    primaryAction = 'continueToBathymetry';
  } else if (facts.multiTileRequestEnabled) {
    actions.continueToBathymetry = atlasAction({
      label: 'Continue to 3D Bathymetry',
      reason: multiTileReason
    });
    actions.loadMissionPatch = atlasAction({
      label: 'Load Mission Patch',
      reason: multiTileReason
    });
    actions.exportPatchRequest = atlasAction({
      label: 'Export Patch Request',
      reason: 'Use the multi-tile patch request for this large operational window.'
    });
    actions.exportMultiTileRequest = atlasAction({
      label: 'Export Multi-Tile Patch Request',
      enabled: true,
      reason: 'Export offline preprocessing instructions for this multi-tile operational window.',
      variant: 'warning',
      visible: true
    });
    primaryAction = 'exportMultiTileRequest';
  } else if (facts.patchRequestEnabled) {
    actions.continueToBathymetry = atlasAction({
      label: 'Continue to 3D Bathymetry',
      reason: unstagedReason
    });
    actions.loadMissionPatch = atlasAction({
      label: 'Load Mission Patch',
      reason: unstagedReason
    });
    actions.exportPatchRequest = atlasAction({
      label: 'Export Patch Request',
      enabled: true,
      reason: 'Export offline preprocessing instructions for this unstaged operational window.',
      variant: 'warning'
    });
    primaryAction = 'exportPatchRequest';
  } else if (facts.inspectFallbackEnabled) {
    actions.continueToBathymetry = atlasAction({
      label: 'Continue to 3D Bathymetry',
      reason: 'A mission-ready hosted tile is required before continuing.'
    });
    actions.loadMissionPatch = atlasAction({
      label: 'Load Mission Patch',
      reason: 'The selected fallback is not mission-ready.'
    });
    actions.inspectFallback = atlasAction({
      label: 'Inspect Low-Resolution Fallback',
      enabled: true,
      reason: fallbackReason,
      variant: 'warning'
    });
    primaryAction = 'inspectFallback';
  } else if (facts.blocked) {
    actions.exportPatchRequest = atlasAction({
      label: 'Export Patch Request',
      enabled: facts.boundaryBudget?.patchRequestAllowed !== false,
      reason: 'Export a request or reduce the selected operational window.',
      variant: 'warning'
    });
    primaryAction = actions.exportPatchRequest.enabled ? 'exportPatchRequest' : 'none';
  }

  return {
    continueToBathymetry: actions.continueToBathymetry,
    openCoarsePreview: actions.openCoarsePreview,
    loadMissionPatch: actions.loadMissionPatch,
    inspectFallback: actions.inspectFallback,
    exportPatchRequest: actions.exportPatchRequest,
    exportMultiTileRequest: actions.exportMultiTileRequest,
    primaryAction
  };
}

export function referenceAtlasStageActionState(session = {}) {
  const facts = referenceAtlasStageFacts(session);
  const actionState = deriveAtlasBoundaryActions(session);
  let selectedRegionNextAction = 'selectBoundary';
  if (actionState.primaryAction === 'continueToBathymetry') selectedRegionNextAction = 'continueTo3DBathymetry';
  else if (actionState.primaryAction === 'exportMultiTileRequest') selectedRegionNextAction = 'exportMultiTilePatchRequest';
  else if (actionState.primaryAction === 'exportPatchRequest') selectedRegionNextAction = 'exportPatchRequest';
  else if (actionState.primaryAction === 'inspectFallback') selectedRegionNextAction = 'inspectLowResolutionFallback';
  else if (facts.blocked) selectedRegionNextAction = 'reduceWindowOrExportPatchRequest';
  else if (facts.selected) selectedRegionNextAction = 'inspectSelection';
  return {
    stage: 'globalAtlasSelector',
    selected: facts.selected,
    selectedBounds: facts.selectedBounds,
    selectedRegionAvailability: compactReferenceAtlasAvailability(facts.availability),
    selectedRegionScale: {
      operationalSelectionStatus: facts.operationalSelectionStatus,
      generationBudgetStatus: facts.generationBudgetStatus,
      multiTileRequired: facts.multiTileRequired,
      coarsePreviewAvailable: facts.coarsePreviewAvailable,
      stagedMultiTileAvailable: facts.stagedMultiTileAvailable,
      sourceCellCount: facts.boundaryBudget?.sourceCellCount ?? null,
      tilePlan: compactTilePlanForDebug(facts.boundaryBudget, facts.availability),
      recommendedAction: facts.boundaryBudget?.recommendedAction
        ?? facts.availability?.recommendedAction
        ?? null
    },
    selectedRegionNextAction,
    tileSetId: facts.tileSetId,
    tileSetRole: facts.tileSetRole,
    matchedFixtureId: facts.matchedFixtureId,
    matchedFixtureRole: facts.matchedFixtureRole,
    boundaryBudgetStatus: facts.boundaryBudgetStatus,
    actionState,
    primaryAction: actionState.primaryAction,
    continueToBathymetryEnabled: actionState.continueToBathymetry.enabled,
    openCoarsePreviewEnabled: actionState.openCoarsePreview.enabled,
    coarsePreviewEnabled: actionState.openCoarsePreview.enabled,
    loadMissionPatchEnabled: actionState.loadMissionPatch.enabled,
    loadPatchEnabled: actionState.loadMissionPatch.enabled,
    exportPatchRequestEnabled: actionState.exportPatchRequest.enabled,
    patchRequestEnabled: actionState.exportPatchRequest.enabled,
    exportMultiTileRequestEnabled: actionState.exportMultiTileRequest.enabled,
    multiTileRequestEnabled: actionState.exportMultiTileRequest.enabled,
    inspectFallbackEnabled: actionState.inspectFallback.enabled
  };
}

function compactTilePlanForDebug(boundaryBudget = null, availability = null) {
  const request = availability?.referencePatchRequest ?? null;
  const tilePlan = boundaryBudget?.tilePlan ?? request?.tilePlan ?? request?.requiredSourceTiles ?? null;
  if (Array.isArray(tilePlan)) return { tileCount: tilePlan.length, tiles: tilePlan.slice(0, 8).map(compactTilePlanEntry) };
  if (tilePlan && typeof tilePlan === 'object') {
    return {
      tileCount: Number(tilePlan.tileCount ?? tilePlan.tiles?.length ?? 0),
      rows: Number.isFinite(Number(tilePlan.rows)) ? Number(tilePlan.rows) : null,
      columns: Number.isFinite(Number(tilePlan.columns)) ? Number(tilePlan.columns) : null,
      tiles: Array.isArray(tilePlan.tiles) ? tilePlan.tiles.slice(0, 8).map(compactTilePlanEntry) : []
    };
  }
  return null;
}

function compactTilePlanEntry(entry = {}) {
  return {
    tileId: entry.tileId ?? entry.id ?? null,
    bounds: entry.bounds ? cloneJsonForSceneStart(entry.bounds) : null
  };
}

function blockedAtlasActionMessage(actionKey, atlasStageAction = {}) {
  const action = atlasStageAction.actionState?.[actionKey] ?? null;
  if (actionKey === 'continueToBathymetry') {
    if (!atlasStageAction.selected) return 'Select a hosted mission-ready region first.';
    if (atlasStageAction.primaryAction === 'exportMultiTileRequest' || atlasStageAction.boundaryBudgetStatus === 'MULTI_TILE_REQUIRED') {
      return 'Continue to 3D Bathymetry is unavailable because this operational window requires offline multi-tile preprocessing before browser loading.';
    }
    return 'Continue to 3D Bathymetry is unavailable because this selected region is not staged as a hosted mission-ready tile.';
  }
  if (actionKey === 'loadMissionPatch') {
    if (!atlasStageAction.selected) return 'Select a hosted mission-ready region first.';
    if (atlasStageAction.primaryAction === 'exportMultiTileRequest' || atlasStageAction.boundaryBudgetStatus === 'MULTI_TILE_REQUIRED') {
      return 'Load Mission Patch is unavailable because this operational window requires offline multi-tile preprocessing before browser loading.';
    }
    return 'Load Mission Patch is unavailable because this selected region is not staged as a hosted mission-ready tile.';
  }
  if (actionKey === 'openCoarsePreview') {
    if (!atlasStageAction.selected) return 'Select a valid operational area first.';
    return action?.reason || 'Open Coarse Regional Preview is unavailable for this selected region.';
  }
  if (actionKey === 'inspectFallback') {
    return action?.reason || 'Select a low-resolution fallback region first.';
  }
  if (actionKey === 'exportPatchRequest') {
    return action?.reason || 'Select an unstaged atlas region before exporting a patch request.';
  }
  return action?.reason || 'This atlas action is unavailable for the selected region.';
}

function compactReferenceAtlasAvailability(availability = null) {
  if (!availability) return null;
  const matchedFixture = availability.matchedFixture ?? null;
  return {
    status: availability.status ?? (availability.available ? 'available' : 'notStaged'),
    available: availability.available === true,
    matchedFixtureId: availability.matchedFixtureId ?? matchedFixture?.fixtureId ?? null,
    matchedFixtureRole: availability.matchedFixtureRole ?? matchedFixture?.role ?? null,
    tileSetId: matchedFixture?.tileLibraryTileSetId ?? matchedFixture?.tileSetId ?? null,
    tileSetRole: matchedFixture?.tileLibraryRole ?? null,
    sourceDataset: matchedFixture?.sourceDataset ?? null,
    sourceResolution: matchedFixture?.sourceResolution ?? null,
    rasterDigest: matchedFixture?.digest ?? matchedFixture?.rasterDigest ?? null,
    meshLodCount: Array.isArray(matchedFixture?.meshLods) ? matchedFixture.meshLods.length : 0,
    coverageStatus: availability.coverageStatus ?? matchedFixture?.coverageRole ?? null,
    recommendedAction: availability.recommendedAction ?? availability.boundaryBudget?.recommendedAction ?? null
  };
}

function referenceAtlasStageDebugPayload(session = {}) {
  return referenceAtlasStageActionState(session);
}

function cloneJsonForSceneStart(value) {
  if (value == null) return value;
  try {
    return globalThis.structuredClone ? globalThis.structuredClone(value) : JSON.parse(JSON.stringify(value));
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}

function preferredMeshLodDescriptor(meshLods = []) {
  const lods = Array.isArray(meshLods) ? meshLods : [];
  return lods.find((entry) => entry.lod === 'medium')
    ?? lods.find((entry) => entry.lod === 'coarse')
    ?? lods[0]
    ?? null;
}

function compactTileSetForSceneStart(tileSet = {}) {
  const metadata = tileSet.metadata ?? tileSet;
  return {
    tileSetId: tileSet.tileSetId ?? metadata.tileSetId ?? null,
    label: tileSet.label ?? metadata.label ?? null,
    role: tileSet.role ?? metadata.role ?? null,
    sourceDataset: tileSet.sourceDataset ?? metadata.sourceDataset ?? null,
    provider: tileSet.provider ?? metadata.provider ?? null,
    sourceVariant: tileSet.sourceVariant ?? metadata.sourceVariant ?? null,
    sourceResolution: tileSet.sourceResolution ?? metadata.sourceResolution ?? null,
    actualRasterResolutionArcSeconds: tileSet.actualRasterResolutionArcSeconds ?? metadata.actualRasterResolutionArcSeconds ?? null,
    bounds: cloneJsonForSceneStart(tileSet.bounds ?? metadata.bounds ?? null),
    rasterTiles: cloneJsonForSceneStart(tileSet.rasterTiles ?? metadata.rasterTiles ?? null),
    meshLods: cloneJsonForSceneStart(tileSet.meshLods ?? metadata.meshLods ?? []),
    claimBoundary: cloneJsonForSceneStart(tileSet.claimBoundary ?? metadata.claimBoundary ?? null),
    digests: cloneJsonForSceneStart(tileSet.digests ?? metadata.digests ?? null),
    digest: tileSet.digest ?? metadata.digest ?? null,
    hiddenTruthExposed: false,
    externalRuntimeFetchRequired: false,
    rawExternalDataPathsIncluded: false
  };
}

function compactReferenceOverviewForSceneStart(session = {}) {
  const manifest = session.referenceBathymetryManifest ?? session.referenceAtlas?.manifest ?? {};
  const overview = manifest.overview ?? session.referenceAtlas?.overviewArtifact ?? {};
  const raster = session.referenceAtlas?.overviewRasterArtifact ?? {};
  return {
    overviewId: overview.overviewId ?? overview.id ?? 'global-reference-overview',
    label: overview.label ?? 'Global Reference Bathymetry Overview',
    role: overview.role ?? 'globalOverview',
    sourceDataset: overview.sourceDataset ?? raster.sourceDataset ?? 'ETOPO_2022',
    provider: overview.provider ?? raster.provider ?? 'NOAA NCEI',
    sourceVariant: overview.sourceVariant ?? raster.sourceVariant ?? 'bedrock elevation overview',
    sourceResolution: overview.sourceResolution ?? raster.sourceResolution ?? '60 arc-second',
    actualRasterResolutionArcSeconds: overview.actualRasterResolutionArcSeconds ?? raster.actualRasterResolutionArcSeconds ?? null,
    bounds: cloneJsonForSceneStart(overview.bounds ?? raster.bounds ?? null),
    previewPath: overview.previewPath ?? manifest.overview?.previewPath ?? null,
    previewRasterDigest: overview.previewRasterDigest ?? raster.rasterDigest ?? raster.digest ?? overview.digest ?? null,
    digest: overview.digest ?? session.referenceAtlas?.overviewDigest ?? null,
    displayResolution: cloneJsonForSceneStart(overview.displayResolution ?? raster.grid ?? null),
    claimBoundary: {
      overviewForSelectionOnly: true,
      missionResolutionBathymetry: false,
      browserDownloadsPublicSourceData: false,
      certifiedForNavigation: false,
      operationalOceanForecast: false,
      hiddenTruthExposed: false
    }
  };
}

function compactMeshLodForSceneStart(meshArtifact = {}, descriptor = {}) {
  return {
    artifactType: meshArtifact.artifactType ?? 'anchor.reference-bathymetry-mesh-lod',
    lod: meshArtifact.lod ?? descriptor.lod ?? null,
    path: descriptor.path ?? null,
    digest: descriptor.digest ?? meshArtifact.digest ?? null,
    derivedFromRasterDigest: meshArtifact.derivedFromRasterDigest ?? null,
    bounds: cloneJsonForSceneStart(meshArtifact.bounds ?? null),
    meshRows: Number(meshArtifact.meshRows ?? descriptor.meshRows ?? 0),
    meshColumns: Number(meshArtifact.meshColumns ?? descriptor.meshColumns ?? 0),
    vertexCount: Number(meshArtifact.vertexCount ?? descriptor.vertexCount ?? 0),
    triangleCount: Number(meshArtifact.triangleCount ?? descriptor.triangleCount ?? 0),
    isAuthoritativeForSimulation: false
  };
}

function recordReferenceAtlasAppRender(scene, type = 'render') {
  if (!scene?.referenceAtlasPerf) return;
  if (type === 'console') {
    scene.referenceAtlasPerf.consoleRenderCount += 1;
    return;
  }
  scene.referenceAtlasPerf.appRenderCount += 1;
}

function referenceAtlasPerfDebugPayload(scene) {
  const perf = scene?.referenceAtlasPerf ?? createReferenceAtlasPerfState();
  return {
    ...perf,
    atlasInteractionActive: perf.atlasInteractionActive === true,
    transientViewportActive: Boolean(scene?.referenceAtlasTransientView),
    transientBoundaryActive: Boolean(scene?.referenceAtlasTransientBounds),
    cachedLayerCount: Number(scene?.referenceAtlasCanvasCache?.size ?? 0),
    hiddenTruthExposed: false,
    rawExternalDataPathExposed: false
  };
}

function mergeReferenceBathymetryManifestTileLibrary(manifest = {}, tileLibraryFixtures = [], tileLibrary = null) {
  const byId = new Map();
  for (const fixture of Array.isArray(manifest.fixtures) ? manifest.fixtures : []) {
    if (fixture?.fixtureId) byId.set(fixture.fixtureId, fixture);
  }
  for (const fixture of Array.isArray(tileLibraryFixtures) ? tileLibraryFixtures : []) {
    if (!fixture?.fixtureId) continue;
    byId.set(fixture.fixtureId, {
      ...(byId.get(fixture.fixtureId) ?? {}),
      ...fixture
    });
  }
  const fixtures = [...byId.values()].sort((a, b) => {
    const roleA = a.role === 'missionReadyPatch' ? 0 : 1;
    const roleB = b.role === 'missionReadyPatch' ? 0 : 1;
    if (roleA !== roleB) return roleA - roleB;
    return Number(a.actualRasterResolutionArcSeconds ?? 999999) - Number(b.actualRasterResolutionArcSeconds ?? 999999);
  });
  return {
    ...manifest,
    fixtureStatus: fixtures.length ? 'AVAILABLE' : manifest.fixtureStatus,
    fixtures,
    tileLibraryDigest: tileLibrary?.digest ?? null,
    tileLibraryPath: tileLibrary ? REFERENCE_BATHYMETRY_TILE_LIBRARY_MANIFEST_PATH : null,
    tileLibraryCoverageSummary: tileLibrary?.coverageSummary ?? null,
    instructions: {
      ...(manifest.instructions ?? {}),
      tileLibraryManifest: tileLibrary ? REFERENCE_BATHYMETRY_TILE_LIBRARY_MANIFEST_PATH : null,
      tileLibraryNote: tileLibrary
        ? 'Browser loads staged ANCHOR tile-library assets only; public source data is downloaded offline.'
        : manifest.instructions?.tileLibraryNote ?? null
    }
  };
}

function createDefaultOperationalWindowEditor() {
  return {
    mode: 'drawCustom',
    centerLon: -122.25,
    centerLat: 36.6,
    widthKm: REFERENCE_ATLAS_RECOMMENDED_WINDOW_KM,
    heightKm: REFERENCE_ATLAS_RECOMMENDED_WINDOW_KM,
    westLon: null,
    eastLon: null,
    southLat: null,
    northLat: null,
    appliedFrom: null,
    tinySelectionExpanded: false,
    lastPreset: null
  };
}

export class EnvironmentStudioScene extends PhaserScene {
  constructor() {
    super('EnvironmentStudioScene');
    this.objects = [];
    this.session = createEnvironmentStudioSession();
    this.statusMessage = 'Loading reference bathymetry manifest. Generation is blocked until a preprocessed public fixture is available.';
    this.lastError = null;
    this.referenceManifestLoaded = false;
    this.referenceTileLibraryLoaded = false;
    this.referenceTileLibrary = null;
    this.referenceTileLibraryWarning = null;
    this.worldBoundaryDrawing = false;
    this.worldPointerState = null;
    this.worldTileCanvasCache = new Map();
    this.referenceAtlasCanvasCache = new Map();
    this.referenceAtlasPreviewBinding = null;
    this.referenceAtlasTransientView = null;
    this.referenceAtlasTransientBounds = null;
    this.referenceAtlasPerf = createReferenceAtlasPerfState();
    this.referenceAtlasRectangleEditor = createReferenceAtlasRectangleEditorState();
    this.oversizeGenerationBlockedCount = 0;
    this.lastBlockedGenerationReason = null;
    this.lastClickedAction = null;
    this.lastActionResult = null;
    this.lastBlockedAction = null;
    this.lastBlockedActionReason = null;
    this.lastActionToast = null;
    this.lastPatchRequestType = null;
    this.lastPatchRequestDigest = null;
    this.operationalWindowEditor = createDefaultOperationalWindowEditor();
    this.lastReferenceMapPoint = null;
    this.referenceAtlasLoadStartedAt = globalThis.performance?.now?.() ?? Date.now();
    this.globeRendererContext = null;
    this.globeRegionSelectionMode = false;
  }

  create() {
    this.app = this.sys.game.anchorApp ?? globalThis.__anchorPhaserApp;
    if (!this.app) return;
    this.events?.once?.('shutdown', () => this.shutdown());
    this.events?.once?.('destroy', () => this.shutdown());
    this.app.state.mode = 'environmentStudio';
    this.app.clearPanels();
    this.app.elements.shell?.classList.remove('planning-workspace');
    this.app.setSceneLabel('Environment Studio');
    this.drawBackdrop();
    this.mountPreviewHost();
    this.session = refreshEnvironmentStudioSession(this.session);
    this.render();
    this.loadReferenceBathymetryManifest();
    markAnchorRouteReady('environment-studio', { resolvedRuntimeShell: 'default', inputHandlersBound: true });
  }

  async loadReferenceBathymetryManifest() {
    this.referenceAtlasLoadStartedAt = globalThis.performance?.now?.() ?? Date.now();
    try {
      const response = await fetch('assets/reference_bathymetry/manifest.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Reference bathymetry manifest returned HTTP ${response.status}.`);
      const manifest = await response.json();
      let tileLibrary = null;
      let tileLibraryDebug = null;
      try {
        tileLibrary = await loadReferenceTileLibrary();
        tileLibraryDebug = referenceTileLibraryDebugState(tileLibrary);
        this.referenceTileLibraryLoaded = true;
        this.referenceTileLibraryWarning = null;
      } catch (tileError) {
        this.referenceTileLibraryLoaded = false;
        this.referenceTileLibraryWarning = `Reference tile library is not loaded: ${tileError?.message ?? String(tileError)}`;
      }
      this.referenceTileLibrary = tileLibrary;
      const tileLibraryManifestFixtures = tileLibrary ? referenceTileLibraryFixtures(tileLibrary) : [];
      const mergedManifest = mergeReferenceBathymetryManifestTileLibrary(manifest, tileLibraryManifestFixtures, tileLibrary);
      const fixtureArtifacts = [];
      const overviewArtifact = mergedManifest.overview?.overviewPath
        ? await fetchJsonIfAvailable(mergedManifest.overview.overviewPath)
        : null;
      const overviewRasterPath = overviewArtifact?.previewPath ?? overviewArtifact?.rasterPath ?? mergedManifest.overview?.previewPath ?? mergedManifest.overview?.rasterPath;
      const overviewRasterArtifact = overviewRasterPath
        ? await fetchJsonIfAvailable(overviewRasterPath)
        : null;
      if (mergedManifest.fixtureStatus === 'AVAILABLE' && Array.isArray(mergedManifest.fixtures)) {
        for (const fixture of mergedManifest.fixtures) {
          if (!fixture?.rasterPath) continue;
          const artifact = await fetchJsonIfAvailable(fixture.rasterPath);
          if (artifact) fixtureArtifacts.push({ ...fixture, rasterArtifact: artifact });
        }
      }
      this.session = setEnvironmentStudioReferenceBathymetryManifest(this.session, mergedManifest, {
        referenceFixtures: fixtureArtifacts,
        overviewArtifact,
        overviewRasterArtifact,
        referenceTileLibrary: tileLibrary,
        referenceTileLibraryDebug: tileLibraryDebug
      });
      this.referenceManifestLoaded = true;
      if (this.session.referenceAtlas?.sourceDataset?.referenceDataAvailable === true) {
        this.statusMessage = referenceFixtureAvailabilityMessage(this.session);
        this.lastError = null;
      } else {
        this.statusMessage = 'Reference bathymetry data is not available yet. Run the downloader and preprocessor before generating reference-backed bathymetry.';
        this.lastError = REFERENCE_BATHYMETRY_BLOCKED_MESSAGE;
      }
    } catch (error) {
      this.referenceManifestLoaded = false;
      this.statusMessage = 'Reference bathymetry manifest could not be loaded.';
      this.lastError = `${REFERENCE_BATHYMETRY_BLOCKED_MESSAGE} Manifest load detail: ${error?.message ?? String(error)}`;
    }
    this.referenceAtlasPerf.initialLoadMs = roundMetric((globalThis.performance?.now?.() ?? Date.now()) - this.referenceAtlasLoadStartedAt);
    if (this.sys?.isActive?.()) this.render();
  }

  shutdown() {
    this.cleanupReferenceAtlasPreviewBinding();
    this.clearObjects();
    this.destroyPreviewHost();
    this.clearRightPanel();
    this.publishDebug(false);
  }

  handleViewportResize() {
    if (!this.sys?.isActive?.()) return;
    this.drawBackdrop();
  }

  render() {
    if (isReferenceAtlasStage(this.session.studioStage)) recordReferenceAtlasAppRender(this, 'render');
    this.session = refreshEnvironmentStudioSession(this.session);
    this.renderConsole();
    this.renderRightPanel();
    this.renderPreview();
    this.publishDebug(true);
  }

  renderConsole() {
    if (isReferenceAtlasStage(this.session.studioStage)) {
      this.renderReferenceAtlasConsole();
      return;
    }
    if (this.session.studioStage === 'worldMap') {
      this.renderWorldMapConsole();
      return;
    }
    if (this.session.studioStage === 'atlasWindow') {
      this.renderAtlasConsole();
      return;
    }
    this.renderRegionalBathymetryConsole();
  }

  renderWorldMapConsole() {
    const summary = environmentStudioSessionSummary(this.session);
    this.app.setPanel(worldMapConsoleHtml(this, summary));
    bindEnvironmentStudioWorldMapControls(this, this.app.elements?.consoleRoot ?? globalThis.document);
  }

  renderReferenceAtlasConsole() {
    recordReferenceAtlasAppRender(this, 'console');
    const summary = environmentStudioSessionSummary(this.session);
    this.app.setPanel(referenceAtlasConsoleHtml(this, summary));
    bindEnvironmentStudioReferenceAtlasControls(this, this.app.elements?.consoleRoot ?? globalThis.document);
  }

  renderRegionalBathymetryConsole() {
    const summary = environmentStudioSessionSummary(this.session);
    this.app.setPanel(regionalBathymetryConsoleHtml(this, summary));
    bindEnvironmentStudioRegionalControls(this, this.app.elements?.consoleRoot ?? globalThis.document);
  }

  renderAtlasConsole() {
    const window = this.session.selectedOperationalWindow;
    this.app.setPanel(atlasConsoleHtml(this, window));
    bindEnvironmentStudioAtlasControls(this, this.app.elements?.consoleRoot ?? globalThis.document);
  }

  renderSimplifiedConsole() {
    const summary = environmentStudioSessionSummary(this.session);
    const panelSections = new Map(ENVIRONMENT_STUDIO_PANEL_SECTIONS.map((section) => [section.id, section]));
    const advancedOpen = this.session.simplifiedPanelState?.advancedExpanded === true ? 'open' : '';
    const diagnosticsOpen = this.session.simplifiedPanelState?.diagnosticsExpanded === true ? 'open' : '';
    this.app.setPanel(simplifiedConsoleHtml(this, summary, panelSections, advancedOpen, diagnosticsOpen));
    bindEnvironmentStudioConsoleControls(this, this.app.elements?.consoleRoot ?? globalThis.document);
  }

  renderLegacyConsole() {
    const summary = environmentStudioSessionSummary(this.session);
    this.app.setPanel(`
      <section class="console-header">
        <div class="console-kicker">Simulation Lab / Environment Studio</div>
        <h1>Environment Studio</h1>
        <p>Author scientifically constrained synthetic bathymetry as a 2.5D bottom surface rendered as regional 3D terrain.</p>
      </section>
      <section class="console-status">
        <span>Status</span>
        <strong>${escapeHtml(summary.validationStatus)}</strong>
        <small>${escapeHtml(this.statusMessage)}</small>
      </section>
      ${this.lastError ? `<section class="console-section" data-keep-title="true"><h2>Warning</h2><div class="hud-muted">${escapeHtml(this.lastError)}</div></section>` : ''}
      <section class="console-section" data-keep-title="true" data-accordion-key="environment-scale">
        <h2>Environment Scale</h2>
        <p class="hud-muted">Choose the intended mission scale before choosing grid resolution. Larger multi-glider missions need enough spatial extent and feature diversity to avoid redundant routes.</p>
        <label class="compact-field">
          Environment Type
          <select id="env-studio-profile" data-env-studio-profile>
            ${ENVIRONMENT_STUDIO_DOMAIN_PROFILES.map((profile) => `<option value="${escapeAttr(profile.id)}" ${profile.id === this.session.environmentType ? 'selected' : ''}>${escapeHtml(profile.label)}</option>`).join('')}
          </select>
        </label>
        ${selectInput('Mission Scale', 'env-studio-mission-scale', this.session.missionScale, ENVIRONMENT_STUDIO_MISSION_SCALES)}
        ${numberInput('Intended Gliders', 'env-studio-intended-gliders', this.session.intendedGliders, 1, 6, 1)}
        <label class="compact-field">
          Estimated Mission Duration
          <input id="env-studio-duration-label" type="text" value="${escapeAttr(this.session.estimatedMissionDuration)}" />
        </label>
        ${selectInput('Bathymetry Source', 'env-studio-bathymetry-source', this.session.bathymetrySource, ENVIRONMENT_STUDIO_BATHYMETRY_SOURCES)}
        <div class="hud-muted">Real patch import and statistical reference comparison are planned future validation workflows. Current authoring uses deterministic synthetic bathymetry only.</div>
      </section>
      <section class="console-section" data-keep-title="true" data-accordion-key="domain-resolution">
        <h2>Domain &amp; Resolution</h2>
        <div class="hud-muted">Legacy label: Domain / Resolution. Source Grid is exported; Preview Mesh is decimated for interactive display.</div>
        ${numberInput('Width km', 'env-studio-width', this.session.domainSpec.horizontal.widthMeters / 1000, 1, 300, 1)}
        ${numberInput('Height km', 'env-studio-height', this.session.domainSpec.horizontal.heightMeters / 1000, 1, 200, 1)}
        ${numberInput('Horizontal source-cell size m', 'env-studio-cell-size', this.session.domainSpec.horizontal.cellSizeMeters, 100, 5000, 100)}
        ${numberInput('Max depth m', 'env-studio-max-depth', this.session.domainSpec.vertical.maxDepthMeters, 20, 1000, 10)}
        ${numberInput('Duration s', 'env-studio-duration', this.session.domainSpec.time.durationSeconds, 300, 86400, 300)}
        ${numberInput('dt s', 'env-studio-dt', this.session.domainSpec.time.dtSeconds, 30, 3600, 30)}
        ${selectInput('Preview detail', 'env-studio-preview-detail', this.session.previewDetail, ENVIRONMENT_STUDIO_PREVIEW_DETAILS)}
        <div class="cell-inspector-metrics">
          ${metricHtml('Rows', summary.sourceGridShape.rows)}
          ${metricHtml('Columns', summary.sourceGridShape.columns)}
          ${metricHtml('Source cell count', summary.sourceGridShape.cellCount)}
          ${metricHtml('Preview mesh', `${summary.previewGridShape.columns} x ${summary.previewGridShape.rows}`)}
          ${metricHtml('Preview decimation', `${summary.previewDecimation.factor}x`)}
          ${metricHtml('Estimated cost', estimatedCostLabel(summary.sourceGridShape.cellCount, summary.previewGridShape.cellCount))}
          ${metricHtml('Domain Digest', shortDigest(summary.domainDigest))}
        </div>
        <div class="hud-muted">Preview is simplified for interactivity. Export preserves the source grid.</div>
        <button class="console-button primary" type="button" data-action="env-studio-apply-domain">Apply Domain</button>
      </section>
      <section class="console-section" data-keep-title="true" data-accordion-key="regional-layout-template">
        <h2>Regional Layout Template</h2>
        ${selectInput('Template', 'env-studio-regional-template', this.session.regionalTemplate, ENVIRONMENT_STUDIO_REGIONAL_TEMPLATES)}
        ${selectInput('Coastline Orientation', 'env-studio-coastline-orientation', this.session.coastlineOrientation, ENVIRONMENT_STUDIO_COASTLINE_ORIENTATIONS)}
        <div class="environment-studio-checkbox-grid" aria-label="Open Ocean Boundaries">
          ${['north', 'south', 'east', 'west'].map((side) => `
            <label><input type="checkbox" data-env-studio-open-boundary value="${escapeAttr(side)}" ${this.session.openOceanBoundaries.includes(side) ? 'checked' : ''} /> ${escapeHtml(labelize(side))}</label>
          `).join('')}
        </div>
      </section>
      <section class="console-section" data-keep-title="true" data-accordion-key="regional-feature-mix">
        <h2>Regional Feature Mix</h2>
        ${levelSelect('Shelf fraction', 'env-studio-mix-shelfFraction', this.session.featureMix.shelfFraction)}
        ${levelSelect('Deep basin fraction', 'env-studio-mix-deepBasinFraction', this.session.featureMix.deepBasinFraction)}
        ${levelSelect('Canyon density', 'env-studio-mix-canyonDensity', this.session.featureMix.canyonDensity)}
        ${levelSelect('Island / seamount count', 'env-studio-mix-islandSeamountCount', this.session.featureMix.islandSeamountCount)}
        ${levelSelect('Coastline complexity', 'env-studio-mix-coastlineComplexity', this.session.featureMix.coastlineComplexity)}
        ${levelSelect('River mouth / delta influence', 'env-studio-mix-riverMouthDeltaInfluence', this.session.featureMix.riverMouthDeltaInfluence)}
        ${levelSelect('Ridge / sill strength', 'env-studio-mix-ridgeSillStrength', this.session.featureMix.ridgeSillStrength)}
        ${levelSelect('Shelf-break sharpness', 'env-studio-mix-shelfBreakSharpness', this.session.featureMix.shelfBreakSharpness)}
        ${levelSelect('Feature diversity', 'env-studio-mix-featureDiversity', this.session.featureMix.featureDiversity)}
      </section>
      <section class="console-section" data-keep-title="true" data-accordion-key="bathymetry-generator">
        <h2>Randomization</h2>
        <div class="hud-muted">Bathymetry Generator: choose region type, choose feature mix, lock what you like, and reroll the rest.</div>
        <label class="compact-field">
          Compact Tile Archetype
          <select id="env-studio-archetype" data-env-studio-archetype>
            ${ENVIRONMENT_STUDIO_BATHYMETRY_ARCHETYPES.map((entry) => `<option value="${escapeAttr(entry.id)}" ${entry.id === this.session.archetypeId ? 'selected' : ''}>${escapeHtml(entry.label)}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          World seed
          <input id="env-studio-seed" data-env-studio-seed type="text" value="${escapeAttr(this.session.seed)}" />
        </label>
        ${levelSelect('Variation level', 'env-studio-variation-level', this.session.randomization.variationLevel)}
        <div class="environment-studio-checkbox-grid">
          <label><input type="checkbox" id="env-studio-lock-coastline" ${this.session.randomization.locks.coastline ? 'checked' : ''} /> Lock coastline</label>
          <label><input type="checkbox" id="env-studio-lock-deep-basin" ${this.session.randomization.locks.deepBasin ? 'checked' : ''} /> Lock deep basin</label>
          <label><input type="checkbox" id="env-studio-lock-selected-features" ${this.session.randomization.locks.selectedFeatures ? 'checked' : ''} disabled /> Lock selected features (planned)</label>
          <label><input type="checkbox" id="env-studio-lock-tile-seams" ${this.session.randomization.locks.tileSeams ? 'checked' : ''} /> Lock tile seams</label>
        </div>
        <div class="environment-studio-tile-config-list">
          ${this.session.tileConfigs.map((config) => `
            <label class="compact-field">
              ${escapeHtml(config.label)} role
              <select data-env-studio-tile-archetype="${escapeAttr(config.id)}">
                ${ENVIRONMENT_STUDIO_BATHYMETRY_ARCHETYPES.map((entry) => `<option value="${escapeAttr(entry.id)}" ${entry.id === config.archetypeId ? 'selected' : ''}>${escapeHtml(entry.label)}</option>`).join('')}
              </select>
            </label>
          `).join('')}
        </div>
        <div class="hud-muted">${escapeHtml(archetypeDescription(this.session.archetypeId))}</div>
        <button class="console-button primary" type="button" data-action="env-studio-create-mosaic">Regenerate all</button>
        <button class="console-button secondary" type="button" data-action="env-studio-generate-tile">Regenerate selected tile</button>
      </section>
      <section class="console-section" data-keep-title="true" data-accordion-key="validation">
        <h2>Validation &amp; Mission Suitability</h2>
        <div class="cell-inspector-metrics">
          ${metricHtml('Bathymetry validity', this.session.validationReport?.status ?? 'EMPTY')}
          ${metricHtml('Wet connectivity', formatNumber(this.session.regionalFeatureSummary?.navigableConnectedWaterFraction))}
          ${metricHtml('Slope warnings', this.session.regionalFeatureSummary?.canyonLikeGradientCount ?? 0)}
          ${metricHtml('Seam continuity', this.session.mosaic?.seamReport?.valid === true ? 'PASS' : this.session.mosaic?.seamReport ? 'FAIL' : 'NOT_GENERATED')}
          ${metricHtml('Land/water consistency', formatNumber(this.session.regionalFeatureSummary?.wetFraction))}
          ${metricHtml('Deep-water fraction', formatNumber(this.session.regionalFeatureSummary?.deepWaterFraction))}
          ${metricHtml('Shallow-shelf fraction', formatNumber(this.session.regionalFeatureSummary?.shallowShelfFraction))}
          ${metricHtml('Feature diversity', formatNumber(this.session.regionalFeatureSummary?.featureDiversityScore))}
          ${metricHtml('Multi-glider suitability', this.session.multiGliderSuitability?.status ?? 'WARN')}
          ${metricHtml('Performance budget', this.session.previewDecimation?.mode ?? 'preview')}
          ${metricHtml('Status', this.session.validationReport?.status ?? 'EMPTY')}
          ${metricHtml('Warnings', this.session.validationReport?.warnings?.length ?? 0)}
          ${metricHtml('Failures', this.session.validationReport?.errors?.length ?? 0)}
          ${metricHtml('Report Digest', shortDigest(this.session.validationReport?.validationReportDigest))}
        </div>
        <div class="hud-muted">Synthetic, public-safe artifacts only. Not calibrated survey data, not an operational forecast, and not certified for navigation.</div>
      </section>
      <section class="console-section" data-keep-title="true" data-accordion-key="generated-field-status">
        <h2>Generated Field Status</h2>
        ${dependencyGraphTable(this.session.dependencyGraph)}
        ${fieldRegenerationSummaryHtml(this.session.fieldRegenerationResult)}
        <button class="console-button primary" type="button" data-action="env-studio-generate-fields">Generate Currents &amp; Science Fields</button>
      </section>
      <section class="console-section" data-keep-title="true" data-accordion-key="import-export">
        <h2>Import / Export / Launch</h2>
        <button class="console-button primary" type="button" data-action="env-studio-export-project">Export Project JSON</button>
        <button class="console-button secondary" type="button" data-action="env-studio-export-bathymetry">Export Bathymetry Artifact</button>
        <button class="console-button secondary" type="button" disabled title="Environment adapter validation is planned for ENV-STUDIO-R1.2.">Export Environment Artifact</button>
        <button class="console-button secondary" type="button" disabled title="Benchmark bundle export requires validated environment adapters.">Export Public Benchmark Bundle</button>
        <label class="console-button secondary" for="env-studio-import-file">Import Project JSON</label>
        <input id="env-studio-import-file" type="file" accept="application/json,.json" hidden data-env-studio-import />
        <button class="console-button secondary" type="button" disabled data-action="env-studio-launch-planning">Launch to Planning is planned after regional bathymetry preview and environment adapter validation stabilize.</button>
        <button class="console-button secondary" type="button" data-action="menu">Main Menu</button>
      </section>
    `);

    const root = this.app.elements?.consoleRoot ?? globalThis.document;
    root?.querySelector?.('[data-env-studio-profile]')?.addEventListener('change', (event) => this.applyProfile(event.target.value));
    root?.querySelector?.('[data-env-studio-archetype]')?.addEventListener('change', (event) => this.updateArchetype(event.target.value));
    root?.querySelector?.('[data-action="env-studio-apply-domain"]')?.addEventListener('click', () => this.applyDomainControls());
    root?.querySelector?.('[data-action="env-studio-generate-tile"]')?.addEventListener('click', () => this.generateTile());
    root?.querySelector?.('[data-action="env-studio-create-mosaic"]')?.addEventListener('click', () => this.createMosaic());
    root?.querySelector?.('[data-action="env-studio-generate-fields"]')?.addEventListener('click', () => this.generateFields());
    root?.querySelector?.('[data-action="env-studio-export-project"]')?.addEventListener('click', () => this.exportProject());
    root?.querySelector?.('[data-action="env-studio-export-bathymetry"]')?.addEventListener('click', () => this.exportBathymetryArtifact());
    root?.querySelector?.('[data-env-studio-import]')?.addEventListener('change', (event) => this.importProject(event.target.files?.[0]));
    root?.querySelector?.('[data-action="menu"]')?.addEventListener('click', () => this.scene.start('MainMenuScene'));
  }

  renderRightPanel() {
    const root = this.app.elements?.waypointTimelineRoot;
    if (!root) return;
    if (isReferenceAtlasStage(this.session.studioStage) || (this.session.studioStage === 'regionalPatchWorkspace' && this.session.sourceMode === 'referenceBathymetryAtlas' && !this.session.bathymetryArtifactDigest)) {
      root.innerHTML = referenceAtlasRightPanelHtml(this.session);
      return;
    }
    if (this.session.studioStage === 'worldMap') {
      root.innerHTML = worldMapRightPanelHtml(this.session);
      return;
    }
    if (this.session.studioStage === 'atlasWindow') {
      root.innerHTML = atlasRightPanelHtml(this.session);
      return;
    }
    const project = buildEnvironmentStudioProject(this.session);
    const inspector = environmentStudioInspectorViewModel(this.session);
    root.innerHTML = `
      <section class="waypoint-shell environment-studio-right-panel" id="env-studio-status-panel">
        <div class="console-kicker">Contextual Inspector</div>
        <h2>${escapeHtml(inspector.type)}</h2>
        <p class="hud-muted">Selected object: ${escapeHtml(inspector.objectType)} / ${escapeHtml(inspector.objectId)}. Dependency state does not alter mission simulation.</p>
        <div class="cell-inspector-metrics">
          ${metricHtml('Tiles', this.session.tiles.length)}
          ${metricHtml('Tile Mosaic', this.session.mosaic?.manifest ? '2 x 2' : 'none')}
          ${metricHtml('Project Digest', shortDigest(project.projectDigest))}
          ${metricHtml('Inspector Status', inspector.status)}
        </div>
        ${inspectorPropertiesHtml(inspector)}
        ${inspectorActionsHtml(inspector)}
        <div class="console-kicker environment-studio-panel-kicker">Feature Summary</div>
        ${featureSummaryHtml(this.session.regionalFeatureSummary)}
        ${featureRecordButtonsHtml(this.session.featureRecords, this.session.selectedObject)}
        <div class="console-kicker environment-studio-panel-kicker">Generated Field Status</div>
        ${dependencyGraphTable(this.session.dependencyGraph)}
        ${fieldRegenerationSummaryHtml(this.session.fieldRegenerationResult)}
        ${validationListHtml(this.session.validationReport)}
      </section>
    `;
    this.bindSelectionControls(root);
  }

  renderPreview() {
    if (!this.previewHost) return;
    this.destroyGlobeRenderer();
    this.cleanupReferenceAtlasPreviewBinding();
    const project = buildEnvironmentStudioProject(this.session);
    if (isReferenceAtlasStage(this.session.studioStage) || (this.session.studioStage === 'regionalPatchWorkspace' && !this.session.bathymetryArtifactDigest)) {
      this.previewHost.innerHTML = referenceAtlasPreviewHtml(this.session, project);
      bindReferenceBathymetryPreview(this, this.previewHost);
      return;
    }
    if (this.session.studioStage === 'worldMap') {
      this.previewHost.innerHTML = worldMapPreviewHtml(this.session, project);
      bindEnvironmentStudioGlobePreview(this, this.previewHost);
      mountSyntheticGlobeRenderer(this, this.previewHost);
      return;
    }
    if (this.session.studioStage === 'atlasWindow') {
      this.previewHost.innerHTML = atlasPreviewHtml(this.session, project);
      bindEnvironmentStudioAtlasControls(this, this.previewHost);
      return;
    }
    this.previewHost.innerHTML = `
      <main id="environment-studio-route" class="environment-studio-route">
        <header class="environment-studio-route-header">
          <div>
            <p class="console-kicker">Unified Environment Studio</p>
            <h1>Regional Bathymetry Detail</h1>
            <p>High-resolution synthetic regional bathymetry generated from the selected world-map boundary. The canonical source grid remains in project export.</p>
          </div>
          <label class="environment-studio-preview-mode">
            Preview Mode
            <select id="env-studio-preview-mode" data-env-studio-preview-mode>
              ${ENVIRONMENT_STUDIO_PREVIEW_MODES.map((mode) => `<option value="${escapeAttr(mode.id)}" ${mode.id === this.session.previewMode ? 'selected' : ''}>${escapeHtml(mode.label)}</option>`).join('')}
            </select>
          </label>
          ${previewCameraControlsHtml(this.session)}
          <div class="environment-studio-digest">
            <span>Project Digest</span>
            <strong>${escapeHtml(shortDigest(project.projectDigest))}</strong>
            <span>Bathymetry Artifact</span>
            <strong>${escapeHtml(shortDigest(this.session.bathymetryArtifactDigest ?? this.session.bathymetryBuilderResult?.bathymetryArtifactDigest))}</strong>
          </div>
        </header>
        <section class="environment-studio-preview-grid" aria-label="Regional bathymetry preview">
          ${previewModeHtml(this.session)}
        </section>
        <section class="environment-studio-boundary">
          <strong>Boundary</strong>
          <span>Scientifically constrained synthetic bathymetry. Not calibrated regional forecast, operational bathymetry, or certified navigation data. No scoring changes.</span>
        </section>
      </main>
    `;
    this.previewHost.querySelector?.('[data-env-studio-preview-mode]')?.addEventListener('change', (event) => {
      this.session = setEnvironmentStudioPreviewMode(this.session, event.target.value);
      this.statusMessage = `Preview mode changed to ${event.target.selectedOptions?.[0]?.textContent ?? event.target.value}.`;
      this.render();
    });
    bindEnvironmentStudioPreviewControls(this, this.previewHost);
    this.bindSelectionControls(this.previewHost);
  }

  updatePreviewCamera(patch = {}) {
    this.session = setEnvironmentStudioPreviewCameraState(this.session, patch);
    this.statusMessage = 'Preview camera updated. UI-only camera state is preserved in project exports as noncanonical metadata.';
    this.lastError = null;
    this.render();
  }

  setSourceMode(sourceMode) {
    this.worldTileCanvasCache?.clear?.();
    this.session = setEnvironmentStudioSourceMode(this.session, sourceMode);
    if (sourceMode === 'proceduralSyntheticSandbox') {
      this.statusMessage = 'Procedural synthetic sandbox opened as an experimental compatibility path.';
    } else if (sourceMode === 'referenceBathymetryAtlas') {
      this.statusMessage = this.referenceDataAvailable()
        ? referenceFixtureAvailabilityMessage(this.session)
        : 'Reference Bathymetry Atlas is the default source path, but generation is blocked until fixture data is preprocessed.';
    } else {
      this.statusMessage = `${labelize(sourceMode)} is staged; use Reference Bathymetry Atlas for the current browser path.`;
    }
    this.lastError = sourceMode === 'referenceBathymetryAtlas' && !this.referenceDataAvailable()
      ? REFERENCE_BATHYMETRY_BLOCKED_MESSAGE
      : sourceMode === 'referenceBathymetryAtlas' || sourceMode === 'proceduralSyntheticSandbox'
        ? null
        : 'This source mode is planned and does not generate artifacts in REAL-BATHY-R1.';
    this.render();
  }

  setReferenceLayer(layerId) {
    this.session = setEnvironmentStudioReferenceLayer(this.session, layerId);
    this.statusMessage = `Showing ${labelize(layerId)} reference layer.`;
    this.lastError = null;
    this.render();
  }

  resetReferenceView() {
    this.session = setEnvironmentStudioWorldView(this.session, { panX: 0, panY: 0, rotationYawDegrees: 0, rotationPitchDegrees: 0, zoom: 1 });
    this.statusMessage = 'Reference atlas view reset.';
    this.lastError = null;
    this.render();
  }

  adjustReferenceView(action) {
    const view = this.session.worldView ?? {};
    const patch = { ...view };
    const panStep = 0.08;
    if (action === 'left') patch.panX = Number(view.panX ?? 0) - panStep;
    if (action === 'right') patch.panX = Number(view.panX ?? 0) + panStep;
    if (action === 'up') patch.panY = Number(view.panY ?? 0) - panStep;
    if (action === 'down') patch.panY = Number(view.panY ?? 0) + panStep;
    if (action === 'zoom-in') patch.zoom = clampNumber(Number(view.zoom ?? 1) * 1.32, 1, REFERENCE_ATLAS_MAX_ZOOM);
    if (action === 'zoom-out') patch.zoom = clampNumber(Number(view.zoom ?? 1) / 1.32, 1, REFERENCE_ATLAS_MAX_ZOOM);
    if (action === 'reset') return this.resetReferenceView();
    this.session = setEnvironmentStudioWorldView(this.session, patch);
    this.statusMessage = 'Reference atlas view updated.';
    this.lastError = null;
    this.render();
  }

  focusSelectedReferencePatch() {
    const selectedBounds = this.session.selectedReferenceWindow?.bounds;
    const fallbackFixture = (this.session.referenceAtlas?.referenceFixtures ?? this.session.referenceBathymetryManifest?.fixtures ?? [])
      .find((fixture) => fixture.role === 'missionReadyPatch')
      ?? (this.session.referenceAtlas?.referenceFixtures ?? this.session.referenceBathymetryManifest?.fixtures ?? [])[0];
    const bounds = selectedBounds ?? fallbackFixture?.bounds;
    if (!bounds) {
      this.statusMessage = 'No reference patch is available to focus.';
      this.lastError = null;
      this.render();
      return;
    }
    const centerLon = (Number(bounds.westLon) + Number(bounds.eastLon)) / 2;
    const centerLat = (Number(bounds.southLat) + Number(bounds.northLat)) / 2;
    this.session = setEnvironmentStudioWorldView(
      this.session,
      referenceAtlasViewForCenter(centerLon, centerLat, REFERENCE_ATLAS_FOCUS_ZOOM, this.session.referenceAtlas)
    );
    this.statusMessage = `Focused atlas view on ${fallbackFixture?.fixtureId ?? 'selected reference patch'}.`;
    this.lastError = null;
    this.render();
  }

  toggleReferenceBoundaryDrawing() {
    if (!this.referenceDataAvailable()) {
      this.referenceBoundaryDrawing = false;
      this.statusMessage = 'Reference bathymetry boundary drawing is blocked until preprocessed fixture data is available.';
      this.lastError = REFERENCE_BATHYMETRY_BLOCKED_MESSAGE;
      this.render();
      return;
    }
    this.referenceBoundaryDrawing = !this.referenceBoundaryDrawing;
    this.statusMessage = this.referenceBoundaryDrawing
      ? 'Bounding-box selection enabled. Drag the atlas map to draw; drag inside a selected box to move it, edges/corners to resize it.'
      : 'Bounding-box selection disabled.';
    this.render();
  }

  referenceDataAvailable() {
    return this.session.referenceAtlas?.sourceDataset?.referenceDataAvailable === true;
  }

  blockReferenceBathymetryAction(actionLabel = 'Reference bathymetry action') {
    this.referenceBoundaryDrawing = false;
    this.statusMessage = `${actionLabel} is blocked until a preprocessed public bathymetry fixture is available.`;
    this.lastError = REFERENCE_BATHYMETRY_BLOCKED_MESSAGE;
    this.render();
  }

  recordAtlasAction(actionKey, result, message, { blocked = false, toastKind = 'info' } = {}) {
    this.lastClickedAction = actionKey;
    this.lastActionResult = result;
    this.lastActionToast = message;
    if (blocked) {
      this.lastBlockedAction = actionKey;
      this.lastBlockedActionReason = message;
      this.app?.toast?.(message, toastKind);
    }
  }

  blockAtlasAction(actionKey, reason) {
    const message = reason || 'This atlas action is unavailable for the selected region.';
    this.recordAtlasAction(actionKey, 'blocked', message, { blocked: true, toastKind: 'warning' });
    this.statusMessage = message;
    this.lastError = message;
    this.render();
  }

  referenceBudgetAllowsGeneration(actionLabel = 'Reference generation') {
    const budget = this.session.selectedReferenceBoundaryBudget ?? this.session.selectedReferenceAvailability?.boundaryBudget ?? null;
    if (!budget || budget.generationAllowed !== false) return true;
    const message = budget.budgetStatus === 'MULTI_TILE_REQUIRED'
      ? REFERENCE_ATLAS_MULTITILE_MESSAGE
      : REFERENCE_ATLAS_BUDGET_BLOCKED_MESSAGE;
    const reason = `${actionLabel} blocked: ${message}`;
    this.oversizeGenerationBlockedCount += 1;
    this.lastBlockedGenerationReason = reason;
    this.statusMessage = budget.budgetStatus === 'MULTI_TILE_REQUIRED'
      ? `${actionLabel} disabled for this large operational window. Export a multi-tile patch request.`
      : `${actionLabel} blocked by Alpha region-size budget.`;
    this.lastError = message;
    this.render();
    return false;
  }

  referenceSelectionStatusMessage(availability = null, budget = null) {
    if (budget?.budgetStatus === 'MULTI_TILE_REQUIRED') {
      return 'Selected valid large operational window. Multi-tile preprocessing is required before generation.';
    }
    if (budget?.budgetStatus === 'BLOCKED') return REFERENCE_ATLAS_BUDGET_BLOCKED_MESSAGE;
    if (budget?.budgetStatus === 'WARN') return 'Near or above live Alpha limit. Export patch request or reduce the window.';
    if (availability?.available) return `Selected atlas region matches ${availability.matchedFixtureRole}: ${availability.matchedFixtureId}.`;
    return 'Selected operational window is not staged. Export a patch request to preprocess it offline.';
  }

  referenceSelectionErrorMessage(availability = null, budget = null) {
    if (budget?.budgetStatus === 'MULTI_TILE_REQUIRED') return REFERENCE_ATLAS_MULTITILE_MESSAGE;
    if (budget?.budgetStatus === 'BLOCKED') return REFERENCE_ATLAS_BUDGET_BLOCKED_MESSAGE;
    return availability?.available ? null : 'High-resolution patch not staged for the selected atlas region.';
  }

  syncOperationalWindowEditorFromBounds(boundsInput = null, options = {}) {
    if (!boundsInput) {
      this.operationalWindowEditor = {
        ...this.operationalWindowEditor,
        westLon: null,
        eastLon: null,
        southLat: null,
        northLat: null,
        appliedFrom: options.appliedFrom ?? this.operationalWindowEditor.appliedFrom ?? null,
        tinySelectionExpanded: options.tinySelectionExpanded === true,
        lastPreset: options.lastPreset ?? this.operationalWindowEditor.lastPreset ?? null
      };
      return;
    }
    const operational = estimateReferenceAtlasOperationalWindow(boundsInput, {
      userIntent: options.lastPreset ?? this.operationalWindowEditor.lastPreset ?? options.mode ?? this.operationalWindowEditor.mode
    });
    this.operationalWindowEditor = {
      mode: options.mode ?? (options.lastPreset === 'custom' ? 'drawCustom' : options.lastPreset) ?? this.operationalWindowEditor.mode ?? 'drawCustom',
      centerLon: operational.centerLon,
      centerLat: operational.centerLat,
      widthKm: operational.widthKm,
      heightKm: operational.heightKm,
      westLon: operational.bounds.westLon,
      eastLon: operational.bounds.eastLon,
      southLat: operational.bounds.southLat,
      northLat: operational.bounds.northLat,
      appliedFrom: options.appliedFrom ?? 'selection',
      tinySelectionExpanded: options.tinySelectionExpanded === true,
      lastPreset: options.lastPreset ?? this.operationalWindowEditor.lastPreset ?? null
    };
  }

  operationalWindowEditorDebugPayload() {
    return { ...createDefaultOperationalWindowEditor(), ...(this.operationalWindowEditor ?? {}) };
  }

  referenceAtlasRectangleEditorDebugPayload() {
    const canvas = this.referenceAtlasPreviewBinding?.canvas;
    const rect = canvas?.getBoundingClientRect?.();
    const canvasSize = {
      width: Number(rect?.width ?? canvas?.width ?? 900),
      height: Number(rect?.height ?? canvas?.height ?? 450)
    };
    const geometry = referenceAtlasRectangleGeometry({
      enabled: this.referenceAtlasRectangleEditor?.enabled !== false,
      selectedBounds: this.referenceAtlasTransientBounds ?? this.session.selectedReferenceWindow?.bounds ?? null,
      worldView: this.referenceAtlasTransientView ?? this.session.worldView ?? {},
      atlas: this.session.referenceAtlas,
      canvasSize,
      hitTargetPx: REFERENCE_ATLAS_RECTANGLE_HIT_TARGET_PX,
      activeHandle: this.referenceAtlasRectangleEditor?.activeHandle ?? null,
      activeDragMode: this.referenceAtlasRectangleEditor?.activeDragMode ?? REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.none,
      hoverHandle: this.referenceAtlasRectangleEditor?.hoverHandle ?? null
    });
    return {
      ...geometry,
      movedCount: Number(this.referenceAtlasRectangleEditor?.movedCount ?? 0),
      resizedEdgeCount: Number(this.referenceAtlasRectangleEditor?.resizedEdgeCount ?? 0),
      resizedCornerCount: Number(this.referenceAtlasRectangleEditor?.resizedCornerCount ?? 0),
      tinySelectionHandled: this.referenceAtlasRectangleEditor?.tinySelectionHandled === true,
      lastResizePreservedOppositeEdge: this.referenceAtlasRectangleEditor?.lastResizePreservedOppositeEdge !== false,
      lastBudgetStatus: this.referenceAtlasRectangleEditor?.lastBudgetStatus ?? this.session.selectedReferenceBoundaryBudget?.budgetStatus ?? null,
      lastPatchAvailability: this.referenceAtlasRectangleEditor?.lastPatchAvailability ?? this.session.selectedReferenceAvailability?.status ?? null,
      hiddenTruthExposed: false,
      rawExternalDataPathExposed: false,
      simulationChanged: false,
      scoringChanged: false
    };
  }

  readOperationalWindowEditorFromControls() {
    const current = this.operationalWindowEditorDebugPayload();
    return {
      mode: this.readValue('env-reference-window-mode', current.mode),
      centerLon: this.numberValue('env-reference-center-lon', current.centerLon),
      centerLat: this.numberValue('env-reference-center-lat', current.centerLat),
      widthKm: this.numberValue('env-reference-width-km', current.widthKm),
      heightKm: this.numberValue('env-reference-height-km', current.heightKm),
      westLon: this.numberValue('env-reference-west-lon', current.westLon),
      eastLon: this.numberValue('env-reference-east-lon', current.eastLon),
      southLat: this.numberValue('env-reference-south-lat', current.southLat),
      northLat: this.numberValue('env-reference-north-lat', current.northLat)
    };
  }

  applyOperationalWindowEditor(appliedFrom = 'typed') {
    if (!this.referenceDataAvailable()) {
      this.blockReferenceBathymetryAction('Operational window editor');
      return;
    }
    const editor = this.readOperationalWindowEditorFromControls();
    const hasTypedBounds = [editor.westLon, editor.eastLon, editor.southLat, editor.northLat].every(Number.isFinite)
      && editor.eastLon > editor.westLon
      && editor.northLat > editor.southLat;
    const useTypedBounds = editor.mode === 'drawCustom' && hasTypedBounds;
    const bounds = useTypedBounds
      ? {
          westLon: editor.westLon,
          eastLon: editor.eastLon,
          southLat: editor.southLat,
          northLat: editor.northLat
        }
      : referenceAtlasBoundsForKilometerWindow(editor);
    this.selectReferenceBounds(bounds, {
      appliedFrom,
      mode: editor.mode === 'custom' ? 'drawCustom' : editor.mode,
      lastPreset: editor.mode === 'drawCustom' ? null : editor.mode
    });
  }

  moveOperationalWindowToMapCenter() {
    const viewport = referenceAtlasViewport(this.session.worldView, this.session.referenceAtlas);
    const editor = this.operationalWindowEditorDebugPayload();
    this.operationalWindowEditor = {
      ...editor,
      centerLon: viewport.centerLon,
      centerLat: viewport.centerLat,
      appliedFrom: 'mapCenter'
    };
    const bounds = referenceAtlasBoundsForKilometerWindow({
      centerLon: viewport.centerLon,
      centerLat: viewport.centerLat,
      widthKm: editor.widthKm,
      heightKm: editor.heightKm
    });
    this.selectReferenceBounds(bounds, {
      appliedFrom: 'mapCenter',
      mode: editor.mode,
      lastPreset: editor.lastPreset
    });
  }

  expandOperationalWindowToPreset(presetId = 'localPatch') {
    const editor = this.operationalWindowEditorDebugPayload();
    const viewport = referenceAtlasViewport(this.session.worldView, this.session.referenceAtlas);
    const centerLon = Number.isFinite(Number(editor.centerLon)) ? editor.centerLon : viewport.centerLon;
    const centerLat = Number.isFinite(Number(editor.centerLat)) ? editor.centerLat : viewport.centerLat;
    this.selectReferenceOperationalPreset(presetId, { centerLon, centerLat });
  }

  selectReferenceWindowAt(lon, lat) {
    if (!this.referenceDataAvailable()) {
      this.blockReferenceBathymetryAction('Reference patch selection');
      return;
    }
    this.lastReferenceMapPoint = { lon: Number(lon), lat: Number(lat) };
    const fixtureAtPoint = referenceFixtureAtLonLat(this.session.referenceAtlas, lon, lat);
    if (fixtureAtPoint?.bounds && !this.referenceBoundaryDrawing) {
      this.selectReferenceFixture(fixtureAtPoint.fixtureId);
      return;
    }
    const presetBounds = referenceAtlasBoundsForOperationalPreset({ lon, lat }, 'localPatch');
    this.session = selectEnvironmentStudioReferenceWindow(this.session, {
      ...presetBounds,
      selectedResolutionMeters: this.numberValue('env-reference-output-resolution', 1500),
      previewResolutionMeters: this.numberValue('env-reference-preview-resolution', 6000)
    });
    this.referenceBoundaryDrawing = false;
    const availability = this.session.selectedReferenceAvailability;
    const budget = this.session.selectedReferenceBoundaryBudget;
    this.syncOperationalWindowEditorFromBounds(this.session.selectedReferenceWindow?.bounds, {
      appliedFrom: 'mapClick',
      mode: 'localPatch',
      lastPreset: 'localPatch',
      tinySelectionExpanded: true
    });
    this.statusMessage = this.referenceSelectionStatusMessage(availability, budget);
    this.lastError = this.referenceSelectionErrorMessage(availability, budget);
    this.render();
  }

  selectReferenceOperationalPreset(presetId = 'regionalSurvey', centerInput = {}) {
    if (!this.referenceDataAvailable()) {
      this.blockReferenceBathymetryAction('Reference operational window selection');
      return;
    }
    if (presetId === 'custom') {
      this.operationalWindowEditor = {
        ...this.operationalWindowEditorDebugPayload(),
        mode: 'drawCustom',
        appliedFrom: 'mode',
        lastPreset: 'custom'
      };
      this.referenceBoundaryDrawing = true;
      this.statusMessage = 'Custom operational window mode enabled. Drag the atlas map to draw a lon/lat region.';
      this.lastError = null;
      this.render();
      return;
    }
    const existing = this.session.selectedReferenceWindow?.bounds;
    const viewport = referenceAtlasViewport(this.session.worldView, this.session.referenceAtlas);
    const mapPoint = this.lastReferenceMapPoint;
    const inferredCenterLon = existing
      ? (Number(existing.westLon) + Number(existing.eastLon)) / 2
      : (Number.isFinite(Number(mapPoint?.lon)) ? mapPoint.lon : (viewport?.centerLon ?? -122.25));
    const inferredCenterLat = existing
      ? (Number(existing.southLat) + Number(existing.northLat)) / 2
      : (Number.isFinite(Number(mapPoint?.lat)) ? mapPoint.lat : (viewport?.centerLat ?? 36.6));
    const centerLon = Number(centerInput.lon ?? centerInput.centerLon ?? inferredCenterLon);
    const centerLat = Number(centerInput.lat ?? centerInput.centerLat ?? inferredCenterLat);
    const bounds = referenceAtlasBoundsForOperationalPreset({ centerLon, centerLat }, presetId);
    this.selectReferenceBounds(bounds, { appliedFrom: 'preset', mode: presetId, lastPreset: presetId });
  }

  selectReferenceBounds(boundsInput = {}, options = {}) {
    if (!this.referenceDataAvailable()) {
      this.blockReferenceBathymetryAction('Reference patch selection');
      return;
    }
    const bounds = {
      westLon: Number(boundsInput.westLon),
      eastLon: Number(boundsInput.eastLon),
      southLat: Number(boundsInput.southLat),
      northLat: Number(boundsInput.northLat)
    };
    const requestedOperationalWindow = estimateReferenceAtlasOperationalWindow(bounds, {
      userIntent: options.lastPreset ?? options.mode ?? 'drawCustom'
    });
    const tinySelectionExpanded = requestedOperationalWindow.warnings?.includes(REFERENCE_ATLAS_TINY_SELECTION_MESSAGE)
      || requestedOperationalWindow.widthKm < REFERENCE_ATLAS_MIN_USEFUL_WINDOW_KM
      || requestedOperationalWindow.heightKm < REFERENCE_ATLAS_MIN_USEFUL_WINDOW_KM;
    this.session = selectEnvironmentStudioReferenceWindow(this.session, {
      ...bounds,
      selectedResolutionMeters: this.numberValue('env-reference-output-resolution', 1500),
      previewResolutionMeters: this.numberValue('env-reference-preview-resolution', 6000)
    });
    this.referenceBoundaryDrawing = false;
    this.referenceAtlasTransientBounds = null;
    const availability = this.session.selectedReferenceAvailability;
    const budget = this.session.selectedReferenceBoundaryBudget;
    this.syncOperationalWindowEditorFromBounds(this.session.selectedReferenceWindow?.bounds, {
      appliedFrom: options.appliedFrom ?? 'selection',
      mode: options.mode ?? this.operationalWindowEditor.mode,
      lastPreset: options.lastPreset ?? this.operationalWindowEditor.lastPreset,
      tinySelectionExpanded
    });
    this.referenceAtlasRectangleEditor = {
      ...this.referenceAtlasRectangleEditor,
      tinySelectionHandled: tinySelectionExpanded === true,
      activeHandle: null,
      activeDragMode: REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.none,
      hoverHandle: null,
      lastBudgetStatus: budget?.budgetStatus ?? null,
      lastPatchAvailability: availability?.status ?? (availability?.available ? 'AVAILABLE' : 'NOT_STAGED')
    };
    this.statusMessage = tinySelectionExpanded
      ? `${REFERENCE_ATLAS_TINY_SELECTION_MESSAGE} Expanded to Local Patch.`
      : this.referenceSelectionStatusMessage(availability, budget);
    this.lastError = this.referenceSelectionErrorMessage(availability, budget);
    this.render();
  }

  selectReferenceFixture(fixtureId) {
    const fixture = (this.session.referenceAtlas?.referenceFixtures ?? this.session.referenceBathymetryManifest?.fixtures ?? [])
      .find((entry) => entry.fixtureId === fixtureId);
    if (!fixture?.bounds) {
      this.statusMessage = 'Reference fixture selection failed.';
      this.lastError = `Unknown reference fixture: ${fixtureId}`;
      this.render();
      return;
    }
    this.session = selectEnvironmentStudioReferenceWindow(this.session, {
      ...fixture.bounds,
      selectedResolutionMeters: this.numberValue('env-reference-output-resolution', 1500),
      previewResolutionMeters: this.numberValue('env-reference-preview-resolution', 6000)
    }, { selectedReferenceFixtureId: fixture.fixtureId });
    this.referenceBoundaryDrawing = false;
    this.syncOperationalWindowEditorFromBounds(this.session.selectedReferenceWindow?.bounds, {
      appliedFrom: 'fixture',
      mode: 'drawCustom',
      lastPreset: null,
      tinySelectionExpanded: false
    });
    this.referenceAtlasRectangleEditor = {
      ...this.referenceAtlasRectangleEditor,
      tinySelectionHandled: false,
      activeHandle: null,
      activeDragMode: REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.none,
      hoverHandle: null,
      lastBudgetStatus: this.session.selectedReferenceBoundaryBudget?.budgetStatus ?? null,
      lastPatchAvailability: this.session.selectedReferenceAvailability?.status ?? (this.session.selectedReferenceAvailability?.available ? 'AVAILABLE' : 'NOT_STAGED')
    };
    this.statusMessage = fixture.role === 'lowResolutionReferencePatch'
      ? `Selected low-resolution fallback overlay: ${fixture.fixtureId}. Use only as a fallback; it is not a missionReadyPatch.`
      : `Selected ${fixture.role} overlay: ${fixture.fixtureId}.`;
    this.lastError = null;
    this.render();
  }

  loadSelectedReferencePatch() {
    try {
      const actionState = referenceAtlasStageActionState(this.session);
      if (!actionState.loadMissionPatchEnabled) {
        this.blockAtlasAction('loadMissionPatch', blockedAtlasActionMessage('loadMissionPatch', actionState));
        return;
      }
      if (!this.referenceDataAvailable()) {
        this.blockReferenceBathymetryAction('Reference patch load');
        return;
      }
      if (!this.referenceBudgetAllowsGeneration('Load Mission Patch')) return;
      this.session = loadEnvironmentStudioReferenceFixture(this.session);
      this.statusMessage = `Loaded ${this.session.loadedReferenceFixtureRole}: ${this.session.loadedReferenceFixtureId}.`;
      this.lastError = null;
      this.recordAtlasAction('loadMissionPatch', 'executed', this.statusMessage);
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this.statusMessage = 'Reference patch load failed.';
      this.recordAtlasAction('loadMissionPatch', 'failed', `${this.statusMessage} ${this.lastError}`);
    }
    this.render();
  }

  async continueToRegionalBathymetry() {
    const actionState = referenceAtlasStageActionState(this.session);
    if (!actionState.continueToBathymetryEnabled) {
      this.blockAtlasAction('continueToBathymetry', blockedAtlasActionMessage('continueToBathymetry', actionState));
      return;
    }
    try {
      const tileSetId = actionState.tileSetId;
      const tileSet = await loadTileSet(tileSetId, { library: this.referenceTileLibrary });
      const tileMetadata = compactTileSetForSceneStart(tileSet);
      const meshDescriptor = preferredMeshLodDescriptor(tileSet.metadata?.meshLods ?? tileSet.meshLods ?? []);
      let meshLodMetadata = meshDescriptor ? compactMeshLodForSceneStart({}, meshDescriptor) : null;
      if (meshDescriptor?.lod) {
        try {
          const meshArtifact = await loadMeshLod(tileSetId, meshDescriptor.lod, { library: this.referenceTileLibrary });
          meshLodMetadata = compactMeshLodForSceneStart(meshArtifact, meshDescriptor);
        } catch (meshError) {
          this.referenceTileLibraryWarning = `Mesh LOD metadata could not be loaded before transition: ${meshError?.message ?? String(meshError)}`;
        }
      }
      this.scene.start('RegionalBathymetryScene', {
        source: 'environmentStudioAtlas',
        session: cloneJsonForSceneStart(this.session),
        selectedBounds: cloneJsonForSceneStart(actionState.selectedBounds),
        tileSetId,
        tileSetRole: tileSet.role ?? actionState.tileSetRole,
        rasterPath: tileSet.rasterTiles?.path ?? tileSet.metadata?.rasterTiles?.path ?? null,
        rasterDigest: tileSet.rasterTiles?.digest ?? tileSet.metadata?.rasterTiles?.digest ?? tileSet.digests?.raster ?? null,
        meshLodPath: meshDescriptor?.path ?? null,
        meshLodDigest: meshDescriptor?.digest ?? null,
        preferredMeshLod: meshDescriptor?.lod ?? 'medium',
        tileSetMetadata: tileMetadata,
        meshLodMetadata,
        rasterAuthoritativeForSimulation: true,
        meshAuthoritativeForSimulation: false
      });
      this.recordAtlasAction('continueToBathymetry', 'executed', 'Opening Regional 3D Bathymetry Workspace.');
    } catch (error) {
      this.statusMessage = 'Could not open Regional 3D Bathymetry Workspace.';
      this.lastError = error?.message ?? String(error);
      this.recordAtlasAction('continueToBathymetry', 'failed', `Unable to open Regional Bathymetry Workspace: ${this.lastError}`);
      this.render();
    }
  }

  openCoarseRegionalPreview() {
    const actionState = referenceAtlasStageActionState(this.session);
    if (!actionState.openCoarsePreviewEnabled) {
      this.blockAtlasAction('openCoarsePreview', blockedAtlasActionMessage('openCoarsePreview', actionState));
      return;
    }
    try {
      this.scene.start('RegionalBathymetryScene', {
        source: 'environmentStudioAtlas',
        mode: 'coarsePreview',
        session: cloneJsonForSceneStart(this.session),
        selectedBounds: cloneJsonForSceneStart(actionState.selectedBounds),
        overviewMetadata: compactReferenceOverviewForSceneStart(this.session),
        boundaryBudget: cloneJsonForSceneStart(this.session.selectedReferenceBoundaryBudget ?? null),
        rasterAuthoritativeForSimulation: false,
        meshAuthoritativeForSimulation: false,
        planningLaunchEnabled: false
      });
      this.recordAtlasAction('openCoarsePreview', 'executed', 'Opening coarse regional preview. High-resolution tile staging remains required before Planning launch.');
    } catch (error) {
      this.statusMessage = 'Could not open coarse regional preview.';
      this.lastError = error?.message ?? String(error);
      this.recordAtlasAction('openCoarsePreview', 'failed', `Unable to open coarse regional preview: ${this.lastError}`);
      this.render();
    }
  }

  inspectLowResolutionFallback() {
    const actionState = referenceAtlasStageActionState(this.session);
    if (!actionState.inspectFallbackEnabled) {
      this.blockAtlasAction('inspectFallback', blockedAtlasActionMessage('inspectFallback', actionState));
      return;
    }
    this.statusMessage = 'Low-resolution fallback is staged for inspection only. Continue to 3D Bathymetry requires a mission-ready hosted tile.';
    this.lastError = null;
    this.recordAtlasAction('inspectFallback', 'executed', this.statusMessage);
    this.render();
  }

  exportReferencePatchRequest() {
    const actionState = referenceAtlasStageActionState(this.session);
    if (!actionState.exportPatchRequestEnabled && !actionState.exportMultiTileRequestEnabled) {
      this.blockAtlasAction('exportPatchRequest', blockedAtlasActionMessage('exportPatchRequest', actionState));
      return;
    }
    const selectedBounds = this.session.selectedReferenceWindow?.bounds;
    const budget = this.session.selectedReferenceBoundaryBudget ?? this.session.selectedReferenceAvailability?.boundaryBudget ?? null;
    const request = this.session.referencePatchRequest
      ?? (selectedBounds
        ? (budget?.multiTileRecommended || budget?.recommendedAction === 'exportMultiTilePatchRequest'
          ? createReferenceBathymetryMultiTilePatchRequest(selectedBounds, this.session.referenceAtlas, {
              boundaryBudget: budget,
              generationBudget: budget,
              operationalWindow: budget?.operationalWindow
            })
          : createReferenceBathymetryPatchRequest(selectedBounds, this.session.referenceAtlas, {
              boundaryBudget: budget,
              generationBudget: budget,
              operationalWindow: budget?.operationalWindow
            }))
        : null);
    if (!request) {
      this.lastError = 'Select an unstaged atlas region before exporting a patch request.';
      this.statusMessage = 'Patch request export skipped.';
      this.recordAtlasAction('exportPatchRequest', 'blocked', this.lastError, { blocked: true, toastKind: 'warning' });
      this.render();
      return;
    }
    const fixtureName = request.suggestedFixtureId ?? request.suggestedFixturePrefix ?? 'reference-bathymetry-request';
    const isMultiTile = request.artifactType === 'anchor.reference-bathymetry-multitile-patch-request';
    downloadJSON(`${fixtureName}.${isMultiTile ? 'reference-bathymetry-multitile-patch-request' : 'reference-bathymetry-patch-request'}.json`, request);
    this.lastPatchRequestType = request.artifactType ?? null;
    this.lastPatchRequestDigest = request.requestDigest ?? null;
    this.statusMessage = isMultiTile
      ? 'Exported multi-tile reference bathymetry patch request JSON.'
      : 'Exported reference bathymetry patch request JSON.';
    this.lastError = null;
    this.recordAtlasAction(isMultiTile ? 'exportMultiTileRequest' : 'exportPatchRequest', 'executed', this.statusMessage);
    this.render();
  }

  selectReferenceWindowFromControls() {
    const fixtures = this.session.referenceAtlas?.referenceFixtures ?? this.session.referenceBathymetryManifest?.fixtures ?? [];
    const preferred = fixtures.find((fixture) => fixture.role === 'missionReadyPatch')
      ?? fixtures.find((fixture) => fixture.fixtureId === 'monterey_canyon_15s')
      ?? fixtures[0];
    if (preferred?.fixtureId) {
      this.selectReferenceFixture(preferred.fixtureId);
      return;
    }
    this.selectReferenceWindowAt(-122.25, 36.6);
  }

  clearReferenceWindow() {
    this.session = clearEnvironmentStudioReferenceWindow(this.session);
    this.referenceBoundaryDrawing = false;
    this.referenceAtlasTransientBounds = null;
    this.referenceAtlasRectangleEditor = {
      ...this.referenceAtlasRectangleEditor,
      activeHandle: null,
      activeDragMode: REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.none,
      hoverHandle: null,
      lastBudgetStatus: null,
      lastPatchAvailability: null
    };
    this.syncOperationalWindowEditorFromBounds(null, { appliedFrom: 'clear' });
    this.statusMessage = 'Cleared selected reference bathymetry patch.';
    this.lastError = null;
    this.render();
  }

  adjustReferenceWindow(action) {
    if (!this.referenceDataAvailable()) {
      this.blockReferenceBathymetryAction('Reference patch adjustment');
      return;
    }
    const bounds = this.session.selectedReferenceWindow?.bounds ?? { westLon: -124.4, eastLon: -121.7, southLat: 35.6, northLat: 37.4 };
    const width = Math.max(0.1, Number(bounds.eastLon) - Number(bounds.westLon));
    const height = Math.max(0.1, Number(bounds.northLat) - Number(bounds.southLat));
    const lonStep = width * 0.15;
    const latStep = height * 0.15;
    const patch = { ...bounds };
    if (action === 'left') {
      patch.westLon -= lonStep;
      patch.eastLon -= lonStep;
    }
    if (action === 'right') {
      patch.westLon += lonStep;
      patch.eastLon += lonStep;
    }
    if (action === 'up') {
      patch.southLat += latStep;
      patch.northLat += latStep;
    }
    if (action === 'down') {
      patch.southLat -= latStep;
      patch.northLat -= latStep;
    }
    if (action === 'wider') {
      patch.westLon -= lonStep / 2;
      patch.eastLon += lonStep / 2;
    }
    if (action === 'narrower') {
      patch.westLon += lonStep / 2;
      patch.eastLon -= lonStep / 2;
    }
    if (action === 'taller') {
      patch.southLat -= latStep / 2;
      patch.northLat += latStep / 2;
    }
    if (action === 'shorter') {
      patch.southLat += latStep / 2;
      patch.northLat -= latStep / 2;
    }
    this.session = patchEnvironmentStudioReferenceWindow(this.session, {
      ...patch,
      selectedResolutionMeters: this.numberValue('env-reference-output-resolution', 1500),
      previewResolutionMeters: this.numberValue('env-reference-preview-resolution', 6000)
    });
    this.syncOperationalWindowEditorFromBounds(this.session.selectedReferenceWindow?.bounds, {
      appliedFrom: `adjust:${action}`,
      mode: this.operationalWindowEditor.mode,
      lastPreset: this.operationalWindowEditor.lastPreset,
      tinySelectionExpanded: false
    });
    this.statusMessage = this.referenceSelectionStatusMessage(this.session.selectedReferenceAvailability, this.session.selectedReferenceBoundaryBudget);
    this.lastError = this.referenceSelectionErrorMessage(this.session.selectedReferenceAvailability, this.session.selectedReferenceBoundaryBudget);
    this.referenceAtlasRectangleEditor = {
      ...this.referenceAtlasRectangleEditor,
      activeHandle: null,
      activeDragMode: REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.none,
      hoverHandle: null,
      lastBudgetStatus: this.session.selectedReferenceBoundaryBudget?.budgetStatus ?? null,
      lastPatchAvailability: this.session.selectedReferenceAvailability?.status ?? (this.session.selectedReferenceAvailability?.available ? 'AVAILABLE' : 'NOT_STAGED')
    };
    this.render();
  }

  generateReferenceBathymetry() {
    try {
      if (!this.referenceDataAvailable()) {
        this.blockReferenceBathymetryAction('Reference patch bathymetry generation');
        return;
      }
      if (!this.referenceBudgetAllowsGeneration('Generate 3D Bathymetry')) return;
      if (!this.session.loadedReferenceFixtureId) this.session = loadEnvironmentStudioReferenceFixture(this.session);
      this.session = generateEnvironmentStudioRegionFromReferenceWindow(this.session, { seed: this.readSeed() });
      this.statusMessage = 'Generated regional 3D bathymetry from the selected reference patch.';
      this.lastError = null;
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this.statusMessage = 'Reference patch bathymetry generation failed.';
    }
    this.render();
  }

  setWorldStyle(styleId) {
    this.worldTileCanvasCache?.clear?.();
    this.session = setEnvironmentStudioWorldStyle(this.session, styleId, { seed: this.readWorldSeed() });
    this.statusMessage = 'Generated a deterministic synthetic globe for the selected style.';
    this.lastError = null;
    this.render();
  }

  generateWorld() {
    this.worldTileCanvasCache?.clear?.();
    this.session = setEnvironmentStudioWorldSeed(this.session, this.readWorldSeed());
    this.session = setEnvironmentStudioWorldGeneratorParameters(this.session, this.readWorldGeneratorParameters());
    this.statusMessage = 'Generated synthetic globe fields from the current seed.';
    this.lastError = null;
    this.render();
  }

  randomizeWorldSeed() {
    this.worldTileCanvasCache?.clear?.();
    this.session = randomizeEnvironmentStudioWorldSeed(this.session);
    this.statusMessage = 'Randomized world seed and regenerated the synthetic globe.';
    this.lastError = null;
    this.render();
  }

  setWorldGeneratorParameters() {
    this.worldTileCanvasCache?.clear?.();
    this.session = setEnvironmentStudioWorldGeneratorParameters(this.session, this.readWorldGeneratorParameters());
    this.statusMessage = 'Updated broad synthetic globe controls and regenerated equirectangular fields.';
    this.lastError = null;
    this.render();
  }

  setWorldLayer(layerId) {
    this.session = setEnvironmentStudioWorldLayer(this.session, layerId);
    this.statusMessage = `Showing ${labelize(layerId)} layer.`;
    this.lastError = null;
    this.render();
  }

  resetWorldView() {
    this.session = setEnvironmentStudioWorldView(this.session, { panX: 0, panY: 0, rotationYawDegrees: -22, rotationPitchDegrees: 8, zoom: 1 });
    this.statusMessage = 'Globe view reset.';
    this.lastError = null;
    this.render();
  }

  toggleBoundaryDrawing() {
    this.globeRegionSelectionMode = !this.globeRegionSelectionMode;
    this.worldBoundaryDrawing = this.globeRegionSelectionMode;
    this.statusMessage = this.globeRegionSelectionMode
      ? 'Region selection enabled. Click the globe to place the operational region.'
      : 'Region selection disabled.';
    this.render();
  }

  selectWorldWindowAt(x, y) {
    const width = this.numberValue('env-studio-window-width', 0.18);
    const height = this.numberValue('env-studio-window-height', 0.16);
    this.session = selectEnvironmentStudioWorldWindow(this.session, {
      centerLonNormalized: x,
      centerLatNormalized: y,
      widthNormalized: width,
      heightNormalized: height,
      sourceResolutionMeters: this.numberValue('env-studio-source-resolution', 1500),
      previewResolutionMeters: this.numberValue('env-studio-preview-resolution', 6000),
      selectedBy: 'globe-click'
    });
    this.statusMessage = 'Selected operational region from synthetic globe fields.';
    this.lastError = null;
    this.worldBoundaryDrawing = false;
    this.globeRegionSelectionMode = false;
    this.render();
  }

  selectWorldWindowFromControls() {
    const current = this.session.selectedOperationalWindow?.bounds ?? { centerLonNormalized: 0.75, centerLatNormalized: 0.44 };
    this.session = selectEnvironmentStudioWorldWindow(this.session, {
      centerLonNormalized: current.centerLonNormalized ?? 0.75,
      centerLatNormalized: current.centerLatNormalized ?? 0.44,
      widthNormalized: this.numberValue('env-studio-window-width', 0.18),
      heightNormalized: this.numberValue('env-studio-window-height', 0.16),
      sourceResolutionMeters: this.numberValue('env-studio-source-resolution', 1500),
      previewResolutionMeters: this.numberValue('env-studio-preview-resolution', 6000),
      selectedBy: 'globe-controls'
    });
    this.statusMessage = 'Selected operational globe region from current control values.';
    this.lastError = null;
    this.render();
  }

  clearWorldWindow() {
    this.session = clearEnvironmentStudioWorldWindow(this.session);
    this.globeRegionSelectionMode = false;
    this.statusMessage = 'Cleared selected operational globe region.';
    this.lastError = null;
    this.render();
  }

  adjustWorldWindow(action) {
    const bounds = this.session.selectedOperationalWindow?.bounds ?? { centerLonNormalized: 0.75, centerLatNormalized: 0.44, widthNormalized: 0.18, heightNormalized: 0.16 };
    const patch = { ...bounds };
    const step = 0.025;
    if (action === 'left') patch.centerLonNormalized -= step;
    if (action === 'right') patch.centerLonNormalized += step;
    if (action === 'up') patch.centerLatNormalized -= step;
    if (action === 'down') patch.centerLatNormalized += step;
    if (action === 'wider') patch.widthNormalized += step;
    if (action === 'narrower') patch.widthNormalized -= step;
    if (action === 'taller') patch.heightNormalized += step;
    if (action === 'shorter') patch.heightNormalized -= step;
    this.session = patchEnvironmentStudioWorldWindow(this.session, {
      ...patch,
      sourceResolutionMeters: this.numberValue('env-studio-source-resolution', 1500),
      previewResolutionMeters: this.numberValue('env-studio-preview-resolution', 6000)
    });
    this.statusMessage = 'Moved or resized selected operational globe region.';
    this.lastError = null;
    this.render();
  }

  generateWorldBathymetry() {
    try {
      if (!this.session.selectedOperationalWindow?.windowDigest) this.selectWorldWindowFromControls();
      this.session = generateEnvironmentStudioRegionFromWorldWindow(this.session, { seed: this.readWorldSeed() });
      this.statusMessage = 'Generated regional 3D bathymetry from the selected synthetic globe region.';
      this.lastError = null;
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this.statusMessage = 'World-window bathymetry generation failed.';
    }
    this.render();
  }

  exportWorldMap() {
    downloadJSON('anchor_synthetic_globe_world.json', this.session.worldMap);
    this.statusMessage = 'Exported synthetic globe artifact JSON.';
    this.render();
  }

  setAtlasPreset(presetId) {
    this.session = setEnvironmentStudioAtlasPreset(this.session, presetId, { seed: this.readSeed() });
    this.statusMessage = 'Synthetic atlas preset changed; operational window context was re-inferred.';
    this.lastError = null;
    this.render();
  }

  selectAtlasWindow(windowPresetId) {
    this.session = selectEnvironmentStudioOperationalWindow(this.session, windowPresetId);
    this.statusMessage = 'Operational window selected from atlas examples.';
    this.lastError = null;
    this.render();
  }

  adjustAtlasWindow(action) {
    const window = this.session.selectedOperationalWindow ?? {};
    const step = 0.04;
    const sizeStep = 0.04;
    const patch = {};
    if (action === 'left') patch.x = Number(window.x ?? 0) - step;
    if (action === 'right') patch.x = Number(window.x ?? 0) + step;
    if (action === 'up') patch.y = Number(window.y ?? 0) - step;
    if (action === 'down') patch.y = Number(window.y ?? 0) + step;
    if (action === 'smaller') {
      patch.width = Number(window.width ?? 0.3) - sizeStep;
      patch.height = Number(window.height ?? 0.3) - sizeStep;
    }
    if (action === 'larger') {
      patch.width = Number(window.width ?? 0.3) + sizeStep;
      patch.height = Number(window.height ?? 0.3) + sizeStep;
    }
    this.session = patchEnvironmentStudioOperationalWindow(this.session, patch);
    this.statusMessage = 'Operational window adjusted and context re-inferred.';
    this.lastError = null;
    this.render();
  }

  randomizeAtlasSeed() {
    this.session = randomizeEnvironmentStudioAtlasSeed(this.session);
    this.statusMessage = 'Atlas seed randomized deterministically from current project/window state.';
    this.lastError = null;
    this.render();
  }

  generateAtlasRegion() {
    try {
      this.session = generateEnvironmentStudioRegionFromAtlasWindow(this.session, { seed: this.readSeed() });
      this.statusMessage = 'Generated regional 3D bathymetry from the selected Synthetic Ocean Atlas window.';
      this.lastError = null;
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this.statusMessage = 'Atlas region generation failed.';
    }
    this.render();
  }

  applyProfile(profileId) {
    const profile = domainProfileById(profileId);
    this.session = createEnvironmentStudioSession({
      profileId: profile.id,
      environmentType: profile.id,
      label: profile.label,
      seed: this.readSeed(),
      archetypeId: this.readArchetype(),
      previewMode: this.session.previewMode,
      previewCameraState: this.session.previewCameraState,
      simplifiedPanelState: this.session.simplifiedPanelState,
      expandedAdvancedSections: this.session.expandedAdvancedSections
    });
    this.statusMessage = `Applied ${profile.label} domain profile.`;
    this.lastError = null;
    this.render();
  }

  applyDomainControls() {
    this.session = patchEnvironmentStudioDomain(this.session, {
      label: this.session.label,
      widthMeters: this.numberValue('env-studio-width', this.session.domainSpec.horizontal.widthMeters / 1000) * 1000,
      heightMeters: this.numberValue('env-studio-height', this.session.domainSpec.horizontal.heightMeters / 1000) * 1000,
      cellSizeMeters: this.numberValue('env-studio-cell-size', this.session.domainSpec.horizontal.cellSizeMeters),
      maxDepthMeters: this.numberValue('env-studio-max-depth', this.session.domainSpec.vertical.maxDepthMeters),
      durationSeconds: this.numberValue('env-studio-duration', this.session.domainSpec.time.durationSeconds),
      dtSeconds: this.numberValue('env-studio-dt', this.session.domainSpec.time.dtSeconds)
    });
    this.session = updateEnvironmentStudioRegionalRecipe({
      ...this.session,
      profileId: 'custom',
      environmentType: this.readValue('env-studio-profile', this.session.environmentType)
    }, this.readRegionalControls());
    this.statusMessage = 'Domain updated; generated bathymetry was cleared for regeneration.';
    this.lastError = null;
    this.render();
  }

  updateArchetype(archetypeId) {
    this.session = setEnvironmentStudioArchetype(this.session, archetypeId, { seed: this.readSeed() });
    this.statusMessage = 'Bathymetry archetype changed; generate a tile or mosaic to refresh previews.';
    this.lastError = null;
    this.render();
  }

  generateTile() {
    try {
      this.session = updateEnvironmentStudioRegionalRecipe(this.session, this.readRegionalControls());
      this.session = setEnvironmentStudioArchetype(this.session, this.readArchetype(), { seed: this.readSeed() });
      this.session = generateEnvironmentStudioTile(this.session, { seed: this.readSeed(), archetypeId: this.readArchetype() });
      this.statusMessage = 'Generated deterministic compact bathymetry tile.';
      this.lastError = null;
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this.statusMessage = 'Tile generation failed.';
    }
    this.render();
  }

  createMosaic() {
    try {
      this.session = updateEnvironmentStudioRegionalRecipe(this.session, this.readRegionalControls());
      this.session = setEnvironmentStudioArchetype(this.session, this.readArchetype(), { seed: this.readSeed() });
      this.session = createEnvironmentStudioMosaic(this.session, { seed: this.readSeed(), tileConfigs: this.readTileConfigs() });
      this.session = selectEnvironmentStudioObject(this.session, { type: 'region', id: 'region' });
      this.statusMessage = 'Created deterministic multi-archetype regional bathymetry with seam validation.';
      this.lastError = null;
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this.statusMessage = 'Mosaic generation failed.';
    }
    this.render();
  }

  generateFields() {
    try {
      if (this.session.sourceMode === 'referenceBathymetryAtlas' && !this.referenceBudgetAllowsGeneration('Generate Currents & Science Fields')) return;
      this.session = regenerateEnvironmentStudioFields(this.session, { seed: this.readSeed() });
      this.statusMessage = this.session.sourceMode === 'referenceBathymetryAtlas'
        ? 'Generated reference bathymetry + synthetic bathymetry-conditioned fields.'
        : 'Generated atlas-conditioned synthetic currents, science scalar field, and hotspot candidates.';
      this.lastError = null;
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this.statusMessage = 'Field regeneration failed.';
    }
    this.render();
  }

  composeReferenceEnvironmentArtifact() {
    try {
      if (!this.referenceBudgetAllowsGeneration('Compose Environment Artifact')) return;
      this.session = composeEnvironmentStudioReferenceEnvironment(this.session, { seed: this.readSeed() });
      this.statusMessage = 'Composed a package-backed EnvironmentArtifact from reference bathymetry and generated synthetic fields.';
      this.lastError = null;
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this.statusMessage = 'EnvironmentArtifact composition failed.';
    }
    this.render();
  }

  validateReferenceLaunch() {
    try {
      if (!this.referenceBudgetAllowsGeneration('Validate Launch')) return;
      this.session = validateEnvironmentStudioReferenceLaunch(this.session, { seed: this.readSeed() });
      const launch = this.session.launchValidationResult;
      this.statusMessage = launch?.planningLaunchReady && launch?.status === 'WARN'
        ? 'Launch ready with non-blocking warnings.'
        : launch?.planningLaunchReady
          ? 'Reference environment launch validation passed. Planning launch is ready.'
          : 'Reference environment launch validation needs review.';
      this.lastError = launch?.planningLaunchReady
        ? null
        : (launch?.errors?.[0] ?? 'Planning launch validation did not pass.');
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this.statusMessage = 'Reference environment launch validation failed.';
    }
    this.render();
  }

  launchReferenceEnvironmentToPlanning() {
    try {
      if (!this.referenceBudgetAllowsGeneration('Launch to Planning')) return;
      const result = buildEnvironmentStudioReferencePlanningLaunch(this.session, { seed: this.readSeed() });
      this.session = result.session;
      const launchDebug = {
        ...(result.launchMetadata ?? {}),
        source: 'referenceEnvironmentStudioLaunch',
        launchedFromEnvironmentStudio: true,
        launchValidationStatus: result.launchMetadata?.launchValidationStatus ?? result.launchValidation?.status ?? null,
        launchValidationDigest: result.launchMetadata?.launchValidationDigest ?? result.launchValidation?.launchValidationDigest ?? null,
        warningSummary: result.launchMetadata?.warningSummary ?? result.launchValidation?.warningSummary ?? null,
        warningCount: result.launchMetadata?.warningCount ?? result.launchValidation?.warningSummary?.totalWarningCount ?? result.warnings?.length ?? 0,
        blockingWarningCount: result.launchMetadata?.blockingWarningCount ?? result.launchValidation?.warningSummary?.blockingWarningCount ?? 0,
        failureCount: result.launchMetadata?.failureCount ?? result.launchValidation?.warningSummary?.failureCount ?? 0,
        warnings: result.warnings ?? result.launchValidation?.warnings ?? [],
        benchmarkBundleStatus: this.session.benchmarkBundleResult?.status ?? 'REQUIRES_EXPORT',
        benchmarkBundleDigest: this.session.benchmarkBundleResult?.benchmarkBundleDigest ?? null,
        hiddenTruthExposed: false,
        simulationChanged: false,
        scoringChanged: false
      };
      this.app.state.referenceEnvironmentLaunch = launchDebug;
      globalThis.ANCHOR_REFERENCE_ENVIRONMENT_LAUNCH_DEBUG = launchDebug;
      beginScenario(this.app.state, {
        level: result.level,
        mission: result.mission,
        challengeMode: result.challengeMode ?? 'forecast',
        source: result.source ?? 'referenceEnvironmentStudioLaunch',
        experienceMode: result.experienceMode ?? 'simulationLab'
      });
      this.app.state.referenceEnvironmentLaunch = launchDebug;
      markBriefingSeen(this.app.state);
      this.statusMessage = 'Launched reference-derived environment to Planning.';
      this.lastError = null;
      this.scene.start('MissionWorkspaceScene');
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this.statusMessage = 'Reference environment Planning launch failed.';
      this.render();
    }
  }

  exportReferenceBenchmarkBundle() {
    try {
      if (!this.referenceBudgetAllowsGeneration('Export Public Benchmark Bundle')) return;
      const result = buildEnvironmentStudioReferenceBenchmarkBundle(this.session, { seed: this.readSeed() });
      this.session = result.session;
      downloadJSON('anchor_reference_environment_benchmark_bundle.json', result.bundle);
      this.statusMessage = 'Exported public package-backed reference environment benchmark bundle.';
      this.lastError = result.validation?.status === 'FAIL'
        ? (result.validation.failures?.[0] ?? 'Benchmark bundle validation failed.')
        : null;
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this.statusMessage = 'Public benchmark bundle export failed.';
    }
    this.render();
  }

  exportProject() {
    const project = buildEnvironmentStudioProject(this.session);
    downloadJSON('anchor_environment_studio_project.json', project);
    this.statusMessage = 'Exported Environment Studio project JSON.';
    this.render();
  }

  exportBathymetryArtifact() {
    if (!this.session.tiles.length) {
      this.lastError = 'Generate regional bathymetry before exporting a bathymetry artifact.';
      this.statusMessage = 'Bathymetry artifact export skipped.';
      this.render();
      return;
    }
    downloadJSON('anchor_environment_studio_bathymetry_artifact.json', {
      artifactType: 'anchor.environment-studio.regional-bathymetry-artifact',
      artifactVersion: '1.0.0',
      sourceGridShape: this.session.sourceGridShape,
      previewGridShape: this.session.previewGridShape,
      previewDecimation: this.session.previewDecimation,
      regionalTemplate: this.session.regionalTemplate,
      featureMix: this.session.featureMix,
      regionalFeatureSummary: this.session.regionalFeatureSummary,
      multiGliderSuitability: this.session.multiGliderSuitability,
      bathymetryBuilderVersion: this.session.bathymetryBuilderVersion,
      bathymetryBuilderResult: this.session.bathymetryBuilderResult,
      bathymetryArtifactDigest: this.session.bathymetryArtifactDigest ?? this.session.bathymetryBuilderResult?.bathymetryArtifactDigest,
      tiles: this.session.tiles.map((tile) => ({
        id: tile.id,
        archetypeId: tile.archetypeId,
        featureRole: tile.featureRole,
        manifest: tile.manifest,
        bathymetryArtifact: tile.bathymetryArtifact,
        diagnostics: tile.diagnostics
      })),
      mosaic: this.session.mosaic,
      provenance: {
        generatedBy: 'src/game/phaser/scenes/EnvironmentStudioScene.js',
        generatorVersion: ENVIRONMENT_STUDIO_SCENE_VERSION,
        deterministicSeed: this.session.seed,
        synthetic: true,
        calibratedOceanProduct: false,
        operationalForecast: false,
        certifiedForNavigation: false,
        hiddenTruthExposed: false
      }
    });
    this.statusMessage = 'Exported regional bathymetry artifact JSON.';
    this.render();
  }

  async importProject(file) {
    if (!file) return;
    try {
      const payload = await readJSONFile(file);
      const validation = validateEnvironmentStudioProject(payload);
      if (!validation.valid) throw new Error(validation.errors[0] ?? 'Project validation failed.');
      this.session = importEnvironmentStudioProject(payload);
      this.statusMessage = `Imported ${file.name}.`;
      this.lastError = null;
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this.statusMessage = 'Project import failed.';
      this.app.toast?.(this.lastError, 'warning');
    }
    this.render();
  }

  async importWorldMap(file) {
    if (!file) return;
    try {
      const payload = await readJSONFile(file);
      this.session = createEnvironmentStudioSession({
        ...this.session,
        studioStage: 'worldMap',
        worldMap: payload,
        worldStyle: payload.style,
        worldSeed: payload.seed,
        selectedOperationalWindow: null
      });
      this.statusMessage = `Imported synthetic globe ${file.name}.`;
      this.lastError = null;
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this.statusMessage = 'Synthetic globe import failed.';
      this.app.toast?.(this.lastError, 'warning');
    }
    this.render();
  }

  readWorldSeed() {
    return String(this.app.elements?.consoleRoot?.querySelector?.('#env-studio-world-seed')?.value ?? this.session.worldSeed ?? 'env-globe-001');
  }

  readWorldGeneratorParameters() {
    const current = this.session.worldMap?.generatorParameters ?? {};
    return {
      waterLevel: this.numberValue('env-world-water-level', current.waterLevel ?? 0.5),
      landmassScale: this.numberValue('env-world-landmass-scale', current.landmassScale ?? 0.55),
      islandDensity: this.numberValue('env-world-island-density', current.islandDensity ?? 0.5),
      coastlineComplexity: this.numberValue('env-world-coastline-complexity', current.coastlineComplexity ?? 0.45),
      basinScale: this.numberValue('env-world-basin-scale', current.basinScale ?? 0.55),
      shelfWidth: this.numberValue('env-world-shelf-width', current.shelfWidth ?? 0.5),
      flowIntensity: this.numberValue('env-world-flow-intensity', current.flowIntensity ?? 0.55),
      roughness: this.numberValue('env-world-roughness', current.roughness ?? 0.35)
    };
  }

  readSeed() {
    return String(
      this.app.elements?.consoleRoot?.querySelector?.('#env-studio-seed')?.value
      ?? this.app.elements?.consoleRoot?.querySelector?.('#env-studio-world-seed')?.value
      ?? this.session.seed
      ?? this.session.worldSeed
      ?? 'env-studio-r1'
    );
  }

  readArchetype() {
    return String(this.app.elements?.consoleRoot?.querySelector?.('#env-studio-archetype')?.value ?? this.session.archetypeId ?? 'coastalShelf');
  }

  readRegionalControls() {
    return {
      environmentType: this.readValue('env-studio-profile', this.session.environmentType),
      missionScale: this.readValue('env-studio-mission-scale', this.session.missionScale),
      intendedGliders: this.numberValue('env-studio-intended-gliders', this.session.intendedGliders),
      estimatedMissionDuration: this.readValue('env-studio-duration-label', this.session.estimatedMissionDuration),
      bathymetrySource: this.readValue('env-studio-bathymetry-source', this.session.bathymetrySource),
      regionalTemplate: this.readValue('env-studio-regional-template', this.session.regionalTemplate),
      coastlineOrientation: this.readValue('env-studio-coastline-orientation', this.session.coastlineOrientation),
      openOceanBoundaries: Array.from(this.app.elements?.consoleRoot?.querySelectorAll?.('[data-env-studio-open-boundary]:checked') ?? []).map((entry) => entry.value),
      featureMix: {
        shelfFraction: this.readValue('env-studio-mix-shelfFraction', this.session.featureMix.shelfFraction),
        deepBasinFraction: this.readValue('env-studio-mix-deepBasinFraction', this.session.featureMix.deepBasinFraction),
        canyonDensity: this.readValue('env-studio-mix-canyonDensity', this.session.featureMix.canyonDensity),
        islandSeamountCount: this.readValue('env-studio-mix-islandSeamountCount', this.session.featureMix.islandSeamountCount),
        coastlineComplexity: this.readValue('env-studio-mix-coastlineComplexity', this.session.featureMix.coastlineComplexity),
        riverMouthDeltaInfluence: this.readValue('env-studio-mix-riverMouthDeltaInfluence', this.session.featureMix.riverMouthDeltaInfluence),
        ridgeSillStrength: this.readValue('env-studio-mix-ridgeSillStrength', this.session.featureMix.ridgeSillStrength),
        shelfBreakSharpness: this.readValue('env-studio-mix-shelfBreakSharpness', this.session.featureMix.shelfBreakSharpness),
        featureDiversity: this.readValue('env-studio-mix-featureDiversity', this.session.featureMix.featureDiversity)
      },
      randomization: {
        worldSeed: this.readSeed(),
        variationLevel: this.readValue('env-studio-variation-level', this.session.randomization.variationLevel),
        locks: {
          coastline: this.booleanValue('env-studio-lock-coastline'),
          deepBasin: this.booleanValue('env-studio-lock-deep-basin'),
          selectedFeatures: this.booleanValue('env-studio-lock-selected-features'),
          tileSeams: this.booleanValue('env-studio-lock-tile-seams')
        }
      },
      previewDetail: this.readValue('env-studio-preview-detail', this.session.previewDetail),
      previewMode: this.session.previewMode,
      tileConfigs: this.readTileConfigs()
    };
  }

  readTileConfigs() {
    const root = this.app.elements?.consoleRoot;
    return this.session.tileConfigs.map((config) => ({
      ...config,
      archetypeId: root?.querySelector?.(`[data-env-studio-tile-archetype="${config.id}"]`)?.value ?? config.archetypeId
    }));
  }

  readValue(id, fallback) {
    const element = this.app.elements?.consoleRoot?.querySelector?.(`#${id}`);
    return String(element?.value ?? fallback ?? '');
  }

  numberValue(id, fallback) {
    const value = Number(this.app.elements?.consoleRoot?.querySelector?.(`#${id}`)?.value);
    return Number.isFinite(value) ? value : fallback;
  }

  booleanValue(id) {
    return this.app.elements?.consoleRoot?.querySelector?.(`#${id}`)?.checked === true;
  }

  selectObject(type, id) {
    this.session = selectEnvironmentStudioObject(this.session, { type, id });
    this.statusMessage = `Selected ${type || 'region'} ${id || 'region'} for inspection.`;
    this.lastError = null;
    this.render();
  }

  bindSelectionControls(root) {
    root?.querySelectorAll?.('[data-env-studio-select]')?.forEach((element) => {
      const select = () => this.selectObject(element.dataset.envStudioSelectType, element.dataset.envStudioSelectId);
      element.addEventListener('click', select);
      element.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          select();
        }
      });
    });
  }

  mountPreviewHost() {
    const host = this.app?.elements?.viewportShell ?? this.app?.elements?.gameContainer;
    if (!host || this.previewHost) return;
    this.previewHost = globalThis.document.createElement('div');
    this.previewHost.className = 'environment-studio-preview-host';
    this.previewHost.setAttribute('data-environment-studio-preview-host', 'true');
    host.appendChild(this.previewHost);
  }

  destroyPreviewHost() {
    this.cleanupReferenceAtlasPreviewBinding();
    this.destroyGlobeRenderer();
    this.previewHost?.remove?.();
    this.previewHost = null;
  }

  cleanupReferenceAtlasPreviewBinding() {
    const binding = this.referenceAtlasPreviewBinding;
    if (!binding) return;
    binding.abortController?.abort?.();
    if (binding.rafId != null) globalThis.cancelAnimationFrame?.(binding.rafId);
    if (binding.wheelCommitTimer != null) globalThis.clearTimeout?.(binding.wheelCommitTimer);
    if (binding.panelUpdateTimer != null) globalThis.clearTimeout?.(binding.panelUpdateTimer);
    if (binding.pointerId != null) {
      try {
        binding.canvas?.releasePointerCapture?.(binding.pointerId);
      } catch {
        // Pointer capture may already be released by the browser.
      }
    }
    this.referenceAtlasTransientView = null;
    this.referenceAtlasTransientBounds = null;
    this.referenceAtlasRectangleEditor = {
      ...this.referenceAtlasRectangleEditor,
      activeHandle: null,
      activeDragMode: REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.none,
      hoverHandle: null
    };
    this.referenceAtlasPreviewBinding = null;
    this.referenceAtlasPerf.listenerDetachCount += Number(binding.listenerCount ?? 0);
    this.referenceAtlasPerf.activeListenerCount = 0;
    this.referenceAtlasPerf.atlasInteractionActive = false;
  }

  destroyGlobeRenderer() {
    const context = this.globeRendererContext;
    if (!context) return;
    if (context.rafId != null) globalThis.cancelAnimationFrame?.(context.rafId);
    context.texture?.dispose?.();
    context.geometry?.dispose?.();
    context.material?.dispose?.();
    context.overlayGeometry?.dispose?.();
    context.overlayMaterial?.dispose?.();
    context.renderer?.dispose?.();
    context.renderer?.domElement?.remove?.();
    this.globeRendererContext = null;
  }

  clearRightPanel() {
    const root = this.app?.elements?.waypointTimelineRoot;
    if (root) root.innerHTML = '';
  }

  drawBackdrop() {
    this.clearObjects();
    const width = Math.max(1, Number(this.scale?.width ?? 1280));
    const height = Math.max(1, Number(this.scale?.height ?? 820));
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x03101d, 0x0b2036, 0x061827, 0x020812, 1);
    graphics.fillRect(0, 0, width, height);
    this.objects.push(graphics);
  }

  clearObjects() {
    for (const object of this.objects) object?.destroy?.();
    this.objects = [];
  }

  publishDebug(active = true) {
    const debug = environmentStudioDebugPayload(this.session);
    const referenceAtlasPerfDebug = referenceAtlasPerfDebugPayload(this);
    globalThis.ANCHOR_REFERENCE_ATLAS_PERF_DEBUG = referenceAtlasPerfDebug;
    globalThis.ANCHOR_ENVIRONMENT_STUDIO_DEBUG = {
      ...debug,
      referenceAtlasPerf: referenceAtlasPerfDebug,
      version: ENVIRONMENT_STUDIO_SCENE_VERSION,
      routeActive: Boolean(active),
      boundaryBudget: debug.boundaryBudget ?? this.session.selectedReferenceBoundaryBudget ?? null,
      operationalWindow: debug.operationalWindow ?? this.session.selectedReferenceOperationalWindow ?? this.session.selectedReferenceBoundaryBudget?.operationalWindow ?? null,
      operationalWindowEditor: this.operationalWindowEditorDebugPayload(),
      rectangleEditor: this.referenceAtlasRectangleEditorDebugPayload(),
      generationBudget: debug.generationBudget ?? this.session.selectedReferenceGenerationBudget ?? this.session.selectedReferenceBoundaryBudget ?? null,
      referenceAtlasMaxZoom: REFERENCE_ATLAS_MAX_ZOOM,
      atlasStage: {
        ...referenceAtlasStageDebugPayload(this.session),
        lastClickedAction: this.lastClickedAction,
        lastActionResult: this.lastActionResult,
        lastBlockedAction: this.lastBlockedAction,
        lastBlockedActionReason: this.lastBlockedActionReason,
        lastActionToast: this.lastActionToast
      },
      lastClickedAction: this.lastClickedAction,
      lastActionResult: this.lastActionResult,
      lastBlockedAction: this.lastBlockedAction,
      lastBlockedActionReason: this.lastBlockedActionReason,
      lastActionToast: this.lastActionToast,
      lastPatchRequestType: this.lastPatchRequestType,
      lastPatchRequestDigest: this.lastPatchRequestDigest,
      oversizeGenerationBlockedCount: this.oversizeGenerationBlockedCount,
      lastBlockedGenerationReason: this.lastBlockedGenerationReason,
      referenceManifestLoaded: this.referenceManifestLoaded === true,
      referenceTileLibraryLoaded: this.referenceTileLibraryLoaded === true,
      referenceTileLibraryWarning: this.referenceTileLibraryWarning,
      referenceTileLibrary: this.referenceTileLibrary ? referenceTileLibraryDebugState(this.referenceTileLibrary) : null,
      referenceTileLibraryDigest: this.referenceTileLibrary?.digest ?? null,
      visualAcceptance: environmentStudioVisualAcceptanceMetrics(this.session),
      globeRendered: Boolean(active && this.globeRendererContext?.renderer),
      sphereVisible: Boolean(active && this.globeRendererContext?.sphere),
      flatMapPrimaryView: false,
      terrainPreviewRendererCount: 0,
      terrainPreviewRafCount: 0,
      stalePreviewObjects: 0,
      previewRendererCount: Boolean(active && this.globeRendererContext?.renderer) ? 1 : 0,
      activeRendererCount: Boolean(active && this.globeRendererContext?.renderer) ? 1 : 0,
      activeRafCount: Boolean(active && this.globeRendererContext?.rafId != null) ? 1 : 0,
      activeCanvasCount: Boolean(active && this.globeRendererContext?.renderer?.domElement?.isConnected) ? 1 : 0,
      hiddenTruthExposed: false,
      rawExternalDataPathExposed: false,
      simulationChanged: false,
      scoringChanged: false,
      plannerChanged: false,
      fieldEquationsChanged: false
    };
  }
}

function environmentStudioVisualAcceptanceMetrics(session = {}) {
  if (session.sourceMode === 'referenceBathymetryAtlas' || isReferenceAtlasStage(session.studioStage)) {
    return {
      ...referenceBathymetryVisualMetrics(session.referenceAtlas, session.selectedReferenceWindow),
      sourceGridShape: session.sourceGridShape,
      bathymetryArtifactDigest: session.bathymetryArtifactDigest ?? session.bathymetryBuilderResult?.bathymetryArtifactDigest ?? null,
      rendererCleanup: {
        activeRendererCount: 0,
        activeRafCount: 0,
        activeCanvasCount: 0
      },
      primaryLeftPanelForbiddenControlCount: null,
      simulationChanged: false,
      scoringChanged: false
    };
  }
  const viewport = syntheticGlobeViewportVisualMetrics(session.worldMap, session.worldView ?? {});
  const selected = session.selectedOperationalWindow;
  const bounds = selected?.bounds;
  const domain = selected?.recommendedDomain;
  const selectedArea = bounds
    ? Number(bounds.widthNormalized ?? bounds.width ?? 0) * Number(bounds.heightNormalized ?? bounds.height ?? 0)
    : 0;
  return {
    ...viewport,
    selectedWindowAreaFractionOfGlobe: roundMetric(selectedArea),
    selectedWindowAreaFractionOfWorld: roundMetric(selectedArea),
    selectedWindowDigest: selected?.windowDigest ?? null,
    selectedWindowBounds: bounds ?? null,
    sourceGridShape: domain ? { columns: domain.columns, rows: domain.rows } : null,
    bathymetryArtifactDigest: session.bathymetryArtifactDigest ?? session.bathymetryBuilderResult?.bathymetryArtifactDigest ?? null,
    rendererCleanup: {
      activeRendererCount: 0,
      activeRafCount: 0,
      activeCanvasCount: 0
    },
    primaryLeftPanelForbiddenControlCount: null,
    simulationChanged: false,
    scoringChanged: false
  };
}

function isReferenceAtlasStage(stage) {
  return stage === 'globalAtlasSelector' || stage === 'referenceAtlas';
}

function atlasActionButtonClass(action = {}) {
  if (!action.enabled) return 'console-button disabled';
  if (action.variant === 'primary') return 'console-button primary';
  if (action.variant === 'warning') return 'console-button warning';
  return 'console-button secondary';
}

function atlasActionDisabledAttributes(action = {}) {
  const reason = action.reason ? ` title="${escapeAttr(action.reason)}"` : '';
  return action.enabled
    ? `aria-disabled="false"${reason}`
    : `disabled aria-disabled="true"${reason}`;
}

function atlasActionReasonHtml(action = {}) {
  if (!action.reason) return '';
  return `<small class="environment-studio-action-reason">${escapeHtml(action.reason)}</small>`;
}

function atlasActionButtonHtml(actionKey, action = {}, dataAction) {
  if (action.visible === false) return '';
  return `
      <button class="${atlasActionButtonClass(action)}" type="button" data-action="${escapeAttr(dataAction)}" data-atlas-action-key="${escapeAttr(actionKey)}" ${atlasActionDisabledAttributes(action)}>${escapeHtml(action.label)}</button>
      ${atlasActionReasonHtml(action)}
  `;
}

function referenceAtlasConsoleHtml(scene, summary = {}) {
  const session = scene.session;
  const atlas = session.referenceAtlas ?? {};
  const selected = session.selectedReferenceWindow;
  const bounds = selected?.bounds ?? {};
  const referenceAvailable = atlas.sourceDataset?.referenceDataAvailable === true;
  const disabledAttr = referenceAvailable ? '' : 'disabled';
  const manifest = session.referenceBathymetryManifest ?? atlas.manifest ?? {};
  const availabilityMessage = referenceFixtureAvailabilityMessage(session);
  const availability = session.selectedReferenceAvailability;
  const boundaryBudget = session.selectedReferenceBoundaryBudget ?? availability?.boundaryBudget ?? null;
  const operationalWindow = session.selectedReferenceOperationalWindow ?? boundaryBudget?.operationalWindow ?? availability?.operationalWindow ?? null;
  const generationBudget = session.selectedReferenceGenerationBudget ?? boundaryBudget ?? null;
  const budgetBlocked = boundaryBudget?.budgetStatus === 'BLOCKED';
  const multiTileRequired = boundaryBudget?.budgetStatus === 'MULTI_TILE_REQUIRED' || boundaryBudget?.multiTileRecommended === true;
  const atlasStageAction = referenceAtlasStageActionState(session);
  const atlasActions = atlasStageAction.actionState;
  const exportRequestAction = atlasActions.exportMultiTileRequest.visible || atlasActions.exportMultiTileRequest.enabled
    ? atlasActions.exportMultiTileRequest
    : atlasActions.exportPatchRequest;
  const canExportRequest = exportRequestAction.enabled;
  const nextStepDescription = atlasStageAction.selectedRegionNextAction === 'continueTo3DBathymetry'
    ? 'Hosted mission-ready tile available. Continue into the local 3D bathymetry workspace.'
    : atlasStageAction.selectedRegionNextAction === 'exportMultiTilePatchRequest'
      ? 'This is a valid operational area. High-resolution browser loading requires staged multi-tile bathymetry.'
      : atlasStageAction.selectedRegionNextAction === 'exportPatchRequest'
        ? 'This operational window is valid, but no app-hosted mission-ready tile is staged yet.'
        : atlasStageAction.selectedRegionNextAction === 'inspectLowResolutionFallback'
          ? 'A staged low-resolution fallback exists for inspection, but it is not the mission-ready tile path.'
          : 'Select a boundary or click a hosted patch to choose the next action.';
  const budgetStatusLabel = boundaryBudget?.budgetStatus ?? 'none selected';
  const budgetStatusMessage = boundaryBudget
    ? (multiTileRequired
        ? REFERENCE_ATLAS_MULTITILE_MESSAGE
        : budgetBlocked
          ? REFERENCE_ATLAS_BUDGET_BLOCKED_MESSAGE
          : boundaryBudget.budgetStatus === 'WARN'
            ? 'Near or above live Alpha limit. Export patch request or reduce the window.'
            : boundaryBudget.recommendedAction ?? 'Region budget estimated.')
    : '';
  const selectedBoundsLabel = selected
    ? `${formatNumber(bounds.westLon)} to ${formatNumber(bounds.eastLon)} lon, ${formatNumber(bounds.southLat)} to ${formatNumber(bounds.northLat)} lat`
    : 'draw or click an available patch';
  const editor = scene.operationalWindowEditorDebugPayload();
  const windowModeOptions = [
    { id: 'drawCustom', label: 'Draw Custom' },
    ...REFERENCE_ATLAS_OPERATIONAL_WINDOW_PRESETS
      .filter((preset) => preset.id !== 'custom')
      .map((preset) => ({
        id: preset.id,
        label: preset.label.replace(', about ', ' ')
      }))
  ];
  const editorBounds = {
    westLon: Number.isFinite(Number(editor.westLon)) ? Number(editor.westLon) : Number(bounds.westLon ?? -123),
    eastLon: Number.isFinite(Number(editor.eastLon)) ? Number(editor.eastLon) : Number(bounds.eastLon ?? -121.5),
    southLat: Number.isFinite(Number(editor.southLat)) ? Number(editor.southLat) : Number(bounds.southLat ?? 36),
    northLat: Number.isFinite(Number(editor.northLat)) ? Number(editor.northLat) : Number(bounds.northLat ?? 37.2)
  };
  return `
    <section class="console-header">
      <div class="console-kicker">Simulation Lab / Environment Studio</div>
      <h1>Global Reference Bathymetry Atlas</h1>
      <p>Select an operational lon/lat window from the global reference overview. Continue to 3D bathymetry only when a hosted mission-ready tile is available.</p>
    </section>
    <section class="console-status">
      <span>Stage</span>
      <strong>Global Atlas Selector</strong>
      <small>${escapeHtml(scene.statusMessage)}</small>
    </section>
    ${scene.lastError ? `<section class="console-section" data-keep-title="true"><h2>Warning</h2><div class="hud-muted">${escapeHtml(scene.lastError)}</div></section>` : ''}
    ${scene.referenceTileLibraryWarning ? `<section class="console-section" data-keep-title="true"><h2>Tile Library</h2><div class="hud-muted">${escapeHtml(scene.referenceTileLibraryWarning)}</div></section>` : ''}
    <section class="console-section environment-studio-basic-panel" data-keep-title="true" data-env-studio-stage="globalAtlasSelector" data-env-stage-section="reference-bathymetry-atlas">
      <h2>Reference Bathymetry Atlas</h2>
      <p class="hud-muted">Bathymetry Source: app-hosted static reference bathymetry atlas. The browser does not download NOAA/GEBCO data at runtime.</p>
      <label class="compact-field">
        Source Mode
        <select id="env-reference-source-mode" data-env-reference-source-mode>
          ${REFERENCE_BATHYMETRY_SOURCE_MODES.map((mode) => `<option value="${escapeAttr(mode.id)}" ${mode.id === session.sourceMode ? 'selected' : ''}>${escapeHtml(mode.label)}</option>`).join('')}
        </select>
      </label>
      <div class="hud-muted">${escapeHtml(availabilityMessage)}</div>
      <div class="cell-inspector-metrics">
        ${metricHtml('Dataset', atlas.sourceDataset?.name ?? NO_REFERENCE_DATA_FIXTURE)}
        ${metricHtml('Overview', manifest.overview?.label ?? 'global overview')}
        ${metricHtml('Overview Digest', shortDigest(atlas.overviewDigest ?? manifest.overview?.digest))}
        ${metricHtml('Fixture Status', atlas.provenance?.fixtureStatus ?? NO_REFERENCE_DATA_FIXTURE)}
        ${metricHtml('Fixtures available', summary.referenceFixtureCount ?? atlas.fixtureCount ?? manifest.fixtures?.length ?? 0)}
        ${metricHtml('Mission-ready patches', summary.missionReadyPatchCount ?? 0)}
        ${metricHtml('Low-res fallbacks', summary.lowResolutionPatchCount ?? 0)}
        ${metricHtml('Tile Library', shortDigest(summary.referenceTileLibraryDigest ?? session.referenceTileLibrary?.digest))}
        ${metricHtml('Hosted tile sets', summary.referenceTileLibraryStagedTileSetCount ?? 0)}
        ${metricHtml('Mission tile sets', summary.referenceTileLibraryMissionReadyTileSetCount ?? 0)}
        ${metricHtml('Request-only regions', summary.referenceTileLibraryRequestOnlyTileSetCount ?? 0)}
        ${metricHtml('Tile Library Safety', summary.referenceTileLibraryStaticAssetSafety?.ok === true ? 'ok' : scene.referenceTileLibraryLoaded ? 'warning' : 'not loaded')}
        ${metricHtml('Atlas Digest', shortDigest(atlas.atlasDigest))}
      </div>
    </section>
    <section class="console-section environment-studio-basic-panel" data-keep-title="true" data-env-stage-section="atlas-tools">
      <h2>Atlas Tools</h2>
      <p class="hud-muted">Pan/select, draw a boundary, move or resize the selected boundary on the map, reset view, or focus the selected region.</p>
      <div class="environment-studio-camera-row" aria-label="Reference atlas view controls">
        <button type="button" data-env-reference-view-action="left">Pan Left</button>
        <button type="button" data-env-reference-view-action="right">Pan Right</button>
        <button type="button" data-env-reference-view-action="up">Pan Up</button>
        <button type="button" data-env-reference-view-action="down">Pan Down</button>
        <button type="button" data-env-reference-view-action="zoom-in">Zoom In</button>
        <button type="button" data-env-reference-view-action="zoom-out">Zoom Out</button>
        <button type="button" data-env-reference-view-action="reset">Reset</button>
        <button type="button" data-action="env-reference-focus-patch" ${disabledAttr}>Focus Patch</button>
      </div>
      <div class="console-kicker environment-studio-panel-kicker">Map Layers</div>
      <div class="environment-studio-camera-row" aria-label="Reference layer controls">
        ${REFERENCE_BATHYMETRY_LAYER_OPTIONS.map((layer) => `<button type="button" class="${layer.id === session.referenceLayer ? 'active' : ''}" data-env-reference-layer="${escapeAttr(layer.id)}">${escapeHtml(layer.label)}</button>`).join('')}
      </div>
    </section>
    <section class="console-section environment-studio-basic-panel" data-keep-title="true" data-env-stage-section="operational-window">
      <h2>Operational Window</h2>
      <p class="hud-muted">Region Selection controls define the operational boundary. Large regions remain selectable even when live browser generation is blocked.</p>
      <div class="environment-studio-camera-row" aria-label="Reference boundary controls">
        <button type="button" class="${scene.referenceBoundaryDrawing ? 'active' : ''}" data-action="env-reference-draw-boundary" ${disabledAttr}>Draw Bounding Box</button>
        <button type="button" data-action="env-reference-select-boundary" ${disabledAttr}>Select Monterey Patch</button>
        <button type="button" data-action="env-reference-clear-boundary">Clear</button>
      </div>
      <div class="environment-studio-camera-row environment-studio-operational-preset-row" aria-label="Operational window presets">
        ${REFERENCE_ATLAS_OPERATIONAL_WINDOW_PRESETS.map((preset) => `<button type="button" class="${editor.lastPreset === preset.id || operationalWindow?.userIntent === preset.id || operationalWindow?.scaleClass === preset.id || (preset.id === 'gulfSegment' && operationalWindow?.scaleClass === 'gulfScale') ? 'active' : ''}" data-env-reference-window-preset="${escapeAttr(preset.id)}" ${disabledAttr}>${escapeHtml(preset.label)}</button>`).join('')}
      </div>
      <div class="environment-studio-operational-window-editor" data-env-reference-operational-window-editor>
        <label class="compact-field">
          Window Mode
          <select id="env-reference-window-mode" data-env-reference-window-mode ${disabledAttr}>
            ${windowModeOptions.map((mode) => `<option value="${escapeAttr(mode.id)}" ${mode.id === editor.mode ? 'selected' : ''}>${escapeHtml(mode.label)}</option>`).join('')}
          </select>
        </label>
        <div class="environment-studio-editor-grid">
          ${numberInput('Center Lon', 'env-reference-center-lon', editor.centerLon, -180, 180, 0.01)}
          ${numberInput('Center Lat', 'env-reference-center-lat', editor.centerLat, -90, 90, 0.01)}
          ${numberInput('Width km', 'env-reference-width-km', editor.widthKm, REFERENCE_ATLAS_MIN_USEFUL_WINDOW_KM, 2000, 10)}
          ${numberInput('Height km', 'env-reference-height-km', editor.heightKm, REFERENCE_ATLAS_MIN_USEFUL_WINDOW_KM, 1400, 10)}
          ${numberInput('West Lon', 'env-reference-west-lon', editorBounds.westLon, -180, 180, 0.01)}
          ${numberInput('East Lon', 'env-reference-east-lon', editorBounds.eastLon, -180, 180, 0.01)}
          ${numberInput('South Lat', 'env-reference-south-lat', editorBounds.southLat, -90, 90, 0.01)}
          ${numberInput('North Lat', 'env-reference-north-lat', editorBounds.northLat, -90, 90, 0.01)}
        </div>
        <div class="environment-studio-camera-row" aria-label="Operational window editor actions">
          <button type="button" data-action="env-reference-apply-window" ${disabledAttr}>Apply Window</button>
          <button type="button" data-action="env-reference-window-map-center" ${disabledAttr}>Move to Map Center</button>
          <button type="button" data-action="env-reference-focus-patch" ${disabledAttr}>Focus Selected Region</button>
          <button type="button" data-action="env-reference-clear-boundary">Clear Boundary</button>
          <button type="button" data-action="env-reference-export-patch-request" ${canExportRequest ? 'aria-disabled="false"' : `disabled aria-disabled="true" title="${escapeAttr(exportRequestAction.reason)}"`}>${escapeHtml(exportRequestAction.label)}</button>
        </div>
        ${editor.tinySelectionExpanded ? `
          <div class="environment-studio-budget-status environment-studio-budget-status-warn" data-env-reference-tiny-selection-guidance>
            <strong>${escapeHtml(REFERENCE_ATLAS_TINY_SELECTION_MESSAGE)}</strong>
            <span>Minimum useful mission-planning window is ${REFERENCE_ATLAS_MIN_USEFUL_WINDOW_KM} x ${REFERENCE_ATLAS_MIN_USEFUL_WINDOW_KM} km. Recommended starting size is ${REFERENCE_ATLAS_RECOMMENDED_WINDOW_KM} x ${REFERENCE_ATLAS_RECOMMENDED_WINDOW_KM} km.</span>
            <div class="environment-studio-camera-row">
              <button type="button" data-action="env-reference-expand-local" ${disabledAttr}>Expand to Local Patch</button>
              <button type="button" data-action="env-reference-expand-regional" ${disabledAttr}>Expand to Regional Survey</button>
            </div>
          </div>
        ` : ''}
      </div>
      <div class="cell-inspector-metrics">
        ${metricHtml('Selected Bounds', selectedBoundsLabel)}
        ${metricHtml('Operational Scale', operationalWindow?.scaleClass ?? 'none selected')}
        ${metricHtml('Operational Size', operationalWindow ? `${formatNumber(operationalWindow.widthKm)} x ${formatNumber(operationalWindow.heightKm)} km` : 'n/a')}
        ${metricHtml('Operational Area', operationalWindow ? `${formatInteger(operationalWindow.areaKm2)} km2` : 'n/a')}
        ${metricHtml('Valid Selection', operationalWindow ? (operationalWindow.validSelection ? 'yes' : 'no') : 'n/a')}
        ${metricHtml('Operational Selection', atlasStageAction.selectedRegionScale?.operationalSelectionStatus ?? 'NONE')}
        ${metricHtml('Patch Availability', availability?.status ?? 'none selected')}
        ${metricHtml('Matching Fixture', availability?.matchedFixtureId ?? 'none')}
        ${metricHtml('Matching Role', availability?.matchedFixtureRole ?? 'n/a')}
        ${metricHtml('Hosted Tile Set', availability?.matchedFixture?.tileLibraryTileSetId ?? availability?.matchedFixture?.tileSetId ?? 'n/a')}
        ${metricHtml('3D Preview Mesh', availability?.matchedFixture?.meshLods?.length ? 'available' : 'n/a')}
        ${metricHtml('Selected Size', selected ? `${formatNumber(Math.abs(Number(bounds.eastLon) - Number(bounds.westLon)))} x ${formatNumber(Math.abs(Number(bounds.northLat) - Number(bounds.southLat)))} deg` : 'n/a')}
        ${metricHtml('Budget Status', budgetStatusLabel)}
        ${metricHtml('Generation Budget', atlasStageAction.selectedRegionScale?.generationBudgetStatus ?? budgetStatusLabel)}
        ${metricHtml('Live Generation', generationBudget?.generationAllowed === true ? 'enabled' : generationBudget ? 'disabled' : 'n/a')}
        ${metricHtml('Patch Request', boundaryBudget?.patchRequestAllowed === true ? 'allowed' : boundaryBudget ? 'not allowed' : 'n/a')}
        ${metricHtml('Recommended Action', boundaryBudget?.recommendedAction ?? 'select a window')}
        ${metricHtml('Source Cells', boundaryBudget ? formatInteger(boundaryBudget.sourceCellCount) : 'n/a')}
        ${metricHtml('Source Grid', boundaryBudget ? `${formatInteger(boundaryBudget.estimatedColumns)} x ${formatInteger(boundaryBudget.estimatedRows)}` : 'n/a')}
        ${metricHtml('Field Grid', boundaryBudget ? `${formatInteger(boundaryBudget.fieldGridEstimate?.columns)} x ${formatInteger(boundaryBudget.fieldGridEstimate?.rows)}` : 'n/a')}
      </div>
      ${boundaryBudget ? `
        <div class="environment-studio-budget-status environment-studio-budget-status-${escapeAttr(String(boundaryBudget.budgetStatus ?? 'unknown').toLowerCase())}" data-boundary-budget-status="${escapeAttr(boundaryBudget.budgetStatus ?? 'UNKNOWN')}">
          <strong>${escapeHtml(boundaryBudget.budgetStatus ?? 'UNKNOWN')}</strong>
          <span>${escapeHtml(budgetStatusMessage)}</span>
          <small>${escapeHtml((boundaryBudget.budgetReasons ?? []).slice(0, 3).join(' '))}</small>
        </div>
      ` : ''}
      <details>
        <summary>Manual bbox controls</summary>
        ${numberInput('Window width deg', 'env-reference-window-width-deg', Number(bounds.eastLon ?? -121.7) - Number(bounds.westLon ?? -123.0), 0.1, 12, 0.1)}
        ${numberInput('Window height deg', 'env-reference-window-height-deg', Number(bounds.northLat ?? 37.2) - Number(bounds.southLat ?? 36.0), 0.1, 8, 0.1)}
        ${numberInput('Output resolution m', 'env-reference-output-resolution', selected?.selectedResolutionMeters ?? 1500, 250, 10000, 250)}
        ${numberInput('Preview resolution m', 'env-reference-preview-resolution', selected?.previewResolutionMeters ?? 6000, 1000, 20000, 500)}
        <div class="environment-studio-camera-row" aria-label="Move selected reference patch">
          <button type="button" data-env-reference-window-action="left" ${disabledAttr}>Left</button>
          <button type="button" data-env-reference-window-action="right" ${disabledAttr}>Right</button>
          <button type="button" data-env-reference-window-action="up" ${disabledAttr}>Up</button>
          <button type="button" data-env-reference-window-action="down" ${disabledAttr}>Down</button>
          <button type="button" data-env-reference-window-action="narrower" ${disabledAttr}>Narrower</button>
          <button type="button" data-env-reference-window-action="wider" ${disabledAttr}>Wider</button>
          <button type="button" data-env-reference-window-action="shorter" ${disabledAttr}>Shorter</button>
          <button type="button" data-env-reference-window-action="taller" ${disabledAttr}>Taller</button>
        </div>
      </details>
    </section>
    <section class="console-section environment-studio-basic-panel" data-keep-title="true" data-env-stage-section="boundary-actions">
      <h2>Boundary Actions</h2>
      <p class="hud-muted">${escapeHtml(nextStepDescription)}</p>
      ${atlasActionButtonHtml('continueToBathymetry', atlasActions.continueToBathymetry, 'env-reference-continue-bathymetry')}
      ${atlasActionButtonHtml('openCoarsePreview', atlasActions.openCoarsePreview, 'env-reference-open-coarse-preview')}
      ${atlasActionButtonHtml('loadMissionPatch', atlasActions.loadMissionPatch, 'env-reference-load-patch')}
      ${atlasActionButtonHtml(exportRequestAction === atlasActions.exportMultiTileRequest ? 'exportMultiTileRequest' : 'exportPatchRequest', exportRequestAction, 'env-reference-export-patch-request')}
      ${atlasActionButtonHtml('inspectFallback', atlasActions.inspectFallback, 'env-reference-inspect-fallback')}
      ${canExportRequest ? `<code>${escapeHtml(session.referencePatchRequest?.downloadCommand ?? session.referencePatchRequest?.downloadCommands?.[0] ?? '')}</code><code>${escapeHtml(session.referencePatchRequest?.preprocessCommand ?? session.referencePatchRequest?.preprocessCommands?.[0] ?? 'npm.cmd run preprocess:reference-bathy')}</code>` : ''}
      <details class="environment-studio-collapsible">
        <summary>Advanced</summary>
        <div class="hud-muted">Dataset provenance, tile-library digests, claim boundary, and selected-region export remain browser-safe metadata. Runtime does not fetch NOAA/GEBCO or expose raw external_data paths.</div>
        <div class="cell-inspector-metrics">
          ${metricHtml('Tile set ID', atlasStageAction.tileSetId ?? 'n/a')}
          ${metricHtml('Tile set role', atlasStageAction.tileSetRole ?? 'n/a')}
          ${metricHtml('Primary action', atlasStageAction.primaryAction)}
          ${metricHtml('Next action', atlasStageAction.selectedRegionNextAction)}
          ${metricHtml('Manifest digest', shortDigest(manifest.manifestDigest))}
        </div>
      </details>
      <button class="console-button secondary" type="button" data-action="env-studio-export-project">Export Project</button>
      <label class="console-button secondary" for="env-studio-import-file">Import Project</label>
      <input id="env-studio-import-file" type="file" accept="application/json,.json" hidden data-env-studio-import />
      <button class="console-button secondary" type="button" data-action="menu">Main Menu</button>
    </section>
  `;
}

function referenceFixtureSelectorHtml(manifest = {}, atlas = {}) {
  const fixtures = Array.isArray(manifest?.fixtures) ? manifest.fixtures : [];
  if (!fixtures.length) {
    return `
      <div class="environment-studio-empty-state" data-env-reference-fixture-selector>
        <strong>No reference fixtures available</strong>
        <span>Manifest status: ${escapeHtml(manifest?.fixtureStatus ?? atlas?.provenance?.fixtureStatus ?? NO_REFERENCE_DATA_FIXTURE)}</span>
      </div>
    `;
  }
  return `
    <select data-env-reference-fixture-selector aria-label="Reference bathymetry fixtures">
      ${fixtures.map((fixture) => `<option value="${escapeAttr(fixture.fixtureId)}">${escapeHtml(fixture.label ?? fixture.fixtureId)} (${escapeHtml(fixture.role ?? 'referencePatch')}, ${escapeHtml(fixture.sourceResolution ?? 'unknown resolution')})</option>`).join('')}
    </select>
    <div class="cell-inspector-metrics">
      ${metricHtml('Fixture Count', fixtures.length)}
      ${metricHtml('Fixture Role', fixtures[0]?.role ?? 'n/a')}
      ${metricHtml('Source Resolution', fixtures[0]?.sourceResolution ?? 'n/a')}
      ${metricHtml('Source Variant', fixtures[0]?.sourceVariant ?? 'n/a')}
      ${metricHtml('Actual Arc-Seconds', fixtures[0]?.actualRasterResolutionArcSeconds ?? 'n/a')}
      ${metricHtml('Raster Shape', fixtures[0]?.columns && fixtures[0]?.rows ? `${fixtures[0].columns} x ${fixtures[0].rows}` : 'n/a')}
      ${metricHtml('Overview Digest', shortDigest(manifest?.overview?.digest))}
      ${metricHtml('Manifest Digest', shortDigest(manifest?.manifestDigest))}
    </div>
  `;
}

function referenceFixtureAvailabilityMessage(session = {}) {
  const manifest = session.referenceBathymetryManifest ?? session.referenceAtlas?.manifest ?? {};
  const fixtures = Array.isArray(manifest.fixtures) ? manifest.fixtures : [];
  if (!fixtures.length) return 'Reference bathymetry data is not available yet.';
  const missionReady = fixtures.find((fixture) => fixture.role === 'missionReadyPatch');
  if (missionReady) {
    const fallbackCount = fixtures.filter((fixture) => fixture.role === 'lowResolutionReferencePatch').length;
    return `Reference fixture available: ${missionReady.sourceDataset ?? 'reference dataset'} ${missionReady.sourceResolution ?? '15 arc-second'} ${missionReady.label ?? missionReady.fixtureId} mission-ready patch is preferred. ${fallbackCount} low-resolution fallback fixture${fallbackCount === 1 ? '' : 's'} remain available.`;
  }
  const fixture = fixtures[0];
  return `Reference fixture available: ${fixture.sourceDataset ?? 'reference dataset'} ${fixture.sourceResolution ?? 'unknown-resolution'} ${fixture.label ?? fixture.fixtureId} low-resolution reference patch. High-resolution 15 arc-second mission-ready patch pending.`;
}

function blockedInstructionsHtml() {
  return `
    <div class="environment-studio-blocked-state" data-env-reference-blocked-instructions>
      <strong>BLOCKED_WAITING_FOR_REFERENCE_BATHYMETRY_DOWNLOAD</strong>
      <p class="hud-muted">Run the local data pipeline, then reload Environment Studio.</p>
      <code>npm.cmd run download:reference-bathy</code>
      <code>npm.cmd run preprocess:reference-bathy</code>
      <code>npm.cmd run audit:reference-bathy</code>
      <p class="hud-muted">Raw NOAA/GEBCO files are ignored under external_data/reference_bathymetry/. Runtime fixtures belong under assets/reference_bathymetry/.</p>
    </div>
  `;
}

function bindEnvironmentStudioReferenceAtlasControls(scene, root) {
  root?.querySelector?.('[data-env-reference-source-mode]')?.addEventListener('change', (event) => scene.setSourceMode(event.target.value));
  root?.querySelectorAll?.('[data-env-reference-view-action]')?.forEach((button) => {
    button.addEventListener('click', () => scene.adjustReferenceView(button.getAttribute('data-env-reference-view-action')));
  });
  root?.querySelectorAll?.('[data-env-reference-layer]')?.forEach((button) => {
    button.addEventListener('click', () => scene.setReferenceLayer(button.getAttribute('data-env-reference-layer')));
  });
  root?.querySelector?.('[data-action="env-reference-draw-boundary"]')?.addEventListener('click', () => scene.toggleReferenceBoundaryDrawing());
  root?.querySelector?.('[data-action="env-reference-select-boundary"]')?.addEventListener('click', () => scene.selectReferenceWindowFromControls());
  root?.querySelectorAll?.('[data-action="env-reference-focus-patch"]')?.forEach((button) => {
    button.addEventListener('click', () => scene.focusSelectedReferencePatch());
  });
  root?.querySelectorAll?.('[data-action="env-reference-clear-boundary"]')?.forEach((button) => {
    button.addEventListener('click', () => scene.clearReferenceWindow());
  });
  root?.querySelectorAll?.('[data-env-reference-window-preset]')?.forEach((button) => {
    button.addEventListener('click', () => scene.selectReferenceOperationalPreset(button.getAttribute('data-env-reference-window-preset')));
  });
  root?.querySelector?.('[data-env-reference-window-mode]')?.addEventListener('change', (event) => {
    const mode = event.target.value;
    if (mode === 'drawCustom') scene.selectReferenceOperationalPreset('custom');
    else scene.selectReferenceOperationalPreset(mode);
  });
  root?.querySelectorAll?.('#env-reference-center-lon, #env-reference-center-lat, #env-reference-width-km, #env-reference-height-km, #env-reference-west-lon, #env-reference-east-lon, #env-reference-south-lat, #env-reference-north-lat')?.forEach((input) => {
    input.addEventListener('change', () => {
      scene.operationalWindowEditor = {
        ...scene.operationalWindowEditorDebugPayload(),
        ...scene.readOperationalWindowEditorFromControls(),
        appliedFrom: 'typed-draft',
        tinySelectionExpanded: false
      };
    });
  });
  root?.querySelector?.('[data-action="env-reference-apply-window"]')?.addEventListener('click', () => scene.applyOperationalWindowEditor('typed'));
  root?.querySelector?.('[data-action="env-reference-window-map-center"]')?.addEventListener('click', () => scene.moveOperationalWindowToMapCenter());
  root?.querySelector?.('[data-action="env-reference-expand-local"]')?.addEventListener('click', () => scene.expandOperationalWindowToPreset('localPatch'));
  root?.querySelector?.('[data-action="env-reference-expand-regional"]')?.addEventListener('click', () => scene.expandOperationalWindowToPreset('regionalSurvey'));
  root?.querySelector?.('[data-env-reference-fixture-selector]')?.addEventListener('change', (event) => scene.selectReferenceFixture(event.target.value));
  root?.querySelectorAll?.('[data-env-reference-window-action]')?.forEach((button) => {
    button.addEventListener('click', () => scene.adjustReferenceWindow(button.getAttribute('data-env-reference-window-action')));
  });
  root?.querySelector?.('[data-action="env-reference-load-patch"]')?.addEventListener('click', () => scene.loadSelectedReferencePatch());
  root?.querySelector?.('[data-action="env-reference-continue-bathymetry"]')?.addEventListener('click', () => scene.continueToRegionalBathymetry());
  root?.querySelector?.('[data-action="env-reference-open-coarse-preview"]')?.addEventListener('click', () => scene.openCoarseRegionalPreview());
  root?.querySelector?.('[data-action="env-reference-inspect-fallback"]')?.addEventListener('click', () => scene.inspectLowResolutionFallback());
  root?.querySelectorAll?.('[data-action="env-reference-export-patch-request"]')?.forEach((button) => {
    button.addEventListener('click', () => scene.exportReferencePatchRequest());
  });
  root?.querySelector?.('[data-action="env-reference-generate-bathymetry"]')?.addEventListener('click', () => scene.generateReferenceBathymetry());
  root?.querySelector?.('[data-action="env-studio-export-project"]')?.addEventListener('click', () => scene.exportProject());
  root?.querySelector?.('[data-env-studio-import]')?.addEventListener('change', (event) => scene.importProject(event.target.files?.[0]));
  root?.querySelector?.('[data-action="menu"]')?.addEventListener('click', () => scene.scene.start('MainMenuScene'));
}

async function fetchJsonIfAvailable(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) return null;
  return response.json();
}

function referenceAtlasRightPanelHtml(session = {}) {
  const atlas = session.referenceAtlas ?? {};
  const selected = session.selectedReferenceWindow;
  const referenceAvailable = atlas.sourceDataset?.referenceDataAvailable === true;
  const manifest = session.referenceBathymetryManifest ?? atlas.manifest ?? {};
  const fixtures = session.referenceAtlas?.referenceFixtures ?? manifest.fixtures ?? [];
  const missionReadyCount = fixtures.filter((fixture) => fixture.role === 'missionReadyPatch').length;
  const lowResCount = fixtures.filter((fixture) => fixture.role === 'lowResolutionReferencePatch').length;
  if (!selected) {
    return `
      <section class="waypoint-shell environment-studio-right-panel" id="env-studio-status-panel">
        <div class="console-kicker">Selected Operational Window</div>
        <h2>${escapeHtml(atlas.label ?? 'Reference Bathymetry Atlas')}</h2>
        <p class="hud-muted">${referenceAvailable ? 'Draw a bounding box or click an available patch. The overview is for region selection and patch availability, not mission-resolution bathymetry.' : 'Reference bathymetry generation is blocked because no preprocessed public fixture is available. The app is not displaying a placeholder as reference data.'}</p>
        <div class="cell-inspector-metrics">
          ${metricHtml('Dataset', atlas.sourceDataset?.name ?? NO_REFERENCE_DATA_FIXTURE)}
          ${metricHtml('Provider', atlas.sourceDataset?.provider)}
          ${metricHtml('Overview source', manifest.overview?.label ?? atlas.overviewArtifact?.label ?? 'n/a')}
          ${metricHtml('Overview bounds', manifest.overview?.bounds ? `${formatNumber(manifest.overview.bounds.westLon)}..${formatNumber(manifest.overview.bounds.eastLon)} lon` : 'n/a')}
          ${metricHtml('Vertical units', atlas.sourceDataset?.verticalUnits)}
          ${metricHtml('Frame', atlas.sourceDataset?.horizontalCoordinateFrame)}
          ${metricHtml('Fixture Count', atlas.fixtureCount ?? fixtures.length)}
          ${metricHtml('Mission-ready', missionReadyCount)}
          ${metricHtml('Low-res fallback', lowResCount)}
          ${metricHtml('Hosted tile sets', session.referenceTileLibraryDebug?.stagedTileSetCount ?? session.referenceTileLibrary?.coverageSummary?.stagedTileSetCount ?? 0)}
          ${metricHtml('Request-only regions', session.referenceTileLibraryDebug?.requestOnlyTileSetCount ?? session.referenceTileLibrary?.coverageSummary?.requestOnlyTileSetCount ?? 0)}
          ${metricHtml('Tile Library', shortDigest(session.referenceTileLibrary?.digest))}
          ${metricHtml('Manifest Digest', shortDigest(manifest.manifestDigest))}
          ${metricHtml('Atlas Digest', shortDigest(atlas.atlasDigest))}
          ${metricHtml('Fixture Status', atlas.provenance?.fixtureStatus ?? NO_REFERENCE_DATA_FIXTURE)}
        </div>
        ${!referenceAvailable ? blockedInstructionsHtml() : '<p class="hud-muted">Claim boundary: reference bathymetry plus deterministic synthetic benchmark fields; not certified navigation data and not an operational forecast.</p>'}
      </section>
    `;
  }
  const availability = session.selectedReferenceAvailability ?? selected.availability ?? {};
  const atlasStageAction = referenceAtlasStageActionState(session);
  const loaded = session.loadedReferenceFixture ?? null;
  const stats = selected.sampledStats ?? {};
  const bounds = selected.bounds ?? {};
  const boundaryBudget = session.selectedReferenceBoundaryBudget ?? availability.boundaryBudget ?? null;
  const operationalWindow = session.selectedReferenceOperationalWindow ?? boundaryBudget?.operationalWindow ?? availability.operationalWindow ?? null;
  const generationBudget = session.selectedReferenceGenerationBudget ?? boundaryBudget ?? null;
  const budgetMetrics = boundaryBudget ? `
          ${metricHtml('Budget status', boundaryBudget.budgetStatus)}
          ${metricHtml('Operational scale', operationalWindow?.scaleClass ?? 'n/a')}
          ${metricHtml('Operational size', operationalWindow ? `${formatNumber(operationalWindow.widthKm)} x ${formatNumber(operationalWindow.heightKm)} km` : 'n/a')}
          ${metricHtml('Live generation', generationBudget?.generationAllowed === true ? 'enabled' : 'disabled')}
          ${metricHtml('Patch request', boundaryBudget.patchRequestAllowed === true ? 'allowed' : 'not allowed')}
          ${metricHtml('Recommended action', boundaryBudget.recommendedAction)}
          ${metricHtml('Source cells', formatInteger(boundaryBudget.sourceCellCount))}
          ${metricHtml('Budget source grid', `${formatInteger(boundaryBudget.estimatedColumns)} x ${formatInteger(boundaryBudget.estimatedRows)}`)}
          ${metricHtml('Field samples', formatInteger(boundaryBudget.estimatedFieldSampleCount))}
        ` : '';
  const nextStepLabel = atlasStageAction.primaryAction === 'continueToBathymetry'
    ? atlasStageAction.actionState.continueToBathymetry.label
    : atlasStageAction.primaryAction === 'exportMultiTileRequest'
      ? atlasStageAction.actionState.exportMultiTileRequest.label
      : atlasStageAction.primaryAction === 'inspectFallback'
        ? atlasStageAction.actionState.inspectFallback.label
        : atlasStageAction.primaryAction === 'exportPatchRequest'
          ? atlasStageAction.actionState.exportPatchRequest.label
          : 'Inspect Selection';
  const nextStepExplanation = atlasStageAction.primaryAction === 'continueToBathymetry'
    ? 'A hosted mission-ready tile set is staged for this boundary and can be loaded into the Regional 3D Bathymetry Workspace.'
    : atlasStageAction.primaryAction === 'exportMultiTileRequest'
      ? 'This is a valid operational area. High-resolution browser loading requires staged multi-tile bathymetry.'
      : atlasStageAction.primaryAction === 'inspectFallback'
        ? 'A low-resolution fallback is staged for inspection, but it is not the mission-ready 3D bathymetry path.'
        : atlasStageAction.primaryAction === 'exportPatchRequest'
          ? 'This operational window is valid, but no app-hosted mission-ready tile is staged yet.'
          : 'Review the selected operational window and tile availability.';
  if (loaded) {
    return `
      <section class="waypoint-shell environment-studio-right-panel" id="env-studio-status-panel">
        <div class="console-kicker">Selected Regional Patch</div>
        <h2>${escapeHtml(loaded.label ?? loaded.fixtureId ?? 'Loaded Reference Patch')}</h2>
        <p class="hud-muted">The staged fixture is loaded. Generate 3D Bathymetry to create the regional bottom surface, then regenerate synthetic fields, compose the environment, validate launch, and export benchmark artifacts.</p>
        <div class="cell-inspector-metrics">
          ${metricHtml('Fixture ID', loaded.fixtureId)}
          ${metricHtml('Role', loaded.role)}
          ${metricHtml('Dataset', loaded.sourceDataset)}
          ${metricHtml('Source resolution', loaded.sourceResolution)}
          ${metricHtml('Raster shape', loaded.columns && loaded.rows ? `${loaded.columns} x ${loaded.rows}` : 'n/a')}
          ${metricHtml('Hosted Tile Set', loaded.tileLibraryTileSetId ?? loaded.tileSetId ?? 'legacy fixture')}
          ${metricHtml('Preview Mesh', loaded.meshLods?.length ? 'available' : 'not registered')}
          ${budgetMetrics}
          ${metricHtml('Digest', shortDigest(loaded.digest))}
          ${metricHtml('Bathymetry', session.bathymetryArtifactDigest ? 'CURRENT' : 'NOT_GENERATED')}
          ${metricHtml('Fields', session.fieldRegenerationResult?.fieldGenerationStatus ?? 'REQUIRES_REGENERATION')}
          ${metricHtml('Environment', session.environmentCompositionResult?.environmentArtifactStatus ?? session.fieldRegenerationResult?.environmentArtifactStatus ?? 'REQUIRES_COMPOSITION')}
          ${metricHtml('Launch', session.launchValidationResult?.status ?? 'not run')}
          ${metricHtml('Benchmark', session.benchmarkBundleResult?.status ?? 'REQUIRES_REGENERATION')}
        </div>
      </section>
    `;
  }
  return `
    <section class="waypoint-shell environment-studio-right-panel" id="env-studio-status-panel">
      <div class="console-kicker">Selected Operational Window</div>
      <h2>${escapeHtml(availability.matchedFixtureId ?? 'Selected Atlas Region')}</h2>
      <p class="hud-muted">${escapeHtml(nextStepExplanation)}</p>
      <div class="cell-inspector-metrics">
        ${metricHtml('Patch Digest', shortDigest(selected.patchDigest))}
        ${metricHtml('West / East lon', `${formatNumber(bounds.westLon)} / ${formatNumber(bounds.eastLon)}`)}
        ${metricHtml('South / North lat', `${formatNumber(bounds.southLat)} / ${formatNumber(bounds.northLat)}`)}
        ${metricHtml('Center lon / lat', operationalWindow ? `${formatNumber(operationalWindow.centerLon)} / ${formatNumber(operationalWindow.centerLat)}` : 'n/a')}
        ${metricHtml('Width / Height km', operationalWindow ? `${formatNumber(operationalWindow.widthKm)} / ${formatNumber(operationalWindow.heightKm)}` : 'n/a')}
        ${metricHtml('Area km2', formatInteger(operationalWindow?.areaKm2))}
        ${metricHtml('Scale class', operationalWindow?.scaleClass ?? 'n/a')}
        ${metricHtml('Operational selection', atlasStageAction.selectedRegionScale?.operationalSelectionStatus ?? 'NONE')}
        ${metricHtml('Availability', availability.status ?? 'notStaged')}
        ${metricHtml('Matching fixture', availability.matchedFixtureId ?? 'none')}
        ${metricHtml('Matching role', availability.matchedFixtureRole ?? 'n/a')}
        ${metricHtml('Hosted Tile Set', availability.matchedFixture?.tileLibraryTileSetId ?? availability.matchedFixture?.tileSetId ?? 'n/a')}
        ${metricHtml('Tile set role', atlasStageAction.tileSetRole ?? 'n/a')}
        ${metricHtml('Source dataset', availability.matchedFixture?.sourceDataset ?? 'ETOPO_2022')}
        ${metricHtml('Resolution', availability.matchedFixture?.sourceResolution ?? 'request only')}
        ${metricHtml('Raster status', availability.available ? 'hosted' : 'not staged')}
        ${metricHtml('Preview Mesh', availability.matchedFixture?.meshLods?.length ? 'available' : 'n/a')}
        ${metricHtml('Coverage status', availability.coverageStatus ?? availability.matchedFixture?.coverageRole ?? 'n/a')}
        ${metricHtml('Depth min / mean / max', `${formatNumber(stats.minDepthMeters)} / ${formatNumber(stats.meanDepthMeters)} / ${formatNumber(stats.maxDepthMeters)} m`)}
        ${metricHtml('Land / Ocean', `${formatNumber(stats.landFraction)} / ${formatNumber(stats.oceanFraction)}`)}
        ${metricHtml('Wet connectivity', formatNumber(stats.wetConnectedFraction))}
        ${metricHtml('Slope mean', formatNumber(stats.slopeStats?.mean))}
        ${budgetMetrics}
        ${metricHtml('Validation', selected.validation?.status ?? 'UNKNOWN')}
      </div>
      ${boundaryBudget?.budgetStatus === 'MULTI_TILE_REQUIRED' ? `<p class="hud-muted">${escapeHtml(REFERENCE_ATLAS_MULTITILE_MESSAGE)}</p>` : ''}
      ${boundaryBudget?.budgetStatus === 'BLOCKED' ? `<p class="hud-muted">${escapeHtml(REFERENCE_ATLAS_BUDGET_BLOCKED_MESSAGE)}</p>` : ''}
      <table class="environment-studio-table">
        <tbody>
          <tr><td>Next Step</td><td>${escapeHtml(nextStepLabel)} - ${escapeHtml(nextStepExplanation)}</td></tr>
          <tr><td>Recommended next action</td><td>${escapeHtml(boundaryBudget?.recommendedAction ?? availability.recommendedAction ?? atlasStageAction.selectedRegionNextAction)}</td></tr>
          <tr><td>Preprocess command</td><td>${escapeHtml(session.referencePatchRequest?.downloadCommand ?? session.referencePatchRequest?.downloadCommands?.[0] ?? 'Patch is staged; load it from the atlas.')}</td></tr>
          <tr><td>Bathymetry Raster</td><td>${atlasStageAction.continueToBathymetryEnabled ? 'LOADABLE_HOSTED_TILE' : 'REQUIRES_STAGED_PATCH'}</td></tr>
          <tr><td>3D Preview Mesh</td><td>${availability.matchedFixture?.meshLods?.length ? 'LOADABLE_NON_AUTHORITATIVE_LOD' : 'REQUIRES_REGENERATION'}</td></tr>
          <tr><td>Wet/Land Mask</td><td>REQUIRES_GENERATION</td></tr>
          <tr><td>Coastline</td><td>REQUIRES_GENERATION</td></tr>
          <tr><td>Current Field</td><td>REQUIRES_REGENERATION</td></tr>
          <tr><td>Scalar Field</td><td>REQUIRES_REGENERATION</td></tr>
          <tr><td>Hotspots</td><td>REQUIRES_REGENERATION</td></tr>
          <tr><td>Hazards</td><td>REQUIRES_REGENERATION</td></tr>
          <tr><td>Starts / Drop Zones</td><td>NEEDS_VALIDATION</td></tr>
          <tr><td>Environment Artifact</td><td>REQUIRES_COMPOSITION</td></tr>
          <tr><td>Benchmark Bundle</td><td>REQUIRES_REGENERATION</td></tr>
          <tr><td>Claim boundary</td><td>Not certified navigation data, not calibrated ocean forecast, no hidden truth.</td></tr>
        </tbody>
      </table>
    </section>
  `;
}

function referenceAtlasPreviewHtml(session = {}, project = {}) {
  const selected = session.selectedReferenceWindow;
  const referenceAvailable = session.referenceAtlas?.sourceDataset?.referenceDataAvailable === true;
  if (!referenceAvailable) {
    return `
      <main id="environment-studio-route" class="environment-studio-route environment-studio-reference-route">
        <header class="environment-studio-route-header">
          <div>
            <p class="console-kicker">Reference Bathymetry Atlas</p>
            <h1>Reference Bathymetry Data Required</h1>
            <p>ANCHOR uses preprocessed public bathymetry/topography references as the default Environment Studio source. No fixture is currently available, so placeholder bathymetry is not shown as reference data.</p>
          </div>
          <div class="environment-studio-digest">
            <span>Project Digest</span>
            <strong>${escapeHtml(shortDigest(project.projectDigest))}</strong>
            <span>Manifest</span>
            <strong>${escapeHtml(shortDigest(session.referenceBathymetryManifest?.manifestDigest ?? session.referenceAtlas?.manifest?.manifestDigest))}</strong>
          </div>
        </header>
        <section class="environment-studio-preview-grid" aria-label="Reference bathymetry blocked state">
          <section class="environment-studio-terrain-preview environment-studio-reference-preview" data-env-reference-blocked-panel>
            <h2>NO_REFERENCE_DATA_FIXTURE</h2>
            <p class="hud-muted">The browser app does not download NOAA or GEBCO data at runtime. Raw source files stay under external_data/reference_bathymetry/ and compact ANCHOR fixtures live under assets/reference_bathymetry/.</p>
            ${blockedInstructionsHtml()}
            ${referenceFixtureSelectorHtml(session.referenceBathymetryManifest ?? session.referenceAtlas?.manifest, session.referenceAtlas)}
          </section>
        </section>
        <section class="environment-studio-boundary">
          <strong>Boundary</strong>
          <span>Blocked until a preprocessed ETOPO/GEBCO/public bathymetry fixture is created. Procedural synthetic worlds remain experimental and are not the default reference source.</span>
        </section>
      </main>
    `;
  }
  return `
    <main id="environment-studio-route" class="environment-studio-route environment-studio-reference-route">
      <header class="environment-studio-route-header">
        <div>
          <p class="console-kicker">Reference Bathymetry Atlas</p>
          <h1>${escapeHtml(session.referenceAtlas?.label ?? 'Reference Bathymetry Atlas')}</h1>
          <p>Global atlas selector for staged mission patches. Load an available patch before generating a regional environment.</p>
        </div>
        <div class="environment-studio-digest">
          <span>Project Digest</span>
          <strong>${escapeHtml(shortDigest(project.projectDigest))}</strong>
          <span>Overview</span>
          <strong>${escapeHtml(shortDigest(session.referenceAtlas?.overviewDigest ?? session.referenceBathymetryManifest?.overview?.digest))}</strong>
        </div>
      </header>
      <section class="environment-studio-preview-grid" aria-label="Reference bathymetry atlas">
        <section class="environment-studio-terrain-preview environment-studio-reference-preview" data-env-reference-preview-panel>
          <h2>Reference Bathymetry Atlas</h2>
          <div class="environment-studio-preview-meta">
            ${metricHtml('Dataset', session.referenceAtlas?.sourceDataset?.name ?? NO_REFERENCE_DATA_FIXTURE)}
            ${metricHtml('Layer', labelize(session.referenceLayer))}
            ${metricHtml('Overview', session.referenceAtlas?.overviewArtifact?.label ?? session.referenceBathymetryManifest?.overview?.label ?? 'global overview')}
            ${metricHtml('Mission-ready patches', session.referenceAtlas?.fixtureCoverageOverlays?.filter?.((entry) => entry.role === 'missionReadyPatch')?.length ?? 0)}
            ${metricHtml('Low-res patches', session.referenceAtlas?.fixtureCoverageOverlays?.filter?.((entry) => entry.role === 'lowResolutionReferencePatch')?.length ?? 0)}
            ${metricHtml('Matched patch', session.selectedReferenceAvailability?.matchedFixtureId ?? 'none')}
            ${metricHtml('Atlas Digest', shortDigest(session.referenceAtlas?.atlasDigest))}
            ${metricHtml('Patch Digest', shortDigest(selected?.patchDigest))}
            ${metricHtml('Zoom', `${formatNumber(session.worldView?.zoom ?? 1)}x`)}
            <div><span>Coordinates</span><strong data-env-reference-coordinate>click map</strong></div>
          </div>
          <div class="environment-studio-reference-map-shell">
            <canvas width="900" height="450" data-env-reference-bathymetry-map aria-label="Reference bathymetry map"></canvas>
          </div>
          <div class="environment-studio-camera-row" aria-label="Reference map controls">
            <button type="button" data-env-reference-view-action="left">Pan Left</button>
            <button type="button" data-env-reference-view-action="right">Pan Right</button>
            <button type="button" data-env-reference-view-action="up">Pan Up</button>
            <button type="button" data-env-reference-view-action="down">Pan Down</button>
            <button type="button" data-env-reference-view-action="zoom-in">Zoom In</button>
            <button type="button" data-env-reference-view-action="zoom-out">Zoom Out</button>
            <button type="button" data-env-reference-view-action="reset">Reset</button>
            <button type="button" data-action="env-reference-focus-patch">Focus Patch</button>
          </div>
          <div class="environment-studio-depth-ramp" aria-label="Reference atlas legend">
            <span style="background:#536f40">land</span>
            <span style="background:#4bbdb8">shelf</span>
            <span style="background:#184b8a">slope</span>
            <span style="background:#061a4a">deep</span>
            <span style="background:#f4b446">mission patch</span>
            <span style="background:#5bacd3">low-res patch</span>
          </div>
          <p class="hud-muted">The overview is for global selection and patch availability. Regional output uses Reference bathymetry + deterministic synthetic bathymetry-conditioned fields after a staged patch is loaded.</p>
        </section>
      </section>
      <section class="environment-studio-boundary">
        <strong>Boundary</strong>
        <span>Canvas and Three.js visualize existing metadata only. They do not create bathymetry, currents, scalars, hidden truth, calibrated forecasts, or navigation data.</span>
      </section>
    </main>
  `;
}

function bindReferenceBathymetryPreview(scene, root) {
  const canvas = root?.querySelector?.('[data-env-reference-bathymetry-map]');
  if (!canvas) return;
  const abortController = new AbortController();
  const binding = {
    abortController,
    canvas,
    listenerCount: 0,
    pointerId: null,
    pointerMode: null,
    pointerStart: null,
    pointerStartView: null,
    pointerStartLonLat: null,
    pointerStartBounds: null,
    activeHandle: null,
    lastDragUpdate: null,
    rafId: null,
    wheelCommitTimer: null,
    panelUpdateTimer: null
  };
  scene.referenceAtlasPreviewBinding = binding;
  const signal = abortController.signal;
  const addListener = (target, type, handler, options = {}) => {
    if (!target?.addEventListener) return;
    target.addEventListener(type, handler, { ...options, signal });
    binding.listenerCount += 1;
    scene.referenceAtlasPerf.listenerAttachCount += 1;
    scene.referenceAtlasPerf.activeListenerCount += 1;
  };
  const coordinateLabel = root.querySelector('[data-env-reference-coordinate]');
  const schedulePreviewDraw = () => {
    if (binding.rafId != null) return;
    binding.rafId = globalThis.requestAnimationFrame?.(() => {
      binding.rafId = null;
      drawReferenceBathymetryCanvas(canvas, scene.session, {
        scene,
        worldView: scene.referenceAtlasTransientView,
        selectedBounds: scene.referenceAtlasTransientBounds
      });
    }) ?? null;
  };
  const pointerPoint = (event) => referenceCanvasPoint(canvas, event);
  const pointerCssPoint = (event) => referenceCanvasCssPoint(canvas, event);
  const rectangleGeometryForEvent = () => referenceAtlasRectangleGeometry({
    enabled: scene.referenceAtlasRectangleEditor?.enabled !== false,
    selectedBounds: scene.referenceAtlasTransientBounds ?? scene.session.selectedReferenceWindow?.bounds ?? null,
    worldView: scene.referenceAtlasTransientView ?? scene.session.worldView ?? {},
    atlas: scene.session.referenceAtlas,
    canvasSize: referenceCanvasCssSize(canvas),
    hitTargetPx: REFERENCE_ATLAS_RECTANGLE_HIT_TARGET_PX,
    activeHandle: scene.referenceAtlasRectangleEditor?.activeHandle ?? null,
    activeDragMode: scene.referenceAtlasRectangleEditor?.activeDragMode ?? REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.none,
    hoverHandle: scene.referenceAtlasRectangleEditor?.hoverHandle ?? null
  });
  const setCanvasCursor = (cursor) => {
    if (canvas?.style) canvas.style.cursor = cursor ?? 'grab';
  };
  const resetRectangleDragState = () => {
    binding.pointerStartBounds = null;
    binding.activeHandle = null;
    binding.lastDragUpdate = null;
    scene.referenceAtlasRectangleEditor = {
      ...scene.referenceAtlasRectangleEditor,
      activeHandle: null,
      activeDragMode: REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.none
    };
    canvas.classList?.remove?.('is-dragging');
    setCanvasCursor(scene.referenceBoundaryDrawing ? 'crosshair' : 'grab');
  };
  const updateHoverState = (event) => {
    if (scene.referenceBoundaryDrawing) {
      scene.referenceAtlasRectangleEditor = {
        ...scene.referenceAtlasRectangleEditor,
        hoverHandle: null,
        activeDragMode: REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.none
      };
      setCanvasCursor('crosshair');
      return;
    }
    const hit = hitTestReferenceAtlasRectangle(pointerCssPoint(event), rectangleGeometryForEvent());
    const previousHover = scene.referenceAtlasRectangleEditor?.hoverHandle ?? null;
    scene.referenceAtlasRectangleEditor = {
      ...scene.referenceAtlasRectangleEditor,
      hoverHandle: hit.handle,
      activeDragMode: REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.none
    };
    setCanvasCursor(hit.cursor ?? 'grab');
    if (previousHover !== hit.handle) schedulePreviewDraw();
  };
  const updateCoordinateLabel = (event) => {
    const lonLat = referenceCanvasLonLat(canvas, scene.session, event, {
      worldView: scene.referenceAtlasTransientView ?? scene.session.worldView
    });
    scene.lastReferenceMapPoint = { lon: lonLat.lon, lat: lonLat.lat };
    if (coordinateLabel) coordinateLabel.textContent = `${formatNumber(lonLat.lon)} lon, ${formatNumber(lonLat.lat)} lat`;
    return lonLat;
  };
  root?.querySelectorAll?.('[data-env-reference-view-action]')?.forEach((button) => {
    addListener(button, 'click', () => scene.adjustReferenceView(button.getAttribute('data-env-reference-view-action')));
  });
  addListener(root?.querySelector?.('[data-action="env-reference-focus-patch"]'), 'click', () => scene.focusSelectedReferencePatch());
  addListener(canvas, 'pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    scene.referenceAtlasPerf.pointerDownCount += 1;
    scene.referenceAtlasPerf.atlasInteractionActive = true;
    const hit = scene.referenceBoundaryDrawing
      ? { hit: false, handle: null, dragMode: REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.draw, cursor: 'crosshair' }
      : hitTestReferenceAtlasRectangle(pointerCssPoint(event), rectangleGeometryForEvent());
    const pointerMode = scene.referenceBoundaryDrawing
      ? REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.draw
      : (hit.hit ? hit.dragMode : 'pan');
    scene.referenceAtlasPerf.lastInteractionType = pointerMode;
    binding.pointerId = event.pointerId;
    binding.pointerMode = pointerMode;
    binding.pointerStart = pointerPoint(event);
    binding.pointerStartView = { ...(scene.referenceAtlasTransientView ?? scene.session.worldView ?? {}) };
    binding.pointerStartLonLat = referenceCanvasLonLat(canvas, scene.session, event, { worldView: binding.pointerStartView });
    binding.pointerStartBounds = scene.session.selectedReferenceWindow?.bounds
      ? { ...scene.session.selectedReferenceWindow.bounds }
      : null;
    binding.activeHandle = hit.handle ?? null;
    binding.lastDragUpdate = null;
    scene.referenceAtlasRectangleEditor = {
      ...scene.referenceAtlasRectangleEditor,
      activeHandle: hit.handle ?? null,
      activeDragMode: isReferenceAtlasRectangleEditorMode(pointerMode)
        ? pointerMode
        : REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.none,
      hoverHandle: hit.handle ?? null
    };
    canvas.classList?.add?.('is-dragging');
    setCanvasCursor(referenceAtlasCursorForDragMode(pointerMode, 'grabbing'));
    try {
      canvas.setPointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture is best-effort for older browser engines.
    }
    if (binding.pointerMode === REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.draw) {
      scene.referenceAtlasPerf.boundaryDrawStartCount += 1;
      scene.referenceAtlasTransientBounds = referenceAtlasBoundsFromDrag(binding.pointerStartLonLat, binding.pointerStartLonLat, referenceBoundaryDragOptions(scene));
      schedulePreviewDraw();
    }
  });
  addListener(canvas, 'pointermove', (event) => {
    scene.referenceAtlasPerf.pointerMoveCount += 1;
    const lonLat = updateCoordinateLabel(event);
    if (binding.pointerId == null || event.pointerId !== binding.pointerId) {
      updateHoverState(event);
      return;
    }
    event.preventDefault();
    const point = pointerPoint(event);
    if (binding.pointerMode === REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.draw) {
      scene.referenceAtlasPerf.lastInteractionType = REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.draw;
      scene.referenceAtlasPerf.boundaryPreviewCount += 1;
      scene.referenceAtlasTransientBounds = referenceAtlasBoundsFromDrag(binding.pointerStartLonLat, lonLat, referenceBoundaryDragOptions(scene));
      schedulePreviewDraw();
      return;
    }
    if (isReferenceAtlasRectangleDragMode(binding.pointerMode)) {
      scene.referenceAtlasPerf.lastInteractionType = binding.pointerMode;
      if (binding.pointerStartBounds) {
        binding.lastDragUpdate = referenceAtlasUpdateBoundsForDrag({
          initialBounds: binding.pointerStartBounds,
          dragMode: binding.pointerMode,
          startLonLat: binding.pointerStartLonLat,
          currentLonLat: lonLat,
          atlas: scene.session.referenceAtlas,
          ...referenceBoundaryDragOptions(scene)
        });
        scene.referenceAtlasTransientBounds = binding.lastDragUpdate.bounds;
        scene.referenceAtlasRectangleEditor = {
          ...scene.referenceAtlasRectangleEditor,
          activeHandle: binding.activeHandle,
          activeDragMode: binding.pointerMode,
          hoverHandle: binding.activeHandle,
          lastResizePreservedOppositeEdge: binding.lastDragUpdate.lastResizePreservedOppositeEdge !== false
        };
        schedulePreviewDraw();
      }
      return;
    }
    scene.referenceAtlasPerf.lastInteractionType = 'pan';
    scene.referenceAtlasTransientView = referenceAtlasPanView(
      binding.pointerStartView,
      point.x - binding.pointerStart.x,
      point.y - binding.pointerStart.y,
      scene.session.referenceAtlas
    );
    schedulePreviewDraw();
  });
  const finishPointer = (event, cancelled = false) => {
    if (binding.pointerId == null || event.pointerId !== binding.pointerId) return;
    event.preventDefault?.();
    scene.referenceAtlasPerf.pointerUpCount += cancelled ? 0 : 1;
    const startPoint = binding.pointerStart ?? pointerPoint(event);
    const endPoint = pointerPoint(event);
    const moved = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y) > 0.008;
    const mode = binding.pointerMode;
    try {
      canvas.releasePointerCapture?.(binding.pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }
    binding.pointerId = null;
    binding.pointerMode = null;
    scene.referenceAtlasPerf.atlasInteractionActive = false;
    canvas.classList?.remove?.('is-dragging');
    if (cancelled) {
      scene.referenceAtlasTransientView = null;
      scene.referenceAtlasTransientBounds = null;
      resetRectangleDragState();
      schedulePreviewDraw();
      return;
    }
    if (mode === REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.draw) {
      const bounds = scene.referenceAtlasTransientBounds;
      scene.referenceAtlasTransientBounds = null;
      scene.referenceAtlasPerf.boundaryCommitCount += 1;
      resetRectangleDragState();
      if (bounds) scene.selectReferenceBounds(bounds, { appliedFrom: 'rectangleDraw', mode: 'drawCustom', lastPreset: 'custom' });
      return;
    }
    if (isReferenceAtlasRectangleDragMode(mode)) {
      const bounds = scene.referenceAtlasTransientBounds;
      const wasResize = isReferenceAtlasResizeDragMode(mode);
      const wasCornerResize = isReferenceAtlasCornerResizeDragMode(mode);
      const preserved = binding.lastDragUpdate?.lastResizePreservedOppositeEdge !== false;
      scene.referenceAtlasTransientBounds = null;
      if (moved && bounds) {
        scene.referenceAtlasRectangleEditor = {
          ...scene.referenceAtlasRectangleEditor,
          movedCount: scene.referenceAtlasRectangleEditor.movedCount + (mode === REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.move ? 1 : 0),
          resizedEdgeCount: scene.referenceAtlasRectangleEditor.resizedEdgeCount + (wasResize && !wasCornerResize ? 1 : 0),
          resizedCornerCount: scene.referenceAtlasRectangleEditor.resizedCornerCount + (wasCornerResize ? 1 : 0),
          lastResizePreservedOppositeEdge: preserved
        };
        resetRectangleDragState();
        scene.selectReferenceBounds(bounds, {
          appliedFrom: `rectangle:${mode}`,
          mode: scene.operationalWindowEditor.mode,
          lastPreset: scene.operationalWindowEditor.lastPreset
        });
      } else {
        resetRectangleDragState();
        schedulePreviewDraw();
      }
      return;
    }
    if (moved && scene.referenceAtlasTransientView) {
      scene.session = setEnvironmentStudioWorldView(scene.session, scene.referenceAtlasTransientView);
      scene.referenceAtlasTransientView = null;
      scene.referenceAtlasPerf.panCommitCount += 1;
      scene.statusMessage = 'Reference atlas view updated.';
      scene.lastError = null;
      scene.render();
      return;
    }
    scene.referenceAtlasTransientView = null;
    resetRectangleDragState();
    const lonLat = referenceCanvasLonLat(canvas, scene.session, event);
    scene.selectReferenceWindowAt(lonLat.lon, lonLat.lat);
  };
  addListener(canvas, 'pointerup', (event) => finishPointer(event));
  addListener(canvas, 'pointercancel', (event) => finishPointer(event, true));
  addListener(globalThis.document, 'keydown', (event) => {
    if (event.key !== 'Escape' || binding.pointerId == null) return;
    finishPointer({
      ...event,
      pointerId: binding.pointerId,
      clientX: event.clientX ?? 0,
      clientY: event.clientY ?? 0
    }, true);
  });
  addListener(canvas, 'wheel', (event) => {
    event.preventDefault();
    scene.referenceAtlasPerf.wheelCount += 1;
    scene.referenceAtlasPerf.atlasInteractionActive = true;
    scene.referenceAtlasPerf.lastInteractionType = 'wheel';
    const point = pointerPoint(event);
    const factor = event.deltaY < 0 ? 1.18 : 1 / 1.18;
    scene.referenceAtlasTransientView = referenceAtlasZoomView(
      scene.referenceAtlasTransientView ?? scene.session.worldView ?? {},
      factor,
      scene.session.referenceAtlas,
      point,
      { maxZoom: REFERENCE_ATLAS_MAX_ZOOM }
    );
    schedulePreviewDraw();
    if (binding.wheelCommitTimer != null) globalThis.clearTimeout?.(binding.wheelCommitTimer);
    binding.wheelCommitTimer = globalThis.setTimeout?.(() => {
      binding.wheelCommitTimer = null;
      if (!scene.referenceAtlasTransientView) return;
      scene.session = setEnvironmentStudioWorldView(scene.session, scene.referenceAtlasTransientView);
      scene.referenceAtlasTransientView = null;
      scene.referenceAtlasPerf.wheelCommitCount += 1;
      scene.referenceAtlasPerf.zoomCommitCount += 1;
      scene.referenceAtlasPerf.atlasInteractionActive = false;
      scene.statusMessage = 'Reference atlas view updated.';
      scene.lastError = null;
      scene.render();
    }, 140) ?? null;
  }, { passive: false });
  setCanvasCursor('grab');
  drawReferenceBathymetryCanvas(canvas, scene.session, { scene });
}

function drawReferenceBathymetryCanvas(canvas, session = {}, options = {}) {
  if (!canvas?.getContext) return;
  const startedAt = globalThis.performance?.now?.() ?? Date.now();
  const context = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const scene = options.scene ?? null;
  const drawSession = {
    ...session,
    worldView: options.worldView ?? session.worldView
  };
  const layerCanvas = referenceAtlasLayerCanvas(scene, session, width, height);
  context.clearRect(0, 0, width, height);
  if (layerCanvas) {
    const sourceRect = referenceAtlasSourceRectForView(layerCanvas, drawSession);
    context.drawImage(
      layerCanvas,
      sourceRect.x,
      sourceRect.y,
      sourceRect.width,
      sourceRect.height,
      0,
      0,
      width,
      height
    );
  }
  drawReferenceGridOverlay(context, drawSession, width, height);
  drawReferenceFixtureCoverageOverlay(context, drawSession, width, height);
  drawReferenceSelectionOverlay(context, drawSession, width, height, {
    bounds: options.selectedBounds,
    rectangleEditor: scene?.referenceAtlasRectangleEditor
  });
  recordReferenceAtlasCanvasFrame(scene, startedAt);
}

function drawReferenceGridOverlay(context, session = {}, width = 1, height = 1) {
  context.save();
  context.strokeStyle = 'rgba(240, 244, 250, 0.2)';
  context.lineWidth = 1;
  for (let lon = -180; lon <= 180; lon += 30) {
    const top = referenceLonLatToCanvas(session, lon, 90, width, height);
    const bottom = referenceLonLatToCanvas(session, lon, -90, width, height);
    context.beginPath();
    context.moveTo(top.x, top.y);
    context.lineTo(bottom.x, bottom.y);
    context.stroke();
  }
  for (let lat = -90; lat <= 90; lat += 30) {
    const left = referenceLonLatToCanvas(session, -180, lat, width, height);
    const right = referenceLonLatToCanvas(session, 180, lat, width, height);
    context.beginPath();
    context.moveTo(left.x, left.y);
    context.lineTo(right.x, right.y);
    context.stroke();
  }
  context.restore();
}

function drawReferenceFixtureCoverageOverlay(context, session = {}, width = 1, height = 1) {
  const overlays = referenceAtlasPatchOverlays(session.referenceAtlas, session.worldView, { width, height });
  if (!Array.isArray(overlays) || overlays.length === 0) return;
  context.save();
  for (const overlay of overlays) {
    if (!overlay.visible) continue;
    const x = overlay.screenBounds.x;
    const y = overlay.screenBounds.y;
    const rectWidth = overlay.screenBounds.width;
    const rectHeight = overlay.screenBounds.height;
    if (rectWidth <= 0 || rectHeight <= 0) continue;
    const missionReady = overlay.role === 'missionReadyPatch';
    context.strokeStyle = missionReady ? '#f4b446' : '#5bacd3';
    context.fillStyle = missionReady ? 'rgba(244, 180, 70, 0.28)' : 'rgba(91, 172, 211, 0.2)';
    context.lineWidth = missionReady ? 3 : 2;
    context.setLineDash(missionReady ? [] : [8, 6]);
    context.fillRect(x, y, rectWidth, rectHeight);
    context.strokeRect(x, y, rectWidth, rectHeight);
    context.setLineDash([]);
    context.fillStyle = 'rgba(6, 14, 24, 0.72)';
    context.font = '12px sans-serif';
    context.fillText(String(overlay.fixtureId ?? overlay.role ?? 'patch'), x + 6, Math.max(14, y + 16));
  }
  context.restore();
}

function drawReferenceSelectionOverlay(context, session = {}, width = 1, height = 1, options = {}) {
  const bounds = options.bounds ?? session.selectedReferenceWindow?.bounds;
  if (!bounds) return;
  const budget = session.selectedReferenceBoundaryBudget ?? session.selectedReferenceAvailability?.boundaryBudget ?? null;
  const operationalWindow = session.selectedReferenceOperationalWindow ?? budget?.operationalWindow ?? null;
  const nw = referenceLonLatToCanvas(session, bounds.westLon, bounds.northLat, width, height);
  const se = referenceLonLatToCanvas(session, bounds.eastLon, bounds.southLat, width, height);
  const x = Math.min(nw.x, se.x);
  const y = Math.min(nw.y, se.y);
  const rectWidth = Math.abs(se.x - nw.x);
  const rectHeight = Math.abs(se.y - nw.y);
  context.save();
  context.strokeStyle = '#f8e26c';
  context.lineWidth = 4;
  context.setLineDash([12, 8]);
  context.strokeRect(x, y, rectWidth, rectHeight);
  context.fillStyle = 'rgba(248, 226, 108, 0.12)';
  context.fillRect(x, y, rectWidth, rectHeight);
  context.setLineDash([]);
  const rectangleEditor = options.rectangleEditor ?? {};
  const activeHandle = rectangleEditor.activeHandle ?? null;
  const hoverHandle = rectangleEditor.hoverHandle ?? null;
  const handleSize = 12;
  const handlePoints = [
    { handle: 'northWest', x, y },
    { handle: 'northEast', x: x + rectWidth, y },
    { handle: 'southWest', x, y: y + rectHeight },
    { handle: 'southEast', x: x + rectWidth, y: y + rectHeight },
    { handle: 'north', x: x + rectWidth / 2, y },
    { handle: 'south', x: x + rectWidth / 2, y: y + rectHeight },
    { handle: 'west', x, y: y + rectHeight / 2 },
    { handle: 'east', x: x + rectWidth, y: y + rectHeight / 2 }
  ];
  for (const point of handlePoints) {
    const highlighted = point.handle === activeHandle || point.handle === hoverHandle;
    const size = highlighted ? handleSize + 5 : handleSize;
    context.fillStyle = highlighted ? '#ffffff' : '#fff5a8';
    context.strokeStyle = highlighted ? '#111827' : '#2a2100';
    context.lineWidth = highlighted ? 3 : 2;
    context.fillRect(point.x - size / 2, point.y - size / 2, size, size);
    context.strokeRect(point.x - size / 2, point.y - size / 2, size, size);
  }
  const centerX = x + rectWidth / 2;
  const centerY = y + rectHeight / 2;
  const centerHighlighted = activeHandle === 'center' || hoverHandle === 'center';
  context.fillStyle = centerHighlighted ? '#ffffff' : '#fff5a8';
  context.strokeStyle = centerHighlighted ? '#111827' : '#2a2100';
  context.lineWidth = centerHighlighted ? 3 : 2;
  context.beginPath();
  context.arc(centerX, centerY, handleSize * 0.58, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  const label = `${operationalWindow?.scaleClass ?? 'selected'} / ${budget?.budgetStatus ?? 'budget pending'}`;
  const labelX = clampNumber(x + 8, 6, Math.max(6, width - 230));
  const labelY = clampNumber(y - 22, 18, Math.max(18, height - 12));
  context.font = '12px sans-serif';
  const labelWidth = Math.min(224, context.measureText(label).width + 18);
  context.fillStyle = 'rgba(6, 14, 24, 0.82)';
  context.fillRect(labelX - 6, labelY - 14, labelWidth, 20);
  context.strokeStyle = 'rgba(248, 226, 108, 0.76)';
  context.strokeRect(labelX - 6, labelY - 14, labelWidth, 20);
  context.fillStyle = '#fff5a8';
  context.fillText(label, labelX, labelY);
  context.restore();
}

function referenceCanvasLonLat(canvas, session = {}, event = {}, options = {}) {
  const point = referenceCanvasPoint(canvas, event);
  return referenceViewportLonLat(
    { ...session, worldView: options.worldView ?? session.worldView },
    point.x,
    point.y
  );
}

function referenceCanvasPoint(canvas, event = {}) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clampNumber((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1),
    y: clampNumber((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1)
  };
}

function referenceCanvasCssPoint(canvas, event = {}) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clampNumber(Number(event.clientX) - Number(rect.left), 0, Math.max(1, Number(rect.width))),
    y: clampNumber(Number(event.clientY) - Number(rect.top), 0, Math.max(1, Number(rect.height)))
  };
}

function referenceCanvasCssSize(canvas) {
  const rect = canvas?.getBoundingClientRect?.();
  return {
    width: Number(rect?.width ?? canvas?.width ?? 900),
    height: Number(rect?.height ?? canvas?.height ?? 450)
  };
}

function isReferenceAtlasRectangleEditorMode(mode) {
  return mode === REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.draw
    || isReferenceAtlasRectangleDragMode(mode);
}

function isReferenceAtlasRectangleDragMode(mode) {
  return mode === REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.move
    || isReferenceAtlasResizeDragMode(mode);
}

function isReferenceAtlasResizeDragMode(mode) {
  return mode === REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.resizeNorth
    || mode === REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.resizeSouth
    || mode === REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.resizeEast
    || mode === REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.resizeWest
    || isReferenceAtlasCornerResizeDragMode(mode);
}

function isReferenceAtlasCornerResizeDragMode(mode) {
  return mode === REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.resizeNorthEast
    || mode === REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.resizeNorthWest
    || mode === REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.resizeSouthEast
    || mode === REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.resizeSouthWest;
}

function referenceViewportLonLat(session = {}, nx = 0.5, ny = 0.5) {
  const viewport = referenceAtlasViewport(session.worldView, session.referenceAtlas);
  return referenceAtlasNormalizedToLonLat(clampNumber(nx, 0, 1), clampNumber(ny, 0, 1), {
    westLon: viewport.lonWest,
    eastLon: viewport.lonEast,
    southLat: viewport.latSouth,
    northLat: viewport.latNorth
  });
}

function referenceLonLatToCanvas(session = {}, lon = 0, lat = 0, width = 1, height = 1) {
  const viewport = referenceAtlasViewport(session.worldView, session.referenceAtlas);
  return {
    x: ((Number(lon) - viewport.lonWest) / Math.max(0.000001, viewport.lonEast - viewport.lonWest)) * width,
    y: ((viewport.latNorth - Number(lat)) / Math.max(0.000001, viewport.latNorth - viewport.latSouth)) * height
  };
}

function referenceBoundaryDragOptions(scene) {
  return {
    minLonSpanDegrees: 0.05,
    minLatSpanDegrees: 0.05,
    minimumPresetId: 'localPatch'
  };
}

function referenceAtlasLayerCanvas(scene, session = {}, width = 900, height = 450) {
  const atlas = session.referenceAtlas ?? {};
  const layer = session.referenceLayer ?? 'topographyBathymetry';
  const digest = atlas.overviewDigest ?? atlas.atlasDigest ?? atlas.overviewRasterArtifact?.rasterDigest ?? 'reference-atlas';
  const key = `${digest}:${layer}:${width}x${height}`;
  if (scene?.referenceAtlasCanvasCache?.has?.(key)) {
    scene.referenceAtlasPerf.cacheHitCount += 1;
    scene.referenceAtlasPerf.lastCacheKey = key;
    return scene.referenceAtlasCanvasCache.get(key);
  }
  const canvas = buildReferenceAtlasLayerCanvas(session, width, height);
  if (!canvas) return null;
  if (scene?.referenceAtlasCanvasCache?.set) {
    scene.referenceAtlasCanvasCache.set(key, canvas);
    scene.referenceAtlasPerf.cacheMissCount += 1;
    scene.referenceAtlasPerf.fullRasterRenderCount += 1;
    scene.referenceAtlasPerf.lastCacheKey = key;
  }
  return canvas;
}

function buildReferenceAtlasLayerCanvas(session = {}, width = 900, height = 450) {
  const canvas = globalThis.document?.createElement?.('canvas');
  if (!canvas?.getContext) return null;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  const image = context.createImageData(width, height);
  const layer = session.referenceLayer ?? 'topographyBathymetry';
  const artifact = session.referenceAtlas?.overviewRasterArtifact ?? session.referenceAtlas?.overviewArtifact ?? null;
  for (let y = 0; y < height; y += 1) {
    const ny = y / Math.max(1, height - 1);
    for (let x = 0; x < width; x += 1) {
      const nx = x / Math.max(1, width - 1);
      const elevation = sampleReferenceOverviewRasterNormalized(artifact, nx, ny);
      const color = referenceAtlasCacheLayerColor(layer, elevation, artifact, nx, ny);
      const index = (y * width + x) * 4;
      image.data[index] = color[0];
      image.data[index + 1] = color[1];
      image.data[index + 2] = color[2];
      image.data[index + 3] = color[3];
    }
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

function referenceAtlasSourceRectForView(layerCanvas, session = {}) {
  const viewport = referenceAtlasViewport(session.worldView, session.referenceAtlas);
  const bounds = viewport.bounds;
  const worldLonSpan = Math.max(0.000001, bounds.eastLon - bounds.westLon);
  const worldLatSpan = Math.max(0.000001, bounds.northLat - bounds.southLat);
  const x = clampNumber(((viewport.lonWest - bounds.westLon) / worldLonSpan) * layerCanvas.width, 0, layerCanvas.width - 1);
  const y = clampNumber(((bounds.northLat - viewport.latNorth) / worldLatSpan) * layerCanvas.height, 0, layerCanvas.height - 1);
  const rectWidth = clampNumber((viewport.lonSpan / worldLonSpan) * layerCanvas.width, 1, layerCanvas.width - x);
  const rectHeight = clampNumber((viewport.latSpan / worldLatSpan) * layerCanvas.height, 1, layerCanvas.height - y);
  return { x, y, width: rectWidth, height: rectHeight };
}

function sampleReferenceOverviewRasterNormalized(artifact = null, nx = 0.5, ny = 0.5) {
  const raster = artifact?.grid?.elevationMeters;
  const rows = raster?.length ?? 0;
  const columns = raster?.[0]?.length ?? 0;
  if (!rows || !columns) return null;
  const lonAxis = artifact.grid?.lonAxis;
  const latAxis = artifact.grid?.latAxis;
  const lonDescending = Array.isArray(lonAxis) && lonAxis.length >= 2 && Number(lonAxis[0]) > Number(lonAxis[lonAxis.length - 1]);
  const latDescending = !Array.isArray(latAxis) || latAxis.length < 2 || Number(latAxis[0]) > Number(latAxis[latAxis.length - 1]);
  const x = (lonDescending ? 1 - nx : nx) * (columns - 1);
  const y = (latDescending ? ny : 1 - ny) * (rows - 1);
  return bilinearArraySample(raster, x, y);
}

function referenceAtlasCacheLayerColor(layer = 'topographyBathymetry', elevation = null, artifact = null, nx = 0.5, ny = 0.5) {
  const z = Number.isFinite(Number(elevation)) ? Number(elevation) : -3200;
  if (layer === 'landOcean') return z >= 0 ? [127, 117, 72, 255] : [30, 116, 160, 255];
  if (layer === 'patchCoverage') return z >= 0 ? [82, 100, 74, 255] : [22, 67, 104, 255];
  if (layer === 'sourceQuality') return [80, 128, 150, 255];
  if (layer === 'slope') {
    const slope = Math.abs(Number(sampleReferenceOverviewRasterNormalized(artifact, nx + 1 / 900, ny) ?? z) - Number(sampleReferenceOverviewRasterNormalized(artifact, nx - 1 / 900, ny) ?? z))
      + Math.abs(Number(sampleReferenceOverviewRasterNormalized(artifact, nx, ny + 1 / 450) ?? z) - Number(sampleReferenceOverviewRasterNormalized(artifact, nx, ny - 1 / 450) ?? z));
    return rgbaLocal(mixRgbLocal([24, 61, 98], [228, 176, 82], clampNumber(slope / 1800, 0, 1)));
  }
  if (z >= 0) {
    return rgbaLocal(mixRgbLocal([83, 112, 64], [185, 162, 105], clampNumber(z / 1400, 0, 1)));
  }
  const depth = Math.abs(z);
  if (depth < 120) return rgbaLocal(mixRgbLocal([75, 189, 184], [36, 136, 174], depth / 120));
  if (depth < 1500) return rgbaLocal(mixRgbLocal([36, 136, 174], [24, 75, 138], (depth - 120) / 1380));
  return rgbaLocal(mixRgbLocal([24, 75, 138], [6, 26, 74], clampNumber((depth - 1500) / 3500, 0, 1)));
}

function bilinearArraySample(raster = [], x = 0, y = 0) {
  const rows = raster.length;
  const columns = raster[0]?.length ?? 0;
  if (!rows || !columns) return null;
  const clampedX = clampNumber(x, 0, columns - 1);
  const clampedY = clampNumber(y, 0, rows - 1);
  const x0 = Math.floor(clampedX);
  const y0 = Math.floor(clampedY);
  const x1 = Math.min(columns - 1, x0 + 1);
  const y1 = Math.min(rows - 1, y0 + 1);
  const tx = clampedX - x0;
  const ty = clampedY - y0;
  const a = Number(raster[y0]?.[x0]);
  const b = Number(raster[y0]?.[x1]);
  const c = Number(raster[y1]?.[x0]);
  const d = Number(raster[y1]?.[x1]);
  if (![a, b, c, d].every(Number.isFinite)) return null;
  return a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + c * (1 - tx) * ty + d * tx * ty;
}

function mixRgbLocal(a = [0, 0, 0], b = [255, 255, 255], t = 0) {
  const clamped = clampNumber(t, 0, 1);
  return [
    Math.round(Number(a[0]) + (Number(b[0]) - Number(a[0])) * clamped),
    Math.round(Number(a[1]) + (Number(b[1]) - Number(a[1])) * clamped),
    Math.round(Number(a[2]) + (Number(b[2]) - Number(a[2])) * clamped)
  ];
}

function rgbaLocal(color = [0, 0, 0], alpha = 255) {
  return [color[0], color[1], color[2], alpha];
}

function recordReferenceAtlasCanvasFrame(scene, startedAt) {
  if (!scene?.referenceAtlasPerf) return;
  const endedAt = globalThis.performance?.now?.() ?? Date.now();
  const ms = Math.max(0, endedAt - startedAt);
  scene.referenceAtlasPerf.rasterRenderCount += 1;
  scene.referenceAtlasPerf.lastFrameMs = roundMetric(ms);
  scene.referenceAtlasPerf.maxFrameMs = Math.max(scene.referenceAtlasPerf.maxFrameMs, roundMetric(ms));
  if (ms > scene.referenceAtlasPerf.longTaskThresholdMs) scene.referenceAtlasPerf.longTaskCount += 1;
}

function worldMapConsoleHtml(scene, summary = {}) {
  const session = scene.session;
  const selected = session.selectedOperationalWindow;
  const bounds = selected?.bounds ?? { widthNormalized: 0.18, heightNormalized: 0.16 };
  const parameters = session.worldMap?.generatorParameters ?? {};
  return `
    <section class="console-header">
      <div class="console-kicker">Simulation Lab / Environment Studio</div>
      <h1>Synthetic Globe</h1>
      <p>Generate deterministic synthetic equirectangular world fields, select a small globe region, then generate regional 3D bathymetry.</p>
    </section>
    <section class="console-status">
      <span>Stage</span>
      <strong>Synthetic Globe</strong>
      <small>${escapeHtml(scene.statusMessage)}</small>
    </section>
    ${scene.lastError ? `<section class="console-section" data-keep-title="true"><h2>Warning</h2><div class="hud-muted">${escapeHtml(scene.lastError)}</div></section>` : ''}
    <section class="console-section environment-studio-basic-panel" data-keep-title="true" data-env-studio-stage="worldMap">
      <h2>Synthetic Globe</h2>
      <label class="compact-field">
        World Style
        <select id="env-studio-world-style" data-env-studio-world-style>
          ${SYNTHETIC_WORLD_STYLES.map((style) => `<option value="${escapeAttr(style.id)}" ${style.id === session.worldStyle ? 'selected' : ''}>${escapeHtml(style.label)}</option>`).join('')}
        </select>
      </label>
      <label class="compact-field">
        World Seed
        <input id="env-studio-world-seed" data-env-studio-world-seed type="text" value="${escapeAttr(session.worldSeed)}" />
      </label>
      <button class="console-button primary" type="button" data-action="env-studio-generate-world">Generate New Globe</button>
      <button class="console-button secondary" type="button" data-action="env-studio-randomize-world-seed">Randomize Seed</button>
    </section>
    <section class="console-section environment-studio-basic-panel" data-keep-title="true">
      <h2>Advanced</h2>
      <details data-env-studio-advanced-world-controls>
        <summary>Advanced Globe Controls</summary>
        ${rangeInput('Water Level', 'env-world-water-level', parameters.waterLevel ?? 0.5, 0.05, 0.95, 0.01)}
        ${rangeInput('Landmass Scale', 'env-world-landmass-scale', parameters.landmassScale ?? 0.55, 0.05, 1, 0.01)}
        ${rangeInput('Island Density', 'env-world-island-density', parameters.islandDensity ?? 0.5, 0, 1, 0.01)}
        ${rangeInput('Coastline Complexity', 'env-world-coastline-complexity', parameters.coastlineComplexity ?? 0.45, 0, 1, 0.01)}
        ${rangeInput('Basin Scale', 'env-world-basin-scale', parameters.basinScale ?? 0.55, 0, 1, 0.01)}
        ${rangeInput('Shelf Width', 'env-world-shelf-width', parameters.shelfWidth ?? 0.5, 0, 1, 0.01)}
        ${rangeInput('Flow Intensity', 'env-world-flow-intensity', parameters.flowIntensity ?? 0.55, 0, 1, 0.01)}
        ${rangeInput('Roughness', 'env-world-roughness', parameters.roughness ?? 0.35, 0, 1, 0.01)}
      </details>
    </section>
    <section class="console-section environment-studio-basic-panel" data-keep-title="true">
      <h2>Globe Layer</h2>
      <div class="environment-studio-camera-row" aria-label="Globe layer controls">
        ${SYNTHETIC_WORLD_LAYER_OPTIONS.map((layer) => `<button type="button" class="${layer.id === session.worldLayer ? 'active' : ''}" data-env-studio-world-layer="${escapeAttr(layer.id)}">${escapeHtml(layer.label)}</button>`).join('')}
      </div>
    </section>
    <section class="console-section environment-studio-basic-panel" data-keep-title="true">
      <h2>Region Selection</h2>
      <div class="environment-studio-camera-row" aria-label="Region controls">
        <button type="button" class="${scene.globeRegionSelectionMode ? 'active' : ''}" data-action="env-studio-draw-boundary">Select Region</button>
        <button type="button" data-action="env-studio-select-boundary">Use Current Region</button>
        <button type="button" data-action="env-studio-clear-boundary">Clear Region</button>
      </div>
      <details data-env-studio-boundary-details>
        <summary>Region Details</summary>
        ${numberInput('Region Width', 'env-studio-window-width', bounds.widthNormalized ?? bounds.width ?? 0.18, 0.05, 0.22, 0.01)}
        ${numberInput('Region Height', 'env-studio-window-height', bounds.heightNormalized ?? bounds.height ?? 0.16, 0.05, 0.2, 0.01)}
        ${numberInput('Source Resolution', 'env-studio-source-resolution', selected?.recommendedDomain?.sourceResolutionMeters ?? 1500, 500, 6000, 100)}
        ${numberInput('Preview Resolution', 'env-studio-preview-resolution', selected?.recommendedDomain?.previewResolutionMeters ?? 6000, 1000, 12000, 500)}
        <div class="environment-studio-camera-row" aria-label="Move or resize selected region">
          <button type="button" data-env-studio-world-window-action="left">Left</button>
          <button type="button" data-env-studio-world-window-action="right">Right</button>
          <button type="button" data-env-studio-world-window-action="up">Up</button>
          <button type="button" data-env-studio-world-window-action="down">Down</button>
          <button type="button" data-env-studio-world-window-action="narrower">Narrower</button>
          <button type="button" data-env-studio-world-window-action="wider">Wider</button>
          <button type="button" data-env-studio-world-window-action="shorter">Shorter</button>
          <button type="button" data-env-studio-world-window-action="taller">Taller</button>
        </div>
      </details>
      <div class="cell-inspector-metrics">
        ${metricHtml('World Digest', shortDigest(session.worldMap?.worldDigest))}
        ${metricHtml('Region Digest', shortDigest(selected?.windowDigest))}
        ${metricHtml('Source grid', selected?.recommendedDomain ? `${selected.recommendedDomain.columns} x ${selected.recommendedDomain.rows}` : 'select region')}
        ${metricHtml('Layer', labelize(session.worldLayer))}
      </div>
    </section>
    <section class="console-section environment-studio-basic-panel" data-keep-title="true">
      <h2>Actions</h2>
      <button class="console-button primary" type="button" data-action="env-studio-generate-world-bathymetry">Generate 3D Bathymetry</button>
      <button class="console-button secondary" type="button" data-action="env-studio-export-world-map">Export Globe</button>
      <label class="console-button secondary" for="env-studio-import-world-map-file">Import Globe</label>
      <input id="env-studio-import-world-map-file" type="file" accept="application/json,.json" hidden data-env-studio-import-world-map />
      <button class="console-button secondary" type="button" data-action="env-studio-export-project">Export Project</button>
      <label class="console-button secondary" for="env-studio-import-file">Import Project</label>
      <input id="env-studio-import-file" type="file" accept="application/json,.json" hidden data-env-studio-import />
      <button class="console-button secondary" type="button" data-action="menu">Main Menu</button>
    </section>
  `;
}

function regionalBathymetryConsoleHtml(scene, summary = {}) {
  const session = scene.session;
  const camera = session.previewCameraState ?? {};
  const boundaryBudget = session.selectedReferenceBoundaryBudget ?? session.selectedReferenceAvailability?.boundaryBudget ?? null;
  const budgetBlocked = boundaryBudget?.budgetStatus === 'BLOCKED';
  const canCompose = !budgetBlocked && Boolean(session.fieldRegenerationResult?.currentArtifactDigest && session.fieldRegenerationResult?.scalarArtifactDigest);
  const canLaunch = !budgetBlocked && session.launchValidationResult?.planningLaunchReady === true;
  const isReferencePatch = session.sourceMode === 'referenceBathymetryAtlas';
  const loaded = session.loadedReferenceFixture ?? {};
  const bathymetryGenerated = Boolean(summary.bathymetryArtifactDigest);
  return `
    <section class="console-header">
      <div class="console-kicker">Simulation Lab / Environment Studio</div>
      <h1>${isReferencePatch ? 'Regional Bathymetry Patch' : 'Regional Bathymetry'}</h1>
      <p>${isReferencePatch ? 'Loaded reference patch workspace for Reference bathymetry + deterministic synthetic bathymetry-conditioned fields.' : 'Inspect the generated 2.5D bottom surface and exported metadata from the selected synthetic world-map window.'}</p>
    </section>
    <section class="console-status">
      <span>Stage</span>
      <strong>${bathymetryGenerated ? 'Generated Reference Environment' : 'Regional Patch Workspace'}</strong>
      <small>${escapeHtml(scene.statusMessage)}</small>
    </section>
    ${scene.lastError ? `<section class="console-section" data-keep-title="true"><h2>Warning</h2><div class="hud-muted">${escapeHtml(scene.lastError)}</div></section>` : ''}
    <section class="console-section environment-studio-basic-panel" data-keep-title="true">
      <h2>Regional Bathymetry</h2>
      <label class="compact-field">
        Preview Mode
        <select id="env-studio-preview-mode" data-env-studio-preview-mode-panel>
          ${ENVIRONMENT_STUDIO_PREVIEW_MODES.filter((mode) => mode.id !== 'multiGliderSuitability').map((mode) => `<option value="${escapeAttr(mode.id)}" ${mode.id === session.previewMode ? 'selected' : ''}>${escapeHtml(mode.label)}</option>`).join('')}
        </select>
      </label>
      <label class="compact-field">
        Vertical exaggeration
        <input id="env-studio-vertical-exaggeration-panel" type="number" min="0.5" max="4" step="0.1" value="${escapeAttr(camera.verticalExaggeration ?? 1.6)}" />
      </label>
      <div class="cell-inspector-metrics">
        ${isReferencePatch ? metricHtml('Fixture ID', session.loadedReferenceFixtureId ?? 'not loaded') : ''}
        ${isReferencePatch ? metricHtml('Fixture Role', session.loadedReferenceFixtureRole ?? 'n/a') : ''}
        ${isReferencePatch ? metricHtml('Source resolution', loaded.sourceResolution ?? session.referenceAtlas?.sourceDataset?.sourceResolution) : ''}
        ${isReferencePatch ? metricHtml('Fixture Digest', shortDigest(loaded.digest)) : ''}
        ${isReferencePatch ? metricHtml('Budget Status', boundaryBudget?.budgetStatus ?? 'n/a') : ''}
        ${metricHtml('Source grid', `${summary.sourceGridShape.columns} x ${summary.sourceGridShape.rows}`)}
        ${metricHtml('Preview grid', `${summary.previewGridShape.columns} x ${summary.previewGridShape.rows}`)}
        ${metricHtml(isReferencePatch ? 'Patch Digest' : 'Window Digest', shortDigest(session.selectedReferenceWindow?.patchDigest ?? session.selectedOperationalWindow?.windowDigest))}
        ${metricHtml('Bathymetry Artifact', shortDigest(summary.bathymetryArtifactDigest))}
      </div>
      ${budgetBlocked ? `<p class="hud-muted">${escapeHtml(REFERENCE_ATLAS_BUDGET_BLOCKED_MESSAGE)}</p>` : ''}
      <button class="console-button primary" type="button" data-action="${isReferencePatch ? 'env-reference-generate-bathymetry' : 'env-studio-regenerate-world-bathymetry'}" ${budgetBlocked ? 'disabled' : ''}>${bathymetryGenerated ? 'Regenerate Bathymetry' : 'Generate 3D Bathymetry'}</button>
    </section>
    <section class="console-section environment-studio-basic-panel" data-keep-title="true">
      <h2>Artifacts</h2>
      ${fieldRegenerationSummaryHtml(session.fieldRegenerationResult)}
      ${referenceEnvironmentLaunchSummaryHtml(session)}
      <button class="console-button primary" type="button" data-action="env-studio-generate-fields" ${budgetBlocked ? 'disabled' : ''}>Generate Currents &amp; Science Fields</button>
      <button class="console-button secondary" type="button" data-action="env-studio-compose-environment" ${canCompose ? '' : 'disabled'}>Compose Environment Artifact</button>
      <button class="console-button secondary" type="button" data-action="env-studio-validate-launch" ${canCompose ? '' : 'disabled'}>Validate Launch</button>
      <button class="console-button primary" type="button" data-action="env-studio-launch-planning" ${canLaunch ? '' : 'disabled'}>Launch to Planning</button>
      <button class="console-button secondary" type="button" data-action="env-studio-export-benchmark" ${canCompose ? '' : 'disabled'}>Export Public Benchmark Bundle</button>
      <button class="console-button secondary" type="button" data-action="env-studio-export-bathymetry">Export Bathymetry</button>
      <button class="console-button secondary" type="button" data-action="env-studio-export-project">Export Project</button>
      <label class="console-button secondary" for="env-studio-import-file">Import Project</label>
      <input id="env-studio-import-file" type="file" accept="application/json,.json" hidden data-env-studio-import />
      <button class="console-button secondary" type="button" data-action="menu">Main Menu</button>
    </section>
    <section class="console-section environment-studio-secondary-panel" data-keep-title="true">
      <h2>Dependency State</h2>
      ${dependencyGraphTable(session.dependencyGraph)}
    </section>
  `;
}

function bindEnvironmentStudioWorldMapControls(scene, root) {
  root?.querySelector?.('[data-env-studio-world-style]')?.addEventListener('change', (event) => scene.setWorldStyle(event.target.value));
  root?.querySelector?.('[data-action="env-studio-generate-world"]')?.addEventListener('click', () => scene.generateWorld());
  root?.querySelector?.('[data-action="env-studio-randomize-world-seed"]')?.addEventListener('click', () => scene.randomizeWorldSeed());
  root?.querySelectorAll?.('[data-env-world-generator-control]')?.forEach((input) => {
    input.addEventListener('change', () => scene.setWorldGeneratorParameters());
    input.addEventListener('input', () => {
      const output = root.querySelector(`[data-env-world-control-value="${input.id}"]`);
      if (output) output.textContent = formatNumber(input.value);
    });
  });
  root?.querySelectorAll?.('[data-env-studio-world-layer]')?.forEach((button) => {
    button.addEventListener('click', () => scene.setWorldLayer(button.getAttribute('data-env-studio-world-layer')));
  });
  root?.querySelector?.('[data-action="env-studio-draw-boundary"]')?.addEventListener('click', () => scene.toggleBoundaryDrawing());
  root?.querySelector?.('[data-action="env-studio-select-boundary"]')?.addEventListener('click', () => scene.selectWorldWindowFromControls());
  root?.querySelector?.('[data-action="env-studio-clear-boundary"]')?.addEventListener('click', () => scene.clearWorldWindow());
  root?.querySelectorAll?.('[data-env-studio-world-window-action]')?.forEach((button) => {
    button.addEventListener('click', () => scene.adjustWorldWindow(button.getAttribute('data-env-studio-world-window-action')));
  });
  root?.querySelector?.('[data-action="env-studio-generate-world-bathymetry"]')?.addEventListener('click', () => scene.generateWorldBathymetry());
  root?.querySelector?.('[data-action="env-studio-export-world-map"]')?.addEventListener('click', () => scene.exportWorldMap());
  root?.querySelector?.('[data-action="env-studio-export-project"]')?.addEventListener('click', () => scene.exportProject());
  root?.querySelector?.('[data-env-studio-import]')?.addEventListener('change', (event) => scene.importProject(event.target.files?.[0]));
  root?.querySelector?.('[data-env-studio-import-world-map]')?.addEventListener('change', (event) => scene.importWorldMap(event.target.files?.[0]));
  root?.querySelector?.('[data-action="menu"]')?.addEventListener('click', () => scene.scene.start('MainMenuScene'));
}

function bindEnvironmentStudioRegionalControls(scene, root) {
  root?.querySelector?.('[data-env-studio-preview-mode-panel]')?.addEventListener('change', (event) => {
    scene.session = setEnvironmentStudioPreviewMode(scene.session, event.target.value);
    scene.statusMessage = `Preview mode changed to ${event.target.selectedOptions?.[0]?.textContent ?? event.target.value}.`;
    scene.render();
  });
  root?.querySelector?.('#env-studio-vertical-exaggeration-panel')?.addEventListener('change', (event) => {
    scene.updatePreviewCamera({ verticalExaggeration: Number(event.target.value) });
  });
  root?.querySelector?.('[data-action="env-reference-generate-bathymetry"]')?.addEventListener('click', () => scene.generateReferenceBathymetry());
  root?.querySelector?.('[data-action="env-studio-regenerate-world-bathymetry"]')?.addEventListener('click', () => scene.generateWorldBathymetry());
  root?.querySelector?.('[data-action="env-studio-generate-fields"]')?.addEventListener('click', () => scene.generateFields());
  root?.querySelector?.('[data-action="env-studio-compose-environment"]')?.addEventListener('click', () => scene.composeReferenceEnvironmentArtifact());
  root?.querySelector?.('[data-action="env-studio-validate-launch"]')?.addEventListener('click', () => scene.validateReferenceLaunch());
  root?.querySelector?.('[data-action="env-studio-launch-planning"]')?.addEventListener('click', () => scene.launchReferenceEnvironmentToPlanning());
  root?.querySelector?.('[data-action="env-studio-export-benchmark"]')?.addEventListener('click', () => scene.exportReferenceBenchmarkBundle());
  root?.querySelector?.('[data-action="env-studio-export-project"]')?.addEventListener('click', () => scene.exportProject());
  root?.querySelector?.('[data-action="env-studio-export-bathymetry"]')?.addEventListener('click', () => scene.exportBathymetryArtifact());
  root?.querySelector?.('[data-env-studio-import]')?.addEventListener('change', (event) => scene.importProject(event.target.files?.[0]));
  root?.querySelector?.('[data-action="menu"]')?.addEventListener('click', () => scene.scene.start('MainMenuScene'));
}

function worldMapRightPanelHtml(session = {}) {
  const world = session.worldMap ?? {};
  const selected = session.selectedOperationalWindow;
  if (!selected) {
    return `
      <section class="waypoint-shell environment-studio-right-panel" id="env-studio-status-panel">
        <div class="console-kicker">Globe Summary</div>
        <h2>${escapeHtml(world.styleLabel ?? labelize(session.worldStyle))}</h2>
        <p class="hud-muted">Deterministic synthetic equirectangular world fields rendered on a globe. Not Earth, not calibrated survey data, and not an operational forecast. Select a region on the globe to generate regional bathymetry.</p>
        <div class="cell-inspector-metrics">
          ${metricHtml('Style', world.styleLabel ?? labelize(session.worldStyle))}
          ${metricHtml('Seed', session.worldSeed)}
          ${metricHtml('World Digest', shortDigest(world.worldDigest))}
          ${metricHtml('Source fields', `${world.canonicalWorldResolution?.width ?? world.resolution?.columns ?? 0} x ${world.canonicalWorldResolution?.height ?? world.resolution?.rows ?? 0}`)}
          ${metricHtml('Display texture', `${world.displayTextureResolution?.width ?? 0} x ${world.displayTextureResolution?.height ?? 0}`)}
          ${metricHtml('Land fraction', formatNumber(world.layerSummaries?.landOceanMask?.mean))}
          ${metricHtml('Ocean fraction', formatNumber(1 - Number(world.layerSummaries?.landOceanMask?.mean ?? 0)))}
          ${metricHtml('Shelf fraction', formatNumber(world.layerSummaries?.shelfZone?.mean))}
          ${metricHtml('Basin fraction', formatNumber(world.layerSummaries?.deepBasinPotential?.mean))}
          ${metricHtml('Island count', (world.features ?? []).filter((feature) => /island|seamount/i.test(feature.type ?? feature.featureId ?? '')).length)}
          ${metricHtml('Flow summary', `mean ${formatNumber(world.layerSummaries?.coarseFlowRegime?.mean)}`)}
          ${metricHtml('Scalar summary', `mean ${formatNumber(world.layerSummaries?.scalarRegime?.mean)}`)}
        </div>
      </section>
    `;
  }
  const stats = selected.sampledFieldStats?.layerMeans ?? {};
  const bounds = selected.bounds ?? {};
  return `
    <section class="waypoint-shell environment-studio-right-panel" id="env-studio-status-panel">
      <div class="console-kicker">Selected Globe Region</div>
      <h2>${escapeHtml(selected.detectedContext?.primaryLabel ?? selected.detectedContext?.primaryContextLabel ?? 'Selected Region')}</h2>
      <p class="hud-muted">Region context comes from sampled synthetic globe fields. Suggested use tags are not mission settings.</p>
      <div class="cell-inspector-metrics">
        ${metricHtml('Normalized center', `${formatNumber(bounds.centerLonNormalized)}, ${formatNumber(bounds.centerLatNormalized)}`)}
        ${metricHtml('Normalized size', `${formatNumber(bounds.widthNormalized)} x ${formatNumber(bounds.heightNormalized)}`)}
        ${metricHtml('Area fraction', formatNumber(Number(bounds.widthNormalized ?? 0) * Number(bounds.heightNormalized ?? 0)))}
        ${metricHtml('Domain', `${formatNumber((selected.recommendedDomain?.widthMeters ?? 0) / 1000)} x ${formatNumber((selected.recommendedDomain?.heightMeters ?? 0) / 1000)} km`)}
        ${metricHtml('Source resolution', `${selected.recommendedDomain?.sourceResolutionMeters ?? 'n/a'} m`)}
        ${metricHtml('Preview resolution', `${selected.recommendedDomain?.previewResolutionMeters ?? 'n/a'} m`)}
        ${metricHtml('Detected context', selected.detectedContext?.primaryLabel ?? selected.detectedContext?.primary)}
        ${metricHtml('Window Digest', shortDigest(selected.windowDigest))}
      </div>
      <table class="environment-studio-table">
        <tbody>
          <tr><td>Land / ocean</td><td>${escapeHtml(formatNumber(stats.landOceanMask))} land, ${escapeHtml(formatNumber(1 - Number(stats.landOceanMask ?? 0)))} ocean</td></tr>
          <tr><td>Shelf / basin</td><td>${escapeHtml(formatNumber(stats.shelfZone))} shelf, ${escapeHtml(formatNumber(stats.deepBasinPotential))} basin</td></tr>
          <tr><td>Island / river / strait</td><td>${escapeHtml(formatNumber(stats.islandSeamountPotential))} / ${escapeHtml(formatNumber(stats.riverMouthInfluence))} / ${escapeHtml(formatNumber(stats.straitSillInfluence))}</td></tr>
          <tr><td>Flow-regime hints</td><td>${escapeHtml((selected.environmentRegimes?.flow ?? []).join(', ') || 'none')}</td></tr>
          <tr><td>Scalar-regime hints</td><td>${escapeHtml((selected.environmentRegimes?.scalar ?? []).join(', ') || 'none')}</td></tr>
          <tr><td>Expected artifacts</td><td>Bathymetry, wet/land mask, coastline, validation, and dependency metadata. Currents/scalars/hotspots require later regeneration.</td></tr>
          <tr><td>Warnings</td><td>${escapeHtml((selected.environmentSuitability?.warnings ?? []).join('; ') || 'none')}</td></tr>
          <tr><td>Suggested use tags</td><td>${escapeHtml((selected.datasetTags ?? []).join(', ') || 'none')}</td></tr>
        </tbody>
      </table>
    </section>
  `;
}

function worldMapPreviewHtml(session = {}, project = {}) {
  const selected = session.selectedOperationalWindow;
  return `
    <main id="environment-studio-route" class="environment-studio-route environment-studio-world-route">
      <header class="environment-studio-route-header">
        <div>
          <p class="console-kicker">Synthetic Globe Selector</p>
          <h1>${escapeHtml(session.worldMap?.styleLabel ?? labelize(session.worldStyle))}</h1>
          <p>The first artifact is deterministic high-resolution synthetic equirectangular world fields. The globe visualizes those fields; it is not Earth.</p>
        </div>
        <div class="environment-studio-digest">
          <span>World Digest</span>
          <strong>${escapeHtml(shortDigest(session.worldMap?.worldDigest))}</strong>
          <span>Region</span>
          <strong>${escapeHtml(shortDigest(selected?.windowDigest))}</strong>
        </div>
      </header>
      <section class="environment-studio-preview-grid" aria-label="Synthetic globe preview">
        <section class="environment-studio-terrain-preview environment-studio-globe-preview" data-env-studio-globe-panel>
          <h2>Synthetic Globe</h2>
          <div class="environment-studio-preview-meta">
            ${metricHtml('Style', session.worldMap?.styleLabel ?? labelize(session.worldStyle))}
            ${metricHtml('Seed', session.worldSeed)}
            ${metricHtml('Layer', labelize(session.worldLayer))}
            ${metricHtml('Source fields', `${session.worldMap?.canonicalWorldResolution?.width ?? 0} x ${session.worldMap?.canonicalWorldResolution?.height ?? 0}`)}
            ${metricHtml('Zoom', `${formatNumber(session.worldView?.zoom ?? 1)}x`)}
            <div><span>Coordinates</span><strong data-env-world-coordinate>click globe</strong></div>
          </div>
          <div class="environment-studio-globe-host" data-env-studio-globe-host aria-label="Interactive synthetic globe"></div>
          <div class="environment-studio-camera-row" aria-label="Globe view controls">
            <button type="button" data-env-globe-view-action="rotate-left">Rotate Left</button>
            <button type="button" data-env-globe-view-action="rotate-right">Rotate Right</button>
            <button type="button" data-env-globe-view-action="tilt-up">Tilt Up</button>
            <button type="button" data-env-globe-view-action="tilt-down">Tilt Down</button>
            <button type="button" data-env-globe-view-action="zoom-in">Zoom In</button>
            <button type="button" data-env-globe-view-action="zoom-out">Zoom Out</button>
            <button type="button" data-env-world-view-action="reset">Reset View</button>
          </div>
          <div class="environment-studio-depth-ramp" aria-label="Globe legend">
            <span style="background:#6e7749">land</span>
            <span style="background:#2f9a9c">shelf</span>
            <span style="background:#215f9b">basin</span>
            <span style="background:#6844aa">feature</span>
          </div>
          <p class="hud-muted">Click Select Region, then click the globe to place a small operational region. Three.js visualizes the generated fields; it does not create them.</p>
        </section>
      </section>
      <section class="environment-studio-boundary">
        <strong>Boundary</strong>
        <span>Synthetic, benchmark-oriented, not real Earth, not operational forecast, not certified navigation data. Currents, scalars, hotspots, and launch-to-planning remain staged follow-ups.</span>
      </section>
    </main>
  `;
}

function bindEnvironmentStudioGlobePreview(scene, root) {
  const host = root?.querySelector?.('[data-env-studio-globe-host]');
  host?.addEventListener('click', (event) => {
    const point = globePointFromPointer(scene, host, event);
    const label = root?.querySelector?.('[data-env-world-coordinate]');
    if (label) label.textContent = `${formatNumber(point.x)}, ${formatNumber(point.y)}`;
    if (scene.globeRegionSelectionMode || !scene.session.selectedOperationalWindow) scene.selectWorldWindowAt(point.x, point.y);
  });
  host?.addEventListener('mousemove', (event) => {
    const point = globePointFromPointer(scene, host, event);
    const label = root?.querySelector?.('[data-env-world-coordinate]');
    if (label) label.textContent = `${formatNumber(point.x)}, ${formatNumber(point.y)}`;
  });
  host?.addEventListener('wheel', (event) => {
    event.preventDefault();
    const current = scene.session.worldView ?? {};
    scene.session = setEnvironmentStudioWorldView(scene.session, {
      zoom: Number(current.zoom ?? 1) + (event.deltaY < 0 ? 0.18 : -0.18)
    });
    scene.render();
  }, { passive: false });
  root?.querySelectorAll?.('[data-env-globe-view-action], [data-env-world-view-action]')?.forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.getAttribute('data-env-globe-view-action') ?? button.getAttribute('data-env-world-view-action');
      const view = scene.session.worldView ?? {};
      if (action === 'reset') return scene.resetWorldView();
      const patch = { ...view };
      if (action === 'zoom-in') patch.zoom = Number(view.zoom ?? 1) + 0.2;
      if (action === 'zoom-out') patch.zoom = Number(view.zoom ?? 1) - 0.2;
      if (action === 'rotate-left') patch.rotationYawDegrees = Number(view.rotationYawDegrees ?? -22) - 16;
      if (action === 'rotate-right') patch.rotationYawDegrees = Number(view.rotationYawDegrees ?? -22) + 16;
      if (action === 'tilt-up') patch.rotationPitchDegrees = Number(view.rotationPitchDegrees ?? 8) + 8;
      if (action === 'tilt-down') patch.rotationPitchDegrees = Number(view.rotationPitchDegrees ?? 8) - 8;
      scene.session = setEnvironmentStudioWorldView(scene.session, patch);
      scene.render();
    });
  });
}

function mountSyntheticGlobeRenderer(scene, root) {
  const host = root?.querySelector?.('[data-env-studio-globe-host]');
  if (!host || !THREE?.WebGLRenderer) return;
  const rect = host.getBoundingClientRect();
  const width = Math.max(480, Math.round(rect.width || 960));
  const height = Math.max(360, Math.round(rect.height || 560));
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, globalThis.devicePixelRatio || 1));
  renderer.setSize(width, height, false);
  renderer.domElement.className = 'environment-studio-globe-canvas';
  renderer.domElement.setAttribute('data-env-studio-globe-canvas', 'true');
  host.replaceChildren(renderer.domElement);

  const threeScene = new THREE.Scene();
  threeScene.background = new THREE.Color(0x04111f);
  const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 20);
  const zoom = Math.max(0.75, Number(scene.session.worldView?.zoom ?? 1));
  camera.position.set(0, 0, 3.2 / zoom);
  camera.lookAt(0, 0, 0);
  threeScene.add(new THREE.HemisphereLight(0xcaf7ff, 0x06111f, 1.4));
  const light = new THREE.DirectionalLight(0xffffff, 1.8);
  light.position.set(3, 2, 4);
  threeScene.add(light);

  const textureCanvas = createGlobeTextureCanvas(scene.session.worldMap, scene.session.worldLayer);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer.capabilities?.getMaxAnisotropy?.() ?? 1);
  const geometry = new THREE.SphereGeometry(1, 96, 48);
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8, metalness: 0.02 });
  const sphere = new THREE.Mesh(geometry, material);
  const rootGroup = new THREE.Group();
  rootGroup.add(sphere);
  const yaw = degreesToRadians(scene.session.worldView?.rotationYawDegrees ?? -22);
  const pitch = degreesToRadians(scene.session.worldView?.rotationPitchDegrees ?? 8);
  rootGroup.rotation.y = yaw;
  rootGroup.rotation.x = pitch;
  const overlay = createGlobeRegionOverlay(scene.session.selectedOperationalWindow?.bounds);
  if (overlay) rootGroup.add(overlay.line);
  threeScene.add(rootGroup);
  renderer.render(threeScene, camera);
  scene.globeRendererContext = {
    renderer,
    threeScene,
    camera,
    rootGroup,
    sphere,
    texture,
    geometry,
    material,
    overlayGeometry: overlay?.geometry ?? null,
    overlayMaterial: overlay?.material ?? null,
    rafId: null
  };
  scene.publishDebug(true);
}

function createGlobeTextureCanvas(worldMap = {}, layer = 'bathymetryContext') {
  const resolution = worldMap.displayTextureResolution ?? { width: 1024, height: 512 };
  const width = Math.max(256, Math.min(2048, Math.round(Number(resolution.width ?? 1024))));
  const height = Math.max(128, Math.min(1024, Math.round(Number(resolution.height ?? 512))));
  const canvas = globalThis.document?.createElement?.('canvas');
  if (!canvas) return { width: 1, height: 1 };
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(width, height);
  const data = image.data;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color = syntheticGlobeLayerColor(worldMap, layer, (x + 0.5) / width, (y + 0.5) / height);
      const offset = (y * width + x) * 4;
      data[offset] = color[0];
      data[offset + 1] = color[1];
      data[offset + 2] = color[2];
      data[offset + 3] = color[3];
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

function createGlobeRegionOverlay(bounds = null) {
  if (!bounds) return null;
  const width = Number(bounds.widthNormalized ?? bounds.width ?? 0);
  const height = Number(bounds.heightNormalized ?? bounds.height ?? 0);
  const centerLon = Number(bounds.centerLonNormalized ?? 0.5);
  const centerLat = Number(bounds.centerLatNormalized ?? 0.5);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const lon0 = centerLon - width / 2;
  const lon1 = centerLon + width / 2;
  const lat0 = centerLat - height / 2;
  const lat1 = centerLat + height / 2;
  const points = [
    ...globeArcPoints(lon0, lat0, lon1, lat0),
    ...globeArcPoints(lon1, lat0, lon1, lat1),
    ...globeArcPoints(lon1, lat1, lon0, lat1),
    ...globeArcPoints(lon0, lat1, lon0, lat0)
  ];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: 0xffe66d, transparent: true, opacity: 0.98, depthTest: false });
  const line = new THREE.Line(geometry, material);
  line.renderOrder = 10;
  return { line, geometry, material };
}

function globeArcPoints(lon0, lat0, lon1, lat1) {
  const points = [];
  const steps = 20;
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    points.push(globePointToVector(lerpNumber(lon0, lon1, t), lerpNumber(lat0, lat1, t), 1.014));
  }
  return points;
}

function globePointToVector(lonNormalized = 0.5, latNormalized = 0.5, radius = 1) {
  const lon = (lonNormalized - 0.5) * Math.PI * 2;
  const lat = (0.5 - latNormalized) * Math.PI;
  const cosLat = Math.cos(lat);
  return new THREE.Vector3(
    Math.sin(lon) * cosLat * radius,
    Math.sin(lat) * radius,
    Math.cos(lon) * cosLat * radius
  );
}

function globePointFromPointer(scene, host, event) {
  const rect = host.getBoundingClientRect();
  const sx = (event.clientX - rect.left) / Math.max(1, rect.width);
  const sy = (event.clientY - rect.top) / Math.max(1, rect.height);
  const yaw = Number(scene.session.worldView?.rotationYawDegrees ?? -22) / 360;
  const pitch = Number(scene.session.worldView?.rotationPitchDegrees ?? 8) / 180;
  return {
    x: clampMetric(sx + yaw * 0.35, 0, 1),
    y: clampMetric(sy - pitch * 0.2, 0.04, 0.96)
  };
}

function degreesToRadians(value) {
  return Number(value ?? 0) * Math.PI / 180;
}

function lerpNumber(a, b, t) {
  return Number(a ?? 0) + (Number(b ?? 0) - Number(a ?? 0)) * Number(t ?? 0);
}

function clampMetric(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function simplifiedConsoleHtml(scene, summary = {}, panelSections = new Map(), advancedOpen = '', diagnosticsOpen = '') {
  const session = scene.session;
  return `
    <section class="console-header">
      <div class="console-kicker">Simulation Lab / Environment Studio</div>
      <h1>Environment Studio</h1>
      <p>Author an inspectable mission-scale synthetic ocean region. Source-tile diagnostics stay collapsed by default so the first decision is region intent.</p>
    </section>
    <section class="console-status">
      <span>Status</span>
      <strong>${escapeHtml(summary.validationStatus)}</strong>
      <small>${escapeHtml(scene.statusMessage)}</small>
    </section>
    ${scene.lastError ? `<section class="console-section" data-keep-title="true"><h2>Warning</h2><div class="hud-muted">${escapeHtml(scene.lastError)}</div></section>` : ''}
    <section class="console-section environment-studio-basic-panel" data-keep-title="true" data-env-studio-section="basic">
      <h2>${escapeHtml(panelSections.get('basic')?.label ?? 'Basic Authoring')}</h2>
      <p class="hud-muted">Pick scale, size, diversity, and seed. Generate the region, then inspect the preview and feature records.</p>
      <label class="compact-field">
        Environment Type
        <select id="env-studio-profile" data-env-studio-profile>
          ${ENVIRONMENT_STUDIO_DOMAIN_PROFILES.map((profile) => `<option value="${escapeAttr(profile.id)}" ${profile.id === session.environmentType ? 'selected' : ''}>${escapeHtml(profile.label)}</option>`).join('')}
        </select>
      </label>
      ${selectInput('Mission Scale', 'env-studio-mission-scale', session.missionScale, ENVIRONMENT_STUDIO_MISSION_SCALES)}
      ${numberInput('Intended Gliders', 'env-studio-intended-gliders', session.intendedGliders, 1, 6, 1)}
      ${numberInput('Width km', 'env-studio-width', session.domainSpec.horizontal.widthMeters / 1000, 1, 300, 1)}
      ${numberInput('Height km', 'env-studio-height', session.domainSpec.horizontal.heightMeters / 1000, 1, 200, 1)}
      ${numberInput('Horizontal source-cell size m', 'env-studio-cell-size', session.domainSpec.horizontal.cellSizeMeters, 100, 5000, 100)}
      ${selectInput('Preview detail', 'env-studio-preview-detail', session.previewDetail, ENVIRONMENT_STUDIO_PREVIEW_DETAILS)}
      ${levelSelect('Feature diversity', 'env-studio-mix-featureDiversity', session.featureMix.featureDiversity)}
      <label class="compact-field">
        World seed
        <input id="env-studio-seed" data-env-studio-seed type="text" value="${escapeAttr(session.seed)}" />
      </label>
      <div class="cell-inspector-metrics">
        ${metricHtml('Source grid', `${summary.sourceGridShape.columns} x ${summary.sourceGridShape.rows}`)}
        ${metricHtml('Preview mesh', `${summary.previewGridShape.columns} x ${summary.previewGridShape.rows}`)}
        ${metricHtml('Preview budget', session.previewBudget?.label ?? 'Not measured')}
        ${metricHtml('Suitability', session.multiGliderSuitability?.status ?? 'WARN')}
        ${metricHtml('Builder validation', session.bathymetryBuilderResult?.validationReport?.status ?? 'NOT_GENERATED')}
        ${metricHtml('Bathymetry artifact', shortDigest(session.bathymetryArtifactDigest ?? session.bathymetryBuilderResult?.bathymetryArtifactDigest))}
      </div>
      ${suitabilityHtml(session.multiGliderSuitability)}
      <button class="console-button primary" type="button" data-action="env-studio-apply-domain">Apply Domain</button>
      <button class="console-button primary" type="button" data-action="env-studio-create-mosaic">Generate Region</button>
      <button class="console-button primary" type="button" data-action="env-studio-generate-fields">Generate Currents &amp; Science Fields</button>
      <button class="console-button secondary" type="button" data-action="env-studio-export-project">Export Project JSON</button>
      <button class="console-button secondary" type="button" disabled data-action="env-studio-launch-planning">Launch to Planning remains disabled until environment-adapter validation.</button>
    </section>
    <section class="console-section environment-studio-secondary-panel" data-keep-title="true" data-env-studio-section="advanced" data-collapsed="true">
      <h2>Advanced Region Recipe</h2>
      <p class="hud-muted">Feature-mix and tile-role tuning are secondary controls after atlas selection. Use them only when the inferred recipe needs expert adjustment.</p>
      <label class="console-button secondary" for="env-studio-import-file">Import Project JSON</label>
      <input id="env-studio-import-file" type="file" accept="application/json,.json" hidden data-env-studio-import />
      <button class="console-button secondary" type="button" data-action="menu">Main Menu</button>
    </section>
    <section class="console-section environment-studio-secondary-panel" data-keep-title="true" data-env-studio-section="diagnostics" data-env-studio-source-diagnostics data-collapsed="true">
      <h2>Source Tile Provenance</h2>
      <p class="hud-muted">Source tiles explain provenance for the synthetic regional surface. They are not depth slabs or separate water-column layers.</p>
    </section>
    <details class="console-section environment-studio-collapsible" data-keep-title="true" data-env-studio-section="advanced" ${advancedOpen}>
      <summary><span>${escapeHtml(panelSections.get('advanced')?.label ?? 'Advanced Region Controls')}</span><small>Domain / Resolution, templates, feature mix, randomization</small></summary>
      <div class="environment-studio-collapsible-body">
        <h2>Domain &amp; Resolution</h2>
        <div class="hud-muted">Legacy label: Domain / Resolution. Source Grid is exported; Preview Mesh is decimated for interactive display.</div>
        ${numberInput('Max depth m', 'env-studio-max-depth', session.domainSpec.vertical.maxDepthMeters, 20, 1000, 10)}
        ${numberInput('Duration s', 'env-studio-duration', session.domainSpec.time.durationSeconds, 300, 86400, 300)}
        ${numberInput('dt s', 'env-studio-dt', session.domainSpec.time.dtSeconds, 30, 3600, 30)}
        <label class="compact-field">
          Estimated Mission Duration
          <input id="env-studio-duration-label" type="text" value="${escapeAttr(session.estimatedMissionDuration)}" />
        </label>
        ${selectInput('Bathymetry Source', 'env-studio-bathymetry-source', session.bathymetrySource, ENVIRONMENT_STUDIO_BATHYMETRY_SOURCES)}
        <div class="hud-muted">Current authoring uses deterministic synthetic bathymetry only. Real patch import and reference comparison remain planned workflows.</div>
        <h2>Regional Layout Template</h2>
        ${selectInput('Template', 'env-studio-regional-template', session.regionalTemplate, ENVIRONMENT_STUDIO_REGIONAL_TEMPLATES)}
        ${selectInput('Coastline Orientation', 'env-studio-coastline-orientation', session.coastlineOrientation, ENVIRONMENT_STUDIO_COASTLINE_ORIENTATIONS)}
        <div class="environment-studio-checkbox-grid" aria-label="Open Ocean Boundaries">
          ${['north', 'south', 'east', 'west'].map((side) => `
            <label><input type="checkbox" data-env-studio-open-boundary value="${escapeAttr(side)}" ${session.openOceanBoundaries.includes(side) ? 'checked' : ''} /> ${escapeHtml(labelize(side))}</label>
          `).join('')}
        </div>
        <h2>Regional Feature Mix</h2>
        ${levelSelect('Shelf fraction', 'env-studio-mix-shelfFraction', session.featureMix.shelfFraction)}
        ${levelSelect('Deep basin fraction', 'env-studio-mix-deepBasinFraction', session.featureMix.deepBasinFraction)}
        ${levelSelect('Canyon density', 'env-studio-mix-canyonDensity', session.featureMix.canyonDensity)}
        ${levelSelect('Island / seamount count', 'env-studio-mix-islandSeamountCount', session.featureMix.islandSeamountCount)}
        ${levelSelect('Coastline complexity', 'env-studio-mix-coastlineComplexity', session.featureMix.coastlineComplexity)}
        ${levelSelect('River mouth / delta influence', 'env-studio-mix-riverMouthDeltaInfluence', session.featureMix.riverMouthDeltaInfluence)}
        ${levelSelect('Ridge / sill strength', 'env-studio-mix-ridgeSillStrength', session.featureMix.ridgeSillStrength)}
        ${levelSelect('Shelf-break sharpness', 'env-studio-mix-shelfBreakSharpness', session.featureMix.shelfBreakSharpness)}
        <h2>Randomization</h2>
        <div class="hud-muted">Bathymetry Generator: choose region type, choose feature mix, lock what you like, and reroll the rest.</div>
        <label class="compact-field">
          Compact Tile Archetype
          <select id="env-studio-archetype" data-env-studio-archetype>
            ${ENVIRONMENT_STUDIO_BATHYMETRY_ARCHETYPES.map((entry) => `<option value="${escapeAttr(entry.id)}" ${entry.id === session.archetypeId ? 'selected' : ''}>${escapeHtml(entry.label)}</option>`).join('')}
          </select>
        </label>
        ${levelSelect('Variation level', 'env-studio-variation-level', session.randomization.variationLevel)}
        <div class="environment-studio-checkbox-grid">
          <label><input type="checkbox" id="env-studio-lock-coastline" ${session.randomization.locks.coastline ? 'checked' : ''} /> Lock coastline</label>
          <label><input type="checkbox" id="env-studio-lock-deep-basin" ${session.randomization.locks.deepBasin ? 'checked' : ''} /> Lock deep basin</label>
          <label><input type="checkbox" id="env-studio-lock-selected-features" ${session.randomization.locks.selectedFeatures ? 'checked' : ''} disabled /> Lock selected features (planned)</label>
          <label><input type="checkbox" id="env-studio-lock-tile-seams" ${session.randomization.locks.tileSeams ? 'checked' : ''} /> Lock tile seams</label>
        </div>
        <div class="environment-studio-tile-config-list">
          ${session.tileConfigs.map((config) => `
            <label class="compact-field">
              ${escapeHtml(config.label)} role
              <select data-env-studio-tile-archetype="${escapeAttr(config.id)}">
                ${ENVIRONMENT_STUDIO_BATHYMETRY_ARCHETYPES.map((entry) => `<option value="${escapeAttr(entry.id)}" ${entry.id === config.archetypeId ? 'selected' : ''}>${escapeHtml(entry.label)}</option>`).join('')}
              </select>
            </label>
          `).join('')}
        </div>
        <div class="hud-muted">${escapeHtml(archetypeDescription(session.archetypeId))}</div>
        <button class="console-button secondary" type="button" data-action="env-studio-generate-tile">Regenerate Selected Source Tile</button>
        <button class="console-button secondary" type="button" data-action="env-studio-export-bathymetry">Export Bathymetry Artifact</button>
        <label class="console-button secondary" for="env-studio-import-file">Import Project JSON</label>
        <input id="env-studio-import-file" type="file" accept="application/json,.json" hidden data-env-studio-import />
        <button class="console-button secondary" type="button" data-action="menu">Main Menu</button>
      </div>
    </details>
    <details class="console-section environment-studio-collapsible" data-keep-title="true" data-env-studio-section="diagnostics" data-env-studio-source-diagnostics ${diagnosticsOpen}>
      <summary><span>${escapeHtml(panelSections.get('diagnostics')?.label ?? 'Diagnostics')}</span><small>Validation, source tiles, digests, dependency state</small></summary>
      <div class="environment-studio-collapsible-body">
        <h2>Validation &amp; Mission Suitability</h2>
        <div class="cell-inspector-metrics">
          ${metricHtml('Bathymetry validity', session.validationReport?.status ?? 'EMPTY')}
          ${metricHtml('Wet connectivity', formatNumber(session.regionalFeatureSummary?.navigableConnectedWaterFraction))}
          ${metricHtml('Slope warnings', session.regionalFeatureSummary?.canyonLikeGradientCount ?? 0)}
          ${metricHtml('Seam continuity', session.mosaic?.seamReport?.valid === true ? 'PASS' : session.mosaic?.seamReport ? 'FAIL' : 'NOT_GENERATED')}
          ${metricHtml('Deep water', formatNumber(session.regionalFeatureSummary?.deepWaterFraction))}
          ${metricHtml('Shallow shelf', formatNumber(session.regionalFeatureSummary?.shallowShelfFraction))}
          ${metricHtml('Feature diversity', formatNumber(session.regionalFeatureSummary?.featureDiversityScore))}
          ${metricHtml('Feature records', session.featureRecords?.length ?? 0)}
          ${metricHtml('Builder', shortDigest(session.bathymetryBuilderResult?.builderDigest))}
          ${metricHtml('Builder attempts', session.bathymetryBuilderResult?.generationAttempts?.length ?? 0)}
          ${metricHtml('Bathymetry artifact', shortDigest(session.bathymetryArtifactDigest ?? session.bathymetryBuilderResult?.bathymetryArtifactDigest))}
          ${metricHtml('Builder validation', session.bathymetryBuilderResult?.validationReport?.status ?? 'NOT_GENERATED')}
          ${metricHtml('Preview budget', session.previewBudget?.label ?? 'Not measured')}
          ${metricHtml('Estimated cost', session.previewBudget?.estimatedRenderCost ?? 'Not measured')}
          ${metricHtml('Domain Digest', shortDigest(summary.domainDigest))}
          ${metricHtml('Report Digest', shortDigest(session.validationReport?.validationReportDigest))}
        </div>
        <div class="hud-muted">Synthetic, public-safe artifacts only. Not calibrated survey data, not an operational forecast, and not certified for navigation.</div>
        <h2>Generated Field Status</h2>
        ${dependencyGraphTable(session.dependencyGraph)}
        ${fieldRegenerationSummaryHtml(session.fieldRegenerationResult)}
        <h2>Source Tile Diagnostics</h2>
        <p class="hud-muted">Source tiles are provenance components for the synthetic regional surface. They are not depth slabs or separate water-column layers.</p>
        <div class="cell-inspector-metrics">
          ${metricHtml('Source tiles', session.tiles.length)}
          ${metricHtml('Mosaic', session.mosaic?.manifest ? '2 x 2' : 'none')}
          ${metricHtml('Source tile digests', session.tiles.map((tile) => shortDigest(tile.manifest?.tileDigest)).join(', ') || 'none')}
        </div>
      </div>
    </details>
  `;
}

function bindEnvironmentStudioConsoleControls(scene, root) {
  root?.querySelector?.('[data-env-studio-profile]')?.addEventListener('change', (event) => scene.applyProfile(event.target.value));
  root?.querySelector?.('[data-env-studio-archetype]')?.addEventListener('change', (event) => scene.updateArchetype(event.target.value));
  root?.querySelector?.('[data-action="env-studio-apply-domain"]')?.addEventListener('click', () => scene.applyDomainControls());
  root?.querySelector?.('[data-action="env-studio-generate-tile"]')?.addEventListener('click', () => scene.generateTile());
  root?.querySelector?.('[data-action="env-studio-create-mosaic"]')?.addEventListener('click', () => scene.createMosaic());
  root?.querySelector?.('[data-action="env-studio-generate-fields"]')?.addEventListener('click', () => scene.generateFields());
  root?.querySelector?.('[data-action="env-studio-export-project"]')?.addEventListener('click', () => scene.exportProject());
  root?.querySelector?.('[data-action="env-studio-export-bathymetry"]')?.addEventListener('click', () => scene.exportBathymetryArtifact());
  root?.querySelector?.('[data-env-studio-import]')?.addEventListener('change', (event) => scene.importProject(event.target.files?.[0]));
  root?.querySelector?.('[data-action="menu"]')?.addEventListener('click', () => scene.scene.start('MainMenuScene'));
}

function atlasConsoleHtml(scene, selectedWindow = {}) {
  const session = scene.session;
  return `
    <section class="console-header">
      <div class="console-kicker">Simulation Lab / Environment Studio</div>
      <h1>Synthetic Ocean Atlas</h1>
      <p>Select an operational mission window first. Feature and source-tile controls move to the regional detail stage after generation.</p>
    </section>
    <section class="console-status">
      <span>Stage</span>
      <strong>Atlas Window</strong>
      <small>${escapeHtml(scene.statusMessage)}</small>
    </section>
    ${scene.lastError ? `<section class="console-section" data-keep-title="true"><h2>Warning</h2><div class="hud-muted">${escapeHtml(scene.lastError)}</div></section>` : ''}
    <section class="console-section environment-studio-basic-panel" data-keep-title="true" data-env-studio-stage="atlasWindow">
      <h2>Mission Region</h2>
      <label class="compact-field">
        Region Source
        <select id="env-studio-region-source">
          <option value="syntheticOceanAtlas">Synthetic Ocean Atlas</option>
          <option value="importedBathymetryArtifact">Imported Bathymetry Artifact</option>
          <option value="realPatchTemplatePlanned" disabled>Real Patch Template - Planned</option>
          <option value="referenceComparisonOnlyPlanned" disabled>Reference Comparison - Planned</option>
        </select>
      </label>
      <label class="compact-field">
        Atlas Preset
        <select id="env-studio-atlas-preset" data-env-studio-atlas-preset>
          ${SYNTHETIC_OCEAN_ATLAS_PRESETS.map((preset) => `<option value="${escapeAttr(preset.id)}" ${preset.id === session.atlasPreset ? 'selected' : ''}>${escapeHtml(preset.label)}</option>`).join('')}
        </select>
      </label>
      <label class="compact-field">
        Window Example
        <select id="env-studio-window-preset" data-env-studio-window-preset>
          ${OPERATIONAL_WINDOW_PRESETS.map((preset) => `<option value="${escapeAttr(preset.id)}" ${preset.id === selectedWindow.windowId ? 'selected' : ''}>${escapeHtml(preset.label)}</option>`).join('')}
        </select>
      </label>
      ${selectInput('Mission Scale', 'env-studio-mission-scale', session.missionScale, ENVIRONMENT_STUDIO_MISSION_SCALES)}
      ${numberInput('Intended Gliders', 'env-studio-intended-gliders', selectedWindow.recommendedGliders ?? session.intendedGliders, 1, 6, 1)}
      <label class="compact-field">
        Mission Duration
        <input id="env-studio-duration-label" type="text" value="${escapeAttr(Math.round(Number(selectedWindow.recommendedDurationSeconds ?? 86400) / 3600))} hr" />
      </label>
      <label class="compact-field">
        Window Size
        <input id="env-studio-window-size" type="text" value="${escapeAttr(formatNumber(selectedWindow.width))} x ${escapeAttr(formatNumber(selectedWindow.height))}" readonly />
      </label>
      <label class="compact-field">
        Atlas seed
        <input id="env-studio-seed" data-env-studio-seed type="text" value="${escapeAttr(session.atlasSeed ?? session.seed)}" />
      </label>
      <div class="environment-studio-camera-row" aria-label="Window controls">
        <button type="button" data-env-studio-window-action="left">Move Left</button>
        <button type="button" data-env-studio-window-action="right">Move Right</button>
        <button type="button" data-env-studio-window-action="up">Move Up</button>
        <button type="button" data-env-studio-window-action="down">Move Down</button>
        <button type="button" data-env-studio-window-action="smaller">Smaller</button>
        <button type="button" data-env-studio-window-action="larger">Larger</button>
      </div>
      <div class="cell-inspector-metrics">
        ${metricHtml('Detected context', selectedWindow.detectedContext?.primaryContextLabel ?? 'not selected')}
        ${metricHtml('Domain', `${formatNumber((selectedWindow.recommendedDomain?.widthMeters ?? 0) / 1000)} x ${formatNumber((selectedWindow.recommendedDomain?.heightMeters ?? 0) / 1000)} km`)}
        ${metricHtml('Source cells', `${selectedWindow.recommendedDomain?.columns ?? 0} x ${selectedWindow.recommendedDomain?.rows ?? 0}`)}
        ${metricHtml('Atlas digest', shortDigest(session.atlas?.atlasDigest))}
        ${metricHtml('Window digest', shortDigest(selectedWindow.windowDigest))}
        ${metricHtml('Current hints', (selectedWindow.currentRegime ?? []).slice(0, 2).join(', ') || 'not inferred')}
        ${metricHtml('Scalar hints', (selectedWindow.scalarRegime ?? []).slice(0, 2).join(', ') || 'not inferred')}
      </div>
      <button class="console-button secondary" type="button" data-action="env-studio-randomize-atlas-seed">Randomize Atlas Seed</button>
      <button class="console-button primary" type="button" data-action="env-studio-generate-atlas-region">Generate 3D Region</button>
      <button class="console-button secondary" type="button" data-action="env-studio-export-project">Export Project JSON</button>
      <button class="console-button secondary" type="button" disabled data-action="env-studio-launch-planning">Launch to Planning remains planned for a later adapter phase.</button>
    </section>
    <details class="console-section environment-studio-collapsible" data-keep-title="true">
      <summary><span>Advanced Region Recipe</span><small>Feature and tile controls appear after a region is generated</small></summary>
      <div class="environment-studio-collapsible-body">
        <p class="hud-muted">The atlas-selected operational window creates a Regional Mission Recipe. Low-level feature mix, source-tile roles, and diagnostics are available in Regional Detail after generation.</p>
      </div>
    </details>
  `;
}

function bindEnvironmentStudioAtlasControls(scene, root) {
  root?.querySelector?.('[data-env-studio-atlas-preset]')?.addEventListener('change', (event) => scene.setAtlasPreset(event.target.value));
  root?.querySelector?.('[data-env-studio-window-preset]')?.addEventListener('change', (event) => scene.selectAtlasWindow(event.target.value));
  root?.querySelectorAll?.('[data-env-studio-window-action]')?.forEach((button) => {
    button.addEventListener('click', () => scene.adjustAtlasWindow(button.getAttribute('data-env-studio-window-action')));
  });
  root?.querySelector?.('[data-action="env-studio-randomize-atlas-seed"]')?.addEventListener('click', () => scene.randomizeAtlasSeed());
  root?.querySelector?.('[data-action="env-studio-generate-atlas-region"]')?.addEventListener('click', () => scene.generateAtlasRegion());
  root?.querySelector?.('[data-action="env-studio-export-project"]')?.addEventListener('click', () => scene.exportProject());
}

function atlasRightPanelHtml(session = {}) {
  const window = session.selectedOperationalWindow ?? {};
  const context = window.detectedContext ?? {};
  const recipe = session.regionalMissionRecipe ?? {};
  return `
    <section class="waypoint-shell environment-studio-right-panel" id="env-studio-status-panel">
      <div class="console-kicker">Selected Operational Window</div>
      <h2>${escapeHtml(window.label ?? 'Operational Window')}</h2>
      <p class="hud-muted">Synthetic Ocean Atlas context map. This is not a real Earth map, calibrated ocean product, operational forecast, or navigation dataset.</p>
      <div class="cell-inspector-metrics">
        ${metricHtml('Studio Stage', 'Atlas Window')}
        ${metricHtml('Detected Context', context.primaryContextLabel ?? 'not inferred')}
        ${metricHtml('Recommended Gliders', window.recommendedGliders ?? session.intendedGliders)}
        ${metricHtml('Recommended Duration', `${Math.round(Number(window.recommendedDurationSeconds ?? 0) / 3600)} hr`)}
        ${metricHtml('Atlas Digest', shortDigest(session.atlas?.atlasDigest))}
        ${metricHtml('Window Digest', shortDigest(window.windowDigest))}
        ${metricHtml('Recipe Digest', shortDigest(recipe.recipeDigest))}
      </div>
      <table class="environment-studio-table">
        <tbody>
          <tr><td>Domain</td><td>${escapeHtml(formatNumber((window.recommendedDomain?.widthMeters ?? 0) / 1000))} x ${escapeHtml(formatNumber((window.recommendedDomain?.heightMeters ?? 0) / 1000))} km</td></tr>
          <tr><td>Source Resolution</td><td>${escapeHtml(window.recommendedDomain?.sourceResolutionMeters ?? 'n/a')} m</td></tr>
          <tr><td>Bathymetry Regime</td><td>${escapeHtml(labelize(window.bathymetryRegime ?? 'not inferred'))}</td></tr>
          <tr><td>Current Regime Hints</td><td>${escapeHtml((window.currentRegime ?? []).join(', ') || 'not inferred')}</td></tr>
          <tr><td>Scalar Regime Hints</td><td>${escapeHtml((window.scalarRegime ?? []).join(', ') || 'not inferred')}</td></tr>
          <tr><td>Open Boundaries</td><td>${escapeHtml((window.openBoundarySides ?? []).join(', ') || 'none')}</td></tr>
          <tr><td>Mission Suitability</td><td>${escapeHtml(context.missionSuitabilityHint ?? 'Generate or adjust a window.')}</td></tr>
          <tr><td>Expected Artifacts</td><td>Bathymetry, wet/land mask, and coastline metadata are current after generation; currents/scalars/hotspots are marked for regeneration or validation.</td></tr>
        </tbody>
      </table>
      <div class="environment-studio-summary-grid">
        ${metricHtml('Land fraction', formatNumber(context.landFraction))}
        ${metricHtml('Water fraction', formatNumber(context.waterFraction))}
        ${metricHtml('Shelf fraction', formatNumber(context.shelfFraction))}
        ${metricHtml('Basin fraction', formatNumber(context.basinFraction))}
        ${metricHtml('Island fraction', formatNumber(context.islandFraction))}
        ${metricHtml('River mouth', formatNumber(context.riverMouthInfluence))}
        ${metricHtml('Strait / sill', formatNumber(context.straitInfluence))}
      </div>
    </section>
  `;
}

function atlasPreviewHtml(session = {}, project = {}) {
  return `
    <main id="environment-studio-route" class="environment-studio-route environment-studio-atlas-route">
      <header class="environment-studio-route-header">
        <div>
          <p class="console-kicker">Synthetic Ocean Atlas</p>
          <h1>${escapeHtml(session.atlas?.label ?? 'Synthetic Ocean Atlas')}</h1>
          <p>Choose a synthetic operational window. The atlas is a deterministic context map, not a real Earth map or operational ocean forecast.</p>
        </div>
        <div class="environment-studio-digest">
          <span>Project Digest</span>
          <strong>${escapeHtml(shortDigest(project.projectDigest))}</strong>
        </div>
      </header>
      <section class="environment-studio-preview-grid" aria-label="Synthetic Ocean Atlas map">
        <section class="environment-studio-terrain-preview" data-env-studio-atlas-map>
          <h2>Synthetic Ocean Atlas Map</h2>
          <div class="environment-studio-preview-meta">
            ${metricHtml('Atlas Preset', labelize(session.atlasPreset))}
            ${metricHtml('Atlas Seed', session.atlasSeed)}
            ${metricHtml('Atlas Digest', shortDigest(session.atlas?.atlasDigest))}
            ${metricHtml('Selected Window', session.selectedOperationalWindow?.label ?? 'none')}
            ${metricHtml('Window Digest', shortDigest(session.selectedOperationalWindow?.windowDigest))}
            ${metricHtml('Detected Context', session.selectedOperationalWindow?.detectedContext?.primaryContextLabel ?? 'not inferred')}
            ${metricHtml('Recipe', shortDigest(session.regionalMissionRecipe?.recipeDigest))}
          </div>
          ${atlasSvgHtml(session)}
          <div class="environment-studio-depth-ramp" aria-label="Atlas legend">
            <span style="background:#6f7b4a">land/coast</span>
            <span style="background:#2d8f9f">shelf</span>
            <span style="background:#1f5f9d">basin</span>
            <span style="background:#5442a8">deep/open</span>
          </div>
          <p class="hud-muted">Current and scalar regimes are hints recorded in the Regional Mission Recipe. This phase does not regenerate current/scalar fields or change simulation/scoring.</p>
        </section>
      </section>
      <section class="environment-studio-boundary">
        <strong>Boundary</strong>
        <span>Synthetic, reference-informed, benchmark-oriented atlas. Bathymetry remains a 2.5D bottom surface h(x,y). No hidden truth or real-region accuracy claim.</span>
      </section>
    </main>
  `;
}

function atlasSvgHtml(session = {}) {
  const atlas = session.atlas ?? {};
  const window = session.selectedOperationalWindow ?? {};
  const regions = atlas.regions ?? [];
  const fieldCells = atlasFieldRasterHtml(atlas);
  const regionShapes = regions.map((region) => atlasRegionShapeHtml(region)).join('');
  const x = 60 + Number(window.x ?? 0) * 600;
  const y = 42 + Number(window.y ?? 0) * 276;
  const width = Number(window.width ?? 0.3) * 600;
  const height = Number(window.height ?? 0.3) * 276;
  return `
    <svg class="environment-studio-3d-svg environment-studio-atlas-svg" role="img" aria-label="Synthetic Ocean Atlas map" viewBox="0 0 720 360" preserveAspectRatio="xMidYMid meet">
      <rect x="0" y="0" width="720" height="360" rx="8" fill="rgba(2, 8, 18, 0.88)" />
      <rect x="60" y="42" width="600" height="276" rx="6" fill="#123e62" />
      ${fieldCells}
      ${regionShapes}
      <g class="environment-studio-atlas-current-hints">
        <path d="M420 108 C500 88 580 118 620 178" />
        <path d="M238 238 C318 204 408 214 500 258" />
      </g>
      <rect x="${roundForSvg(x)}" y="${roundForSvg(y)}" width="${roundForSvg(width)}" height="${roundForSvg(height)}" class="environment-studio-atlas-window" />
      <text x="${roundForSvg(x + 8)}" y="${roundForSvg(Math.max(58, y - 8))}">${escapeHtml(window.label ?? 'Operational Window')}</text>
      <text x="74" y="68">Synthetic Ocean Atlas</text>
      <text x="74" y="88">normalized coordinates, not real lat/lon</text>
    </svg>
  `;
}

function atlasFieldRasterHtml(atlas = {}) {
  if (!atlas.layers) return '';
  const columns = 30;
  const rows = 16;
  const cellWidth = 600 / columns;
  const cellHeight = 276 / rows;
  const cells = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const nx = (x + 0.5) / columns;
      const ny = (y + 0.5) / rows;
      const land = sampleAtlasLayer(atlas, 'landOceanMask', nx, ny);
      const shelf = sampleAtlasLayer(atlas, 'continentalShelf', nx, ny);
      const basin = sampleAtlasLayer(atlas, 'deepBasin', nx, ny);
      const canyon = sampleAtlasLayer(atlas, 'canyonPotential', nx, ny);
      const island = sampleAtlasLayer(atlas, 'islandSeamount', nx, ny);
      const river = sampleAtlasLayer(atlas, 'riverMouthInfluence', nx, ny);
      const strait = sampleAtlasLayer(atlas, 'straitSillInfluence', nx, ny);
      const suitability = sampleAtlasLayer(atlas, 'missionSuitability', nx, ny);
      cells.push(`<rect x="${roundForSvg(60 + x * cellWidth)}" y="${roundForSvg(42 + y * cellHeight)}" width="${roundForSvg(cellWidth + 0.25)}" height="${roundForSvg(cellHeight + 0.25)}" fill="${atlasCellColor({ land, shelf, basin, canyon, island, river, strait, suitability })}" opacity=".9" />`);
    }
  }
  return `<g class="environment-studio-atlas-field-raster" data-env-studio-atlas-field-raster>${cells.join('')}</g>`;
}

function atlasCellColor(values = {}) {
  if (values.land > 0.52) return '#6f7b4a';
  if (values.river > 0.38) return '#6aa36f';
  if (values.strait > 0.34) return '#55b9b5';
  if (values.island > 0.42) return '#b8a867';
  if (values.canyon > 0.3) return '#2b4d92';
  if (values.shelf > 0.5) return '#2d8f9f';
  if (values.basin > 0.5) return '#263f88';
  if (values.suitability > 0.64) return '#1f6f9d';
  return '#123e62';
}

function atlasRegionShapeHtml(region = {}) {
  const shape = region.shape ?? {};
  const color = atlasRegionColor(region.context);
  if (shape.type === 'rect') {
    return `<rect x="${roundForSvg(60 + Number(shape.x ?? 0) * 600)}" y="${roundForSvg(42 + Number(shape.y ?? 0) * 276)}" width="${roundForSvg(Number(shape.width ?? 0.1) * 600)}" height="${roundForSvg(Number(shape.height ?? 0.1) * 276)}" fill="${color}" opacity=".62" />`;
  }
  return `<ellipse cx="${roundForSvg(60 + Number(shape.cx ?? 0.5) * 600)}" cy="${roundForSvg(42 + Number(shape.cy ?? 0.5) * 276)}" rx="${roundForSvg(Number(shape.rx ?? 0.1) * 600)}" ry="${roundForSvg(Number(shape.ry ?? 0.1) * 276)}" fill="${color}" opacity=".62" />`;
}

function atlasRegionColor(context = '') {
  return {
    coastShelf: '#2d8f9f',
    gulfBasin: '#2777a8',
    islandChain: '#c9b36b',
    shelfBreak: '#1f5f9d',
    deepBasin: '#5442a8',
    straitSill: '#51b6b3',
    riverMouth: '#76b36a',
    openOcean: '#233f8d'
  }[context] ?? '#365f7d';
}

function previewCameraControlsHtml(session = {}) {
  const camera = session.previewCameraState ?? {};
  const presets = ENVIRONMENT_STUDIO_CAMERA_PRESETS.map((preset) => (
    `<button type="button" class="${camera.preset === preset.id ? 'active' : ''}" data-env-studio-camera-preset="${escapeAttr(preset.id)}">${escapeHtml(preset.label)}</button>`
  )).join('');
  return `
    <div class="environment-studio-camera-controls" aria-label="Preview camera controls">
      <div class="environment-studio-camera-row">
        ${presets}
        <button type="button" data-env-studio-camera-action="reset">Reset View</button>
      </div>
      <div class="environment-studio-camera-row">
        <button type="button" data-env-studio-camera-action="orbit-left">Rotate Left</button>
        <button type="button" data-env-studio-camera-action="orbit-right">Rotate Right</button>
        <button type="button" data-env-studio-camera-action="pan-left">Pan Left</button>
        <button type="button" data-env-studio-camera-action="pan-right">Pan Right</button>
        <button type="button" data-env-studio-camera-action="zoom-in">Zoom In</button>
        <button type="button" data-env-studio-camera-action="zoom-out">Zoom Out</button>
      </div>
      <label class="environment-studio-camera-slider">
        Vertical exaggeration
        <input id="env-studio-vertical-exaggeration" type="range" min="0.5" max="4" step="0.1" value="${escapeAttr(camera.verticalExaggeration ?? 1.6)}" data-env-studio-vertical-exaggeration />
        <span>${escapeHtml(formatNumber(camera.verticalExaggeration ?? 1.6))}x</span>
      </label>
    </div>
  `;
}

function bindEnvironmentStudioPreviewControls(scene, root) {
  root?.querySelectorAll?.('[data-env-studio-camera-preset]')?.forEach((button) => {
    button.addEventListener('click', () => {
      const preset = button.getAttribute('data-env-studio-camera-preset') ?? 'oblique';
      const patch = preset === 'topDown'
        ? { preset, pitchDegrees: 85, yawDegrees: 0, zoom: scene.session.previewCameraState?.zoom ?? 1 }
        : preset === 'crossSection'
          ? { preset, pitchDegrees: 32, yawDegrees: 0, zoom: scene.session.previewCameraState?.zoom ?? 1.15 }
          : { preset, pitchDegrees: 54, yawDegrees: -32, zoom: scene.session.previewCameraState?.zoom ?? 1 };
      scene.updatePreviewCamera(patch);
    });
  });
  root?.querySelectorAll?.('[data-env-studio-camera-action]')?.forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.getAttribute('data-env-studio-camera-action');
      const camera = scene.session.previewCameraState ?? {};
      if (action === 'reset') scene.updatePreviewCamera({ preset: 'oblique', yawDegrees: -32, pitchDegrees: 54, panX: 0, panY: 0, zoom: 1, verticalExaggeration: 1.6 });
      if (action === 'orbit-left') scene.updatePreviewCamera({ yawDegrees: Number(camera.yawDegrees ?? 0) - 18, preset: 'oblique' });
      if (action === 'orbit-right') scene.updatePreviewCamera({ yawDegrees: Number(camera.yawDegrees ?? 0) + 18, preset: 'oblique' });
      if (action === 'pan-left') scene.updatePreviewCamera({ panX: Number(camera.panX ?? 0) - 18 });
      if (action === 'pan-right') scene.updatePreviewCamera({ panX: Number(camera.panX ?? 0) + 18 });
      if (action === 'zoom-in') scene.updatePreviewCamera({ zoom: Number(camera.zoom ?? 1) + 0.2 });
      if (action === 'zoom-out') scene.updatePreviewCamera({ zoom: Number(camera.zoom ?? 1) - 0.2 });
    });
  });
  root?.querySelector?.('[data-env-studio-vertical-exaggeration]')?.addEventListener('input', (event) => {
    scene.updatePreviewCamera({ verticalExaggeration: Number(event.target.value) });
  });
}

function previewModeHtml(session = {}) {
  if (!session.tiles.length) return emptyPreviewHtml();
  if (session.previewMode === 'topDownDepthMap') {
    return `
      <section class="environment-studio-mode-panel">
        <h2>Top-Down Depth Map</h2>
        <p>Source grid diagnostic view. Source grid: ${escapeHtml(session.sourceGridShape.columns)} x ${escapeHtml(session.sourceGridShape.rows)}.</p>
        ${tilesPreviewHtml(session.tiles, session.mosaic)}
      </section>
    `;
  }
  if (session.previewMode === 'seamDiagnostics') return seamDiagnosticsHtml(session);
  if (session.previewMode === 'slopeDiagnostics') return diagnosticSummaryHtml(session, 'Slope Diagnostics', 'Slope warnings are heuristic gradients from generated public bathymetry.', 'canyonLikeGradientCount');
  if (session.previewMode === 'wetLandMask') return diagnosticSummaryHtml(session, 'Wet / Land Mask', 'Wet and land fractions are derived from bottomDepthMeters, not hidden truth.', 'wetFraction');
  if (session.previewMode === 'crossSectionProfile') return crossSectionHtml(session);
  if (session.previewMode === 'multiGliderSuitability') return suitabilityModeHtml(session);
  return terrainPreviewHtml(session);
}

function terrainPreviewHtml(session = {}) {
  const grid = compositePreviewGrid(session.tiles);
  return `
    <section class="environment-studio-terrain-preview" data-env-studio-terrain-preview>
      <h2>Regional 3D Bathymetry Preview</h2>
      <div class="environment-studio-preview-meta">
        ${metricHtml('Preview', '3D Bathymetry')}
        ${metricHtml('Source Grid', `${session.sourceGridShape.columns} x ${session.sourceGridShape.rows}`)}
        ${metricHtml('Preview Mesh', `${session.previewGridShape.columns} x ${session.previewGridShape.rows}`)}
        ${metricHtml('Decimation', `${session.previewDecimation.factor}x`)}
        ${metricHtml('Preview Budget', session.previewBudget?.label ?? 'Not measured')}
        ${metricHtml('Camera', `${labelize(session.previewCameraState?.preset ?? 'oblique')} ${formatNumber(session.previewCameraState?.verticalExaggeration ?? 1.6)}x`)}
        ${metricHtml('Depth Range', `0-${formatNumber(session.regionalFeatureSummary?.deepestBasinDepthMeters)} m`)}
      </div>
      ${terrainSvgHtml(grid, session)}
      <div class="environment-studio-depth-ramp" aria-label="Depth color ramp">
        <span style="background:${depthColor(8)}">shallow</span>
        <span style="background:${depthColor(90)}">shelf</span>
        <span style="background:${depthColor(180)}">slope</span>
        <span style="background:${depthColor(320)}">deep</span>
      </div>
      ${featureRecordButtonsHtml(session.featureRecords, session.selectedObject)}
      <p class="hud-muted">Continuous regional preview over the canonical 2.5D bottom surface h(x,y). Source grid export remains deterministic and reproducible.</p>
      <details class="environment-studio-source-diagnostics" data-env-studio-source-diagnostics>
        <summary>Source Tile Diagnostics</summary>
        <p class="hud-muted">Source tiles are provenance components used to assemble the synthetic regional surface. They are not depth slabs or water-column layers.</p>
        ${tilesPreviewHtml(session.tiles, session.mosaic)}
      </details>
    </section>
  `;
}

function terrainSvgHtml(grid = [], session = {}) {
  const rows = grid.length;
  const columns = grid[0]?.length ?? 0;
  if (!rows || !columns) return emptyPreviewHtml();
  const maxDepthInput = session.regionalFeatureSummary?.deepestBasinDepthMeters ?? session.domainSpec?.vertical?.maxDepthMeters ?? 320;
  const maxDepth = Math.max(1, Number(maxDepthInput) || 320);
  const camera = session.previewCameraState ?? {};
  const zoom = Math.max(0.6, Math.min(2.6, Number(camera.zoom ?? 1)));
  const verticalExaggeration = Math.max(0.5, Math.min(4, Number(camera.verticalExaggeration ?? 1.6)));
  const yaw = Number(camera.yawDegrees ?? -32) * Math.PI / 180;
  const topDown = camera.preset === 'topDown';
  const crossSection = camera.preset === 'crossSection';
  const panX = Number(camera.panX ?? 0);
  const panY = Number(camera.panY ?? 0);
  const rowStep = Math.max(1, Math.floor(rows / 18));
  const colStep = Math.max(1, Math.floor(columns / 28));
  const lines = [];
  const project = (x, y, depth) => {
    const nx = columns > 1 ? x / (columns - 1) - 0.5 : 0;
    const ny = rows > 1 ? y / (rows - 1) - 0.5 : 0;
    if (topDown) {
      return [
        70 + (nx + 0.5) * 580 * zoom + panX,
        52 + (ny + 0.5) * 250 * zoom + panY
      ];
    }
    const rx = nx * Math.cos(yaw) - ny * Math.sin(yaw);
    const ry = nx * Math.sin(yaw) + ny * Math.cos(yaw);
    return [
      360 + rx * 610 * zoom + panX,
      178 + ry * 250 * zoom - (depth / maxDepth) * 74 * verticalExaggeration + panY
    ];
  };
  for (let y = 0; y < rows; y += rowStep) {
    const points = [];
    let averageDepth = 0;
    let count = 0;
    for (let x = 0; x < columns; x += colStep) {
      const depth = Number(grid[y]?.[x] ?? 0);
      const [px, py] = project(x, y, depth);
      points.push(`${roundForSvg(px)},${roundForSvg(py)}`);
      averageDepth += depth;
      count += 1;
    }
    lines.push(`<polyline points="${points.join(' ')}" stroke="${depthColor(averageDepth / Math.max(1, count))}" />`);
  }
  for (let x = 0; x < columns; x += colStep) {
    const points = [];
    let averageDepth = 0;
    let count = 0;
    for (let y = 0; y < rows; y += rowStep) {
      const depth = Number(grid[y]?.[x] ?? 0);
      const [px, py] = project(x, y, depth);
      points.push(`${roundForSvg(px)},${roundForSvg(py)}`);
      averageDepth += depth;
      count += 1;
    }
    lines.push(`<polyline points="${points.join(' ')}" stroke="${depthColor(averageDepth / Math.max(1, count))}" />`);
  }
  const tileBoundary = topDown
    ? '<path d="M360 52 L360 302 M70 177 L650 177" stroke="rgba(255,255,255,0.34)" stroke-dasharray="5 5" />'
    : '<path d="M98 178 L622 178 M360 72 L360 300" stroke="rgba(255,255,255,0.26)" stroke-dasharray="5 5" />';
  const coastline = topDown
    ? '<path d="M82 58 C132 82 114 122 154 160 C118 208 146 254 102 296" stroke="#f8f4d8" stroke-width="3" fill="none" />'
    : '<path d="M124 116 C182 136 192 172 242 202 C190 226 218 264 158 294" stroke="#f8f4d8" stroke-width="3" fill="none" />';
  const crossSectionOverlay = crossSection
    ? '<path d="M76 178 L644 178" stroke="#f9e16c" stroke-width="3" stroke-dasharray="10 6" /><text x="84" y="168">cross-section overlay</text>'
    : '';
  const featureLabels = featureSvgLabels(session, project, columns, rows, maxDepth);
  return `
    <svg class="environment-studio-3d-svg" role="img" aria-label="3D bathymetry mesh preview" viewBox="0 0 720 360" preserveAspectRatio="xMidYMid meet">
      <rect x="0" y="0" width="720" height="360" rx="8" fill="rgba(2, 8, 18, 0.82)" />
      ${coastline}
      ${tileBoundary}
      <g class="environment-studio-terrain-lines">${lines.join('')}</g>
      ${crossSectionOverlay}
      ${featureLabels}
      <line x1="520" y1="326" x2="650" y2="326" stroke="#f8f4d8" stroke-width="4" />
      <text x="520" y="318">scale bar</text>
      <text x="22" y="32">Regional 3D Bathymetry Preview</text>
      <text x="22" y="52">Vertical scale exaggerated for inspection only</text>
    </svg>
  `;
}

function featureRecordButtonsHtml(records = [], selected = {}) {
  if (!records.length) {
    return '<div class="hud-muted">Generate a regional mosaic to inspect shelf, basin, canyon, island, and ridge features.</div>';
  }
  return `
    <div class="environment-studio-feature-records" aria-label="Regional feature records">
      ${records.map((record) => `
        <button type="button" class="${selected?.type === 'feature' && selected.id === record.featureId ? 'active' : ''}" data-env-studio-select data-env-studio-select-type="feature" data-env-studio-select-id="${escapeAttr(record.featureId)}">
          <strong>${escapeHtml(record.label)}</strong>
          <span>${escapeHtml(labelize(record.type))} - ${escapeHtml(formatNumber(record.confidence))}</span>
        </button>
      `).join('')}
    </div>
  `;
}

function featureSvgLabels(session = {}, project, columns, rows, maxDepth) {
  const records = (session.featureRecords ?? []).slice(0, 7);
  if (!records.length) return '';
  const width = Math.max(1, Number(session.domainSpec?.horizontal?.widthMeters ?? 1));
  const height = Math.max(1, Number(session.domainSpec?.horizontal?.heightMeters ?? 1));
  return records.map((record) => {
    const x = (record.approximateCenterMeters?.eastMeters ?? width * 0.5) / width * Math.max(1, columns - 1);
    const y = (record.approximateCenterMeters?.northMeters ?? height * 0.5) / height * Math.max(1, rows - 1);
    const depth = Math.min(maxDepth, Math.max(0, Number(record.depthRangeMeters?.[1] ?? maxDepth) * 0.55));
    const [px, py] = project(x, y, depth);
    const selected = session.selectedObject?.type === 'feature' && session.selectedObject?.id === record.featureId;
    return `
      <g class="environment-studio-feature-label ${selected ? 'selected' : ''}">
        <circle cx="${roundForSvg(px)}" cy="${roundForSvg(py)}" r="${selected ? 7 : 5}" />
        <text x="${roundForSvg(px + 9)}" y="${roundForSvg(py - 7)}">${escapeHtml(record.label)}</text>
      </g>
    `;
  }).join('');
}

function seamDiagnosticsHtml(session = {}) {
  const seams = session.mosaic?.seamReport?.seams ?? [];
  return `
    <section class="environment-studio-mode-panel">
      <h2>Seam Diagnostics</h2>
      <p>Tile boundaries, seam warnings, and blend status. Shared edges are blended deterministically when the regional mosaic is generated.</p>
      <table class="environment-studio-table">
        <thead><tr><th>Seam</th><th>Status</th><th>Max Delta</th><th>Inspect</th></tr></thead>
        <tbody>
          ${seams.length ? seams.map((seam) => `
            <tr>
              <td>${escapeHtml(seam.fromTileId)} ${escapeHtml(seam.edgePair)} ${escapeHtml(seam.toTileId)}</td>
              <td>${escapeHtml(seam.passed ? 'PASS' : 'FAIL')}</td>
              <td>${escapeHtml(formatNumber(seam.maxDeltaMeters))} m</td>
              <td><button type="button" data-env-studio-select data-env-studio-select-type="seam" data-env-studio-select-id="${escapeAttr(localSeamId(seam))}">Inspect seam</button></td>
            </tr>
          `).join('') : '<tr><td colspan="4">Generate a mosaic to inspect seams.</td></tr>'}
        </tbody>
      </table>
      ${tilesPreviewHtml(session.tiles, session.mosaic)}
    </section>
  `;
}

function diagnosticSummaryHtml(session = {}, title = 'Diagnostics', copy = '', metricKey = 'wetFraction') {
  const value = session.regionalFeatureSummary?.[metricKey] ?? session.regionalFeatureSummary?.slopeRange?.maxMetersPerCell ?? 0;
  return `
    <section class="environment-studio-mode-panel">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(copy)}</p>
      <div class="cell-inspector-metrics">
        ${metricHtml(labelize(metricKey), formatNumber(value))}
        ${metricHtml('Feature Diversity', formatNumber(session.regionalFeatureSummary?.featureDiversityScore))}
        ${metricHtml('Wet Fraction', formatNumber(session.regionalFeatureSummary?.wetFraction))}
        ${metricHtml('Land Fraction', formatNumber(session.regionalFeatureSummary?.landFraction))}
      </div>
      ${tilesPreviewHtml(session.tiles, session.mosaic)}
    </section>
  `;
}

function crossSectionHtml(session = {}) {
  const grid = compositePreviewGrid(session.tiles);
  return `
    <section class="environment-studio-mode-panel">
      <h2>Cross-Section Profile</h2>
      <p>East-west and north-south centerlines show bottom depth, tile/feature transitions, and max-depth context.</p>
      <div class="environment-studio-cross-sections">
        ${profileSvgHtml(grid, 'East-West Centerline', 'ew')}
        ${profileSvgHtml(grid, 'North-South Centerline', 'ns')}
      </div>
    </section>
  `;
}

function profileSvgHtml(grid = [], label = 'Profile', direction = 'ew') {
  const rows = grid.length;
  const columns = grid[0]?.length ?? 0;
  if (!rows || !columns) return '';
  const samples = [];
  const maxDepth = Math.max(1, ...grid.flat().map(Number).filter(Number.isFinite));
  const count = direction === 'ew' ? columns : rows;
  const fixed = direction === 'ew' ? Math.floor(rows / 2) : Math.floor(columns / 2);
  for (let index = 0; index < count; index += 1) {
    const depth = direction === 'ew' ? Number(grid[fixed]?.[index] ?? 0) : Number(grid[index]?.[fixed] ?? 0);
    const x = 12 + (index / Math.max(1, count - 1)) * 316;
    const y = 24 + (depth / maxDepth) * 116;
    samples.push(`${roundForSvg(x)},${roundForSvg(y)}`);
  }
  return `
    <svg class="environment-studio-profile-svg" role="img" aria-label="${escapeAttr(label)}" viewBox="0 0 340 160">
      <rect x="0" y="0" width="340" height="160" rx="8" fill="rgba(2, 8, 18, 0.76)" />
      <polyline points="${samples.join(' ')}" />
      <text x="12" y="18">${escapeHtml(label)}</text>
      <text x="12" y="150">shallow</text>
      <text x="260" y="150">deep ${escapeHtml(formatNumber(maxDepth))} m</text>
    </svg>
  `;
}

function suitabilityModeHtml(session = {}) {
  return `
    <section class="environment-studio-mode-panel">
      <h2>Multi-Glider Suitability</h2>
      ${suitabilityHtml(session.multiGliderSuitability)}
      ${featureSummaryHtml(session.regionalFeatureSummary)}
    </section>
  `;
}

function tilesPreviewHtml(tiles = [], mosaic = null) {
  const classes = mosaic?.manifest ? 'environment-studio-mosaic-preview' : 'environment-studio-single-tile-preview';
  return `
    <div class="${classes}">
      ${tiles.map((tile) => tilePreviewHtml(tile)).join('')}
    </div>
  `;
}

function tilePreviewHtml(tile = {}) {
  const grid = tile.bottomDepthPreview ?? [];
  const rows = grid.length;
  const columns = grid[0]?.length ?? 0;
  return `
    <article class="environment-studio-tile-preview" data-env-studio-tile-id="${escapeAttr(tile.id)}" data-env-studio-select data-env-studio-select-type="tile" data-env-studio-select-id="${escapeAttr(tile.id)}" tabindex="0" role="button" aria-label="Inspect ${escapeAttr(tile.id)}">
      <header>
        <strong>${escapeHtml(tile.id)}</strong>
        <span>${escapeHtml(tile.manifest?.cells?.columns ?? columns)} x ${escapeHtml(tile.manifest?.cells?.rows ?? rows)} - ${escapeHtml(tile.featureRole ?? tile.archetypeId)}</span>
      </header>
      <div class="environment-studio-depth-grid" style="grid-template-columns: repeat(${columns}, minmax(0, 1fr));">
        ${grid.flatMap((row) => row.map((depth) => `<span style="background:${depthColor(depth)}" title="${escapeAttr(formatNumber(depth))} m"></span>`)).join('')}
      </div>
      <footer>
        <span>Wet ${escapeHtml(tile.diagnostics?.wetCellCount ?? 0)}</span>
        <span>Max ${escapeHtml(formatNumber(tile.diagnostics?.maxDepthMeters))} m</span>
      </footer>
    </article>
  `;
}

function emptyPreviewHtml() {
  return `
    <article class="environment-studio-empty-preview">
      <h2>No Region Generated</h2>
      <p>Use Regenerate all to create a deterministic multi-archetype regional bathymetry preview. No hidden truth, current regeneration, scalar regeneration, or scoring change occurs.</p>
    </article>
  `;
}

function compositePreviewGrid(tiles = []) {
  if (!tiles.length) return [];
  if (tiles.length === 1) return tiles[0].bottomDepthPreview ?? [];
  const byPosition = new Map(tiles.map((tile) => [`${tile.manifest?.tileCoordinate?.row ?? 0}:${tile.manifest?.tileCoordinate?.column ?? 0}`, tile.bottomDepthPreview ?? []]));
  const nw = byPosition.get('0:0') ?? [];
  const ne = byPosition.get('0:1') ?? [];
  const sw = byPosition.get('1:0') ?? [];
  const se = byPosition.get('1:1') ?? [];
  const topRows = Math.max(nw.length, ne.length);
  const bottomRows = Math.max(sw.length, se.length);
  const top = Array.from({ length: topRows }, (_row, y) => [...(nw[y] ?? []), ...(ne[y] ?? [])]);
  const bottom = Array.from({ length: bottomRows }, (_row, y) => [...(sw[y] ?? []), ...(se[y] ?? [])]);
  return [...top, ...bottom];
}

function featureSummaryHtml(summary = {}) {
  return `
    <div class="environment-studio-summary-grid">
      ${metricHtml('Land fraction', formatNumber(summary.landFraction))}
      ${metricHtml('Wet fraction', formatNumber(summary.wetFraction))}
      ${metricHtml('Shallow shelf', formatNumber(summary.shallowShelfFraction))}
      ${metricHtml('Deep water', formatNumber(summary.deepWaterFraction))}
      ${metricHtml('Deepest basin', `${formatNumber(summary.deepestBasinDepthMeters)} m`)}
      ${metricHtml('Coastline estimate', `${formatNumber(summary.coastlineLengthEstimateMeters)} m`)}
      ${metricHtml('Canyon gradients', summary.canyonLikeGradientCount ?? 0)}
      ${metricHtml('Island / seamount', summary.islandSeamountCount ?? 0)}
      ${metricHtml('Connected water', formatNumber(summary.navigableConnectedWaterFraction))}
      ${metricHtml('Feature diversity', formatNumber(summary.featureDiversityScore))}
    </div>
    <p class="hud-muted">Feature summary is a mission-design heuristic, not official science validation.</p>
  `;
}

function suitabilityHtml(suitability = {}) {
  const checks = suitability.checks ?? [];
  return `
    <div class="environment-studio-suitability environment-studio-suitability-${escapeAttr(String(suitability.status ?? 'warn').toLowerCase())}">
      <strong>${escapeHtml(suitability.status ?? 'WARN')}</strong>
      <span>${escapeHtml(suitability.summary ?? 'Generate regional bathymetry to evaluate mission suitability.')}</span>
    </div>
    <div class="environment-studio-validation-list">
      ${checks.map((check) => `<button type="button" data-env-studio-select data-env-studio-select-type="validationIssue" data-env-studio-select-id="warning:${escapeAttr(check.id)}"><strong>${escapeHtml(check.passed ? 'PASS' : 'WARN')}</strong><span>${escapeHtml(labelize(check.id))}: ${escapeHtml(check.value)}</span></button>`).join('')}
    </div>
  `;
}

function inspectorPropertiesHtml(inspector = {}) {
  const rows = inspector.properties ?? [];
  return `
    <table class="environment-studio-table">
      <thead><tr><th>Property</th><th>Value</th></tr></thead>
      <tbody>
        ${rows.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value ?? 'n/a')}</td></tr>`).join('')}
      </tbody>
    </table>
  `;
}

function inspectorActionsHtml(inspector = {}) {
  const actions = inspector.actions ?? [];
  if (!actions.length) return '';
  return `
    <div class="environment-studio-action-list">
      ${actions.map((action) => `<button type="button" ${action.enabled ? '' : 'disabled'} title="${escapeAttr(action.reason ?? '')}">${escapeHtml(action.label)}${action.enabled ? '' : ' - planned'}</button>`).join('')}
    </div>
  `;
}

function fieldRegenerationSummaryHtml(result = null) {
  if (!result?.currentArtifactDigest) {
    return '<div class="hud-muted">Currents, scalar science field, and hotspots have not been regenerated for this region yet.</div>';
  }
  const currentDiagnostics = result.currentDiagnostics ?? {};
  const scalarDiagnostics = result.scalarDiagnostics ?? {};
  return `
    <div class="cell-inspector-metrics">
      ${metricHtml('Field regen', shortDigest(result.fieldRegenerationDigest))}
      ${metricHtml('Current artifact', shortDigest(result.currentArtifactDigest))}
      ${metricHtml('Scalar artifact', shortDigest(result.scalarArtifactDigest))}
      ${metricHtml('Hotspots', `${result.hotspotArtifact?.hotspots?.length ?? 0} / ${shortDigest(result.hotspotArtifactDigest)}`)}
      ${metricHtml('Mean speed', formatNumber(currentDiagnostics.speedMean))}
      ${metricHtml('Max speed', formatNumber(currentDiagnostics.speedMaximum))}
      ${metricHtml('Divergence RMS', formatNumber(currentDiagnostics.divergenceRms))}
      ${metricHtml('Land vectors', currentDiagnostics.landVectorCount ?? 0)}
      ${metricHtml('Below-bottom vectors', currentDiagnostics.belowBottomVectorCount ?? 0)}
      ${metricHtml('Scalar mean', formatNumber(scalarDiagnostics.scalarMean))}
      ${metricHtml('Depth variation', formatNumber(scalarDiagnostics.depthMeanRange))}
      ${metricHtml('Start/drop candidates', result.startDropZoneCandidates?.candidates?.length ?? 0)}
      ${metricHtml('Hazards', result.hazardCandidates ? `${result.hazardCandidates.candidates?.length ?? 0} / ${shortDigest(result.hazardCandidateDigest)}` : 'deferred')}
      ${metricHtml('Environment artifact', result.environmentArtifactStatus ?? 'REQUIRES_COMPOSITION')}
      ${metricHtml('Environment digest', shortDigest(result.environmentArtifactDigest))}
    </div>
    <p class="hud-muted">${escapeHtml(result.sourceLabel ?? 'Package artifacts are synthetic and compactly recorded here.')} Starts/drop zones still need validation; launch and scoring are unchanged.</p>
  `;
}

function referenceEnvironmentLaunchSummaryHtml(session = {}) {
  const launch = session.launchValidationResult;
  const benchmark = session.benchmarkBundleResult;
  const composition = session.environmentCompositionResult;
  if (!session.fieldRegenerationResult?.currentArtifactDigest && !composition && !launch && !benchmark) return '';
  const field = session.fieldRegenerationResult ?? {};
  const warningSummary = launch?.warningSummary ?? {};
  const launchReadyMessage = launch?.planningLaunchReady && launch?.status === 'WARN'
    ? '<div class="hud-muted warning">Launch ready with non-blocking warnings.</div>'
    : launch?.planningLaunchReady
      ? '<div class="hud-muted">Launch ready.</div>'
      : launch
        ? '<div class="hud-muted warning">Launch is blocked or needs review.</div>'
        : '<div class="hud-muted">Run launch validation before launching to Planning.</div>';
  return `
    <div class="cell-inspector-metrics">
      ${metricHtml('Reference Bathymetry', session.bathymetryArtifactDigest ? 'CURRENT' : 'NOT_GENERATED')}
      ${metricHtml('Currents', field.currentArtifactDigest ? 'CURRENT' : 'REQUIRES_REGENERATION')}
      ${metricHtml('Scalars', field.scalarArtifactDigest ? 'CURRENT' : 'REQUIRES_REGENERATION')}
      ${metricHtml('Hotspots', field.hotspotArtifactDigest ? 'CURRENT' : 'REQUIRES_REGENERATION')}
      ${metricHtml('Hazards', field.hazardCandidateDigest ? 'CURRENT' : 'REQUIRES_REGENERATION')}
      ${metricHtml('Starts/Drop Zones', launch?.startDropZoneValidation?.status ?? session.dependencyGraph?.nodes?.startsDropZones?.state ?? 'NEEDS_VALIDATION')}
      ${metricHtml('Environment Artifact', composition?.environmentArtifactStatus ?? field.environmentArtifactStatus ?? 'pending')}
      ${metricHtml('Launch Validation', launch?.status ?? 'not run')}
      ${metricHtml('Planning ready', launch?.planningLaunchReady ? 'yes' : 'no')}
      ${metricHtml('Warnings', launch ? `${warningSummary.totalWarningCount ?? launch.warnings?.length ?? 0} / blocking ${warningSummary.blockingWarningCount ?? 0}` : 'not run')}
      ${metricHtml('Failures', warningSummary.failureCount ?? launch?.failures?.length ?? 0)}
      ${metricHtml('Benchmark Bundle', benchmark?.status ?? session.dependencyGraph?.nodes?.benchmarkBundle?.state ?? 'REQUIRES_EXPORT')}
      ${metricHtml('Benchmark digest', shortDigest(benchmark?.benchmarkBundleDigest))}
    </div>
    ${launchReadyMessage}
    ${launchWarningListHtml(launch)}
    <p class="hud-muted">Launch uses validated start/drop-zone metadata and package-backed public fields. Environment Studio does not generate a route, change scoring, or become the simulator.</p>
  `;
}

function launchWarningListHtml(launch = null) {
  const warnings = (launch?.warnings ?? []).filter((warning) => warning.severity !== 'INFO').slice(0, 5);
  if (!launch) return '';
  if (!warnings.length) return '<div class="hud-muted">No advisory or warning items after launch validation.</div>';
  return `
    <div class="environment-studio-validation-list" data-reference-launch-warnings>
      ${warnings.map((warning) => `
        <button type="button" data-env-studio-select data-env-studio-select-type="validationIssue" data-env-studio-select-id="warning:${escapeAttr(warning.warningId)}">
          <strong>${escapeHtml(warning.severity)}</strong>
          <span>${escapeHtml(warning.title)}: ${escapeHtml(warning.explanation)}</span>
        </button>
      `).join('')}
    </div>
  `;
}

function dependencyGraphTable(graph = {}) {
  const nodes = dependencyRows(graph);
  return `
    <table class="environment-studio-table">
      <thead><tr><th>Artifact</th><th>State</th><th>Digest</th></tr></thead>
      <tbody>
        ${nodes.map((node) => `
          <tr data-env-studio-select data-env-studio-select-type="dependency" data-env-studio-select-id="${escapeAttr(node.id)}" tabindex="0" role="button">
            <td>${escapeHtml(labelize(node.id))}</td>
            <td><span class="environment-studio-state environment-studio-state-${escapeAttr(String(node.state).toLowerCase())}">${escapeHtml(node.state)}</span></td>
            <td>${escapeHtml(shortDigest(node.artifactDigest))}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function dependencyRows(graph = {}) {
  const nodes = graph.nodes ?? {};
  const bathymetryState = nodes.bathymetryArtifact?.state ?? 'NOT_GENERATED';
  const bathymetryDigest = nodes.bathymetryArtifact?.artifactDigest ?? null;
  const generated = bathymetryState === 'CURRENT';
  return [
    { id: 'bathymetryTiles', ...(nodes.bathymetryTiles ?? {}) },
    { id: 'bathymetryArtifact', ...(nodes.bathymetryArtifact ?? {}) },
    { id: 'wetLandMask', state: generated ? 'CURRENT' : 'NOT_GENERATED', artifactDigest: bathymetryDigest, ...(nodes.wetLandMask ?? {}) },
    { id: 'coastline', state: generated ? 'CURRENT' : 'NOT_GENERATED', artifactDigest: bathymetryDigest, ...(nodes.coastline ?? {}) },
    { id: 'currentArtifact', ...(nodes.currentArtifact ?? {}) },
    { id: 'scalarArtifact', ...(nodes.scalarArtifact ?? {}) },
    { id: 'hotspots', state: generated ? 'REQUIRES_REGENERATION' : 'NOT_GENERATED', artifactDigest: null, ...(nodes.hotspots ?? {}) },
    { id: 'hazards', state: generated ? 'REQUIRES_REGENERATION' : 'NOT_GENERATED', artifactDigest: null, ...(nodes.hazards ?? {}) },
    { id: 'startsDropZones', state: generated ? 'NEEDS_VALIDATION' : 'NOT_GENERATED', artifactDigest: null, ...(nodes.startsDropZones ?? {}) },
    { id: 'benchmarkBundle', state: generated ? 'REQUIRES_REGENERATION' : 'NOT_GENERATED', artifactDigest: null, ...(nodes.benchmarkBundle ?? {}) },
    { id: 'environmentArtifact', ...(nodes.environmentArtifact ?? {}) },
    { id: 'validationReport', ...(nodes.validationReport ?? {}) },
    { id: 'preview', ...(nodes.preview ?? {}) }
  ].map((row) => ({ id: row.id, state: row.state ?? 'NOT_GENERATED', artifactDigest: row.artifactDigest ?? null, reason: row.reason ?? null }));
}

function validationListHtml(report = {}) {
  const errors = report.errors ?? [];
  const warnings = report.warnings ?? [];
  const rows = [
    ...errors.map((message) => ({ kind: 'Failure', message })),
    ...warnings.slice(0, 8).map((message) => ({ kind: 'Warning', message }))
  ];
  if (!rows.length) return '<div class="hud-muted">Validation has no failures or warnings.</div>';
  return `
    <div class="environment-studio-validation-list">
      ${rows.map((row, index) => `<button type="button" data-env-studio-select data-env-studio-select-type="validationIssue" data-env-studio-select-id="${row.kind === 'Failure' ? 'error' : 'warning'}:${index}"><strong>${escapeHtml(row.kind)}</strong><span>${escapeHtml(row.message)}</span></button>`).join('')}
    </div>
  `;
}

function numberInput(label, id, value, min, max, step) {
  return `
    <label class="compact-field">
      ${escapeHtml(label)}
      <input id="${escapeAttr(id)}" type="number" min="${escapeAttr(min)}" max="${escapeAttr(max)}" step="${escapeAttr(step)}" value="${escapeAttr(formatInputNumber(value))}" />
    </label>
  `;
}

function rangeInput(label, id, value, min, max, step) {
  return `
    <label class="compact-field environment-studio-range-field">
      <span>${escapeHtml(label)} <output data-env-world-control-value="${escapeAttr(id)}">${escapeHtml(formatNumber(value))}</output></span>
      <input id="${escapeAttr(id)}" data-env-world-generator-control type="range" min="${escapeAttr(min)}" max="${escapeAttr(max)}" step="${escapeAttr(step)}" value="${escapeAttr(formatInputNumber(value))}" />
    </label>
  `;
}

function selectInput(label, id, selectedValue, options = []) {
  return `
    <label class="compact-field">
      ${escapeHtml(label)}
      <select id="${escapeAttr(id)}">
        ${options.map((option) => `<option value="${escapeAttr(option.id)}" ${option.id === selectedValue ? 'selected' : ''} ${option.enabled === false ? 'disabled' : ''}>${escapeHtml(option.label)}</option>`).join('')}
      </select>
    </label>
  `;
}

function levelSelect(label, id, selectedValue) {
  return selectInput(label, id, selectedValue, [
    { id: 'low', label: 'Low' },
    { id: 'medium', label: 'Medium' },
    { id: 'high', label: 'High' }
  ]);
}

function metricHtml(label, value) {
  return `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value ?? 'n/a')}</strong></div>`;
}

function estimatedCostLabel(sourceCells, previewCells) {
  const source = Number(sourceCells) || 0;
  const preview = Number(previewCells) || 0;
  if (source > 50000 || preview > 2200) return 'high but bounded';
  if (source > 15000 || preview > 1000) return 'moderate';
  return 'low';
}

function localSeamId(seam = {}) {
  return `${seam.fromTileId}:${seam.edgePair}:${seam.toTileId}`;
}

function roundForSvg(value) {
  const number = Number(value);
  return Number.isFinite(number) ? String(Math.round(number * 10) / 10) : '0';
}

function archetypeDescription(id) {
  return ENVIRONMENT_STUDIO_BATHYMETRY_ARCHETYPES.find((entry) => entry.id === id)?.description ?? 'Synthetic public-safe bathymetry archetype.';
}

function depthColor(depth) {
  const value = Number(depth);
  if (!Number.isFinite(value) || value <= 0) return '#3d4931';
  const t = Math.min(1, Math.max(0, value / 320));
  if (t < 0.18) return '#38a7a3';
  if (t < 0.42) return '#24759b';
  if (t < 0.68) return '#174c85';
  return '#0d2454';
}

function formatInputNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? String(Math.round(number * 1000) / 1000) : '0';
}

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? String(Math.round(number * 10) / 10) : 'n/a';
}

function formatInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) ? String(Math.round(number)) : 'n/a';
}

function roundMetric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 1000000) / 1000000 : 0;
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function shortDigest(value) {
  const text = String(value ?? '');
  return text ? text.replace(/^fnv1a32:/, '') : 'none';
}

function labelize(value) {
  return String(value ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}
