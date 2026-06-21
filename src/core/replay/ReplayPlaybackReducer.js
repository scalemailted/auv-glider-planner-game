import {
  createReplayPlaybackState,
  jumpReplayPlaybackToCheckpoint,
  jumpReplayPlaybackToEventIndex,
  replayPlaybackSummary,
  selectReplayPlaybackAgent,
  setReplayPlaybackPlaying,
  stepReplayPlayback
} from './ReplayPlayback.js';
import { publicReplayStateDigest } from './ReplayDigest.js';

export const THREE_REPLAY_PLAYBACK_REDUCER_VERSION = 'three-replay-playback-reducer-r2a-1';

export function replayPlaybackReducer(state = null, action = {}, source = {}, options = {}) {
  const type = action?.type ?? 'init';
  const current = state ?? createReplayPlaybackState(source, options);
  if (type === 'init' || type === 'initialize') {
    return withReducerMetadata(createReplayPlaybackState(source, { ...options, selectedAgentId: action.selectedAgentId ?? options.selectedAgentId }), action, null, source);
  }
  if (type === 'play') return withReducerMetadata(setReplayPlaybackPlaying(current, true), action, current, source);
  if (type === 'pause') return withReducerMetadata(setReplayPlaybackPlaying(current, false), action, current, source);
  if (type === 'togglePlay') return withReducerMetadata(setReplayPlaybackPlaying(current, current.playing !== true), action, current, source);
  if (type === 'stepForward' || type === 'step' || type === 'nextEvent') return withReducerMetadata(stepReplayPlayback(current, source, action.direction ?? 1), { ...action, type: 'stepForward' }, current, source);
  if (type === 'stepBack' || type === 'previousEvent') return withReducerMetadata(stepReplayPlayback(current, source, -1), { ...action, type: 'stepBack' }, current, source);
  if (type === 'jumpCheckpoint') return withReducerMetadata(jumpReplayPlaybackToCheckpoint(current, source, action.selector ?? action.checkpointSelector ?? action.checkpointIndex ?? 'next'), action, current, source);
  if (type === 'jumpEventIndex' || type === 'scrub') return withReducerMetadata(jumpReplayPlaybackToEventIndex(current, source, action.eventIndex ?? action.index ?? 0), action, current, source);
  if (type === 'selectAgent') return withReducerMetadata(selectReplayPlaybackAgent(current, action.agentId ?? null), action, current, source);
  if (type === 'setSpeed') return withReducerMetadata({ ...current, speed: normalizeSpeed(action.speed ?? action.playbackSpeed ?? current.speed), message: `Replay playback speed set to ${normalizeSpeed(action.speed ?? action.playbackSpeed ?? current.speed)}x.` }, action, current, source);
  return withReducerMetadata({ ...current, message: `Unsupported replay playback action: ${type}.` }, action, current, source);
}

export function replayPlaybackReducerSummary(state = {}, source = {}) {
  const summary = replayPlaybackSummary(state, source);
  const diagnostics = state.replayDiagnostics ?? buildReplayDiagnostics(state, {}, {}, source);
  return {
    type: 'anchor.replay.playback-reducer-summary',
    version: THREE_REPLAY_PLAYBACK_REDUCER_VERSION,
    ...summary,
    speed: normalizeSpeed(state.speed),
    lastActionType: state.lastActionType ?? null,
    publicStateDigest: state.publicStateDigest ?? diagnostics.publicStateDigest ?? null,
    replayReducerRunCount: Number(diagnostics.replayReducerRunCount ?? 0),
    checkpointRestoreCount: Number(diagnostics.checkpointRestoreCount ?? 0),
    forwardReplayEventCount: Number(diagnostics.forwardReplayEventCount ?? 0),
    reverseNavigationCount: Number(diagnostics.reverseNavigationCount ?? 0),
    reducedStateCacheHitCount: Number(diagnostics.reducedStateCacheHitCount ?? 0),
    reducedStateCacheMissCount: Number(diagnostics.reducedStateCacheMissCount ?? 0),
    usesSharedReplayReducer: true,
    replayOwnsSimulation: false,
    replayOwnsScoring: false,
    rendererOwnsReplaySemantics: false,
    includesHiddenTruth: false,
    reducerOwnsSimulation: false,
    reducerOwnsScoring: false,
    reducerOwnsPlanning: false,
    usesHiddenTruthResimulation: false,
    changesOfficialBrowserScoring: false
  };
}

