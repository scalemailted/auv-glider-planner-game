import { buildReplayArtifactsFromBundle } from './ReplayContractBuilder.js';
import { replayDigestMatches } from './ReplayDigest.js';
import {
  REPLAY_ARTIFACT_TYPES,
  REPLAY_R1_SCHEMA_VERSION,
  buildReplayContract,
  normalizeReplayArtifacts,
  validateReplayArtifacts
} from './ReplaySchema.js';
import { validateCanonicalReplayEventOrder } from './ReplayOrdering.js';

export function verifyReplayBundle(bundle = {}, options = {}) {
  const reference = normalizeReplayArtifacts(bundle);
  if (!reference.present) {
    const validation = validateReplayArtifacts(bundle, { allowLegacy: true });
    return replayAlignmentReport({
      replayId: bundle.replay?.seed ?? bundle.manifest?.episodeId ?? 'legacy-bundle',
      status: validation.status === 'FAIL' ? 'FAIL' : 'WARN',
      compatibilityStatus: 'legacy-limited',
      replayMode: bundle.replay?.replayMode ?? 'legacyLimited',
      checks: validation.checks,
      warnings: validation.warnings,
      failures: validation.failures,
      firstDivergence: validation.failures.length ? { mismatchClass: 'missing-data', path: 'replayManifest', expected: 'REPLAY-R1 artifacts', actual: 'missing' } : null,
      summary: validation.summary
    });
  }
  const replayOptions = { ...options };
  replayOptions.checkpointEvery ??= inferCheckpointEvery(reference.checkpoints?.checkpoints);
  const candidate = buildReplayArtifactsFromBundle(bundle, replayOptions);
  return compareReplayArtifacts(reference, candidate, replayOptions);
}

export function compareReplayArtifacts(referenceSource = {}, candidateSource = {}, options = {}) {
  const reference = normalizeReplayArtifacts(referenceSource);
  const candidate = normalizeReplayArtifacts(candidateSource);
  const referenceValidation = validateReplayArtifacts(reference, { allowLegacy: false });
  const candidateValidation = validateReplayArtifacts(candidate, { allowLegacy: false });
  const checks = [
    ...referenceValidation.checks.map((check) => ({ ...check, side: 'reference' })),
    ...candidateValidation.checks.map((check) => ({ ...check, side: 'candidate' }))
  ];
  const warnings = [...referenceValidation.warnings, ...candidateValidation.warnings];
  const failures = [...referenceValidation.failures, ...candidateValidation.failures];
  let firstDivergence = null;

  if (!firstDivergence && reference.manifest?.version !== candidate.manifest?.version) {
    firstDivergence = mismatch('schema-version-mismatch', 'manifest.version', reference.manifest?.version, candidate.manifest?.version);
  }
  if (!firstDivergence && reference.manifest?.replayMode !== candidate.manifest?.replayMode) {
    firstDivergence = mismatch('unsupported-feature', 'manifest.replayMode', reference.manifest?.replayMode, candidate.manifest?.replayMode);
  }
  const orderValidation = validateCanonicalReplayEventOrder(reference.events?.events ?? []);
  checks.push(...orderValidation.checks.map((check) => ({ ...check, side: 'reference' })));
  failures.push(...orderValidation.failures.map((entry) => `reference event ordering: ${entry}`));
  const candidateOrderValidation = validateCanonicalReplayEventOrder(candidate.events?.events ?? []);
  checks.push(...candidateOrderValidation.checks.map((check) => ({ ...check, side: 'candidate' })));
  failures.push(...candidateOrderValidation.failures.map((entry) => `candidate event ordering: ${entry}`));
  if (!firstDivergence && orderValidation.failures.length) firstDivergence = mismatch('event-ordering-divergence', 'events', 'canonical order', orderValidation.failures[0]);
  if (!firstDivergence && candidateOrderValidation.failures.length) firstDivergence = mismatch('event-ordering-divergence', 'candidate.events', 'canonical order', candidateOrderValidation.failures[0]);

  if (!firstDivergence) {
    firstDivergence = compareCheckpoints(reference.checkpoints?.checkpoints ?? [], candidate.checkpoints?.checkpoints ?? []);
  }
  if (!firstDivergence) {
    const referenceScoreVersion = reference.manifest?.scoringSchemaVersion ?? null;
    const candidateScoreVersion = candidate.manifest?.scoringSchemaVersion ?? null;
    if (referenceScoreVersion !== candidateScoreVersion) firstDivergence = mismatch('score-report-mismatch', 'manifest.scoringSchemaVersion', referenceScoreVersion, candidateScoreVersion);
  }
  if (firstDivergence) failures.push(`Replay divergence: ${firstDivergence.mismatchClass} at ${firstDivergence.path}.`);

  const status = failures.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS';
  return replayAlignmentReport({
    replayId: reference.manifest?.replayId ?? candidate.manifest?.replayId ?? 'replay-r1',
    status,
    compatibilityStatus: firstDivergence ? 'diverged' : status === 'PASS' ? 'aligned' : 'aligned-with-warnings',
    replayMode: reference.manifest?.replayMode ?? candidate.manifest?.replayMode ?? null,
    checks,
    warnings,
    failures,
    firstDivergence,
    summary: {
      referenceEventCount: reference.events?.events?.length ?? 0,
      candidateEventCount: candidate.events?.events?.length ?? 0,
      referenceCheckpointCount: reference.checkpoints?.checkpoints?.length ?? 0,
      candidateCheckpointCount: candidate.checkpoints?.checkpoints?.length ?? 0,
      terminalDigest: reference.checkpoints?.checkpoints?.at(-1)?.digest?.value ?? null,
      scoringSchemaVersion: reference.manifest?.scoringSchemaVersion ?? null,
      changesOfficialBrowserScoring: false,
      strict: options.strict === true
    }
  });
}

