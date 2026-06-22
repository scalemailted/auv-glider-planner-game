import { getWindowStartTime } from '../time/MissionTime.js';
import { attachIdentityToPlan } from '../identity/GameInstanceId.js';
import { getSelectedStart, isValidSelectedStart, setSelectedStart } from '../deployment/DeploymentZones.js';
import { WAYPOINT_KINDS, normalizeWaypointKind } from './WaypointSemantics.js';
import {
  CONTINUOUS_COORDINATE_PROFILE_ID,
  LEGACY_INTEGER_COORDINATE_PROFILE_ID
} from '../geometry/ContinuousMissionCoordinates.js';
import {
  normalizeContinuousMissionWaypoint,
  normalizeCoordinateProfileId
} from './ContinuousMissionWaypoint.js';
import {
  normalizeContinuousScienceTarget,
  validateContinuousScienceTarget
} from '../science/ContinuousScienceTarget.js';

export const VALID_WAYPOINT_ACTIONS = ['sample', 'transit', 'return', 'hold'];

export function createEmptyPlan(level, mission) {
  return attachIdentityToPlan(normalizePlan({
    schemaVersion: '2.0',
    type: 'anchor.plan',
    coordinateProfileId: defaultCoordinateProfileId(level, mission),
    fieldSamplingProfileId: defaultFieldSamplingProfileId(level, mission),
    levelId: level?.levelId ?? null,
    missionId: mission?.missionId ?? null,
    meta: {
      name: 'Manual Player Plan',
      createdAt: new Date().toISOString()
    },
    planningMarkers: [],
    scienceTargets: [],
    agentPlans: (mission?.agents ?? []).map((agent) => ({
      agentId: agent.id,
      selectedStart: getSelectedStart(agent) ?? null,
      waypoints: []
    }))
  }, level, mission), level, mission);
}

