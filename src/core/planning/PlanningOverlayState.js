export function isFinitePlanningAnchor(anchor) {
  return Number.isFinite(Number(anchor?.x)) && Number.isFinite(Number(anchor?.y));
}

export function shouldRenderPlanningGuidance({
  mode = null,
  scene = null,
  engine = null,
  selectedAgentId = null,
  planningAnchor = null,
  guidanceSettings = null,
  surfaceDecision = null
} = {}) {
  const normalizedMode = mode ?? scene ?? 'planning';
  if (normalizedMode !== 'planning') return false;
  if (engine) return false;
  if (surfaceDecision?.active && surfaceDecision.mode !== 'editingFutureWaypoints') return false;
  if (!selectedAgentId) return false;
  if (guidanceSettings?.showGuidance === false) return false;
  return isFinitePlanningAnchor(planningAnchor);
}

export function shouldRenderOverlay(type, gameState = {}, sceneKey = null, context = {}) {
  const mode = context.mode ?? gameState.mode ?? sceneMode(sceneKey);
  switch (type) {
    case 'deploymentZone':
      return mode === 'editor' || (mode === 'planning' && Boolean(context.deploymentSelectionActive));
    case 'deploymentHover':
      return mode === 'planning' && Boolean(context.deploymentSelectionActive) && Boolean(context.hoverCell);
    case 'deploymentStart':
      return mode === 'planning' && Boolean(context.selectedStart);
    case 'reachability':
    case 'driftCone':
    case 'guidanceLine':
    case 'selectedGliderRange':
      return shouldRenderPlanningGuidance({
        mode,
        engine: context.engine,
        selectedAgentId: context.selectedAgentId ?? gameState.selectedAgentId,
        planningAnchor: context.planningAnchor ?? gameState.ui?.planningAnchor,
        guidanceSettings: context.guidanceSettings ?? gameState.ui,
        surfaceDecision: context.surfaceDecision ?? gameState.surfaceDecision
      });
    case 'arrivalUncertainty':
      return mode === 'planning' && Boolean(context.committedWaypoint);
    case 'currentPreview':
      return mode === 'editor';
    default:
      return false;
  }
}

export function clearPlanningOverlayState(state) {
  if (!state?.ui) return;
  state.ui.hoverCell = null;
  state.ui.selectedWaypoint = null;
  state.ui.planningAnchor = null;
  state.ui.overlayDebug = {
    mode: state.mode ?? null,
    shouldRenderPlanningGuidance: false,
    reason: 'cleared'
  };
}

function sceneMode(sceneKey) {
  if (sceneKey === 'MissionWorkspaceScene') return 'planning';
  if (sceneKey === 'SimulationScene') return 'simulation';
  if (sceneKey === 'DebriefScene') return 'debrief';
  if (sceneKey === 'EnvironmentEditorScene') return 'editor';
  return 'preview';
}
