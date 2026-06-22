import { normalizePlanningGuidePreview } from './PlanningGuidePreviewViewModel.js';

export const MISSION_PLANNING_INTERACTION_VIEW_MODEL_VERSION = 'mission-planning-interaction-view-model-three-r1-1';

export function buildMissionPlanningInteractionViewModel({
  missionWorldViewModel = null,
  interactionState = {},
  routePreview = null,
  placementValidation = null,
  guidanceState = null,
  options = {}
} = {}) {
  const warnings = [];
  if (!missionWorldViewModel) warnings.push('Missing mission world view model; interaction overlay is metadata-only.');
  if (options.expectGuidance && !guidanceState) warnings.push('Canonical guidance state unavailable; Three interaction overlay did not fabricate guidance geometry.');
  const hoveredCell = cloneCell(interactionState.hoveredCell ?? missionWorldViewModel?.selectedCell ?? null);
  const hoveredEntity = cloneEntity(interactionState.hoveredEntity);
  const selectedEntity = cloneEntity(interactionState.selectedEntity ?? selectedFromMissionWorld(missionWorldViewModel));
  const dragPreview = normalizePreview(interactionState.dragPreview);
  const normalizedRoutePreview = normalizePreview(routePreview ?? interactionState.routePreview);
  const validation = placementValidation ?? interactionState.placementValidation ?? null;
  return scrubHidden({
    type: 'anchor.rendering.mission-planning-interaction-view-model',
    version: MISSION_PLANNING_INTERACTION_VIEW_MODEL_VERSION,
    interactionMode: interactionState.interactionMode ?? options.interactionMode ?? 'selectInspect',
    planningToolState: clonePlainObject(interactionState.planningToolState ?? null),
    activePlanningToolId: interactionState.activePlanningToolId ?? interactionState.planningToolState?.activeToolId ?? null,
    activePlanningToolLabel: interactionState.activePlanningToolLabel ?? interactionState.planningToolState?.activeToolLabel ?? null,
    planningToolInstruction: interactionState.planningToolInstruction ?? interactionState.planningToolState?.instructions ?? null,
    planningToolCursor: interactionState.planningToolCursor ?? interactionState.planningToolState?.cursorId ?? null,
    hoveredCell,
    hoveredEntity,
    selectedEntity,
    deploymentSelectionActive: interactionState.deploymentSelectionActive === true,
    deploymentAgentId: interactionState.deploymentAgentId ?? null,
    deploymentCandidateCell: cloneCell(interactionState.deploymentCandidateCell),
    deploymentCandidateValid: interactionState.deploymentCandidateValid ?? null,
    deploymentValidationReason: interactionState.deploymentValidationReason ?? null,
    selectedStartCell: cloneCell(interactionState.selectedStartCell),
    selectedDropZoneId: interactionState.selectedDropZoneId ?? null,
    placementValid: validation ? validation.valid !== false && validation.allowed !== false : null,
    placementReason: validation?.reason ?? validation?.message ?? interactionState.placementReason ?? null,
    routePreview: normalizedRoutePreview,
    guidanceCone: guidanceState?.driftCone ?? interactionState.guidanceCone ?? null,
    reachableRegion: guidanceState?.reachableRegion ?? interactionState.reachableRegion ?? null,
    etaPreview: clonePlainObject(interactionState.etaPreview ?? routePreview?.etaPreview ?? guidanceState?.routeEnergy ?? null),
    energyPreview: clonePlainObject(interactionState.energyPreview ?? routePreview?.energyPreview ?? guidanceState?.routeEnergy ?? null),
    currentPreview: clonePlainObject(interactionState.currentPreview ?? guidanceState?.localCurrent ?? null),
    hazardPreview: clonePlainObject(interactionState.hazardPreview ?? null),
    dragPreview,
    userHint: interactionState.userHint ?? hintForMode(interactionState.interactionMode ?? options.interactionMode),
    warnings: [...warnings, ...(interactionState.warnings ?? [])].map(String),
    boundaryFlags: {
      ownsPlanning: false,
      ownsSimulation: false,
      ownsScoring: false,
      changesOfficialBrowserScoring: false,
      exposesHiddenTruth: false,
      usesNewPlanner: false,
      usesRouteOptimizer: false
    }
  });
}

