import { depthLayerForDiveProfile, normalizeDiveProfile } from '../science/DiveProfileModel.js';
import { waterColumnLayerMetadata } from '../science/WaterColumnSchema.js';
import {
  createGliderControlCommand,
  createGliderMotionConfig
} from './GliderMotionSchema.js';
import { computeDesiredHeadingToWaypoint } from './GliderDynamicsModel.js';

export const PLAN_CONTROL_ADAPTER_VERSION = 'plan-control-adapter-motion-r1';

export function buildControlScheduleFromWaypoints({
  waypoints,
  glider,
  motionConfig,
  diveProfile,
  options = {}
} = {}) {
  const sourceWaypoints = (Array.isArray(waypoints) ? waypoints : []).map((waypoint, index) => ({
    waypointId: waypoint.waypointId ?? waypoint.id ?? `wp-${index + 1}`,
    ...cloneJson(waypoint)
  }));
  const config = motionConfig?.type === 'anchor.motion.config' ? motionConfig : createGliderMotionConfig(motionConfig);
  const profile = normalizeDiveProfile(diveProfile ?? glider?.diveProfile ?? glider?.diveProfileId ?? sourceWaypoints[0]?.diveProfileId ?? 'sawtoothProfile', options.waterColumnConfig ?? {});
  const controls = [];
  let elapsed = 0;
  let currentState = {
    gliderId: glider?.id ?? glider?.gliderId ?? sourceWaypoints[0]?.gliderId ?? 'glider-1',
    x: finiteNumber(glider?.start?.x ?? sourceWaypoints[0]?.x, 0),
    y: finiteNumber(glider?.start?.y ?? sourceWaypoints[0]?.y, 0),
    headingRadians: finiteNumber(glider?.headingRadians, 0)
  };
  for (let index = 1; index < sourceWaypoints.length; index += 1) {
    const previous = sourceWaypoints[index - 1];
    const target = sourceWaypoints[index];
    const segmentDistance = Math.hypot(finiteNumber(target.x, 0) - finiteNumber(previous.x, 0), finiteNumber(target.y, 0) - finiteNumber(previous.y, 0));
    const duration = Math.max(config.controlStepSeconds, segmentDistance / Math.max(0.01, config.gliderSpeed) * 60);
    const progress = sourceWaypoints.length <= 2 ? 1 : index / (sourceWaypoints.length - 1);
    controls.push(controlCommandForWaypointSegment({
      state: currentState,
      segment: {
        index: index - 1,
        start: previous,
        end: target,
        durationSeconds: duration,
        sourcePlanId: options.planId ?? null
      },
      progress,
      motionConfig: config,
      diveProfile: profile,
      options: {
        ...options,
        timeSeconds: elapsed,
        commandId: `${options.planId ?? 'plan'}-segment-${index}`,
        gliderId: currentState.gliderId
      }
    }));
    elapsed += duration;
    currentState = { ...currentState, x: target.x, y: target.y, headingRadians: computeDesiredHeadingToWaypoint(currentState, target) };
  }
  if (sourceWaypoints.length === 1) {
    controls.push(controlCommandForWaypointSegment({
      state: currentState,
      segment: { index: 0, start: sourceWaypoints[0], end: sourceWaypoints[0], durationSeconds: config.controlStepSeconds },
      progress: 0,
      motionConfig: config,
      diveProfile: profile,
      options: { ...options, timeSeconds: 0, commandId: `${options.planId ?? 'plan'}-station-1`, gliderId: currentState.gliderId }
    }));
  }
  return {
    type: 'anchor.motion.control-schedule',
    version: PLAN_CONTROL_ADAPTER_VERSION,
    planId: options.planId ?? null,
    gliderId: currentState.gliderId,
    routeSource: options.routeSource ?? options.routeAuthority ?? 'providedWaypointsOnly',
    generatedRoute: false,
    controls,
    plannedWaypoints: sourceWaypoints,
    diveProfileId: profile.id,
    summary: motionPlanIntentSummary({
      planId: options.planId,
      routeSource: options.routeSource,
      waypoints: sourceWaypoints,
      controls,
      diveProfileId: profile.id
    }),
    notA: ['not a route planner', 'not optimization', 'not MPC/RRT/A*/Dijkstra']
  };
}

