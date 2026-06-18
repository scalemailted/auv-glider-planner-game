import {
  buildMissionWorldRenderViewModel,
  missionWorldRenderViewModelSummary,
  validateMissionWorldRenderViewModel
} from './MissionWorldRenderViewModel.js';

export const SIMULATION_WORLD_RENDER_VIEW_MODEL_VERSION = 'simulation-world-render-view-model-mig-r1';

export function buildSimulationWorldRenderViewModel(input = {}) {
  const base = buildMissionWorldRenderViewModel({
    ...input,
    activeTimeSeconds: finiteNumber(input.activeTimeSeconds ?? input.simulationStatus?.timeSeconds),
    simulationState: input.simulationStatus ?? input.simulationState ?? null,
    displaySettings: {
      ...(input.displaySettings ?? {}),
      rendererBackend: 'threeMission3d'
    },
    options: {
      ...(input.options ?? {}),
      phase: 'simulation',
      gliders: input.gliders ?? input.options?.gliders,
      routes: input.routes ?? input.options?.routes,
      observations: input.observations ?? input.options?.observations,
      surfacingEvents: input.surfacingEvents ?? input.options?.surfacingEvents,
      includesHiddenTruth: false,
      allowHiddenTruth: false
    },
    visibilityTier: input.visibilityTier ?? 'fair'
  });
  const realizedTrajectories = normalizeTrajectories(input.realizedTrajectories);
  const sampledTrajectories = normalizeTrajectories(input.sampledTrajectories);
  const observations = normalizeEvents(input.observations, 'observation');
  const surfacingEvents = normalizeEvents(input.surfacingEvents, 'surfacingEvent');
  const communicationEvents = normalizeEvents(input.communicationEvents, 'communicationEvent');
  const routeFailures = normalizeEvents(input.routeFailures, 'routeFailure');
  const missedWaypoints = normalizeEvents(input.missedWaypoints, 'missedWaypoint');
  return {
    ...base,
    type: 'anchor.rendering.simulation-world',
    baseType: base.type,
    version: SIMULATION_WORLD_RENDER_VIEW_MODEL_VERSION,
    phase: 'simulation',
    simulationStatus: normalizeSimulationStatus(input.simulationStatus),
    pauseSpeedState: normalizePauseSpeed(input.pauseSpeedState),
    realizedTrajectories,
    sampledTrajectories,
    observations,
    surfacingEvents,
    communicationEvents,
    routeFailures,
    failedSegments: routeFailures,
    missedWaypoints,
    terminalState: input.terminalState ?? null,
    missionProgress: input.missionProgress ?? null,
    scoreSummary: input.scoreSummary ?? null,
    boundaryFlags: {
      ...(base.boundaryFlags ?? {}),
      ownsSimulationState: false,
      advancesSimulationClock: false,
      computesVehicleMotion: false,
      generatesObservations: false,
      ownsScoring: false,
      ownsReplaySemantics: false,
      changesOfficialBrowserScoring: false,
      includesHiddenTruth: false
    }
  };
}

export function validateSimulationWorldRenderViewModel(viewModel = {}) {
  const baseValidation = validateMissionWorldRenderViewModel({ ...viewModel, type: 'anchor.rendering.mission-world' });
  const errors = [...(baseValidation.errors ?? [])];
  const warnings = [...(baseValidation.warnings ?? [])];
  if (viewModel.type !== 'anchor.rendering.simulation-world') errors.push('Simulation world view model type must be anchor.rendering.simulation-world.');
  if (viewModel.boundaryFlags?.advancesSimulationClock) errors.push('Simulation renderer view model must not advance simulation time.');
  if (viewModel.boundaryFlags?.computesVehicleMotion) errors.push('Simulation renderer view model must not compute vehicle motion.');
  if (viewModel.boundaryFlags?.generatesObservations) errors.push('Simulation renderer view model must not generate observations.');
  if (viewModel.boundaryFlags?.includesHiddenTruth) errors.push('Simulation renderer view model must not expose hidden truth in fair mode.');
  return { valid: errors.length === 0, errors, warnings, summary: simulationWorldRenderViewModelSummary(viewModel) };
}

