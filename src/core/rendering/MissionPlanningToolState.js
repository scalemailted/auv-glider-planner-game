export const MISSION_PLANNING_TOOL_STATE_VERSION = 'mission-planning-tool-state-three-r1-1c';

export const MISSION_PLANNING_TOOL_IDS = Object.freeze([
  'navigate',
  'selectInspect',
  'selectDeploymentCell',
  'placeWaypoint',
  'editWaypoint',
  'placePlanningMarker'
]);

export const MISSION_PLANNING_TOOL_LABELS = Object.freeze({
  navigate: 'Navigate',
  selectInspect: 'Select / Edit',
  selectDeploymentCell: 'Deploy Glider / Change Start',
  placeWaypoint: 'Add Waypoint',
  editWaypoint: 'Edit Waypoint',
  placePlanningMarker: 'Add Marker'
});

export const MISSION_PLANNING_TOOL_TO_INTERACTION_MODE = Object.freeze({
  navigate: 'navigate',
  selectInspect: 'selectInspect',
  selectDeploymentCell: 'selectDeployment',
  placeWaypoint: 'placeWaypoint',
  editWaypoint: 'editWaypoint',
  placePlanningMarker: 'placeMarker'
});

export const MISSION_INTERACTION_MODE_TO_PLANNING_TOOL = Object.freeze({
  navigate: 'navigate',
  selectInspect: 'selectInspect',
  selectDeployment: 'selectDeploymentCell',
  placeWaypoint: 'placeWaypoint',
  editWaypoint: 'editWaypoint',
  placeMarker: 'placePlanningMarker'
});

export function createMissionPlanningToolState(options = {}) {
  const activeToolId = normalizeToolId(options.activeToolId ?? toolIdForInteractionMode(options.interactionMode) ?? 'selectInspect');
  return normalizeToolState({
    type: 'anchor.rendering.mission-planning-tool-state',
    version: MISSION_PLANNING_TOOL_STATE_VERSION,
    activeToolId,
    previousToolId: normalizeToolId(options.previousToolId, activeToolId),
    selectedAgentId: options.selectedAgentId ?? null,
    selectedWaypointId: options.selectedWaypointId ?? null,
    selectedMarkerId: options.selectedMarkerId ?? null,
    deploymentAgentId: options.deploymentAgentId ?? null,
    deploymentDropZoneId: options.deploymentDropZoneId ?? null,
    oneShot: isOneShotTool(activeToolId),
    persistent: isPersistentTool(activeToolId),
    statusMessage: options.statusMessage ?? defaultStatusMessage(activeToolId, options),
    instructions: options.instructions ?? defaultInstructions(activeToolId, options),
    cursorId: options.cursorId ?? cursorForTool(activeToolId),
    canPlace: options.canPlace ?? null,
    validationReason: options.validationReason ?? null,
    boundaryFlags: boundaryFlags(options.boundaryFlags)
  });
}

export function setMissionPlanningTool(state, toolId, context = {}) {
  const previousToolId = normalizeToolId(state?.activeToolId, 'selectInspect');
  const activeToolId = normalizeToolId(toolId, previousToolId);
  return normalizeToolState({
    ...(state ?? createMissionPlanningToolState()),
    activeToolId,
    previousToolId,
    selectedAgentId: context.selectedAgentId ?? state?.selectedAgentId ?? null,
    selectedWaypointId: context.selectedWaypointId ?? state?.selectedWaypointId ?? null,
    selectedMarkerId: context.selectedMarkerId ?? state?.selectedMarkerId ?? null,
    deploymentAgentId: activeToolId === 'selectDeploymentCell'
      ? context.deploymentAgentId ?? context.selectedAgentId ?? state?.deploymentAgentId ?? state?.selectedAgentId ?? null
      : context.deploymentAgentId ?? state?.deploymentAgentId ?? null,
    deploymentDropZoneId: context.deploymentDropZoneId ?? state?.deploymentDropZoneId ?? null,
    oneShot: isOneShotTool(activeToolId),
    persistent: isPersistentTool(activeToolId),
    statusMessage: context.statusMessage ?? defaultStatusMessage(activeToolId, context),
    instructions: context.instructions ?? defaultInstructions(activeToolId, context),
    cursorId: context.cursorId ?? cursorForTool(activeToolId),
    canPlace: context.canPlace ?? state?.canPlace ?? null,
    validationReason: context.validationReason ?? state?.validationReason ?? null,
    boundaryFlags: boundaryFlags(state?.boundaryFlags)
  });
}

export function cancelMissionPlanningTool(state, options = {}) {
  const safeTool = normalizeToolId(options.safeToolId ?? state?.previousToolId ?? 'selectInspect', 'selectInspect');
  const nextTool = safeTool === 'selectDeploymentCell' || safeTool === 'placeWaypoint' || safeTool === 'placePlanningMarker'
    ? 'selectInspect'
    : safeTool;
  return setMissionPlanningTool(state, nextTool, {
    ...options,
    statusMessage: options.statusMessage ?? 'Planning tool cancelled.',
    instructions: options.instructions ?? defaultInstructions(nextTool, options),
    validationReason: null
  });
}

export function validateMissionPlanningToolState(state = {}) {
  const errors = [];
  if (state.type !== 'anchor.rendering.mission-planning-tool-state') errors.push('Tool state type must be anchor.rendering.mission-planning-tool-state.');
  if (!MISSION_PLANNING_TOOL_IDS.includes(state.activeToolId)) errors.push(`Unknown active planning tool: ${String(state.activeToolId ?? '')}.`);
  if (state.boundaryFlags?.ownsPlanning) errors.push('Planning tool state must not own planning.');
  if (state.boundaryFlags?.ownsSimulationState) errors.push('Planning tool state must not own simulation.');
  if (state.boundaryFlags?.ownsScoring) errors.push('Planning tool state must not own scoring.');
  return { valid: errors.length === 0, errors, summary: missionPlanningToolStateSummary(state) };
}

