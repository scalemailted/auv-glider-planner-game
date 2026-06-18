import { replayDigestMatches, REPLAY_DIGEST_ALGORITHM } from './ReplayDigest.js';
import { canonicalReplayEventCompare, validateCanonicalReplayEventOrder } from './ReplayOrdering.js';
import {
  REPLAY_ARTIFACT_TYPES,
  REPLAY_MODES,
  REPLAY_NUMERIC_POLICY,
  REPLAY_R1_CONTRACT_ID,
  REPLAY_R1_SCHEMA_VERSION,
  normalizeReplayArtifacts,
  scanForbiddenPublicMarkers
} from './ReplaySchema.js';
import { replayCompatibilityForArtifact, replayCompatibilitySummary } from './ReplayCompatibility.js';
import {
  validateReplayAlignmentReport,
  validateReplayCheckpoints,
  validateReplayEvents,
  validateReplayManifest
} from './ReplaySchemaValidation.js';

export const REPLAY_INTEGRITY_VERIFIER_VERSION = 'replay-integrity-verifier-h4.1';

export const REPLAY_ISSUE_CODES = Object.freeze({
  schemaInvalid: 'REPLAY_SCHEMA_INVALID',
  versionUnsupported: 'REPLAY_VERSION_UNSUPPORTED',
  modeUnsupported: 'REPLAY_MODE_UNSUPPORTED',
  eventIdDuplicate: 'REPLAY_EVENT_ID_DUPLICATE',
  eventOrderInvalid: 'REPLAY_EVENT_ORDER_INVALID',
  eventSequenceInvalid: 'REPLAY_EVENT_SEQUENCE_INVALID',
  tickInvalid: 'REPLAY_TICK_INVALID',
  timeInvalid: 'REPLAY_TIME_INVALID',
  timeTickMismatch: 'REPLAY_TIME_TICK_MISMATCH',
  eventAfterTerminal: 'REPLAY_EVENT_AFTER_TERMINAL',
  terminalMissing: 'REPLAY_TERMINAL_MISSING',
  checkpointMissingInitial: 'REPLAY_CHECKPOINT_MISSING_INITIAL',
  checkpointMissingTerminal: 'REPLAY_CHECKPOINT_MISSING_TERMINAL',
  checkpointCursorInvalid: 'REPLAY_CHECKPOINT_CURSOR_INVALID',
  checkpointEventMismatch: 'REPLAY_CHECKPOINT_EVENT_MISMATCH',
  checkpointDigestMismatch: 'REPLAY_CHECKPOINT_DIGEST_MISMATCH',
  agentReferenceInvalid: 'REPLAY_AGENT_REFERENCE_INVALID',
  publicHiddenTruthLeak: 'REPLAY_PUBLIC_HIDDEN_TRUTH_LEAK',
  alignmentReportMismatch: 'REPLAY_ALIGNMENT_REPORT_MISMATCH',
  combinedSeparateMismatch: 'REPLAY_COMBINED_SEPARATE_MISMATCH'
});

