export const REPLAY_R1_CONTRACT_ID = 'REPLAY-R1';
export const REPLAY_R1_SCHEMA_VERSION = 'replay-r1.0';

export const REPLAY_ARTIFACT_TYPES = Object.freeze({
  contract: 'anchor.headless.replay-contract',
  manifest: 'anchor.headless.replay-manifest',
  events: 'anchor.headless.replay-events',
  checkpoints: 'anchor.headless.replay-checkpoints',
  alignmentReport: 'anchor.headless.replay-alignment-report',
  event: 'anchor.headless.replay-event',
  checkpoint: 'anchor.headless.replay-checkpoint'
});

export const REPLAY_MODES = Object.freeze({
  authoritativeSimulationReplay: 'authoritativeSimulationReplay',
  authoritativeResimulationReserved: 'authoritativeResimulationReserved',
  protectedRefereeReplayReserved: 'protectedRefereeReplayReserved',
  publicObservationPlayback: 'publicObservationPlayback',
  refereeInternalReplay: 'refereeInternalReplay'
});

export const REPLAY_NUMERIC_POLICY = Object.freeze({
  id: 'replay-r1-public-state-quantized-1e-6',
  defaultDecimalPlaces: 6,
  defaultEpsilon: 0.000001,
  fieldPolicies: Object.freeze({
    tick: { exact: true },
    sequence: { exact: true },
    timeSeconds: { decimalPlaces: 6, epsilon: 0.000001 },
    x: { decimalPlaces: 6, epsilon: 0.000001 },
    y: { decimalPlaces: 6, epsilon: 0.000001 },
    z: { decimalPlaces: 6, epsilon: 0.000001 },
    zIndex: { exact: true },
    headingDegrees: { decimalPlaces: 6, epsilon: 0.000001 },
    depthMeters: { decimalPlaces: 6, epsilon: 0.000001 },
    battery: { decimalPlaces: 6, epsilon: 0.000001 },
    energyUsed: { decimalPlaces: 6, epsilon: 0.000001 },
    score: { decimalPlaces: 6, epsilon: 0.000001 },
    observedValue: { decimalPlaces: 6, epsilon: 0.000001 },
    surprise: { decimalPlaces: 6, epsilon: 0.000001 }
  }),
  note: 'REPLAY-R1 compares exact identifiers and quantizes public numeric state per field; it does not use an unexplained global close-enough rule.'
});

export const REPLAY_ORDERING_POLICY = Object.freeze({
  id: 'replay-r1-canonical-event-order',
  sortKeys: ['tick', 'timeSeconds', 'phaseRank', 'agentId', 'sequence', 'eventId'],
  globalAgentSortValue: '',
  note: 'Events are ordered by simulation tick/time, replay phase/type rank, mission-global event id (empty agent) before vehicle/agent id, explicit monotonic sequence number, then stable event id fallback.'
});

const SUPPORTED_REPLAY_VERSIONS = new Set([REPLAY_R1_SCHEMA_VERSION]);
const FORBIDDEN_PUBLIC_MARKERS = Object.freeze([
  'T_hiddenTruth',
  'trueRoi',
  'hidden_fields',
  'hiddenFields',
  'oracleState',
  'refereeOnlyPayload',
  'refereePayload',
  'eventIntensityTruth'
]);

export function normalizeReplayArtifacts(source = {}) {
  if (!source || typeof source !== 'object') return emptyReplayArtifacts();
  if (source.type === REPLAY_ARTIFACT_TYPES.contract) {
    return {
      present: Boolean(source.manifest && source.events && source.checkpoints),
      manifest: source.manifest ?? null,
      events: source.events ?? null,
      checkpoints: source.checkpoints ?? null,
      alignmentReport: source.alignmentReport ?? null,
      legacyReplay: null
    };
  }
  if (source.manifest && source.events && source.checkpoints) {
    return {
      present: true,
      manifest: source.manifest,
      events: source.events,
      checkpoints: source.checkpoints,
      alignmentReport: source.alignmentReport ?? null,
      legacyReplay: null
    };
  }
  const replay = source.replay ?? null;
  const replayContract = source.replayContract ?? null;
  if (replayContract?.type === REPLAY_ARTIFACT_TYPES.contract) return normalizeReplayArtifacts(replayContract);
  return {
    present: Boolean(source.replayManifest || source.replayEvents || source.replayCheckpoints || replay?.manifest || replay?.events || replay?.checkpoints),
    manifest: source.replayManifest ?? replay?.manifest ?? null,
    events: source.replayEvents ?? replay?.events ?? null,
    checkpoints: source.replayCheckpoints ?? replay?.checkpoints ?? null,
    alignmentReport: source.replayAlignmentReport ?? replay?.alignmentReport ?? null,
    legacyReplay: replay && replay.type === 'anchor.headless.replay' ? replay : null
  };
}