export function verifyReplayCheckpoints(checkpointsPayload = {}, options = {}) {
  const checkpoints = checkpointsPayload?.checkpoints ?? [];
  const failures = [];
  const checks = [];
  for (const checkpoint of checkpoints) {
    const match = replayDigestMatches(checkpoint.digest, checkpoint.publicState, checkpointsPayload.numericPolicy);
    checks.push({ id: `checkpoint-digest-${checkpoint.checkpointId ?? checkpoint.tick}`, ok: match.ok, tick: checkpoint.tick });
    if (!match.ok) failures.push(`Checkpoint ${checkpoint.checkpointId ?? checkpoint.tick} digest mismatch: expected ${match.expected?.value ?? 'missing'}, got ${match.actual.value}.`);
  }
  return replayAlignmentReport({
    replayId: checkpointsPayload.replayId ?? 'checkpoint-verification',
    status: failures.length ? 'FAIL' : 'PASS',
    compatibilityStatus: failures.length ? 'diverged' : 'aligned',
    replayMode: options.replayMode ?? null,
    checks,
    warnings: [],
    failures,
    firstDivergence: failures.length ? mismatch('checkpoint-digest-mismatch', 'checkpoints', 'recorded digest', 'recomputed digest') : null,
    summary: { checkpointCount: checkpoints.length, changesOfficialBrowserScoring: false }
  });
}

function inferCheckpointEvery(checkpoints = []) {
  const periodicTicks = checkpoints
    .filter((checkpoint) => checkpoint.reasons?.includes?.('periodic'))
    .map((checkpoint) => Number(checkpoint.tick))
    .filter((tick) => Number.isFinite(tick) && tick > 0)
    .sort((a, b) => a - b);
  if (!periodicTicks.length) return undefined;
  return periodicTicks[0];
}
function compareCheckpoints(reference = [], candidate = []) {
  if (reference.length !== candidate.length) return mismatch('missing-data', 'checkpoints.length', reference.length, candidate.length);
  for (let index = 0; index < reference.length; index += 1) {
    const expected = reference[index];
    const actual = candidate[index];
    if (expected.tick !== actual.tick) return mismatch('deterministic-state-divergence', `checkpoints[${index}].tick`, expected.tick, actual.tick, { tick: actual.tick, checkpointIndex: index });
    if (expected.digest?.value !== actual.digest?.value) {
      const fieldDiff = firstValueDifference(expected.publicState, actual.publicState);
      return mismatch('checkpoint-digest-mismatch', fieldDiff.path ? `checkpoints[${index}].publicState.${fieldDiff.path}` : `checkpoints[${index}].digest`, fieldDiff.expected ?? expected.digest?.value, fieldDiff.actual ?? actual.digest?.value, {
        tick: expected.tick,
        checkpointIndex: index,
        expectedDigest: expected.digest?.value,
        actualDigest: actual.digest?.value,
        absoluteDifference: fieldDiff.absoluteDifference,
        relativeDifference: fieldDiff.relativeDifference
      });
    }
  }
  return null;
}

export function firstValueDifference(expected, actual, path = '') {
  if (Object.is(expected, actual)) return { path: null, expected, actual };
  if (typeof expected === 'number' && typeof actual === 'number') {
    const absoluteDifference = Math.abs(expected - actual);
    const relativeDifference = Math.abs(expected) > 0 ? absoluteDifference / Math.abs(expected) : absoluteDifference;
    if (absoluteDifference === 0) return { path: null, expected, actual };
    return { path, expected, actual, absoluteDifference, relativeDifference };
  }
  if (!expected || !actual || typeof expected !== 'object' || typeof actual !== 'object') return { path, expected, actual };
  const keys = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort();
  for (const key of keys) {
    if (!Object.hasOwn(expected, key) || !Object.hasOwn(actual, key)) return { path: joinPath(path, key), expected: expected[key], actual: actual[key] };
    const diff = firstValueDifference(expected[key], actual[key], joinPath(path, key));
    if (diff.path) return diff;
  }
  return { path: null, expected, actual };
}

function replayAlignmentReport({ replayId, status, compatibilityStatus, replayMode, checks, warnings, failures, firstDivergence, summary }) {
  return {
    type: REPLAY_ARTIFACT_TYPES.alignmentReport,
    version: REPLAY_R1_SCHEMA_VERSION,
    replayId,
    contract: 'REPLAY-R1',
    status,
    compatibilityStatus,
    replayMode,
    firstDivergence,
    mismatchClass: firstDivergence?.mismatchClass ?? null,
    checks,
    warnings,
    failures,
    summary: {
      ...(summary ?? {}),
      checkCount: checks.length,
      warningCount: warnings.length,
      failureCount: failures.length,
      changesOfficialBrowserScoring: false
    },
    changesOfficialBrowserScoring: false,
    scoreR1ShadowOnly: true,
    boundary: 'Replay verification compares public replay state and SCORE-R1 shadow artifacts; it does not alter official browser scoring.'
  };
}

function mismatch(mismatchClass, path, expected, actual, extra = {}) {
  return { mismatchClass, path, expected, actual, ...extra };
}

function joinPath(prefix, key) {
  return prefix ? `${prefix}.${key}` : String(key);
}

export { buildReplayContract };
