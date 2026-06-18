import { REPLAY_MODES, REPLAY_R1_SCHEMA_VERSION } from './ReplaySchema.js';

export const REPLAY_COMPATIBILITY_VERSION = 'replay-compatibility-h4.1';
export const REPLAY_CURRENT_SCHEMA_VERSION = REPLAY_R1_SCHEMA_VERSION;
export const REPLAY_OLDEST_SUPPORTED_SCHEMA_VERSION = REPLAY_R1_SCHEMA_VERSION;
export const REPLAY_SUPPORTED_SCHEMA_VERSIONS = Object.freeze([REPLAY_R1_SCHEMA_VERSION]);

export const REPLAY_RESERVED_REPLAY_MODES = Object.freeze([
  'protectedRefereeReplayReserved',
  'authoritativeResimulationReserved',
  REPLAY_MODES.refereeInternalReplay,
  REPLAY_MODES.authoritativeSimulationReplay
]);

const VERSION_ALIASES = new Map([
  ['REPLAY-R1', REPLAY_R1_SCHEMA_VERSION],
  ['replay-r1', REPLAY_R1_SCHEMA_VERSION],
  ['replay-r1.0', REPLAY_R1_SCHEMA_VERSION],
  ['r1', REPLAY_R1_SCHEMA_VERSION],
  ['1.0', REPLAY_R1_SCHEMA_VERSION]
]);

const MODE_ALIASES = new Map([
  ['public', REPLAY_MODES.publicObservationPlayback],
  ['publicPlayback', REPLAY_MODES.publicObservationPlayback],
  ['publicObservationPlayback', REPLAY_MODES.publicObservationPlayback],
  ['protectedRefereeReplayReserved', 'protectedRefereeReplayReserved'],
  ['authoritativeResimulationReserved', 'authoritativeResimulationReserved'],
  ['refereeInternalReplay', REPLAY_MODES.refereeInternalReplay],
  ['authoritativeSimulationReplay', REPLAY_MODES.authoritativeSimulationReplay]
]);

export function normalizeReplayVersion(value) {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value);
  return VERSION_ALIASES.get(text) ?? text;
}

export function normalizeReplayMode(value) {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value);
  return MODE_ALIASES.get(text) ?? text;
}

export function replayCompatibilityForArtifact(artifact = {}, options = {}) {
  const rawVersion = artifact?.schemaVersion
    ?? artifact?.version
    ?? artifact?.replayVersion
    ?? artifact?.manifest?.schemaVersion
    ?? artifact?.manifest?.version
    ?? null;
  const version = normalizeReplayVersion(rawVersion);
  const rawMode = artifact?.replayMode ?? artifact?.manifest?.replayMode ?? null;
  const replayMode = normalizeReplayMode(rawMode);
  const warnings = [];
  const errors = [];
  let compatibility = 'current';

  if (!version) {
    errors.push('Replay schema version is missing.');
    compatibility = 'unsupported';
  } else if (REPLAY_SUPPORTED_SCHEMA_VERSIONS.includes(version)) {
    compatibility = version === REPLAY_CURRENT_SCHEMA_VERSION ? 'current' : 'backwardCompatible';
  } else if (/^replay-r(\d+|\d+\.\d+)|^replay-/.test(version)) {
    compatibility = 'forwardVersionUnknown';
    warnings.push(`Replay schema version ${version} is newer or unknown; optional fields are not migrated.`);
  } else {
    compatibility = 'unsupported';
    errors.push(`Replay schema version ${version} is unsupported.`);
  }

  if (replayMode && replayMode !== REPLAY_MODES.publicObservationPlayback) {
    if (REPLAY_RESERVED_REPLAY_MODES.includes(replayMode)) {
      warnings.push(`Replay mode ${replayMode} is reserved and not implemented for public playback.`);
    } else {
      errors.push(`Replay mode ${replayMode} is not recognized.`);
    }
  }
  if (options.expectedReplayMode && replayMode !== options.expectedReplayMode) {
    errors.push(`Replay mode ${replayMode ?? 'missing'} does not match expected mode ${options.expectedReplayMode}.`);
  }

  const status = errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS';
  return {
    version: REPLAY_COMPATIBILITY_VERSION,
    status: options.strict === true && warnings.length ? 'FAIL' : status,
    compatibility,
    rawVersion,
    normalizedVersion: version,
    currentSchemaVersion: REPLAY_CURRENT_SCHEMA_VERSION,
    oldestSupportedSchemaVersion: REPLAY_OLDEST_SUPPORTED_SCHEMA_VERSION,
    supportedSchemaVersions: REPLAY_SUPPORTED_SCHEMA_VERSIONS.slice(),
    rawReplayMode: rawMode,
    replayMode,
    publicPlaybackImplemented: replayMode === REPLAY_MODES.publicObservationPlayback,
    reservedReplayMode: REPLAY_RESERVED_REPLAY_MODES.includes(replayMode),
    optionalFieldMigrationPolicy: 'Older REPLAY-R1 artifacts may omit H4.1 optional metadata; validators warn instead of failing when core R1 fields are present.',
    unknownNewerVersionPolicy: options.strict === true ? 'strict-fail-on-warning' : 'warn-forward-version-unknown',
    aliasHandling: 'Known REPLAY-R1 aliases are normalized to replay-r1.0.',
    deprecatedFields: ['deterministicSubstreams is accepted as an alias for seedSubstreams', 'initialState is accepted as an alias for initialPublicState'],
    reservedFutureReplayModes: REPLAY_RESERVED_REPLAY_MODES.slice(),
    warnings,
    errors
  };
}

export function replayCompatibilitySummary(result = {}) {
  return {
    status: result.status ?? 'FAIL',
    compatibility: result.compatibility ?? 'unsupported',
    schemaVersion: result.normalizedVersion ?? null,
    replayMode: result.replayMode ?? null,
    currentSchemaVersion: result.currentSchemaVersion ?? REPLAY_CURRENT_SCHEMA_VERSION,
    publicPlaybackImplemented: result.publicPlaybackImplemented === true,
    reservedReplayMode: result.reservedReplayMode === true,
    warningCount: result.warnings?.length ?? 0,
    errorCount: result.errors?.length ?? 0
  };
}