export function buildReplayContract(artifacts = {}) {
  const normalized = normalizeReplayArtifacts(artifacts);
  return {
    type: REPLAY_ARTIFACT_TYPES.contract,
    version: REPLAY_R1_SCHEMA_VERSION,
    manifest: normalized.manifest,
    events: normalized.events,
    checkpoints: normalized.checkpoints,
    alignmentReport: normalized.alignmentReport
  };
}

export function validateReplayArtifacts(source = {}, options = {}) {
  const normalized = normalizeReplayArtifacts(source);
  const allowLegacy = options.allowLegacy !== false;
  const checks = [];
  const warnings = [];
  const failures = [];

  if (!normalized.present) {
    if (normalized.legacyReplay && allowLegacy) {
      warnings.push('Legacy headless replay metadata is present, but REPLAY-R1 manifest/events/checkpoints are missing; replay fidelity is legacy/limited.');
      checks.push({ id: 'replay-legacy-limited', ok: true, detail: normalized.legacyReplay.version ?? 'legacy' });
      return replayValidationResult(checks, warnings, failures, normalized);
    }
    warnings.push('REPLAY-R1 artifacts are missing; deterministic replay alignment is unavailable for this bundle.');
    checks.push({ id: 'replay-r1-present', ok: false, detail: 'missing' });
    return replayValidationResult(checks, warnings, failures, normalized);
  }

  const manifest = normalized.manifest;
  const eventsPayload = normalized.events;
  const checkpointsPayload = normalized.checkpoints;
  const events = Array.isArray(eventsPayload?.events) ? eventsPayload.events : [];
  const checkpoints = Array.isArray(checkpointsPayload?.checkpoints) ? checkpointsPayload.checkpoints : [];

  checks.push({ id: 'replay-manifest-present', ok: Boolean(manifest), detail: manifest?.type ?? 'missing' });
  checks.push({ id: 'replay-events-present', ok: Boolean(eventsPayload), detail: eventsPayload?.type ?? 'missing' });
  checks.push({ id: 'replay-checkpoints-present', ok: Boolean(checkpointsPayload), detail: checkpointsPayload?.type ?? 'missing' });
  if (!manifest) failures.push('REPLAY-R1 manifest is missing.');
  if (!eventsPayload) failures.push('REPLAY-R1 events artifact is missing.');
  if (!checkpointsPayload) failures.push('REPLAY-R1 checkpoints artifact is missing.');
  if (!manifest || !eventsPayload || !checkpointsPayload) return replayValidationResult(checks, warnings, failures, normalized);

  if (manifest.type !== REPLAY_ARTIFACT_TYPES.manifest) failures.push(`Replay manifest type should be ${REPLAY_ARTIFACT_TYPES.manifest}, got ${manifest.type ?? 'missing'}.`);
  if (!SUPPORTED_REPLAY_VERSIONS.has(manifest.version)) failures.push(`Unsupported replay manifest version ${manifest.version ?? 'missing'}.`);
  if (manifest.contract !== REPLAY_R1_CONTRACT_ID) failures.push(`Replay manifest contract should be ${REPLAY_R1_CONTRACT_ID}.`);
  if (!Object.values(REPLAY_MODES).includes(manifest.replayMode)) failures.push(`Replay manifest has unsupported replay mode ${manifest.replayMode ?? 'missing'}.`);
  if (!manifest.initialState || typeof manifest.initialState !== 'object') failures.push('Replay manifest must include initialState.');
  if (!manifest.timingModel || typeof manifest.timingModel !== 'object') failures.push('Replay manifest must include timingModel.');
  if (!manifest.seed) failures.push('Replay manifest must include a deterministic seed.');
  if (manifest.changesOfficialBrowserScoring !== false) failures.push('Replay manifest must preserve changesOfficialBrowserScoring=false.');

  if (manifest.visibilityTier === 'publicScenario' || manifest.replayMode === REPLAY_MODES.publicObservationPlayback) {
    const scan = scanForbiddenPublicMarkers({ manifest, events: eventsPayload, checkpoints: checkpointsPayload }, { allowBoundaryBooleans: true });
    failures.push(...scan.failures);
  }
  if (manifest.replayMode === REPLAY_MODES.authoritativeSimulationReplay && manifest.requiresHiddenTruth === true && manifest.visibilityTier === 'publicScenario') {
    failures.push('Authoritative simulation replay cannot require hidden truth from a public bundle.');
  }

  if (eventsPayload.type !== REPLAY_ARTIFACT_TYPES.events) failures.push(`Replay events type should be ${REPLAY_ARTIFACT_TYPES.events}, got ${eventsPayload.type ?? 'missing'}.`);
  if (!SUPPORTED_REPLAY_VERSIONS.has(eventsPayload.version)) failures.push(`Unsupported replay events version ${eventsPayload.version ?? 'missing'}.`);
  if (!events.length) failures.push('Replay events must include events[].');
  validateReplayEventSequence(events, manifest, failures, warnings, checks);

  if (checkpointsPayload.type !== REPLAY_ARTIFACT_TYPES.checkpoints) failures.push(`Replay checkpoints type should be ${REPLAY_ARTIFACT_TYPES.checkpoints}, got ${checkpointsPayload.type ?? 'missing'}.`);
  if (!SUPPORTED_REPLAY_VERSIONS.has(checkpointsPayload.version)) failures.push(`Unsupported replay checkpoints version ${checkpointsPayload.version ?? 'missing'}.`);
  if (!checkpoints.length) failures.push('Replay checkpoints must include checkpoints[].');
  for (const checkpoint of checkpoints) {
    if (!Number.isFinite(Number(checkpoint.tick)) || Number(checkpoint.tick) < 0) failures.push(`Replay checkpoint ${checkpoint.checkpointId ?? 'unknown'} has invalid tick.`);
    if (!checkpoint.digest?.value) failures.push(`Replay checkpoint ${checkpoint.checkpointId ?? 'unknown'} is missing a public-state digest.`);
    if (!checkpoint.publicState || typeof checkpoint.publicState !== 'object') failures.push(`Replay checkpoint ${checkpoint.checkpointId ?? 'unknown'} is missing publicState.`);
  }

  const scoreSchemaVersion = manifest.scoringSchemaVersion ?? null;
  const reportScoreVersion = normalized.alignmentReport?.scoringSchemaVersion ?? normalized.alignmentReport?.summary?.scoringSchemaVersion ?? scoreSchemaVersion;
  if (scoreSchemaVersion && reportScoreVersion && scoreSchemaVersion !== reportScoreVersion) failures.push('Replay alignment report score schema version does not match replay manifest.');

  return replayValidationResult(checks, warnings, failures, normalized);
}