export function simulationWorldRenderViewModelSummary(viewModel = {}) {
  const base = missionWorldRenderViewModelSummary(viewModel);
  return {
    ...base,
    type: 'anchor.rendering.simulation-world-summary',
    version: SIMULATION_WORLD_RENDER_VIEW_MODEL_VERSION,
    simulationStatus: viewModel.simulationStatus?.status ?? null,
    simulationTimeSeconds: finiteNumber(viewModel.simulationStatus?.timeSeconds ?? viewModel.activeTimeSeconds),
    realizedTrajectoryCount: viewModel.realizedTrajectories?.length ?? 0,
    realizedTrajectoryPointCount: (viewModel.realizedTrajectories ?? []).reduce((sum, item) => sum + (item.points?.length ?? 0), 0),
    sampledTrajectoryPointCount: (viewModel.sampledTrajectories ?? []).reduce((sum, item) => sum + (item.points?.length ?? 0), 0),
    observationCount: viewModel.observations?.length ?? 0,
    surfacingEventCount: viewModel.surfacingEvents?.length ?? 0,
    communicationEventCount: viewModel.communicationEvents?.length ?? 0,
    routeFailureCount: viewModel.routeFailures?.length ?? 0,
    ownsSimulationState: viewModel.boundaryFlags?.ownsSimulationState === true,
    advancesSimulationClock: viewModel.boundaryFlags?.advancesSimulationClock === true,
    computesVehicleMotion: viewModel.boundaryFlags?.computesVehicleMotion === true,
    generatesObservations: viewModel.boundaryFlags?.generatesObservations === true,
    ownsScoring: viewModel.boundaryFlags?.ownsScoring === true
  };
}

function normalizeSimulationStatus(status = {}) {
  return {
    status: status.status ?? (status.complete ? 'complete' : status.running ? 'running' : status.aborted ? 'aborted' : 'paused'),
    running: status.running === true,
    paused: status.paused !== false,
    complete: status.complete === true,
    aborted: status.aborted === true,
    routeFailureDecisionActive: status.routeFailureDecisionActive === true,
    surfaceDecisionActive: status.surfaceDecisionActive === true,
    timeSeconds: finiteNumber(status.timeSeconds),
    stepCount: finiteNumber(status.stepCount)
  };
}

function normalizePauseSpeed(state = {}) {
  return { paused: state.paused !== false, speedScale: finiteNumber(state.speedScale, 1) };
}

function normalizeTrajectories(items = []) {
  return (items ?? []).map((item, index) => ({
    id: item.id ?? `${item.agentId ?? 'agent'}-trajectory-${index}`,
    agentId: item.agentId ?? null,
    status: item.status ?? 'realized',
    sampled: item.sampled === true,
    points: (item.points ?? item.history ?? []).map(normalizePoint).filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
  })).filter((item) => item.points.length > 0);
}

function normalizeEvents(events = [], fallbackType = 'event') {
  return (events ?? []).map((event, index) => ({
    id: event.id ?? `${fallbackType}-${event.agentId ?? 'all'}-${event.t ?? event.timeSeconds ?? index}-${index}`,
    type: event.type ?? fallbackType,
    agentId: event.agentId ?? null,
    x: finiteNumber(event.x ?? event.actual?.x ?? event.position?.x),
    y: finiteNumber(event.y ?? event.actual?.y ?? event.position?.y),
    z: finiteNumber(event.z ?? event.actual?.z ?? event.position?.z, 0),
    depthMeters: finiteNumber(event.depthMeters, 0),
    timeSeconds: finiteNumber(event.t ?? event.timeSeconds),
    status: event.status ?? event.type ?? fallbackType,
    value: event.value ?? event.rewardValue ?? null,
    sourceVisibility: 'publicResult'
  })).filter((event) => Number.isFinite(event.x) && Number.isFinite(event.y));
}

function normalizePoint(point = {}) {
  return {
    x: finiteNumber(point.x),
    y: finiteNumber(point.y),
    z: finiteNumber(point.z, -finiteNumber(point.depthMeters, 0)),
    depthMeters: finiteNumber(point.depthMeters, Math.max(0, -finiteNumber(point.z, 0))),
    timeSeconds: finiteNumber(point.t ?? point.timeSeconds)
  };
}

function finiteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}
