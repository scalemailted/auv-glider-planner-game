import { resolveEffectiveDiveProfile, effectiveDiveProfileSummary } from '../motion/EffectiveDiveProfileResolver.js';
import { assessDiveProfileFeasibility, diveProfileFeasibilitySummary } from '../science/DiveProfileFeasibility.js';
import { normalizeDiveProfile, diveProfileSummary } from '../science/DiveProfileModel.js';
import {
  normalizeWaterColumnConfig,
  normalizeWaterColumnLayerId,
  normalizeWaterColumnProfileId,
  waterColumnLayerMetadata
} from '../science/WaterColumnSchema.js';

export const SEGMENT_FLIGHT_PLAN_VERSION = 'segment-flight-plan-dive-r1-1';
export const SEGMENT_SAMPLING_PHASES = Object.freeze(['descent', 'ascent', 'both', 'profileDefault', 'disabled']);
export const SEGMENT_ARRIVAL_BEHAVIORS = Object.freeze(['continueUnderwater', 'surfaceAndCommunicate', 'missionTerminal', 'inheritMissionRule']);
export const SEGMENT_FLIGHT_PROFILE_CHOICES = Object.freeze([
  { id: 'missionDefault', label: 'Mission Default', profileId: null, source: 'missionWaterColumnDefault' },
  { id: 'gliderDefault', label: 'Glider Default', profileId: null, source: 'agentDefault' },
  { id: 'sawtoothProfile', label: 'Standard Sawtooth', profileId: 'sawtoothProfile' },
  { id: 'shallowDive', label: 'Shallow Survey', profileId: 'shallowDive' },
  { id: 'thermoclineDive', label: 'Thermocline Survey', profileId: 'thermoclineDive' },
  { id: 'deepDive', label: 'Deep Survey', profileId: 'deepDive' },
  { id: 'fullProfile', label: 'Multi-Yo Survey', profileId: 'fullProfile' },
  { id: 'surfaceOnly', label: 'Surface Transit', profileId: 'surfaceOnly' }
]);

export function createSegmentFlightPlan(options = {}) {
  return normalizeSegmentFlightPlan({
    ...(options.value ?? {}),
    segment: options.segment,
    targetWaypoint: options.targetWaypoint ?? options.waypoint ?? options.segment?.targetWaypoint,
    agentPlan: options.agentPlan,
    agent: options.agent,
    mission: options.mission,
    level: options.level,
    waterColumnConfig: options.waterColumnConfig,
    routeWaypointCount: options.routeWaypointCount,
    executableSegmentCount: options.executableSegmentCount
  }, options);
}

