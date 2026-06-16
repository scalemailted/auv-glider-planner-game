import assert from 'node:assert/strict';

import { computeInnovation, computeObservationSurprise, observationSurpriseSummary } from '../../src/core/science/ObservationSurpriseModel.js';

const observation = { observationId: 'obs-1', observedValue: 1.2, forecastValue: 0.4, sensorNoiseStd: 0.2, x: 2, y: 3 };
const innovation = computeInnovation(observation);
assert.equal(innovation.innovation, 0.8, 'innovation is observed minus forecast');
const surprise = computeObservationSurprise(observation, { preserveProvidedSurprise: false });
assert.equal(surprise.surprise, 4, 'surprise uses noise scale');
assert.equal(surprise.surpriseLevel, 'high', 'surprise level is high');
const summary = observationSurpriseSummary([observation], { preserveProvidedSurprise: false });
assert.equal(summary.count, 1, 'summary counts one observation');
assert.equal(summary.highSurpriseCount, 1, 'summary counts high surprise');
assert.equal(summary.publicSafe, true, 'summary is public safe');

console.log('smoke_observation_surprise_model: ok');
