import assert from 'node:assert/strict';

import {
  createScalarField,
  finiteFieldCheck,
  fieldStats,
  gradientMagnitude,
  localMaxima,
  normalizeField,
  suppressNearPoints,
  thresholdAmbiguity
} from '../../src/core/demo/samplingPriority/SamplingPriorityFieldMath.js';

const field = createScalarField(5, 4, (x, y) => x - y);
assert.equal(field.length, 4, 'field height');
assert.equal(field[0].length, 5, 'field width');

const normalized = normalizeField(field);
assert.equal(finiteFieldCheck(normalized).ok, true, 'normalized field finite');
assert.ok(fieldStats(normalized).min >= 0, 'normalized min clamps');
assert.ok(fieldStats(normalized).max <= 1, 'normalized max clamps');

const constantGradient = gradientMagnitude(createScalarField(6, 6, 0.4));
assert.equal(fieldStats(constantGradient).max, 0, 'constant gradient is zero');

const ramp = createScalarField(5, 1, (x) => x / 4);
const ambiguity = thresholdAmbiguity(ramp, 0.5);
assert.ok(ambiguity[0][2] > ambiguity[0][0], 'threshold ambiguity peaks near threshold');
assert.ok(ambiguity[0][2] > ambiguity[0][4], 'threshold ambiguity falls away from threshold');

const peaks = createScalarField(5, 5, 0);
peaks[1][1] = 0.9;
peaks[3][3] = 0.8;
const maxima = localMaxima(peaks, { count: 2, minDistance: 1 });
assert.equal(maxima.length, 2, 'local maxima returns expected candidates');
assert.deepEqual(maxima[0], { x: 1, y: 1, col: 1, row: 1, value: 0.9 });

const suppressed = suppressNearPoints(peaks, [{ x: 1, y: 1 }], 3);
assert.ok(suppressed[1][1] < peaks[1][1], 'suppressNearPoints reduces nearby duplicate candidates');
assert.ok(suppressed[3][3] > suppressed[1][1], 'distant peak remains stronger after suppression');

const invalid = createScalarField(2, 2, 1);
invalid[0][0] = Number.NaN;
assert.equal(finiteFieldCheck(invalid).ok, false, 'finiteFieldCheck detects invalid values');

console.log('smoke_sampling_priority_field_math: ok');
