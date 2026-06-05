import { normalizeROIValue } from '../sim/ROIValue.js';
import { normalizeSamplingRules } from '../sim/MissionRules.js';
import { buildRouteSegmentsForAgent } from '../planning/RouteSegmentBuilder.js';
import { getSelectedStart } from '../deployment/DeploymentZones.js';
import { clipLineToTerrain } from '../planning/RoutePreview.js';
import { estimateBeachingRiskAtCell, estimateSegmentBeachingRisk, estimateStochasticCurrentRiskAtCell } from '../planning/ShorelineRisk.js';
import { isCellNavigable } from '../planning/Navigability.js';
import { getMobileHazardsAtTime } from '../sim/MobileHazards.js';
import { clamp } from '../math/MathUtils.js';
import { sampleCurrentField } from '../currents/CurrentFieldSampler.js';

export const ROI_MODES = ['value', 'probability', 'expectedValue', 'remaining', 'travelCost', 'riskSafety'];
const DEBUG_TRAVEL_COST = false;
const riskReachabilityCache = new WeakMap();

export function normalizeRoiMode(mode) {
  const key = String(mode ?? '').trim().toLowerCase().replace(/\s+/g, '');
  if (key === 'risk' || key === 'safety' || key === 'risksafety' || key === 'risk/safety' || key === 'risk-safety') return 'riskSafety';
  if (mode === 'depletedValue') return 'remaining';
  if (mode === 'expected') return 'expectedValue';
  return ROI_MODES.includes(mode) ? mode : 'expectedValue';
}

export function getNextRoiMode(mode) {
  const current = normalizeRoiMode(mode);
  const index = ROI_MODES.indexOf(current);
  return ROI_MODES[(index + 1) % ROI_MODES.length];
}

export function getRoiModeLabel(mode) {
  return {
    value: 'Value',
    probability: 'Probability',
    expectedValue: 'Expected',
    remaining: 'Remaining',
    travelCost: 'Travel Cost',
    riskSafety: 'Risk / Safety'
  }[normalizeRoiMode(mode)];
}

export function getRoiModeDescription(mode, { deterministic = false } = {}) {
  const normalized = normalizeRoiMode(mode);
  if (normalized === 'value') return 'Shows raw ROI sample value.';
  if (normalized === 'probability') {
    return deterministic
      ? 'Deterministic mission: probability is 1.0 for available ROI cells unless probabilistic targets are configured.'
      : 'Shows how likely each sampling opportunity is to exist.';
  }
  if (normalized === 'remaining') return 'Shows value still available after currently planned fleet routes are considered.';
  if (normalized === 'riskSafety') return 'Shows one navigability spectrum: low-risk areas are safer, high-risk areas are dangerous or likely to cause route trouble.';
  if (normalized === 'travelCost') return 'Shows estimated travel cost from the current planning anchor.';
  return 'Shows risk-adjusted ROI value: raw value times probability.';
}

export function getCellRoiDisplayValue({ cell, x, y, t = 0, mode = 'expectedValue', plan = null, mission = null, level = null, frame = null, coverage = null, selectedAgentId = null, selectedWaypoint = null, planningAnchor = null, travelCostField = null, challengeMode = null } = {}) {
  const roi = normalizeROIValue(cell);
  const normalized = normalizeRoiMode(mode);
  const remaining = normalized === 'remaining'
    ? getRemainingRoiValue({ x, y, t, rawValue: roi.value, roi, plan, mission, level, coverage })
    : null;
  const risk = normalized === 'riskSafety'
    ? computeRiskScore({ x, y, t, level, mission, frame, planningAnchor, challengeMode })
    : null;
  const travel = normalized === 'travelCost'
    ? getTravelCost({ x, y, t, level, mission, plan, frame, selectedAgentId, selectedWaypoint, planningAnchor, field: travelCostField })
    : null;
  const value = normalized === 'value'
    ? roi.value
    : normalized === 'probability'
      ? roi.probability
      : normalized === 'remaining'
        ? remaining.remainingValue
        : normalized === 'riskSafety'
          ? risk.value
          : normalized === 'travelCost'
              ? travel.displayValue
              : roi.expectedValue;
  return {
    mode: normalized,
    value: clamp01(value),
    rawValue: roi.value,
    probability: roi.probability,
    expectedValue: roi.expectedValue,
    remainingValue: remaining?.remainingValue ?? roi.expectedValue,
    depleted: Boolean(remaining?.depleted),
    claimedBy: remaining?.claimedBy ?? [],
    samplingMode: remaining?.samplingMode ?? normalizeSamplingRules(mission).mode,
    risk,
    travel
  };
}

