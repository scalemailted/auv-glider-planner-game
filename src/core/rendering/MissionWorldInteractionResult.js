export const MISSION_WORLD_INTERACTION_RESULT_VERSION = 'mission-world-interaction-result-gfx-r3b';

export const MISSION_WORLD_INTERACTION_RESULT_STATUSES = Object.freeze([
  'accepted',
  'rejected',
  'preview',
  'cancelled',
  'noChange',
  'invalid'
]);

export function createMissionWorldInteractionResult(options = {}) {
  const status = normalizeStatus(options.status);
  const accepted = status === 'accepted' || options.accepted === true;
  return {
    type: 'anchor.rendering.mission-interaction-result',
    version: MISSION_WORLD_INTERACTION_RESULT_VERSION,
    intentId: options.intentId ?? null,
    status,
    accepted,
    changedCanonicalState: accepted && options.changedCanonicalState === true,
    selectedAgentId: options.selectedAgentId ?? null,
    selectedWaypointId: options.selectedWaypointId ?? null,
    selectedMarkerId: options.selectedMarkerId ?? null,
    selectedTargetId: options.selectedTargetId ?? null,
    selectedObservationId: options.selectedObservationId ?? null,
    selectedSurfacingEventId: options.selectedSurfacingEventId ?? null,
    selectedRouteSegmentId: options.selectedRouteSegmentId ?? null,
    selectedRouteFailureId: options.selectedRouteFailureId ?? null,
    committedGridCell: normalizeGridCell(options.committedGridCell),
    preview: clonePlainObject(options.preview),
    warnings: [...(options.warnings ?? [])].map(String),
    userMessage: options.userMessage ?? '',
    severity: options.severity ?? severityForStatus(status),
    boundaryFlags: {
      ownsPlanning: false,
      ownsSimulation: false,
      ownsScoring: false,
      changesOfficialBrowserScoring: false,
      usesNewPlanner: false,
      usesRouteOptimizer: false,
      ...(options.boundaryFlags ?? {})
    }
  };
}

export function validateMissionWorldInteractionResult(result = {}) {
  const errors = [];
  const warnings = [];
  if (result.type !== 'anchor.rendering.mission-interaction-result') errors.push('Interaction result type must be anchor.rendering.mission-interaction-result.');
  if (!MISSION_WORLD_INTERACTION_RESULT_STATUSES.includes(result.status)) errors.push(`Unknown interaction result status: ${String(result.status ?? '')}.`);
  if ((result.status === 'rejected' || result.status === 'invalid') && result.changedCanonicalState === true) errors.push('Rejected or invalid interaction must not report canonical state mutation.');
  if (result.boundaryFlags?.ownsPlanning) errors.push('Interaction result must not own planning.');
  if (result.boundaryFlags?.ownsSimulation) errors.push('Interaction result must not own simulation.');
  if (result.boundaryFlags?.ownsScoring) errors.push('Interaction result must not own scoring.');
  if (result.boundaryFlags?.usesNewPlanner) errors.push('Interaction result must not introduce a new planner.');
  if (result.boundaryFlags?.usesRouteOptimizer) errors.push('Interaction result must not introduce route optimization.');
  if (result.accepted && result.changedCanonicalState !== true && mutationResultStatuses.has(result.status)) warnings.push('Accepted mutation result did not change canonical state.');
  return { valid: errors.length === 0, errors, warnings, summary: missionWorldInteractionResultSummary(result) };
}

export function missionWorldInteractionResultSummary(result = {}) {
  return {
    type: 'anchor.rendering.mission-interaction-result-summary',
    version: MISSION_WORLD_INTERACTION_RESULT_VERSION,
    intentId: result.intentId ?? null,
    status: result.status ?? null,
    accepted: result.accepted === true,
    changedCanonicalState: result.changedCanonicalState === true,
    selectedAgentId: result.selectedAgentId ?? null,
    selectedWaypointId: result.selectedWaypointId ?? null,
    selectedMarkerId: result.selectedMarkerId ?? null,
    selectedTargetId: result.selectedTargetId ?? null,
    selectedObservationId: result.selectedObservationId ?? null,
    selectedSurfacingEventId: result.selectedSurfacingEventId ?? null,
    selectedRouteSegmentId: result.selectedRouteSegmentId ?? null,
    selectedRouteFailureId: result.selectedRouteFailureId ?? null,
    committedGridCell: result.committedGridCell ? { ...result.committedGridCell } : null,
    warningCount: result.warnings?.length ?? 0,
    userMessage: result.userMessage ?? '',
    severity: result.severity ?? null,
    ownsPlanning: result.boundaryFlags?.ownsPlanning === true,
    ownsSimulation: result.boundaryFlags?.ownsSimulation === true,
    ownsScoring: result.boundaryFlags?.ownsScoring === true
  };
}

const mutationResultStatuses = new Set(['accepted']);

function normalizeStatus(status) {
  return MISSION_WORLD_INTERACTION_RESULT_STATUSES.includes(status) ? status : 'noChange';
}

function severityForStatus(status) {
  if (status === 'rejected' || status === 'invalid') return 'warning';
  if (status === 'preview') return 'info';
  return 'info';
}

function normalizeGridCell(cell = null) {
  if (!cell) return null;
  const x = Number(cell.x ?? cell.col);
  const y = Number(cell.y ?? cell.row);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x: Math.round(x), y: Math.round(y), col: Math.round(x), row: Math.round(y) };
}

function clonePlainObject(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return JSON.parse(JSON.stringify(value));
}