export const ROUTE_DIAGNOSTIC_SCHEMA_VERSION = '1.0';

export const ROUTE_DIAGNOSTIC_CATEGORIES = {
  target_on_land: {
    label: 'Target on land',
    severity: 'blocking',
    fixHint: 'Move the waypoint onto a navigable water cell.'
  },
  source_on_land: {
    label: 'Source on land',
    severity: 'blocking',
    fixHint: 'Choose a valid start or replan from a navigable position.'
  },
  segment_intersects_land: {
    label: 'Segment intersects land',
    severity: 'blocking',
    fixHint: 'Move the waypoint or add an intermediate waypoint around the land boundary.'
  },
  segment_clips_land_corner: {
    label: 'Segment clips land corner',
    severity: 'blocking',
    fixHint: 'Add clearance from the land boundary or add an intermediate waypoint.'
  },
  segment_violates_land_clearance: {
    label: 'Segment violates land clearance',
    severity: 'blocking',
    fixHint: 'Move the route farther from land or add an intermediate waypoint.'
  },
  current_drift_into_land: {
    label: 'Current drift into land',
    severity: 'blocking',
    fixHint: 'Replan from the actual position and avoid currents pushing toward land.'
  },
  actual_position_blocked: {
    label: 'Actual position blocked',
    severity: 'blocking',
    fixHint: 'Replan from a navigable actual position.'
  },
  actual_position_differs_from_planned: {
    label: 'Actual position differs from planned',
    severity: 'warning',
    fixHint: 'Replan from the surfaced or actual glider position.'
  },
  no_continuous_path: {
    label: 'No continuous path',
    severity: 'blocking',
    fixHint: 'Move the waypoint or add intermediate waypoints around blocked terrain.'
  },
  fuel_exceeded: {
    label: 'Fuel exceeded',
    severity: 'blocking',
    fixHint: 'Shorten the route, reduce detours, or choose closer waypoints.'
  },
  time_exceeded: {
    label: 'Time exceeded',
    severity: 'blocking',
    fixHint: 'Move the waypoint earlier, shorten the segment, or reduce route length.'
  },
  stale_route_state: {
    label: 'Stale route state',
    severity: 'blocking',
    fixHint: 'Refresh the plan against the current challenge and surface state.'
  },
  collision_conflict: {
    label: 'Collision conflict',
    severity: 'blocking',
    fixHint: 'Separate gliders in space or time.'
  },
  duplicate_sampling_warning: {
    label: 'Duplicate sampling warning',
    severity: 'warning',
    fixHint: 'Prefer unsampled cells if more value is needed.'
  },
  shoreline_current_risk: {
    label: 'Shoreline current risk',
    severity: 'warning',
    fixHint: 'Route farther from land or choose a lower-risk time/current window.'
  },
  deployment_zone_sample_ignored: {
    label: 'Deployment zone sample ignored',
    severity: 'info',
    fixHint: 'Sample outside the deployment zone for scoring value.'
  },
  validator_simulation_mismatch: {
    label: 'Validator/simulation mismatch',
    severity: 'blocking',
    fixHint: 'Use the diagnostic cells to replan and report this mismatch if it persists.'
  },
  invalid_coordinate: {
    label: 'Invalid coordinate',
    severity: 'blocking',
    fixHint: 'Move the waypoint inside the map on a navigable water cell.'
  },
  invalid_start: {
    label: 'Invalid start',
    severity: 'blocking',
    fixHint: 'Choose a valid deployment or start cell before running the route.'
  },
  unknown_route_block: {
    label: 'Unknown route block',
    severity: 'blocking',
    fixHint: 'Move the waypoint or add an intermediate waypoint, then validate again.'
  }
};

