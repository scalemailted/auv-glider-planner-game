import {
  normalizeWaterColumnConfig,
  normalizeWaterColumnLayerId,
  normalizeWaterColumnProfileId,
  waterColumnLayerOptions,
  waterColumnProfileOptions
} from '../science/WaterColumnSchema.js';

export const CONTINUOUS_MISSION_UI_STATE_VERSION = 'continuous-mission-ui-state-three-r1-2a-3-1';

export const WAYPOINT_SNAP_MODES = ['freePlacement', 'snapToCellCenters', 'snapToFeature'];
export const VOLUME_RENDER_MODES = ['layerSlices', 'smoothedSlices', 'volumetricCloud', 'hybrid'];

export function normalizeContinuousMissionUiState(input = {}) {
  const source = input.state ?? input;
  const ui = source.ui ?? input.ui ?? {};
  const waterColumnUi = input.waterColumn ?? source.waterColumn ?? ui.waterColumn ?? {};
  const plan = input.plan ?? source.plan ?? {};
  const mission = input.mission ?? source.mission ?? {};
  const level = input.level ?? source.level ?? {};
  const waterColumnConfig = normalizeWaterColumnConfig(
    input.waterColumnConfig
      ?? level?.world?.waterColumnConfig
      ?? mission?.world?.waterColumnConfig
      ?? mission?.waterColumnConfig
      ?? { depthLayerIds: ['surface'], defaultLayerIds: ['surface'], diveProfileId: 'surfaceOnly' }
  );
  const availableDepthLayerIds = normalizeAvailableDepthLayerIds(waterColumnConfig.depthLayerIds);
  const coordinateProfileId = normalizeCoordinateProfileId(
    input.coordinateProfileId
      ?? source.coordinateProfileId
      ?? plan.coordinateProfileId
      ?? plan.meta?.coordinateProfileId
      ?? mission.coordinateProfileId
      ?? mission.meta?.coordinateProfileId
      ?? level.coordinateProfileId
      ?? level.meta?.coordinateProfileId
      ?? level.world?.coordinateProfileId
  );
  const waypointSnapMode = normalizeWaypointSnapMode(
    input.waypointSnapMode
      ?? source.waypointSnapMode
      ?? source.continuousMission?.waypointSnapMode
      ?? ui.waypointSnapMode
      ?? ui.threeMissionInteraction?.waypointSnapMode,
    coordinateProfileId
  );
  const fieldSamplingProfileId = normalizeFieldSamplingProfileId(
    input.fieldSamplingProfileId
      ?? source.fieldSamplingProfileId
      ?? plan.fieldSamplingProfileId
      ?? plan.meta?.fieldSamplingProfileId
      ?? mission.fieldSamplingProfileId
      ?? mission.meta?.fieldSamplingProfileId
      ?? level.fieldSamplingProfileId
      ?? level.meta?.fieldSamplingProfileId,
    coordinateProfileId
  );
  const volumeRenderMode = normalizeVolumeRenderMode(
    input.volumeRenderMode
      ?? input.scalarRenderMode
      ?? source.volumeRenderMode
      ?? source.continuousMission?.volumeRenderMode
      ?? waterColumnUi.scalarRenderMode
      ?? waterColumnUi.volumeRenderMode
  );
  const activeDepthLayerId = normalizeDepthLayer(
    input.activeDepthLayerId
      ?? source.activeDepthLayerId
      ?? source.continuousMission?.activeDepthLayerId
      ?? waterColumnUi.activeDepthLayerId
      ?? waterColumnConfig.defaultPlanningLayerId
      ?? (availableDepthLayerIds.includes('thermocline') ? 'thermocline' : availableDepthLayerIds[0]),
    availableDepthLayerIds
  );
  const verticalDisplayMode = normalizeVerticalDisplayMode(
    input.verticalDisplayMode
      ?? source.verticalDisplayMode
      ?? source.continuousMission?.verticalDisplayMode
      ?? waterColumnUi.verticalDisplayMode
      ?? waterColumnConfig.defaultDisplayMode
  );
  const selectedDiveProfileId = normalizeWaterColumnProfileId(
    input.selectedDiveProfileId
      ?? source.selectedDiveProfileId
      ?? source.continuousMission?.selectedDiveProfileId
      ?? waterColumnUi.selectedDiveProfileId
      ?? waterColumnConfig.defaultDiveProfileId
      ?? waterColumnConfig.diveProfileId
      ?? 'surfaceOnly'
  );
  const selectedTargetDepthLayerId = normalizeDepthLayer(
    input.selectedTargetDepthLayerId
      ?? source.selectedTargetDepthLayerId
      ?? source.continuousMission?.selectedTargetDepthLayerId
      ?? waterColumnUi.selectedTargetDepthLayerId
      ?? waterColumnConfig.defaultTargetDepthLayerId
      ?? activeDepthLayerId,
    availableDepthLayerIds
  );
  const verticalExaggeration = normalizeVerticalExaggeration(input.verticalExaggeration ?? source.verticalExaggeration ?? source.continuousMission?.verticalExaggeration ?? waterColumnUi.verticalExaggeration);
  const fieldDisplayMode = waterColumnUi.fieldDisplayMode === 'allLayers' || waterColumnUi.showFieldOnAllLayers === true ? 'allLayers' : 'activeLayerOnly';
  const qualityProfile = normalizeThreeQualityProfile(input.qualityProfile ?? source.qualityProfile ?? source.continuousMission?.qualityProfile ?? waterColumnUi.qualityProfile ?? ui.threeMissionQualityProfile);
  const availableDiveProfileIds = normalizeAvailableDiveProfileIds(input.availableDiveProfileIds ?? waterColumnProfileOptions().map((profile) => profile.id));
  const warnings = [];
  if (waypointSnapMode === 'freePlacement' && coordinateProfileId !== 'continuousGridV1') {
    warnings.push('Free placement requires continuousGridV1; snap-to-cell is used instead.');
  }
  if (waypointSnapMode === 'snapToFeature') {
    warnings.push('Snap to Feature currently falls back to canonical feature anchors or cell centers when no supported feature is nearby.');
  }
  if (volumeRenderMode === 'volumetricCloud') {
    warnings.push('Volumetric Cloud uses layered translucent slices in the current WebGL renderer.');
  }
  return {
    version: CONTINUOUS_MISSION_UI_STATE_VERSION,
    coordinateProfileId,
    waypointSnapMode,
    fieldSamplingProfileId,
    volumeRenderProfileId: input.volumeRenderProfileId ?? source.volumeRenderProfileId ?? source.continuousMission?.volumeRenderProfileId ?? 'threeVolumetricScalarFieldLayerV1',
    volumeRenderMode,
    activeDepthLayerId,
    verticalDisplayMode,
    selectedDiveProfileId: availableDiveProfileIds.includes(selectedDiveProfileId) ? selectedDiveProfileId : availableDiveProfileIds[0] ?? 'surfaceOnly',
    selectedTargetDepthLayerId,
    verticalExaggeration,
    fieldDisplayMode,
    showFieldOnAllLayers: fieldDisplayMode === 'allLayers',
    qualityProfile,
    continuousPlacementEnabled: coordinateProfileId === 'continuousGridV1',
    volumetricFieldEnabled: availableDepthLayerIds.length > 1,
    depthPlanningEnabled: availableDepthLayerIds.length > 1,
    availableWaypointSnapModes: WAYPOINT_SNAP_MODES.slice(),
    availableVolumeRenderModes: VOLUME_RENDER_MODES.slice(),
    availableDiveProfileIds,
    availableDepthLayerIds,
    warnings,
    boundaryFlags: {
      usesContinuousWaypoints: coordinateProfileId === 'continuousGridV1',
      usesArbitraryXYZRoutePlanning: false,
      rendererOwnsPlanning: false,
      rendererOwnsSimulation: false,
      rendererOwnsScoring: false
    }
  };
}

