export const WAYPOINT_KINDS = [
  'navigation',
  'surface',
  'samplingTarget',
  'terminalCarryThrough'
];

export function normalizeWaypointKind(waypoint = {}) {
  const raw = waypoint.kind ?? waypoint.waypointKind ?? waypoint.role ?? waypoint.type ?? null;
  if (raw === 'navigation' || raw === 'nav' || raw === 'waypoint') return 'navigation';
  if (raw === 'surface' || raw === 'surfaceUpdate' || raw === 'update' || raw === 'gpsUpdate') return 'surface';
  if (raw === 'samplingTarget' || raw === 'sampleTarget' || raw === 'objective' || raw === 'priorityTarget') return 'samplingTarget';
  if (raw === 'terminalCarryThrough' || raw === 'carryThrough' || raw === 'terminal') return 'terminalCarryThrough';
  if (isTerminalCarryThroughWaypoint(waypoint)) return 'terminalCarryThrough';
  return 'navigation';
}

export function waypointKindLabel(value) {
  const kind = typeof value === 'object' ? normalizeWaypointKind(value) : normalizeWaypointKind({ kind: value });
  if (kind === 'surface') return 'Surface / GPS Update';
  if (kind === 'samplingTarget') return 'Sampling Target';
  if (kind === 'terminalCarryThrough') return 'Terminal Carry-Through';
  return 'Navigation';
}

export function waypointKindEventType(value) {
  const kind = typeof value === 'object' ? normalizeWaypointKind(value) : normalizeWaypointKind({ kind: value });
  if (kind === 'surface') return 'surface_update';
  if (kind === 'samplingTarget') return 'sampling_target';
  if (kind === 'terminalCarryThrough') return 'terminal_carry_through';
  return 'navigation_intent';
}

export function isSurfaceUpdateWaypoint(waypoint = {}) {
  return normalizeWaypointKind(waypoint) === 'surface';
}

export function isTerminalCarryThroughWaypoint(waypoint = {}) {
  return Boolean(
    waypoint?.kind === 'terminalCarryThrough'
    || waypoint?.waypointKind === 'terminalCarryThrough'
    || waypoint?.terminalCarryThrough
    || waypoint?.intentionalOverDuration
    || waypoint?.runtimeBehavior === 'truncate_at_mission_end'
    || waypoint?.validity?.routeAudit?.runtimeBehavior === 'truncate_at_mission_end'
    || waypoint?.validity?.routeAudit?.terminalCarryThrough
  );
}
