import { ARTIFACT_SAFETY_LIMITS_VERSION, FailureCodes } from './ArtifactKindRegistry.js';
import { UNSAFE_OBJECT_KEYS, utf8ByteLength } from './CanonicalJson.js';
import { codecFailure, codecWarning } from './CodecError.js';

export const ArtifactSafetyLimits = Object.freeze({
  version: ARTIFACT_SAFETY_LIMITS_VERSION,
  defaults: Object.freeze({
    maxInputBytes: 8 * 1024 * 1024,
    maxNestingDepth: 64,
    maxObjectKeyCount: 50000,
    maxArrayLength: 250000,
    maxWaypointCount: 5000,
    maxAgentCount: 128,
    maxEventCount: 250000,
    maxCheckpointCount: 50000,
    maxFieldAxisCount: 2048,
    maxTotalFieldValues: 4000000,
    maxJsonLineRecords: 100000,
    maxJsonLineBytes: 1024 * 1024,
    maxStringLength: 1024 * 1024
  }),
  overrides: Object.freeze({
    replayEvents: Object.freeze({ maxEventCount: 500000, maxArrayLength: 600000 }),
    replayCheckpoints: Object.freeze({ maxCheckpointCount: 100000, maxArrayLength: 200000 }),
    replayBundle: Object.freeze({ maxEventCount: 500000, maxCheckpointCount: 100000 }),
    headlessBundle: Object.freeze({ maxEventCount: 500000, maxCheckpointCount: 100000 }),
    solverPacket: Object.freeze({ maxTotalFieldValues: 6000000 }),
    mlJsonlRecord: Object.freeze({ maxStringLength: 2 * 1024 * 1024 })
  })
});

export function limitsForArtifact(kindOrEntry = null, overrides = {}) {
  const kind = typeof kindOrEntry === 'string' ? kindOrEntry : kindOrEntry?.kind;
  return {
    ...ArtifactSafetyLimits.defaults,
    ...(ArtifactSafetyLimits.overrides[kind] ?? {}),
    ...(overrides ?? {})
  };
}

export function safetyReportForValue(value, options = {}) {
  const limits = limitsForArtifact(options.registryEntry ?? options.kind, options.limits);
  const report = {
    version: ArtifactSafetyLimits.version,
    status: 'PASS',
    limits,
    warnings: [],
    failures: [],
    counts: {
      objectKeys: 0,
      arrays: 0,
      values: 0,
      waypoints: 0,
      agents: 0,
      events: 0,
      checkpoints: 0,
      maxDepth: 0,
      maxArrayLength: 0,
      maxStringBytes: 0,
      fieldValues: 0
    }
  };
  const seen = new WeakSet();
  walk(value, '$', 0, limits, report, seen);
  classifyHardLimits(report, limits);
  report.status = report.failures.length ? 'FAIL' : (report.warnings.length ? 'WARN' : 'PASS');
  return report;
}

export function assertSafety(value, options = {}) {
  const report = safetyReportForValue(value, options);
  if (report.failures.length) {
    const first = report.failures[0];
    const error = new Error(first.message);
    error.code = first.code;
    error.report = report;
    throw error;
  }
  return report;
}