export function normalizePlan(plan, level, mission) {
  if (!plan || typeof plan !== 'object') {
    throw new Error('Plan JSON must be an object.');
  }

  const normalized = {
    schemaVersion: String(plan.schemaVersion ?? '2.0'),
    type: plan.type ?? null,
    levelId: plan.levelId ?? level?.levelId ?? null,
    instanceId: plan.instanceId ?? plan.meta?.levelIdentity?.instanceId ?? level?.instanceId ?? null,
    missionId: plan.missionId ?? mission?.missionId ?? null,
    challengeId: plan.challengeId ?? plan.instanceId ?? plan.meta?.levelIdentity?.instanceId ?? level?.instanceId ?? null,
    executionMode: plan.executionMode ?? plan.meta?.executionMode ?? 'openLoop',
    planner: plan.planner ?? plan.meta?.planner ?? null,
    importMetadata: plan.importMetadata ?? null,
    surfaceSegments: Array.isArray(plan.surfaceSegments) ? plan.surfaceSegments : [],
    coordinateProfileId: defaultCoordinateProfileId(level, mission, plan),
    fieldSamplingProfileId: defaultFieldSamplingProfileId(level, mission, plan),
    meta: {
      name: plan.meta?.name ?? 'Imported Waypoint Plan',
      createdAt: plan.meta?.createdAt ?? new Date().toISOString(),
      coordinateProfileId: defaultCoordinateProfileId(level, mission, plan),
      fieldSamplingProfileId: defaultFieldSamplingProfileId(level, mission, plan),
      ...copyExtraMeta(plan.meta)
    },
    planningMarkers: [],
    scienceTargets: [],
    agentPlans: []
  };
  const rawScienceTargets = Array.isArray(plan.scienceTargets) ? plan.scienceTargets : (Array.isArray(plan.samplingTargets) ? plan.samplingTargets : []);
  rawScienceTargets.forEach((target) => {
    if (!target || typeof target !== 'object') return;
    normalized.scienceTargets.push(normalizeContinuousScienceTarget(target));
  });

  const rawPlanningMarkers = Array.isArray(plan.planningMarkers) ? plan.planningMarkers : [];
  rawPlanningMarkers.forEach((marker) => {
    if (!marker || typeof marker !== 'object') return;
    normalized.planningMarkers.push(normalizeMarker(marker, null, normalized.planningMarkers.length, level));
  });

  const rawAgentPlans = Array.isArray(plan.agentPlans) ? plan.agentPlans : [];
  for (const rawAgentPlan of rawAgentPlans) {
    if (!rawAgentPlan || typeof rawAgentPlan !== 'object') continue;
    const agentId = String(rawAgentPlan.agentId ?? '').trim();
    if (!agentId) continue;
    const agentPlan = getAgentPlan(normalized, agentId);
    for (const key of ['diveProfileId', 'targetDepthLayerId', 'samplingMode']) {
      if (rawAgentPlan[key] !== undefined && rawAgentPlan[key] !== null) agentPlan[key] = String(rawAgentPlan[key]);
    }
    for (const key of ['maximumDiveDepthMeters', 'maximumDepthMeters', 'sampleIntervalSeconds', 'cycleCount']) {
      const value = Number(rawAgentPlan[key]);
      if (Number.isFinite(value)) agentPlan[key] = value;
    }
    if (Array.isArray(rawAgentPlan.scienceTargetIds)) agentPlan.scienceTargetIds = uniqueStrings(rawAgentPlan.scienceTargetIds);
    if (rawAgentPlan.selectedStart) {
      const validation = isValidSelectedStart(level, mission, agentId, rawAgentPlan.selectedStart);
      if (validation.valid) {
        agentPlan.selectedStart = normalizeSelectedStart(rawAgentPlan.selectedStart, normalized.coordinateProfileId);
      }
    }
    const rawWaypoints = Array.isArray(rawAgentPlan.waypoints) ? rawAgentPlan.waypoints : [];

    rawWaypoints.forEach((waypoint) => {
      if (!waypoint || typeof waypoint !== 'object') return;
      agentPlan.waypoints.push(normalizeWaypoint(waypoint, agentId, agentPlan.waypoints.length, level, { ...normalized, mission }));
    });
    const rawMarkers = Array.isArray(rawAgentPlan.markers) ? rawAgentPlan.markers : [];
    rawMarkers.forEach((marker) => {
      if (!marker || typeof marker !== 'object') return;
      normalized.planningMarkers.push(normalizeMarker(marker, null, normalized.planningMarkers.length, level));
    });
  }

  for (const agent of mission?.agents ?? []) {
    const agentPlan = getAgentPlan(normalized, agent.id);
    agentPlan.selectedStart ??= getSelectedStart(agent) ?? null;
  }

  fillMissingWaypointIds(normalized);
  fillMissingMarkerIds(normalized);
  fillMissingScienceTargetIds(normalized);
  for (const agentPlan of normalized.agentPlans ?? []) {
    if (agentPlan.selectedStart) setSelectedStart(level, mission, normalized, agentPlan.agentId, agentPlan.selectedStart);
  }
  return normalized;
}

