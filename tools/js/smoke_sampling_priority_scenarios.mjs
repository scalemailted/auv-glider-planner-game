import assert from 'node:assert/strict';

import { fieldStats, finiteFieldCheck } from '../../src/core/demo/samplingPriority/SamplingPriorityFieldMath.js';
import {
  SAMPLING_PRIORITY_SCENARIO_IDS,
  createSamplingPriorityScenario
} from '../../src/core/demo/samplingPriority/SamplingPriorityScenarios.js';

const requiredFields = [
  'eventIntensityField',
  'trueRoiField',
  'beliefRoiField',
  'expectedUncertaintyField',
  'boundaryStrengthField',
  'forecastValidationField',
  'hiddenEventProbabilityField',
  'stalenessField',
  'hazardField',
  'recentSamplePenaltyField',
  'accessibleMask'
];

for (const scenarioId of SAMPLING_PRIORITY_SCENARIO_IDS) {
  const scenario = createSamplingPriorityScenario({ scenarioId, seed: 'sampling-priority-scenario-smoke' });
  assert.equal(scenario.scenarioId, scenarioId, `${scenarioId} normalized`);
  for (const fieldName of requiredFields) {
    const check = finiteFieldCheck(scenario[fieldName]);
    assert.equal(check.ok, true, `${scenarioId} ${fieldName} finite`);
    assert.equal(check.width, scenario.width, `${scenarioId} ${fieldName} width`);
    assert.equal(check.height, scenario.height, `${scenarioId} ${fieldName} height`);
  }
  assert.ok(scenario.teachingNotes, `${scenarioId} teaching notes`);
  assert.ok(scenario.notA, `${scenarioId} claim boundary`);
}

assert.ok(fieldStats(createSamplingPriorityScenario({ scenarioId: 'hiddenPlumeFollowup' }).hiddenEventProbabilityField).max > 0.2, 'hiddenPlumeFollowup has hidden-event probability');
assert.ok(fieldStats(createSamplingPriorityScenario({ scenarioId: 'staleMonitoring' }).stalenessField).max > 0.2, 'staleMonitoring has staleness');
assert.ok(fieldStats(createSamplingPriorityScenario({ scenarioId: 'hazardSuppression' }).hazardField).max > 0.2, 'hazardSuppression has hazard');
assert.ok(fieldStats(createSamplingPriorityScenario({ scenarioId: 'uncertainFront' }).boundaryStrengthField).max > 0.2, 'uncertainFront has boundary/gradient');

console.log('smoke_sampling_priority_scenarios: ok');
