import assert from 'node:assert/strict';
import { OCEAN_RELEVANT_PROCESS_ANALOGS } from '../../src/core/demo/sampling/SpatiotemporalProcessExamples.js';
import { evaluateSamplingProcessExampleBehavior } from '../../src/core/demo/sampling/SamplingProcessExampleBehaviorAssertions.js';

for (const example of OCEAN_RELEVANT_PROCESS_ANALOGS) {
  const result = evaluateSamplingProcessExampleBehavior(example);
  assert.equal(result.status, 'PASS', `${example.id} behavior QA should pass: ${result.details.join('; ')}`);
  assert.ok(result.metrics.initialMeaningfulCellCount > 0, `${example.id} fixture should be non-empty`);
  assert.ok(result.metrics.distinctStatesSeen.length > 0, `${example.id} should expose states`);
  if (example.requiresFlowCoupling) {
    assert.ok(result.assertionResults.some((entry) => entry.label === 'Flow coupling boundary is documented' && entry.status === 'PASS'), `${example.id} should document the flow coupling boundary`);
  }
}

console.log('smoke_sampling_process_ocean_analogs: ok');