export function validatePlan(plan, mission) {
  const errors = [];
  const warnings = [];

  if (!plan || typeof plan !== 'object') {
    errors.push('Plan JSON must be an object.');
    return { valid: false, errors, warnings };
  }
  if (plan.type !== 'anchor.plan') errors.push('Plan type must be "anchor.plan".');
  if (!Array.isArray(plan.agentPlans)) errors.push('Plan must contain an agentPlans array.');

  const knownAgentIds = new Set((mission?.agents ?? []).map((agent) => agent.id));
  const ids = new Set();
  for (const agentPlan of plan.agentPlans ?? []) {
    if (!agentPlan?.agentId) {
      errors.push('Each agent plan needs an agentId.');
      continue;
    }
    if (knownAgentIds.size > 0 && !knownAgentIds.has(agentPlan.agentId)) {
      warnings.push(`Plan references unknown agentId "${agentPlan.agentId}".`);
    }
    if (!Array.isArray(agentPlan.waypoints)) {
      errors.push(`Agent "${agentPlan.agentId}" must have a waypoints array.`);
      continue;
    }
    if (agentPlan.markers && !Array.isArray(agentPlan.markers)) {
      warnings.push(`Agent "${agentPlan.agentId}" legacy markers must be an array when present.`);
    }
    if (agentPlan.selectedStart && (!Number.isFinite(Number(agentPlan.selectedStart.x)) || !Number.isFinite(Number(agentPlan.selectedStart.y)))) {
      warnings.push(`Selected start for "${agentPlan.agentId}" needs numeric x and y.`);
    }
    agentPlan.waypoints.forEach((waypoint, index) => {
      if (!Number.isFinite(waypoint.x) || !Number.isFinite(waypoint.y)) {
        errors.push(`Waypoint ${index + 1} for "${agentPlan.agentId}" needs numeric x and y.`);
      }
      if (!VALID_WAYPOINT_ACTIONS.includes(waypoint.action)) {
        errors.push(`Waypoint ${index + 1} for "${agentPlan.agentId}" has invalid action "${waypoint.action}".`);
      }
      if (waypoint.kind && !WAYPOINT_KINDS.includes(waypoint.kind)) {
        warnings.push(`Waypoint ${index + 1} for "${agentPlan.agentId}" has unknown kind "${waypoint.kind}" and will be treated as navigation.`);
      }
      if (waypoint.id) {
        if (ids.has(waypoint.id)) warnings.push(`Duplicate waypoint id "${waypoint.id}" was found.`);
        ids.add(waypoint.id);
      }
    });
  }
  (plan.planningMarkers ?? []).forEach((marker, index) => {
    if (!Number.isFinite(marker.x) || !Number.isFinite(marker.y)) {
      errors.push(`Planning marker ${index + 1} needs numeric x and y.`);
    }
  });

  (plan.scienceTargets ?? []).forEach((target, index) => {
    const validation = validateContinuousScienceTarget(target);
    if (!validation.valid) errors.push(`Science target ${index + 1}: ${validation.errors[0] ?? 'invalid target'}`);
    warnings.push(...validation.warnings.map((warning) => `Science target ${index + 1}: ${warning}`));
    if (validation.target.executable !== false) errors.push(`Science target ${index + 1} must be non-executable.`);
  });

  return { valid: errors.length === 0, errors, warnings };
}

export function getAgentPlan(plan, agentId) {
  if (!plan.agentPlans) plan.agentPlans = [];
  let agentPlan = plan.agentPlans.find((candidate) => candidate.agentId === agentId);
  if (!agentPlan) {
    agentPlan = { agentId, selectedStart: null, waypoints: [] };
    plan.agentPlans.push(agentPlan);
  }
  if (!Array.isArray(agentPlan.waypoints)) agentPlan.waypoints = [];
  return agentPlan;
}

export function addWaypoint(plan, agentId, waypoint) {
  const agentPlan = getAgentPlan(plan, agentId);
  const normalized = normalizeWaypoint(waypoint, agentId, agentPlan.waypoints.length, null, plan);
  agentPlan.waypoints.push(normalized);
  fillMissingWaypointIds(plan);
  return normalized;
}

export function updateWaypoint(plan, agentId, waypointIndex, patch) {
  const agentPlan = getAgentPlan(plan, agentId);
  const current = agentPlan.waypoints[waypointIndex];
  if (!current) return null;
  agentPlan.waypoints[waypointIndex] = normalizeWaypoint({ ...current, ...patch }, agentId, waypointIndex, null, plan);
  fillMissingWaypointIds(plan);
  return agentPlan.waypoints.find((waypoint) => waypoint.id === current.id) ?? agentPlan.waypoints[waypointIndex];
}

export function reorderWaypoint(plan, agentId, fromIndex, toIndex) {
  const agentPlan = getAgentPlan(plan, agentId);
  const waypoints = agentPlan.waypoints ?? [];
  if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) return false;
  if (fromIndex < 0 || fromIndex >= waypoints.length) return false;
  const boundedToIndex = Math.max(0, Math.min(waypoints.length - 1, toIndex));
  if (fromIndex === boundedToIndex) return false;

  const [waypoint] = waypoints.splice(fromIndex, 1);
  waypoints.splice(boundedToIndex, 0, waypoint);
  fillMissingWaypointIds(plan);
  return true;
}

export function moveWaypointUp(plan, agentId, index) {
  return reorderWaypoint(plan, agentId, index, index - 1);
}

export function moveWaypointDown(plan, agentId, index) {
  return reorderWaypoint(plan, agentId, index, index + 1);
}

