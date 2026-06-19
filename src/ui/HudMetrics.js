import { formatMissionTime, getWindowForTime } from '../core/time/MissionTime.js';
import { estimateSelectedGliderPlan } from '../core/planning/RouteEnergy.js';

export function getMissionSummaryMetrics(state, engine = null, result = null) {
  const summary = result?.summary ?? engine?.getSummary?.() ?? {};
  const time = engine?.t ?? result?.summary?.elapsedTime ?? state.planningTime ?? 0;
  return {
    totalScore: numberOr(summary.finalScore, estimatePlanScore(state)),
    totalRoiCollected: numberOr(summary.sampleScore, 0),
    totalExpectedValue: numberOr(summary.expectedSampleScore, null),
    totalRealizedValue: numberOr(summary.realizedSampleScore ?? summary.realizedTruthValue, null),
    totalScienceScore: numberOr(summary.depthScienceScore ?? summary.depthScience?.totalScienceScore, null),
    scoreProfileId: summary.scoreProfileId ?? summary.depthScience?.scoreProfileId ?? null,
    verticalCoverage: summary.verticalCoverage ?? summary.depthScience?.verticalCoverage ?? null,
    totalEnergyUsed: numberOr(summary.energyUsed, estimatePlanEnergy(state)),
    hazardsHit: numberOr(summary.hazardsHit, 0),
    mobileHazardsHit: numberOr(summary.mobileHazardsHit, 0),
    missionTime: time,
    missionTimeLabel: formatMissionTime(state.level, time),
    planningWindow: getWindowForTime(state.level, time),
    phase: engine ? (engine.complete ? 'complete' : engine.running ? 'simulation' : 'paused') : result ? 'debrief' : 'planning',
    challengeMode: state.challengeMode ?? 'perfectKnowledge',
    stochasticSeed: state.stochastic?.enabled ? state.stochastic.seed : null
  };
}

export function getAgentPerformanceRows(state, engine = null, result = null) {
  const agents = engine?.agents ?? state.mission?.agents ?? [];
  const resultAgents = result?.frames?.at?.(-1)?.agents ?? [];
  const resultStats = result ? buildResultAgentStats(result) : new Map();
  const rows = agents.map((agent) => {
    const planningForecast = !engine && !result ? estimateSelectedGliderPlan(state, { agentId: agent.id, includeHover: false }) : null;
    const runtime = engine?.agents?.find((candidate) => candidate.id === agent.id)
      ?? resultAgents.find((candidate) => candidate.id === agent.id)
      ?? agent;
    const planWaypoints = (state.plan?.agentPlans ?? []).find((plan) => plan.agentId === agent.id)?.waypoints ?? [];
    const stats = resultStats.get(agent.id) ?? {};
    const completed = runtime.completedWaypoints?.length ?? stats.completedWaypoints ?? 0;
    const missed = runtime.missedWaypoints?.length ?? stats.missedWaypoints ?? 0;
    const hazards = runtime.hazardsHit ?? stats.hazardsHit ?? 0;
    const sample = runtime.sampleScore ?? stats.sampleScore ?? planningForecast?.expectedValue ?? 0;
    const expected = runtime.expectedSampleScore ?? stats.expectedSampleScore ?? planningForecast?.expectedValue ?? null;
    const energy = runtime.energyUsed ?? planningForecast?.totalEstimatedEnergy ?? 0;
    const score = computeAgentPerformanceScore({ sample, energy, hazards, missed });
    return {
      agentId: agent.id,
      label: agent.label ?? agent.name ?? agent.id,
      score,
      roiCollected: sample,
      expectedValue: expected,
      realizedValue: sample,
      energyUsed: energy,
      hazardsHit: hazards,
      completedWaypoints: completed,
      missedWaypoints: missed,
      activeWaypoint: `${Math.min(Number(runtime.currentWaypointIndex ?? 0) + 1, planWaypoints.length || 1)}/${planWaypoints.length}`,
      batteryRemaining: planningForecast ? planningForecast.remainingFuel : (runtime.battery ?? agent.battery ?? null),
      status: getAgentStatus(runtime, engine, result),
      isSelected: agent.id === state.selectedAgentId
    };
  });
  return rows
    .sort((a, b) => b.score - a.score)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function computeAgentPerformanceScore({ sample = 0, energy = 0, hazards = 0, missed = 0 }) {
  return sample * 100 - energy * 0.05 - hazards * 10 - missed * 5;
}

export function formatHudMetric(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'N/A';
  return Number(value).toFixed(digits).replace(/\.0$/, '');
}

function getAgentStatus(agent, engine, result) {
  if (agent.status) return normalizeStatus(agent.status);
  if (engine?.complete || result) return 'complete';
  if (engine) return agent.commsState ?? 'active';
  return 'planning';
}

function normalizeStatus(status) {
  if (status === 'batteryDepleted') return 'disabled';
  if (status === 'ready') return 'planning';
  return status;
}

function estimatePlanScore(state) {
  return (state.plan?.agentPlans ?? []).reduce((sum, plan) => sum + (plan.waypoints?.length ?? 0) * 5, 0);
}

function estimatePlanEnergy(state) {
  const agents = state.mission?.agents ?? [];
  return (state.plan?.agentPlans ?? []).reduce((sum, plan) => {
    const agent = agents.find((candidate) => candidate.id === plan.agentId);
    let previous = { x: agent?.start?.x ?? 0, y: agent?.start?.y ?? 0 };
    for (const waypoint of plan.waypoints ?? []) {
      sum += Math.hypot(Number(waypoint.x) - previous.x, Number(waypoint.y) - previous.y);
      previous = waypoint;
    }
    return sum;
  }, 0);
}

function numberOr(value, fallback) {
  return value === null || value === undefined || Number.isNaN(Number(value)) ? fallback : Number(value);
}

function buildResultAgentStats(result) {
  const stats = new Map();
  for (const event of result.events ?? []) {
    if (!event.agentId) continue;
    const row = stats.get(event.agentId) ?? {
      sampleScore: 0,
      expectedSampleScore: 0,
      hazardsHit: 0,
      completedWaypoints: 0,
      missedWaypoints: 0
    };
    if (event.type === 'sample') {
      row.sampleScore += Number(event.value ?? event.rewardValue ?? 0);
      row.expectedSampleScore += Number(event.expectedValue ?? event.value ?? 0);
    }
    if (event.type === 'hazard' || event.type === 'mobileHazard') row.hazardsHit += 1;
    if (event.type === 'waypointReached') row.completedWaypoints += 1;
    if (String(event.type ?? '').toLowerCase().includes('waypoint') && String(event.type ?? '').toLowerCase().includes('miss')) {
      row.missedWaypoints += 1;
    }
    stats.set(event.agentId, row);
  }
  return stats;
}
