import { publicReplayStateAtTick } from '../replay/ReplayContractBuilder.js';
import { normalizeReplayArtifacts, scanForbiddenPublicMarkers } from '../replay/ReplaySchema.js';
import { createReplayReviewSession, replayReviewSessionSummary } from '../replay/ReplayReviewSession.js';
import { buildSimulationWorldRenderViewModel, simulationWorldRenderViewModelSummary, validateSimulationWorldRenderViewModel } from './SimulationWorldRenderViewModel.js';
import { augmentMissionWorldWithVolumetricModel, volumetricMissionWorldViewModelSummary } from './VolumetricMissionWorldViewModel.js';

export const REPLAY_WORLD_RENDER_VIEW_MODEL_VERSION = 'replay-world-render-view-model-r2a';

export function buildReplayWorldRenderViewModel(sessionOrSource = {}, options = {}) {
  const session = sessionOrSource?.type === 'anchor.replay.review-session'
    ? sessionOrSource
    : createReplayReviewSession(sessionOrSource, options);
  const source = session.source ?? {};
  const artifacts = session.replayArtifacts ?? source.replayArtifacts ?? normalizeReplayArtifacts(source);
  const events = artifacts.events?.events ?? [];
  const manifest = artifacts.manifest ?? {};
  const playback = session.playbackState ?? {};
  const currentTick = finiteNumber(playback.currentTick, 0);
  const dt = finitePositive(manifest.timingModel?.dtSeconds ?? manifest.timestepSeconds, 1);
  const publicState = publicReplayStateAtTick(events, currentTick, {
    initialState: manifest.initialPublicState ?? manifest.initialState ?? null,
    dt,
    terminalTick: manifest.timingModel?.terminalTick ?? null
  });
  const selectedAgentId = playback.selectedAgentId ?? null;
  const gliders = glidersFromPublicState(publicState, selectedAgentId);
  const realizedTrajectories = realizedTrajectoriesFromEvents(events, currentTick);
  const observations = observationsFromEvents(events, currentTick);
  const surfacingEvents = surfacingEventsFromEvents(events, currentTick, publicState);
  const routeFailures = terrainEventsFromEvents(events, currentTick);
  const level = source.level ?? options.level ?? fallbackLevelFromManifest(manifest);
  const mission = source.mission ?? options.mission ?? fallbackMissionFromPublicState(publicState);
  const plan = source.plan ?? options.plan ?? { agentPlans: [] };
  const activeTimeSeconds = currentTick * dt;
  const base = buildSimulationWorldRenderViewModel({
    appState: { mode: 'replay' },
    level,
    mission,
    plan,
    selectedAgentId,
    activeTimeSeconds,
    simulationStatus: {
      status: playback.playing ? 'playingReplay' : session.integritySummary?.status === 'FAIL' ? 'replayIntegrityFailed' : 'pausedReplay',
      running: playback.playing === true,
      paused: playback.playing !== true,
      complete: publicState.completed === true,
      timeSeconds: activeTimeSeconds,
      stepCount: currentTick
    },
    displaySettings: {
      scalarFieldId: options.scalarFieldId ?? 'sampleValue',
      waterColumn: {
        verticalDisplayMode: options.verticalDisplayMode ?? 'explodedLayers',
        qualityProfile: options.qualityProfile ?? 'balanced',
        activeDepthLayerId: options.activeDepthLayerId ?? publicState.activeDepthLayerId ?? null
      },
      showROI: options.showROI !== false,
      showCurrents: options.showCurrents !== false,
      showPlanningMarkers: false
    },
    visibilityTier: 'publicResult',
    gliders,
    realizedTrajectories,
    observations,
    surfacingEvents,
    routeFailures,
    missedWaypoints: [],
    communicationEvents: [],
    terminalState: publicState.completed ? { completed: true, reason: publicState.terminationReason ?? null } : null,
    scoreSummary: publicState.score ?? null,
    missionProgress: { currentTick, eventIndex: playback.eventIndex ?? -1, checkpointIndex: playback.checkpointIndex ?? -1 },
    options: {
      gliders,
      routes: plan.agentPlans ?? [],
      observations,
      surfacingEvents,
      depthLayers: options.depthLayers,
      includesHiddenTruth: false,
      allowHiddenTruth: false,
      phase: 'replay'
    }
  });
  const replayModel = {
    ...base,
    type: 'anchor.rendering.replay-world',
    baseType: base.type,
    version: REPLAY_WORLD_RENDER_VIEW_MODEL_VERSION,
    phase: 'replay',
    sourceKind: source.sourceKind ?? null,
    replay: {
      replayId: manifest.replayId ?? null,
      replayMode: manifest.replayMode ?? null,
      replayFidelity: manifest.replayFidelity ?? null,
      eventIndex: playback.eventIndex ?? -1,
      checkpointIndex: playback.checkpointIndex ?? -1,
      currentEvent: compactEvent(playback.currentEvent),
      currentCheckpoint: compactCheckpoint(playback.currentCheckpoint),
      currentTick,
      currentTimeSeconds: activeTimeSeconds,
      integrityStatus: session.integritySummary?.status ?? null,
      failureCodes: session.integritySummary?.failureCodes ?? []
    },
    publicState,
    gliders,
    realizedTrajectories,
    observations,
    surfacingEvents,
    routeFailures,
    failedSegments: routeFailures,
    presentationDirtyCategories: options.presentationDirtyCategories ?? ['vehiclePose', 'realizedTrajectory', 'observations', 'surfacingEvents', 'routeStatus', 'simulationStatus'],
    warnings: [...(base.warnings ?? []), ...(session.warningState?.warnings ?? [])],
    boundaryFlags: {
      ...(base.boundaryFlags ?? {}),
      ownsSimulationState: false,
      advancesSimulationClock: false,
      computesVehicleMotion: false,
      generatesObservations: false,
      ownsScoring: false,
      ownsPlanning: false,
      ownsReplaySemantics: false,
      publicObservationPlayback: true,
      includesHiddenTruth: false,
      usesHiddenTruthResimulation: false,
      usesAuthoritativeHiddenStateReplay: false,
      changesOfficialBrowserScoring: false,
      rendererAuthoritativeForReplay: false
    }
  };
  const volumetric = augmentMissionWorldWithVolumetricModel(replayModel, {
    level,
    mission,
    plan,
    displaySettings: replayModel.displaySettings,
    waterColumn: replayModel.displaySettings?.waterColumn ?? {},
    selectedRouteSegment: null
  });
  return {
    ...volumetric,
    type: 'anchor.rendering.replay-world',
    version: REPLAY_WORLD_RENDER_VIEW_MODEL_VERSION,
    phase: 'replay',
    replay: replayModel.replay,
    publicState,
    boundaryFlags: replayModel.boundaryFlags
  };
}