export function verifyReplayIntegrity(input = {}) {
  const options = input.options ?? input;
  const directReplayArtifacts = input.manifest?.type === REPLAY_ARTIFACT_TYPES.manifest || input.events?.type === REPLAY_ARTIFACT_TYPES.events || input.checkpoints?.type === REPLAY_ARTIFACT_TYPES.checkpoints || input.alignmentReport?.type === REPLAY_ARTIFACT_TYPES.alignmentReport;
  const source = directReplayArtifacts
    ? { manifest: input.manifest, events: input.events, checkpoints: input.checkpoints, alignmentReport: input.alignmentReport }
    : input;
  const artifacts = normalizeReplayArtifacts(source);
  const manifest = artifacts.manifest ?? null;
  const eventsPayload = artifacts.events ?? null;
  const checkpointsPayload = artifacts.checkpoints ?? null;
  const alignmentReport = artifacts.alignmentReport ?? null;
  const events = Array.isArray(eventsPayload?.events) ? eventsPayload.events : [];
  const checkpoints = Array.isArray(checkpointsPayload?.checkpoints) ? checkpointsPayload.checkpoints : [];
  const issues = [];
  const checks = [];

  if (!artifacts.present || !manifest || !eventsPayload || !checkpointsPayload) {
    issues.push(issue(REPLAY_ISSUE_CODES.schemaInvalid, 'error', 'replayBundle', '', 'Replay manifest, events, and checkpoints are required for H4.1 verification.'));
  }

  const schemaResults = [
    validateReplayManifest(manifest ?? {}, options),
    validateReplayEvents(eventsPayload ?? {}, options),
    validateReplayCheckpoints(checkpointsPayload ?? {}, options),
    ...(alignmentReport ? [validateReplayAlignmentReport(alignmentReport, options)] : [])
  ];
  for (const result of schemaResults) {
    for (const error of result.errors ?? []) issues.push(issue(REPLAY_ISSUE_CODES.schemaInvalid, 'error', result.artifactType, error.path, error.message));
    for (const warning of result.warnings ?? []) issues.push(issue(REPLAY_ISSUE_CODES.schemaInvalid, 'warning', result.artifactType, warning.path, warning.message));
  }

  const compatibility = replayCompatibilityForArtifact(manifest ?? {}, { strict: options.strict, expectedReplayMode: options.expectedReplayMode });
  for (const error of compatibility.errors ?? []) {
    issues.push(issue(error.includes('mode') ? REPLAY_ISSUE_CODES.modeUnsupported : REPLAY_ISSUE_CODES.versionUnsupported, 'error', 'replayManifest', 'version', error));
  }
  for (const warning of compatibility.warnings ?? []) {
    issues.push(issue(warning.includes('mode') ? REPLAY_ISSUE_CODES.modeUnsupported : REPLAY_ISSUE_CODES.versionUnsupported, 'warning', 'replayManifest', 'version', warning));
  }

  const identity = verifyReplayEventIdentity(events);
  checks.push(...identity.checks);
  issues.push(...identity.issues);

  const ordering = options.verifyOrdering === false ? emptyCheck('replay-ordering-skipped') : verifyReplayEventOrdering(events, manifest?.eventOrderingPolicy);
  checks.push(...ordering.checks);
  issues.push(...ordering.issues);

  const timeline = verifyReplayTimeline(events, checkpoints, manifest ?? {});
  checks.push(...timeline.checks);
  issues.push(...timeline.issues);

  const lifecycle = verifyReplayLifecycle(events, manifest ?? {}, options);
  checks.push(...lifecycle.checks);
  issues.push(...lifecycle.issues);

  const references = verifyReplayCheckpointReferences(events, checkpoints);
  checks.push(...references.checks);
  issues.push(...references.issues);

  const agents = verifyReplayAgentReferences(events, checkpoints, manifest ?? {});
  checks.push(...agents.checks);
  issues.push(...agents.issues);

  const digest = options.verifyDigests === false ? emptyCheck('replay-digests-skipped') : verifyReplayCheckpointDigests(events, checkpoints, manifest ?? {}, options);
  checks.push(...digest.checks);
  issues.push(...digest.issues);

  const publicSafety = options.verifyPublicSafety === false ? emptyCheck('replay-public-safety-skipped') : verifyReplayPublicSafety({ manifest, events: eventsPayload, checkpoints: checkpointsPayload });
  checks.push(...publicSafety.checks);
  issues.push(...publicSafety.issues);

  const statusBeforeAlignment = statusFromIssues(issues, options);
  if (options.verifyAlignmentReport !== false && alignmentReport) {
    const reportStatus = alignmentReport.status ?? alignmentReport.summary?.status ?? null;
    const reportEventCount = alignmentReport.eventCount ?? alignmentReport.summary?.eventCount ?? null;
    const reportCheckpointCount = alignmentReport.checkpointCount ?? alignmentReport.summary?.checkpointCount ?? null;
    if (reportStatus && reportStatus !== statusBeforeAlignment && !(reportStatus === 'PASS' && statusBeforeAlignment === 'WARN')) {
      issues.push(issue(REPLAY_ISSUE_CODES.alignmentReportMismatch, 'error', 'replayAlignmentReport', 'status', 'Replay alignment report status does not match current integrity verification.', { expected: statusBeforeAlignment, actual: reportStatus }));
    }
    if (Number.isFinite(Number(reportEventCount)) && Number(reportEventCount) !== events.length) {
      issues.push(issue(REPLAY_ISSUE_CODES.alignmentReportMismatch, 'error', 'replayAlignmentReport', 'eventCount', 'Replay alignment report event count does not match replay_events.', { expected: events.length, actual: reportEventCount }));
    }
    if (Number.isFinite(Number(reportCheckpointCount)) && Number(reportCheckpointCount) !== checkpoints.length) {
      issues.push(issue(REPLAY_ISSUE_CODES.alignmentReportMismatch, 'error', 'replayAlignmentReport', 'checkpointCount', 'Replay alignment report checkpoint count does not match replay_checkpoints.', { expected: checkpoints.length, actual: reportCheckpointCount }));
    }
  }

  const status = statusFromIssues(issues, options);
  const warningIssues = issues.filter((entry) => entry.severity === 'warning');
  const failureIssues = issues.filter((entry) => entry.severity === 'error' || (options.strict === true && entry.severity === 'warning'));
  const digestChecks = checks.filter((entry) => /^replay-digest/.test(entry.id));
  const orderingChecks = checks.filter((entry) => /^replay-order/.test(entry.id));
  const publicSafetyChecks = checks.filter((entry) => /^replay-public-safety/.test(entry.id));

  return {
    type: REPLAY_ARTIFACT_TYPES.alignmentReport,
    version: REPLAY_R1_SCHEMA_VERSION,
    schemaVersion: REPLAY_R1_SCHEMA_VERSION,
    replayVersion: REPLAY_R1_SCHEMA_VERSION,
    verifierVersion: REPLAY_INTEGRITY_VERIFIER_VERSION,
    contract: REPLAY_R1_CONTRACT_ID,
    replayId: manifest?.replayId ?? eventsPayload?.replayId ?? checkpointsPayload?.replayId ?? 'replay-h4.1',
    status,
    replayMode: manifest?.replayMode ?? null,
    checkedArtifactTypes: ['replayManifest', 'replayEvents', 'replayCheckpoints', ...(alignmentReport ? ['replayAlignmentReport'] : [])],
    eventCount: events.length,
    checkpointCount: checkpoints.length,
    agentCount: declaredAgentIds(manifest, checkpoints).length,
    agentIds: declaredAgentIds(manifest, checkpoints),
    passedChecks: checks.filter((entry) => entry.ok === true).map((entry) => entry.id),
    warningCount: warningIssues.length,
    failureCount: failureIssues.length,
    issues,
    failureCodes: [...new Set(failureIssues.map((entry) => entry.code))],
    warningCodes: [...new Set(warningIssues.map((entry) => entry.code))],
    checks,
    warnings: warningIssues.map(issueMessage),
    failures: failureIssues.map(issueMessage),
    digestSummary: {
      enabled: options.verifyDigests !== false,
      checked: digestChecks.length,
      passed: digestChecks.filter((entry) => entry.ok === true).length,
      failed: digestChecks.filter((entry) => entry.ok === false).length,
      algorithm: checkpointsPayload?.digestAlgorithm?.algorithm ?? checkpointsPayload?.digestAlgorithm ?? REPLAY_DIGEST_ALGORITHM
    },
    orderingSummary: {
      enabled: options.verifyOrdering !== false,
      checked: orderingChecks.length,
      passed: orderingChecks.every((entry) => entry.ok !== false),
      policy: manifest?.eventOrderingPolicy?.id ?? eventsPayload?.eventOrderingPolicy?.id ?? 'replay-r1-canonical-event-order',
      globalAgentSortValue: ''
    },
    publicSafetySummary: {
      enabled: options.verifyPublicSafety !== false,
      checked: publicSafetyChecks.length,
      passed: publicSafetyChecks.every((entry) => entry.ok !== false),
      hiddenTruthLeak: issues.some((entry) => entry.code === REPLAY_ISSUE_CODES.publicHiddenTruthLeak)
    },
    compatibilitySummary: replayCompatibilitySummary(compatibility),
    summary: {
      status,
      eventCount: events.length,
      checkpointCount: checkpoints.length,
      agentCount: declaredAgentIds(manifest, checkpoints).length,
      warningCount: warningIssues.length,
      failureCount: failureIssues.length,
      failureCodes: [...new Set(failureIssues.map((entry) => entry.code))],
      digestChecksPassed: digestChecks.length > 0 && digestChecks.every((entry) => entry.ok === true),
      orderingChecksPassed: orderingChecks.length > 0 && orderingChecks.every((entry) => entry.ok === true),
      publicSafetyPassed: publicSafetyChecks.length > 0 && publicSafetyChecks.every((entry) => entry.ok === true),
      strict: options.strict === true,
      changesOfficialBrowserScoring: false
    },
    firstDivergence: firstFailureIssue(failureIssues),
    mismatchClass: firstFailureIssue(failureIssues)?.code ?? null,
    boundary: 'Replay integrity verification checks recorded public replay artifacts, ordering, checkpoints, digests, and public-safety markers. It does not reconstruct hidden truth, rerun physics, or change official browser scoring.',
    changesOfficialBrowserScoring: false,
    usesAuthoritativeHiddenStateReplay: false,
    usesHiddenTruthResimulation: false,
    usesNewPlanner: false,
    usesRouteOptimizer: false,
    usesRL: false,
    usesMARL: false,
    usesPythonSimulator: false
  };
}

