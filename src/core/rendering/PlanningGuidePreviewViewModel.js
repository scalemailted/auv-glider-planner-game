export const PLANNING_GUIDE_PREVIEW_VIEW_MODEL_VERSION = 'planning-guide-preview-view-model-world-r1-1';

export function buildPlanningGuidePreviewViewModel({
  tool = null,
  interactionMode = null,
  selectedAgentId = null,
  mission = null,
  plan = null,
  candidatePoint = null,
  candidateCell = null,
  placementValidation = null,
  active = null
} = {}) {
  const activeTool = tool ?? interactionMode ?? 'selectInspect';
  const agentId = selectedAgentId ?? plan?.agentPlans?.[0]?.agentId ?? mission?.agents?.[0]?.id ?? mission?.agents?.[0]?.agentId ?? null;
  const origin = latestExecutableRouteEndpoint({ plan, mission, selectedAgentId: agentId });
  const candidate = normalizePoint(candidatePoint ?? candidateCell?.continuousPoint ?? candidateCell ?? null);
  const cell = normalizeCell(candidateCell ?? candidate?.derivedCell ?? null);
  const placementActive = active ?? (activeTool === 'placeWaypoint' || interactionMode === 'placeWaypoint');
  const warnings = [
    ...(placementValidation?.warnings ?? []),
    ...(placementValidation?.warningCodes ?? [])
  ].map(String);
  const validationStatus = placementValidation
    ? placementValidation.valid === false || placementValidation.allowed === false || placementValidation.commitAllowed === false
      ? 'INVALID'
      : warnings.length ? 'VALID_WITH_WARNINGS' : 'VALID'
    : null;
  const status = !placementActive
    ? 'INACTIVE'
    : !agentId ? 'NO_SELECTED_AGENT'
      : !origin.point ? 'NO_ORIGIN'
        : !candidate ? 'NO_CANDIDATE'
          : validationStatus ?? 'CANDIDATE';
  const isActive = placementActive && Boolean(agentId && origin.point && candidate);
  const segment = isActive ? { from: origin.point, to: candidate, lengthCells: round(distance(origin.point, candidate)) } : null;
  const digestInput = {
    version: PLANNING_GUIDE_PREVIEW_VIEW_MODEL_VERSION,
    activeTool,
    agentId,
    originType: origin.type,
    originId: origin.id,
    originPoint: origin.point,
    candidate,
    cell,
    validationStatus,
    status
  };
  return {
    type: 'anchor.rendering.planning-guide-preview',
    version: PLANNING_GUIDE_PREVIEW_VIEW_MODEL_VERSION,
    active: isActive,
    tool: activeTool,
    selectedAgentId: agentId,
    originType: origin.type,
    originId: origin.id,
    originPoint: origin.point,
    candidatePoint: candidate,
    candidateCell: cell,
    status,
    validationStatus,
    warningCodes: [...(placementValidation?.warningCodes ?? [])].map(String),
    warnings,
    from: origin.point,
    to: candidate,
    gridCell: cell,
    valid: validationStatus !== 'INVALID',
    segment,
    digest: `fnv1a-${fnv1aHex(stableStringify(digestInput))}`,
    boundaryFlags: {
      ownsPlanning: false,
      ownsSimulation: false,
      ownsScoring: false,
      previewOwnsPlan: false,
      previewIsExported: false,
      nonCanonical: true
    }
  };
}

