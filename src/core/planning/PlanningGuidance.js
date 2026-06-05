import { getPlanningFrame } from '../sim/ChallengeMode.js';
import { getCommunicationRules } from '../sim/GliderComms.js';
import { getDriftRules } from '../sim/StochasticDrift.js';
import { getTimeConfig, getWindowEndTime } from '../time/MissionTime.js';
import { clipLineToTerrain, estimateRouteEnergy } from './RoutePreview.js';
import { getSelectedStart } from '../deployment/DeploymentZones.js';
import { isCellNavigable } from './Navigability.js';
import { sampleCurrentVector } from '../currents/CurrentFieldSampler.js';

export function buildPlanningGuidance({
  level,
  mission,
  plan,
  selectedAgentId,
  selectedWaypoint = null,
  selectedWindow = 0,
  time = 0,
  challengeMode = 'perfectKnowledge',
  revealTruth = false,
  forecastMemberId = null,
  surfacedAgents = [],
  planningAnchor = null,
  hoverCell = null,
  settings = {}
} = {}) {
  if (!level || !mission || !selectedAgentId || settings.showGuidance === false) return null;
  const agent = mission.agents?.find((candidate) => candidate.id === selectedAgentId);
  if (!agent) return null;

  const frame = getPlanningFrame(level, time, { challengeMode, revealTruth, forecastMemberId });
  const origin = getGuidanceOrigin({ agent, plan, selectedWaypoint, selectedWindow, surfacedAgents, planningAnchor });
  if (!isFinitePoint(origin)) return null;
  const current = sampleCurrent(frame, level, origin.x, origin.y);
  const duration = Math.max(0.1, getNextSurfaceDuration(level, mission, time, selectedWindow));
  const driftGain = getDriftRules(mission).driftGain;
  const confidence = sampleConfidence(frame, level, origin.x, origin.y);
  const ensembleDisagreement = sampleEnsembleCurrentDisagreement(level, origin.x, origin.y, time);
  const reachable = buildReachableCells(level, mission, agent, origin, current, duration, driftGain);
  const reachableRegion = buildReachableRegion(level, agent, origin, current, duration, driftGain, confidence, ensembleDisagreement);
  const previewTarget = hoverCell && isCellNavigable(level, mission, hoverCell.x, hoverCell.y).ok
    ? hoverCell
    : getNextWaypoint(plan, selectedAgentId, selectedWindow) ?? null;
  const routeClip = previewTarget ? clipLineToTerrain(origin, previewTarget, level, { mission }) : null;
  const routeEnergy = previewTarget ? estimateRouteEnergy(origin, previewTarget, level, agent, frame, {
    driftGain,
    energyPerCell: mission.physics?.energyPerCell ?? 1,
    mission
  }) : null;
  const coneTarget = routeClip?.valid === false ? routeClip.lastValid : previewTarget;
  const driftCone = previewTarget ? buildDriftConeCorridor({
    origin,
    target: coneTarget,
    routeEnergy,
    current,
    confidence,
    ensembleDisagreement,
    driftGain,
    maxSpeed: agent.maxSpeed ?? 1,
    timeToSurface: duration,
    grid: level.world.grid
  }) : null;
  const previewPath = routeClip?.points?.length
    ? routeClip.points
    : buildPreviewPath(origin, previewTarget, current, duration, driftGain, agent.maxSpeed ?? 1);
  const predictedSurface = predictSurfacePosition({
    origin,
    previewTarget,
    current,
    duration: Math.max(0.1, getNextSurfaceDuration(level, mission, time, selectedWindow)),
    driftGain,
    maxSpeed: agent.maxSpeed ?? 1,
    grid: level.world.grid
  });

  return {
    source: frame?.source ?? 'truth',
    origin,
    localCurrent: current,
    confidence,
    ensembleDisagreement,
    driftCone,
    arrivalPreview: driftCone?.arrivalOval ?? null,
    arrivalOvals: buildCommittedArrivalOvals(plan, selectedAgentId),
    reachableCells: settings.showReachable === false ? [] : reachable,
    reachableRegion: settings.showReachable === false ? null : reachableRegion,
    predictedSurface: settings.showSurfacing === false ? null : predictedSurface,
    previewPath: settings.showDrift === false ? [] : previewPath,
    routeClip,
    routeEnergy: settings.showEnergy === false ? null : routeEnergy,
    previewTarget,
    showDrift: settings.showDrift !== false,
    showReachable: settings.showReachable !== false,
    showSurfacing: settings.showSurfacing !== false,
    debug: makeGuidanceDebug({ selectedAgentId, agent, origin, reachableRegion, previewTarget })
  };
}