function withReducerMetadata(state = {}, action = {}, previousState = null, source = {}) {
  const diagnostics = buildReplayDiagnostics(state, action, previousState, source);
  return {
    ...state,
    version: state.version ?? THREE_REPLAY_PLAYBACK_REDUCER_VERSION,
    speed: normalizeSpeed(state.speed ?? action.speed ?? action.playbackSpeed),
    lastActionType: action.type ?? 'init',
    publicStateDigest: diagnostics.publicStateDigest,
    replayDiagnostics: diagnostics,
    reducerBoundaryFlags: {
      ownsSimulation: false,
      ownsScoring: false,
      ownsPlanning: false,
      ownsReplaySemantics: false,
      includesHiddenTruth: false,
      usesHiddenTruthResimulation: false,
      changesOfficialBrowserScoring: false,
      usesSharedReplayReducer: true
    }
  };
}

function buildReplayDiagnostics(state = {}, action = {}, previousState = null, source = {}) {
  const previous = previousState?.replayDiagnostics ?? {};
  const type = action?.type ?? 'init';
  const previousIndex = Number(previousState?.eventIndex ?? -1);
  const nextIndex = Number(state?.eventIndex ?? -1);
  const movedBackward = previousState && nextIndex >= 0 && previousIndex >= 0 && nextIndex < previousIndex;
  const navigationAction = ['stepForward', 'step', 'nextEvent', 'stepBack', 'previousEvent', 'jumpCheckpoint', 'jumpEventIndex', 'scrub'].includes(type);
  const selectionOnly = type === 'selectAgent' || type === 'setSpeed' || type === 'play' || type === 'pause' || type === 'togglePlay';
  const checkpointRestore = type === 'jumpCheckpoint' || type === 'stepBack' || type === 'previousEvent' || movedBackward;
  const forwardReplayDelta = previousState && nextIndex > previousIndex ? nextIndex - previousIndex : 0;
  const checkpointForwardReplay = checkpointRestore ? Math.max(0, Number(state?.currentCheckpoint?.eventCursor ?? 0)) : 0;
  const digest = safePublicDigest(state?.publicState);
  return {
    replayReducerRunCount: Number(previous.replayReducerRunCount ?? 0) + (navigationAction && !selectionOnly ? 1 : 0),
    checkpointRestoreCount: Number(previous.checkpointRestoreCount ?? 0) + (checkpointRestore ? 1 : 0),
    forwardReplayEventCount: Number(previous.forwardReplayEventCount ?? 0) + Math.max(forwardReplayDelta, checkpointForwardReplay),
    reverseNavigationCount: Number(previous.reverseNavigationCount ?? 0) + (type === 'stepBack' || type === 'previousEvent' || movedBackward ? 1 : 0),
    reducedStateCacheHitCount: Number(previous.reducedStateCacheHitCount ?? 0),
    reducedStateCacheMissCount: Number(previous.reducedStateCacheMissCount ?? 0) + (navigationAction ? 1 : 0),
    publicStateDigest: digest?.value ?? null,
    publicStateDigestAlgorithm: digest?.algorithm ?? null,
    cameraDisplayStateExcluded: true,
    inversePhysicsUsed: false,
    usesSharedReplayReducer: true,
    replayOwnsSimulation: false,
    replayOwnsScoring: false,
    rendererOwnsReplaySemantics: false,
    includesHiddenTruth: false,
    eventCount: Number(state?.eventCount ?? replayPlaybackSummary(state, source).eventCount ?? 0),
    checkpointCount: Number(state?.checkpointCount ?? replayPlaybackSummary(state, source).checkpointCount ?? 0)
  };
}

function safePublicDigest(publicState) {
  try {
    return publicReplayStateDigest(publicState ?? {});
  } catch {
    return { value: null, algorithm: null };
  }
}

function normalizeSpeed(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 1;
  return Math.max(0.25, Math.min(8, Number(number.toFixed(2))));
}