export function validateReplayWorldRenderViewModel(viewModel = {}) {
  const errors = [];
  const warnings = [...(viewModel.warnings ?? [])];
  if (viewModel.type !== 'anchor.rendering.replay-world') errors.push('Replay world view model type must be anchor.rendering.replay-world.');
  if (viewModel.phase !== 'replay') errors.push('Replay world view model phase must be replay.');
  const simulationValidation = validateSimulationWorldRenderViewModel({ ...viewModel, type: 'anchor.rendering.simulation-world', phase: 'simulation' });
  warnings.push(...(simulationValidation.warnings ?? []));
  if (viewModel.boundaryFlags?.includesHiddenTruth) errors.push('Replay world render view model must not include hidden truth.');
  if (viewModel.boundaryFlags?.usesHiddenTruthResimulation) errors.push('Replay world render view model must not use hidden-truth resimulation.');
  if (viewModel.boundaryFlags?.changesOfficialBrowserScoring) errors.push('Replay world render view model must not change official browser scoring.');
  const scan = scanForbiddenPublicMarkers(viewModel, { allowBoundaryBooleans: true });
  errors.push(...(scan.failures ?? []));
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings, summary: replayWorldRenderViewModelSummary(viewModel) };
}

export function replayWorldRenderViewModelSummary(viewModel = {}) {
  const simulation = simulationWorldRenderViewModelSummary({ ...viewModel, type: 'anchor.rendering.simulation-world' });
  const volumetric = volumetricMissionWorldViewModelSummary(viewModel);
  return {
    type: 'anchor.rendering.replay-world-summary',
    version: REPLAY_WORLD_RENDER_VIEW_MODEL_VERSION,
    ...simulation,
    replayId: viewModel.replay?.replayId ?? null,
    replayMode: viewModel.replay?.replayMode ?? null,
    replayFidelity: viewModel.replay?.replayFidelity ?? null,
    sourceKind: viewModel.sourceKind ?? null,
    currentTick: viewModel.replay?.currentTick ?? null,
    currentEventIndex: viewModel.replay?.eventIndex ?? -1,
    currentCheckpointIndex: viewModel.replay?.checkpointIndex ?? -1,
    integrityStatus: viewModel.replay?.integrityStatus ?? null,
    failureCodes: viewModel.replay?.failureCodes ?? [],
    replaySession: viewModel.replaySession ? replayReviewSessionSummary(viewModel.replaySession) : null,
    volumetric,
    publicObservationPlayback: viewModel.boundaryFlags?.publicObservationPlayback === true,
    includesHiddenTruth: viewModel.boundaryFlags?.includesHiddenTruth === true,
    usesHiddenTruthResimulation: viewModel.boundaryFlags?.usesHiddenTruthResimulation === true,
    usesAuthoritativeHiddenStateReplay: viewModel.boundaryFlags?.usesAuthoritativeHiddenStateReplay === true,
    changesOfficialBrowserScoring: viewModel.boundaryFlags?.changesOfficialBrowserScoring === true,
    ownsReplaySemantics: viewModel.boundaryFlags?.ownsReplaySemantics === true
  };
}

