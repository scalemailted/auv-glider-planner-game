import assert from 'node:assert/strict';

export { assert };

export function near(actual, expected, tolerance = 1e-6, label = 'value') {
  assert.ok(Number.isFinite(Number(actual)), `${label} must be finite`);
  assert.ok(Math.abs(Number(actual) - Number(expected)) <= tolerance, `${label} expected ${expected}, got ${actual}`);
}

export function vectorDistance(a = {}, b = {}) {
  return Math.hypot(Number(a.uEastMetersPerSecond ?? a.u ?? 0) - Number(b.uEastMetersPerSecond ?? b.u ?? 0), Number(a.vNorthMetersPerSecond ?? a.v ?? 0) - Number(b.vNorthMetersPerSecond ?? b.v ?? 0));
}

export function finiteSample(sample = {}) {
  assert.equal(Number.isFinite(Number(sample.uEastMetersPerSecond)), true, 'u must be finite');
  assert.equal(Number.isFinite(Number(sample.vNorthMetersPerSecond)), true, 'v must be finite');
  assert.equal(Number.isFinite(Number(sample.magnitudeMetersPerSecond)), true, 'magnitude must be finite');
}