export function normalizePlanningGuidePreview(preview = null) {
  if (!preview) return null;
  const originPoint = normalizePoint(preview.originPoint ?? preview.from);
  const candidatePoint = normalizePoint(preview.candidatePoint ?? preview.to ?? preview.gridCell);
  const candidateCell = normalizeCell(preview.candidateCell ?? preview.gridCell ?? candidatePoint?.derivedCell);
  const active = preview.active !== false && Boolean(originPoint && candidatePoint);
  const validationStatus = preview.validationStatus ?? (preview.valid === false ? 'INVALID' : active ? 'VALID' : null);
  const segment = active ? {
    ...(preview.segment ?? {}),
    from: originPoint,
    to: candidatePoint,
    lengthCells: round(preview.segment?.lengthCells ?? distance(originPoint, candidatePoint))
  } : null;
  const normalized = {
    ...clonePlain(preview),
    active,
    originPoint,
    candidatePoint,
    candidateCell,
    from: originPoint,
    to: candidatePoint,
    gridCell: candidateCell,
    valid: validationStatus !== 'INVALID',
    validationStatus,
    segment,
    boundaryFlags: {
      ...(preview.boundaryFlags ?? {}),
      previewOwnsPlan: false,
      previewIsExported: false,
      nonCanonical: true
    }
  };
  normalized.digest ??= `fnv1a-${fnv1aHex(stableStringify({
    selectedAgentId: normalized.selectedAgentId,
    originType: normalized.originType,
    originId: normalized.originId,
    originPoint,
    candidatePoint,
    validationStatus
  }))}`;
  return normalized;
}

export function planningGuidePreviewSummary(preview = null) {
  const normalized = normalizePlanningGuidePreview(preview);
  return {
    type: 'anchor.rendering.planning-guide-preview-summary',
    version: PLANNING_GUIDE_PREVIEW_VIEW_MODEL_VERSION,
    active: normalized?.active === true,
    selectedAgentId: normalized?.selectedAgentId ?? null,
    originType: normalized?.originType ?? null,
    originId: normalized?.originId ?? null,
    previewDigest: normalized?.digest ?? null,
    previewSegmentCount: normalized?.active ? 1 : 0,
    validationStatus: normalized?.validationStatus ?? null,
    previewOwnsPlan: false,
    previewIsExported: false
  };
}

export function latestExecutableRouteEndpoint({ plan = null, mission = null, selectedAgentId = null } = {}) {
  const agentId = selectedAgentId ?? plan?.agentPlans?.[0]?.agentId ?? mission?.agents?.[0]?.id ?? mission?.agents?.[0]?.agentId ?? null;
  const agentPlan = (plan?.agentPlans ?? []).find((candidate) => candidate.agentId === agentId) ?? null;
  const waypoints = (agentPlan?.waypoints ?? []).filter((waypoint) => waypoint?.visible !== false && waypoint?.executable !== false);
  if (waypoints.length) {
    const waypoint = waypoints[waypoints.length - 1];
    return { type: 'routeEndpoint', id: waypoint.id ?? waypoint.waypointId ?? `${agentId}:waypoint-${waypoints.length}`, point: normalizePoint(waypoint) };
  }
  const agent = (mission?.agents ?? []).find((candidate) => (candidate.id ?? candidate.agentId) === agentId) ?? null;
  const start = agentPlan?.selectedStart ?? agent?.deployment?.selectedStart ?? agent?.selectedStart ?? agent?.start ?? null;
  return { type: start ? 'deploymentStart' : null, id: start ? `${agentId}:deploymentStart` : null, point: normalizePoint(start) };
}

function normalizePoint(point = null) {
  if (!point) return null;
  const x = Number(point.x ?? point.col);
  const y = Number(point.y ?? point.row);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    x: round(x),
    y: round(y),
    coordinateFrame: point.coordinateFrame ?? point.position?.coordinateFrame ?? 'continuousGridV1',
    derivedCell: normalizeCell(point.derivedCell ?? point.legacyCell ?? point.containingCell ?? point)
  };
}

function normalizeCell(cell = null) {
  if (!cell) return null;
  const col = Number(cell.col ?? cell.x);
  const row = Number(cell.row ?? cell.y);
  if (!Number.isFinite(col) || !Number.isFinite(row)) return null;
  return { col: Math.round(col), row: Math.round(row), x: Math.round(col), y: Math.round(row) };
}

function distance(a, b) {
  return Math.hypot(Number(b?.x ?? 0) - Number(a?.x ?? 0), Number(b?.y ?? 0) - Number(a?.y ?? 0));
}

function clonePlain(value = null) {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(clonePlain);
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, clonePlain(child)]));
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (!value || typeof value !== 'object') return JSON.stringify(value);
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function fnv1aHex(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}
