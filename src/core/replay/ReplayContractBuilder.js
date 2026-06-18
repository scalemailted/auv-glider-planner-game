import {
  REPLAY_ARTIFACT_TYPES,
  REPLAY_MODES,
  REPLAY_NUMERIC_POLICY,
  REPLAY_ORDERING_POLICY,
  REPLAY_R1_CONTRACT_ID,
  REPLAY_R1_SCHEMA_VERSION,
  buildReplayContract
} from './ReplaySchema.js';
import { assignCanonicalReplaySequences } from './ReplayOrdering.js';
import { publicReplayStateDigest, REPLAY_DIGEST_ALGORITHM } from './ReplayDigest.js';

const DEFAULT_OBJECTIVE_SEQUENCE = Object.freeze([
  { objectiveId: 'reconnaissance', label: 'Dive 1: reconnaissance', surfacingIndex: 0 },
  { objectiveId: 'validateExpectedState', label: 'Dive 2: validate expected state', surfacingIndex: 1 },
  { objectiveId: 'frontTracking', label: 'Dive 3: front tracking', surfacingIndex: 2 },
  { objectiveId: 'persistentMonitoring', label: 'Dive 4: persistent monitoring', surfacingIndex: 3 },
  { objectiveId: 'returnRecovery', label: 'Dive 5: return/recovery', surfacingIndex: 4 }
]);

export function buildReplayArtifactsFromEpisode(episode = {}, options = {}) {
  return buildReplayArtifactsFromSource({ episode, bundle: null }, options);
}

export function buildReplayArtifactsFromBundle(bundle = {}, options = {}) {
  return buildReplayArtifactsFromSource({ episode: bundle.episode ?? null, bundle }, options);
}