export function getCellRisk(context = {}) {
  return computeRiskScore(context);
}

export function computeRiskScore({ x, y, t = 0, level = null, mission = null, frame = null, planningAnchor = null, challengeMode = null } = {}) {
  const navigability = isCellNavigable(level, mission, x, y);
  if (!navigability.ok) return blockedRisk(navigability.reason);
  const routeClip = getCachedAnchorReachability({ level, mission, planningAnchor, x, y });
  if (routeClip?.reachable === false) return blockedRisk(routeClip.reason ?? 'continuous segment blocked');
  const reasons = [];
  let risk = 0;
  const stochasticRisk = estimateStochasticCurrentRiskAtCell({
    level,
    frame,
    x,
    y,
    stochasticMode: isForecastMode(challengeMode, frame)
  });
  if (stochasticRisk.blocking) return blockedRisk('low-confidence current near land');
  if (stochasticRisk.warning) {
    risk += Math.max(0.45, Number(stochasticRisk.value ?? 0));
    reasons.push(...(stochasticRisk.reasons?.length ? stochasticRisk.reasons : ['unknown shoreline current']));
  }
  const hazard = Number(level?.layers?.hazards?.[y]?.[x] ?? 0);
  if (hazard > 0) {
    risk += 0.85;
    reasons.push('hazard');
  }
  const mobile = getMobileHazardsAtTime(level, t).find((item) => {
    const radius = Number(item.radius ?? 1);
    return Math.hypot(Number(item.x) - Number(x), Number(item.y) - Number(y)) <= radius + 0.75;
  });
  if (mobile) {
    risk += 0.55;
    reasons.push('mobile hazard nearby');
  }
  const depth = level?.layers?.depth?.[y]?.[x];
  if (depth !== undefined && Number(depth) < 0.32) {
    risk += 0.34;
    reasons.push('shallow');
  }
  const current = sampleCurrentField({ frame, level, x, y, time: t });
  const currentMagnitude = current.magnitude;
  if (currentMagnitude > 0.55) {
    risk += Math.min(0.34, currentMagnitude * 0.24);
    reasons.push('strong current');
  }
  const beachingRisk = estimateBeachingRiskAtCell({ level, frame, x, y });
  if (beachingRisk.value >= 0.5) {
    risk += Math.min(0.42, beachingRisk.value * 0.42);
    reasons.push(`${beachingRisk.level} shoreline current`);
  } else if (beachingRisk.value > 0) {
    risk += Math.min(0.18, beachingRisk.value * 0.32);
    reasons.push('shoreline current');
  }
  const confidence = frame?.confidence?.[y]?.[x];
  if (confidence !== undefined && Number(confidence) < 0.45) {
    risk += 0.24;
    reasons.push('low forecast confidence');
  }
  const value = clamp01(risk);
  const safetyValue = clamp01(1 - value);
  return {
    value,
    safetyValue,
    label: value > 0.7 ? 'high' : value > 0.35 ? 'medium' : 'low',
    safetyLabel: safetyValue > 0.7 ? 'high' : safetyValue > 0.35 ? 'medium' : 'low',
    reasons,
    currentMagnitude,
    beachingRisk,
    stochasticRisk,
    derivedSafety: true
  };
}

function blockedRisk(reason) {
  return {
    value: 1,
    safetyValue: 0,
    label: 'blocked',
    safetyLabel: 'low',
    reasons: [reason],
    currentMagnitude: 0,
    beachingRisk: null,
    derivedSafety: true
  };
}

export function getTravelCost({ x, y, t = 0, level = null, mission = null, plan = null, frame = null, selectedAgentId = null, selectedWaypoint = null, planningAnchor = null, field = null } = {}) {
  const computedField = field ?? computeTravelCostField({
    level,
    mission,
    plan,
    frame,
    selectedAgentId,
    selectedWaypoint,
    planningAnchor,
    t
  });
  const entry = computedField.cells.get(`${Math.floor(Number(x))},${Math.floor(Number(y))}`);
  if (entry) return entry;
  if (!computedField.anchor) {
    return {
      available: false,
      displayValue: 0,
      message: 'Choose deployment/start or place a waypoint first.'
    };
  }
  return {
    available: true,
    reachable: false,
    displayValue: 1,
    cost: Infinity,
    energy: Infinity,
    eta: Infinity,
    message: 'Blocked or outside map'
  };
}