export function missionPlanningToolStateSummary(state = {}) {
  const activeToolId = normalizeToolId(state.activeToolId);
  return {
    type: 'anchor.rendering.mission-planning-tool-state-summary',
    version: MISSION_PLANNING_TOOL_STATE_VERSION,
    activeToolId,
    activeToolLabel: labelForTool(activeToolId),
    previousToolId: normalizeToolId(state.previousToolId, 'selectInspect'),
    interactionMode: interactionModeForTool(activeToolId),
    selectedAgentId: state.selectedAgentId ?? null,
    selectedWaypointId: state.selectedWaypointId ?? null,
    selectedMarkerId: state.selectedMarkerId ?? null,
    deploymentAgentId: state.deploymentAgentId ?? null,
    deploymentDropZoneId: state.deploymentDropZoneId ?? null,
    oneShot: state.oneShot === true,
    persistent: state.persistent === true,
    statusMessage: state.statusMessage ?? null,
    instructions: state.instructions ?? null,
    cursorId: state.cursorId ?? cursorForTool(activeToolId),
    canPlace: state.canPlace ?? null,
    validationReason: state.validationReason ?? null,
    boundaryFlags: boundaryFlags(state.boundaryFlags),
    ownsPlanning: state.boundaryFlags?.ownsPlanning === true,
    ownsSimulationState: state.boundaryFlags?.ownsSimulationState === true,
    ownsScoring: state.boundaryFlags?.ownsScoring === true
  };
}

export function interactionModeForTool(toolId) {
  return MISSION_PLANNING_TOOL_TO_INTERACTION_MODE[normalizeToolId(toolId)] ?? 'selectInspect';
}

export function toolIdForInteractionMode(mode) {
  return MISSION_INTERACTION_MODE_TO_PLANNING_TOOL[mode] ?? 'selectInspect';
}

export function labelForTool(toolId) {
  return MISSION_PLANNING_TOOL_LABELS[normalizeToolId(toolId)] ?? MISSION_PLANNING_TOOL_LABELS.selectInspect;
}

export function cursorForTool(toolId, options = {}) {
  const id = normalizeToolId(toolId);
  if (options.invalid) return 'not-allowed';
  if (options.dragging) return 'grabbing';
  if (id === 'navigate') return 'grab';
  if (id === 'selectDeploymentCell' || id === 'placeWaypoint') return 'crosshair';
  if (id === 'placePlanningMarker') return 'copy';
  return 'default';
}

function normalizeToolState(state = {}) {
  const activeToolId = normalizeToolId(state.activeToolId);
  return {
    ...state,
    activeToolId,
    previousToolId: normalizeToolId(state.previousToolId, 'selectInspect'),
    oneShot: state.oneShot ?? isOneShotTool(activeToolId),
    persistent: state.persistent ?? isPersistentTool(activeToolId),
    cursorId: state.cursorId ?? cursorForTool(activeToolId),
    statusMessage: state.statusMessage ?? defaultStatusMessage(activeToolId, state),
    instructions: state.instructions ?? defaultInstructions(activeToolId, state),
    boundaryFlags: boundaryFlags(state.boundaryFlags)
  };
}

function normalizeToolId(toolId, fallback = 'selectInspect') {
  return MISSION_PLANNING_TOOL_IDS.includes(toolId) ? toolId : fallback;
}

function isOneShotTool(toolId) {
  return normalizeToolId(toolId) === 'selectDeploymentCell';
}

function isPersistentTool(toolId) {
  const id = normalizeToolId(toolId);
  return id === 'placeWaypoint' || id === 'placePlanningMarker' || id === 'navigate' || id === 'selectInspect' || id === 'editWaypoint';
}

function defaultStatusMessage(toolId, context = {}) {
  const label = context.agentLabel ?? context.selectedAgentLabel ?? context.selectedAgentId ?? 'selected glider';
  if (toolId === 'selectDeploymentCell') return `Deploy/change start for ${label}.`;
  if (toolId === 'placeWaypoint') return `Adding route waypoints for ${label}.`;
  if (toolId === 'placePlanningMarker') return 'Adding non-executable planning markers.';
  if (toolId === 'navigate') return 'Camera navigation active.';
  if (toolId === 'editWaypoint') return 'Waypoint editing active.';
  return 'Select or inspect mission objects.';
}

function defaultInstructions(toolId, context = {}) {
  const label = context.agentLabel ?? context.selectedAgentLabel ?? context.selectedAgentId ?? 'the selected glider';
  if (toolId === 'selectDeploymentCell') return `Select a highlighted deployment cell for ${label}.`;
  if (toolId === 'placeWaypoint') return `Click the mission plane to append route waypoints for ${label}.`;
  if (toolId === 'placePlanningMarker') return 'Click the mission plane to add a non-executable planning marker.';
  if (toolId === 'navigate') return 'Click: use active planning tool. Left drag: pan. Right drag: rotate. Wheel: zoom. Esc: cancel active tool.';
  if (toolId === 'editWaypoint') return 'Drag an existing waypoint to move it, or select route objects to inspect.';
  return 'Click objects to select or inspect. Empty-cell clicks do not add route waypoints.';
}

function boundaryFlags(input = {}) {
  return {
    ownsPlanning: false,
    ownsSimulationState: false,
    ownsScoring: false,
    changesOfficialBrowserScoring: false,
    exposesHiddenTruth: false,
    usesNewPlanner: false,
    usesRouteOptimizer: false,
    ...(input ?? {})
  };
}