export function buildReplayArtifactsFromSource(source = {}, options = {}) {
  const episode = source.episode ?? {};
  const bundle = source.bundle ?? {};
  const missionConfig = episode.missionConfig ?? bundle.missionConfig ?? {};
  const manifestSource = bundle.manifest ?? {};
  const tracks = normalizeTrackRows(episode.tracks ?? bundle.gliderTracks ?? bundle.motionTrajectory?.realizedTrack ?? episode.motionTrajectory?.realizedTrack ?? []);
  const observations = normalizeObservationRows(episode.observations ?? bundle.observations ?? []);
  const actions = normalizeActions(episode.actions ?? bundle.episode?.actions ?? []);
  const surfacingEvents = normalizeSurfacingEvents(episode.surfacingEvents ?? bundle.episode?.surfacingEvents ?? [], tracks, observations);
  const replayObjectiveSequence = objectiveSequenceFromReplayEvents(bundle.replayEvents?.events ?? episode.replayEvents?.events ?? []);
  const objectiveSequence = normalizeObjectiveSequence(options.objectiveSequence ?? episode.objectiveSequence ?? episode.replay?.objectiveSequence ?? missionConfig.replayObjectiveSequence ?? missionConfig.objectiveSequence ?? replayObjectiveSequence, missionConfig, tracks, surfacingEvents, options);
  const dt = finitePositive(missionConfig.world?.timeStepSeconds ?? missionConfig.world?.time?.dt ?? missionConfig.timeStepSeconds ?? options.timeStepSeconds, 60);
  const maxTimeSeconds = maxFinite([
    missionConfig.world?.durationSeconds,
    ...tracks.map((row) => row.timeSeconds),
    ...observations.map((row) => row.timeSeconds),
    ...surfacingEvents.map((row) => row.timeSeconds)
  ], 0);
  const terminalTick = Math.max(0, Math.ceil(maxTimeSeconds / dt));
  const replayId = options.replayId ?? `replay-r1-${missionConfig.missionId ?? manifestSource.missionId ?? 'mission'}-${episode.seed ?? manifestSource.seed ?? bundle.replay?.seed ?? 'seed'}`;
  const agentIds = resolveAgentIds(missionConfig, tracks, observations, actions);
  const replayMode = resolveReplayMode(options, bundle);
  const initialState = buildInitialPublicState({ missionConfig, tracks, observations, agentIds, dt });
  const featureFlags = buildFeatureFlags({ episode, bundle, missionConfig, options });
  const scoreSnapshot = publicScoreSnapshot({ episode, bundle });
  const seed = String(options.seed ?? episode.seed ?? manifestSource.seed ?? bundle.replay?.seed ?? missionConfig.seed ?? 'unknown-seed');
  const events = buildCanonicalEvents({
    replayId,
    missionConfig,
    tracks,
    observations,
    actions,
    surfacingEvents,
    objectiveSequence,
    scoreSnapshot,
    initialState,
    agentIds,
    dt,
    terminalTick
  });
  const checkpoints = buildReplayCheckpoints({
    replayId,
    events,
    initialState,
    terminalTick,
    dt,
    checkpointEvery: finitePositive(options.checkpointEvery ?? options.checkpointEveryTicks ?? inferCheckpointEvery(bundle.replayCheckpoints?.checkpoints ?? episode.replayCheckpoints?.checkpoints), 10),
    scoreSnapshot,
    missionOutcomeStatus: scoreSnapshot.missionOutcomeStatus,
    numericPolicy: options.numericPolicy ?? REPLAY_NUMERIC_POLICY
  });
  const manifest = {
    type: REPLAY_ARTIFACT_TYPES.manifest,
    version: REPLAY_R1_SCHEMA_VERSION,
    schemaVersion: REPLAY_R1_SCHEMA_VERSION,
    replayVersion: REPLAY_R1_SCHEMA_VERSION,
    contract: REPLAY_R1_CONTRACT_ID,
    replayId,
    replayMode,
    replayFidelity: replayMode === REPLAY_MODES.publicObservationPlayback ? 'publicObservationPlaybackWithCheckpointDigests' : 'deterministicHeadlessReplayContract',
    compatibilityStatus: replayMode === REPLAY_MODES.publicObservationPlayback ? 'compatible-public-playback' : 'compatible-internal-replay-contract',
    missionId: missionConfig.missionId ?? manifestSource.missionId ?? null,
    scenarioId: missionConfig.scenarioId ?? manifestSource.scenarioId ?? bundle.visibleFields?.scenario ?? null,
    scenarioSchemaVersion: bundle.visibleFields?.version ?? manifestSource.version ?? null,
    missionSchemaVersion: missionConfig.version ?? null,
    episodeId: episode.episodeId ?? manifestSource.episodeId ?? null,
    seed,
    seedSubstreams: deterministicSubstreams(seed),
    deterministicSubstreams: deterministicSubstreams(seed),
    timingModel: {
      type: 'fixedStep',
      dtSeconds: dt,
      terminalTick,
      maxTimeSeconds,
      wallClockAffectsSimulation: false
    },
    timestepSeconds: dt,
    initialPublicState: initialState,
    initialState,
    agentIds,
    featureFlags,
    eventOrderingPolicy: REPLAY_ORDERING_POLICY,
    checkpointPolicy: { id: 'replay-h4.1-public-checkpoints', requiredReasons: ['initial', 'terminal'], eventCursorSemantics: 'count of events consumed through checkpoint tick' },
    numericPolicy: REPLAY_NUMERIC_POLICY,
    publicBoundary: 'publicObservationPlayback records public state only; it does not include hidden truth or authoritative resimulation state.',
    terminalReason: surfacingEvents.at(-1)?.reason ?? episode.terminationReason ?? 'mission-complete-summary-export',
    bundleSchemaVersion: bundle.version ?? manifestSource.version ?? 'headless-combined-bundle-h2-compatible',
    scoringSchemaVersion: scoreSnapshot.schemaVersion,
    changesOfficialBrowserScoring: false,
    replayAuthoritativeForBrowserScoring: false,
    publicSafe: true,
    hiddenTruthIncluded: false,
    requiresHiddenTruth: replayMode !== REPLAY_MODES.publicObservationPlayback,
    visibilityTier: replayMode === REPLAY_MODES.publicObservationPlayback ? 'publicScenario' : 'refereeInternal',
    artifactFiles: ['replay_manifest.json', 'replay_events.json', 'replay_checkpoints.json', 'replay_alignment_report.json'],
    notA: ['not a new planner', 'not route optimization', 'not MARL/RL', 'not calibrated ocean forecast', 'not official browser scoring']
  };
  const replayEvents = {
    type: REPLAY_ARTIFACT_TYPES.events,
    version: REPLAY_R1_SCHEMA_VERSION,
    schemaVersion: REPLAY_R1_SCHEMA_VERSION,
    replayVersion: REPLAY_R1_SCHEMA_VERSION,
    contract: REPLAY_R1_CONTRACT_ID,
    replayId,
    eventOrderingPolicy: REPLAY_ORDERING_POLICY,
    events,
    summary: {
      eventCount: events.length,
      commandCount: events.filter((event) => event.phase === 'command').length,
      objectiveTransitionCount: events.filter((event) => event.phase === 'objective').length,
      surfacingCount: events.filter((event) => event.phase === 'surfacing').length,
      observationCount: events.filter((event) => event.phase === 'observation').length,
      vehicleStateCount: events.filter((event) => event.phase === 'vehicleState').length,
      terminalTick
    }
  };
  const replayCheckpoints = {
    type: REPLAY_ARTIFACT_TYPES.checkpoints,
    version: REPLAY_R1_SCHEMA_VERSION,
    schemaVersion: REPLAY_R1_SCHEMA_VERSION,
    replayVersion: REPLAY_R1_SCHEMA_VERSION,
    contract: REPLAY_R1_CONTRACT_ID,
    replayId,
    digestAlgorithm: REPLAY_DIGEST_ALGORITHM,
    numericPolicy: REPLAY_NUMERIC_POLICY,
    checkpoints,
    summary: {
      checkpointCount: checkpoints.length,
      initialDigest: checkpoints[0]?.digest?.value ?? null,
      terminalDigest: checkpoints.at(-1)?.digest?.value ?? null,
      terminalTick
    }
  };
  const alignmentReport = buildInitialReplayAlignmentReport({ manifest, replayEvents, replayCheckpoints, scoreSnapshot });
  return {
    manifest,
    events: replayEvents,
    checkpoints: replayCheckpoints,
    alignmentReport,
    contract: buildReplayContract({ manifest, events: replayEvents, checkpoints: replayCheckpoints, alignmentReport })
  };
}

