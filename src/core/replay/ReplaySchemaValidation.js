import {
  REPLAY_ARTIFACT_TYPES,
  REPLAY_MODES,
  REPLAY_R1_CONTRACT_ID,
  REPLAY_R1_SCHEMA_VERSION,
  normalizeReplayArtifacts
} from './ReplaySchema.js';
import { replayCompatibilityForArtifact } from './ReplayCompatibility.js';

export const REPLAY_SCHEMA_VALIDATION_VERSION = 'replay-schema-validation-h4.1';

const OPTIONAL_H41_MANIFEST_FIELDS = Object.freeze(['schemaVersion', 'replayVersion', 'seedSubstreams', 'initialPublicState', 'timestepSeconds', 'publicBoundary', 'checkpointPolicy', 'terminalReason']);
const OPTIONAL_H41_EVENT_FIELDS = Object.freeze(['schemaVersion']);
const OPTIONAL_H41_CHECKPOINT_FIELDS = Object.freeze(['schemaVersion', 'eventCursor', 'agentStates', 'digestAlgorithmId', 'digestVersion', 'quantization', 'publicSafe']);

export function validateReplayManifest(manifest = {}, options = {}) {
  const checkedFields = [];
  const errors = [];
  const warnings = [];
  if (!isObject(manifest)) errors.push(fieldError('manifest', 'Replay manifest must be an object.'));
  requireValue(manifest, 'type', checkedFields, errors, REPLAY_ARTIFACT_TYPES.manifest);
  requireVersion(manifest, checkedFields, errors);
  requireValue(manifest, 'contract', checkedFields, errors, REPLAY_R1_CONTRACT_ID);
  requireNonEmpty(manifest, 'replayId', checkedFields, errors);
  requireNonEmpty(manifest, 'replayMode', checkedFields, errors);
  if (manifest?.replayMode && !Object.values(REPLAY_MODES).includes(manifest.replayMode) && !['protectedRefereeReplayReserved', 'authoritativeResimulationReserved'].includes(manifest.replayMode)) {
    errors.push(fieldError('replayMode', `Unsupported replay mode ${manifest.replayMode}.`));
  }
  requireNonEmpty(manifest, 'seed', checkedFields, errors);
  if (!isObject(manifest?.timingModel)) errors.push(fieldError('timingModel', 'Replay manifest must include timingModel.'));
  else {
    checkedFields.push('timingModel.dtSeconds');
    if (!positiveFinite(manifest.timingModel.dtSeconds)) errors.push(fieldError('timingModel.dtSeconds', 'Timing model dtSeconds must be finite and positive.'));
  }
  if (!isObject(manifest?.initialPublicState ?? manifest?.initialState)) errors.push(fieldError('initialPublicState', 'Replay manifest must include initialPublicState or REPLAY-R1 initialState.'));
  if (manifest?.changesOfficialBrowserScoring !== false) errors.push(fieldError('changesOfficialBrowserScoring', 'Replay manifest must preserve changesOfficialBrowserScoring=false.'));
  for (const field of OPTIONAL_H41_MANIFEST_FIELDS) if (manifest?.[field] === undefined) warnings.push(fieldWarning(field, `Optional H4.1 manifest field ${field} is missing; accepted for older REPLAY-R1 artifacts.`));
  if (!manifest?.missionId) warnings.push(fieldWarning('missionId', 'missionId is missing or null.'));
  if (!manifest?.scenarioId) warnings.push(fieldWarning('scenarioId', 'scenarioId is missing or null.'));
  if (!manifest?.episodeId) warnings.push(fieldWarning('episodeId', 'episodeId is missing or null.'));
  const compatibility = replayCompatibilityForArtifact(manifest, options);
  warnings.push(...compatibility.warnings.map((message) => fieldWarning('version', message)));
  errors.push(...compatibility.errors.map((message) => fieldError('version', message)));
  return validationResult('replayManifest', manifest?.schemaVersion ?? manifest?.version ?? null, errors, warnings, checkedFields, compatibility);
}

