import { getPlanningFrame } from '../sim/ChallengeMode.js';
import { getDriftRules } from '../sim/StochasticDrift.js';
import { normalizeROIValue } from '../sim/ROIValue.js';
import { getSurfacingTimes } from '../sim/GliderComms.js';
import { formatMissionTime, getTimeConfig, getWindowForTime, getWindowStartTime } from '../time/MissionTime.js';
import { clipLineToTerrain, estimateRouteEnergy } from './RoutePreview.js';
import { getSelectedStart, requiresDeploymentSelection } from '../deployment/DeploymentZones.js';
import { buildRouteSegmentsForAgent } from './RouteSegmentBuilder.js';

export function estimateSelectedGliderPlan(state, options = {}) {
  const level = state?.level;
  const mission = state?.mission;
  const agentId = options.agentId ?? state?.selectedAgentId ?? mission?.agents?.[0]?.id ?? null;
  const agent = (mission?.agents ?? []).find((candidate) => candidate.id === agentId);
  if (!level || !mission || !agent) return null;

  const agentPlan = (state?.plan?.agentPlans ?? []).find((plan) => plan.agentId === agentId) ?? { agentId, waypoints: [] };
  const hoverTarget = options.includeHover !== false ? state?.ui?.hoverCell : null;
  const waypoints = [...(agentPlan.waypoints ?? [])];
  const selectedWindow = Number(state?.selectedWindow ?? getWindowForTime(level, state?.planningTime ?? 0));
  const selectedTime = Number(state?.planningTime ?? getWindowStartTime(level, selectedWindow));
  const frameOptions = {
    challengeMode: state?.challengeMode,
    revealTruth: state?.ui?.revealTruth,
    forecastMemberId: state?.ui?.forecastMemberId
  };
  const startingFuel = Number(agent.battery ?? agent.maxBattery ?? 100);
  const energyPerCell = Number(mission.physics?.energyPerCell ?? 1);
  const driftGain = Number(getDriftRules(mission).driftGain);
  const planningAnchor = state?.ui?.planningAnchor?.agentId === agentId ? state.ui.planningAnchor : null;
  const warnings = [];
  let previous = getCurrentAgentStart(state, agent);
  const route = buildRouteSegmentsForAgent({
    level,
    mission,
    agent,
    agentPlan,
    surfacedAgents: state?.surfacedAgents,
    planningAnchor: state?.ui?.planningAnchor
  });
  const missingAnchor = route.missingAnchor || !isFinitePoint(previous);
  if (missingAnchor) {
    warnings.push(route.message ?? 'Choose deployment cell first.');
    previous = null;
  }
  let remainingFuel = startingFuel;
  let totalEstimatedEnergy = 0;
  let expectedValue = 0;
  let realizedValue = 0;
  let oppositionCount = 0;
  let assistCount = 0;
  let hazardRisk = 0;
  const windowMap = new Map();
  let routeValid = true;
  let blockedSegment = null;

  for (const [index, waypoint] of waypoints.entries()) {
    if (!previous) break;
    const t = Number(waypoint.t ?? getWindowStartTime(level, waypoint.window ?? selectedWindow));
    const frame = getPlanningFrame(level, t, frameOptions);
    const routeSegment = route.segments[index];
    const segmentFrom = routeSegment?.from ?? previous;
    const segment = estimateSegmentEnergy(segmentFrom, waypoint, level, agent, frame, { energyPerCell, driftGain });
    const windowIndex = Number(waypoint.window ?? getWindowForTime(level, t));
    const cellValue = sampleRoi(frame, waypoint.x, waypoint.y);
    expectedValue += cellValue.expectedValue;
    realizedValue += cellValue.realizedValue;
    hazardRisk += isHazardCell(level, waypoint.x, waypoint.y) ? 1 : 0;
    if (segment.currentAssist > 0.08) assistCount += 1;
    if (segment.currentAssist < -0.08) oppositionCount += 1;
    if (!segment.valid && routeValid) {
      routeValid = false;
      blockedSegment = index + 1;
      warnings.push(`Segment ${index + 1} blocked by land`);
    }
    if (isHazardCell(level, waypoint.x, waypoint.y)) warnings.push(`Waypoint ${index + 1} enters hazard risk`);
    if (segment.currentAssist < -0.18) warnings.push(`Segment ${index + 1} fights strong current`);
    totalEstimatedEnergy += segment.energy;
    remainingFuel -= segment.energy;
    const row = windowMap.get(windowIndex) ?? { window: windowIndex, energy: 0, expectedValue: 0, remainingFuel };
    row.energy += segment.energy;
    row.expectedValue += cellValue.expectedValue;
    row.remainingFuel = remainingFuel;
    windowMap.set(windowIndex, row);
    previous = segment.valid ? waypoint : segment.lastValid;
    if (!segment.valid) break;
  }

  const activeAnchor = planningAnchor ?? previous;
  const hoverEstimate = hoverTarget && activeAnchor ? estimateHoverTarget({
    previous: activeAnchor,
    hoverTarget,
    level,
    agent,
    frame: getPlanningFrame(level, selectedTime, frameOptions),
    energyPerCell,
    driftGain
  }) : null;

  if (remainingFuel < 0) {
    routeValid = false;
    warnings.push(`Estimated fuel exceeded after Window ${findFuelExceededWindow(windowMap, startingFuel)}`);
  }
  const nextSurfaceTime = getNextSurfaceTime(level, mission, selectedTime);
  const reachableBeforeNextSurface = activeAnchor ? estimateReachableBeforeSurface({
    waypoints,
    selectedTime,
    nextSurfaceTime,
    planningAnchor: activeAnchor,
    agent,
    level,
    mission
  }) : null;
  if (reachableBeforeNextSurface === false) warnings.push('Waypoint outside likely surfacing reach');

  return {
    agentId,
    label: agent.label ?? agent.name ?? agent.id,
    planningAnchor: activeAnchor,
    waypointCount: waypoints.length,
    selectedWindow,
    selectedTime,
    selectedTimeLabel: formatMissionTime(level, selectedTime),
    totalEstimatedEnergy,
    startingFuel,
    remainingFuel,
    expectedValue,
    realizedValue,
    nextSurfaceTime,
    nextSurfaceLabel: nextSurfaceTime === null ? 'N/A' : formatMissionTime(level, nextSurfaceTime),
    reachableBeforeNextSurface,
    currentAssist: describeAssist(assistCount, oppositionCount),
    routeValid: missingAnchor ? false : routeValid,
    status: missingAnchor ? 'choose deployment' : routeStatus({ routeValid, remainingFuel, hazardRisk, oppositionCount }),
    warnings: [...new Set(warnings)].slice(0, 4),
    windowBreakdown: [...windowMap.values()].sort((a, b) => a.window - b.window),
    hoverEstimate,
    blockedSegment
  };
}