export function validateContinuousMissionUiState(state = {}) {
  const errors = [];
  if (state.version !== CONTINUOUS_MISSION_UI_STATE_VERSION) errors.push('Continuous mission UI state version is missing or unsupported.');
  if (!state.coordinateProfileId) errors.push('coordinateProfileId is required.');
  if (!WAYPOINT_SNAP_MODES.includes(state.waypointSnapMode)) errors.push(`Unsupported waypointSnapMode: ${state.waypointSnapMode}`);
  if (!state.fieldSamplingProfileId) errors.push('fieldSamplingProfileId is required.');
  if (!VOLUME_RENDER_MODES.includes(state.volumeRenderMode)) errors.push(`Unsupported volumeRenderMode: ${state.volumeRenderMode}`);
  if (!state.activeDepthLayerId) errors.push('activeDepthLayerId is required.');
  if (!['physicalDepth', 'explodedLayers'].includes(state.verticalDisplayMode)) errors.push(`Unsupported verticalDisplayMode: ${state.verticalDisplayMode}`);
  if (!['activeLayerOnly', 'allLayers'].includes(state.fieldDisplayMode ?? 'activeLayerOnly')) errors.push(`Unsupported fieldDisplayMode: ${state.fieldDisplayMode}`);
  if (!['performance', 'balanced', 'high'].includes(state.qualityProfile ?? 'balanced')) errors.push(`Unsupported qualityProfile: ${state.qualityProfile}`);
  if (!state.selectedDiveProfileId) errors.push('selectedDiveProfileId is required.');
  if (!state.selectedTargetDepthLayerId) errors.push('selectedTargetDepthLayerId is required.');
  if (![1, 2, 4, 8].includes(Number(state.verticalExaggeration))) errors.push('Unsupported verticalExaggeration: ' + state.verticalExaggeration);
  if (state.boundaryFlags?.usesArbitraryXYZRoutePlanning !== false) errors.push('UI state must not claim arbitrary XYZ route planning.');
  if (state.boundaryFlags?.rendererOwnsPlanning !== false) errors.push('Renderer must not own planning.');
  if (state.boundaryFlags?.rendererOwnsSimulation !== false) errors.push('Renderer must not own simulation.');
  if (state.boundaryFlags?.rendererOwnsScoring !== false) errors.push('Renderer must not own scoring.');
  return { valid: errors.length === 0, errors, warnings: state.warnings ?? [] };
}

