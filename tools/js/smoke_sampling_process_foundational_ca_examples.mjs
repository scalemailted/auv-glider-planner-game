import assert from 'node:assert/strict';
import { FOUNDATIONAL_CA_MODELS } from '../../src/core/demo/sampling/SpatiotemporalProcessExamples.js';
import { evaluateSamplingProcessExampleBehavior } from '../../src/core/demo/sampling/SamplingProcessExampleBehaviorAssertions.js';

for (const example of FOUNDATIONAL_CA_MODELS) {
  const result = evaluateSamplingProcessExampleBehavior(example);
  assert.equal(result.status, 'PASS', `${example.id} behavior QA should pass: ${result.details.join('; ')}`);
  assert.ok(result.metrics.initialMeaningfulCellCount > 0, `${example.id} fixture should be non-empty`);
  assert.ok(result.metrics.distinctStatesSeen.length > 0, `${example.id} should expose states`);
}

const conway = evaluateSamplingProcessExampleBehavior(FOUNDATIONAL_CA_MODELS.find((example) => example.id === 'conwayGameOfLife'));
assert.equal(conway.status, 'PASS');
assert.ok(conway.assertionResults.some((result) => result.label.includes('B3/S23') && result.status === 'PASS'), 'Conway should validate B3/S23 birth/survival/death');

for (const fixtureId of ['conwayGameOfLife:block', 'conwayGameOfLife:blinker', 'conwayGameOfLife:glider']) {
  const result = evaluateSamplingProcessExampleBehavior('conwayGameOfLife', { fixtureId });
  assert.equal(result.status, 'PASS', `${fixtureId} should pass`);
}

console.log('smoke_sampling_process_foundational_ca_examples: ok');