function buildDriftConeCorridor({ origin, target, routeEnergy, current, confidence, ensembleDisagreement = 0, driftGain, maxSpeed, timeToSurface, grid }) {
  if (!target) return null;
  const dx = Number(target.x) - Number(origin.x);
  const dy = Number(target.y) - Number(origin.y);
  const distance = Math.hypot(dx, dy);
  if (distance <= 0.001) return null;
  const nx = dx / distance;
  const ny = dy / distance;
  const px = -ny;
  const py = nx;
  const cx = Number(current?.[0] ?? 0);
  const cy = Number(current?.[1] ?? 0);
  const currentMagnitude = Math.hypot(cx, cy);
  const assist = cx * nx + cy * ny;
  const cross = cx * px + cy * py;
  const speed = Math.max(0.08, Number(maxSpeed ?? 1));
  const gain = Number(driftGain ?? 0.5);
  const currentRatio = currentMagnitude / speed;
  const effectiveSpeed = Math.max(speed * 0.18, speed + gain * assist);
  const travelTime = distance / effectiveSpeed;
  const confidencePenalty = 1 - Math.max(0, Math.min(1, Number(confidence ?? 1)));
  const disagreement = Math.max(0, Number(ensembleDisagreement ?? 0));
  const horizon = Math.max(0.1, Number(timeToSurface ?? travelTime));
  const downstreamShift = Math.min(horizon, travelTime) * gain;
  const expectedCenter = clampPoint({
    x: target.x + cx * downstreamShift * 0.55,
    y: target.y + cy * downstreamShift * 0.55
  }, grid);
  const crossShift = cross * gain * Math.min(horizon, travelTime) * 0.42;
  const shiftedCenter = clampPoint({
    x: expectedCenter.x + px * crossShift,
    y: expectedCenter.y + py * crossShift
  }, grid);
  const opposingPenalty = Math.max(0, -assist) / speed;
  const assistBonus = Math.max(0, assist) / speed;
  const startWidth = 0.12 + Math.min(0.18, currentRatio * 0.08);
  const endWidth = Math.max(
    0.35,
    0.24
      + travelTime * (0.08 + Math.abs(cross) * gain * 0.32)
      + horizon * (0.025 + confidencePenalty * 0.08 + disagreement * 0.06)
      + opposingPenalty * 0.45
      + currentRatio * 0.18
  );
  const lengthScale = Math.max(0.35, 1 + assistBonus * 0.35 - opposingPenalty * 0.5);
  const end = clampPoint({
    x: origin.x + (shiftedCenter.x - origin.x) * lengthScale,
    y: origin.y + (shiftedCenter.y - origin.y) * lengthScale
  }, grid);
  const warningSeverity = Math.max(opposingPenalty, confidencePenalty * 0.7, disagreement * 0.45);
  const warnings = [];
  if (assist < -speed * 0.2) warnings.push('May not reach before surface');
  if (Math.abs(cross) > speed * 0.18) warnings.push('Cross-current drift');
  if (confidencePenalty > 0.35 || disagreement > 0.35) warnings.push('High uncertainty');
  const polygon = [
    { x: origin.x + px * startWidth, y: origin.y + py * startWidth },
    { x: end.x + px * endWidth, y: end.y + py * endWidth },
    { x: end.x - px * endWidth, y: end.y - py * endWidth },
    { x: origin.x - px * startWidth, y: origin.y - py * startWidth }
  ].map((point) => clampPoint(point, grid));
  return {
    origin,
    expectedCenter: shiftedCenter,
    target: end,
    polygon,
    travelTime,
    currentAlongHeading: assist,
    currentCrossHeading: cross,
    currentRatio,
    confidence,
    ensembleDisagreement: disagreement,
    currentAssistLabel: classifyCurrentAssist({ assist, cross, speed, confidencePenalty, disagreement }),
    energyModifier: Math.max(0.35, 1 - assist * gain * 0.55 + Math.abs(cross) * gain * 0.22 + confidencePenalty * 0.08),
    feasibility: routeEnergy?.valid === false || effectiveSpeed < speed * 0.3 || travelTime > horizon * 1.4 ? 'warning' : 'likely',
    warnings,
    warningSeverity,
    blocked: routeEnergy?.valid === false || warningSeverity > 0.95,
    arrivalOval: {
      x: shiftedCenter.x,
      y: shiftedCenter.y,
      radiusX: endWidth * (1.0 + confidencePenalty * 0.55 + disagreement * 0.35),
      radiusY: Math.max(0.22, endWidth * (0.46 + Math.abs(cross) * 0.22)),
      angle: Math.atan2(ny + cy * gain * 0.25, nx + cx * gain * 0.25),
      preview: true
    }
  };
}