export function verifyReplayEventOrdering(events = [], _policy = null) {
  const checks = [];
  const issues = [];
  const validation = validateCanonicalReplayEventOrder(events);
  checks.push({ id: 'replay-order-canonical', ok: validation.failures.length === 0, detail: events.length });
  validation.failures.forEach((message) => issues.push(issue(REPLAY_ISSUE_CODES.eventOrderInvalid, 'error', 'replayEvents', 'events', message)));
  for (let index = 1; index < events.length; index += 1) {
    if (canonicalReplayEventCompare(events[index - 1], events[index]) > 0) {
      issues.push(issue(REPLAY_ISSUE_CODES.eventOrderInvalid, 'error', 'replayEvents', `events[${index}]`, 'Replay event order violates canonical tick/time/phase/agent/sequence/eventId ordering.', {
        expected: compactEvent(events[index - 1]),
        actual: compactEvent(events[index]),
        eventId: events[index]?.eventId,
        tick: events[index]?.tick
      }));
      break;
    }
  }
  return { checks, issues };
}

export function verifyReplayEventIdentity(events = []) {
  const checks = [];
  const issues = [];
  const eventIds = new Set();
  const sequences = new Set();
  const tuples = new Set();
  events.forEach((event, index) => {
    const eventId = event?.eventId;
    const sequence = Number(event?.sequence);
    if (!eventId) issues.push(issue(REPLAY_ISSUE_CODES.schemaInvalid, 'error', 'replayEvents', `events[${index}].eventId`, 'Replay event is missing eventId.', { tick: event?.tick }));
    else if (eventIds.has(eventId)) issues.push(issue(REPLAY_ISSUE_CODES.eventIdDuplicate, 'error', 'replayEvents', `events[${index}].eventId`, `Replay eventId ${eventId} is duplicated.`, { eventId, tick: event?.tick }));
    eventIds.add(eventId);
    if (!Number.isInteger(sequence) || sequence < 0) issues.push(issue(REPLAY_ISSUE_CODES.eventSequenceInvalid, 'error', 'replayEvents', `events[${index}].sequence`, 'Replay event sequence must be a nonnegative integer.', { eventId, actual: event?.sequence }));
    else if (sequences.has(sequence)) issues.push(issue(REPLAY_ISSUE_CODES.eventSequenceInvalid, 'error', 'replayEvents', `events[${index}].sequence`, `Replay event sequence ${sequence} is duplicated.`, { eventId, tick: event?.tick }));
    sequences.add(sequence);
    const tuple = `${event?.tick}|${event?.timeSeconds}|${event?.phase}|${event?.eventType}|${event?.agentId ?? ''}|${sequence}`;
    if (tuples.has(tuple)) issues.push(issue(REPLAY_ISSUE_CODES.eventSequenceInvalid, 'error', 'replayEvents', `events[${index}]`, 'Replay event identity tuple is duplicated.', { eventId, tick: event?.tick }));
    tuples.add(tuple);
  });
  checks.push({ id: 'replay-event-ids-unique', ok: !issues.some((entry) => [REPLAY_ISSUE_CODES.eventIdDuplicate, REPLAY_ISSUE_CODES.eventSequenceInvalid].includes(entry.code)), detail: events.length });
  return { checks, issues };
}