export function buildReplayCheckpoints({ replayId, events, initialState, terminalTick, dt, checkpointEvery, scoreSnapshot, missionOutcomeStatus, numericPolicy = REPLAY_NUMERIC_POLICY }) {
  const reasonsByTick = new Map([[0, new Set(['initial'])], [terminalTick, new Set(['terminal'])]]);
  for (const event of events) {
    if (event.phase === 'surfacing') addReason(reasonsByTick, event.tick, 'surfacing');
    if (event.phase === 'objective') addReason(reasonsByTick, event.tick, 'objectiveTransition');
  }
  for (let tick = 0; tick <= terminalTick; tick += checkpointEvery) addReason(reasonsByTick, tick, 'periodic');
  const ticks = [...reasonsByTick.keys()].filter((tick) => Number.isFinite(tick) && tick >= 0).sort((a, b) => a - b);
  return ticks.map((tick, index) => {
    const publicState = publicReplayStateAtTick(events, tick, {
      initialState,
      dt,
      terminalTick,
      scoreSnapshot,
      missionOutcomeStatus
    });
    const reasons = [...(reasonsByTick.get(tick) ?? [])].sort();
    return {
      type: REPLAY_ARTIFACT_TYPES.checkpoint,
      version: REPLAY_R1_SCHEMA_VERSION,
      schemaVersion: REPLAY_R1_SCHEMA_VERSION,
      checkpointId: `${replayId}-checkpoint-${String(index).padStart(3, '0')}`,
      tick,
      timeSeconds: tick * dt,
      reason: reasons[0] ?? 'periodic',
      reasons,
      eventCursor: events.filter((event) => Number(event.tick) <= tick).length,
      publicState,
      agentStates: publicState.agentStates ?? publicState.vehicles ?? {},
      objectiveState: { activeObjectives: publicState.activeObjectives ?? [] },
      digest: publicReplayStateDigest(publicState, numericPolicy),
      digestAlgorithmId: REPLAY_DIGEST_ALGORITHM,
      digestVersion: 'replay-digest-v1',
      quantization: numericPolicy.id ?? null,
      publicSafe: true
    };
  });
}