function walk(value, path, depth, limits, report, seen) {
  report.counts.values += 1;
  report.counts.maxDepth = Math.max(report.counts.maxDepth, depth);
  if (depth > limits.maxNestingDepth) {
    report.failures.push(codecFailure(FailureCodes.DIMENSION_LIMIT_EXCEEDED, `Nesting depth exceeds ${limits.maxNestingDepth}`, path, { depth }));
    return;
  }
  if (value === null) return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) report.failures.push(codecFailure(FailureCodes.NONFINITE_NUMBER, 'Non-finite number is not allowed.', path));
    return;
  }
  if (typeof value === 'string') {
    const bytes = utf8ByteLength(value);
    report.counts.maxStringBytes = Math.max(report.counts.maxStringBytes, bytes);
    if (bytes > limits.maxStringLength) report.failures.push(codecFailure(FailureCodes.DIMENSION_LIMIT_EXCEEDED, `String exceeds ${limits.maxStringLength} bytes.`, path, { bytes }));
    if (/<\s*script\b|javascript\s*:/i.test(value)) report.failures.push(codecFailure(FailureCodes.RUNTIME_VALIDATION_FAILED, 'Executable text is not allowed in codec payload fields.', path));
    return;
  }
  if (typeof value === 'boolean') return;
  if (typeof value === 'bigint' || typeof value === 'function' || typeof value === 'symbol' || value === undefined) {
    report.failures.push(codecFailure(FailureCodes.RUNTIME_VALIDATION_FAILED, 'Value is not JSON-compatible.', path));
    return;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      report.failures.push(codecFailure(FailureCodes.RUNTIME_VALIDATION_FAILED, 'Cyclic value is not allowed.', path));
      return;
    }
    seen.add(value);
    report.counts.arrays += 1;
    report.counts.maxArrayLength = Math.max(report.counts.maxArrayLength, value.length);
    if (value.length > limits.maxArrayLength) report.failures.push(codecFailure(FailureCodes.DIMENSION_LIMIT_EXCEEDED, `Array exceeds ${limits.maxArrayLength} entries.`, path, { length: value.length }));
    for (let index = 0; index < value.length; index += 1) walk(value[index], `${path}[${index}]`, depth + 1, limits, report, seen);
    seen.delete(value);
    return;
  }
  if (typeof value === 'object') {
    if (seen.has(value)) {
      report.failures.push(codecFailure(FailureCodes.RUNTIME_VALIDATION_FAILED, 'Cyclic value is not allowed.', path));
      return;
    }
    seen.add(value);
    const keys = Object.keys(value);
    report.counts.objectKeys += keys.length;
    for (const key of keys) {
      const childPath = `${path}.${key}`;
      if (UNSAFE_OBJECT_KEYS.includes(key)) report.failures.push(codecFailure(FailureCodes.UNSAFE_OBJECT_KEY, `Unsafe object key ${key}.`, childPath));
      updateSemanticCounts(key, value[key], report);
      walk(value[key], childPath, depth + 1, limits, report, seen);
    }
    seen.delete(value);
  }
}

function updateSemanticCounts(key, value, report) {
  if (!Array.isArray(value)) return;
  if (key === 'waypoints') report.counts.waypoints += value.length;
  if (key === 'agents' || key === 'agentPlans') report.counts.agents += value.length;
  if (key === 'events') report.counts.events += value.length;
  if (key === 'checkpoints') report.counts.checkpoints += value.length;
  if (/^(x|y|z|time|times|depths|latitudes|longitudes|values|u|v|w|scalar|roi)$/i.test(key)) {
    report.counts.fieldValues += countLeafValues(value);
  }
}

function countLeafValues(value) {
  if (!Array.isArray(value)) return 1;
  let total = 0;
  for (const item of value) total += countLeafValues(item);
  return total;
}

function classifyHardLimits(report, limits) {
  const countChecks = [
    ['objectKeys', limits.maxObjectKeyCount, 'Object key count'],
    ['waypoints', limits.maxWaypointCount, 'Waypoint count'],
    ['agents', limits.maxAgentCount, 'Agent count'],
    ['events', limits.maxEventCount, 'Event count'],
    ['checkpoints', limits.maxCheckpointCount, 'Checkpoint count'],
    ['fieldValues', limits.maxTotalFieldValues, 'Field value count']
  ];
  for (const [key, limit, label] of countChecks) {
    if (Number(report.counts[key]) > limit) report.failures.push(codecFailure(FailureCodes.DIMENSION_LIMIT_EXCEEDED, `${label} exceeds ${limit}.`, '$', { count: report.counts[key], limit }));
  }
  if (report.counts.maxArrayLength > limits.maxArrayLength) report.failures.push(codecFailure(FailureCodes.DIMENSION_LIMIT_EXCEEDED, `Largest array exceeds ${limits.maxArrayLength}.`, '$', { count: report.counts.maxArrayLength, limit: limits.maxArrayLength }));
  if (report.counts.maxDepth > Math.max(16, Math.floor(limits.maxNestingDepth * 0.75)) && !report.failures.length) {
    report.warnings.push(codecWarning('DEEP_JSON_STRUCTURE', 'Artifact structure is deeply nested; import remains within configured limits.', '$', { depth: report.counts.maxDepth }));
  }
}