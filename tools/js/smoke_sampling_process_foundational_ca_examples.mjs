import assert from 'node:assert/strict';
import { FOUNDATIONAL_CA_MODELS } from '../../src/core/demo/sampling/SpatiotemporalProcessExamples.js';
import { evaluateSamplingProcessExampleBehavior } from '../../src/core/demo/sampling/SamplingProcessExampleBehaviorAssertions.js';
import {
  buildExampleInitialConditionLayers,
  exampleInitialConditionBrushPalette,
  exampleInitialConditionFixtureOptions,
  isExampleInitialConditionEditorSupported
} from '../../src/core/demo/sampling/SamplingProcessInitialConditionEditor.js';

for (const example of FOUNDATIONAL_CA_MODELS) {
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
  assert.notEqual(initialCondition.validation.status, 'FAIL', `${example.id} initial condition should validate`);
}

const conway = evaluateSamplingProcessExampleBehavior(FOUNDATIONAL_CA_MODELS.find((example) => example.id === 'conwayGameOfLife'));
assert.equal(conway.status, 'PASS');
assert.ok(conway.assertionResults.some((result) => result.label.includes('B3/S23') && result.status === 'PASS'), 'Conway should validate B3/S23 birth/survival/death');

const conwayFixtureIds = exampleInitialConditionFixtureOptions('conwayGameOfLife').map((option) => option.id);
for (const id of ['default', 'block', 'blinker', 'glider', 'mixedTeachingSeed', 'randomDeterministic']) {
  assert.ok(conwayFixtureIds.includes(id), `Conway fixture picker should include ${id}`);
}
for (const id of ['inactive', 'active']) {
  assert.ok(exampleInitialConditionBrushPalette('conwayGameOfLife').some((brush) => brush.id === id), `Conway brush palette should include ${id}`);
}

for (const fixtureId of ['conwayGameOfLife:block', 'conwayGameOfLife:blinker', 'conwayGameOfLife:glider']) {
  const result = evaluateSamplingProcessExampleBehavior('conwayGameOfLife', { fixtureId });
  assert.equal(result.status, 'PASS', `${fixtureId} should pass`);
}

console.log('smoke_sampling_process_foundational_ca_examples: ok');