export function buildRouteValidationDiagnostic(issue = {}, context = {}) {
  const category = normalizeDiagnosticCategory(issue);
  const definition = ROUTE_DIAGNOSTIC_CATEGORIES[category] ?? ROUTE_DIAGNOSTIC_CATEGORIES.unknown_route_block;
  const routeBlock = issue.routeBlockDiagnostic ?? null;
  const blocking = routeBlock?.blocking ?? {};
  const agentId = issue.agentId ?? context.agentId ?? null;
  const agentLabel = issue.agentLabel ?? context.agentLabel ?? agentId ?? 'Glider';
  const segment = buildSegmentDiagnostic(issue, routeBlock);
  const blockedCell = blocking.blockedCell ?? issue.blockedAt ?? issue.risk?.cell ?? null;
  const reportedCell = blocking.reportedCell ?? issue.reportedCell ?? null;
  const traversedCells = routeBlock?.traversedCells ?? issue.pathCells ?? [];
  const explanation = buildExplanation({ category, definition, agentLabel, segment, blockedCell, issue });
  const fixHint = issue.fixHint ?? definition.fixHint;
  return {
    type: 'route_validation_diagnostic',
    schemaVersion: ROUTE_DIAGNOSTIC_SCHEMA_VERSION,
    severity: normalizeSeverity(issue.severity, definition.severity),
    category,
    label: definition.label,
    agentId,
    agentLabel,
    segment,
    blocking: {
      reason: category,
      blockedCell: normalizeCell(blockedCell),
      reportedCell: normalizeCell(reportedCell),
      traversedCells: traversedCells.map((cell) => ({
        x: Math.floor(Number(cell.x)),
        y: Math.floor(Number(cell.y)),
        navigable: cell.navigable !== false,
        terrainType: cell.terrainType ?? (cell.navigable === false ? 'blocked' : 'water')
      })).filter((cell) => Number.isFinite(cell.x) && Number.isFinite(cell.y))
    },
    explanation,
    message: buildCompactMessage({ category, agentLabel, segment, blockedCell, issue }),
    fixHint,
    plannerFeedback: {
      canRetryWithAlternateWaypoint: !['fuel_exceeded', 'time_exceeded', 'invalid_start'].includes(category),
      suggestedAvoidCells: blockedCell ? [normalizeCell(blockedCell)].filter(Boolean) : [],
      suggestedAnchor: routeBlock?.actualStartPosition ?? segment.actualStartPosition ?? null
    },
    sourceIssue: {
      type: issue.type ?? null,
      reason: issue.reason ?? null,
      message: issue.message ?? null
    }
  };
}

export function collectRouteDiagnostics(routeAudit = null) {
  return (routeAudit?.agentResults ?? [])
    .flatMap((result) => (result.issues ?? []).map((issue) => issue.diagnostic ?? buildRouteValidationDiagnostic(issue, {
      agentId: result.agentId
    })));
}

export function splitRouteDiagnostics(diagnostics = []) {
  return {
    blocking: diagnostics.filter((diagnostic) => diagnostic.severity === 'blocking'),
    warnings: diagnostics.filter((diagnostic) => diagnostic.severity === 'warning'),
    info: diagnostics.filter((diagnostic) => diagnostic.severity === 'info')
  };
}

export function buildSolverValidationFeedback({ routeAudit = null, plan = null, level = null, mission = null, planner = null } = {}) {
  const diagnostics = collectRouteDiagnostics(routeAudit);
  const split = splitRouteDiagnostics(diagnostics);
  return {
    accepted: Boolean(routeAudit?.ok),
    valid: Boolean(routeAudit?.ok),
    diagnostics,
    blockingDiagnostics: split.blocking,
    warnings: split.warnings,
    firstBlockingIssue: split.blocking[0] ?? null,
    plannerMetadata: planner ?? plan?.planner ?? plan?.meta?.planner ?? null,
    challengeId: plan?.challengeId ?? plan?.instanceId ?? level?.instanceId ?? level?.challengeId ?? null,
    missionId: plan?.missionId ?? mission?.missionId ?? null
  };
}

export function formatDiagnosticForUi(diagnostic = null) {
  if (!diagnostic) return 'Route validation failed.';
  return diagnostic.message ?? diagnostic.explanation ?? `${diagnostic.label ?? diagnostic.category}.`;
}

export function formatDiagnosticDetails(diagnostic = null) {
  if (!diagnostic) return 'Route validation detail unavailable.';
  const lines = [
    `Blocking condition: ${diagnostic.label ?? diagnostic.category}`,
    diagnostic.segment?.fromWaypointLabel || diagnostic.segment?.toWaypointLabel
      ? `Segment: ${diagnostic.segment?.fromWaypointLabel ?? 'start'} -> ${diagnostic.segment?.toWaypointLabel ?? 'waypoint'}`
      : null,
    diagnostic.segment?.actualStartPosition ? `Actual start position: ${formatPoint(diagnostic.segment.actualStartPosition)}` : null,
    diagnostic.segment?.targetCell ? `Target waypoint: ${formatPoint(diagnostic.segment.targetCell)}` : null,
    diagnostic.blocking?.blockedCell ? `Blocked terrain cell: ${formatPoint(diagnostic.blocking.blockedCell)}` : null,
    diagnostic.blocking?.traversedCells?.length ? `Traversed cells checked: ${diagnostic.blocking.traversedCells.length}` : null,
    `Why this happened: ${diagnostic.explanation}`,
    `Fix: ${diagnostic.fixHint}`
  ].filter(Boolean);
  return lines.join('\n');
}

