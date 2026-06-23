export const STABLE_DIGEST_VERSION = 'stable-json-fnv1a32-arch-r1';

function isTypedArray(value) {
  return ArrayBuffer.isView(value) && !(value instanceof DataView);
}

function normalizeForStableJson(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (isTypedArray(value)) {
    return {
      arrayType: value.constructor.name,
      values: Array.from(value),
    };
  }
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeForStableJson(entry));
  }
  if (typeof value === 'object') {
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      if (typeof value[key] !== 'function') {
        sorted[key] = normalizeForStableJson(value[key]);
      }
    }
    return sorted;
  }
  return String(value);
}

export function stableStringify(value) {
  return JSON.stringify(normalizeForStableJson(value));
}

export function fnv1a32(text) {
  let hash = 0x811c9dc5;
  const input = String(text ?? '');
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function stableDigest(value, prefix = 'fnv1a32') {
  return `${prefix}:${fnv1a32(stableStringify(value))}`;
}

export function artifactDigest(value) {
  return stableDigest(value, 'anchor-artifact-fnv1a32');
}

export function digestRecord(kind, value) {
  return {
    algorithm: STABLE_DIGEST_VERSION,
    kind: String(kind || 'artifact'),
    digest: artifactDigest(value),
  };
}
