import assert from 'node:assert/strict';
import { createUncertaintyForecastField } from '../../src/core/demo/UncertaintyForecastDemo.js';
import { applyObservationSet } from '../../src/core/demo/uncertainty/ObservationModel.js';

function stateWithSamples(scenarioId, options = {}) {
  const base = createUncertaintyForecastField({ scenarioId, sensorNoise: options.sensorNoise ?? 0.03 });
  const observations = applyObservationSet({
    truthField: base.hiddenTruthField,
    forecastField: base.forecastField,
    uncertaintyField: base.expectedUncertaintyField,
    pattern: options.pattern ?? 'clusterFollowup',
    count: options.count ?? 8,
    scenarioId,
    seed: `diagnostics:${scenarioId}`,
    sensorNoise: options.sensorNoise ?? 0.03
  });
  return createUncertaintyForecastField({ scenarioId, observations, sensorNoise: options.sensorNoise ?? 0.03 });
}

const accurate = stateWithSamples('accurateForecast', { pattern: 'crossSectionTransect' });
assert.ok(accurate.diagnostics.primaryDiagnosis === 'agreesWithForecast' || accurate.diagnostics.forecastErrorScore < 0.2);

const shifted = stateWithSamples('shiftedFront', { pattern: 'boundaryProbe' });
assert.equal(shifted.diagnostics.primaryDiagnosis, 'likelyForecastError');

const weakened = stateWithSamples('weakenedHotspot', { pattern: 'clusterFollowup' });
assert.equal(weakened.diagnostics.primaryDiagnosis, 'likelyForecastError');

const hiddenPlume = stateWithSamples('hiddenPlume', { pattern: 'clusterFollowup' });
assert.equal(hiddenPlume.diagnostics.primaryDiagnosis, 'possibleHiddenEvent');
assert.ok(hiddenPlume.diagnostics.hiddenEventConfidence > hiddenPlume.diagnostics.forecastErrorScore);

const noisy = stateWithSamples('noisyFalseAlarm', { pattern: 'singlePoint', count: 1, sensorNoise: 0.3 });
assert.ok(['likelyNoiseOrFalseAlarm', 'insufficientEvidence'].includes(noisy.diagnostics.primaryDiagnosis));
assert.ok(noisy.diagnostics.noiseFalseAlarmRisk >= 0.5);

assert.notDeepEqual(hiddenPlume.unknownEventProbabilityField, hiddenPlume.expectedUncertaintyField);
assert.ok(hiddenPlume.fieldsFinite);

console.log('smoke_uncertainty_diagnostics: ok');