export function controlCommandForWaypointSegment({
  state,
  segment,
  progress,
  motionConfig,
  diveProfile,
  options = {}
} = {}) {
  const config = motionConfig?.type === 'anchor.motion.config' ? motionConfig : createGliderMotionConfig(motionConfig);
  const target = segment?.end ?? segment?.targetWaypoint ?? {};
  const depthLayerId = target.depthLayerId
    ?? target.depthLayer
    ?? depthLayerForDiveProfile(diveProfile ?? target.diveProfileId ?? 'sawtoothProfile', progress);
  const depthMeters = finiteNumber(target.depthMeters, waterColumnLayerMetadata(depthLayerId).nominalDepthMeters ?? 0);
  return createGliderControlCommand({
    commandId: options.commandId ?? `segment-${segment?.index ?? 0}`,
    gliderId: options.gliderId ?? state?.gliderId ?? 'glider-1',
    timeSeconds: finiteNumber(options.timeSeconds, 0),
    controlMode: options.controlMode ?? config.controlMode ?? 'waypointTracking',
    targetWaypoint: cloneJson(target),
    desiredHeadingRadians: computeDesiredHeadingToWaypoint(state, target),
    desiredSpeedThroughWater: finiteNumber(options.desiredSpeedThroughWater ?? target.desiredSpeedThroughWater ?? config.gliderSpeed, config.gliderSpeed),
    desiredDepthLayerId: depthLayerId,
    desiredDepthMeters: depthMeters,
    desiredPitchRadians: finiteNumber(options.desiredPitchRadians, 0),
    sampleEnabled: target.sampleEnabled ?? options.sampleEnabled ?? true,
    surfaceRequested: Boolean(target.surfaceRequested ?? (options.surfaceAtEnd && segment?.isFinal)),
    notes: [
      `Segment ${Number(segment?.index ?? 0) + 1} control from provided waypoint intent.`,
      'This adapter converts waypoints to controls; it does not optimize the route.'
    ]
  });
}

export function normalizeMotionPlanInput(plan, options = {}) {
  const agentPlans = Array.isArray(plan?.agentPlans) ? plan.agentPlans : [];
  const selected = options.agentId
    ? agentPlans.find((agentPlan) => String(agentPlan.agentId) === String(options.agentId))
    : agentPlans.find((agentPlan) => Array.isArray(agentPlan.waypoints) && agentPlan.waypoints.length) ?? agentPlans[0];
  const waypoints = selected?.waypoints ?? plan?.waypoints ?? [];
  return {
    type: plan?.type ?? null,
    planId: plan?.planId ?? plan?.id ?? plan?.meta?.planId ?? options.planId ?? 'motion-plan',
    sourcePlanType: plan?.type ?? null,
    gliderId: selected?.agentId ?? plan?.gliderId ?? options.gliderId ?? 'glider-1',
    routeAuthority: selected?.routeAuthority ?? plan?.routeAuthority ?? 'providedWaypointsOnly',
    generatedRoute: Boolean(plan?.generatesRoute ?? false),
    diveProfileId: selected?.diveProfileId ?? plan?.diveProfileId ?? options.diveProfileId ?? null,
    desiredSpeedThroughWater: selected?.desiredSpeedThroughWater ?? plan?.desiredSpeedThroughWater ?? options.desiredSpeedThroughWater ?? null,
    sampleIntervalSeconds: selected?.sampleIntervalSeconds ?? plan?.sampleIntervalSeconds ?? options.sampleIntervalSeconds ?? null,
    surfaceAtEnd: Boolean(selected?.surfaceAtEnd ?? plan?.surfaceAtEnd ?? options.surfaceAtEnd ?? false),
    waypoints: waypoints.map((waypoint, index) => ({
      waypointId: waypoint.waypointId ?? waypoint.id ?? `wp-${index + 1}`,
      ...cloneJson(waypoint)
    }))
  };
}

export function motionPlanIntentSummary(plan = {}) {
  const waypoints = plan.waypoints ?? plan.plannedWaypoints ?? [];
  const controls = plan.controls ?? [];
  return {
    type: 'anchor.motion.plan-intent-summary',
    version: PLAN_CONTROL_ADAPTER_VERSION,
    planId: plan.planId ?? null,
    gliderId: plan.gliderId ?? null,
    waypointCount: waypoints.length,
    controlCount: controls.length,
    plannedDistance: plannedPathSummary(waypoints).plannedDistance,
    diveProfileId: plan.diveProfileId ?? null,
    routeSource: plan.routeSource ?? plan.routeAuthority ?? null,
    generatedRoute: false,
    noOptimizationPerformed: true
  };
}

export function plannedPathSummary(waypoints = []) {
  const list = Array.isArray(waypoints) ? waypoints : [];
  return {
    type: 'anchor.motion.planned-path-summary',
    version: PLAN_CONTROL_ADAPTER_VERSION,
    waypointCount: list.length,
    plannedDistance: round(pathDistance(list)),
    firstWaypoint: list[0] ? pointSummary(list[0]) : null,
    lastWaypoint: list.at(-1) ? pointSummary(list.at(-1)) : null,
    generatedRoute: false
  };
}

function pathDistance(points) {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += Math.hypot(Number(points[index].x ?? 0) - Number(points[index - 1].x ?? 0), Number(points[index].y ?? 0) - Number(points[index - 1].y ?? 0));
  }
  return total;
}

function pointSummary(point) {
  return { x: round(point.x), y: round(point.y), zIndex: point.zIndex ?? point.z ?? null, depthLayerId: point.depthLayerId ?? point.depthLayer ?? null };
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  return JSON.parse(JSON.stringify(value));
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function round(value) {
  return Number(Number(value ?? 0).toFixed(6));
}