export function missionPlanningInteractionViewModelSummary(viewModel = {}) {
  return {
    type: 'anchor.rendering.mission-planning-interaction-summary',
    version: MISSION_PLANNING_INTERACTION_VIEW_MODEL_VERSION,
    interactionMode: viewModel.interactionMode ?? null,
    activePlanningToolId: viewModel.activePlanningToolId ?? viewModel.planningToolState?.activeToolId ?? null,
    activePlanningToolLabel: viewModel.activePlanningToolLabel ?? viewModel.planningToolState?.activeToolLabel ?? null,
    planningToolInstruction: viewModel.planningToolInstruction ?? viewModel.planningToolState?.instructions ?? null,
    planningToolCursor: viewModel.planningToolCursor ?? viewModel.planningToolState?.cursorId ?? null,
    hoveredCell: viewModel.hoveredCell ? { ...viewModel.hoveredCell } : null,
    hoveredObjectType: viewModel.hoveredEntity?.objectType ?? null,
    hoveredObjectId: viewModel.hoveredEntity?.objectId ?? null,
    selectedObjectType: viewModel.selectedEntity?.objectType ?? null,
    selectedObjectId: viewModel.selectedEntity?.objectId ?? null,
    placementValid: viewModel.placementValid,
    placementReason: viewModel.placementReason ?? null,
    routePreviewActive: Boolean(viewModel.routePreview?.active),
    dragPreviewActive: Boolean(viewModel.dragPreview?.active),
    deploymentSelectionActive: viewModel.deploymentSelectionActive === true,
    deploymentAgentId: viewModel.deploymentAgentId ?? null,
    deploymentCandidateCell: viewModel.deploymentCandidateCell ? { ...viewModel.deploymentCandidateCell } : null,
    deploymentCandidateValid: viewModel.deploymentCandidateValid ?? null,
    guidanceConeVisible: Boolean(viewModel.guidanceCone),
    reachableRegionVisible: Boolean(viewModel.reachableRegion),
    warningCount: viewModel.warnings?.length ?? 0,
    ownsPlanning: viewModel.boundaryFlags?.ownsPlanning === true,
    ownsSimulation: viewModel.boundaryFlags?.ownsSimulation === true,
    ownsScoring: viewModel.boundaryFlags?.ownsScoring === true,
    exposesHiddenTruth: viewModel.boundaryFlags?.exposesHiddenTruth === true
  };
}

function selectedFromMissionWorld(viewModel = {}) {
  const waypoint = (viewModel?.waypoints ?? []).find((candidate) => candidate.selected);
  if (waypoint) return { objectType: 'waypoint', objectId: waypoint.waypointId, waypointId: waypoint.waypointId, agentId: waypoint.agentId, gridCell: { x: waypoint.x, y: waypoint.y } };
  const marker = (viewModel?.planningMarkers ?? []).find((candidate) => candidate.selected);
  if (marker) return { objectType: 'planningMarker', objectId: marker.markerId, markerId: marker.markerId, agentId: marker.agentId ?? null, gridCell: { x: marker.x, y: marker.y } };
  const target = (viewModel?.priorityTargets ?? []).find((candidate) => candidate.selected);
  if (target) return { objectType: 'priorityTarget', objectId: target.targetId, targetId: target.targetId, gridCell: { x: target.x, y: target.y } };
  const glider = (viewModel?.gliders ?? []).find((candidate) => candidate.selected);
  if (glider) return { objectType: 'glider', objectId: glider.agentId, agentId: glider.agentId, gridCell: { x: glider.x, y: glider.y } };
  return null;
}

function normalizePreview(preview = null) {
  return normalizePlanningGuidePreview(preview);
}

function cloneEntity(entity = null) {
  if (!entity) return null;
  return {
    objectType: entity.objectType ?? entity.type ?? null,
    objectId: entity.objectId ?? entity.id ?? entity.waypointId ?? entity.markerId ?? entity.targetId ?? entity.agentId ?? null,
    agentId: entity.agentId ?? null,
    waypointId: entity.waypointId ?? null,
    markerId: entity.markerId ?? null,
    targetId: entity.targetId ?? null,
    gridCell: cloneCell(entity.gridCell)
  };
}

function cloneCell(cell = null) {
  if (!cell) return null;
  const x = Number(cell.x ?? cell.col);
  const y = Number(cell.y ?? cell.row);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x: Math.round(x), y: Math.round(y), col: Math.round(x), row: Math.round(y), blocked: Boolean(cell.blocked), reason: cell.reason ?? null };
}

function clonePlainObject(value = null) {
  if (value == null) return null;
  if (Array.isArray(value)) return value.map((entry) => clonePlainObject(entry));
  if (typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, clonePlainObject(child)]));
}

function hintForMode(mode) {
  if (mode === 'placeWaypoint') return 'Click a valid water cell to add a waypoint. Left drag pans, right drag rotates, and wheel zooms.';
  if (mode === 'placeMarker') return 'Click a valid mission cell to add a non-executable planning marker.';
  if (mode === 'navigate') return 'Drag to move the camera. Clicks do not edit the plan in Navigate mode.';
  if (mode === 'selectDeployment') return 'Click a valid highlighted drop-zone cell to set the active glider start.';
  return 'Click objects to inspect or select. Drag a selected waypoint to move it.';
}

function scrubHidden(viewModel) {
  return scrubObject(viewModel);
}

function scrubObject(value) {
  if (Array.isArray(value)) return value.map(scrubObject);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    if (/^(T_hiddenTruth|hiddenTruth|trueRoi|oracleState|debugAll)$/i.test(key)) continue;
    out[key] = scrubObject(child);
  }
  return out;
}