export function computeTravelCostField({ level = null, mission = null, plan = null, frame = null, selectedAgentId = null, selectedWaypoint = null, planningAnchor = null, t = 0 } = {}) {
  const anchor = getTravelCostAnchor({ plan, mission, selectedAgentId, selectedWaypoint, planningAnchor });
  const cells = new Map();
  const grid = level?.world?.grid ?? {};
  const width = Number(grid.width ?? 0);
  const height = Number(grid.height ?? 0);
  const agent = mission?.agents?.find((candidate) => candidate.id === selectedAgentId) ?? mission?.agents?.[0] ?? null;
  const agentPlan = plan?.agentPlans?.find((candidate) => candidate.agentId === (selectedAgentId ?? agent?.id));
  if (!isFinitePoint(anchor) || width <= 0 || height <= 0) {
    return { anchor: null, cells, minCost: null, maxCost: null, reachableCount: 0, blockedCount: width * height };
  }
  const budget = getTravelCostBudget({ level, mission, agent, agentPlan, anchor, t });
  let minCost = Infinity;
  let maxCost = -Infinity;
  let reachableCount = 0;
  let blockedCount = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const entry = safeEstimateTravelCostCell({ level, mission, agent, frame, anchor, x, y, budget });
      cells.set(`${x},${y}`, entry);
      if (entry.reachable && Number.isFinite(entry.cost)) {
        minCost = Math.min(minCost, entry.cost);
        maxCost = Math.max(maxCost, entry.cost);
        reachableCount += 1;
      } else {
        blockedCount += 1;
      }
    }
  }
  const span = maxCost - minCost;
  for (const entry of cells.values()) {
    entry.displayValue = entry.reachable
      ? (span > 1e-6 && Number.isFinite(entry.cost) ? clamp01((entry.cost - minCost) / span) : 0.35)
      : 1;
  }
  if (DEBUG_TRAVEL_COST) debugTravelCostSamples({ anchor, cells, level, frame, agent, mission });
  return {
    anchor,
    cells,
    minCost: Number.isFinite(minCost) ? minCost : null,
    maxCost: Number.isFinite(maxCost) ? maxCost : null,
    reachableCount,
    blockedCount,
    allIdentical: reachableCount > 0 && Math.abs(span) <= 1e-6,
    budget,
    t
  };
}

export function getTravelCostBudget({ level = null, mission = null, plan = null, selectedAgentId = null, selectedWaypoint = null, planningAnchor = null, agent = null, agentPlan = null, anchor = null, t = 0 } = {}) {
  const resolvedAgent = agent ?? mission?.agents?.find((candidate) => candidate.id === selectedAgentId) ?? mission?.agents?.[0] ?? null;
  const resolvedAgentPlan = agentPlan ?? plan?.agentPlans?.find((candidate) => candidate.agentId === (selectedAgentId ?? resolvedAgent?.id)) ?? null;
  const resolvedAnchor = anchor ?? getTravelCostAnchor({ plan, mission, selectedAgentId: selectedAgentId ?? resolvedAgent?.id, selectedWaypoint, planningAnchor });
  const anchorTime = Number(resolvedAnchor?.estimatedArrivalTime ?? resolvedAnchor?.t ?? t ?? 0);
  return {
    anchorTime,
    availableTime: getAvailableTravelTime(level, mission, anchorTime),
    remainingFuel: getRemainingFuelAtAnchor({ mission, agent: resolvedAgent, agentPlan: resolvedAgentPlan, anchor: resolvedAnchor })
  };
}

