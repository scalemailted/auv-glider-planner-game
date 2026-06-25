import { fnv1a32 } from '../../contracts/src/index.js';
import { CANONICAL_DIGEST_VERSION, CANONICAL_JSON_VERSION, FailureCodes } from './ArtifactKindRegistry.js';
import { CodecError } from './CodecError.js';

export const UNSAFE_OBJECT_KEYS = Object.freeze(['__proto__', 'prototype', 'constructor']);

function isPlainRecord(value) {
  if (!value || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isTypedArray(value) {
  return ArrayBuffer.isView(value) && !(value instanceof DataView);
}

export function canonicalizeJsonValue(value, options = {}, path = '$', seen = new WeakSet()) {
  const rejectUnsafeKeys = options.rejectUnsafeKeys !== false;
  if (value === null) return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new CodecError(FailureCodes.NONFINITE_NUMBER, `Non-finite number at ${path}`, { path });
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'bigint') throw new CodecError(FailureCodes.RUNTIME_VALIDATION_FAILED, `BigInt is not JSON-compatible at ${path}`, { path });
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
    throw new CodecError(FailureCodes.RUNTIME_VALIDATION_FAILED, `Unsupported JSON value at ${path}`, { path });
  }
  if (isTypedArray(value)) return Array.from(value, (entry, index) => canonicalizeJsonValue(entry, options, `${path}[${index}]`, seen));
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new CodecError(FailureCodes.RUNTIME_VALIDATION_FAILED, `Cyclic value at ${path}`, { path });
    seen.add(value);
    const out = value.map((entry, index) => canonicalizeJsonValue(entry, options, `${path}[${index}]`, seen));
    seen.delete(value);
    return out;
  }
  if (typeof value === 'object') {
    if (seen.has(value)) throw new CodecError(FailureCodes.RUNTIME_VALIDATION_FAILED, `Cyclic value at ${path}`, { path });
    seen.add(value);
    const source = isPlainRecord(value) ? value : Object.fromEntries(Object.entries(value));
    const out = {};
    for (const key of Object.keys(source).sort()) {
      if (rejectUnsafeKeys && UNSAFE_OBJECT_KEYS.includes(key)) {
        throw new CodecError(FailureCodes.UNSAFE_OBJECT_KEY, `Unsafe object key ${key} at ${path}`, { path: `${path}.${key}` });
      }
      const item = source[key];
      if (item === undefined || typeof item === 'function' || typeof item === 'symbol') {
        throw new CodecError(FailureCodes.RUNTIME_VALIDATION_FAILED, `Unsupported JSON property ${key} at ${path}`, { path: `${path}.${key}` });
      }
      out[key] = canonicalizeJsonValue(item, options, `${path}.${key}`, seen);
    }
    seen.delete(value);
    return out;
  }
  throw new CodecError(FailureCodes.RUNTIME_VALIDATION_FAILED, `Unsupported JSON value at ${path}`, { path });
}

export function canonicalJsonStringify(value, options = {}) {
  const normalized = canonicalizeJsonValue(value, options);
  const spacing = options.pretty === true ? 2 : 0;
  const text = JSON.stringify(normalized, null, spacing);
  return options.trailingNewline === true ? `${text}\n` : text;
}

export function canonicalJsonParse(text, options = {}) {
  const input = typeof text === 'string' ? text : new TextDecoder().decode(text);
  const maxBytes = options.maxBytes ?? options.limits?.maxInputBytes ?? null;
  if (maxBytes != null && utf8ByteLength(input) > maxBytes) {
    throw new CodecError(FailureCodes.INPUT_TOO_LARGE, `Input exceeds ${maxBytes} bytes`, { inputBytes: utf8ByteLength(input), maxBytes });
  }
  let parsed;
  try {
    parsed = JSON.parse(input.replace(/^\uFEFF/, ''));
  } catch (error) {
    throw new CodecError(FailureCodes.INVALID_JSON, `Invalid JSON: ${error.message}`, { cause: error.message });
  }
  return canonicalizeJsonValue(parsed, options);
}

export function canonicalJsonDigest(value, options = {}) {
  const compact = canonicalJsonStringify(value, { ...options, pretty: false, trailingNewline: false });
  return `fnv1a32:${fnv1a32(compact)}`;
}

export function canonicalJsonDigestRecord(value, kind = 'payload', options = {}) {
  return {
    algorithm: CANONICAL_DIGEST_VERSION,
    jsonVersion: CANONICAL_JSON_VERSION,
    kind,
    digest: canonicalJsonDigest(value, options)
  };
}

export function cloneCanonicalJson(value, options = {}) {
  return canonicalizeJsonValue(value, options);
}

export function utf8ByteLength(value) {
  return new TextEncoder().encode(String(value ?? '')).length;
}