export function removeWaypoint(plan, agentId, waypointIndex) {
  const agentPlan = getAgentPlan(plan, agentId);
  if (waypointIndex < 0 || waypointIndex >= agentPlan.waypoints.length) return null;
  const [removed] = agentPlan.waypoints.splice(waypointIndex, 1);
  return removed ?? null;
}

export function addMarker(plan, agentId, marker) {
  if (!Array.isArray(plan.planningMarkers)) plan.planningMarkers = [];
  const normalized = normalizeMarker(marker, null, plan.planningMarkers.length);
  plan.planningMarkers.push(normalized);
  fillMissingMarkerIds(plan);
  return normalized;
}

export function removeMarker(plan, agentId, markerIndex) {
  if (!Array.isArray(plan.planningMarkers)) plan.planningMarkers = [];
  if (markerIndex < 0 || markerIndex >= plan.planningMarkers.length) return null;
  const [removed] = plan.planningMarkers.splice(markerIndex, 1);
  return removed ?? null;
}

export function addScienceTarget(plan, target) {
  if (!Array.isArray(plan.scienceTargets)) plan.scienceTargets = [];
  const normalized = normalizeContinuousScienceTarget(target);
  plan.scienceTargets.push(normalized);
  fillMissingScienceTargetIds(plan);
  return normalized;
}

export function updateScienceTarget(plan, targetId, patch = {}) {
  if (!Array.isArray(plan.scienceTargets)) plan.scienceTargets = [];
  const index = plan.scienceTargets.findIndex((target) => target.id === targetId || target.targetId === targetId);
  if (index < 0) return null;
  plan.scienceTargets[index] = normalizeContinuousScienceTarget({ ...plan.scienceTargets[index], ...patch });
  return plan.scienceTargets[index];
}

export function removeScienceTarget(plan, targetId) {
  if (!Array.isArray(plan.scienceTargets)) plan.scienceTargets = [];
  const index = plan.scienceTargets.findIndex((target) => target.id === targetId || target.targetId === targetId);
  if (index < 0) return null;
  const [removed] = plan.scienceTargets.splice(index, 1);
  for (const agentPlan of plan.agentPlans ?? []) {
    agentPlan.scienceTargetIds = (agentPlan.scienceTargetIds ?? []).filter((id) => id !== targetId);
    for (const waypoint of agentPlan.waypoints ?? []) waypoint.scienceTargetIds = (waypoint.scienceTargetIds ?? []).filter((id) => id !== targetId);
  }
  return removed ?? null;
}

export function getScienceTargetById(plan, targetId) {
  return (plan?.scienceTargets ?? []).find((target) => target.id === targetId || target.targetId === targetId) ?? null;
}

export function convertMarkerToWaypoint(plan, agentId, markerIndex, patch = {}) {
  const marker = plan?.planningMarkers?.[markerIndex];
  if (!marker) return null;
  const waypoint = addWaypoint(plan, agentId, {
    x: marker.x,
    y: marker.y,
    t: marker.t,
    window: marker.window,
    kind: patch.kind ?? 'navigation',
    action: patch.action ?? 'sample',
    note: marker.linkedTargetId ? `Converted from marker linked to ${marker.linkedTargetId}` : marker.label
  });
  removeMarker(plan, agentId, markerIndex);
  return waypoint;
}

export function clearAgentMarkers(plan, agentId) {
  plan.planningMarkers = [];
}

export function absorbPlanningMarkersForWaypoint(plan, waypoint, { timeTolerance = 0.75 } = {}) {
  const markers = plan?.planningMarkers ?? [];
  const waypointTime = Number(waypoint?.estimatedArrivalTime ?? waypoint?.t ?? 0);
  const index = markers.findIndex((marker) => (
    Math.round(marker.x) === Math.round(waypoint.x)
    && Math.round(marker.y) === Math.round(waypoint.y)
    && Math.abs(Number(marker.t ?? 0) - waypointTime) <= timeTolerance
  ));
  if (index < 0) return null;
  const [marker] = markers.splice(index, 1);
  if (marker?.label && !waypoint.note) waypoint.note = `Converted marker: ${marker.label}`;
  if (marker?.linkedTargetId) waypoint.linkedTargetId = marker.linkedTargetId;
  return marker ?? null;
}

