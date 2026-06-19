import { getDeploymentZoneForAgent, getDeploymentZonesForAgent, getSelectedStart, requiresDeploymentSelection } from '../core/deployment/DeploymentZones.js';
import { estimateSelectedGliderPlan } from '../core/planning/RouteEnergy.js';
import { labelReason } from '../core/planning/StopReasonSummarizer.js';
import { formatMissionTime, getWindowForTime } from '../core/time/MissionTime.js';
import { formatHudMetric } from './HudMetrics.js';

export function buildTopHudState(state, context = {}) {
  if (!state?.level || !state?.mission) {
    return {
      className: 'idle',
      chips: [
        chip('glider', 'No mission', { primary: true, title: 'No mission loaded.' }),
        chip('phase', phaseLabel(state), { primary: true, title: `Mission phase: ${phaseLabel(state)}.` }),
        chip('status', 'Awaiting launch', { title: 'Choose or generate a mission from the Mission Console.' })
      ]
    };
  }
  if (context.engine || state.mode === 'simulation') return buildSimulationHudState(state, context);
  return buildPlanningHudState(state, context);
}

function buildPlanningHudState(state, context = {}) {
  const forecast = estimateSelectedGliderPlan(state, { includeHover: context.includeHover !== false });
  if (!forecast) return buildFallbackMissionHudState(state);

  const agent = state.mission.agents?.find((candidate) => candidate.id === forecast.agentId);
  const warnings = [...(forecast.warnings ?? [])];
  const choosingDeployment = requiresDeploymentSelection(state.mission, forecast.agentId);
  const selectedStart = getSelectedStart(agent);
  if (choosingDeployment && !selectedStart) warnings.unshift('Choose deployment cell first.');
  const warningCount = new Set(warnings.filter(Boolean)).size;
  const placement = choosingDeployment ? 'Deploy' : placementModeLabel(state.ui?.placementMode);
  const deploymentTitle = deploymentTooltip(state, forecast.agentId, agent);
  const selectedStartTitle = selectedStart
    ? `Selected start: (${selectedStart.x}, ${selectedStart.y})`
    : 'No deployment cell selected.';

  return {
    className: 'planning',
    chips: [
      chip('glider', shortGliderLabel(forecast.label, forecast.agentId), { primary: true, title: `Selected active glider: ${forecast.label}.` }),
      chip('phase', 'Planning', { primary: true, title: 'Mission phase: Planning. Add or edit waypoints before execution.' }),
      chip('mode', placement, { title: placementModeTitle(state.ui?.placementMode, choosingDeployment) }),
      chip('time', `T ${forecast.selectedTimeLabel}`, { title: `Mission elapsed planning time: ${forecast.selectedTimeLabel}.` }),
      chip('window', `W${forecast.selectedWindow}`, { title: `Current surfacing / planning window: Window ${forecast.selectedWindow}.` }),
      chip('fuel', `Fuel ${formatHudMetric(Math.max(0, forecast.remainingFuel))}/${formatHudMetric(forecast.startingFuel)}`, {
        tone: forecast.remainingFuel < 0 ? 'bad' : '',
        title: `Estimated remaining fuel for the selected glider: ${formatHudMetric(Math.max(0, forecast.remainingFuel))} out of ${formatHudMetric(forecast.startingFuel)}.`
      }),
      chip('score', `EV ${formatHudMetric(forecast.expectedValue, 1)}`, { title: `Expected route value based on current ROI/probability mode: ${formatHudMetric(forecast.expectedValue, 1)}.` }),
      chip('waypoints', `WP ${forecast.waypointCount}`, { title: `Waypoints planned for the selected glider: ${forecast.waypointCount}.` }),
      chip('alerts', `! ${warningCount}`, {
        tone: warningCount ? 'warn' : 'ok',
        title: warningCount ? `${warningCount} active route or mission warning(s). See Mission Console for details.\n${uniqueWarnings(warnings).join('\n')}` : 'No active planning warnings.'
      }),
      state.missionOptions?.ignoreUpdateEvents ? chip('updates', 'Updates ignored', {
        tone: 'warn',
        priority: 6,
        title: 'Continuous run mode: surfacing/update windows will not pause simulation.'
      }) : null,
      chip('deployment', deploymentLabel(state, forecast.agentId, agent), { priority: 8, title: deploymentTitle }),
      chip('start', selectedStart ? `Start ${selectedStart.x},${selectedStart.y}` : 'Start ?', {
        priority: 8,
        tone: choosingDeployment && !selectedStart ? 'bad' : '',
        title: selectedStartTitle
      })
    ].filter(Boolean)
  };
}

