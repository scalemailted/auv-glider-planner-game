import {
  createReplayPlaybackState,
  jumpReplayPlaybackToCheckpoint,
  jumpReplayPlaybackToEventIndex,
  replayPlaybackSummary,
  selectReplayPlaybackAgent,
  setReplayPlaybackPlaying,
  stepReplayPlayback
} from './ReplayPlayback.js';

export const THREE_REPLAY_PLAYBACK_REDUCER_VERSION = 'three-replay-playback-reducer-r2a';

export function replayPlaybackReducer(state = null, action = {}, source = {}, options = {}) {
  const type = action?.type ?? 'init';
  const current = state ?? createReplayPlaybackState(source, options);
  if (type === 'init' || type === 'initialize') {
    return withReducerMetadata(createReplayPlaybackState(source, { ...options, selectedAgentId: action.selectedAgentId ?? options.selectedAgentId }), action);
  }
  if (type === 'play') return withReducerMetadata(setReplayPlaybackPlaying(current, true), action);
  if (type === 'pause') return withReducerMetadata(setReplayPlaybackPlaying(current, false), action);
  if (type === 'togglePlay') return withReducerMetadata(setReplayPlaybackPlaying(current, current.playing !== true), action);
  if (type === 'stepForward' || type === 'step') return withReducerMetadata(stepReplayPlayback(current, source, action.direction ?? 1), action);
  if (type === 'stepBack') return withReducerMetadata(stepReplayPlayback(current, source, -1), action);
  if (type === 'jumpCheckpoint') return withReducerMetadata(jumpReplayPlaybackToCheckpoint(current, source, action.selector ?? action.checkpointSelector ?? action.checkpointIndex ?? 'next'), action);
  if (type === 'jumpEventIndex' || type === 'scrub') return withReducerMetadata(jumpReplayPlaybackToEventIndex(current, source, action.eventIndex ?? action.index ?? 0), action);
  if (type === 'selectAgent') return withReducerMetadata(selectReplayPlaybackAgent(current, action.agentId ?? null), action);
  if (type === 'setSpeed') return withReducerMetadata({ ...current, speed: normalizeSpeed(action.speed ?? action.playbackSpeed ?? current.speed), message: `Replay playback speed set to ${normalizeSpeed(action.speed ?? action.playbackSpeed ?? current.speed)}x.` }, action);
  return withReducerMetadata({ ...current, message: `Unsupported replay playback action: ${type}.` }, action);
}

export function replayPlaybackReducerSummary(state = {}, source = {}) {
  const summary = replayPlaybackSummary(state, source);
  return {
    type: 'anchor.replay.playback-reducer-summary',
    version: THREE_REPLAY_PLAYBACK_REDUCER_VERSION,
    ...summary,
    speed: normalizeSpeed(state.speed),
    lastActionType: state.lastActionType ?? null,
    reducerOwnsSimulation: false,
    reducerOwnsScoring: false,
    reducerOwnsPlanning: false,
    usesHiddenTruthResimulation: false,
    changesOfficialBrowserScoring: false
  };
}

function withReducerMetadata(state = {}, action = {}) {
  return {
    ...state,
    version: state.version ?? THREE_REPLAY_PLAYBACK_REDUCER_VERSION,
    speed: normalizeSpeed(state.speed ?? action.speed ?? action.playbackSpeed),
    lastActionType: action.type ?? 'init',
    reducerBoundaryFlags: {
      ownsSimulation: false,
      ownsScoring: false,
      ownsPlanning: false,
      usesHiddenTruthResimulation: false,
      changesOfficialBrowserScoring: false
    }
  };
}

function normalizeSpeed(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 1;
  return Math.max(0.25, Math.min(8, Number(number.toFixed(2))));
}