export function estimateSegmentEnergy(start, target, level, agent, frame, options = {}) {
  return estimateRouteEnergy(start, target, level, agent, options.frame ?? frame, options);
}

export function computeWindowEnergyBreakdown(state, agentId) {
  return estimateSelectedGliderPlan(state, { agentId })?.windowBreakdown ?? [];
}

export function computeRemainingFuelForecast(state, agentId) {
  const forecast = estimateSelectedGliderPlan(state, { agentId });
  return forecast ? {
    startingFuel: forecast.startingFuel,
    remainingFuel: forecast.remainingFuel,
    windowBreakdown: forecast.windowBreakdown
  } : null;
}

export function computeSelectedGliderExpectedValue(state, agentId) {
  return estimateSelectedGliderPlan(state, { agentId })?.expectedValue ?? 0;
}

export function getSelectedGliderPlanningWarnings(forecast) {
  return forecast?.warnings ?? [];
}

function getCurrentAgentStart(state, agent) {
  const surfaced = (state?.surfacedAgents ?? []).find((candidate) => candidate.id === agent.id);
  const selectedStart = getSelectedStart(agent);
  if (!surfaced && requiresDeploymentSelection(state?.mission, agent.id)) return { x: NaN, y: NaN };
  return {
    x: Number(surfaced?.x ?? selectedStart?.x ?? agent.start?.x),
    y: Number(surfaced?.y ?? selectedStart?.y ?? agent.start?.y)
  };
}