export function moveWaypoint(plan, agentId, index, x, y) {
  return updateWaypoint(plan, agentId, index, { x, y });
}

export function getWaypointAtCell(plan, x, y, agentId = null) {
  const plans = agentId
    ? (plan?.agentPlans ?? []).filter((agentPlan) => agentPlan.agentId === agentId)
    : (plan?.agentPlans ?? []);

  for (const agentPlan of plans) {
    for (let index = (agentPlan.waypoints?.length ?? 0) - 1; index >= 0; index -= 1) {
      const waypoint = agentPlan.waypoints[index];
      if (Math.round(waypoint.x) === x && Math.round(waypoint.y) === y) {
        return { agentId: agentPlan.agentId, index, waypoint };
      }
    }
  }
  return null;
}

export function getMarkerAtCell(plan, x, y, agentId = null) {
  for (let index = (plan?.planningMarkers?.length ?? 0) - 1; index >= 0; index -= 1) {
    const marker = plan.planningMarkers[index];
    if (Math.round(marker.x) === x && Math.round(marker.y) === y) {
      return { agentId: null, index, marker };
    }
  }
  return null;
}

export function hitTestWaypoint(point, plan, renderState = {}) {
  if (!point) return null;
  return getWaypointAtCell(plan, point.x, point.y, renderState.agentId ?? renderState.selectedAgentId ?? null);
}

export function isValidWaypointCell(level, x, y) {
  if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) {
    return { valid: false, block: true, message: 'Choose a valid grid cell.' };
  }
  const cx = Math.round(Number(x));
  const cy = Math.round(Number(y));
  const grid = level?.world?.grid;
  if (!grid || cx < 0 || cy < 0 || cx >= grid.width || cy >= grid.height) {
    return { valid: false, block: true, message: 'Waypoint target is outside the map.' };
  }

  if (level?.layers?.terrain?.[cy]?.[cx]) {
    return { valid: false, block: true, message: 'Waypoints must be placed in water cells.' };
  }

  if (level?.layers?.hazards?.[cy]?.[cx]) {
    return { valid: true, block: false, warning: true, message: 'Waypoint placed inside a hazard cell.', cell: { x: cx, y: cy } };
  }

  return { valid: true, block: false, warning: false, message: '', cell: { x: cx, y: cy } };
}

export function getAgentStartAtCell(mission, x, y) {
  return (mission?.agents ?? []).find((agent) => {
    const selectedStart = getSelectedStart(agent);
    return Math.round(selectedStart?.x ?? NaN) === x && Math.round(selectedStart?.y ?? NaN) === y;
  }) ?? null;
}

export function clearAgentWaypoints(plan, agentId) {
  getAgentPlan(plan, agentId).waypoints = [];
}

export function clearAllWaypoints(plan) {
  for (const agentPlan of plan.agentPlans ?? []) {
    agentPlan.waypoints = [];
  }
}

export function sortWaypointsByWindow(plan) {
  for (const agentPlan of plan.agentPlans ?? []) {
    agentPlan.waypoints = (agentPlan.waypoints ?? [])
      .map((waypoint, index) => ({ waypoint, index }))
      .sort((a, b) => (a.waypoint.window - b.waypoint.window) || (a.index - b.index))
      .map(({ waypoint }) => waypoint);
  }
  return plan;
}

export function getWaypointCount(plan) {
  return (plan?.agentPlans ?? []).reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0);
}

export function getUnknownAgentIds(plan, mission) {
  const knownAgentIds = new Set((mission?.agents ?? []).map((agent) => agent.id));
  return (plan?.agentPlans ?? [])
    .map((agentPlan) => agentPlan.agentId)
    .filter((agentId) => agentId && knownAgentIds.size > 0 && !knownAgentIds.has(agentId));
}

