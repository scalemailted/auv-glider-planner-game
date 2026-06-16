import assert from 'node:assert/strict';
import {
  absFieldDifference,
  createScalarField,
  distanceToNearestObservationField,
  fieldDifference,
  finiteFieldCheck,
  normalizeField,
  sampleBilinear,
  smoothKernelFieldFromObservations
} from '../../src/core/demo/uncertainty/UncertaintyFieldMath.js';

const field = createScalarField(4, 3, (x, y) => x + y);
assert.equal(field.length, 3);
assert.equal(field[0].length, 4);
assert.equal(finiteFieldCheck(field).ok, true);

const normalized = normalizeField([[-1, 0], [2, 4]]);
assert.equal(finiteFieldCheck(normalized).ok, true);
assert.equal(normalized[0][0], 0);
assert.equal(normalized[1][1], 1);

const diff = fieldDifference([[0.2, 0.7]], [[0.1, 0.3]]);
assert.equal(diff[0][0], 0.1);
assert.equal(diff[0][1], 0.4);
const absDiff = absFieldDifference([[0.2]], [[0.7]]);
assert.equal(absDiff[0][0], 0.5);

const sampled = sampleBilinear([[0, 1], [1, 0]], 0.5, 0.5);
assert.ok(sampled > 0.45 && sampled < 0.55);

const distance = distanceToNearestObservationField([{ x: 2, y: 2, observedValue: 1 }], 5, 5);
assert.ok(distance[2][2] < distance[0][0]);

const smoothed = smoothKernelFieldFromObservations([{ x: 2, y: 2, observedValue: 1 }], 5, 5, { lengthScale: 1, fallback: 0 });
assert.ok(smoothed[2][2] > smoothed[0][0]);
assert.equal(finiteFieldCheck(smoothed).ok, true);

console.log('smoke_uncertainty_field_math: ok');