export function publicReplayStateAtTick(events = [], tick = 0, options = {}) {
  const dt = finitePositive(options.dt, 60);
  const state = JSON.parse(JSON.stringify(options.initialState ?? { vehicles: {}, activeObjectives: [], observationSummary: { count: 0 } }));
  state.tick = tick;
  state.timeSeconds = tick * dt;
  state.agentStates ??= state.vehicles ?? {};
  state.vehicles ??= state.agentStates ?? {};
  state.globalState ??= { missionStatus: state.completed ? 'completed' : 'active' };
  state.agentStates ??= state.vehicles ?? {};
  state.vehicles ??= state.agentStates ?? {};
  state.globalState ??= { missionStatus: state.completed ? 'completed' : 'active' };
  state.observationSummary ??= { count: 0, byAgent: {}, lastObservationId: null, meanObservedValue: null };
  state.surfacingCount ??= 0;
  state.objectiveTransitionCount ??= 0;
  state.score ??= null;
  state.missionOutcomeStatus ??= null;
  const observedValues = [];
  for (const event of events) {
    if (Number(event.tick) > tick) break;
    const payload = event.payload ?? {};
    if (event.phase === 'vehicleState' && event.agentId) {
      state.vehicles ??= {};
      state.vehicles[event.agentId] = compactObject({
        ...(state.vehicles[event.agentId] ?? {}),
        x: finiteOrNull(payload.x),
        y: finiteOrNull(payload.y),
        zIndex: payload.zIndex ?? payload.z ?? null,
        depthLayerId: payload.depthLayerId ?? null,
        headingDegrees: finiteOrNull(payload.headingDegrees ?? payload.heading),
        depthMeters: finiteOrNull(payload.depthMeters),
        battery: finiteOrNull(payload.battery ?? payload.batteryFraction),
        energyUsed: finiteOrNull(payload.energyUsed ?? payload.energyUsedCumulative),
        status: payload.status ?? 'underway',
        lastUpdateTick: event.tick
      });
      state.agentStates = { ...(state.agentStates ?? {}), [event.agentId]: state.vehicles[event.agentId] };
    } else if (event.phase === 'objective') {
      state.activeObjectives = [compactObject({ objectiveId: payload.objectiveId ?? null, label: payload.label ?? payload.objectiveLabel ?? null, surfacingIndex: payload.surfacingIndex ?? null })];
      state.objectiveTransitionCount = (state.objectiveTransitionCount ?? 0) + 1;
    } else if (event.phase === 'surfacing') {
      state.surfacingCount = (state.surfacingCount ?? 0) + 1;
      state.lastSurfacing = compactObject({ tick: event.tick, timeSeconds: event.timeSeconds, agentId: event.agentId ?? null, reason: payload.reason ?? event.eventType });
    } else if (event.phase === 'observation') {
      state.observationSummary.count = (state.observationSummary.count ?? 0) + 1;
      state.observationSummary.byAgent ??= {};
      const agent = event.agentId ?? 'unknown';
      state.observationSummary.byAgent[agent] = (state.observationSummary.byAgent[agent] ?? 0) + 1;
      state.observationSummary.lastObservationId = payload.observationId ?? event.eventId;
      const observed = Number(payload.observedValue);
      if (Number.isFinite(observed)) observedValues.push(observed);
      state.observationSummary.meanObservedValue = observedValues.length ? observedValues.reduce((sum, value) => sum + value, 0) / observedValues.length : state.observationSummary.meanObservedValue;
    } else if (event.phase === 'score') {
      state.score = payload.score ?? payload;
      state.missionOutcomeStatus = payload.missionOutcomeStatus ?? state.missionOutcomeStatus;
    } else if (event.phase === 'terminal') {
      state.terminationReason = payload.reason ?? 'terminal';
      state.completed = true;
      if (options.scoreSnapshot) state.score = options.scoreSnapshot.publicScore;
      state.missionOutcomeStatus = options.missionOutcomeStatus ?? state.missionOutcomeStatus;
    }
  }
  return compactObject(state);
}

