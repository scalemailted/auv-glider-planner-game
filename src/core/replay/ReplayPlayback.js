import { publicReplayStateAtTick, buildReplayArtifactsFromBundle } from './ReplayContractBuilder.js';
import { normalizeReplayArtifacts, replayArtifactsSummary } from './ReplaySchema.js';

export function createReplayPlaybackState(source = {}, options = {}) {
  const artifacts = normalizeReplayArtifacts(source);
  const resolved = artifacts.present ? artifacts : normalizeReplayArtifacts(buildReplayArtifactsFromBundle(source, options));
  const events = resolved.events?.events ?? [];
  const checkpoints = resolved.checkpoints?.checkpoints ?? [];
  const manifest = resolved.manifest ?? {};
  const initialCheckpoint = checkpoints[0] ?? null;
  return {
    type: 'anchor.headless.replay-playback-state',
    version: 'replay-r1-playback-v1',
    replayId: manifest.replayId ?? null,
    replayMode: manifest.replayMode ?? null,
    replayFidelity: manifest.replayFidelity ?? null,
    compatibilityStatus: manifest.compatibilityStatus ?? (resolved.legacyReplay ? 'legacy-limited' : null),
    status: resolved.present ? 'ready' : resolved.legacyReplay ? 'legacy-limited' : 'unavailable',
    playing: false,
    eventIndex: events.length ? 0 : -1,
    checkpointIndex: initialCheckpoint ? 0 : -1,
    currentTick: initialCheckpoint?.tick ?? events[0]?.tick ?? 0,
    currentEvent: events[0] ?? null,
    currentCheckpoint: initialCheckpoint,
    publicState: initialCheckpoint?.publicState ?? manifest.initialState ?? null,
    eventCount: events.length,
    checkpointCount: checkpoints.length,
    objectiveTransitions: events.filter((event) => event.phase === 'objective').map(compactEventSummary),
    surfacingEvents: events.filter((event) => event.phase === 'surfacing').map(compactEventSummary),
    terminalDigest: checkpoints.at(-1)?.digest?.value ?? null,
    message: resolved.present ? 'REPLAY-R1 playback ready.' : resolved.legacyReplay ? 'Legacy replay metadata only; deterministic alignment is unavailable.' : 'No replay artifacts loaded.'
  };
}

export function stepReplayPlayback(state = {}, source = {}, direction = 1) {
  const artifacts = normalizeReplayArtifacts(source);
  const events = artifacts.events?.events ?? [];
  const checkpoints = artifacts.checkpoints?.checkpoints ?? [];
  if (!events.length) return { ...state, status: state.status ?? 'unavailable', message: 'No replay events are available.' };
  const nextIndex = clamp((state.eventIndex ?? -1) + Math.sign(direction || 1), 0, events.length - 1);
  return stateAtEventIndex(state, events, checkpoints, nextIndex);
}

export function jumpReplayPlaybackToCheckpoint(state = {}, source = {}, checkpointSelector = 'next') {
  const artifacts = normalizeReplayArtifacts(source);
  const events = artifacts.events?.events ?? [];
  const checkpoints = artifacts.checkpoints?.checkpoints ?? [];
  if (!checkpoints.length) return { ...state, message: 'No replay checkpoints are available.' };
  let nextCheckpointIndex = state.checkpointIndex ?? 0;
  if (checkpointSelector === 'start') nextCheckpointIndex = 0;
  else if (checkpointSelector === 'terminal' || checkpointSelector === 'end') nextCheckpointIndex = checkpoints.length - 1;
  else if (checkpointSelector === 'next') nextCheckpointIndex = clamp(nextCheckpointIndex + 1, 0, checkpoints.length - 1);
  else if (checkpointSelector === 'previous') nextCheckpointIndex = clamp(nextCheckpointIndex - 1, 0, checkpoints.length - 1);
  else if (typeof checkpointSelector === 'number') nextCheckpointIndex = clamp(Math.trunc(checkpointSelector), 0, checkpoints.length - 1);
  else {
    const found = checkpoints.findIndex((checkpoint) => checkpoint.reasons?.includes?.(checkpointSelector));
    if (found >= 0) nextCheckpointIndex = found;
  }
  const checkpoint = checkpoints[nextCheckpointIndex];
  const eventIndex = Math.max(0, events.findLastIndex ? events.findLastIndex((event) => event.tick <= checkpoint.tick) : findLastEventIndex(events, checkpoint.tick));
  return {
    ...stateAtEventIndex(state, events, checkpoints, eventIndex),
    checkpointIndex: nextCheckpointIndex,
    currentCheckpoint: checkpoint,
    currentTick: checkpoint.tick,
    publicState: checkpoint.publicState,
    message: `Jumped to checkpoint ${checkpoint.checkpointId ?? nextCheckpointIndex}.`
  };
}

