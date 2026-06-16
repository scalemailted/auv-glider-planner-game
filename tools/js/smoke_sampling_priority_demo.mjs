import assert from 'node:assert/strict';

import {
  SAMPLING_PRIORITY_CANDIDATE_MODES,
  samplingPriorityCandidateModeOptions
} from '../../src/core/demo/samplingPriority/SamplingPriorityCandidates.js';
import {
  SAMPLING_PRIORITY_METHOD_IDS,
  samplingPriorityMethodOptions
} from '../../src/core/demo/samplingPriority/SamplingPriorityModel.js';
import {
  SAMPLING_PRIORITY_SCENARIO_IDS,
  samplingPriorityScenarioOptions
} from '../../src/core/demo/samplingPriority/SamplingPriorityScenarios.js';
import {
  SAMPLING_PRIORITY_VIEW_LAYERS,
  SamplingPriorityDemoScene
} from '../../src/game/phaser/scenes/SamplingPriorityDemoScene.js';

assert.ok(SAMPLING_PRIORITY_SCENARIO_IDS.length >= 8, 'scenario list imports');
assert.ok(SAMPLING_PRIORITY_METHOD_IDS.length >= 9, 'method list imports');
assert.ok(SAMPLING_PRIORITY_CANDIDATE_MODES.length >= 7, 'candidate mode list imports');
assert.ok(SAMPLING_PRIORITY_VIEW_LAYERS.includes('samplingPriority'), 'view layers include sampling priority');
assert.ok(samplingPriorityScenarioOptions().every((option) => option.label), 'scenario options have labels');
assert.ok(samplingPriorityMethodOptions().every((option) => option.label), 'method options have labels');
assert.ok(samplingPriorityCandidateModeOptions().every((option) => option.label), 'candidate mode options have labels');

const scene = new SamplingPriorityDemoScene();
scene.init({
  scenarioId: 'uncertainFront',
  methodId: 'weightedAcquisition',
  candidateMode: 'diverseTopK',
  exportMode: 'currentFrame'
});

assert.equal(globalThis.ANCHOR_SAMPLING_PRIORITY_DEMO_DEBUG?.usesRoutePlanning, false, 'debug excludes route planning');
assert.equal(globalThis.ANCHOR_SAMPLING_PRIORITY_DEMO_DEBUG?.usesFlowCoupling, false, 'debug excludes flow coupling');
assert.equal(scene.candidateSamplePoints.length, 6, 'scene builds candidates');

const artifact = scene.buildDemoArtifactExport();
assert.equal(artifact.type, 'anchor.demo.sampling-priority', 'export type');
assert.ok(artifact.samplingPriorityModel, 'export includes samplingPriorityModel');
assert.ok(artifact.candidateSamplePoints?.length > 0, 'export includes candidateSamplePoints');
assert.ok(artifact.priorityDiagnostics, 'export includes priorityDiagnostics');
assert.equal(artifact.priorityDiagnostics.usesRoutePlanning, false, 'export excludes route planning');
assert.equal(artifact.priorityDiagnostics.usesFlowCoupling, false, 'export excludes flow coupling');
assert.ok(artifact.fields.samplingPriorityField, 'export includes sampling priority field');
assert.ok(artifact.fields.eventIntensityField, 'export includes event intensity field');
assert.ok(artifact.metadata.notA.includes('not route planning'), 'export claim boundary documents route-planning exclusion');

console.log('smoke_sampling_priority_demo: ok');