export function validateReplayEvents(eventsPayload = {}, options = {}) {
  const checkedFields = [];
  const errors = [];
  const warnings = [];
  if (!isObject(eventsPayload)) errors.push(fieldError('events', 'Replay events artifact must be an object.'));
  requireValue(eventsPayload, 'type', checkedFields, errors, REPLAY_ARTIFACT_TYPES.events);
  requireVersion(eventsPayload, checkedFields, errors);
  requireValue(eventsPayload, 'contract', checkedFields, errors, REPLAY_R1_CONTRACT_ID);
  const events = Array.isArray(eventsPayload?.events) ? eventsPayload.events : [];
  checkedFields.push('events');
  if (!Array.isArray(eventsPayload?.events)) errors.push(fieldError('events', 'Replay events artifact must include events[].'));
  if (!events.length) errors.push(fieldError('events', 'Replay events artifact must include at least one event.'));
  const eventIds = new Set();
  const sequences = new Set();
  events.forEach((event, index) => {
    const path = `events[${index}]`;
    if (!isObject(event)) {
      errors.push(fieldError(path, 'Replay event must be an object.'));
      return;
    }
    for (const field of ['eventId', 'tick', 'timeSeconds', 'phase', 'eventType', 'sequence', 'payload', 'publicSafe', 'visibilityTier']) checkedFields.push(`${path}.${field}`);
    if (!event.eventId) errors.push(fieldError(`${path}.eventId`, 'Replay event is missing eventId.'));
    else if (eventIds.has(event.eventId)) errors.push(fieldError(`${path}.eventId`, `Replay eventId ${event.eventId} is duplicated.`));
    eventIds.add(event.eventId);
    if (!nonNegativeInteger(event.tick)) errors.push(fieldError(`${path}.tick`, 'Replay event tick must be a nonnegative integer.'));
    if (!nonNegativeFinite(event.timeSeconds)) errors.push(fieldError(`${path}.timeSeconds`, 'Replay event timeSeconds must be finite and nonnegative.'));
    if (!event.phase) errors.push(fieldError(`${path}.phase`, 'Replay event is missing phase.'));
    if (!event.eventType) errors.push(fieldError(`${path}.eventType`, 'Replay event is missing eventType.'));
    if (!nonNegativeInteger(event.sequence)) errors.push(fieldError(`${path}.sequence`, 'Replay event sequence must be a nonnegative integer.'));
    else if (sequences.has(event.sequence)) errors.push(fieldError(`${path}.sequence`, `Replay event sequence ${event.sequence} is duplicated.`));
    sequences.add(event.sequence);
    if (!isObject(event.payload)) errors.push(fieldError(`${path}.payload`, 'Replay event payload must be an object.'));
    if (event.publicSafe !== true) warnings.push(fieldWarning(`${path}.publicSafe`, 'Replay event should mark publicSafe=true.'));
    if (!event.visibilityTier) warnings.push(fieldWarning(`${path}.visibilityTier`, 'Replay event should include visibilityTier.'));
    for (const field of OPTIONAL_H41_EVENT_FIELDS) if (event[field] === undefined) warnings.push(fieldWarning(`${path}.${field}`, `Optional H4.1 event field ${field} is missing; accepted for older REPLAY-R1 artifacts.`));
  });
  const compatibility = replayCompatibilityForArtifact(eventsPayload, options);
  warnings.push(...compatibility.warnings.map((message) => fieldWarning('version', message)));
  errors.push(...compatibility.errors.map((message) => fieldError('version', message)));
  return validationResult('replayEvents', eventsPayload?.schemaVersion ?? eventsPayload?.version ?? null, errors, warnings, checkedFields, compatibility);
}