export function replayArtifactsSummary(source = {}) {
  const normalized = normalizeReplayArtifacts(source);
  const manifest = normalized.manifest ?? {};
  const events = normalized.events?.events ?? [];
  const checkpoints = normalized.checkpoints?.checkpoints ?? [];
  return {
    present: normalized.present,
    legacyLimited: !normalized.present && Boolean(normalized.legacyReplay),
    contract: manifest.contract ?? null,
    version: manifest.version ?? null,
    replayMode: manifest.replayMode ?? null,
    replayFidelity: manifest.replayFidelity ?? (normalized.legacyReplay ? 'legacyLimited' : null),
    compatibilityStatus: manifest.compatibilityStatus ?? normalized.alignmentReport?.compatibilityStatus ?? null,
    scenarioId: manifest.scenarioId ?? null,
    missionId: manifest.missionId ?? null,
    episodeId: manifest.episodeId ?? null,
    seed: manifest.seed ?? normalized.legacyReplay?.seed ?? null,
    eventCount: events.length,
    checkpointCount: checkpoints.length,
    surfacingCount: events.filter((event) => event.phase === 'surfacing').length,
    objectiveTransitionCount: events.filter((event) => event.phase === 'objective').length,
    terminalTick: checkpoints.at(-1)?.tick ?? null,
    terminalDigest: checkpoints.at(-1)?.digest?.value ?? null,
    changesOfficialBrowserScoring: manifest.changesOfficialBrowserScoring === false,
    publicSafe: manifest.publicSafe !== false,
    hiddenTruthIncluded: manifest.hiddenTruthIncluded === true,
    warning: normalized.legacyReplay && !normalized.present ? 'Legacy replay metadata only; deterministic REPLAY-R1 alignment is unavailable.' : null
  };
}

