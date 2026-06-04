import { getSelectedStart, requiresDeploymentSelection } from '../deployment/DeploymentZones.js';
import { getPlanningFrame } from '../sim/ChallengeMode.js';
import { getDriftRules } from '../sim/StochasticDrift.js';
import { getTimeConfig, getWindowForTime } from '../time/MissionTime.js';
import { clipLineToTerrain, estimateRouteEnergy } from './RoutePreview.js';

export function recomputePlanningMarkerReachability(state, agentId = null) {
  const selectedAgentId = agentId ?? state?.selectedAgentId ?? state?.mission?.agents?.[0]?.id ?? null;
  const agent = state?.mission?.agents?.find((candidate) => candidate.id === selectedAgentId);
  if (!agent) return;
  for (const marker of state?.plan?.planningMarkers ?? []) {
    marker.reachability = estimateFutureMarkerReachability({
      agent,
      plan: state.plan,
      marker,
      level: state.level,
      mission: state.mission,
      gameState: state
    });
  }
}

export function estimateFutureMarkerReachability({
  agent,
  plan,
  marker,
  level,
  mission,
  gameState = {}
} = {}) {
  const agentPlan = (plan?.agentPlans ?? []).find((candidate) => candidate.agentId === agent?.id);
  const warnings = [];
  if (!agent || !marker || !level || !mission || !agentPlan) {
    return impossible('No valid glider, marker, level, mission, or plan context.');
  }
  if (!isFinitePoint(marker)) return impossible('Marker needs a valid grid cell.');

  const anchor = findMarkerAnchor({ agent, agentPlan, marker, level, mission, gameState });
  if (!isFinitePoint(anchor)) return impossible('Choose a deployment/start cell before estimating marker reach.');

  const targetTime = Number(marker.t ?? 0);
  const availableTime = targetTime - Number(anchor.t ?? 0);
  const timeConfig = getTimeConfig(level);
  const missionDuration = Number(timeConfig.duration ?? level?.world?.time?.duration ?? Infinity);
  if (targetTime > missionDuration) warnings.push('Marker is beyond mission duration.');
  if (availableTime < 0) warnings.push('Marker time is before the connected planning anchor.');

  const frame = getPlanningFrame(level, targetTime, {
    challengeMode: gameState.challengeMode,
    revealTruth: gameState.ui?.revealTruth,
    forecastMemberId: gameState.ui?.forecastMemberId
  });
  const driftGain = Number(getDriftRules(mission).driftGain);
  const energyPerCell = Number(mission?.physics?.energyPerCell ?? mission?.scoring?.energyCostPerDistance ?? 1);
  const route = estimateRouteEnergy(anchor, marker, level, agent, frame, { driftGain, energyPerCell });
  const travelTime = estimateTravelTime({ route, agent, driftGain });
  const timeSlack = availableTime - travelTime;
  const startingFuel = Number(agent.battery ?? agent.maxBattery ?? mission?.rules?.energyBudget ?? 100);
  const consumedFuel = Number(anchor.cumulativeEnergy ?? 0);
  const remainingFuel = startingFuel - consumedFuel - Number(route.energy ?? 0);
  const hazardRisk = estimateHazardRisk(level, route);
  const uncertaintyRisk = estimateForecastUncertainty(frame, marker);
  const interval = Number(mission?.rules?.communication?.surfaceInterval ?? timeConfig.planningWindow ?? 1) || 1;
  const recommendedBackfillSteps = Math.max(1, Math.ceil(Math.max(0, travelTime) / interval));

  if (!route.valid) warnings.push('Direct estimate crosses blocked terrain.');
  if (hazardRisk > 0) warnings.push('Estimated route crosses hazard risk.');
  if (route.currentAssist < -0.12) warnings.push('Estimated route fights current.');
  if (Math.abs(route.crossCurrent ?? 0) > 0.14) warnings.push('Cross-current drift may widen the route.');
  if (uncertaintyRisk > 0) warnings.push('Forecast uncertainty may change actual reach.');
  if (remainingFuel < 0) warnings.push('Estimated fuel would be insufficient.');
  if (timeSlack < 0) warnings.push('Estimated arrival is after target time.');

  let status = 'reachable';
  if (!route.valid || availableTime < 0 || timeSlack < 0 || remainingFuel < 0 || targetTime > missionDuration) {
    status = 'impossible';
  } else if (hazardRisk > 0 || uncertaintyRisk > 0 || route.currentAssist < -0.18 || Math.abs(route.crossCurrent ?? 0) > 0.22) {
    status = 'risky';
  } else if (timeSlack <= Math.max(0.5, interval * 0.25)) {
    status = 'tight';
  }

  return {
    status,
    anchor: {
      x: anchor.x,
      y: anchor.y,
      t: Number(anchor.t ?? 0),
      source: anchor.source ?? 'route',
      waypointIndex: Number.isInteger(anchor.waypointIndex) ? anchor.waypointIndex : null
    },
    targetTime,
    window: Number(marker.window ?? getWindowForTime(level, targetTime)),
    availableTime: round(availableTime),
    estimatedTravelTime: round(travelTime),
    timeSlack: round(timeSlack),
    estimatedEnergy: round(route.energy),
    remainingFuel: round(remainingFuel),
    consumedFuel: round(consumedFuel),
    distance: round(route.distance),
    currentAssist: round(route.currentAssist, 3),
    crossCurrent: round(route.crossCurrent, 3),
    routeRiskStatus: route.valid ? (hazardRisk ? 'hazard risk' : 'clear estimate') : 'blocked terrain',
    recommendedBackfillSteps,
    warnings: [...new Set(warnings)].slice(0, 5)
  };
}

