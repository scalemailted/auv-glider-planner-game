import { getPlanningFrame } from '../sim/ChallengeMode.js';
import { getCommunicationRules } from '../sim/GliderComms.js';
import { getDriftRules } from '../sim/StochasticDrift.js';
import { getTimeConfig, getWindowForTime } from '../time/MissionTime.js';
import { estimateRouteEnergy } from './RoutePreview.js';
import { getSelectedStart, requiresDeploymentSelection } from '../deployment/DeploymentZones.js';

export function recomputeAgentWaypointTiming(state, agentId, options = {}) {
  const level = state?.level;
  const mission = state?.mission;
  const plan = state?.plan;
  const agent = mission?.agents?.find((candidate) => candidate.id === agentId);
  const agentPlan = plan?.agentPlans?.find((candidate) => candidate.agentId === agentId);
  if (!level || !mission || !agent || !agentPlan) return null;

  const timing = {
    agentId,
    warnings: [],
    anchors: []
  };
  let anchor = getStartAnchor(state, agent);
  if (!anchor) {
    timing.warnings.push('Choose a deployment cell first.');
    return timing;
  }
  let cumulativeEnergy = 0;
  let remainingFuel = Number(agent.battery ?? agent.maxBattery ?? 100);
  let previousArrival = anchor.t;
  let timelineInvalid = false;

  (agentPlan.waypoints ?? []).forEach((waypoint, index) => {
    const segment = estimateTemporalSegment({
      level,
      mission,
      agent,
      from: anchor,
      to: waypoint,
      challengeMode: state.challengeMode,
      revealTruth: state.ui?.revealTruth,
      forecastMemberId: state.ui?.forecastMemberId
    });
    const fromTime = timelineInvalid ? previousArrival : anchor.t;
    const arrival = fromTime + segment.estimatedTravelTime;
    cumulativeEnergy += segment.energy;
    remainingFuel -= segment.energy;
    const window = getWindowForTime(level, arrival);
    const warnings = [...segment.warnings];
    const invalidReasons = [];
    if (!segment.valid) invalidReasons.push('terrain');
    if (arrival > getTimeConfig(level).duration) {
      invalidReasons.push('time');
      warnings.push('Mission time exceeded');
    }
    if (remainingFuel < 0) warnings.push('Estimated fuel exceeded');
    if (remainingFuel < 0) invalidReasons.push('fuel');
    if (timelineInvalid) {
      invalidReasons.push('stale');
      warnings.push('Timing depends on an invalid earlier waypoint');
    }

    Object.assign(waypoint, {
      t: arrival,
      estimatedArrivalTime: arrival,
      window,
      segmentEnergy: round(segment.energy),
      cumulativeEnergy: round(cumulativeEnergy),
      remainingFuelEstimate: round(remainingFuel),
      currentAssist: round(segment.currentAssist, 3),
      segmentTravelTime: round(segment.estimatedTravelTime),
      estimatedTravelTime: round(segment.estimatedTravelTime),
      arrivalUncertainty: estimateArrivalUncertainty(segment),
      validity: {
        valid: invalidReasons.length === 0,
        reasons: invalidReasons
      },
      warnings
    });

    const waypointAnchor = {
      agentId,
      x: waypoint.x,
      y: waypoint.y,
      t: arrival,
      source: 'waypoint',
      waypointIndex: index,
      blocked: !segment.valid
    };
    timing.anchors.push(waypointAnchor);
    previousArrival = arrival;
    if (invalidReasons.length > 0 && !options.advanceThroughInvalid) {
      timelineInvalid = true;
      if (!segment.valid) timing.warnings.push(`Segment ${index + 1} blocked by land`);
      return;
    }
    anchor = waypointAnchor;
  });

  return timing;
}

export function estimateArrivalUncertainty(segment = {}) {
  const travelTime = Math.max(0, Number(segment.estimatedTravelTime ?? 0));
  const current = segment.current ?? [0, 0];
  const currentMagnitude = Math.hypot(Number(current[0] ?? 0), Number(current[1] ?? 0));
  const opposition = Math.max(0, -Number(segment.currentAssist ?? 0));
  const base = 0.28;
  const radiusX = base + travelTime * (0.08 + currentMagnitude * 0.18 + opposition * 0.1);
  const radiusY = base * 0.75 + travelTime * (0.045 + currentMagnitude * 0.1);
  const angle = currentMagnitude > 0.01
    ? Math.atan2(Number(current[1] ?? 0), Number(current[0] ?? 0))
    : Number(segment.directionAngle ?? 0);
  return {
    radiusX: round(Math.max(0.28, radiusX)),
    radiusY: round(Math.max(0.2, radiusY)),
    angle: round(angle, 3)
  };
}

