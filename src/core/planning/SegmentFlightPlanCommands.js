import { getAgentPlan, updateWaypoint } from './WaypointPlan.js';
import { buildMissionRouteSegments } from './MissionRouteSegment.js';
import { normalizeSegmentFlightPlan, segmentFlightPlanDigest, validateSegmentFlightPlan } from './SegmentFlightPlan.js';

export const SEGMENT_FLIGHT_PLAN_COMMAND_VERSION = 'segment-flight-plan-commands-dive-ux-r1';

export const SEGMENT_FLIGHT_PLAN_PATCH_KEYS = Object.freeze([
  'diveProfileId',
  'targetDepthLayerId',
  'depthLayerId',
  'targetDepthMeters',
  'minimumImmersionMeters',
  'maximumImmersionMeters',
  'maximumDiveDepthMeters',
  'maximumDepthMeters',
  'cycleCount',
  'sampleIntervalSeconds',
  'samplingPhase',
  'arrivalBehavior',
  'surfaceAtEnd',
  'communicationWaitSeconds'
]);

export function createSegmentFlightPlanDraft(plan, options = {}) {
  const target = resolveTargetWaypoint(plan, options);
  const segment = findIncomingSegment(plan, { ...options, waypointId: target?.waypoint?.id, waypointIndex: target?.index });
  const canonical = segment?.flightProfile ?? null;
  const validation = canonical ? validateSegmentFlightPlan(canonical, options) : { valid: false, status: 'FAIL', errors: ['No incoming segment is selected.'], warnings: [] };
  return {
    type: 'anchor.ui.segment-flight-plan-draft',
    version: SEGMENT_FLIGHT_PLAN_COMMAND_VERSION,
    agentId: target?.agentPlan?.agentId ?? options.agentId ?? null,
    waypointId: target?.waypoint?.id ?? options.waypointId ?? null,
    waypointIndex: Number.isInteger(target?.index) ? target.index : null,
    segmentId: segment?.id ?? null,
    canonicalDigest: canonical?.digest ?? null,
    flightPlan: canonical ? clone(canonical) : null,
    patch: canonical ? flightPlanPatchFromPlan(canonical) : {},
    dirty: false,
    validation,
    warnings: validation.warnings ?? [],
    failures: validation.errors ?? []
  };
}

export function updateSegmentFlightPlanDraft(draft = {}, patch = {}, context = {}) {
  const normalizedPatch = normalizeSegmentFlightPlanPatch(patch);
  const nextPatch = { ...(draft.patch ?? flightPlanPatchFromPlan(draft.flightPlan ?? {})), ...normalizedPatch };
  const basePlan = draft.flightPlan ?? {};
  const flightPlan = normalizeSegmentFlightPlan({
    ...basePlan,
    ...nextPatch,
    profileId: nextPatch.diveProfileId ?? nextPatch.profileId ?? basePlan.profileId,
    targetDepthLayerId: nextPatch.targetDepthLayerId ?? basePlan.targetDepthLayerId,
    depthLayerId: nextPatch.depthLayerId ?? nextPatch.targetDepthLayerId ?? basePlan.targetDepthLayerId,
    maximumImmersionMeters: nextPatch.maximumImmersionMeters ?? nextPatch.maximumDiveDepthMeters ?? basePlan.maximumImmersionMeters,
    maximumDiveDepthMeters: nextPatch.maximumDiveDepthMeters ?? nextPatch.maximumImmersionMeters ?? basePlan.maximumImmersionMeters,
    segmentId: draft.segmentId ?? basePlan.segmentId,
    agentId: draft.agentId ?? basePlan.agentId
  }, context);
  const validation = validateSegmentFlightPlan(flightPlan, context);
  return {
    ...draft,
    flightPlan,
    patch: nextPatch,
    dirty: (flightPlan.digest ?? segmentFlightPlanDigest(flightPlan)) !== draft.canonicalDigest,
    validation,
    warnings: validation.warnings ?? [],
    failures: validation.errors ?? []
  };
}

