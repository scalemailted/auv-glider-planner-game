import { missionWorldRenderInputFromSimulation, missionWorldRenderInputSummary } from './MissionWorldStateAdapter.js';

export const SIMULATION_WORLD_STATE_ADAPTER_VERSION = 'simulation-world-state-adapter-mig-r1';

export function simulationWorldRenderInputFromScene(scene, options = {}) {
  const state = scene?.app?.state ?? scene?.state ?? {};
  const engine = scene?.engine ?? options.engine ?? null;
  const timeSeconds = finiteNumber(options.activeTimeSeconds ?? engine?.t ?? state.simulationTime ?? state.playback?.time ?? 0);
  const summary = safeSummary(engine, state.result?.summary ?? {});
  const events = [...(engine?.events ?? state.result?.events ?? [])];
  const agents = [...(engine?.agents ?? [])];
  const base = missionWorldRenderInputFromSimulation(scene, {
    ...options,
    activeTimeSeconds: timeSeconds,
    visibilityTier: 'fair',
    allowHiddenTruth: false,
    displaySettings: {
      ...(options.displaySettings ?? {}),
      rendererBackend: 'threeMission3d'
    },
    simulationState: buildSimulationStatus(engine, timeSeconds),
    motionTrajectory: agents.map((agent) => ({ agentId: agent.id, history: agent.history ?? [] }))
  });
  const gliders = agents.map((agent, index) => ({
    ...agent,
    agentId: agent.id,
    x: finiteNumber(agent.x),
    y: finiteNumber(agent.y),
    z: -finiteNumber(agent.depthMeters, 0),
    depthMeters: finiteNumber(agent.depthMeters, 0),
    headingRadians: finiteNumber(agent.headingRadians ?? agent.heading, 0),
    courseOverGroundRadians: finiteNumber(agent.courseOverGroundRadians ?? agent.heading, 0),
    pitchRadians: finiteNumber(agent.pitchRadians, 0),
    rollRadians: finiteNumber(agent.rollRadians, 0),
    divePhase: agent.divePhase ?? 'surfaced',
    profileProgress: finiteNumber(agent.profileProgress, 0),
    segmentProgress: finiteNumber(agent.segmentProgress, 0),
    waterRelativeVelocity: agent.waterRelativeVelocity ?? { x: 0, y: 0, vertical: 0 },
    groundRelativeVelocity: agent.groundRelativeVelocity ?? agent.velocity ?? { x: 0, y: 0, vertical: 0 },
    currentVector: agent.currentVector ?? { u: 0, v: 0, w: 0 },
    bottomDepthMeters: agent.bottomDepthMeters ?? null,
    bottomClearanceMeters: agent.bottomClearanceMeters ?? null,
    batteryFraction: batteryFraction(agent),
    energyFraction: batteryFraction(agent),
    status: agent.status ?? (engine?.complete ? 'complete' : engine?.running ? 'enroute' : 'paused'),
    selected: (state.selectedAgentId ?? agents[0]?.id) === agent.id,
    colorKey: agent.colorKey ?? `agent-${index + 1}`
  }));
  const realizedTrajectories = agents.map((agent) => ({
    id: `${agent.id}-realized-trajectory`,
    agentId: agent.id,
    status: agent.status ?? 'realized',
    points: agent.history ?? []
  }));
  const sampledEvents = events.filter(isObservationEvent);
  const surfacingEvents = events.filter(isSurfacingEvent);
  const communicationEvents = events.filter(isCommunicationEvent);
  const routeFailures = events.filter(isRouteFailureEvent);
  const missedWaypoints = events.filter((event) => event.type === 'missedWaypoint');
  return {
    ...base,
    adapterVersion: SIMULATION_WORLD_STATE_ADAPTER_VERSION,
    activeTimeSeconds: timeSeconds,
    gliders,
    observations: sampledEvents,
    surfacingEvents,
    communicationEvents,
    routeFailures,
    missedWaypoints,
    realizedTrajectories,
    sampledTrajectories: buildSampledTrajectories(agents, sampledEvents),
    simulationStatus: buildSimulationStatus(engine, timeSeconds),
    pauseSpeedState: { paused: !engine?.running, speedScale: finiteNumber(state.playback?.speedScale, 1) },
    terminalState: engine?.complete || engine?.aborted ? { complete: engine?.complete === true, aborted: engine?.aborted === true, abortReason: engine?.abortReason ?? null } : null,
    scoreSummary: summary,
    missionProgress: buildMissionProgress(engine, summary),
    communicationEvents,
    options: {
      ...(base.options ?? {}),
      phase: 'simulation',
      gliders,
      observations: sampledEvents,
      surfacingEvents,
      includesHiddenTruth: false,
      allowHiddenTruth: false
    }
  };
}