export function getTravelCostAnchor({ plan = null, mission = null, selectedAgentId = null, selectedWaypoint = null, planningAnchor = null } = {}) {
  const agentPlan = plan?.agentPlans?.find((candidate) => candidate.agentId === selectedAgentId);
  const waypoints = agentPlan?.waypoints ?? [];
  if (selectedWaypoint?.agentId === selectedAgentId) {
    const waypoint = waypoints[Number(selectedWaypoint.index)];
    if (isFinitePoint(waypoint)) return { ...waypoint, agentId: selectedAgentId, source: 'selectedWaypoint', waypointIndex: Number(selectedWaypoint.index) };
  }
  const lastConnected = [...waypoints].reverse().find((waypoint) => isFinitePoint(waypoint) && waypoint.validity?.valid !== false);
  if (lastConnected) {
    const index = waypoints.indexOf(lastConnected);
    return { ...lastConnected, agentId: selectedAgentId, source: 'latestWaypoint', waypointIndex: index };
  }
  if (isFinitePoint(planningAnchor)) return planningAnchor;
  const agent = mission?.agents?.find((candidate) => candidate.id === selectedAgentId);
  const selectedStart = getSelectedStart(agent);
  if (isFinitePoint(selectedStart)) return { ...selectedStart, agentId: selectedAgentId, source: 'selectedStart' };
  if (isFinitePoint(agent?.start)) return { ...agent.start, agentId: selectedAgentId, source: 'start' };
  return null;
}

function safeEstimateTravelCostCell(args) {
  try {
    const entry = estimateTravelCostCell(args);
    if (!entry) {
      return invalidTravelCostCell('Invalid travel estimate');
    }
    if (!entry.reachable) return { ...entry, displayValue: 1 };
    if (!Number.isFinite(Number(entry.cost)) || !Number.isFinite(Number(entry.energy)) || !Number.isFinite(Number(entry.eta))) {
      return invalidTravelCostCell('Invalid travel estimate');
    }
    return entry;
  } catch (error) {
    return invalidTravelCostCell(error?.message ? `Travel estimate failed: ${error.message}` : 'Travel estimate failed');
  }
}