export function updateSegmentFlightPlan(plan, options = {}) {
  const target = resolveTargetWaypoint(plan, options);
  if (!target) return commandResult(options.commandName ?? 'updateSegmentFlightPlan', 'error', { reason: 'No target waypoint found.' });
  const beforeSegment = findIncomingSegment(plan, { ...options, waypointId: target.waypoint.id, waypointIndex: target.index });
  const normalizedPatch = normalizeSegmentFlightPlanPatch(options.patch ?? options.flightPlan ?? {});
  const candidate = normalizeSegmentFlightPlan({
    ...(beforeSegment?.flightProfile ?? {}),
    ...normalizedPatch,
    profileId: normalizedPatch.diveProfileId ?? normalizedPatch.profileId ?? beforeSegment?.flightProfile?.profileId,
    targetDepthLayerId: normalizedPatch.targetDepthLayerId ?? beforeSegment?.flightProfile?.targetDepthLayerId,
    depthLayerId: normalizedPatch.depthLayerId ?? normalizedPatch.targetDepthLayerId ?? beforeSegment?.flightProfile?.targetDepthLayerId,
    maximumImmersionMeters: normalizedPatch.maximumImmersionMeters ?? normalizedPatch.maximumDiveDepthMeters ?? beforeSegment?.flightProfile?.maximumImmersionMeters,
    segmentId: beforeSegment?.id,
    agentId: target.agentPlan.agentId
  }, { ...options, segment: beforeSegment, targetWaypoint: target.waypoint, agentPlan: target.agentPlan });
  const validation = validateSegmentFlightPlan(candidate, { ...options, segment: beforeSegment, targetWaypoint: target.waypoint, agentPlan: target.agentPlan });
  if (!validation.valid) {
    return commandResult(options.commandName ?? 'updateSegmentFlightPlan', 'error', {
      reason: validation.errors[0] ?? 'Segment flight plan failed validation.',
      segmentId: beforeSegment?.id ?? null,
      waypointId: target.waypoint.id,
      waypointIndex: target.index,
      validation
    });
  }
  const beforeDigest = beforeSegment?.flightProfile?.digest ?? null;
  updateWaypoint(plan, target.agentPlan.agentId, target.index, canonicalWaypointPatch(normalizedPatch));
  const afterSegment = findIncomingSegment(plan, { ...options, waypointId: target.waypoint.id, waypointIndex: target.index });
  return commandResult(options.commandName ?? 'updateSegmentFlightPlan', 'applied', {
    changed: beforeDigest !== afterSegment?.flightProfile?.digest,
    segmentId: afterSegment?.id ?? beforeSegment?.id ?? null,
    waypointId: target.waypoint.id,
    waypointIndex: target.index,
    beforeDigest,
    afterDigest: afterSegment?.flightProfile?.digest ?? null,
    validation,
    warnings: validation.warnings ?? []
  });
}

export function resetSegmentFlightPlan(plan, options = {}) {
  const patch = Object.fromEntries(SEGMENT_FLIGHT_PLAN_PATCH_KEYS.map((key) => [key, undefined]));
  return updateSegmentFlightPlan(plan, { ...options, patch, commandName: 'resetSegmentFlightPlan' });
}

export function applySegmentFlightPlanToRemaining(plan, options = {}) {
  const target = resolveTargetWaypoint(plan, options);
  if (!target) return commandResult('applySegmentFlightPlanToRemaining', 'error', { reason: 'No selected waypoint found.' });
  const patch = canonicalWaypointPatch(normalizeSegmentFlightPlanPatch(options.patch ?? options.flightPlan ?? {}));
  const changedWaypointIds = [];
  for (let index = target.index + 1; index < target.agentPlan.waypoints.length; index += 1) {
    const waypoint = target.agentPlan.waypoints[index];
    const before = findIncomingSegment(plan, { ...options, waypointIndex: index, waypointId: waypoint?.id });
    updateWaypoint(plan, target.agentPlan.agentId, index, patch);
    const after = findIncomingSegment(plan, { ...options, waypointIndex: index, waypointId: waypoint?.id });
    if ((before?.flightProfile?.digest ?? null) !== (after?.flightProfile?.digest ?? null)) changedWaypointIds.push(waypoint?.id);
  }
  return commandResult('applySegmentFlightPlanToRemaining', 'applied', {
    changed: changedWaypointIds.length > 0,
    segmentId: null,
    waypointId: target.waypoint.id,
    waypointIndex: target.index,
    changedWaypointIds,
    warnings: []
  });
}

export function setGliderDefaultFlightPlan(plan, options = {}) {
  const agentPlan = getAgentPlan(plan, options.agentId);
  if (!agentPlan) return commandResult('setGliderDefaultFlightPlan', 'error', { reason: 'No selected glider plan found.' });
  const patch = canonicalWaypointPatch(normalizeSegmentFlightPlanPatch(options.patch ?? options.flightPlan ?? {}));
  const beforeDigest = segmentFlightPlanDigest(agentPlan);
  Object.assign(agentPlan, patch);
  const afterDigest = segmentFlightPlanDigest(agentPlan);
  return commandResult('setGliderDefaultFlightPlan', 'applied', {
    changed: beforeDigest !== afterDigest,
    segmentId: null,
    waypointId: null,
    waypointIndex: null,
    beforeDigest,
    afterDigest,
    warnings: []
  });
}