export function simulationWorldRenderInputFromResult(result = {}, options = {}) {
  const timeSeconds = finiteNumber(options.activeTimeSeconds ?? result.summary?.elapsedTime ?? 0);
  const trajectories = (result.trajectories ?? []).map((trajectory) => ({
    id: `${trajectory.agentId}-realized-trajectory`,
    agentId: trajectory.agentId,
    points: trajectory.history ?? []
  }));
  return {
    adapterVersion: SIMULATION_WORLD_STATE_ADAPTER_VERSION,
    phase: 'simulation',
    level: options.level ?? result.level ?? null,
    mission: options.mission ?? result.mission ?? null,
    plan: result.plan ?? options.plan ?? null,
    selectedAgentId: options.selectedAgentId ?? result.plan?.agentPlans?.[0]?.agentId ?? null,
    activeTimeSeconds: timeSeconds,
    displaySettings: { ...(options.displaySettings ?? {}), rendererBackend: 'threeMission3d' },
    visibilityTier: 'fair',
    observations: (result.events ?? []).filter(isObservationEvent),
    surfacingEvents: (result.events ?? []).filter(isSurfacingEvent),
    communicationEvents: (result.events ?? []).filter(isCommunicationEvent),
    routeFailures: (result.events ?? []).filter(isRouteFailureEvent),
    missedWaypoints: (result.events ?? []).filter((event) => event.type === 'missedWaypoint'),
    realizedTrajectories: trajectories,
    simulationStatus: { status: 'result', timeSeconds, complete: true, running: false, paused: true },
    scoreSummary: result.summary ?? null,
    options: { phase: 'simulation', includesHiddenTruth: false, allowHiddenTruth: false }
  };
}

export function simulationWorldRenderInputSummary(input = {}) {
  return {
    ...missionWorldRenderInputSummary(input),
    type: 'anchor.rendering.simulation-world-input-summary',
    version: SIMULATION_WORLD_STATE_ADAPTER_VERSION,
    simulationTimeSeconds: finiteNumber(input.activeTimeSeconds ?? input.simulationStatus?.timeSeconds),
    observationCount: input.observations?.length ?? 0,
    surfacingEventCount: input.surfacingEvents?.length ?? 0,
    communicationEventCount: input.communicationEvents?.length ?? 0,
    routeFailureCount: input.routeFailures?.length ?? 0,
    realizedTrajectoryCount: input.realizedTrajectories?.length ?? 0,
    realizedTrajectoryPointCount: (input.realizedTrajectories ?? []).reduce((sum, item) => sum + (item.points?.length ?? 0), 0),
    ownsSimulationState: false,
    computesVehicleMotion: false,
    generatesObservations: false,
    ownsScoring: false
  };
}

function buildSimulationStatus(engine, timeSeconds) {
  return {
    status: engine?.aborted ? 'aborted' : engine?.complete ? 'complete' : engine?.routeFailureDecision?.active ? 'routeFailureDecision' : engine?.awaitingSurfaceDecision ? 'surfaceDecision' : engine?.running ? 'running' : 'paused',
    running: engine?.running === true,
    paused: engine?.running !== true,
    complete: engine?.complete === true,
    aborted: engine?.aborted === true,
    routeFailureDecisionActive: engine?.routeFailureDecision?.active === true,
    surfaceDecisionActive: Boolean(engine?.awaitingSurfaceDecision),
    timeSeconds,
    stepCount: finiteNumber(engine?.stepCount)
  };
}

function safeSummary(engine, fallback = {}) {
  try {
    return engine?.getSummary?.() ?? fallback;
  } catch {
    return fallback;
  }
}

function buildMissionProgress(engine, summary = {}) {
  const agents = engine?.agents ?? [];
  return {
    completed: engine?.complete === true,
    activeAgentCount: agents.filter((agent) => !agent.completedPlan && agent.status !== 'batteryDepleted' && agent.status !== 'missedWaypoint').length,
    completedAgentCount: agents.filter((agent) => agent.completedPlan || agent.status === 'complete').length,
    failedAgentCount: agents.filter((agent) => agent.status === 'batteryDepleted' || agent.status === 'missedWaypoint').length,
    finalScore: summary.finalScore ?? null
  };
}

function buildSampledTrajectories(agents, sampleEvents) {
  const sampledByAgent = new Map(sampleEvents.map((event) => [event.agentId, true]));
  return agents.filter((agent) => sampledByAgent.has(agent.id)).map((agent) => ({
    id: `${agent.id}-sampled-trajectory`,
    agentId: agent.id,
    sampled: true,
    points: agent.history ?? []
  }));
}

function isObservationEvent(event = {}) {
  return ['sample', 'duplicateSample', 'probabilityOutcome'].includes(event.type);
}

function isSurfacingEvent(event = {}) {
  return /surface/i.test(event.type ?? '') || event.type === 'surfaced';
}

function isCommunicationEvent(event = {}) {
  return /surface|comm|transmit|upload/i.test(event.type ?? '') || event.gpsFix === true || event.canReplan === true;
}

function isRouteFailureEvent(event = {}) {
  return ['blocked', 'routeFailure', 'missedWaypoint', 'hazard', 'mobileHazard'].includes(event.type);
}

function batteryFraction(agent = {}) {
  const max = Math.max(1, finiteNumber(agent.maxBattery, 100));
  return Math.max(0, Math.min(1, finiteNumber(agent.battery, max) / max));
}

function finiteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}