function glidersFromPublicState(publicState = {}, selectedAgentId = null) {
  const agents = publicState.agentStates ?? publicState.vehicles ?? publicState.agentsById ?? {};
  return Object.entries(agents).map(([agentId, state], index) => ({
    id: agentId,
    agentId,
    x: finiteNumber(state.x, 0),
    y: finiteNumber(state.y, 0),
    z: finiteNumber(state.z, -finiteNumber(state.depthMeters, 0)),
    zIndex: state.zIndex ?? state.z ?? null,
    depthLayerId: state.depthLayerId ?? null,
    depthMeters: finiteNumber(state.depthMeters, 0),
    headingDegrees: finiteOrNull(state.headingDegrees ?? state.heading),
    battery: finiteOrNull(state.battery),
    energyUsed: finiteOrNull(state.energyUsed),
    status: state.status ?? 'replay',
    selected: selectedAgentId ? selectedAgentId === agentId : index === 0,
    colorKey: `agent-${index + 1}`,
    sourceVisibility: 'publicReplay'
  }));
}

function realizedTrajectoriesFromEvents(events = [], currentTick = 0) {
  const byAgent = new Map();
  for (const event of events) {
    if (Number(event.tick) > currentTick || event.phase !== 'vehicleState' || !event.agentId) continue;
    const payload = event.payload ?? {};
    if (!Number.isFinite(Number(payload.x)) || !Number.isFinite(Number(payload.y))) continue;
    if (!byAgent.has(event.agentId)) byAgent.set(event.agentId, []);
    byAgent.get(event.agentId).push({
      x: finiteNumber(payload.x),
      y: finiteNumber(payload.y),
      z: finiteNumber(payload.z, -finiteNumber(payload.depthMeters, 0)),
      depthMeters: finiteNumber(payload.depthMeters, 0),
      depthLayerId: payload.depthLayerId ?? null,
      timeSeconds: finiteNumber(event.timeSeconds, 0)
    });
  }
  return [...byAgent.entries()].map(([agentId, points]) => ({ id: `${agentId}-replay-realized`, agentId, status: 'replay-public', points }));
}