export function scanForbiddenPublicMarkers(value, options = {}) {
  const failures = [];
  const seen = new Set();
  function visit(node, path = []) {
    if (!node || typeof node !== 'object') {
      if (typeof node === 'string' && FORBIDDEN_PUBLIC_MARKERS.includes(node)) failures.push(`Public replay artifact contains forbidden marker ${node} at ${path.join('.') || '<root>'}.`);
      return;
    }
    if (seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      node.forEach((entry, index) => visit(entry, [...path, String(index)]));
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      const childPath = [...path, key];
      if (FORBIDDEN_PUBLIC_MARKERS.includes(key)) failures.push(`Public replay artifact contains forbidden key ${key} at ${childPath.join('.')}.`);
      if (typeof child === 'string' && FORBIDDEN_PUBLIC_MARKERS.includes(child)) failures.push(`Public replay artifact contains forbidden marker ${child} at ${childPath.join('.')}.`);
      visit(child, childPath);
    }
  }
  visit(value);
  return { failures };
}

function validateReplayEventSequence(events, manifest, failures, warnings, checks) {
  const seenSequences = new Set();
  let previousSequence = -1;
  let previousTick = -1;
  const knownAgents = new Set([...(manifest.agentIds ?? []), ...Object.keys(manifest.initialState?.vehicles ?? {})]);
  for (const event of events) {
    const sequence = Number(event.sequence);
    const tick = Number(event.tick);
    if (!Number.isInteger(sequence) || sequence < 0) failures.push(`Replay event ${event.eventId ?? 'unknown'} has invalid sequence.`);
    if (seenSequences.has(sequence)) failures.push(`Replay event sequence ${sequence} is duplicated.`);
    seenSequences.add(sequence);
    if (Number.isFinite(sequence) && sequence <= previousSequence) failures.push(`Replay event sequence ${sequence} is non-monotonic after ${previousSequence}.`);
    previousSequence = sequence;
    if (!Number.isFinite(tick) || tick < 0 || !Number.isInteger(tick)) failures.push(`Replay event ${event.eventId ?? sequence} has invalid tick.`);
    if (Number.isFinite(tick) && tick < previousTick) failures.push(`Replay event ${event.eventId ?? sequence} has non-monotonic tick.`);
    previousTick = Number.isFinite(tick) ? tick : previousTick;
    if (!event.phase) failures.push(`Replay event ${event.eventId ?? sequence} is missing phase.`);
    if (!event.eventType) failures.push(`Replay event ${event.eventId ?? sequence} is missing eventType.`);
    if (event.agentId && knownAgents.size && !knownAgents.has(event.agentId)) warnings.push(`Replay event ${event.eventId ?? sequence} references unknown agent ${event.agentId}.`);
  }
  checks.push({ id: 'replay-events-sequence-count', ok: seenSequences.size === events.length, detail: events.length });
}

function replayValidationResult(checks, warnings, failures, artifacts) {
  return {
    status: failures.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS',
    checks,
    warnings,
    failures,
    summary: replayArtifactsSummary(artifacts),
    visibilityRisk: failures.some((entry) => /hidden|oracle|referee|T_hiddenTruth/i.test(entry)) ? 'high' : warnings.some((entry) => /hidden|legacy/i.test(entry)) ? 'medium' : 'low'
  };
}

function emptyReplayArtifacts() {
  return { present: false, manifest: null, events: null, checkpoints: null, alignmentReport: null, legacyReplay: null };
}



