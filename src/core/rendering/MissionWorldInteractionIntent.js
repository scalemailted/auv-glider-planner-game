export const MISSION_WORLD_INTERACTION_INTENT_VERSION = 'mission-world-interaction-intent-gfx-r3b';

export const MISSION_WORLD_INTERACTION_MODE_IDS = Object.freeze([
  'navigate',
  'selectInspect',
  'placeWaypoint',
  'editWaypoint',
  'placeMarker'
]);

export const MISSION_WORLD_INTERACTION_INTENT_IDS = Object.freeze([
  'hoverCell',
  'clearHover',
  'selectAgent',
  'selectWaypoint',
  'selectPriorityTarget',
  'selectObservation',
  'selectSurfacingEvent',
  'selectRouteSegment',
  'selectRouteFailure',
  'placeWaypoint',
  'previewWaypointMove',
  'commitWaypointMove',
  'cancelWaypointMove',
  'deleteWaypoint',
  'placePlanningMarker',
  'deletePlanningMarker',
  'requestRoutePreview',
  'clearRoutePreview',
  'cameraChanged',
  'cancelInteraction'
]);

export function normalizeMissionWorldInteractionMode(id) {
  return MISSION_WORLD_INTERACTION_MODE_IDS.includes(id) ? id : 'selectInspect';
}

export function normalizeMissionWorldInteractionIntentId(id) {
  return MISSION_WORLD_INTERACTION_INTENT_IDS.includes(id) ? id : 'cancelInteraction';
}

export function createMissionWorldInteractionIntent(options = {}) {
  const intentId = normalizeMissionWorldInteractionIntentId(options.intentId);
  const interactionMode = normalizeMissionWorldInteractionMode(options.interactionMode);
  return {
    type: 'anchor.rendering.mission-interaction-intent',
    version: MISSION_WORLD_INTERACTION_INTENT_VERSION,
    intentId,
    interactionMode,
    pointerType: options.pointerType ?? null,
    pointerId: finiteOrNull(options.pointerId),
    modifiers: normalizeModifiers(options.modifiers),
    missionId: options.missionId ?? null,
    agentId: options.agentId ?? null,
    waypointId: options.waypointId ?? null,
    markerId: options.markerId ?? null,
    targetId: options.targetId ?? null,
    observationId: options.observationId ?? null,
    surfacingEventId: options.surfacingEventId ?? null,
    routeSegmentId: options.routeSegmentId ?? null,
    routeFailureId: options.routeFailureId ?? null,
    gridCell: normalizeGridCell(options.gridCell),
    worldPoint: normalizeWorldPoint(options.worldPoint),
    depthLayerId: options.depthLayerId ?? 'surface',
    activeTimeSeconds: finiteNumber(options.activeTimeSeconds, 0),
    sourceBackend: options.sourceBackend ?? 'threeMission3d',
    sequence: finiteNumber(options.sequence, 0),
    metadata: clonePlainObject(options.metadata),
    boundaryFlags: {
      mutatesRendererStateOnly: false,
      requiresCanonicalCommand: true,
      ownsPlanning: false,
      ownsSimulation: false,
      ownsScoring: false,
      ...(options.boundaryFlags ?? {})
    }
  };
}

export function validateMissionWorldInteractionIntent(intent = {}) {
  const errors = [];
  const warnings = [];
  if (intent.type !== 'anchor.rendering.mission-interaction-intent') errors.push('Interaction intent type must be anchor.rendering.mission-interaction-intent.');
  if (!MISSION_WORLD_INTERACTION_INTENT_IDS.includes(intent.intentId)) errors.push(`Unknown interaction intentId: ${String(intent.intentId ?? '')}.`);
  if (!MISSION_WORLD_INTERACTION_MODE_IDS.includes(intent.interactionMode)) errors.push(`Unknown interaction mode: ${String(intent.interactionMode ?? '')}.`);
  if (intent.boundaryFlags?.ownsPlanning) errors.push('Interaction intent must not own planning.');
  if (intent.boundaryFlags?.ownsSimulation) errors.push('Interaction intent must not own simulation.');
  if (intent.boundaryFlags?.ownsScoring) errors.push('Interaction intent must not own scoring.');
  if (intent.boundaryFlags?.requiresCanonicalCommand !== true) errors.push('Interaction intent must require canonical workspace command handling.');
  if (intent.boundaryFlags?.mutatesRendererStateOnly === true && mutationIntentIds.has(intent.intentId)) warnings.push('Mutation-like intent should not be marked renderer-only.');
  return { valid: errors.length === 0, errors, warnings, summary: missionWorldInteractionIntentSummary(intent) };
}

export function missionWorldInteractionIntentSummary(intent = {}) {
  return {
    type: 'anchor.rendering.mission-interaction-intent-summary',
    version: MISSION_WORLD_INTERACTION_INTENT_VERSION,
    intentId: intent.intentId ?? null,
    interactionMode: intent.interactionMode ?? null,
    objectType: intent.metadata?.objectType ?? null,
    objectId: intent.waypointId ?? intent.markerId ?? intent.targetId ?? intent.observationId ?? intent.surfacingEventId ?? intent.routeSegmentId ?? intent.routeFailureId ?? intent.agentId ?? intent.metadata?.objectId ?? null,
    gridCell: intent.gridCell ? { ...intent.gridCell } : null,
    sequence: finiteNumber(intent.sequence, 0),
    ownsPlanning: intent.boundaryFlags?.ownsPlanning === true,
    ownsSimulation: intent.boundaryFlags?.ownsSimulation === true,
    ownsScoring: intent.boundaryFlags?.ownsScoring === true,
    requiresCanonicalCommand: intent.boundaryFlags?.requiresCanonicalCommand === true
  };
}

const mutationIntentIds = new Set([
  'placeWaypoint',
  'commitWaypointMove',
  'deleteWaypoint',
  'placePlanningMarker',
  'deletePlanningMarker'
]);

function normalizeModifiers(modifiers = {}) {
  return {
    shiftKey: Boolean(modifiers.shiftKey),
    altKey: Boolean(modifiers.altKey),
    ctrlKey: Boolean(modifiers.ctrlKey),
    metaKey: Boolean(modifiers.metaKey)
  };
}

function normalizeGridCell(cell = null) {
  if (!cell) return null;
  const x = Number(cell.x ?? cell.col);
  const y = Number(cell.y ?? cell.row);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    x: Math.round(x),
    y: Math.round(y),
    col: Math.round(x),
    row: Math.round(y),
    blocked: Boolean(cell.blocked),
    reason: cell.reason ?? null
  };
}

function normalizeWorldPoint(point = null) {
  if (!point) return null;
  return {
    x: finiteNumber(point.x, 0),
    y: finiteNumber(point.y, 0),
    z: finiteNumber(point.z, 0),
    depthMeters: finiteNumber(point.depthMeters, 0)
  };
}

function clonePlainObject(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return JSON.parse(JSON.stringify(value));
}

function finiteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function finiteOrNull(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}