import assert from 'node:assert/strict';
import { updateBeliefFromObservations } from '../../src/core/demo/uncertainty/BeliefUpdateModel.js';
import { createScalarField } from '../../src/core/demo/uncertainty/UncertaintyFieldMath.js';

const forecast = createScalarField(9, 9, 0.2);
const priorUncertainty = createScalarField(9, 9, 0.8);
const observations = [
  { x: 4, y: 4, observedValue: 0.9, time: 0, innovation: 0.7, surprise: 3, sensorNoise: 0.05 },
  { x: 5, y: 4, observedValue: 0.85, time: 0, innovation: 0.65, surprise: 2.8, sensorNoise: 0.05 }
];

const updateA = updateBeliefFromObservations({
  forecastField: forecast,
  priorUncertaintyField: priorUncertainty,
  observations,
  model: 'kernelSmoother',
  lengthScale: 1.8,
  sensorNoise: 0.05,
  confidence: 0.8
});
const updateB = updateBeliefFromObservations({
  forecastField: forecast,
  priorUncertaintyField: priorUncertainty,
  observations,
  model: 'kernelSmoother',
  lengthScale: 1.8,
  sensorNoise: 0.05,
  confidence: 0.8
});

assert.deepEqual(updateA.beliefMeanField, updateB.beliefMeanField);
assert.deepEqual(updateA.expectedUncertaintyField, updateB.expectedUncertaintyField);
assert.ok(updateA.beliefMeanField[4][4] > forecast[4][4]);
assert.ok(updateA.beliefMeanField[4][4] > updateA.beliefMeanField[0][0]);
assert.ok(updateA.expectedUncertaintyField[4][4] < updateA.expectedUncertaintyField[0][0]);
assert.equal(updateA.updateDiagnostics.usesProductionGp, false);
assert.equal(updateA.updateDiagnostics.usesProductionGmrf, false);
assert.match(updateA.updateDiagnostics.notA, /Not a production GP/);

const noUpdate = updateBeliefFromObservations({ forecastField: forecast, priorUncertaintyField: priorUncertainty, observations, model: 'noUpdate' });
assert.equal(noUpdate.beliefMeanField[4][4], forecast[4][4]);

console.log('smoke_uncertainty_belief_update: ok');