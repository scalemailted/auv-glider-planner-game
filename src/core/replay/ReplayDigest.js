import { REPLAY_NUMERIC_POLICY } from './ReplaySchema.js';

const VOLATILE_KEYS = new Set([
  'createdAt',
  'generatedAt',
  'exportedAt',
  'loadedAt',
  'updatedAt',
  'wallClockTime',
  'wallClockMs',
  'elapsedMs',
  'outputDir',
  'absolutePath',
  'localPath',
  'sourceFiles',
  'uiId',
  'domId'
]);

export const REPLAY_DIGEST_ALGORITHM = 'stable-json-fnv1a32-public-state-v1';

export function canonicalizeReplayValue(value, policy = REPLAY_NUMERIC_POLICY, path = []) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return canonicalizeReplayNumber(value, policy, path.at(-1));
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map((entry, index) => canonicalizeReplayValue(entry, policy, [...path, String(index)]));
  if (typeof value === 'object') {
    const result = {};
    for (const key of Object.keys(value).sort()) {
      if (VOLATILE_KEYS.has(key)) continue;
      result[key] = canonicalizeReplayValue(value[key], policy, [...path, key]);
    }
    return result;
  }
  return String(value);
}

export function canonicalizeReplayNumber(value, policy = REPLAY_NUMERIC_POLICY, fieldName = null) {
  if (!Number.isFinite(value)) return null;
  const fieldPolicy = fieldName ? policy.fieldPolicies?.[fieldName] : null;
  if (fieldPolicy?.exact) return Object.is(value, -0) ? 0 : value;
  const decimals = Number.isInteger(fieldPolicy?.decimalPlaces)
    ? fieldPolicy.decimalPlaces
    : Number.isInteger(policy.defaultDecimalPlaces)
      ? policy.defaultDecimalPlaces
      : 6;
  const scale = 10 ** decimals;
  const rounded = Math.round(value * scale) / scale;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function stableReplayJson(value, policy = REPLAY_NUMERIC_POLICY) {
  return JSON.stringify(canonicalizeReplayValue(value, policy));
}

export function replayDigest(value, policy = REPLAY_NUMERIC_POLICY) {
  const json = stableReplayJson(value, policy);
  let hash = 0x811c9dc5;
  for (let index = 0; index < json.length; index += 1) {
    hash ^= json.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return {
    algorithm: REPLAY_DIGEST_ALGORITHM,
    value: `fnv1a32:${hash.toString(16).padStart(8, '0')}`,
    canonicalByteLength: json.length,
    numericPolicyId: policy.id ?? null
  };
}

export function publicReplayStateDigest(publicState, policy = REPLAY_NUMERIC_POLICY) {
  return replayDigest(publicState, policy);
}

export function replayDigestMatches(expectedDigest, actualState, policy = REPLAY_NUMERIC_POLICY) {
  const actualDigest = publicReplayStateDigest(actualState, policy);
  return {
    ok: expectedDigest?.value === actualDigest.value,
    expected: expectedDigest ?? null,
    actual: actualDigest
  };
}