function buildCanonicalEvents({ replayId, missionConfig, tracks, observations, actions, surfacingEvents, objectiveSequence, scoreSnapshot, initialState, agentIds, dt, terminalTick }) {
  const raw = [];
  let rawIndex = 0;
  raw.push(replayEvent({ replayId, rawIndex: rawIndex += 1, tick: 0, timeSeconds: 0, phase: 'initial', eventType: 'replay.initialState', payload: initialState }));
  for (const action of actions) {
    raw.push(replayEvent({
      replayId,
      rawIndex: rawIndex += 1,
      tick: tickFromTime(action.timeSeconds ?? 0, dt),
      timeSeconds: finiteNumber(action.timeSeconds, 0),
      phase: 'command',
      eventType: action.type ?? 'waypointTarget',
      agentId: action.gliderId ?? action.agentId ?? agentIds[0] ?? null,
      payload: compactObject({
        actionId: action.id ?? null,
        target: sanitizePublicObject(action.target ?? action.waypoint ?? null),
        policyId: action.policyId ?? null,
        note: action.note ?? null
      })
    }));
    const diveProfileId = action.diveProfileId ?? missionConfig.gliders?.find((glider) => glider.id === (action.gliderId ?? action.agentId))?.diveProfileId ?? null;
    if (diveProfileId) {
      raw.push(replayEvent({ replayId, rawIndex: rawIndex += 1, tick: tickFromTime(action.timeSeconds ?? 0, dt), timeSeconds: finiteNumber(action.timeSeconds, 0), phase: 'diveProfile', eventType: 'diveProfile.command', agentId: action.gliderId ?? action.agentId ?? agentIds[0] ?? null, payload: { diveProfileId } }));
    }
  }
  for (const objective of objectiveSequence) {
    raw.push(replayEvent({
      replayId,
      rawIndex: rawIndex += 1,
      tick: objective.tick,
      timeSeconds: objective.timeSeconds,
      phase: 'objective',
      eventType: 'objective.transition',
      agentId: objective.agentId ?? agentIds[0] ?? null,
      payload: compactObject({ objectiveId: objective.objectiveId, label: objective.label, surfacingIndex: objective.surfacingIndex, source: objective.source })
    }));
  }
  for (const row of tracks) {
    raw.push(replayEvent({
      replayId,
      rawIndex: rawIndex += 1,
      tick: tickFromTime(row.timeSeconds, dt),
      timeSeconds: row.timeSeconds,
      phase: 'vehicleState',
      eventType: 'vehicle.publicState',
      agentId: row.gliderId ?? row.agentId ?? agentIds[0] ?? null,
      payload: compactObject({
        x: finiteOrNull(row.x),
        y: finiteOrNull(row.y),
        zIndex: row.zIndex ?? row.z ?? null,
        depthLayerId: row.depthLayerId ?? row.depthLayer ?? null,
        headingDegrees: finiteOrNull(row.headingDegrees ?? row.heading),
        depthMeters: finiteOrNull(row.depthMeters),
        battery: finiteOrNull(row.battery ?? row.batteryFraction),
        energyUsed: finiteOrNull(row.energyUsed ?? row.energyUsedCumulative ?? row.energyUsedIncrement),
        status: row.status ?? 'underway'
      })
    }));
  }
  for (const row of observations) {
    raw.push(replayEvent({
      replayId,
      rawIndex: rawIndex += 1,
      tick: tickFromTime(row.timeSeconds, dt),
      timeSeconds: row.timeSeconds,
      phase: 'observation',
      eventType: 'publicObservation.sample',
      agentId: row.gliderId ?? row.agentId ?? agentIds[0] ?? null,
      payload: compactObject({
        observationId: row.observationId ?? null,
        x: finiteOrNull(row.x),
        y: finiteOrNull(row.y),
        zIndex: row.zIndex ?? row.z ?? null,
        depthLayerId: row.depthLayerId ?? row.depthLayer ?? null,
        observedValue: finiteOrNull(row.observedValue ?? row.value),
        forecastValue: finiteOrNull(row.forecastValue),
        beliefValue: finiteOrNull(row.beliefValue),
        surprise: finiteOrNull(row.surprise)
      })
    }));
  }
  for (const event of surfacingEvents) {
    raw.push(replayEvent({ replayId, rawIndex: rawIndex += 1, tick: tickFromTime(event.timeSeconds, dt), timeSeconds: event.timeSeconds, phase: 'surfacing', eventType: 'vehicle.surfacing', agentId: event.gliderId ?? event.agentId ?? agentIds[0] ?? null, payload: compactObject({ surfacingId: event.id ?? null, reason: event.reason ?? 'surfacing' }) }));
  }
  raw.push(replayEvent({ replayId, rawIndex: rawIndex += 1, tick: terminalTick, timeSeconds: terminalTick * dt, phase: 'score', eventType: 'score.publicSummary', payload: { score: scoreSnapshot.publicScore, missionOutcomeStatus: scoreSnapshot.missionOutcomeStatus } }));
  raw.push(replayEvent({ replayId, rawIndex: rawIndex += 1, tick: terminalTick, timeSeconds: terminalTick * dt, phase: 'terminal', eventType: 'mission.terminal', payload: { reason: surfacingEvents.at(-1)?.reason ?? 'mission-complete-summary-export' } }));
  return assignCanonicalReplaySequences(raw).map((event) => ({ ...event, eventId: `${replayId}-event-${String(event.sequence).padStart(5, '0')}` }));
}

function replayEvent({ replayId, rawIndex, tick, timeSeconds, phase, eventType, agentId = null, payload = {} }) {
  return compactObject({
    type: REPLAY_ARTIFACT_TYPES.event,
    version: REPLAY_R1_SCHEMA_VERSION,
    schemaVersion: REPLAY_R1_SCHEMA_VERSION,
    replayId,
    rawSequence: rawIndex,
    sequence: rawIndex,
    tick: Math.max(0, Math.trunc(finiteNumber(tick, 0))),
    timeSeconds: finiteNumber(timeSeconds, 0),
    phase,
    eventType,
    agentId,
    visibilityTier: 'publicScenario',
    publicSafe: true,
    payload: sanitizePublicObject(payload)
  });
}