function buildSimulationHudState(state, context = {}) {
  const engine = context.engine;
  const summary = engine?.getSummary?.() ?? context.result?.summary ?? {};
  const routeFailure = engine?.routeFailureDecision ?? state.routeFailureDecision;
  const surfaceDecision = engine?.awaitingSurfaceDecision ?? state.surfaceDecision;
  const agentId = routeFailure?.agentId ?? surfaceDecision?.agentId ?? surfaceDecision?.agents?.[0]?.agentId ?? state.selectedAgentId ?? state.mission.agents?.[0]?.id;
  const agent = (engine?.agents ?? state.mission.agents ?? []).find((candidate) => candidate.id === agentId) ?? {};
  const planWaypoints = (state.plan?.agentPlans ?? []).find((plan) => plan.agentId === agentId)?.waypoints ?? [];
  const time = Number(engine?.t ?? summary.elapsedTime ?? state.simulationTime ?? state.planningTime ?? 0);
  const phase = simulationPhase(engine, state);
  const warningCount = simulationAlertCount(engine, summary, routeFailure, surfaceDecision);
  const stars = summary.priorityTargets
    ? `${summary.priorityTargets.captured ?? 0}/${summary.priorityTargets.available ?? 0}`
    : null;

  const chips = [
    chip('glider', shortGliderLabel(agent.label ?? agent.name ?? agent.id ?? agentId, agentId), { primary: true, title: `Selected active glider: ${agent.label ?? agent.name ?? agent.id ?? agentId}.` }),
    chip('phase', phase.label, { primary: true, tone: phase.tone, title: phase.title }),
    chip('time', `T ${formatMissionTime(state.level, time)}`, { title: `Mission elapsed simulation time: ${formatMissionTime(state.level, time)}.` }),
    chip('window', `W${getWindowForTime(state.level, time)}`, { title: `Current mission window: Window ${getWindowForTime(state.level, time)}.` }),
    chip('fuel', `Fuel ${formatHudMetric(agent.battery ?? batteryFromMission(state, agentId))}`, { title: `Current fuel for the selected glider: ${formatHudMetric(agent.battery ?? batteryFromMission(state, agentId))}.` }),
    chip('score', `Score ${formatHudMetric(summary.finalScore ?? summary.sampleScore ?? 0)}`, { title: `Current mission score: ${formatHudMetric(summary.finalScore ?? summary.sampleScore ?? 0)}.` }),
    summary.depthScienceScore !== undefined ? chip('science', `Sci ${formatHudMetric(summary.depthScienceScore ?? 0)}`, { priority: 5, title: `Depth-aware science score (${summary.scoreProfileId ?? 'profile unknown'}): ${formatHudMetric(summary.depthScienceScore ?? 0)}.` }) : null,
    chip('waypoints', `WP ${formatActiveWaypoint(agent, planWaypoints)}`, { title: `Active waypoint progress for the selected glider: ${formatActiveWaypoint(agent, planWaypoints)}.` }),
    chip('samples', `Samp ${formatHudMetric(summary.sampledCells ?? summary.sampleScore ?? 0)}`, { priority: 6, title: `Samples collected or sampled value: ${formatHudMetric(summary.sampledCells ?? summary.sampleScore ?? 0)}.` }),
    chip('hazards', `Haz ${Number(summary.hazardsHit ?? 0) + Number(summary.mobileHazardsHit ?? 0)}`, { priority: 6, title: `Hazards hit: ${Number(summary.hazardsHit ?? 0) + Number(summary.mobileHazardsHit ?? 0)} total static and mobile hazards.` }),
    stars ? chip('stars', `Stars ${stars}`, { priority: 6, title: `Gold Star priority targets captured: ${stars}.` }) : null,
    state.missionOptions?.ignoreUpdateEvents ? chip('updates', 'Updates ignored', {
      tone: 'warn',
      priority: 6,
      title: 'Continuous run mode: surfacing/update windows are ignored.'
    }) : null,
    chip('alerts', `! ${warningCount}`, { tone: warningCount ? 'warn' : 'ok', title: simulationAlertTitle(engine, summary, routeFailure, surfaceDecision) })
  ].filter(Boolean);

  if (surfaceDecision) {
    return {
      className: 'simulation surfaced',
      chips: [
        chips[0],
        chip('phase', 'Surfaced', { primary: true, tone: 'warn', title: 'Simulation is paused at a surface decision.' }),
        chip('time', `T ${formatMissionTime(state.level, time)}`, { title: `Mission elapsed time at surfacing: ${formatMissionTime(state.level, time)}.` }),
        chip('fuel', `Fuel ${formatHudMetric(agent.battery ?? batteryFromMission(state, agentId))}`, { title: `Fuel remaining at surfacing: ${formatHudMetric(agent.battery ?? batteryFromMission(state, agentId))}.` }),
        chip('status', 'Awaiting instructions', { title: 'Continue, replan, export, import, or finish from the decision prompt.' })
      ]
    };
  }
  if (routeFailure?.active) {
    return {
      className: 'simulation failure',
      chips: [
        chips[0],
        chip('phase', 'Failure', { primary: true, tone: 'bad', title: 'Route failure decision required.' }),
        chip('time', `T ${formatMissionTime(state.level, time)}`, { title: `Mission elapsed time when route failure occurred: ${formatMissionTime(state.level, time)}.` }),
        chip('reason', `Reason: ${shortReason(routeFailure.reason)}`, { tone: 'bad', title: `Route failure reason: ${labelReason(routeFailure.reason)}.` })
      ]
    };
  }
  return { className: 'simulation', chips };
}