function normalizeDiagnosticCategory(issue = {}) {
  const routeReason = issue.routeBlockDiagnostic?.blocking?.reason;
  if (issue.type === 'invalidStart') return 'invalid_start';
  if (issue.type === 'invalidCoordinate') {
    if (issue.reason === 'terrain') return 'target_on_land';
    return 'invalid_coordinate';
  }
  if (issue.type === 'fuelExceeded' || issue.reason === 'fuel' || issue.reason === 'fuelExceeded') return 'fuel_exceeded';
  if (issue.type === 'timeExceeded' || issue.reason === 'time' || issue.reason === 'waypointTimeout') return 'time_exceeded';
  if (issue.type === 'nonMonotonicTime') return 'stale_route_state';
  if (issue.type === 'beachingRisk' || issue.reason === 'beachingRisk') return 'shoreline_current_risk';
  if (routeReason === 'blocked_endpoint') return 'target_on_land';
  if (routeReason === 'actual_drift_into_land') return 'current_drift_into_land';
  if (routeReason === 'no_path' || issue.reason === 'noLegalPath') return 'no_continuous_path';
  if (issue.type === 'segmentBlocked' || issue.reason === 'segmentBlocked' || issue.reason === 'routeBlocked') return 'segment_intersects_land';
  return 'unknown_route_block';
}

function buildSegmentDiagnostic(issue = {}, routeBlock = null) {
  const fromIndex = Number.isInteger(issue.segmentIndex) ? issue.segmentIndex - 1 : Number(issue.from?.index ?? NaN);
  const toIndex = Number.isInteger(issue.waypointIndex) ? issue.waypointIndex : Number(issue.to?.index ?? NaN);
  return {
    fromWaypointIndex: Number.isInteger(fromIndex) && fromIndex >= 0 ? fromIndex : null,
    toWaypointIndex: Number.isInteger(toIndex) && toIndex >= 0 ? toIndex : null,
    fromWaypointLabel: Number.isInteger(fromIndex) && fromIndex >= 0 ? `W${fromIndex + 1}` : 'start',
    toWaypointLabel: Number.isInteger(toIndex) && toIndex >= 0 ? `W${toIndex + 1}` : 'waypoint',
    plannedFromCell: normalizeCell(routeBlock?.plannedFromCell ?? issue.from),
    targetCell: normalizeCell(routeBlock?.plannedTargetCell ?? issue.to),
    actualStartPosition: routeBlock?.actualStartPosition ?? null,
    actualStartCell: normalizeCell(routeBlock?.actualStartCell)
  };
}

function buildExplanation({ category, definition, agentLabel, segment, blockedCell, issue }) {
  const blocked = blockedCell ? ` at cell ${formatPoint(blockedCell)}` : '';
  const segmentLabel = `${segment.fromWaypointLabel ?? 'start'} to ${segment.toWaypointLabel ?? 'waypoint'}`;
  if (category === 'segment_intersects_land') return `The continuous route segment from ${segmentLabel} intersects land${blocked}.`;
  if (category === 'target_on_land') return `The target waypoint is on blocked terrain${blocked}.`;
  if (category === 'source_on_land' || category === 'actual_position_blocked') return `The route source is on blocked terrain${blocked}.`;
  if (category === 'current_drift_into_land') return `The glider's actual or drifted position makes the segment enter blocked terrain${blocked}.`;
  if (category === 'fuel_exceeded') return `${agentLabel} does not have enough estimated fuel to execute this route segment.`;
  if (category === 'time_exceeded') return `${agentLabel} reaches this waypoint after the mission time limit.`;
  if (category === 'shoreline_current_risk') return issue.message ?? `The segment has shoreline current risk near ${blocked || 'land'}.`;
  return issue.message ?? definition.label;
}

function buildCompactMessage({ category, agentLabel, segment, blockedCell, issue }) {
  const blocked = blockedCell ? ` at ${formatPoint(blockedCell)}` : '';
  const segmentLabel = `${segment.fromWaypointLabel ?? 'start'} -> ${segment.toWaypointLabel ?? 'waypoint'}`;
  if (category === 'segment_intersects_land') return `${agentLabel} ${segmentLabel} intersects land${blocked}.`;
  if (category === 'target_on_land') return `${agentLabel} ${segment.toWaypointLabel ?? 'waypoint'} is on land${blocked}.`;
  if (category === 'fuel_exceeded') return `${agentLabel} ${segment.toWaypointLabel ?? 'waypoint'} exceeds estimated fuel.`;
  if (category === 'time_exceeded') return `${agentLabel} ${segment.toWaypointLabel ?? 'waypoint'} exceeds mission time.`;
  return issue.message ?? `${agentLabel} ${segmentLabel}: ${category.replace(/_/g, ' ')}.`;
}

function normalizeSeverity(severity, fallback) {
  if (severity === 'error') return 'blocking';
  if (['blocking', 'warning', 'info'].includes(severity)) return severity;
  return fallback ?? 'blocking';
}

function normalizeCell(cell) {
  if (!cell || !Number.isFinite(Number(cell.x)) || !Number.isFinite(Number(cell.y))) return null;
  return { x: Math.floor(Number(cell.x)), y: Math.floor(Number(cell.y)) };
}

function formatPoint(point) {
  if (!point || !Number.isFinite(Number(point.x)) || !Number.isFinite(Number(point.y))) return 'N/A';
  return `(${Number(point.x).toFixed(Number.isInteger(Number(point.x)) ? 0 : 1)}, ${Number(point.y).toFixed(Number.isInteger(Number(point.y)) ? 0 : 1)})`;
}