function estimateHoverTarget({ previous, hoverTarget, level, agent, frame, energyPerCell, driftGain }) {
  const clipped = clipLineToTerrain(previous, hoverTarget, level);
  const estimate = estimateRouteEnergy(previous, hoverTarget, level, agent, frame, { energyPerCell, driftGain });
  return {
    x: hoverTarget.x,
    y: hoverTarget.y,
    valid: clipped.valid,
    energy: estimate.energy,
    currentAssist: estimate.currentAssist,
    assistLabel: describeAssist(estimate.currentAssist > 0.08 ? 1 : 0, estimate.currentAssist < -0.08 ? 1 : 0),
    warning: clipped.valid ? null : 'Hover target route blocked by land'
  };
}

function sampleRoi(frame, x, y) {
  const value = normalizeROIValue(frame?.roi?.[clampIndex(y, frame?.roi?.length ?? 1)]?.[clampIndex(x, frame?.roi?.[0]?.length ?? 1)] ?? 0);
  return {
    expectedValue: Number(value.expectedValue ?? 0),
    realizedValue: Number(value.value ?? value.expectedValue ?? 0) * Number(value.probability ?? 1)
  };
}

function isHazardCell(level, x, y) {
  const cx = clampIndex(x, level?.world?.grid?.width ?? 1);
  const cy = clampIndex(y, level?.world?.grid?.height ?? 1);
  return Number(level?.layers?.hazards?.[cy]?.[cx] ?? 0) > 0;
}

function getNextSurfaceTime(level, mission, time) {
  return getSurfacingTimes(level, mission).find((surfaceTime) => surfaceTime > Number(time ?? 0)) ?? null;
}

function estimateReachableBeforeSurface({ waypoints, selectedTime, nextSurfaceTime, planningAnchor, agent, level, mission }) {
  if (nextSurfaceTime === null || !waypoints.length) return null;
  if (!isFinitePoint(planningAnchor)) return null;
  const next = waypoints.find((waypoint) => Number(waypoint.t ?? getWindowStartTime(level, waypoint.window ?? 0)) >= selectedTime) ?? waypoints[0];
  const timeBudget = Math.max(0, nextSurfaceTime - selectedTime);
  const speed = Number(agent.maxSpeed ?? 1);
  const reach = speed * timeBudget;
  const start = { x: Number(planningAnchor.x), y: Number(planningAnchor.y) };
  const distance = Math.hypot(Number(next.x) - start.x, Number(next.y) - start.y);
  const margin = Number(getDriftRules(mission).driftGain) + 0.5;
  return distance <= reach + margin;
}

function findFuelExceededWindow(windowMap) {
  const rows = [...windowMap.values()].sort((a, b) => a.window - b.window);
  return rows.find((row) => row.remainingFuel < 0)?.window ?? rows.at(-1)?.window ?? 0;
}

function describeAssist(assistCount, oppositionCount) {
  if (assistCount > 0 && oppositionCount === 0) return 'assisted';
  if (oppositionCount > 0 && assistCount === 0) return 'opposing';
  if (assistCount > 0 && oppositionCount > 0) return 'mixed';
  return 'neutral';
}

function routeStatus({ routeValid, remainingFuel, hazardRisk, oppositionCount }) {
  if (!routeValid) return 'blocked';
  if (remainingFuel < 0) return 'exceeds fuel';
  if (hazardRisk > 0) return 'hazard risk';
  if (oppositionCount > 1) return 'drift risk';
  return 'valid';
}

function clampIndex(value, max) {
  return Math.max(0, Math.min(max - 1, Math.floor(Number(value) || 0)));
}

function isFinitePoint(point) {
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y));
}