export function verifyReplayCheckpointReferences(events = [], checkpoints = []) {
  const checks = [];
  const issues = [];
  const checkpointIds = new Set();
  const eventCount = events.length;
  const eventTicks = events.map((event) => Number(event.tick));
  let hasInitial = false;
  let hasTerminal = false;
  checkpoints.forEach((checkpoint, index) => {
    const path = `checkpoints[${index}]`;
    const reasons = checkpointReasons(checkpoint);
    if (checkpointIds.has(checkpoint.checkpointId)) issues.push(issue(REPLAY_ISSUE_CODES.checkpointEventMismatch, 'error', 'replayCheckpoints', `${path}.checkpointId`, `Replay checkpointId ${checkpoint.checkpointId} is duplicated.`, { checkpointId: checkpoint.checkpointId, tick: checkpoint.tick }));
    checkpointIds.add(checkpoint.checkpointId);
    if (Number(checkpoint.tick) === 0 || reasons.includes('initial')) hasInitial = true;
    if (reasons.includes('terminal')) hasTerminal = true;
    const cursor = checkpoint.eventCursor;
    if (cursor === undefined || cursor === null) {
      issues.push(issue(REPLAY_ISSUE_CODES.checkpointCursorInvalid, 'warning', 'replayCheckpoints', `${path}.eventCursor`, 'Replay checkpoint lacks optional H4.1 eventCursor; accepted for older REPLAY-R1 artifacts.', { checkpointId: checkpoint.checkpointId, tick: checkpoint.tick }));
    } else if (!Number.isInteger(Number(cursor)) || Number(cursor) < 0 || Number(cursor) > eventCount) {
      issues.push(issue(REPLAY_ISSUE_CODES.checkpointCursorInvalid, 'error', 'replayCheckpoints', `${path}.eventCursor`, 'Replay checkpoint eventCursor is outside the event stream.', { checkpointId: checkpoint.checkpointId, tick: checkpoint.tick, expected: `0..${eventCount}`, actual: cursor }));
    } else {
      const cursorNumber = Number(cursor);
      const before = cursorNumber > 0 ? eventTicks[cursorNumber - 1] : -1;
      const after = cursorNumber < eventCount ? eventTicks[cursorNumber] : Number.POSITIVE_INFINITY;
      if (before > Number(checkpoint.tick) || after <= Number(checkpoint.tick)) {
        issues.push(issue(REPLAY_ISSUE_CODES.checkpointCursorInvalid, 'error', 'replayCheckpoints', `${path}.eventCursor`, 'Replay checkpoint eventCursor does not align with checkpoint tick boundary.', { checkpointId: checkpoint.checkpointId, tick: checkpoint.tick, expected: `last event tick <= ${checkpoint.tick} < next event tick`, actual: { before, after, cursor } }));
      }
    }
    if (reasons.includes('objectiveTransition') && !events.some((event) => Number(event.tick) === Number(checkpoint.tick) && event.phase === 'objective')) {
      issues.push(issue(REPLAY_ISSUE_CODES.checkpointEventMismatch, 'error', 'replayCheckpoints', path, 'Objective-transition checkpoint has no matching objective event at the same tick.', { checkpointId: checkpoint.checkpointId, tick: checkpoint.tick }));
    }
    if (reasons.includes('surfacing') && !events.some((event) => Number(event.tick) === Number(checkpoint.tick) && event.phase === 'surfacing')) {
      issues.push(issue(REPLAY_ISSUE_CODES.checkpointEventMismatch, 'error', 'replayCheckpoints', path, 'Surfacing checkpoint has no matching surfacing event at the same tick.', { checkpointId: checkpoint.checkpointId, tick: checkpoint.tick }));
    }
  });
  if (!hasInitial) issues.push(issue(REPLAY_ISSUE_CODES.checkpointMissingInitial, 'error', 'replayCheckpoints', 'checkpoints', 'Replay checkpoints must include an initial checkpoint.'));
  if (!hasTerminal) issues.push(issue(REPLAY_ISSUE_CODES.checkpointMissingTerminal, 'error', 'replayCheckpoints', 'checkpoints', 'Replay checkpoints must include a terminal checkpoint.'));
  checks.push({ id: 'replay-checkpoint-references', ok: !issues.some((entry) => entry.severity === 'error'), detail: checkpoints.length });
  return { checks, issues };
}