export function validateReplayCheckpoints(checkpointsPayload = {}, options = {}) {
  const checkedFields = [];
  const errors = [];
  const warnings = [];
  if (!isObject(checkpointsPayload)) errors.push(fieldError('checkpoints', 'Replay checkpoints artifact must be an object.'));
  requireValue(checkpointsPayload, 'type', checkedFields, errors, REPLAY_ARTIFACT_TYPES.checkpoints);
  requireVersion(checkpointsPayload, checkedFields, errors);
  requireValue(checkpointsPayload, 'contract', checkedFields, errors, REPLAY_R1_CONTRACT_ID);
  const checkpoints = Array.isArray(checkpointsPayload?.checkpoints) ? checkpointsPayload.checkpoints : [];
  checkedFields.push('checkpoints');
  if (!Array.isArray(checkpointsPayload?.checkpoints)) errors.push(fieldError('checkpoints', 'Replay checkpoints artifact must include checkpoints[].'));
  if (!checkpoints.length) errors.push(fieldError('checkpoints', 'Replay checkpoints artifact must include at least one checkpoint.'));
  const ids = new Set();
  checkpoints.forEach((checkpoint, index) => {
    const path = `checkpoints[${index}]`;
    if (!isObject(checkpoint)) {
      errors.push(fieldError(path, 'Replay checkpoint must be an object.'));
      return;
    }
    for (const field of ['checkpointId', 'tick', 'timeSeconds', 'reason', 'eventCursor', 'publicState', 'agentStates', 'objectiveState', 'digest', 'digestAlgorithmId', 'digestVersion', 'quantization', 'publicSafe']) checkedFields.push(`${path}.${field}`);
    if (!checkpoint.checkpointId) errors.push(fieldError(`${path}.checkpointId`, 'Replay checkpoint is missing checkpointId.'));
    else if (ids.has(checkpoint.checkpointId)) errors.push(fieldError(`${path}.checkpointId`, `Replay checkpointId ${checkpoint.checkpointId} is duplicated.`));
    ids.add(checkpoint.checkpointId);
    if (!nonNegativeInteger(checkpoint.tick)) errors.push(fieldError(`${path}.tick`, 'Replay checkpoint tick must be a nonnegative integer.'));
    if (!nonNegativeFinite(checkpoint.timeSeconds)) errors.push(fieldError(`${path}.timeSeconds`, 'Replay checkpoint timeSeconds must be finite and nonnegative.'));
    if (!checkpoint.reason && !Array.isArray(checkpoint.reasons)) warnings.push(fieldWarning(`${path}.reason`, 'Replay checkpoint should include reason or reasons[].'));
    if (!isObject(checkpoint.publicState)) errors.push(fieldError(`${path}.publicState`, 'Replay checkpoint must include publicState.'));
    if (!isObject(checkpoint.digest) || !checkpoint.digest.value) errors.push(fieldError(`${path}.digest`, 'Replay checkpoint must include digest.value.'));
    if (checkpoint.publicSafe !== true) warnings.push(fieldWarning(`${path}.publicSafe`, 'Replay checkpoint should mark publicSafe=true.'));
    for (const field of OPTIONAL_H41_CHECKPOINT_FIELDS) if (checkpoint[field] === undefined) warnings.push(fieldWarning(`${path}.${field}`, `Optional H4.1 checkpoint field ${field} is missing; accepted for older REPLAY-R1 artifacts.`));
  });
  const compatibility = replayCompatibilityForArtifact(checkpointsPayload, options);
  warnings.push(...compatibility.warnings.map((message) => fieldWarning('version', message)));
  errors.push(...compatibility.errors.map((message) => fieldError('version', message)));
  return validationResult('replayCheckpoints', checkpointsPayload?.schemaVersion ?? checkpointsPayload?.version ?? null, errors, warnings, checkedFields, compatibility);
}

