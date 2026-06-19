import { getCommunicationRules } from '../sim/GliderComms.js';
import { getTimeConfig, getWindowForTime } from '../time/MissionTime.js';
import { estimateTemporalSegment, getPlanningAnchorForAgent } from './TemporalWaypointPlanner.js';

export function canPlaceWaypoint(state, agentId, target, options = {}) {
  const level = state?.level;
  const mission = state?.mission;
  const agent = mission?.agents?.find((candidate) => candidate.id === agentId);
  if (!level || !mission || !agent || !target) {
    return { allowed: false, reason: 'missingContext', message: 'No active glider or mission context.', estimate: null };
  }

  const anchor = getPlanningAnchorForAgent(state, agentId);
  if (!anchor) {
    return { allowed: false, reason: 'deploymentStartMissing', message: 'Choose a deployment cell first.', estimate: null };
  }
  const segment = estimateTemporalSegment({
    level,
    mission,
    agent,
    from: anchor,
    to: target,
    challengeMode: state.challengeMode,
    revealTruth: state.ui?.revealTruth,
    forecastMemberId: state.ui?.forecastMemberId
  });
  const currentFuel = estimateRemainingFuelAtAnchor(state, agentId, agent, anchor);
  const remainingFuel = currentFuel - Number(segment.energy ?? 0);
  const arrivalTime = Number(anchor?.t ?? 0) + Number(segment.estimatedTravelTime ?? 0);
  const duration = getTimeConfig(level).duration;
  const surface = surfaceWindowEstimate(mission, Number(anchor?.t ?? 0), arrivalTime);
  const warnings = [...(segment.warnings ?? [])];
  const warningCodes = [];
  const beyondMissionWindow = arrivalTime > duration;
  if (beyondMissionWindow) {
    warnings.push('Waypoint ETA exceeds mission duration; it will be kept as a mission-window warning.');
    warningCodes.push('BEYOND_MISSION_WINDOW');
  }
  const estimate = {
    anchor,
    target,
    segment,
    arrivalTime,
    window: getWindowForTime(level, arrivalTime),
    currentFuel,
    remainingFuel,
    missionDuration: duration,
    missionDurationAtPlanning: duration,
    beyondMissionWindow,
    likelyReachedWithinWindow: !beyondMissionWindow,
    warningCodes,
    surface
  };

  if (!segment.valid) {
    return { allowed: false, reason: 'terrainBlocked', message: 'Route blocked by terrain.', estimate };
  }

  if (remainingFuel < 0) {
    return { allowed: false, reason: 'fuelExceeded', message: 'Fuel exhausted for this glider.', estimate };
  }
  if (surface.exceeded && surface.blocked) {
    return { allowed: false, reason: 'surfaceWindowExceeded', message: 'Waypoint unreachable before next surface.', estimate };
  }
  if (surface.exceeded) warnings.push('Waypoint likely beyond next surfacing window');
  const reason = beyondMissionWindow ? 'missionWindowWarning' : null;
  const message = beyondMissionWindow ? 'ETA exceeds mission duration; waypoint will remain pending or missed if time expires.' : '';
  return { allowed: true, commitAllowed: true, reason, message, warningCodes, estimate: { ...estimate, warnings, warningCodes } };
}

export function getPlacementDisabledReason(state, agentId) {
  const level = state?.level;
  const mission = state?.mission;
  const agent = mission?.agents?.find((candidate) => candidate.id === agentId);
  if (!level || !mission || !agent) return null;
  const anchor = getPlanningAnchorForAgent(state, agentId);
  if (!anchor) return 'Choose a deployment cell first';
  const duration = getTimeConfig(level).duration;
  const remainingFuel = estimateRemainingFuelAtAnchor(state, agentId, agent, anchor);
  if (Number(anchor?.t ?? 0) >= duration) return 'Mission time exhausted';
  if (remainingFuel <= 0) return 'Fuel exhausted';
  return null;
}

function estimateRemainingFuelAtAnchor(state, agentId, agent, anchor) {
  const waypoints = state?.plan?.agentPlans?.find((plan) => plan.agentId === agentId)?.waypoints ?? [];
  const waypoint = Number.isInteger(anchor?.waypointIndex) ? waypoints[anchor.waypointIndex] : null;
  const value = Number(waypoint?.remainingFuelEstimate);
  return Number.isFinite(value) ? value : Number(agent.battery ?? agent.maxBattery ?? 100);
}

function surfaceWindowEstimate(mission, startTime, arrivalTime) {
  const rules = getCommunicationRules(mission);
  if (rules.surfaceInterval <= 0) return { exceeded: false, blocked: false, nextSurface: null };
  const nextSurface = Math.ceil((startTime + 0.0001) / rules.surfaceInterval) * rules.surfaceInterval;
  const exceeded = arrivalTime > nextSurface + 1e-6;
  const blocked = Boolean(mission.rules?.communication?.blockPlanningBeyondSurface);
  return { exceeded, blocked, nextSurface };
}