export function verifyReplayCheckpointDigests(_events = [], checkpoints = [], _manifest = {}, options = {}) {
  const checks = [];
  const issues = [];
  const policy = options.numericPolicy ?? REPLAY_NUMERIC_POLICY;
  checkpoints.forEach((checkpoint, index) => {
    const path = `checkpoints[${index}]`;
    if (!checkpoint.digest?.value || !checkpoint.publicState) {
      checks.push({ id: `replay-digest-${checkpoint.checkpointId ?? index}`, ok: false, detail: 'missing' });
      issues.push(issue(REPLAY_ISSUE_CODES.checkpointDigestMismatch, 'error', 'replayCheckpoints', path, 'Replay checkpoint is missing digest.value or publicState.', { checkpointId: checkpoint.checkpointId, tick: checkpoint.tick }));
      return;
    }
    const match = replayDigestMatches(checkpoint.digest, checkpoint.publicState, policy);
    checks.push({ id: `replay-digest-${checkpoint.checkpointId ?? index}`, ok: match.ok, detail: checkpoint.digest.value });
    const algorithm = checkpoint.digest.algorithm ?? checkpoint.digestAlgorithmId ?? null;
    if (algorithm && algorithm !== REPLAY_DIGEST_ALGORITHM) {
      issues.push(issue(REPLAY_ISSUE_CODES.checkpointDigestMismatch, 'error', 'replayCheckpoints', `${path}.digest.algorithm`, 'Replay checkpoint digest algorithm is not recognized.', { checkpointId: checkpoint.checkpointId, tick: checkpoint.tick, expected: REPLAY_DIGEST_ALGORITHM, actual: algorithm }));
    }
    if (!match.ok) {
      issues.push(issue(REPLAY_ISSUE_CODES.checkpointDigestMismatch, 'error', 'replayCheckpoints', `${path}.digest.value`, 'Replay checkpoint digest does not match recomputed public-state digest.', { checkpointId: checkpoint.checkpointId, tick: checkpoint.tick, expected: match.actual.value, actual: match.expected?.value ?? null }));
    }
  });
  return { checks, issues };
}

