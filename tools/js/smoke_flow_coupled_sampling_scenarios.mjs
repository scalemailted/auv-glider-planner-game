import assert from 'node:assert/strict';

import {
  fieldStats,
  finiteFieldCheck
} from '../../src/core/demo/flowCoupledSampling/FlowCoupledSamplingFieldMath.js';
import { computeGliderActionValue } from '../../src/core/demo/flowCoupledSampling/GliderActionValueModel.js';
import {
  FLOW_COUPLED_SAMPLING_SCENARIO_IDS,
  createFlowCoupledSamplingScenario,
  flowCoupledSamplingScenarioOptions
} from '../../src/core/demo/flowCoupledSampling/FlowCoupledSamplingScenarios.js';

assert.ok(FLOW_COUPLED_SAMPLING_SCENARIO_IDS.length >= 8, 'scenario list includes required fixtures');
assert.ok(flowCoupledSamplingScenarioOptions().every((option) => option.label), 'scenario options have labels');

for (const scenarioId of FLOW_COUPLED_SAMPLING_SCENARIO_IDS) {
  const scenario = createFlowCoupledSamplingScenario({ scenarioId, seed: 'flow-coupled-scenario-smoke' });
  assert.ok(scenario.width > 0 && scenario.height > 0, `${scenarioId} has dimensions`);
  assert.ok(scenario.gliders.length >= 1, `${scenarioId} has at least one glider`);
  assert.ok(scenario.teachingNotes, `${scenarioId} has teaching notes`);
  assert.ok(scenario.notA.includes('not a calibrated'), `${scenarioId} has claim boundary`);
  for (const key of ['globalPriorityField', 'futurePriorityField', 'hazardField', 'accessibleMask', 'recentSamplePenaltyField']) {
    const check = finiteFieldCheck(scenario[key]);
    assert.equal(check.ok, true, `${scenarioId} ${key} finite`);
    assert.equal(check.width, scenario.width, `${scenarioId} ${key} width`);
    assert.equal(check.height, scenario.height, `${scenarioId} ${key} height`);
  }
  assert.equal(validateFlowField(scenario.flowField, scenario.width, scenario.height), true, `${scenarioId} flow field finite`);
}

const assisted = computeGliderActionValue({
  scenario: createFlowCoupledSamplingScenario({ scenarioId: 'currentAssistedTarget', seed: 'flow-coupled-scenario-smoke' }),
  methodId: 'currentAssisted'
});
assert.ok(fieldStats(assisted.components.currentAssist).max > 0.3, 'currentAssistedTarget has aligned-current opportunity');

const opposed = computeGliderActionValue({
  scenario: createFlowCoupledSamplingScenario({ scenarioId: 'currentOpposedTarget', seed: 'flow-coupled-scenario-smoke' }),
  methodId: 'balancedActionValue'
});
assert.ok(fieldStats(opposed.components.rawCurrentAssist).min < -0.3, 'currentOpposedTarget has opposing-current penalty');

const cross = computeGliderActionValue({
  scenario: createFlowCoupledSamplingScenario({ scenarioId: 'crossCurrentRisk', seed: 'flow-coupled-scenario-smoke' }),
  methodId: 'riskAvoidant'
});
assert.ok(fieldStats(cross.components.crossCurrentRisk).max > 0.45, 'crossCurrentRisk has cross-current signal');

const intercept = createFlowCoupledSamplingScenario({ scenarioId: 'downstreamIntercept', seed: 'flow-coupled-scenario-smoke' });
assert.notDeepEqual(intercept.globalPriorityField, intercept.futurePriorityField, 'downstreamIntercept future priority differs from current priority');

const hazard = createFlowCoupledSamplingScenario({ scenarioId: 'hazardGap', seed: 'flow-coupled-scenario-smoke' });
assert.ok(fieldStats(hazard.hazardField).max > 0.5, 'hazardGap has nonzero hazard');
assert.ok(fieldStats(hazard.accessibleMask).min === 0 && fieldStats(hazard.accessibleMask).max === 1, 'hazardGap has accessible corridor and blocked cells');

const redundancy = createFlowCoupledSamplingScenario({ scenarioId: 'twoGliderRedundancyPreview', seed: 'flow-coupled-scenario-smoke' });
assert.ok(redundancy.gliders.length >= 2 || fieldStats(redundancy.recentSamplePenaltyField).max > 0.2, 'twoGliderRedundancyPreview includes second glider or redundancy field');

console.log('smoke_flow_coupled_sampling_scenarios: ok');

function validateFlowField(flowField, width, height) {
  if (!Array.isArray(flowField) || flowField.length !== height || flowField[0]?.length !== width) return false;
  return flowField.every((row) => Array.isArray(row) && row.every((cell) => Number.isFinite(Number(cell?.u)) && Number.isFinite(Number(cell?.v))));
}