function buildCommittedArrivalOvals(plan, selectedAgentId) {
  const waypoints = plan?.agentPlans?.find((candidate) => candidate.agentId === selectedAgentId)?.waypoints ?? [];
  return waypoints.map((waypoint, index) => {
    const uncertainty = waypoint.arrivalUncertainty ?? {};
    return {
      x: waypoint.x,
      y: waypoint.y,
      radiusX: Number(uncertainty.radiusX ?? Math.max(0.32, 0.35 + index * 0.08)),
      radiusY: Number(uncertainty.radiusY ?? Math.max(0.22, 0.24 + index * 0.05)),
      angle: Number(uncertainty.angle ?? 0),
      active: index === waypoints.length - 1,
      index
    };
  });
}

function buildReachableRegion(level, agent, origin, current, duration, driftGain, confidence = 1, ensembleDisagreement = 0) {
  const maxSpeed = agent.maxSpeed ?? 1;
  const radius = Math.max(0.5, maxSpeed * duration);
  const driftX = current[0] * driftGain * duration;
  const driftY = current[1] * driftGain * duration;
  const magnitude = Math.hypot(driftX, driftY);
  const confidencePenalty = 1 - Math.max(0, Math.min(1, Number(confidence ?? 1)));
  const uncertaintyScale = 1 + confidencePenalty * 0.28 + Math.max(0, Number(ensembleDisagreement ?? 0)) * 0.18;
  return {
    center: {
      x: origin.x,
      y: origin.y
    },
    radiusX: (radius + magnitude * 0.45) * uncertaintyScale,
    radiusY: Math.max(0.35, radius * 0.62 * uncertaintyScale),
    angle: magnitude > 0.01 ? Math.atan2(driftY, driftX) : 0
  };
}

function getGuidanceOrigin({ agent, plan, selectedWaypoint, selectedWindow, surfacedAgents, planningAnchor }) {
  if (planningAnchor?.agentId === agent.id && isFinitePoint(planningAnchor)) {
    return {
      x: planningAnchor.x,
      y: planningAnchor.y,
      label: planningAnchor.source ?? 'planning anchor'
    };
  }
  const surfaced = surfacedAgents.find((candidate) => candidate.id === agent.id);
  if (isFinitePoint(surfaced)) return { x: surfaced.x, y: surfaced.y, label: 'surfaced' };

  const selectedStart = getSelectedStart(agent);
  if ((agent.deployment?.mode === 'chooseFromZone' || agent.deployment?.mode === 'chooseFromZones') && !selectedStart) return null;

  if (selectedWaypoint?.agentId === agent.id) {
    const wp = plan?.agentPlans
      ?.find((agentPlan) => agentPlan.agentId === agent.id)
      ?.waypoints?.[selectedWaypoint.index];
    if (wp && isFinitePoint(wp)) return { x: wp.x, y: wp.y, label: 'selected waypoint' };
  }

  const agentPlan = plan?.agentPlans?.find((candidate) => candidate.agentId === agent.id);
  const previous = [...(agentPlan?.waypoints ?? [])]
    .filter((waypoint) => Number(waypoint.window ?? 0) <= selectedWindow)
    .at(-1);
  if (isFinitePoint(previous)) return { x: previous.x, y: previous.y, label: 'planned waypoint' };

  if (selectedStart) return { x: selectedStart.x, y: selectedStart.y, label: 'selected start' };

  if (isFinitePoint(agent.start)) return { x: agent.start.x, y: agent.start.y, label: 'start' };
  return null;
}

function getNextWaypoint(plan, agentId, selectedWindow) {
  const waypoints = plan?.agentPlans?.find((candidate) => candidate.agentId === agentId)?.waypoints ?? [];
  return waypoints.find((waypoint) => Number(waypoint.window ?? 0) >= selectedWindow) ?? waypoints.at(-1) ?? null;
}

function buildReachableCells(level, mission, agent, origin, current, duration, driftGain) {
  const maxSpeed = agent.maxSpeed ?? 1;
  const maxDistance = Math.max(0.5, maxSpeed * duration);
  const driftX = current[0] * driftGain * duration;
  const driftY = current[1] * driftGain * duration;
  const cells = [];

  for (let y = 0; y < level.world.grid.height; y += 1) {
    for (let x = 0; x < level.world.grid.width; x += 1) {
      if (!isCellNavigable(level, mission, x, y).ok) continue;
      const routeClip = clipLineToTerrain(origin, { x, y }, level, { mission });
      if (routeClip.valid === false) continue;
      const rx = x - origin.x;
      const ry = y - origin.y;
      const projectedX = rx - driftX * 0.28;
      const projectedY = ry - driftY * 0.28;
      const distance = Math.hypot(projectedX, projectedY);
      if (distance <= maxDistance) {
        cells.push({ x, y, strength: 1 - distance / maxDistance });
      }
    }
  }
  return cells;
}

