import {
  CONTINUOUS_COORDINATE_PROFILE_ID,
  CONTINUOUS_MISSION_COORDINATE_FRAME,
  CONTINUOUS_MISSION_COORDINATES_VERSION,
  LEGACY_INTEGER_COORDINATE_PROFILE_ID,
  continuousMissionPointSummary,
  continuousPointToContainingCell,
  legacyCellToContinuousPoint,
  normalizeContinuousMissionPoint,
  validateContinuousMissionPoint
} from '../geometry/ContinuousMissionCoordinates.js';

export const CONTINUOUS_MISSION_WAYPOINT_VERSION = 'continuous-mission-waypoint-three-r1-2a-3';

export function createContinuousMissionWaypoint(options = {}) {
  return normalizeContinuousMissionWaypoint(options, options.context ?? options);
}

export function normalizeContinuousMissionWaypoint(waypoint = {}, context = {}) {
  const agentId = waypoint.agentId ?? context.agentId ?? null;
  const coordinateProfileId = normalizeCoordinateProfileId(
    waypoint.coordinateProfileId
      ?? context.coordinateProfileId
      ?? context.plan?.coordinateProfileId
      ?? context.plan?.meta?.coordinateProfileId
      ?? (waypoint.position ? CONTINUOUS_COORDINATE_PROFILE_ID : LEGACY_INTEGER_COORDINATE_PROFILE_ID)
  );
  const rawPosition = waypoint.position && typeof waypoint.position === 'object'
    ? waypoint.position
    : coordinateProfileId === LEGACY_INTEGER_COORDINATE_PROFILE_ID
      ? legacyCellToContinuousPoint({ x: waypoint.x ?? waypoint.col, y: waypoint.y ?? waypoint.row }, context.transform ?? context.grid ?? {})
      : { x: waypoint.x ?? waypoint.col, y: waypoint.y ?? waypoint.row, coordinateFrame: CONTINUOUS_MISSION_COORDINATE_FRAME };
  const position = normalizeContinuousMissionPoint(rawPosition, context);
  const derivedCell = continuousPointToContainingCell(position, context);
  return {
    id: waypoint.id ? String(waypoint.id) : null,
    agentId,
    x: position.x,
    y: position.y,
    position: {
      x: position.x,
      y: position.y,
      coordinateFrame: position.coordinateFrame
    },
    coordinateProfileId,
    validationRadius: positive(waypoint.validationRadius ?? waypoint.waypointTolerance ?? context.validationRadius, 0.35),
    action: waypoint.action ?? 'sample',
    plannedTime: finiteOrNull(waypoint.plannedTime ?? waypoint.t ?? waypoint.estimatedArrivalTime),
    t: finiteOrNull(waypoint.t ?? waypoint.plannedTime ?? waypoint.estimatedArrivalTime),
    diveProfileId: waypoint.diveProfileId ?? context.diveProfileId ?? null,
    targetDepthLayerId: waypoint.targetDepthLayerId ?? waypoint.depthLayerId ?? waypoint.depthLayer ?? context.targetDepthLayerId ?? null,
    maximumDepthMeters: finiteOrNull(waypoint.maximumDepthMeters ?? waypoint.maximumDiveDepthMeters ?? waypoint.depthMeters),
    warningMetadata: normalizeWarningMetadata(waypoint.warningMetadata ?? waypoint.warnings ?? waypoint.warningCodes),
    legacyCell: waypoint.legacyCell ?? {
      col: derivedCell.col,
      row: derivedCell.row,
      x: derivedCell.col,
      y: derivedCell.row,
      compatibilityOnly: true
    },
    derivedCell,
    metadata: {
      schemaVersion: CONTINUOUS_MISSION_WAYPOINT_VERSION,
      coordinateVersion: CONTINUOUS_MISSION_COORDINATES_VERSION,
      legacyCellCenterConvention: 'x = col, y = row',
      arbitraryMidwaterXyzWaypoint: false
    }
  };
}

export function validateContinuousMissionWaypoint(waypoint = {}, context = {}) {
  const normalized = normalizeContinuousMissionWaypoint(waypoint, context);
  const pointValidation = validateContinuousMissionPoint(normalized.position, context);
  const errors = [...pointValidation.errors];
  const warnings = [...pointValidation.warnings];
  if (!normalized.action) errors.push('Continuous mission waypoint requires an action.');
  if (!Number.isFinite(Number(normalized.validationRadius)) || Number(normalized.validationRadius) <= 0) errors.push('Waypoint validationRadius must be positive.');
  if (normalized.targetDepthLayerId && waypoint.z !== undefined) warnings.push('Depth targets are science/profile metadata, not arbitrary XYZ route waypoints.');
  return { valid: errors.length === 0, errors, warnings, waypoint: normalized };
}

export function continuousMissionWaypointSummary(waypoint = {}) {
  const normalized = normalizeContinuousMissionWaypoint(waypoint);
  return {
    version: CONTINUOUS_MISSION_WAYPOINT_VERSION,
    id: normalized.id,
    agentId: normalized.agentId,
    coordinateProfileId: normalized.coordinateProfileId,
    position: continuousMissionPointSummary(normalized.position),
    validationRadius: normalized.validationRadius,
    action: normalized.action,
    diveProfileId: normalized.diveProfileId,
    targetDepthLayerId: normalized.targetDepthLayerId,
    legacyCell: normalized.legacyCell,
    preservesDecimals: !Number.isInteger(normalized.x) || !Number.isInteger(normalized.y)
  };
}

export function normalizeCoordinateProfileId(value) {
  if (value === CONTINUOUS_COORDINATE_PROFILE_ID) return CONTINUOUS_COORDINATE_PROFILE_ID;
  return LEGACY_INTEGER_COORDINATE_PROFILE_ID;
}

function normalizeWarningMetadata(value = null) {
  if (!value) return null;
  if (Array.isArray(value)) return { warnings: value.map(String) };
  if (typeof value === 'object') return { ...value };
  return { warnings: [String(value)] };
}

function positive(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
