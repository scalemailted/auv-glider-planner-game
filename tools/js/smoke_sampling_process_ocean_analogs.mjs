import assert from 'node:assert/strict';
import { OCEAN_RELEVANT_PROCESS_ANALOGS } from '../../src/core/demo/sampling/SpatiotemporalProcessExamples.js';
import { evaluateSamplingProcessExampleBehavior } from '../../src/core/demo/sampling/SamplingProcessExampleBehaviorAssertions.js';
import {
  buildExampleInitialConditionLayers,
  exampleInitialConditionBrushPalette,
  exampleInitialConditionFixtureOptions,
  initialConditionGuidanceForExample,
  isExampleInitialConditionEditorSupported
} from '../../src/core/demo/sampling/SamplingProcessInitialConditionEditor.js';

for (const example of OCEAN_RELEVANT_PROCESS_ANALOGS) {
  const result = evaluateSamplingProcessExampleBehavior(example);
  const fixtureOptions = exampleInitialConditionFixtureOptions(example).map((option) => option.id);
  const palette = exampleInitialConditionBrushPalette(example);
  const initialCondition = buildExampleInitialConditionLayers(example, { fixtureId: 'default' });
  assert.equal(result.status, 'PASS', `${example.id} behavior QA should pass: ${result.details.join('; ')}`);
  assert.ok(result.metrics.initialMeaningfulCellCount > 0, `${example.id} fixture should be non-empty`);
  assert.ok(result.metrics.distinctStatesSeen.length > 0, `${example.id} should expose states`);
  assert.ok(isExampleInitialConditionEditorSupported(example), `${example.id} should support interactive initial-condition editing`);
  assert.ok(fixtureOptions.includes('default'), `${example.id} should expose default fixture`);
  assert.ok(fixtureOptions.includes('randomDeterministic'), `${example.id} should expose deterministic random fixture`);
  assert.ok(palette.length >= 2, `${example.id} should expose brush palette`);
  assert.ok(palette.some((brush) => brush.id === 'source'), `${example.id} should expose source brush`);
  assert.notEqual(initialCondition.validation.status, 'FAIL', `${example.id} initial condition should validate`);
  if (example.requiresFlowCoupling) {
    assert.ok(result.assertionResults.some((entry) => entry.label === 'Flow coupling boundary is documented' && entry.status === 'PASS'), `${example.id} should document the flow coupling boundary`);
    assert.match(initialConditionGuidanceForExample(example).note, /not physical advection|simplified event-layer/i, `${example.id} should show ocean analog disclaimer`);
  }
}

console.log('smoke_sampling_process_ocean_analogs: ok');