function estimateTravelCostCell({ level, mission, agent, frame, anchor, x, y, budget = {} }) {
  if (!isInsideLevel(level, x, y) || level?.layers?.terrain?.[y]?.[x]) {
    return { available: true, reachable: false, displayValue: 1, cost: Infinity, energy: Infinity, eta: Infinity, message: 'Blocked terrain' };
  }
  const target = { x, y };
  const clipped = clipLineToTerrain(anchor, target, level, { mission });
  const lineDistance = Math.hypot(Number(x) - Number(anchor.x), Number(y) - Number(anchor.y));
  const distance = lineDistance;
  const direction = normalizeDirection(Number(x) - Number(anchor.x), Number(y) - Number(anchor.y));
  const baseSpeed = Math.max(0.1, finiteNumber(agent?.maxSpeed ?? agent?.speed ?? mission?.physics?.speed, 1));
  const driftGain = finiteNumber(mission?.rules?.drift?.driftGain ?? mission?.physics?.driftGain, 0.75);
  const minEffectiveSpeed = baseSpeed * 0.15;
  const maxEffectiveSpeed = baseSpeed * 2;
  const current = averageSegmentCurrent(frame, level, anchor, target);
  const currentMagnitude = Math.hypot(current.u, current.v);
  const currentAlong = current.u * direction.x + current.v * direction.y;
  const crossX = current.u - currentAlong * direction.x;
  const crossY = current.v - currentAlong * direction.y;
  const currentCross = Math.hypot(crossX, crossY);
  const rawEffectiveSpeed = baseSpeed + driftGain * currentAlong;
  const effectiveSpeed = clamp(rawEffectiveSpeed, minEffectiveSpeed, maxEffectiveSpeed);
  const eta = distance / effectiveSpeed;
  const hazardPenalty = finiteNumber(level?.layers?.hazards?.[y]?.[x], 0) > 0 ? 5 : 0;
  const depthPenalty = level?.layers?.depth?.[y]?.[x] !== undefined && Number(level.layers.depth[y][x]) < 0.32 ? 2 : 0;
  const beachingRisk = estimateSegmentBeachingRisk({ level, frame, start: anchor, end: target });
  const stochasticRisk = estimateStochasticCurrentRiskAtCell({
    level,
    frame,
    x,
    y,
    stochasticMode: isForecastMode(null, frame)
  });
  if (stochasticRisk.blocking) {
    return {
      available: true,
      reachable: false,
      displayValue: 1,
      cost: Infinity,
      energy: Infinity,
      eta: Infinity,
      message: 'Low-confidence current near land could beach the glider',
      stochasticRisk
    };
  }
  const beachingPenalty = (Number(beachingRisk.costPenalty ?? 0) + Number(stochasticRisk.value ?? 0) * 4) * Math.max(1, distance);
  const oppositionScale = finiteNumber(mission?.rules?.travelCost?.oppositionScale, 2);
  const crossCurrentScale = finiteNumber(mission?.rules?.travelCost?.crossCurrentScale, 0.75);
  const assistScale = finiteNumber(mission?.rules?.travelCost?.assistScale, 0.8);
  const energyRate = finiteNumber(mission?.physics?.energyPerCell ?? mission?.scoring?.energyCostPerDistance ?? mission?.rules?.energyCostPerDistance, 1);
  const crossPenalty = currentCross * crossCurrentScale * distance;
  const oppositionPenalty = Math.max(0, -currentAlong) * oppositionScale * distance;
  const assistDiscount = Math.max(0, currentAlong) * assistScale * distance;
  const baseEnergy = distance * energyRate;
  const energy = Math.max(0, baseEnergy + hazardPenalty + depthPenalty + beachingPenalty + crossPenalty + oppositionPenalty - assistDiscount);
  const cost = Math.max(0, energy + eta * 0.2);
  const remainingFuel = Number(budget.remainingFuel ?? agent?.battery ?? mission?.rules?.energyBudget ?? Infinity);
  const availableTime = Number(budget.availableTime ?? Infinity);
  const fuelReachable = !Number.isFinite(remainingFuel) || energy <= remainingFuel + 1e-6;
  const timeReachable = !Number.isFinite(availableTime) || eta <= availableTime + 1e-6;
  const opposingCurrentTooStrong = distance > 0.01 && currentAlong < 0 && (
    rawEffectiveSpeed <= minEffectiveSpeed + 1e-6
    || (currentMagnitude > baseSpeed * 0.8 && Math.abs(currentAlong) > baseSpeed * 0.65)
  );
  const reachable = clipped.valid !== false && fuelReachable && timeReachable && !opposingCurrentTooStrong;
  const message = clipped.valid === false
    ? 'Terrain blocks direct route'
    : !fuelReachable
      ? 'Fuel limit exceeded'
      : !timeReachable
        ? 'Time budget exceeded'
        : opposingCurrentTooStrong
          ? 'Opposing current too strong'
        : '';
  return {
    available: true,
    reachable,
    displayValue: 0,
    cost,
    energy,
    eta,
    distance,
    effectiveSpeed,
    baseEnergy,
    remainingFuel,
    availableTime,
    fuelReachable,
    timeReachable,
    hazardPenalty,
    depthPenalty,
    beachingPenalty,
    beachingRisk,
    stochasticRisk,
    crossPenalty,
    oppositionPenalty,
    assistDiscount,
    currentAssist: currentAlong,
    currentAlong,
    currentCross,
    crossCurrent: currentCross,
    currentMagnitude,
    currentVector: { u: current.u, v: current.v },
    rawEffectiveSpeed,
    minEffectiveSpeed,
    maxEffectiveSpeed,
    opposingCurrentTooStrong,
    currentLabel: currentAlignmentLabel(currentAlong, currentCross),
    blockedAt: clipped.blockedAt ?? null,
    movementModel: 'continuous-segment',
    sampledCells: clipped.traversedCells ?? [],
    message
  };
}

function getCachedAnchorReachability({ level = null, mission = null, planningAnchor = null, x, y } = {}) {
  if (!level || !isFinitePoint(planningAnchor)) return null;
  let byKey = riskReachabilityCache.get(level);
  if (!byKey) {
    byKey = new Map();
    riskReachabilityCache.set(level, byKey);
  }
  const key = [
    Math.floor(Number(planningAnchor.x)),
    Math.floor(Number(planningAnchor.y)),
    level?.layers?.terrain?.length ?? 0,
    level?.world?.grid?.width ?? 0,
    level?.world?.grid?.height ?? 0
  ].join(':');
  let field = byKey.get(key);
  if (!field) {
    field = new Map();
    byKey.set(key, field);
  }
  const cellKey = `${Math.floor(Number(x))},${Math.floor(Number(y))}`;
  if (field.has(cellKey)) return field.get(cellKey);
  const clipped = clipLineToTerrain(planningAnchor, { x, y }, level, { mission });
  const entry = {
    reachable: clipped.valid !== false,
    reason: clipped.valid === false ? clipped.reason ?? 'segmentBlocked' : 'continuousSegmentClear',
    blockedAt: clipped.blockedAt ?? null,
    movementModel: 'continuous-segment'
  };
  field.set(cellKey, entry);
  return entry;
}

function finiteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeDirection(dx, dy) {
  const length = Math.hypot(dx, dy);
  if (!Number.isFinite(length) || length <= 1e-9) return { x: 0, y: 0 };
  return { x: dx / length, y: dy / length };
}

function averageSegmentCurrent(frame, level, start, target) {
  const midpoint = {
    x: (Number(start.x) + Number(target.x)) / 2,
    y: (Number(start.y) + Number(target.y)) / 2
  };
  const samples = [
    sampleCurrent(frame, level, start.x, start.y),
    sampleCurrent(frame, level, midpoint.x, midpoint.y),
    sampleCurrent(frame, level, target.x, target.y)
  ];
  const total = samples.reduce((sum, current) => ({
    u: sum.u + current.u,
    v: sum.v + current.v
  }), { u: 0, v: 0 });
  return {
    u: total.u / samples.length,
    v: total.v / samples.length
  };
}

function sampleCurrent(frame, level, x, y) {
  return sampleCurrentField({ frame, level, x, y });
}

function clampIndex(value, max) {
  return Math.max(0, Math.min(Math.max(0, Number(max) - 1), Number.isFinite(Number(value)) ? Number(value) : 0));
}

function debugTravelCostSamples({ anchor, cells, level, frame, agent, mission }) {
  if (!anchor || !cells) return;
  const ax = Math.floor(Number(anchor.x));
  const ay = Math.floor(Number(anchor.y));
  const offsets = {
    east: { x: ax + 3, y: ay },
    west: { x: ax - 3, y: ay },
    north: { x: ax, y: ay - 3 },
    south: { x: ax, y: ay + 3 }
  };
  const sample = Object.fromEntries(Object.entries(offsets).map(([label, point]) => {
    const x = clampIndex(point.x, Number(level?.world?.grid?.width ?? 1));
    const y = clampIndex(point.y, Number(level?.world?.grid?.height ?? 1));
    const entry = cells.get(`${x},${y}`);
    return [label, {
      cell: { x, y },
      cost: entry?.cost ?? null,
      currentAlong: entry?.currentAlong ?? null,
      currentCross: entry?.currentCross ?? null,
      effectiveSpeed: entry?.effectiveSpeed ?? null,
      reachable: entry?.reachable ?? null,
      message: entry?.message ?? ''
    }];
  }));
  console.debug('[travel-cost]', {
    anchor: { x: ax, y: ay },
    localCurrent: sampleCurrent(frame, level, ax, ay),
    gliderSpeed: agent?.maxSpeed ?? agent?.speed ?? mission?.physics?.speed ?? 1,
    sample
  });
}

function invalidTravelCostCell(message) {
  return {
    available: true,
    reachable: false,
    displayValue: 1,
    cost: Infinity,
    energy: Infinity,
    eta: Infinity,
    message
  };
}

function getAvailableTravelTime(level, mission, anchorTime = 0) {
  const missionDuration = Number(level?.world?.time?.duration ?? mission?.rules?.duration ?? Infinity);
  const interval = Number(mission?.rules?.communication?.surfaceInterval ?? 0);
  const time = Number(anchorTime ?? 0);
  if (Number.isFinite(interval) && interval > 0) {
    const nextSurface = Math.ceil((time + 1e-6) / interval) * interval;
    return Math.max(0, nextSurface - time);
  }
  if (Number.isFinite(missionDuration)) return Math.max(0, missionDuration - time);
  return Infinity;
}