export function setReplayPlaybackPlaying(state = {}, playing = false) {
  return { ...state, playing: Boolean(playing), message: Boolean(playing) ? 'Replay playback is playing through recorded events.' : 'Replay playback paused.' };
}

export function replayPlaybackSummary(state = {}, source = {}) {
  const summary = replayArtifactsSummary(source);
  return {
    present: summary.present,
    legacyLimited: summary.legacyLimited,
    replayMode: state.replayMode ?? summary.replayMode,
    replayFidelity: state.replayFidelity ?? summary.replayFidelity,
    compatibilityStatus: state.compatibilityStatus ?? summary.compatibilityStatus,
    status: state.status ?? null,
    playing: state.playing === true,
    currentTick: state.currentTick ?? null,
    currentEventIndex: state.eventIndex ?? -1,
    currentCheckpointIndex: state.checkpointIndex ?? -1,
    currentObjectiveId: state.publicState?.activeObjectives?.[0]?.objectiveId ?? null,
    currentObjectiveLabel: state.publicState?.activeObjectives?.[0]?.label ?? null,
    surfacingCount: state.publicState?.surfacingCount ?? 0,
    observationCount: state.publicState?.observationSummary?.count ?? 0,
    eventCount: state.eventCount ?? summary.eventCount,
    checkpointCount: state.checkpointCount ?? summary.checkpointCount,
    terminalDigest: state.terminalDigest ?? summary.terminalDigest,
    message: state.message ?? null
  };
}

function stateAtEventIndex(state, events, checkpoints, eventIndex) {
  const event = events[eventIndex] ?? null;
  const checkpointIndex = Math.max(0, checkpoints.findLastIndex ? checkpoints.findLastIndex((checkpoint) => checkpoint.tick <= (event?.tick ?? 0)) : findLastCheckpointIndex(checkpoints, event?.tick ?? 0));
  const checkpoint = checkpoints[checkpointIndex] ?? null;
  return {
    ...state,
    eventIndex,
    checkpointIndex,
    currentEvent: event,
    currentCheckpoint: checkpoint,
    currentTick: event?.tick ?? checkpoint?.tick ?? 0,
    publicState: checkpoint?.publicState ?? state.publicState ?? null,
    status: 'ready',
    message: event ? `At event ${event.sequence}: ${event.eventType}.` : 'Replay event unavailable.'
  };
}

function compactEventSummary(event) {
  return {
    sequence: event.sequence,
    tick: event.tick,
    timeSeconds: event.timeSeconds,
    phase: event.phase,
    eventType: event.eventType,
    agentId: event.agentId ?? null,
    objectiveId: event.payload?.objectiveId ?? null,
    label: event.payload?.label ?? event.payload?.objectiveLabel ?? null,
    reason: event.payload?.reason ?? null
  };
}

function findLastEventIndex(events, tick) {
  let found = -1;
  for (let index = 0; index < events.length; index += 1) if (events[index].tick <= tick) found = index;
  return found;
}

function findLastCheckpointIndex(checkpoints, tick) {
  let found = -1;
  for (let index = 0; index < checkpoints.length; index += 1) if (checkpoints[index].tick <= tick) found = index;
  return found;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