export function verifyReplayTimeline(events = [], checkpoints = [], manifest = {}) {
  const checks = [];
  const issues = [];
  const dt = Number(manifest.timestepSeconds ?? manifest.timingModel?.dtSeconds);
  const tolerance = Number(manifest.numericPolicy?.defaultEpsilon ?? REPLAY_NUMERIC_POLICY.defaultEpsilon ?? 0.000001) * 10;
  let terminalSequence = null;
  events.forEach((event, index) => {
    const tick = Number(event.tick);
    const timeSeconds = Number(event.timeSeconds);
    if (!Number.isInteger(tick) || tick < 0) issues.push(issue(REPLAY_ISSUE_CODES.tickInvalid, 'error', 'replayEvents', `events[${index}].tick`, 'Replay event tick must be a nonnegative integer.', { eventId: event.eventId, actual: event.tick }));
    if (!Number.isFinite(timeSeconds) || timeSeconds < 0) issues.push(issue(REPLAY_ISSUE_CODES.timeInvalid, 'error', 'replayEvents', `events[${index}].timeSeconds`, 'Replay event timeSeconds must be finite and nonnegative.', { eventId: event.eventId, tick: event.tick, actual: event.timeSeconds }));
    if (Number.isFinite(dt) && dt > 0 && Number.isFinite(timeSeconds) && Math.abs(timeSeconds - tick * dt) > tolerance) {
      const drift = Math.abs(timeSeconds - tick * dt);
      const boundedLegacyDrift = drift <= dt / 2 + tolerance;
      issues.push(issue(
        REPLAY_ISSUE_CODES.timeTickMismatch,
        boundedLegacyDrift ? 'warning' : 'error',
        'replayEvents',
        `events[${index}].timeSeconds`,
        boundedLegacyDrift
          ? 'Replay event timeSeconds differs from rounded tick * timestepSeconds; bounded drift is accepted for older REPLAY-R1 events.'
          : 'Replay event timeSeconds does not match tick * timestepSeconds.',
        { eventId: event.eventId, tick, expected: tick * dt, actual: timeSeconds, drift }
      ));
    }
    if (event.phase === 'terminal' && terminalSequence === null) terminalSequence = Number(event.sequence ?? index);
    if (terminalSequence !== null && Number(event.sequence ?? index) > terminalSequence) {
      issues.push(issue(REPLAY_ISSUE_CODES.eventAfterTerminal, 'error', 'replayEvents', `events[${index}]`, 'Replay event appears after terminal event.', { eventId: event.eventId, tick: event.tick }));
    }
  });
  checkpoints.forEach((checkpoint, index) => {
    const tick = Number(checkpoint.tick);
    const timeSeconds = Number(checkpoint.timeSeconds);
    if (!Number.isInteger(tick) || tick < 0) issues.push(issue(REPLAY_ISSUE_CODES.tickInvalid, 'error', 'replayCheckpoints', `checkpoints[${index}].tick`, 'Replay checkpoint tick must be a nonnegative integer.', { checkpointId: checkpoint.checkpointId, actual: checkpoint.tick }));
    if (!Number.isFinite(timeSeconds) || timeSeconds < 0) issues.push(issue(REPLAY_ISSUE_CODES.timeInvalid, 'error', 'replayCheckpoints', `checkpoints[${index}].timeSeconds`, 'Replay checkpoint timeSeconds must be finite and nonnegative.', { checkpointId: checkpoint.checkpointId, tick: checkpoint.tick, actual: checkpoint.timeSeconds }));
    if (Number.isFinite(dt) && dt > 0 && Number.isFinite(timeSeconds) && Math.abs(timeSeconds - tick * dt) > tolerance) {
      const drift = Math.abs(timeSeconds - tick * dt);
      const boundedLegacyDrift = drift <= dt / 2 + tolerance;
      issues.push(issue(
        REPLAY_ISSUE_CODES.timeTickMismatch,
        boundedLegacyDrift ? 'warning' : 'error',
        'replayCheckpoints',
        `checkpoints[${index}].timeSeconds`,
        boundedLegacyDrift
          ? 'Replay checkpoint timeSeconds differs from rounded tick * timestepSeconds; bounded drift is accepted for older REPLAY-R1 checkpoints.'
          : 'Replay checkpoint timeSeconds does not match tick * timestepSeconds.',
        { checkpointId: checkpoint.checkpointId, tick, expected: tick * dt, actual: timeSeconds, drift }
      ));
    }
  });
  checks.push({ id: 'replay-timeline', ok: !issues.some((entry) => entry.severity === 'error'), detail: `${events.length} events / ${checkpoints.length} checkpoints` });
  return { checks, issues };
}