export function recomputeAllWaypointTiming(state) {
  for (const agentPlan of state?.plan?.agentPlans ?? []) {
    recomputeAgentWaypointTiming(state, agentPlan.agentId);
  }
  return state?.plan ?? null;
}

export function estimateTemporalSegment({
  level,
  mission,
  agent,
  from,
  to,
  challengeMode = 'perfectKnowledge',
  revealTruth = false,
  forecastMemberId = null
}) {
  const t = Number(from?.t ?? 0);
  const frame = getPlanningFrame(level, t, { challengeMode, revealTruth, forecastMemberId });
  const driftGain = Number(getDriftRules(mission).driftGain);
  const energy = estimateRouteEnergy(from, to, level, agent, frame, {
    driftGain,
    energyPerCell: mission.physics?.energyPerCell ?? 1,
    mission
  });
  const dx = Number(to.x) - Number(from.x);
  const dy = Number(to.y) - Number(from.y);
  const distance = Math.hypot(dx, dy);
  const currentAssist = Number(energy.currentAssist ?? 0);
  const baseSpeed = Math.max(0.05, Number(agent.maxSpeed ?? 1));
  const effectiveSpeed = clamp(baseSpeed + driftGain * currentAssist, baseSpeed * 0.25, baseSpeed * 1.75);
  const estimatedTravelTime = distance / effectiveSpeed;
  const warnings = [];
  if (!energy.valid) warnings.push('Segment blocked by land');
  if (currentAssist < -0.18) warnings.push('Strong opposing current');
  if (exceedsNextSurface(t, t + estimatedTravelTime, mission)) warnings.push('Waypoint likely beyond next surfacing window');
  return {
    ...energy,
    distance,
    directionAngle: Math.atan2(dy, dx),
    effectiveSpeed,
    estimatedTravelTime,
    currentAssist,
    warnings
  };
}

export function getPlanningAnchorForAgent(state, agentId, options = {}) {
  const agent = state?.mission?.agents?.find((candidate) => candidate.id === agentId);
  const agentPlan = state?.plan?.agentPlans?.find((candidate) => candidate.agentId === agentId);
  if (!agent) return null;
  const selectedIndex = options.selectedIndex;
  const waypoints = agentPlan?.waypoints ?? [];
  const eligible = Number.isInteger(selectedIndex)
    ? waypoints.slice(0, selectedIndex + 1)
    : waypoints.filter((waypoint) => Number(waypoint.t ?? 0) <= Number(state?.planningTime ?? 0) + 1e-6);
  const lastReachable = [...eligible].reverse().find((waypoint) => !hasBlockedWarning(waypoint));
  if (lastReachable) {
    const index = waypoints.indexOf(lastReachable);
    return {
      agentId,
      x: lastReachable.x,
      y: lastReachable.y,
      t: Number(lastReachable.estimatedArrivalTime ?? lastReachable.t ?? 0),
      source: 'waypoint',
      waypointIndex: index
    };
  }
  return getStartAnchor(state, agent);
}

export function applyPlanningAnchor(state, agentId, options = {}) {
  const anchor = getPlanningAnchorForAgent(state, agentId, options);
  state.ui ??= {};
  state.ui.planningAnchor = anchor;
  return anchor;
}

function getStartAnchor(state, agent) {
  const surfaced = (state?.surfacedAgents ?? []).find((candidate) => candidate.id === agent.id);
  const selectedStart = getSelectedStart(agent);
  if (!surfaced && requiresDeploymentSelection(state?.mission, agent.id)) return null;
  return {
    agentId: agent.id,
    x: Number(surfaced?.x ?? selectedStart?.x ?? agent.start?.x),
    y: Number(surfaced?.y ?? selectedStart?.y ?? agent.start?.y),
    t: Number(surfaced?.t ?? 0),
    source: surfaced ? 'surfaced' : (agent.deployment?.mode === 'chooseFromZone' || agent.deployment?.mode === 'chooseFromZones' ? 'selectedStart' : 'start'),
    waypointIndex: null
  };
}

function exceedsNextSurface(startTime, arrivalTime, mission) {
  const rules = getCommunicationRules(mission);
  if (rules.surfaceInterval <= 0) return false;
  const nextSurface = Math.ceil((Number(startTime) + 0.0001) / rules.surfaceInterval) * rules.surfaceInterval;
  return Number(arrivalTime) > nextSurface + 1e-6;
}

function hasBlockedWarning(waypoint) {
  return (waypoint?.warnings ?? []).some((warning) => String(warning).toLowerCase().includes('blocked'));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value, digits = 2) {
  return Number(Number(value || 0).toFixed(digits));
}