export function normalizeSegmentFlightPlan(value = {}, context = {}) {
  const segment = value.segment ?? context.segment ?? {};
  const targetWaypoint = value.targetWaypoint ?? context.targetWaypoint ?? context.waypoint ?? segment.targetWaypoint ?? segment.target?.raw ?? segment.target ?? {};
  const agentPlan = value.agentPlan ?? context.agentPlan ?? null;
  const agent = value.agent ?? context.agent ?? null;
  const mission = value.mission ?? context.mission ?? null;
  const level = value.level ?? context.level ?? null;
  const waterColumnConfig = normalizeWaterColumnConfig(value.waterColumnConfig
    ?? context.waterColumnConfig
    ?? mission?.waterColumnConfig
    ?? mission?.world?.waterColumnConfig
    ?? level?.world?.waterColumnConfig
    ?? { depthLayerIds: ['surface'], diveProfileId: 'surfaceOnly' });
  const segmentOverride = segment.flightProfile ?? targetWaypoint.segmentFlightPlan ?? targetWaypoint.flightProfile ?? null;
  const overrideProfileId = value.profileId
    ?? value.diveProfileId
    ?? segmentOverride?.profileId
    ?? segmentOverride?.diveProfileId
    ?? targetWaypoint.diveProfileId
    ?? targetWaypoint.profileId
    ?? null;
  const effective = resolveEffectiveDiveProfile({
    targetWaypoint: overrideProfileId ? { ...targetWaypoint, diveProfileId: overrideProfileId } : targetWaypoint,
    segment: { ...segment, flightProfile: segmentOverride, diveProfileId: overrideProfileId },
    agentPlan,
    agent,
    mission,
    level,
    waterColumnConfig,
    routeWaypointCount: value.routeWaypointCount ?? context.routeWaypointCount,
    executableSegmentCount: value.executableSegmentCount ?? context.executableSegmentCount
  });
  const profileId = normalizeWaterColumnProfileId(value.profileId ?? value.diveProfileId ?? segmentOverride?.profileId ?? segmentOverride?.diveProfileId ?? targetWaypoint.diveProfileId ?? targetWaypoint.profileId ?? effective.profileId ?? waterColumnConfig.diveProfileId);
  const profile = normalizeDiveProfile(profileId, waterColumnConfig);
  const targetDepthLayerId = normalizeWaterColumnLayerId(
    value.targetDepthLayerId
      ?? value.depthLayerId
      ?? segmentOverride?.targetDepthLayerId
      ?? segmentOverride?.depthLayerId
      ?? targetWaypoint.targetDepthLayerId
      ?? targetWaypoint.depthLayerId
      ?? targetWaypoint.depthLayer
      ?? effective.targetDepthLayerId
      ?? waterColumnConfig.defaultTargetDepthLayerId
      ?? waterColumnConfig.defaultLayerIds?.[0]
      ?? 'surface',
    waterColumnConfig.depthLayerIds[0] ?? 'surface'
  );
  const targetDepthMeters = finiteNumber(value.targetDepthMeters ?? segmentOverride?.targetDepthMeters ?? targetWaypoint.depthMeters ?? waterColumnLayerMetadata(targetDepthLayerId).nominalDepthMeters, 0);
  const maximumImmersionMeters = finiteNumber(
    value.maximumImmersionMeters
      ?? value.maximumDiveDepthMeters
      ?? segmentOverride?.maximumImmersionMeters
      ?? segmentOverride?.maximumDiveDepthMeters
      ?? targetWaypoint.maximumDiveDepthMeters
      ?? targetWaypoint.maximumDepthMeters
      ?? effective.requestedMaximumDepthMeters
      ?? targetDepthMeters,
    targetDepthMeters
  );
  const minimumImmersionMeters = finiteNumber(value.minimumImmersionMeters ?? segmentOverride?.minimumImmersionMeters, profileId === 'surfaceOnly' ? 0 : 0);
  const cycleCount = Math.max(0, Math.round(finiteNumber(value.cycleCount ?? segmentOverride?.cycleCount ?? targetWaypoint.cycleCount ?? agentPlan?.cycleCount, profileId === 'surfaceOnly' ? 0 : 1)));
  const sampleIntervalSeconds = finiteOrNull(value.sampleIntervalSeconds ?? segmentOverride?.sampleIntervalSeconds ?? targetWaypoint.sampleIntervalSeconds ?? agentPlan?.sampleIntervalSeconds);
  const arrival = normalizeArrivalBehavior(value.arrivalBehavior ?? segment.arrivalBehavior ?? segmentOverride?.arrivalBehavior ?? targetWaypoint.arrivalBehavior, targetWaypoint);
  const samplingPhase = normalizeSamplingPhase(value.samplingPhase ?? segmentOverride?.samplingPhase ?? targetWaypoint.samplingPhase ?? targetWaypoint.samplingMode ?? 'profileDefault');
  const surfaceAtEnd = Boolean(value.surfaceAtEnd ?? segmentOverride?.surfaceAtEnd ?? targetWaypoint.surfaceAtEnd ?? arrival.surfaceAtEnd);
  const communicationWaitSeconds = finiteNumber(value.communicationWaitSeconds ?? segmentOverride?.communicationWaitSeconds ?? targetWaypoint.communicationWaitSeconds ?? arrival.communicationWaitSeconds, surfaceAtEnd ? 300 : 0);
  const feasibility = assessDiveProfileFeasibility({
    waterColumnConfig,
    level,
    mission,
    start: segment.source?.point,
    end: segment.target?.point ?? targetWaypoint,
    requestedProfileId: profileId,
    requestedTargetLayerId: targetDepthLayerId,
    requestedMaximumDepthMeters: maximumImmersionMeters,
    segmentHorizontalDistance: segment.horizontalGeometry?.distanceCells ?? null,
    segmentHorizontalDistanceMeters: segment.horizontalGeometry?.distanceMeters ?? null,
    segmentDurationAvailableSeconds: value.segmentDurationAvailableSeconds ?? targetWaypoint.segmentTravelTime,
    missionTimeRemainingSeconds: value.missionTimeRemainingSeconds,
    vehicleDepthRatingMeters: agent?.maxDepthMeters ?? mission?.physics?.vehicleDepthRatingMeters ?? mission?.physics?.maxVehicleDepthMeters,
    bottomDepthMeters: value.bottomDepthMeters,
    requiredBottomClearanceMeters: mission?.physics?.minimumBottomClearanceMeters ?? mission?.physics?.bottomClearanceMeters ?? 5
  });
  const feasibilityStatus = feasibilityStatusFor(feasibility, maximumImmersionMeters, cycleCount);
  const warnings = [...new Set([
    ...(effective.warnings ?? []),
    ...(feasibility.warnings ?? []),
    ...(feasibility.hardErrors ?? [])
  ].filter(Boolean).map(String))];
  const plan = {
    type: 'anchor.planning.segment-flight-plan',
    version: value.version ?? SEGMENT_FLIGHT_PLAN_VERSION,
    segmentId: value.segmentId ?? segment.id ?? null,
    agentId: value.agentId ?? segment.agentId ?? agentPlan?.agentId ?? agent?.id ?? null,
    profileId,
    profileSource: value.profileSource ?? segmentOverride?.profileSource ?? effective.source ?? 'modernGeneratedDefault',
    effectiveProfile: effectiveDiveProfileSummary(effective),
    targetDepthLayerId,
    targetDepthMeters: round(targetDepthMeters),
    minimumImmersionMeters: round(Math.max(0, minimumImmersionMeters)),
    maximumImmersionMeters: round(Math.max(0, maximumImmersionMeters)),
    cycleCount,
    sampleIntervalSeconds,
    samplingPhase,
    surfaceAtEnd,
    arrivalBehavior: arrival.mode,
    communicationWaitSeconds: round(Math.max(0, communicationWaitSeconds)),
    payloadActivation: normalizePayloadActivation(value.payloadActivation ?? segmentOverride?.payloadActivation),
    feasibilityStatus,
    feasibility,
    warnings,
    boundaryFlags: {
      ownsRouteGeometry: false,
      ownsSimulation: false,
      ownsScoring: false,
      usesNewPlanner: false,
      representsLowLevelControl: false,
      waypointIsHorizontalTarget: true,
      flightProfileBelongsToSegment: true,
      descendAscendAreExecutionPhases: true,
      displayLayerChangesPlan: false,
      ...(value.boundaryFlags ?? {})
    }
  };
  plan.digest = segmentFlightPlanDigest(plan);
  return plan;
}