export function verifyReplayLifecycle(events = [], manifest = {}, options = {}) {
  const checks = [];
  const issues = [];
  const terminalEvents = events.filter((event) => event.phase === 'terminal' || /terminal/i.test(event.eventType ?? ''));
  const manifestTerminal = Boolean(manifest.terminalReason ?? manifest.terminationReason ?? manifest.timingModel?.terminalTick !== undefined);
  if ((options.requireTerminalCheckpoint !== false || manifestTerminal) && !terminalEvents.length) {
    issues.push(issue(REPLAY_ISSUE_CODES.terminalMissing, 'error', 'replayEvents', 'events', 'Replay terminal event is required when the manifest declares terminal episode metadata.'));
  }
  checks.push({ id: 'replay-lifecycle-terminal-event', ok: terminalEvents.length > 0, detail: terminalEvents.length });
  return { checks, issues };
}

export function verifyReplayAgentReferences(events = [], checkpoints = [], manifest = {}) {
  const checks = [];
  const issues = [];
  const declared = declaredAgentIds(manifest, checkpoints);
  const declaredSet = new Set(declared);
  events.forEach((event, index) => {
    if (event.agentId && declaredSet.size && !declaredSet.has(event.agentId)) {
      issues.push(issue(REPLAY_ISSUE_CODES.agentReferenceInvalid, 'error', 'replayEvents', `events[${index}].agentId`, `Replay event references undeclared agent ${event.agentId}.`, { eventId: event.eventId, tick: event.tick, actual: event.agentId, expected: declared }));
    }
  });
  checkpoints.forEach((checkpoint, index) => {
    const states = checkpoint.agentStates ?? checkpoint.publicState?.agentStates ?? checkpoint.publicState?.vehicles ?? {};
    for (const agentId of Object.keys(states)) {
      if (declaredSet.size && !declaredSet.has(agentId)) issues.push(issue(REPLAY_ISSUE_CODES.agentReferenceInvalid, 'error', 'replayCheckpoints', `checkpoints[${index}].agentStates.${agentId}`, `Replay checkpoint references undeclared agent ${agentId}.`, { checkpointId: checkpoint.checkpointId, tick: checkpoint.tick, actual: agentId, expected: declared }));
    }
    for (const agentId of declared) {
      if (!states[agentId]) {
        const reasons = checkpointReasons(checkpoint);
        const severity = reasons.includes('initial') || reasons.includes('terminal') ? 'error' : 'warning';
        issues.push(issue(REPLAY_ISSUE_CODES.agentReferenceInvalid, severity, 'replayCheckpoints', `checkpoints[${index}].agentStates.${agentId}`, `Replay checkpoint is missing state for declared agent ${agentId}.`, { checkpointId: checkpoint.checkpointId, tick: checkpoint.tick, expected: agentId, actual: null }));
      }
    }
  });
  checks.push({ id: 'replay-agent-references', ok: !issues.some((entry) => entry.severity === 'error'), detail: declared.length });
  return { checks, issues };
}