export function findIncomingSegment(plan, options = {}) {
  const segments = buildMissionRouteSegments(plan, options);
  const agentId = options.agentId;
  const waypointId = options.waypointId;
  const waypointIndex = Number(options.waypointIndex);
  return segments.find((segment) => segment.agentId === agentId && waypointId && segment.target?.id === waypointId)
    ?? segments.find((segment) => segment.agentId === agentId && Number(segment.sequenceIndex) === waypointIndex)
    ?? null;
}

export function normalizeSegmentFlightPlanPatch(patch = {}) {
  const normalized = {};
  for (const key of SEGMENT_FLIGHT_PLAN_PATCH_KEYS) {
    if (!(key in patch)) continue;
    const value = patch[key];
    if (value === undefined) {
      normalized[key] = undefined;
    } else if (['targetDepthMeters', 'minimumImmersionMeters', 'maximumImmersionMeters', 'maximumDiveDepthMeters', 'maximumDepthMeters', 'sampleIntervalSeconds', 'communicationWaitSeconds'].includes(key)) {
      const number = Number(value);
      if (Number.isFinite(number)) normalized[key] = number;
    } else if (key === 'cycleCount') {
      const number = Number(value);
      if (Number.isFinite(number)) normalized[key] = Math.max(0, Math.round(number));
    } else if (key === 'surfaceAtEnd') {
      normalized[key] = value === true || value === 'true';
    } else if (key === 'diveProfileId' && ['missionDefault', 'gliderDefault'].includes(String(value))) {
      normalized[key] = undefined;
    } else if (value !== null && String(value).trim()) {
      normalized[key] = String(value);
    }
  }
  if (normalized.targetDepthLayerId && normalized.depthLayerId === undefined) normalized.depthLayerId = normalized.targetDepthLayerId;
  if (normalized.maximumDiveDepthMeters !== undefined && normalized.maximumImmersionMeters === undefined) normalized.maximumImmersionMeters = normalized.maximumDiveDepthMeters;
  if (normalized.maximumImmersionMeters !== undefined && normalized.maximumDiveDepthMeters === undefined) normalized.maximumDiveDepthMeters = normalized.maximumImmersionMeters;
  if (normalized.maximumDiveDepthMeters !== undefined && normalized.maximumDepthMeters === undefined) normalized.maximumDepthMeters = normalized.maximumDiveDepthMeters;
  return normalized;
}

function resolveTargetWaypoint(plan, options = {}) {
  const agentPlan = getAgentPlan(plan, options.agentId);
  const waypoints = agentPlan?.waypoints ?? [];
  const waypointId = options.waypointId;
  let index = Number.isInteger(Number(options.waypointIndex)) ? Number(options.waypointIndex) : -1;
  if (waypointId) index = waypoints.findIndex((waypoint) => waypoint.id === waypointId);
  if (index < 0 || index >= waypoints.length) return null;
  return { agentPlan, waypoint: waypoints[index], index };
}

function flightPlanPatchFromPlan(plan = {}) {
  return canonicalWaypointPatch({
    diveProfileId: plan.profileId,
    targetDepthLayerId: plan.targetDepthLayerId,
    depthLayerId: plan.targetDepthLayerId,
    targetDepthMeters: plan.targetDepthMeters,
    minimumImmersionMeters: plan.minimumImmersionMeters,
    maximumImmersionMeters: plan.maximumImmersionMeters,
    maximumDiveDepthMeters: plan.maximumImmersionMeters,
    maximumDepthMeters: plan.maximumImmersionMeters,
    cycleCount: plan.cycleCount,
    sampleIntervalSeconds: plan.sampleIntervalSeconds,
    samplingPhase: plan.samplingPhase,
    arrivalBehavior: plan.arrivalBehavior,
    surfaceAtEnd: plan.surfaceAtEnd,
    communicationWaitSeconds: plan.communicationWaitSeconds
  });
}

function canonicalWaypointPatch(patch = {}) {
  const normalized = normalizeSegmentFlightPlanPatch(patch);
  const output = {};
  for (const key of SEGMENT_FLIGHT_PLAN_PATCH_KEYS) {
    if (key in normalized) output[key] = normalized[key];
  }
  return output;
}

function commandResult(command, status, fields = {}) {
  return {
    type: 'anchor.planning.segment-flight-plan-command-result',
    version: SEGMENT_FLIGHT_PLAN_COMMAND_VERSION,
    command,
    status,
    changed: fields.changed === true,
    segmentId: fields.segmentId ?? null,
    waypointId: fields.waypointId ?? null,
    waypointIndex: Number.isInteger(fields.waypointIndex) ? fields.waypointIndex : null,
    validation: fields.validation ?? null,
    warnings: fields.warnings ?? fields.validation?.warnings ?? [],
    reason: fields.reason ?? null,
    ...fields
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