function normalizeSelectedStart(start = {}, coordinateProfileId = LEGACY_INTEGER_COORDINATE_PROFILE_ID) {
  const continuous = normalizeCoordinateProfileId(coordinateProfileId) === CONTINUOUS_COORDINATE_PROFILE_ID;
  const x = continuous ? roundCoordinate(start.x) : Math.round(Number(start.x));
  const y = continuous ? roundCoordinate(start.y) : Math.round(Number(start.y));
  return {
    x,
    y,
    coordinateFrame: continuous ? CONTINUOUS_COORDINATE_PROFILE_ID : LEGACY_INTEGER_COORDINATE_PROFILE_ID,
    containingCell: { x: Math.round(Number(start.x)), y: Math.round(Number(start.y)) }
  };
}
function normalizeWaypoint(waypoint, agentId, index, level = null, planContext = null) {
  const action = VALID_WAYPOINT_ACTIONS.includes(waypoint.action) ? waypoint.action : 'sample';
  const kind = normalizeWaypointKind(waypoint);
  const coordinateProfileId = normalizeCoordinateProfileId(waypoint.coordinateProfileId ?? planContext?.coordinateProfileId ?? planContext?.meta?.coordinateProfileId ?? LEGACY_INTEGER_COORDINATE_PROFILE_ID);
  const continuous = normalizeContinuousMissionWaypoint({
    ...waypoint,
    agentId,
    action,
    coordinateProfileId
  }, {
    level,
    grid: level?.world?.grid,
    agentId,
    coordinateProfileId
  });
  const x = coordinateProfileId === CONTINUOUS_COORDINATE_PROFILE_ID ? roundCoordinate(continuous.x) : Math.round(Number(continuous.x));
  const y = coordinateProfileId === CONTINUOUS_COORDINATE_PROFILE_ID ? roundCoordinate(continuous.y) : Math.round(Number(continuous.y));
  const window = Number(waypoint.window ?? 0);
  const normalizedWindow = Number.isFinite(window) ? Math.max(0, Math.floor(window)) : 0;
  const t = Number(waypoint.t ?? waypoint.plannedTime ?? getWindowStartTime(level, normalizedWindow));

  const normalized = {
    id: waypoint.id ? String(waypoint.id) : makeWaypointId(agentId, index),
    window: normalizedWindow,
    t: Number.isFinite(t) ? t : getWindowStartTime(level, normalizedWindow),
    x: Number.isFinite(x) ? x : NaN,
    y: Number.isFinite(y) ? y : NaN,
    position: { x, y, coordinateFrame: continuous.position.coordinateFrame },
    coordinateProfileId,
    validationRadius: continuous.validationRadius,
    legacyCell: continuous.legacyCell,
    derivedCell: continuous.derivedCell,
    kind,
    waypointKind: kind,
    action,
    note: waypoint.note ? String(waypoint.note) : ''
  };
  for (const key of ['diveProfileId', 'targetDepthLayerId', 'depthLayerId', 'depthLayer', 'samplingMode', 'sensorProfileId']) {
    if (waypoint[key] !== undefined && waypoint[key] !== null && String(waypoint[key]).trim()) normalized[key] = String(waypoint[key]);
  }
  for (const key of ['maximumDiveDepthMeters', 'depthMeters', 'maximumDepthMeters', 'sampleIntervalSeconds', 'cycleCount']) {
    const value = Number(waypoint[key]);
    if (Number.isFinite(value)) normalized[key] = value;
  }
  if (kind === 'surface') {
    normalized.gpsFix = waypoint.gpsFix !== false;
    normalized.canReplan = waypoint.canReplan !== false;
  }
  if (kind === 'terminalCarryThrough') {
    normalized.terminalCarryThrough = true;
    normalized.intentionalOverDuration = waypoint.intentionalOverDuration !== false;
    normalized.runtimeBehavior = 'truncate_at_mission_end';
    normalized.terminalCarryThroughReason = waypoint.terminalCarryThroughReason
      ? String(waypoint.terminalCarryThroughReason)
      : 'mission_horizon_coverage';
  }
  if (waypoint.linkedTargetId) normalized.linkedTargetId = String(waypoint.linkedTargetId);
  if (waypoint.targetId) normalized.targetId = String(waypoint.targetId);
  if (Array.isArray(waypoint.scienceTargetIds)) normalized.scienceTargetIds = uniqueStrings(waypoint.scienceTargetIds);
  else if (waypoint.scienceTargetId) normalized.scienceTargetIds = uniqueStrings([waypoint.scienceTargetId]);
  for (const key of [
    'estimatedArrivalTime',
    'missionDurationAtPlanning',
    'energyMargin',
    'segmentEnergy',
    'cumulativeEnergy',
    'remainingFuelEstimate',
    'currentAssist',
    'segmentTravelTime',
    'estimatedTravelTime'
  ]) {
    const value = Number(waypoint[key]);
    if (Number.isFinite(value)) normalized[key] = value;
  }
  if (waypoint.arrivalUncertainty && typeof waypoint.arrivalUncertainty === 'object') {
    const radiusX = Number(waypoint.arrivalUncertainty.radiusX);
    const radiusY = Number(waypoint.arrivalUncertainty.radiusY);
    const angle = Number(waypoint.arrivalUncertainty.angle);
    normalized.arrivalUncertainty = {
      radiusX: Number.isFinite(radiusX) ? radiusX : 0.5,
      radiusY: Number.isFinite(radiusY) ? radiusY : 0.35,
      angle: Number.isFinite(angle) ? angle : 0
    };
  }
  if (waypoint.validity && typeof waypoint.validity === 'object') {
    normalized.validity = {
      valid: waypoint.validity.valid !== false,
      reasons: Array.isArray(waypoint.validity.reasons)
        ? waypoint.validity.reasons.map((reason) => String(reason))
        : []
    };
    if (waypoint.validity.routeAudit) normalized.validity.routeAudit = { ...waypoint.validity.routeAudit };
  }
  if (Array.isArray(waypoint.warnings)) normalized.warnings = waypoint.warnings.map((warning) => String(warning));
  if (Array.isArray(waypoint.warningCodes)) normalized.warningCodes = waypoint.warningCodes.map((warning) => String(warning));
  if (waypoint.likelyReachedWithinWindow !== undefined) normalized.likelyReachedWithinWindow = waypoint.likelyReachedWithinWindow !== false;
  if (waypoint.runtimeBehavior) normalized.runtimeBehavior = String(waypoint.runtimeBehavior);
  if (waypoint.riskSummary && typeof waypoint.riskSummary === 'object') normalized.riskSummary = { ...waypoint.riskSummary };
  if (waypoint.planningDiagnostics && typeof waypoint.planningDiagnostics === 'object') normalized.planningDiagnostics = { ...waypoint.planningDiagnostics };
  return normalized;
}
function normalizeMarker(marker, agentId, index, level = null) {
  const x = Number(marker.x);
  const y = Number(marker.y);
  const window = Number(marker.window ?? 0);
  const normalizedWindow = Number.isFinite(window) ? Math.max(0, Math.floor(window)) : 0;
  const t = Number(marker.t ?? getWindowStartTime(level, normalizedWindow));
  const normalized = {
    id: marker.id ? String(marker.id) : makeMarkerId(agentId, index),
    x: Number.isFinite(x) ? Math.round(x) : NaN,
    y: Number.isFinite(y) ? Math.round(y) : NaN,
    t: Number.isFinite(t) ? t : getWindowStartTime(level, normalizedWindow),
    window: normalizedWindow,
    type: marker.type ? String(marker.type) : 'futureTarget',
    label: marker.label ? String(marker.label) : 'Planning Marker',
    executable: false,
    linkedTargetId: marker.linkedTargetId ? String(marker.linkedTargetId) : null,
    note: marker.note ? String(marker.note) : ''
  };
  for (const key of ['roiValueAtPlacement', 'priorityValueAtPlacement']) {
    const value = Number(marker[key]);
    if (Number.isFinite(value)) normalized[key] = value;
  }
  if (marker.reachability && typeof marker.reachability === 'object') {
    normalized.reachability = normalizeMarkerReachability(marker.reachability);
  }
  return normalized;
}