export function verifyReplayPublicSafety(replayArtifacts = {}) {
  const checks = [];
  const issues = [];
  const scan = scanForbiddenPublicMarkers(replayArtifacts);
  for (const message of scan.failures ?? []) issues.push(issue(REPLAY_ISSUE_CODES.publicHiddenTruthLeak, 'error', 'replayBundle', '', message));
  checks.push({ id: 'replay-public-safety-hidden-truth', ok: issues.length === 0, detail: issues.length ? 'leak-detected' : 'public-safe' });
  return { checks, issues };
}

export function buildReplayAlignmentReport(results = {}, options = {}) {
  return verifyReplayIntegrity({ ...results, options });
}

export function replayIntegritySummary(report = {}) {
  return {
    status: report.status ?? 'FAIL',
    replayMode: report.replayMode ?? null,
    replayVersion: report.replayVersion ?? report.version ?? null,
    eventCount: report.eventCount ?? report.summary?.eventCount ?? 0,
    checkpointCount: report.checkpointCount ?? report.summary?.checkpointCount ?? 0,
    agentCount: report.agentCount ?? report.summary?.agentCount ?? 0,
    digestChecksPassed: report.summary?.digestChecksPassed === true,
    orderingChecksPassed: report.summary?.orderingChecksPassed === true,
    publicSafetyPassed: report.summary?.publicSafetyPassed === true,
    warningCount: report.warningCount ?? report.summary?.warningCount ?? 0,
    failureCount: report.failureCount ?? report.summary?.failureCount ?? 0,
    failureCodes: report.failureCodes ?? report.summary?.failureCodes ?? []
  };
}

function declaredAgentIds(manifest = {}, checkpoints = []) {
  const ids = new Set([...(manifest?.agentIds ?? [])]);
  for (const key of Object.keys(manifest?.initialPublicState?.agentStates ?? manifest?.initialPublicState?.vehicles ?? manifest?.initialState?.vehicles ?? {})) ids.add(key);
  for (const checkpoint of checkpoints ?? []) for (const key of Object.keys(checkpoint?.agentStates ?? checkpoint?.publicState?.agentStates ?? checkpoint?.publicState?.vehicles ?? {})) ids.add(key);
  return [...ids].filter(Boolean).sort();
}

function checkpointReasons(checkpoint = {}) {
  if (Array.isArray(checkpoint.reasons)) return checkpoint.reasons;
  if (checkpoint.reason) return [checkpoint.reason];
  return [];
}

function statusFromIssues(issues = [], options = {}) {
  if (issues.some((entry) => entry.severity === 'error')) return 'FAIL';
  if (options.strict === true && issues.some((entry) => entry.severity === 'warning')) return 'FAIL';
  return issues.some((entry) => entry.severity === 'warning') ? 'WARN' : 'PASS';
}

function issue(code, severity, artifact, path, message, extra = {}) {
  return {
    code,
    severity,
    artifact,
    path: path ?? '',
    tick: extra.tick ?? null,
    eventId: extra.eventId ?? null,
    checkpointId: extra.checkpointId ?? null,
    message,
    expected: extra.expected,
    actual: extra.actual
  };
}

function issueMessage(entry) {
  const id = entry.eventId ?? entry.checkpointId ?? entry.path ?? entry.artifact;
  return `${entry.code}: ${entry.message}${id ? ` (${id})` : ''}`;
}

function firstFailureIssue(failureIssues = []) {
  const first = failureIssues[0];
  if (!first) return null;
  return {
    mismatchClass: first.code,
    path: first.path,
    expected: first.expected ?? null,
    actual: first.actual ?? null,
    tick: first.tick ?? null,
    eventId: first.eventId ?? null,
    checkpointId: first.checkpointId ?? null
  };
}

function compactEvent(event = {}) {
  return { eventId: event.eventId ?? null, tick: event.tick ?? null, timeSeconds: event.timeSeconds ?? null, phase: event.phase ?? null, eventType: event.eventType ?? null, agentId: event.agentId ?? null, sequence: event.sequence ?? null };
}

function emptyCheck(id) {
  return { checks: [{ id, ok: true, detail: 'disabled' }], issues: [] };
}
