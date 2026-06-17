import assert from 'node:assert/strict';

import {
  buildWaterColumnSummary,
  createWaterColumnObservation,
  summarizeWaterColumnObservations,
  validateWaterColumnObservationSummary
} from '../../src/core/science/WaterColumnObservationModel.js';

const config = { depthLayerIds: ['surface', 'thermocline', 'deep'], diveProfileId: 'sawtoothProfile' };
const observations = [
  createWaterColumnObservation({ waterColumnConfig: config, zIndex: 0, observedValue: 0.2, surprise: 1 }),
  createWaterColumnObservation({ waterColumnConfig: config, zIndex: 1, observedValue: 0.7, surprise: 2.5 }),
  createWaterColumnObservation({ waterColumnConfig: config, zIndex: 2, observedValue: 0.4, surprise: 1.2 })
];
const observationSummary = summarizeWaterColumnObservations(observations, config);
const summary = buildWaterColumnSummary({ config, observations, tracks: observations });

assert.equal(observationSummary.verticalCoverage, 'broad');
assert.equal(summary.type, 'anchor.headless.water-column-summary');
assert.equal(summary.hiddenTruthIncluded, false);
assert.equal(validateWaterColumnObservationSummary(summary).status, 'PASS');

console.log('smoke_water_column_observation_model: ok', { counts: summary.observationCountsByDepth });