function normalizeMarkerReachability(reachability) {
  const normalized = {
    status: ['reachable', 'tight', 'risky', 'impossible'].includes(reachability.status) ? reachability.status : 'risky',
    routeRiskStatus: reachability.routeRiskStatus ? String(reachability.routeRiskStatus) : 'estimate',
    warnings: Array.isArray(reachability.warnings) ? reachability.warnings.map((warning) => String(warning)) : []
  };
  for (const key of [
    'availableTime',
    'estimatedTravelTime',
    'timeSlack',
    'estimatedEnergy',
    'remainingFuel',
    'consumedFuel',
    'distance',
    'currentAssist',
    'crossCurrent',
    'recommendedBackfillSteps',
    'targetTime',
    'window'
  ]) {
    const value = Number(reachability[key]);
    if (Number.isFinite(value)) normalized[key] = value;
  }
  if (reachability.anchor && typeof reachability.anchor === 'object') {
    normalized.anchor = {
      x: Number(reachability.anchor.x),
      y: Number(reachability.anchor.y),
      t: Number(reachability.anchor.t ?? 0),
      source: reachability.anchor.source ? String(reachability.anchor.source) : 'route',
      waypointIndex: Number.isInteger(reachability.anchor.waypointIndex) ? reachability.anchor.waypointIndex : null
    };
  }
  return normalized;
}

