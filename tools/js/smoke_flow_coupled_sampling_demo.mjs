import assert from 'node:assert/strict';

import {
  FLOW_COUPLED_SAMPLING_SCENARIO_IDS,
  flowCoupledSamplingScenarioOptions
} from '../../src/core/demo/flowCoupledSampling/FlowCoupledSamplingScenarios.js';
import {
  GLIDER_ACTION_METHOD_IDS,
  gliderActionMethodOptions
} from '../../src/core/demo/flowCoupledSampling/GliderActionValueModel.js';
import {
  GLIDER_ACTION_CANDIDATE_MODES,
  gliderActionCandidateModeOptions
} from '../../src/core/demo/flowCoupledSampling/GliderActionCandidates.js';
import {
  FLOW_COUPLED_SAMPLING_VIEW_LAYERS,
  FlowCoupledSamplingDemoScene
} from '../../src/game/phaser/scenes/FlowCoupledSamplingDemoScene.js';

assert.ok(FLOW_COUPLED_SAMPLING_SCENARIO_IDS.length >= 8, 'scenario list imports');
assert.ok(GLIDER_ACTION_METHOD_IDS.length >= 8, 'method list imports');
assert.ok(GLIDER_ACTION_CANDIDATE_MODES.length >= 8, 'candidate mode list imports');
assert.ok(FLOW_COUPLED_SAMPLING_VIEW_LAYERS.includes('gliderActionValue'), 'view layers include Q_glider');
assert.ok(flowCoupledSamplingScenarioOptions().every((option) => option.label), 'scenario options have labels');
assert.ok(gliderActionMethodOptions().every((option) => option.label), 'method options have labels');
assert.ok(gliderActionCandidateModeOptions().every((option) => option.label), 'candidate mode options have labels');

const scene = new FlowCoupledSamplingDemoScene();
scene.init({
  scenarioId: 'downstreamIntercept',
  methodId: 'interceptFuturePriority',
  candidateMode: 'interceptTargets',
  viewLayer: 'gliderActionValue',
  exportMode: 'currentFrame'
});

assert.equal(globalThis.ANCHOR_FLOW_COUPLED_SAMPLING_DEMO_DEBUG?.usesFlowCoupling, true, 'debug uses flow coupling');
assert.equal(globalThis.ANCHOR_FLOW_COUPLED_SAMPLING_DEMO_DEBUG?.usesRoutePlanning, false, 'debug excludes route planning');
assert.equal(globalThis.ANCHOR_FLOW_COUPLED_SAMPLING_DEMO_DEBUG?.usesMissionScoring, false, 'debug excludes mission scoring');
assert.ok(globalThis.ANCHOR_FLOW_COUPLED_SAMPLING_DEMO_DEBUG?.candidateTargets?.length > 0, 'debug exposes candidate targets');

const artifact = scene.buildDemoArtifactExport();
assert.equal(artifact.type, 'anchor.demo.flow-coupled-sampling', 'export type');
assert.ok(artifact.flowCoupledSamplingModel, 'export includes flowCoupledSamplingModel');
assert.ok(artifact.gliderActionContext, 'export includes gliderActionContext');
assert.ok(artifact.candidateTargets?.length > 0, 'export includes candidateTargets');
assert.ok(artifact.actionValueDiagnostics, 'export includes actionValueDiagnostics');
assert.equal(artifact.flowCoupledSamplingModel.usesFlowCoupling, true, 'export marks flow coupling');
assert.equal(artifact.flowCoupledSamplingModel.usesRoutePlanning, false, 'export excludes route planning');
assert.ok(artifact.fields.actionValueField, 'export includes action value field');
assert.ok(artifact.fields.globalPriorityField, 'export includes global priority field');
assert.ok(artifact.fields.flowU && artifact.fields.flowV, 'export includes flow components');
assert.ok(artifact.metadata.notA.includes('not full route planning'), 'export claim boundary documents route-planning exclusion');

console.log('smoke_flow_coupled_sampling_demo: ok');