export function validateReplayAlignmentReport(report = {}, options = {}) {
  const checkedFields = [];
  const errors = [];
  const warnings = [];
  if (!report) return validationResult('replayAlignmentReport', null, [], [fieldWarning('alignmentReport', 'Replay alignment report is optional and missing.')], checkedFields, { compatibility: 'current', status: 'WARN' });
  if (!isObject(report)) errors.push(fieldError('alignmentReport', 'Replay alignment report must be an object.'));
  requireValue(report, 'type', checkedFields, errors, REPLAY_ARTIFACT_TYPES.alignmentReport);
  requireVersion(report, checkedFields, errors);
  for (const field of ['status', 'replayMode', 'eventCount', 'checkpointCount', 'issues', 'digestSummary', 'orderingSummary', 'publicSafetySummary', 'compatibilitySummary']) {
    checkedFields.push(field);
    if (report[field] === undefined && report.summary?.[field] === undefined) warnings.push(fieldWarning(field, `H4.1 alignment report field ${field} is missing.`));
  }
  const issues = report.issues ?? [];
  if (issues && !Array.isArray(issues)) errors.push(fieldError('issues', 'Replay alignment report issues must be an array.'));
  const compatibility = replayCompatibilityForArtifact(report, options);
  warnings.push(...compatibility.warnings.map((message) => fieldWarning('version', message)));
  errors.push(...compatibility.errors.map((message) => fieldError('version', message)));
  return validationResult('replayAlignmentReport', report?.schemaVersion ?? report?.version ?? null, errors, warnings, checkedFields, compatibility);
}

export function validateReplayBundle(bundle = {}, options = {}) {
  const artifacts = normalizeReplayArtifacts(bundle);
  const results = [
    validateReplayManifest(artifacts.manifest, options),
    validateReplayEvents(artifacts.events, options),
    validateReplayCheckpoints(artifacts.checkpoints, options),
    validateReplayAlignmentReport(artifacts.alignmentReport, options)
  ];
  return replaySchemaValidationSummary(results);
}

export function replaySchemaValidationSummary(results = []) {
  const errors = results.flatMap((result) => result.errors ?? []);
  const warnings = results.flatMap((result) => result.warnings ?? []);
  return {
    version: REPLAY_SCHEMA_VALIDATION_VERSION,
    status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS',
    artifactType: 'replayBundle',
    schemaVersion: REPLAY_R1_SCHEMA_VERSION,
    errors,
    warnings,
    checkedFields: results.flatMap((result) => result.checkedFields ?? []),
    compatibility: results.map((result) => ({ artifactType: result.artifactType, ...(result.compatibility ?? {}) }))
  };
}

function validationResult(artifactType, schemaVersion, errors, warnings, checkedFields, compatibility) {
  return {
    status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS',
    artifactType,
    schemaVersion: schemaVersion ?? null,
    errors,
    warnings,
    checkedFields,
    compatibility: compatibility?.compatibility ?? 'unsupported'
  };
}

function requireValue(object, field, checkedFields, errors, expected = undefined) {
  checkedFields.push(field);
  if (object?.[field] === undefined || object?.[field] === null || object?.[field] === '') errors.push(fieldError(field, `${field} is required.`));
  else if (expected !== undefined && object[field] !== expected) errors.push(fieldError(field, `${field} should be ${expected}, got ${object[field]}.`));
}

function requireNonEmpty(object, field, checkedFields, errors) { requireValue(object, field, checkedFields, errors); }
function requireVersion(object, checkedFields, errors) {
  checkedFields.push('schemaVersion');
  checkedFields.push('version');
  const version = object?.schemaVersion ?? object?.version;
  if (!version) errors.push(fieldError('schemaVersion', 'schemaVersion or REPLAY-R1 version is required.'));
}
function fieldError(path, message) { return { path, message }; }
function fieldWarning(path, message) { return { path, message }; }
function isObject(value) { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function positiveFinite(value) { const number = Number(value); return Number.isFinite(number) && number > 0; }
function nonNegativeFinite(value) { const number = Number(value); return Number.isFinite(number) && number >= 0; }
function nonNegativeInteger(value) { const number = Number(value); return Number.isInteger(number) && number >= 0; }
