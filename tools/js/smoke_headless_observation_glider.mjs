import assert from 'node:assert/strict';

import { createHeadlessFieldPack } from '../../src/core/headless/runtime/HeadlessFields.js';
import { createDefaultHeadlessRuntimeConfig } from '../../src/core/headless/runtime/HeadlessRuntimeConfig.js';
import { interpolateHeadlessRoute, simulateHeadlessGliderRoute } from '../../src/core/headless/runtime/HeadlessGlider.js';
import { observationSummary, sampleHeadlessObservation } from '../../src/core/headless/runtime/HeadlessObservation.js';

const config = createDefaultHeadlessRuntimeConfig({ seed: 'h1-observation-glider-smoke', width: 18, height: 12 });
const fieldPack = createHeadlessFieldPack(config);
const route = interpolateHeadlessRoute(config.plan.waypoints, 1.5);
assert.ok(route.length > config.plan.waypoints.length, 'route interpolation creates points');

const observation = sampleHeadlessObservation({ fieldPack, x: 5, y: 5, zIndex: 1, gliderId: 'g1', timeSeconds: 12, sensorNoise: 0.03, seed: config.seed });
for (const key of ['truthValue', 'forecastValue', 'beliefValue', 'observedValue', 'innovation', 'surprise']) {
  assert.equal(Number.isFinite(observation[key]), true, `${key} finite`);
}

const result = simulateHeadlessGliderRoute({
  fieldPack,
  glider: config.missionConfig.gliders[0],
  waypoints: config.plan.waypoints,
  missionConfig: { ...config.missionConfig, sensorNoise: config.sensorNoise, planningRules: { stepDistance: config.stepDistance } },
  seed: config.seed
});
assert.ok(result.tracks.length > 0, 'tracks exist');
assert.ok(result.observations.length > 0, 'observations exist');
assert.ok(result.state.energyUsed > 0, 'energy increases with movement');
assert.equal(Number.isFinite(result.state.hazardExposureCount), true, 'hazard exposure count finite');
assert.equal(observationSummary(result.observations).count, result.observations.length, 'observation summary count');

console.log('Headless observation/glider smoke passed');
