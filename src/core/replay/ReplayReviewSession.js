import { normalizeReplayArtifacts, replayArtifactsSummary } from './ReplaySchema.js';
import { verifyReplayIntegrity, replayIntegritySummary } from './ReplayIntegrityVerifier.js';
import { replayPlaybackReducer, replayPlaybackReducerSummary } from './ReplayPlaybackReducer.js';
import { replayReviewSourceSummary } from './ReplayReviewLoader.js';

export const REPLAY_REVIEW_SESSION_VERSION = 'replay-review-session-r2a';

export function createReplayReviewSession(source = {}, options = {}) {
  const replayArtifacts = source.replayArtifacts ?? normalizeReplayArtifacts(source);
  const playbackState = replayPlaybackReducer(null, { type: 'init', selectedAgentId: options.selectedAgentId ?? source.selectedAgentId ?? null }, replayArtifacts, options);
  const integrityReport = source.integrityReport ?? (replayArtifacts.present ? verifyReplayIntegrity({ ...replayArtifacts, options: { allowWarnings: true, verifyAlignmentReport: false } }) : null);
  const integritySummary = integrityReport ? replayIntegritySummary(integrityReport) : null;
  const warningState = buildWarningState(source, replayArtifacts, integrityReport);
  return {
    type: 'anchor.replay.review-session',
    version: REPLAY_REVIEW_SESSION_VERSION,
    source,
    replayArtifacts,
    playbackState,
    integrityReport,
    integritySummary,
    validation: source.validation ?? null,
    warningState,
    timeline: buildTimeline(replayArtifacts, playbackState),
    controls: {
      canPlay: replayArtifacts.present === true && integritySummary?.status !== 'FAIL',
      canStep: replayArtifacts.present === true,
      canScrub: replayArtifacts.present === true,
      canJumpCheckpoints: (replayArtifacts.checkpoints?.checkpoints ?? []).length > 0
    },
    selectedAgentId: playbackState.selectedAgentId ?? null,
    publicBoundary: {
      ...(source.publicBoundary ?? {}),
      publicSafe: source.publicBoundary?.publicSafe !== false,
      hiddenTruthIncluded: false,
      usesHiddenTruthResimulation: false,
      usesAuthoritativeHiddenStateReplay: false,
      changesOfficialBrowserScoring: false,
      ownsSimulation: false,
      ownsScoring: false,
      ownsPlanning: false
    },
    options: { playbackIntervalMs: options.playbackIntervalMs ?? 550 }
  };
}

export function reduceReplayReviewSession(session = null, action = {}) {
  const current = session ?? createReplayReviewSession(action.source ?? {});
  const replayArtifacts = current.replayArtifacts ?? current.source?.replayArtifacts ?? normalizeReplayArtifacts(current.source ?? {});
  const playbackState = replayPlaybackReducer(current.playbackState, action, replayArtifacts, current.options ?? {});
  return {
    ...current,
    playbackState,
    selectedAgentId: playbackState.selectedAgentId ?? null,
    timeline: buildTimeline(replayArtifacts, playbackState),
    controls: {
      ...(current.controls ?? {}),
      canPlay: replayArtifacts.present === true && current.integritySummary?.status !== 'FAIL',
      canStep: replayArtifacts.present === true,
      canScrub: replayArtifacts.present === true,
      canJumpCheckpoints: (replayArtifacts.checkpoints?.checkpoints ?? []).length > 0
    }
  };
}

export function replayReviewSessionSummary(session = {}) {
  const artifactSummary = replayArtifactsSummary(session.replayArtifacts ?? session.source?.replayArtifacts ?? {});
  const sourceSummary = replayReviewSourceSummary(session.source ?? {});
  const playbackSummary = replayPlaybackReducerSummary(session.playbackState ?? {}, session.replayArtifacts ?? {});
  return {
    type: 'anchor.replay.review-session-summary',
    version: REPLAY_REVIEW_SESSION_VERSION,
    sourceKind: session.source?.sourceKind ?? null,
    replayMode: artifactSummary.replayMode,
    replayFidelity: artifactSummary.replayFidelity,
    eventCount: artifactSummary.eventCount,
    checkpointCount: artifactSummary.checkpointCount,
    currentTick: playbackSummary.currentTick,
    currentEventIndex: playbackSummary.currentEventIndex,
    currentCheckpointIndex: playbackSummary.currentCheckpointIndex,
    currentEventId: playbackSummary.currentEventId,
    currentCheckpointId: playbackSummary.currentCheckpointId,
    selectedAgentId: playbackSummary.selectedAgentId,
    agentCount: playbackSummary.agentCount,
    integrityStatus: session.integritySummary?.status ?? sourceSummary.integrityStatus ?? null,
    failureCodes: session.integritySummary?.failureCodes ?? sourceSummary.failureCodes ?? [],
    warningCount: session.warningState?.warnings?.length ?? 0,
    canPlay: session.controls?.canPlay === true,
    publicSafe: session.publicBoundary?.publicSafe !== false,
    hiddenTruthIncluded: false,
    usesHiddenTruthResimulation: false,
    usesAuthoritativeHiddenStateReplay: false,
    changesOfficialBrowserScoring: false,
    ownsSimulation: false,
    ownsScoring: false,
    ownsPlanning: false
  };
}

function buildTimeline(replayArtifacts = {}, playbackState = {}) {
  const events = replayArtifacts.events?.events ?? [];
  const checkpoints = replayArtifacts.checkpoints?.checkpoints ?? [];
  return {
    eventCount: events.length,
    checkpointCount: checkpoints.length,
    currentEventIndex: playbackState.eventIndex ?? -1,
    currentCheckpointIndex: playbackState.checkpointIndex ?? -1,
    currentTick: playbackState.currentTick ?? 0,
    terminalTick: replayArtifacts.manifest?.timingModel?.terminalTick ?? checkpoints.at(-1)?.tick ?? events.at(-1)?.tick ?? 0,
    currentEvent: playbackState.currentEvent ?? null,
    currentCheckpoint: playbackState.currentCheckpoint ?? null,
    nearbyEvents: events.slice(Math.max(0, Number(playbackState.eventIndex ?? 0) - 3), Math.min(events.length, Number(playbackState.eventIndex ?? 0) + 4)),
    checkpoints: checkpoints.map((checkpoint, index) => ({ checkpointId: checkpoint.checkpointId, index, tick: checkpoint.tick, reason: checkpoint.reason, reasons: checkpoint.reasons ?? [] }))
  };
}

function buildWarningState(source = {}, replayArtifacts = {}, integrityReport = null) {
  const warnings = [...(source.warnings ?? [])];
  const failures = [...(source.failures ?? [])];
  if (!replayArtifacts.present) warnings.push('No REPLAY-R1 artifacts are present. Three replay review cannot play recorded events.');
  if (integrityReport?.status === 'FAIL') failures.push(...(integrityReport.failures ?? ['Replay integrity verification failed.']));
  if (source.publicBoundary?.browserResultPlayback === true) warnings.push('This review source is reconstructed from public browser result fields, not hidden-truth resimulation.');
  return {
    status: failures.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS',
    warnings,
    failures,
    friendlyMessage: failures.length ? 'Replay review loaded with integrity failures. Playback is inspection-only.' : warnings.length ? 'Replay review loaded with warnings.' : 'Replay review ready.'
  };
}
