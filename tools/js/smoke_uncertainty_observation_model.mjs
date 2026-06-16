import assert from 'node:assert/strict';
import {
  applyObservationSet,
  generateObservationPath,
  sampleObservation
} from '../../src/core/demo/uncertainty/ObservationModel.js';
import { createScalarField } from '../../src/core/demo/uncertainty/UncertaintyFieldMath.js';

const truth = createScalarField(6, 4, 0.8);
const forecast = createScalarField(6, 4, 0.25);
const uncertainty = createScalarField(6, 4, 0.1);

const zeroNoise = sampleObservation({ truthField: truth, forecastField: forecast, uncertaintyField: uncertainty, x: 2, y: 1, sensorNoise: 0, seed: 'zero', time: 3 });
assert.equal(zeroNoise.truthValue, 0.8);
assert.equal(zeroNoise.observedValue, 0.8);
assert.equal(zeroNoise.innovation, 0.55);
assert.ok(zeroNoise.surprise > 4);
assert.equal(zeroNoise.row, 1);
assert.equal(zeroNoise.col, 2);

const noisyA = sampleObservation({ truthField: truth, forecastField: forecast, uncertaintyField: uncertainty, x: 2, y: 1, sensorNoise: 0.2, seed: 'noisy', time: 3 });
const noisyB = sampleObservation({ truthField: truth, forecastField: forecast, uncertaintyField: uncertainty, x: 2, y: 1, sensorNoise: 0.2, seed: 'noisy', time: 3 });
assert.equal(noisyA.observedValue, noisyB.observedValue);
assert.notEqual(noisyA.observedValue, zeroNoise.observedValue);

const lowSurprise = sampleObservation({ truthField: forecast, forecastField: forecast, uncertaintyField: createScalarField(6, 4, 0.5), x: 2, y: 1, sensorNoise: 0, seed: 'low' });
assert.ok(zeroNoise.surprise > lowSurprise.surprise);

const path = generateObservationPath({ pattern: 'boundaryProbe', width: 10, height: 8, count: 5, seed: 'path' });
assert.equal(path.length, 5);
assert.ok(path.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)));

const observations = applyObservationSet({ truthField: truth, forecastField: forecast, uncertaintyField: uncertainty, pattern: 'diagonalTransect', count: 4, seed: 'set', sensorNoise: 0.05 });
assert.equal(observations.length, 4);
assert.ok(observations.every((observation) => Number.isFinite(observation.truthValue) && Number.isFinite(observation.expectedValue)));
assert.ok(observations.every((observation) => Number.isFinite(observation.observedValue) && Number.isFinite(observation.surprise)));

console.log('smoke_uncertainty_observation_model: ok');