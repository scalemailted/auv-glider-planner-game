import assert from 'node:assert/strict';
import {
  advectSemiLagrangian,
  centroidOfMass,
  clamp01,
  createGrid,
  fieldStats,
  gradientMagnitude,
  laplacian,
  maskField,
  normalizeField,
  sampleBilinear
} from '../../src/core/demo/coupled/CoupledFieldMath.js';

const constant = createGrid(8, 6, 0.4);
const lap = laplacian(constant);
const grad = gradientMagnitude(constant);

assert.ok(lap.flat().every((value) => Math.abs(value) < 1e-9), 'laplacian of a constant field should be near zero');
assert.ok(grad.flat().every((value) => Math.abs(value) < 1e-9), 'gradient of a constant field should be zero');
assert.equal(clamp01(2), 1, 'clamp01 clamps high values');
assert.equal(clamp01(-1), 0, 'clamp01 clamps low values');
assert.ok(Number.isFinite(sampleBilinear(constant, 2.4, 1.2)), 'bilinear sample is finite');

const normalized = normalizeField(createGrid(4, 4, (col, row) => col - row));
assert.ok(normalized.flat().every((value) => Number.isFinite(value) && value >= 0 && value <= 1), 'normalization stays finite and bounded');

const advected = advectSemiLagrangian(constant, () => ({ u: 0, v: 0 }), 1);
const advectedStats = fieldStats(advected);
assert.ok(Math.abs(advectedStats.mean - 0.4) < 1e-9, 'zero-flow advection leaves constant field unchanged');

const mask = createGrid(8, 6, (col) => (col < 2 ? 0 : 1));
const masked = maskField(constant, mask);
assert.ok(masked.every((row) => row[0] === 0 && row[1] === 0), 'mask zeros masked cells');
assert.ok(Number.isFinite(centroidOfMass(masked).x), 'centroid is finite');
assert.ok(Number.isFinite(fieldStats(masked).mean), 'field stats are finite');

console.log('Coupled process field math smoke passed');