function observationsFromEvents(events = [], currentTick = 0) {
  return events.filter((event) => Number(event.tick) <= currentTick && event.phase === 'observation').map((event, index) => {
    const payload = event.payload ?? {};
    return compactObject({
      id: payload.observationId ?? event.eventId ?? `replay-observation-${index + 1}`,
      agentId: event.agentId ?? null,
      x: finiteNumber(payload.x, 0),
      y: finiteNumber(payload.y, 0),
      z: finiteNumber(payload.z, -finiteNumber(payload.depthMeters, 0)),
      depthMeters: finiteNumber(payload.depthMeters, 0),
      depthLayerId: payload.depthLayerId ?? null,
      timeSeconds: finiteNumber(event.timeSeconds, 0),
      value: payload.observedValue ?? null,
      sourceVisibility: 'publicReplay'
    });
  }).filter((observation) => Number.isFinite(observation.x) && Number.isFinite(observation.y));
}

function surfacingEventsFromEvents(events = [], currentTick = 0, publicState = {}) {
  const agents = publicState.agentStates ?? publicState.vehicles ?? {};
  return events.filter((event) => Number(event.tick) <= currentTick && event.phase === 'surfacing').map((event, index) => {
    const state = agents[event.agentId] ?? Object.values(agents)[0] ?? {};
    return {
      id: event.payload?.surfacingId ?? event.eventId ?? `replay-surfacing-${index + 1}`,
      agentId: event.agentId ?? null,
      x: finiteNumber(event.payload?.x ?? state.x, 0),
      y: finiteNumber(event.payload?.y ?? state.y, 0),
      z: 0,
      depthMeters: 0,
      timeSeconds: finiteNumber(event.timeSeconds, 0),
      status: event.payload?.reason ?? event.eventType ?? 'surfacing',
      sourceVisibility: 'publicReplay'
    };
  });
}

function terrainEventsFromEvents(events = [], currentTick = 0) {
  return events.filter((event) => Number(event.tick) <= currentTick && event.phase === 'terrain').map((event, index) => {
    const payload = event.payload ?? {};
    const position = payload.position ?? {};
    return compactObject({
      id: payload.terrainEventId ?? event.eventId ?? `replay-terrain-${index + 1}`,
      type: event.eventType ?? 'anchor.simulation.terrain-event',
      agentId: event.agentId ?? null,
      x: finiteNumber(position.x ?? payload.x, 0),
      y: finiteNumber(position.y ?? payload.y, 0),
      z: finiteNumber(position.z, -finiteNumber(position.depthMeters ?? payload.depthMeters, 0)),
      depthMeters: finiteNumber(position.depthMeters ?? payload.depthMeters, 0),
      timeSeconds: finiteNumber(event.timeSeconds, 0),
      issueCode: payload.issueCode ?? event.eventType,
      severity: payload.severity ?? 'info',
      status: payload.issueCode ?? event.eventType,
      sourceVisibility: 'publicReplay'
    });
  });
}

function fallbackLevelFromManifest(manifest = {}) {
  return { levelId: manifest.scenarioId ?? 'replay-scenario', world: { grid: { width: 12, height: 12 }, time: { dt: manifest.timingModel?.dtSeconds ?? 1 } }, layers: { terrain: [] }, meta: { publicSafe: true } };
}

function fallbackMissionFromPublicState(publicState = {}) {
  const vehicles = publicState.vehicles ?? publicState.agentStates ?? {};
  return { missionId: 'replay-mission', agents: Object.entries(vehicles).map(([id, state]) => ({ id, start: { x: finiteNumber(state.x, 0), y: finiteNumber(state.y, 0) } })) };
}

function compactEvent(event = null) {
  if (!event) return null;
  return { eventId: event.eventId ?? null, sequence: event.sequence ?? null, tick: event.tick ?? null, phase: event.phase ?? null, eventType: event.eventType ?? null, agentId: event.agentId ?? null };
}

function compactCheckpoint(checkpoint = null) {
  if (!checkpoint) return null;
  return { checkpointId: checkpoint.checkpointId ?? null, tick: checkpoint.tick ?? null, reason: checkpoint.reason ?? null, reasons: checkpoint.reasons ?? [] };
}

function finitePositive(value, fallback = 1) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function compactObject(value) {
  if (Array.isArray(value)) return value.map(compactObject);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    if (child === undefined) continue;
    if (child && typeof child === 'object') out[key] = compactObject(child);
    else out[key] = child;
  }
  return out;
}