function buildFallbackMissionHudState(state) {
  const time = Number(state.planningTime ?? 0);
  return {
    className: 'fallback',
    chips: [
      chip('glider', 'Glider', { primary: true }),
      chip('phase', phaseLabel(state), { primary: true, title: `Mission phase: ${phaseLabel(state)}.` }),
      chip('time', `T ${formatMissionTime(state.level, time)}`, { title: `Mission elapsed time: ${formatMissionTime(state.level, time)}.` }),
      chip('window', `W${getWindowForTime(state.level, time)}`, { title: `Current mission window: Window ${getWindowForTime(state.level, time)}.` })
    ]
  };
}

function chip(key, value, options = {}) {
  return {
    key,
    value: String(value ?? 'N/A'),
    title: options.title ?? defaultTooltip(key, value),
    tone: options.tone ?? '',
    primary: Boolean(options.primary),
    priority: Number(options.priority ?? defaultPriority(key))
  };
}

function defaultTooltip(key, value) {
  const label = String(value ?? 'N/A');
  const map = {
    glider: `Selected active glider: ${label}.`,
    phase: `Mission phase or simulation status: ${label}.`,
    mode: `Current placement mode: ${label}.`,
    time: `Mission elapsed time: ${label.replace(/^T\s*/, '')}.`,
    window: `Current mission window: ${label}.`,
    fuel: `Fuel or energy state for the selected glider: ${label}.`,
    score: `Current score or expected value: ${label}.`,
    waypoints: `Waypoint count or progress for the selected glider: ${label}.`,
    samples: `Sampling progress: ${label}.`,
    hazards: `Hazard count: ${label}.`,
    stars: `Priority star capture progress: ${label}.`,
    alerts: `Active warning count: ${label}. See Mission Console for details.`,
    deployment: `Deployment state: ${label}.`,
    start: `Selected start state: ${label}.`,
    status: `Mission status: ${label}.`,
    reason: `Route failure reason: ${label}.`
  };
  return map[key] ?? label;
}

function defaultPriority(key) {
  return {
    glider: 1,
    phase: 2,
    mode: 3,
    time: 3,
    window: 3,
    fuel: 4,
    score: 5,
    waypoints: 6,
    alerts: 7
  }[key] ?? 7;
}

function phaseLabel(state) {
  if (state?.mode === 'briefing') return 'Briefing';
  if (state?.mode === 'scenarioSetup') return 'Setup';
  if (state?.mode === 'editor') return 'Editor';
  if (state?.mode === 'debrief') return 'Complete';
  return 'Setup';
}

function placementModeLabel(mode) {
  if (mode === 'marker') return 'Marker';
  if (mode === 'deployment') return 'Deploy';
  if (mode === 'inspect') return 'Inspect';
  return 'Waypoint';
}

