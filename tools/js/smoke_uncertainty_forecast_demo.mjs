import assert from 'node:assert/strict';
import {
  UNCERTAINTY_DEMO_OBSERVATION_PATHS,
  UNCERTAINTY_DEMO_UPDATE_MODELS,
  UNCERTAINTY_DEMO_VIEW_MODES,
  UNCERTAINTY_SCENARIO_IDS,
  createUncertaintyForecastField
} from '../../src/core/demo/UncertaintyForecastDemo.js';
import { applyObservationSet } from '../../src/core/demo/uncertainty/ObservationModel.js';
import { UncertaintyForecastDemoScene } from '../../src/game/phaser/scenes/UncertaintyForecastDemoScene.js';

assert.ok(UNCERTAINTY_SCENARIO_IDS.includes('accurateForecast'));
assert.ok(UNCERTAINTY_SCENARIO_IDS.includes('hiddenPlume'));
assert.ok(UNCERTAINTY_DEMO_VIEW_MODES.includes('hiddenTruth'));
assert.ok(UNCERTAINTY_DEMO_VIEW_MODES.includes('forecast'));
assert.ok(UNCERTAINTY_DEMO_VIEW_MODES.includes('belief'));
assert.ok(UNCERTAINTY_DEMO_VIEW_MODES.includes('uncertainty'));
assert.ok(UNCERTAINTY_DEMO_VIEW_MODES.includes('surprise'));
assert.ok(UNCERTAINTY_DEMO_VIEW_MODES.includes('unknownEventProbability'));
assert.ok(UNCERTAINTY_DEMO_VIEW_MODES.includes('samplingPriorityPreview'));
assert.ok(UNCERTAINTY_DEMO_OBSERVATION_PATHS.includes('boundaryProbe'));
assert.ok(UNCERTAINTY_DEMO_UPDATE_MODELS.includes('kernelSmoother'));

const base = createUncertaintyForecastField({ scenarioId: 'hiddenPlume' });
const observations = applyObservationSet({
  truthField: base.hiddenTruthField,
  forecastField: base.forecastField,
  uncertaintyField: base.expectedUncertaintyField,
  scenarioId: 'hiddenPlume',
  pattern: 'clusterFollowup',
  count: 6,
  seed: 'forecast-demo-smoke',
  sensorNoise: 0.03
});
const field = createUncertaintyForecastField({ scenarioId: 'hiddenPlume', viewMode: 'samplingPriorityPreview', observations });
assert.equal(field.viewMode, 'samplingPriorityPreview');
assert.equal(field.fieldsFinite, true);
assert.equal(field.diagnostics.primaryDiagnosis, 'possibleHiddenEvent');

const scene = new UncertaintyForecastDemoScene();
scene.init({ scenarioId: 'hiddenPlume', viewMode: 'samplingPriorityPreview', observations, sensorNoise: 0.03 });
const artifact = scene.buildDemoArtifactExport();
assert.equal(artifact.type, 'anchor.demo.uncertainty-forecast');
assert.equal(artifact.uncertaintyModel.scenarioId, 'hiddenPlume');
assert.equal(artifact.observationModel.formula, 'z_i = T(x_i,y_i,t_i) + epsilon_i');
assert.equal(artifact.beliefState.hasHiddenTruth, true);
assert.equal(artifact.beliefState.hasForecast, true);
assert.equal(artifact.beliefState.hasBeliefMean, true);
assert.equal(artifact.beliefState.hasExpectedUncertainty, true);
assert.equal(artifact.beliefState.hasUnknownEventProbability, true);
assert.equal(artifact.diagnostics.primaryDiagnosis, 'possibleHiddenEvent');
assert.ok(Array.isArray(artifact.fields.hiddenTruth));
assert.ok(Array.isArray(artifact.fields.forecast));
assert.ok(Array.isArray(artifact.fields.belief));
assert.ok(Array.isArray(artifact.fields.uncertainty));
assert.ok(Array.isArray(artifact.fields.surprise));
assert.ok(Array.isArray(artifact.fields.forecastError));
assert.ok(Array.isArray(artifact.fields.unknownEventProbability));
assert.ok(Array.isArray(artifact.fields.samplingPriorityPreview));
assert.ok(Array.isArray(artifact.fields.informationGain));
assert.ok(Array.isArray(artifact.fields.deltaAfterUpdate));
assert.equal(globalThis.ANCHOR_UNCERTAINTY_DEMO_DEBUG.scenarioId, 'hiddenPlume');
assert.equal(globalThis.ANCHOR_UNCERTAINTY_DEMO_DEBUG.usesProductionGp, false);
assert.equal(globalThis.ANCHOR_UNCERTAINTY_DEMO_DEBUG.usesProductionGmrf, false);
assert.equal(globalThis.ANCHOR_UNCERTAINTY_DEMO_DEBUG.usesPlanner, false);
assert.equal(globalThis.ANCHOR_UNCERTAINTY_DEMO_DEBUG.fieldsFinite, true);

console.log('smoke_uncertainty_forecast_demo: ok');