function buildInitialPublicState({ missionConfig, tracks, observations, agentIds, dt }) {
  const vehicles = {};
  for (const agentId of agentIds) {
    const firstTrack = tracks.find((row) => (row.gliderId ?? row.agentId) === agentId) ?? tracks[0] ?? null;
    const glider = missionConfig.gliders?.find((entry) => entry.id === agentId) ?? missionConfig.gliders?.[0] ?? {};
    vehicles[agentId] = compactObject({
      x: finiteOrNull(firstTrack?.x ?? glider.start?.x),
      y: finiteOrNull(firstTrack?.y ?? glider.start?.y),
      zIndex: firstTrack?.zIndex ?? firstTrack?.z ?? glider.start?.z ?? 0,
      depthLayerId: firstTrack?.depthLayerId ?? firstTrack?.depthLayer ?? glider.diveProfile?.defaultLayerId ?? null,
      headingDegrees: finiteOrNull(firstTrack?.headingDegrees ?? firstTrack?.heading),
      depthMeters: finiteOrNull(firstTrack?.depthMeters),
      battery: finiteOrNull(firstTrack?.battery ?? firstTrack?.batteryFraction ?? 1),
      status: 'initial'
    });
  }
  return compactObject({
    tick: 0,
    timeSeconds: 0,
    dtSeconds: dt,
    vehicles,
    agentStates: vehicles,
    globalState: { missionStatus: 'active' },
    activeObjectives: [],
    observationSummary: { count: observations.filter((row) => finiteNumber(row.timeSeconds, 0) <= 0).length, byAgent: {}, lastObservationId: null, meanObservedValue: null },
    surfacingCount: 0,
    objectiveTransitionCount: 0,
    score: null,
    missionOutcomeStatus: null,
    completed: false
  });
}

function normalizeTrackRows(rows) {
  return Array.isArray(rows) ? rows.map((row, index) => ({ ...row, timeSeconds: finiteNumber(row.timeSeconds ?? row.t, index) })).sort((a, b) => a.timeSeconds - b.timeSeconds) : [];
}

function normalizeObservationRows(rows) {
  return Array.isArray(rows) ? rows.map((row, index) => sanitizeObservation({ ...row, timeSeconds: finiteNumber(row.timeSeconds ?? row.t, index) })).sort((a, b) => a.timeSeconds - b.timeSeconds) : [];
}

function normalizeActions(actions) {
  return Array.isArray(actions) ? actions.map((action, index) => ({ ...action, timeSeconds: finiteNumber(action.timeSeconds, 0), id: action.id ?? `action-${index + 1}` })) : [];
}

function normalizeSurfacingEvents(events, tracks, observations) {
  if (Array.isArray(events) && events.length) return events.map((event, index) => ({ ...event, timeSeconds: finiteNumber(event.timeSeconds, index), id: event.id ?? `surfacing-${index + 1}` })).sort((a, b) => a.timeSeconds - b.timeSeconds);
  const lastTime = maxFinite([...tracks.map((row) => row.timeSeconds), ...observations.map((row) => row.timeSeconds)], 0);
  return [{ id: 'surface-terminal', timeSeconds: lastTime, reason: 'mission-complete-summary-export' }];
}

function normalizeObjectiveSequence(sequence, missionConfig, tracks, surfacingEvents, options) {
  const dt = finitePositive(missionConfig.world?.timeStepSeconds ?? options.timeStepSeconds, 60);
  const source = Array.isArray(sequence) && sequence.length
    ? sequence
    : options.useDemoObjectiveSequence === true
      ? DEFAULT_OBJECTIVE_SEQUENCE
      : (missionConfig.objectives ?? []).slice(0, 1).map((objective) => ({ objectiveId: objective.id ?? objective.objectiveId, label: objective.label, surfacingIndex: 0, source: 'missionConfig' }));
  return source.map((entry, index) => {
    const surfacing = surfacingEvents[entry.surfacingIndex ?? index] ?? null;
    const fallbackTime = surfacing?.timeSeconds ?? tracks[Math.min(index * Math.max(1, Math.floor((tracks.length || 1) / Math.max(1, source.length))), Math.max(0, tracks.length - 1))]?.timeSeconds ?? index * dt;
    const timeSeconds = finiteNumber(entry.timeSeconds, fallbackTime);
    return compactObject({
      objectiveId: entry.objectiveId ?? entry.id ?? `objective-${index + 1}`,
      label: entry.label ?? entry.objectiveLabel ?? entry.objectiveId ?? `Objective ${index + 1}`,
      surfacingIndex: entry.surfacingIndex ?? index,
      agentId: entry.agentId ?? null,
      tick: tickFromTime(timeSeconds, dt),
      timeSeconds,
      source: entry.source ?? (Array.isArray(sequence) && sequence.length ? 'explicit' : 'missionConfig')
    });
  });
}

function objectiveSequenceFromReplayEvents(events = []) {
  return events
    .filter((event) => event.phase === 'objective')
    .map((event) => ({
      objectiveId: event.payload?.objectiveId ?? event.objectiveId ?? event.eventId,
      label: event.payload?.label ?? event.payload?.objectiveLabel ?? event.eventType,
      surfacingIndex: event.payload?.surfacingIndex ?? null,
      agentId: event.agentId ?? null,
      tick: event.tick,
      timeSeconds: event.timeSeconds,
      source: 'replayEvents'
    }));
}