function getRemainingFuelAtAnchor({ mission = null, agent = null, agentPlan = null, anchor = null } = {}) {
  const startingFuel = Number(agent?.battery ?? agent?.maxBattery ?? mission?.rules?.energyBudget ?? Infinity);
  if (Number.isFinite(Number(anchor?.remainingFuelEstimate))) return Math.max(0, Number(anchor.remainingFuelEstimate));
  if (Number.isFinite(Number(anchor?.cumulativeEnergy)) && Number.isFinite(startingFuel)) {
    return Math.max(0, startingFuel - Number(anchor.cumulativeEnergy));
  }
  const index = Number(anchor?.waypointIndex);
  const waypoint = Number.isInteger(index) ? agentPlan?.waypoints?.[index] : null;
  if (Number.isFinite(Number(waypoint?.remainingFuelEstimate))) return Math.max(0, Number(waypoint.remainingFuelEstimate));
  if (Number.isFinite(Number(waypoint?.cumulativeEnergy)) && Number.isFinite(startingFuel)) {
    return Math.max(0, startingFuel - Number(waypoint.cumulativeEnergy));
  }
  return startingFuel;
}

function currentAlignmentLabel(currentAssist, crossCurrent) {
  const assist = Number(currentAssist ?? 0);
  const cross = Math.abs(Number(crossCurrent ?? 0));
  if (assist > 0.12 && assist >= cross * 0.6) return 'current helps';
  if (assist < -0.12 && Math.abs(assist) >= cross * 0.6) return 'against current';
  if (cross > 0.18) return 'cross-current';
  return 'calm/neutral';
}

function isForecastMode(challengeMode, frame) {
  return String(challengeMode ?? '').toLowerCase() === 'forecast' || frame?.source === 'forecast';
}

export function computePlannedCoverage(plan, mission = null, level = null) {
  const cells = new Map();
  for (const agentPlan of plan?.agentPlans ?? []) {
    const agent = mission?.agents?.find((candidate) => candidate.id === agentPlan.agentId);
    const samplingRadius = getPlanningSamplingRadius(mission, agent);
    const route = buildRouteSegmentsForAgent({ level, mission, agent, agentPlan });
    for (const [segmentIndex, segment] of (route.segments ?? []).entries()) {
      const routeCells = rasterizeRouteSegment(segment, level);
      addCoverageCells(cells, expandCellsBySamplingRadius(routeCells, samplingRadius, level), {
        agentId: agentPlan.agentId,
        source: 'segment',
        segmentIndex,
        fromWaypointId: segment.from?.id ?? null,
        fromWaypointIndex: Number.isInteger(segment.from?.waypointIndex) ? segment.from.waypointIndex : null,
        toWaypointId: segment.to?.id ?? null,
        toWaypointIndex: Number.isInteger(segment.to?.waypointIndex) ? segment.to.waypointIndex : segment.waypointIndex ?? null,
        valid: segment.valid !== false,
        blockedAt: segment.blockedAt ?? null
      });
    }
    for (const [index, waypoint] of (agentPlan.waypoints ?? []).entries()) {
      const action = waypoint.action ?? 'sample';
      if (action !== 'sample') continue;
      const x = Math.round(Number(waypoint.x));
      const y = Math.round(Number(waypoint.y));
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      if (level && !isInsideLevel(level, x, y)) continue;
      addCoverageCells(cells, expandCellsBySamplingRadius([{ x, y }], samplingRadius, level), {
        agentId: agentPlan.agentId,
        source: 'waypoint',
        waypointId: waypoint.id ?? null,
        waypointIndex: index,
        t: Number(waypoint.estimatedArrivalTime ?? waypoint.t ?? 0),
        window: Number(waypoint.window ?? 0)
      });
    }
  }
  return { cells };
}

export function getRemainingRoiValue({ x, y, rawValue = 0, roi = null, plan = null, mission = null, level = null, coverage = null } = {}) {
  const normalized = roi ? normalizeROIValue(roi) : { value: clamp01(rawValue), probability: 1, expectedValue: clamp01(rawValue) };
  const plannedCoverage = coverage ?? computePlannedCoverage(plan, mission, level);
  const entry = plannedCoverage.cells.get(`${Math.round(Number(x))},${Math.round(Number(y))}`);
  const rules = normalizeSamplingRules(mission);
  if (!entry?.claimedBy?.length) {
    return {
      rawValue: normalized.value,
      remainingValue: normalized.value,
      depleted: false,
      claimedBy: [],
      samplingMode: rules.mode
    };
  }
  const multiplier = plannedDepletionMultiplier(rules);
  return {
    rawValue: normalized.value,
    remainingValue: clamp01(normalized.value * multiplier),
    depleted: multiplier < 0.999,
    claimedBy: entry.claimedBy,
    samplingMode: rules.mode
  };
}

