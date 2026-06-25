import { stableDigest as contractStableDigest } from '../../contracts/src/index.js';

export function clonePlain(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    if (Array.isArray(value)) return value.map((entry) => clonePlain(entry));
    if (typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([_key, entry]) => typeof entry !== 'function').map(([key, entry]) => [key, clonePlain(entry)]));
    return value;
  }
}

export function stable(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? Number(value.toFixed(6)) : null;
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) return { arrayType: value.constructor.name, values: Array.from(value).map(stable) };
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) if (typeof value[key] !== 'function' && !key.startsWith('__')) out[key] = stable(value[key]);
    return out;
  }
  return String(value);
}

export function stableDigest(value, prefix = 'fnv1a32') {
  return contractStableDigest(stable(value), prefix);
}

export function compactObject(value = {}) {
  return Object.fromEntries(Object.entries(value).filter(([_key, entry]) => entry !== undefined));
}

export function stringOrNull(value) {
  const text = String(value ?? '').trim();
  return text || null;
}

export function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function positiveNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

export function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

export function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}

export function normalizeArray(values = []) {
  return Array.isArray(values) ? values : values == null ? [] : [values];
}

export function validationReport(errors = [], warnings = []) {
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

export function distance2d(a = {}, b = {}) {
  return Math.hypot(finiteNumber(b.x, 0) - finiteNumber(a.x, 0), finiteNumber(b.y, 0) - finiteNumber(a.y, 0));
}

export function pathDistance(points = []) {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) total += distance2d(points[index - 1], points[index]);
  return total;
}