export function validateSegmentFlightPlan(value = {}, context = {}) {
  const plan = normalizeSegmentFlightPlan(value, context);
  const errors = [];
  const warnings = [...(plan.warnings ?? [])];
  if (plan.type !== 'anchor.planning.segment-flight-plan') errors.push('Segment flight plan type must be anchor.planning.segment-flight-plan.');
  if (!plan.segmentId) errors.push('Segment flight plan requires a segmentId.');
  if (!plan.agentId) errors.push('Segment flight plan requires an agentId.');
  if (!plan.profileId) errors.push('Segment flight plan requires a profileId.');
  if (!SEGMENT_SAMPLING_PHASES.includes(plan.samplingPhase)) errors.push(`Unsupported sampling phase: ${plan.samplingPhase}.`);
  if (plan.boundaryFlags?.ownsRouteGeometry !== false) errors.push('Segment flight plan must not own route geometry.');
  if (plan.boundaryFlags?.ownsSimulation !== false) errors.push('Segment flight plan must not own simulation.');
  if (plan.boundaryFlags?.ownsScoring !== false) errors.push('Segment flight plan must not own scoring.');
  if (plan.boundaryFlags?.usesNewPlanner !== false) errors.push('Segment flight plan must not create/use a new planner.');
  if (plan.boundaryFlags?.representsLowLevelControl !== false) errors.push('Segment flight plan must not represent low-level actuator commands.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings, summary: segmentFlightPlanSummary(plan) };
}

export function segmentFlightPlanDigest(value = {}) {
  const compact = {
    segmentId: value.segmentId ?? null,
    agentId: value.agentId ?? null,
    profileId: value.profileId ?? null,
    profileSource: value.profileSource ?? null,
    targetDepthLayerId: value.targetDepthLayerId ?? null,
    targetDepthMeters: round(value.targetDepthMeters ?? 0),
    minimumImmersionMeters: round(value.minimumImmersionMeters ?? 0),
    maximumImmersionMeters: round(value.maximumImmersionMeters ?? 0),
    cycleCount: Number(value.cycleCount ?? 0),
    sampleIntervalSeconds: value.sampleIntervalSeconds ?? null,
    samplingPhase: value.samplingPhase ?? null,
    surfaceAtEnd: value.surfaceAtEnd === true,
    arrivalBehavior: value.arrivalBehavior ?? null,
    communicationWaitSeconds: round(value.communicationWaitSeconds ?? 0)
  };
  return `flight-${hashStable(compact)}`;
}

export function segmentFlightPlanSummary(value = {}) {
  const plan = value?.type === 'anchor.planning.segment-flight-plan' ? value : normalizeSegmentFlightPlan(value);
  return {
    type: 'anchor.planning.segment-flight-plan-summary',
    version: plan.version ?? SEGMENT_FLIGHT_PLAN_VERSION,
    segmentId: plan.segmentId ?? null,
    agentId: plan.agentId ?? null,
    profileId: plan.profileId ?? null,
    profileSource: plan.profileSource ?? null,
    profile: diveProfileSummary(plan.profileId ?? 'surfaceOnly', plan.waterColumnConfig ?? {}),
    targetDepthLayerId: plan.targetDepthLayerId ?? null,
    targetDepthMeters: plan.targetDepthMeters ?? null,
    minimumImmersionMeters: plan.minimumImmersionMeters ?? null,
    maximumImmersionMeters: plan.maximumImmersionMeters ?? null,
    cycleCount: plan.cycleCount ?? 0,
    sampleIntervalSeconds: plan.sampleIntervalSeconds ?? null,
    samplingPhase: plan.samplingPhase ?? 'profileDefault',
    surfaceAtEnd: plan.surfaceAtEnd === true,
    arrivalBehavior: plan.arrivalBehavior ?? null,
    communicationWaitSeconds: plan.communicationWaitSeconds ?? 0,
    feasibilityStatus: plan.feasibilityStatus ?? null,
    feasibility: diveProfileFeasibilitySummary(plan.feasibility ?? {}),
    digest: plan.digest ?? segmentFlightPlanDigest(plan),
    ownsRouteGeometry: plan.boundaryFlags?.ownsRouteGeometry === true,
    ownsSimulation: plan.boundaryFlags?.ownsSimulation === true,
    ownsScoring: plan.boundaryFlags?.ownsScoring === true,
    usesNewPlanner: plan.boundaryFlags?.usesNewPlanner === true,
    representsLowLevelControl: plan.boundaryFlags?.representsLowLevelControl === true,
    warnings: [...(plan.warnings ?? [])]
  };
}

export function normalizeSamplingPhase(value = 'profileDefault') {
  const text = String(value ?? 'profileDefault').trim();
  if (text === 'down' || text === 'descending') return 'descent';
  if (text === 'up' || text === 'ascending') return 'ascent';
  if (text === 'middle' || text === 'cruise') return 'both';
  if (text === 'both' || text === 'all') return 'both';
  if (text === 'none' || text === 'off' || text === 'disabled') return 'disabled';
  return SEGMENT_SAMPLING_PHASES.includes(text) ? text : 'profileDefault';
}

export function normalizeArrivalBehavior(value = 'inheritMissionRule', targetWaypoint = {}) {
  const text = String(typeof value === 'object' ? value.mode ?? value.id : value ?? 'inheritMissionRule').trim();
  const mode = text === 'surface' || text === 'surfaceAndCommunicate' || targetWaypoint.kind === 'surface'
    ? 'surfaceAndCommunicate'
    : text === 'missionTerminal' || text === 'terminal' || targetWaypoint.action === 'return'
      ? 'missionTerminal'
      : text === 'continueUnderwater'
        ? 'continueUnderwater'
        : 'inheritMissionRule';
  return {
    mode,
    surfaceAtEnd: mode === 'surfaceAndCommunicate',
    communicationWaitSeconds: mode === 'surfaceAndCommunicate' ? finiteNumber(targetWaypoint.communicationWaitSeconds, 300) : 0
  };
}

function feasibilityStatusFor(feasibility = {}, requestedMaximumDepthMeters = 0, cycleCount = 0) {
  if ((feasibility.hardErrors ?? []).length || feasibility.status === 'infeasible') return 'INFEASIBLE';
  const achievable = Number(feasibility.achievableMaximumDepthMeters ?? requestedMaximumDepthMeters);
  if (achievable + 1e-6 < Number(requestedMaximumDepthMeters ?? 0)) return 'FEASIBLE_WITH_LIMITS';
  if ((feasibility.warnings ?? []).length) return 'FEASIBLE_WITH_LIMITS';
  if (cycleCount > 1 && feasibility.limitingFactor === 'segmentLength') return 'FEASIBLE_WITH_LIMITS';
  return 'FEASIBLE';
}

function normalizePayloadActivation(value = null) {
  if (!value || typeof value !== 'object') return { scienceSensor: 'profileDefault', currentMeter: 'profileDefault', communication: 'arrivalBehavior' };
  return { ...value };
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function hashStable(value) {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function round(value, digits = 6) {
  return Number(Number(value ?? 0).toFixed(digits));
}