export function continuousMissionUiStateSummary(state = {}) {
  return {
    type: 'anchor.continuous-mission.ui-state-summary',
    version: state.version ?? CONTINUOUS_MISSION_UI_STATE_VERSION,
    coordinateProfileId: state.coordinateProfileId ?? null,
    waypointSnapMode: state.waypointSnapMode ?? null,
    fieldSamplingProfileId: state.fieldSamplingProfileId ?? null,
    volumeRenderProfileId: state.volumeRenderProfileId ?? null,
    volumeRenderMode: state.volumeRenderMode ?? null,
    activeDepthLayerId: state.activeDepthLayerId ?? null,
    verticalDisplayMode: state.verticalDisplayMode ?? null,
    selectedDiveProfileId: state.selectedDiveProfileId ?? null,
    selectedTargetDepthLayerId: state.selectedTargetDepthLayerId ?? null,
    verticalExaggeration: state.verticalExaggeration ?? 1,
    fieldDisplayMode: state.fieldDisplayMode ?? 'activeLayerOnly',
    showFieldOnAllLayers: state.showFieldOnAllLayers === true,
    qualityProfile: state.qualityProfile ?? 'balanced',
    continuousPlacementEnabled: state.continuousPlacementEnabled === true,
    volumetricFieldEnabled: state.volumetricFieldEnabled === true,
    depthPlanningEnabled: state.depthPlanningEnabled === true,
    availableWaypointSnapModes: state.availableWaypointSnapModes ?? [],
    availableVolumeRenderModes: state.availableVolumeRenderModes ?? [],
    availableDiveProfileIds: state.availableDiveProfileIds ?? [],
    availableDepthLayerIds: state.availableDepthLayerIds ?? [],
    warnings: state.warnings ?? [],
    boundaryFlags: { ...(state.boundaryFlags ?? {}) }
  };
}

export function normalizeWaypointSnapMode(value, coordinateProfileId = 'legacyIntegerCellsV1') {
  const text = String(value ?? '').trim();
  if (text === 'freePlacement' && coordinateProfileId === 'continuousGridV1') return 'freePlacement';
  if (text === 'snapToFeature') return 'snapToFeature';
  if (text === 'snapToCellCenters') return 'snapToCellCenters';
  return coordinateProfileId === 'continuousGridV1' ? 'freePlacement' : 'snapToCellCenters';
}

export function normalizeVolumeRenderMode(value) {
  const text = String(value ?? '').trim();
  return VOLUME_RENDER_MODES.includes(text) ? text : 'smoothedSlices';
}

function normalizeCoordinateProfileId(value) {
  const text = String(value ?? '').trim();
  if (text === 'continuousGridV1') return 'continuousGridV1';
  return 'legacyIntegerCellsV1';
}

function normalizeFieldSamplingProfileId(value, coordinateProfileId) {
  const text = String(value ?? '').trim();
  if (text) return text;
  return coordinateProfileId === 'continuousGridV1' ? 'continuousTrilinearV1' : 'legacyNearestCellV1';
}

function normalizeAvailableDepthLayerIds(ids) {
  const normalized = Array.isArray(ids) ? ids.map((id) => normalizeWaterColumnLayerId(id)).filter(Boolean) : [];
  return normalized.length ? [...new Set(normalized)] : ['surface'];
}

function normalizeDepthLayer(value, availableDepthLayerIds) {
  const normalized = normalizeWaterColumnLayerId(value ?? availableDepthLayerIds[0] ?? 'surface');
  return availableDepthLayerIds.includes(normalized) ? normalized : availableDepthLayerIds[0] ?? 'surface';
}

function normalizeAvailableDiveProfileIds(ids) {
  const normalized = Array.isArray(ids) ? ids.map((id) => normalizeWaterColumnProfileId(id)).filter(Boolean) : [];
  return normalized.length ? [...new Set(normalized)] : ['surfaceOnly'];
}

function normalizeVerticalDisplayMode(value) {
  return value === 'explodedLayers' ? 'explodedLayers' : 'physicalDepth';
}
function normalizeThreeQualityProfile(value) {
  const id = String(value ?? '').trim().toLowerCase();
  if (id === 'performance' || id === 'perf') return 'performance';
  if (id === 'high' || id === 'quality') return 'high';
  return 'balanced';
}

function normalizeVerticalExaggeration(value) {
  const numeric = Number(value);
  if ([1, 2, 4, 8].includes(numeric)) return numeric;
  return 1;
}