function placementModeTitle(mode, choosingDeployment) {
  if (choosingDeployment) return 'Select a deployment cell before placing waypoints.';
  if (mode === 'marker') return 'Marker mode: inspect and annotate future cells without changing the route.';
  if (mode === 'inspect') return 'Inspect mode.';
  return 'Waypoint placement mode.';
}

function deploymentLabel(state, agentId, agent) {
  if (!agent) return 'Dep N/A';
  if (agent.deployment?.mode === 'chooseFromZones') return `Dep ${getDeploymentZonesForAgent(state.level, state.mission, agentId).length}`;
  if (agent.deployment?.mode === 'chooseFromZone') {
    const zone = getDeploymentZoneForAgent(state.level, state.mission, agentId);
    return `Dep ${shortZoneLabel(zone?.label ?? zone?.id ?? 'Zone')}`;
  }
  return 'Dep Fixed';
}

function deploymentTooltip(state, agentId, agent) {
  if (!agent) return '';
  if (agent.deployment?.mode === 'chooseFromZones') {
    return `Available deployment zones: ${getDeploymentZonesForAgent(state.level, state.mission, agentId).map((zone) => zone.label ?? zone.id).join(', ')}`;
  }
  if (agent.deployment?.mode === 'chooseFromZone') {
    const zone = getDeploymentZoneForAgent(state.level, state.mission, agentId);
    return `Deployment zone: ${zone?.label ?? zone?.id ?? 'Zone'}`;
  }
  return 'Fixed start deployment.';
}

function shortZoneLabel(label) {
  return String(label ?? 'Zone').replace(/^deployment\s+/i, '').replace(/^zone\s+/i, '').slice(0, 12);
}

function shortGliderLabel(label, id) {
  const source = String(label ?? id ?? 'Glider');
  const number = source.match(/(\d+)/)?.[1];
  if (number) return `Glider ${number.padStart(2, '0').slice(-2)}`;
  return source.length > 14 ? `${source.slice(0, 13)}...` : source;
}

function uniqueWarnings(warnings) {
  return [...new Set(warnings.filter(Boolean))];
}

function simulationPhase(engine, state) {
  if (engine?.aborted) return { label: 'Failure', tone: 'bad', title: 'Simulation stopped.' };
  if (engine?.complete) return { label: 'Complete', tone: 'ok', title: 'Simulation complete.' };
  if (state?.simulation?.pauseReason === 'surfaceDecision') return { label: 'Surfaced', tone: 'warn', title: 'Awaiting surface decision.' };
  if (state?.simulation?.pauseReason === 'routeFailureDecision') return { label: 'Failure', tone: 'bad', title: 'Route failure decision required.' };
  if (engine?.running) return { label: 'Sim', title: 'Simulation playing.' };
  return { label: 'Paused', title: 'Simulation paused.' };
}

function simulationAlertCount(engine, summary, routeFailure, surfaceDecision) {
  let count = 0;
  if (engine?.aborted) count += 1;
  if (routeFailure?.active) count += 1;
  if (surfaceDecision) count += 1;
  if (summary?.stopReason?.code && summary.stopReason.code !== 'complete') count += 1;
  return count;
}

function simulationAlertTitle(engine, summary, routeFailure, surfaceDecision) {
  const alerts = [];
  if (engine?.aborted) alerts.push(`Stopped: ${engine.abortReason ?? 'simulation aborted'}`);
  if (routeFailure?.active) alerts.push(`Route failure: ${labelReason(routeFailure.reason)}`);
  if (surfaceDecision) alerts.push('Surface decision awaiting instructions.');
  if (summary?.stopReason?.code && summary.stopReason.code !== 'complete') alerts.push(summary.stopReason.title ?? summary.stopReason.code);
  return alerts.length ? alerts.join('\n') : 'No active simulation alerts.';
}

function shortReason(reason) {
  return labelReason(reason).replace(/^active waypoint /i, '').slice(0, 22);
}

function batteryFromMission(state, agentId) {
  const agent = state.mission?.agents?.find((candidate) => candidate.id === agentId);
  return agent?.battery ?? agent?.maxBattery ?? null;
}

function formatActiveWaypoint(agent, planWaypoints) {
  const total = planWaypoints.length;
  if (!total) return '0';
  const current = Math.min(Number(agent.currentWaypointIndex ?? 0) + 1, total);
  return `${current}/${total}`;
}