function findMarkerAnchor({ agent, agentPlan, marker, level, mission, gameState }) {
  const markerTime = Number(marker.t ?? 0);
  const waypoints = (agentPlan.waypoints ?? [])
    .map((waypoint, index) => ({ ...waypoint, waypointIndex: index }))
    .filter((waypoint) => isFinitePoint(waypoint) && Number(waypoint.t ?? 0) <= markerTime)
    .sort((a, b) => Number(a.t ?? 0) - Number(b.t ?? 0));
  let anchor = getStartAnchor({ agent, agentPlan, mission, gameState });
  let cumulativeEnergy = 0;
  for (const waypoint of waypoints) {
    cumulativeEnergy = Number(waypoint.cumulativeEnergy ?? cumulativeEnergy);
    anchor = {
      x: Number(waypoint.x),
      y: Number(waypoint.y),
      t: Number(waypoint.estimatedArrivalTime ?? waypoint.t ?? anchor.t ?? 0),
      source: 'waypoint',
      waypointIndex: waypoint.waypointIndex,
      cumulativeEnergy
    };
  }
  return anchor;
}

function getStartAnchor({ agent, agentPlan, mission, gameState }) {
  const surfaced = (gameState?.surfacedAgents ?? []).find((candidate) => candidate.id === agent.id || candidate.agentId === agent.id);
  if (isFinitePoint(surfaced)) {
    return { x: Number(surfaced.x), y: Number(surfaced.y), t: Number(surfaced.t ?? 0), source: 'surfaced', cumulativeEnergy: Number(surfaced.energyUsed ?? 0) };
  }
  if (requiresDeploymentSelection(mission, agent.id) && !isFinitePoint(agentPlan.selectedStart)) {
    return { x: NaN, y: NaN, t: 0, source: 'missingStart', cumulativeEnergy: 0 };
  }
  const selectedStart = agentPlan.selectedStart ?? getSelectedStart(agent);
  const start = selectedStart ?? agent.start;
  return { x: Number(start?.x), y: Number(start?.y), t: 0, source: selectedStart ? 'selectedStart' : 'start', cumulativeEnergy: 0 };
}

function estimateTravelTime({ route, agent, driftGain }) {
  const distance = Number(route.distance ?? 0);
  const baseSpeed = Math.max(0.1, Number(agent?.maxSpeed ?? agent?.speed ?? 1));
  const assist = Number(route.currentAssist ?? 0) * Number(driftGain ?? 0.5);
  const crossPenalty = Math.min(0.35, Math.abs(Number(route.crossCurrent ?? 0)) * Number(driftGain ?? 0.5) * 0.2);
  const effectiveSpeed = Math.max(0.1, baseSpeed + assist - crossPenalty);
  return distance / effectiveSpeed;
}

function estimateHazardRisk(level, route) {
  const points = route?.points?.length ? route.points : [route?.lastValid].filter(Boolean);
  let risk = 0;
  for (const point of points) {
    const x = clampIndex(point.x, level?.world?.grid?.width ?? 1);
    const y = clampIndex(point.y, level?.world?.grid?.height ?? 1);
    if (Number(level?.layers?.hazards?.[y]?.[x] ?? 0) > 0) risk += 1;
  }
  return risk;
}

function estimateForecastUncertainty(frame, marker) {
  const confidence = frame?.confidence?.[clampIndex(marker.y, frame?.confidence?.length ?? 1)]?.[clampIndex(marker.x, frame?.confidence?.[0]?.length ?? 1)];
  return confidence !== undefined && Number(confidence) < 0.55 ? 1 : 0;
}

function impossible(message) {
  return {
    status: 'impossible',
    availableTime: 0,
    estimatedTravelTime: 0,
    timeSlack: 0,
    estimatedEnergy: 0,
    remainingFuel: 0,
    routeRiskStatus: 'unavailable',
    recommendedBackfillSteps: 0,
    warnings: [message]
  };
}

function round(value, digits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  const scale = 10 ** digits;
  return Math.round(number * scale) / scale;
}

function clampIndex(value, max) {
  return Math.max(0, Math.min(max - 1, Math.round(Number(value) || 0)));
}

function isFinitePoint(point) {
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y));
}