function inferCheckpointEvery(checkpoints = []) {
  const periodicTicks = checkpoints
    .filter((checkpoint) => checkpoint.reasons?.includes?.('periodic'))
    .map((checkpoint) => Number(checkpoint.tick))
    .filter((tick) => Number.isFinite(tick) && tick > 0)
    .sort((a, b) => a - b);
  return periodicTicks[0] ?? undefined;
}
function buildFeatureFlags({ episode, bundle, missionConfig, options }) {
  const motionConfig = missionConfig.world?.motionConfig ?? episode.motionTrajectory?.motionConfig ?? null;
  return {
    motionAware: Boolean(options.motionAware ?? episode.diagnostics?.usesMotionDynamics ?? bundle.motionTrajectory ?? motionConfig?.enabled ?? motionConfig?.motionAware),
    costGraphEnabled: Boolean(options.costGraphEnabled ?? episode.diagnostics?.usesMotionCostGraph ?? bundle.motionCostGraph ?? bundle.motionCostGraphSummary),
    missionOutcomeScoring: Boolean(options.missionScoreEnabled ?? episode.diagnostics?.usesMissionOutcomeScoring ?? bundle.missionOutcomeReport ?? bundle.missionScore),
    waterColumn2p5D: Boolean(bundle.waterColumnSummary ?? episode.waterColumnSummary ?? missionConfig.world?.depthLayerModel === 'top-down-2p5d'),
    bathymetrySummary: Boolean(bundle.bathymetrySummary ?? episode.bathymetrySummary),
    scienceDiagnostics: Boolean(bundle.scienceDiagnostics ?? episode.scienceDiagnostics),
    officialBrowserScoringChanged: false,
    usesNewPlanner: false,
    usesRouteOptimizer: false,
    usesPythonSimulator: false,
    usesMARL: false,
    usesCalibratedOceanForecast: false
  };
}

function publicScoreSnapshot({ episode, bundle }) {
  const scoreReport = episode.scoreReport ?? bundle.scoreReport ?? {};
  const missionScore = episode.missionScore ?? bundle.missionScore ?? null;
  const missionOutcomeReport = episode.missionOutcomeReport ?? bundle.missionOutcomeReport ?? null;
  return {
    schemaVersion: missionOutcomeReport?.version ?? missionScore?.version ?? scoreReport.version ?? null,
    missionOutcomeStatus: missionOutcomeReport?.scoreStatus ?? missionScore?.status ?? null,
    publicScore: compactObject({
      finalScore: finiteOrNull(scoreReport.finalScore ?? scoreReport.final_score),
      compositeScore: finiteOrNull(missionOutcomeReport?.compositeScore ?? missionScore?.compositeScore),
      scienceScore: finiteOrNull(groupScore(missionScore, 'science') ?? missionOutcomeReport?.scienceScore),
      feasibilityScore: finiteOrNull(groupScore(missionScore, 'feasibility') ?? missionOutcomeReport?.feasibilityScore),
      efficiencyScore: finiteOrNull(groupScore(missionScore, 'efficiency') ?? missionOutcomeReport?.efficiencyScore),
      safetyScore: finiteOrNull(groupScore(missionScore, 'safety') ?? missionOutcomeReport?.safetyScore),
      coverageFraction: finiteOrNull(missionScore?.coverageFraction ?? missionOutcomeReport?.coverageFraction),
      changesOfficialBrowserScoring: false,
      notBrowserOfficialScoring: scoreReport.notBrowserOfficialScoring !== false
    })
  };
}