function defaultCoordinateProfileId(level = null, mission = null, plan = null) {
  const explicit = plan?.coordinateProfileId
    ?? plan?.meta?.coordinateProfileId
    ?? mission?.coordinateProfileId
    ?? mission?.meta?.coordinateProfileId
    ?? level?.coordinateProfileId
    ?? level?.meta?.coordinateProfileId
    ?? level?.world?.coordinateProfileId;
  if (explicit) return normalizeCoordinateProfileId(explicit);
  const configSource = mission?.meta?.waterColumnConfigSource
    ?? mission?.waterColumnConfig?.source
    ?? level?.meta?.waterColumnConfigSource
    ?? level?.world?.waterColumnConfig?.source;
  return configSource === 'generatedModernMission' ? CONTINUOUS_COORDINATE_PROFILE_ID : LEGACY_INTEGER_COORDINATE_PROFILE_ID;
}

function defaultFieldSamplingProfileId(level = null, mission = null, plan = null) {
  return plan?.fieldSamplingProfileId
    ?? plan?.meta?.fieldSamplingProfileId
    ?? mission?.fieldSamplingProfileId
    ?? mission?.meta?.fieldSamplingProfileId
    ?? level?.fieldSamplingProfileId
    ?? level?.meta?.fieldSamplingProfileId
    ?? (defaultCoordinateProfileId(level, mission, plan) === CONTINUOUS_COORDINATE_PROFILE_ID ? 'continuousTrilinearV1' : 'legacyNearestCellV1');
}

function roundCoordinate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(6)) : NaN;
}
function fillMissingWaypointIds(plan) {
  for (const agentPlan of plan.agentPlans ?? []) {
    const used = new Set();
    agentPlan.waypoints.forEach((waypoint, index) => {
      if (!waypoint.id || used.has(waypoint.id)) {
        waypoint.id = makeWaypointId(agentPlan.agentId, index);
      }
      used.add(waypoint.id);
    });
  }
}

function fillMissingMarkerIds(plan) {
  const used = new Set();
  plan.planningMarkers ??= [];
  plan.planningMarkers.forEach((marker, index) => {
    if (!marker.id || used.has(marker.id)) {
      marker.id = makeMarkerId('global', index);
    }
    used.add(marker.id);
  });
}

function fillMissingScienceTargetIds(plan) {
  const used = new Set();
  plan.scienceTargets ??= [];
  plan.scienceTargets.forEach((target, index) => {
    if (!target.id || used.has(target.id)) {
      target.id = `science_target_${String(index + 1).padStart(3, '0')}`;
    }
    used.add(target.id);
  });
}

function makeWaypointId(agentId, index) {
  return `${agentId}_wp_${String(index + 1).padStart(3, '0')}`;
}

function makeMarkerId(agentId, index) {
  return `${agentId}_marker_${String(index + 1).padStart(3, '0')}`;
}

function uniqueStrings(value) {
  const raw = Array.isArray(value) ? value : value == null ? [] : [value];
  return [...new Set(raw.map((item) => String(item ?? '').trim()).filter(Boolean))];
}

function copyExtraMeta(meta = {}) {
  const extra = { ...meta };
  delete extra.name;
  delete extra.createdAt;
  return extra;
}