function plannedDepletionMultiplier(rules) {
  if (rules.mode === 'persistent') return 1;
  if (rules.mode === 'diminishing') return rules.depletionFactor;
  if (rules.mode === 'cooldown') return rules.duplicateValueMultiplier;
  return rules.duplicateValueMultiplier;
}

export function rasterizeRouteSegment(segment, level = null) {
  const diagnosticCells = segment?.traversedCells?.length
    ? segment.traversedCells
    : segment?.pathCells?.length
      ? segment.pathCells
      : segment?.sampledCells?.length
        ? segment.sampledCells
        : null;
  if (diagnosticCells?.length) {
    return uniqueCells(diagnosticCells.filter((cell) => !level || isInsideLevel(level, cell.x, cell.y)));
  }
  const points = segment?.points?.length
    ? segment.points
    : [segment?.from, segment?.valid === false ? segment?.lastValid : segment?.to].filter(Boolean);
  if (points.length < 2) return [];
  const cells = [];
  for (let index = 1; index < points.length; index += 1) {
    cells.push(...bresenhamCells(points[index - 1], points[index], level));
  }
  return uniqueCells(cells);
}

export function expandCellsBySamplingRadius(cells, radius = 0, level = null) {
  const boundedRadius = Math.max(0, Number(radius) || 0);
  if (boundedRadius <= 0) return uniqueCells(cells.filter((cell) => !level || isInsideLevel(level, cell.x, cell.y)));
  const expanded = [];
  const integerRadius = Math.ceil(boundedRadius);
  for (const cell of cells) {
    for (let dy = -integerRadius; dy <= integerRadius; dy += 1) {
      for (let dx = -integerRadius; dx <= integerRadius; dx += 1) {
        if (Math.hypot(dx, dy) > boundedRadius) continue;
        const x = Math.round(Number(cell.x)) + dx;
        const y = Math.round(Number(cell.y)) + dy;
        if (level && !isInsideLevel(level, x, y)) continue;
        if (level?.layers?.terrain?.[y]?.[x]) continue;
        expanded.push({ x, y });
      }
    }
  }
  return uniqueCells(expanded);
}

function addCoverageCells(cells, coveredCells, claim) {
  for (const cell of coveredCells) {
    const x = Math.round(Number(cell.x));
    const y = Math.round(Number(cell.y));
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const key = `${x},${y}`;
    const entry = cells.get(key) ?? { x, y, claimedBy: [] };
    entry.claimedBy.push({ ...claim });
    cells.set(key, entry);
  }
}

function bresenhamCells(start, end, level = null) {
  let x0 = Math.round(Number(start?.x));
  let y0 = Math.round(Number(start?.y));
  const x1 = Math.round(Number(end?.x));
  const y1 = Math.round(Number(end?.y));
  if (![x0, y0, x1, y1].every(Number.isFinite)) return [];
  const cells = [];
  const dx = Math.abs(x1 - x0);
  const sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  const maxSteps = Math.max(1, Number(level?.world?.grid?.width ?? 100) * Number(level?.world?.grid?.height ?? 100));
  for (let step = 0; step <= maxSteps; step += 1) {
    if (!level || isInsideLevel(level, x0, y0)) {
      if (!level?.layers?.terrain?.[y0]?.[x0]) cells.push({ x: x0, y: y0 });
      else break;
    }
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * error;
    if (e2 >= dy) {
      error += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      error += dx;
      y0 += sy;
    }
  }
  return cells;
}

function uniqueCells(cells) {
  const seen = new Set();
  const result = [];
  for (const cell of cells ?? []) {
    const x = Math.round(Number(cell.x));
    const y = Math.round(Number(cell.y));
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const key = `${x},${y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ x, y });
  }
  return result;
}

function getPlanningSamplingRadius(mission, agent) {
  return Number(mission?.rules?.samplingRadius ?? agent?.samplingRadius ?? 0.75);
}

function isInsideLevel(level, x, y) {
  const grid = level?.world?.grid ?? {};
  return x >= 0 && y >= 0 && x < Number(grid.width ?? 0) && y < Number(grid.height ?? 0);
}

function isFinitePoint(point) {
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y));
}

function clamp01(value) {
  if (!Number.isFinite(Number(value))) return 0;
  return Math.max(0, Math.min(1, Number(value)));
}