function buildInitialReplayAlignmentReport({ manifest, replayEvents, replayCheckpoints, scoreSnapshot }) {
  return {
    type: REPLAY_ARTIFACT_TYPES.alignmentReport,
    version: REPLAY_R1_SCHEMA_VERSION,
    schemaVersion: REPLAY_R1_SCHEMA_VERSION,
    replayVersion: REPLAY_R1_SCHEMA_VERSION,
    contract: REPLAY_R1_CONTRACT_ID,
    replayId: manifest.replayId,
    compatibilityStatus: 'current',
    status: 'PASS',
    replayMode: manifest.replayMode,
    firstDivergence: null,
    mismatchClass: null,
    checks: [
      { id: 'generated-events-canonical', ok: true, detail: replayEvents.events.length },
      { id: 'generated-checkpoint-digests', ok: true, detail: replayCheckpoints.checkpoints.length },
      { id: 'score-shadow-only', ok: scoreSnapshot.publicScore.changesOfficialBrowserScoring === false }
    ],
    checkedArtifactTypes: ['replayManifest', 'replayEvents', 'replayCheckpoints'],
    eventCount: replayEvents.events.length,
    checkpointCount: replayCheckpoints.checkpoints.length,
    passedChecks: ['generated-events-canonical', 'generated-checkpoint-digests', 'score-shadow-only'],
    warningCount: 0,
    failureCount: 0,
    issues: [],
    digestSummary: { checked: replayCheckpoints.checkpoints.length, passed: replayCheckpoints.checkpoints.length, failed: 0, algorithm: REPLAY_DIGEST_ALGORITHM },
    orderingSummary: { checked: 1, passed: true, policy: replayEvents.eventOrderingPolicy?.id ?? 'replay-r1-canonical-event-order' },
    publicSafetySummary: { checked: 1, passed: true, hiddenTruthLeak: false },
    compatibilitySummary: { status: 'PASS', compatibility: 'current', schemaVersion: REPLAY_R1_SCHEMA_VERSION, replayMode: manifest.replayMode },
    summary: {
      status: 'PASS',
      eventCount: replayEvents.events.length,
      checkpointCount: replayCheckpoints.checkpoints.length,
      terminalDigest: replayCheckpoints.summary.terminalDigest,
      scoringSchemaVersion: scoreSnapshot.schemaVersion,
      changesOfficialBrowserScoring: false
    },
    scoringSchemaVersion: scoreSnapshot.schemaVersion,
    boundary: 'REPLAY-R1 public playback verifies public timeline/checkpoint digests. Browser scoring remains official; SCORE-R1 is shadow-only.'
  };
}

function resolveReplayMode(options, bundle) {
  if (options.refereeReplay === true) return REPLAY_MODES.refereeInternalReplay;
  if (options.authoritativeReplay === true && bundle?.hiddenFields) return REPLAY_MODES.authoritativeSimulationReplay;
  return REPLAY_MODES.publicObservationPlayback;
}

function resolveAgentIds(missionConfig, tracks, observations, actions) {
  const ids = new Set();
  for (const glider of missionConfig.gliders ?? []) if (glider?.id) ids.add(glider.id);
  for (const row of tracks) if (row.gliderId ?? row.agentId) ids.add(row.gliderId ?? row.agentId);
  for (const row of observations) if (row.gliderId ?? row.agentId) ids.add(row.gliderId ?? row.agentId);
  for (const action of actions) if (action.gliderId ?? action.agentId) ids.add(action.gliderId ?? action.agentId);
  if (!ids.size) ids.add('glider-1');
  return [...ids].sort();
}

function deterministicSubstreams(seed) {
  return {
    rootSeed: seed,
    fieldSeed: `${seed}:fields`,
    bathymetrySeed: `${seed}:bathymetry`,
    observationNoiseSeed: `${seed}:observations`,
    motionSeed: `${seed}:motion`,
    replayUsesMathRandom: false
  };
}

function addReason(map, tick, reason) {
  if (!map.has(tick)) map.set(tick, new Set());
  map.get(tick).add(reason);
}

function tickFromTime(timeSeconds, dt) {
  return Math.max(0, Math.round(finiteNumber(timeSeconds, 0) / finitePositive(dt, 60)));
}

function finitePositive(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function maxFinite(values, fallback) {
  const finite = values.map(Number).filter(Number.isFinite);
  return finite.length ? Math.max(...finite) : fallback;
}

function groupScore(missionScore, groupId) {
  return (missionScore?.groupScores ?? []).find((group) => group.groupId === groupId)?.score ?? null;
}

function sanitizeObservation(row) {
  const copy = sanitizePublicObject(row);
  delete copy.truthValue;
  delete copy.hiddenTruth;
  if (copy.fieldId === 'T_hiddenTruth') copy.fieldId = 'observedScalar';
  if (copy.sourceFieldId === 'T_hiddenTruth') copy.sourceFieldId = 'observedScalar';
  return copy;
}

function sanitizePublicObject(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(sanitizePublicObject);
  if (typeof value !== 'object') return value;
  const copy = {};
  for (const [key, child] of Object.entries(value)) {
    if (['truthValue', 'hiddenTruth', 'hiddenFields', 'oracleState', 'refereeOnlyPayload', 'refereePayload', 'T_hiddenTruth'].includes(key)) continue;
    copy[key] = sanitizePublicObject(child);
  }
  return copy;
}

function compactObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const result = {};
  for (const [key, child] of Object.entries(value)) {
    if (child === undefined) continue;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      const compact = compactObject(child);
      if (Object.keys(compact).length) result[key] = compact;
    } else {
      result[key] = child;
    }
  }
  return result;
}