function buildPreviewPath(origin, target, current, duration, driftGain, maxSpeed) {
  if (!target) return [];
  const steps = 8;
  const path = [{ x: origin.x, y: origin.y }];
  let x = origin.x;
  let y = origin.y;
  const dt = duration / steps;

  for (let i = 0; i < steps; i += 1) {
    const dx = target.x - x;
    const dy = target.y - y;
    const d = Math.hypot(dx, dy) || 1;
    x += (dx / d * maxSpeed + current[0] * driftGain) * dt;
    y += (dy / d * maxSpeed + current[1] * driftGain) * dt;
    path.push({ x, y });
  }
  return path;
}

function predictSurfacePosition({ origin, previewTarget, current, duration, driftGain, maxSpeed, grid }) {
  const target = previewTarget ?? { x: origin.x + current[0], y: origin.y + current[1] };
  const path = buildPreviewPath(origin, target, current, duration, driftGain, maxSpeed);
  return clampPoint(path.at(-1) ?? origin, grid);
}

function getNextSurfaceDuration(level, mission, time, selectedWindow) {
  const rules = getCommunicationRules(mission);
  if (rules.surfaceInterval <= 0) return getTimeConfig(level).planningWindow;
  const nextSurface = Math.ceil((time + 0.0001) / rules.surfaceInterval) * rules.surfaceInterval;
  return Math.max(0.1, Math.min(getWindowEndTime(level, selectedWindow) - time, nextSurface - time));
}

function sampleCurrent(frame, level, x, y) {
  return sampleCurrentVector({ frame, level, x, y });
}

function sampleConfidence(frame, level, x, y) {
  const cx = clampIndex(x, level.world.grid.width);
  const cy = clampIndex(y, level.world.grid.height);
  return Math.max(0, Math.min(1, frame?.confidence?.[cy]?.[cx] ?? 1));
}

function sampleEnsembleCurrentDisagreement(level, x, y, time = 0) {
  const members = level?.layers?.forecasts ?? [];
  if (members.length < 2) return 0;
  const cx = clampIndex(x, level.world.grid.width);
  const cy = clampIndex(y, level.world.grid.height);
  const dt = Number(level?.world?.time?.dt ?? 1) || 1;
  const frameIndex = Math.max(0, Math.round(Number(time ?? 0) / dt));
  const currents = members
    .map((member) => member.frames?.[Math.min(member.frames.length - 1, frameIndex)]?.current?.[cy]?.[cx])
    .filter((current) => Array.isArray(current));
  if (currents.length < 2) return 0;
  const meanX = currents.reduce((sum, current) => sum + Number(current[0] ?? 0), 0) / currents.length;
  const meanY = currents.reduce((sum, current) => sum + Number(current[1] ?? 0), 0) / currents.length;
  const variance = currents.reduce((sum, current) => {
    const dx = Number(current[0] ?? 0) - meanX;
    const dy = Number(current[1] ?? 0) - meanY;
    return sum + dx * dx + dy * dy;
  }, 0) / currents.length;
  return Math.min(1.5, Math.sqrt(variance));
}

function classifyCurrentAssist({ assist, cross, speed, confidencePenalty, disagreement }) {
  if (confidencePenalty > 0.4 || disagreement > 0.35) return 'High uncertainty';
  if (assist > speed * 0.12 && Math.abs(cross) < speed * 0.18) return 'Current helps';
  if (assist < -speed * 0.12) return 'Against current';
  if (Math.abs(cross) > speed * 0.14) return 'Cross-current drift';
  return 'Guidance estimate';
}

function clampIndex(value, max) {
  return Math.max(0, Math.min(max - 1, Math.floor(value)));
}

function clampPoint(point, grid) {
  return {
    x: Math.max(0, Math.min(grid.width - 1, point.x)),
    y: Math.max(0, Math.min(grid.height - 1, point.y))
  };
}

function isFinitePoint(point) {
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y));
}

function makeGuidanceDebug({ selectedAgentId, agent, origin, reachableRegion, previewTarget }) {
  return {
    selectedAgentId,
    deploymentMode: agent?.deployment?.mode ?? 'fixedStart',
    selectedStart: agent?.deployment?.selectedStart ?? null,
    planningAnchor: origin ? { x: origin.x, y: origin.y, label: origin.label } : null,
    reachabilityCenter: reachableRegion?.center ?? null,
    previewTarget: previewTarget ? { x: previewTarget.x, y: previewTarget.y } : null,
    overlayMode: origin ? 'guidance' : 'deploymentSelection'
  };
}
