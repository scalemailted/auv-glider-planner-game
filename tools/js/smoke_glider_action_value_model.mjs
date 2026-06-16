import assert from 'node:assert/strict';

import {
  fieldStats,
  finiteFieldCheck
} from '../../src/core/demo/flowCoupledSampling/FlowCoupledSamplingFieldMath.js';
import {
  GLIDER_ACTION_METHOD_IDS,
  computeGliderActionValue
} from '../../src/core/demo/flowCoupledSampling/GliderActionValueModel.js';
import { createFlowCoupledSamplingScenario } from '../../src/core/demo/flowCoupledSampling/FlowCoupledSamplingScenarios.js';

function assertField01(field, label) {
  assert.equal(finiteFieldCheck(field).ok, true, `${label} finite`);
  const stats = fieldStats(field);
  assert.ok(stats.min >= 0, `${label} min >= 0`);
  assert.ok(stats.max <= 1, `${label} max <= 1`);
}

const mixed = createFlowCoupledSamplingScenario({ scenarioId: 'mixedFlowMission', seed: 'glider-action-model-smoke' });
for (const methodId of GLIDER_ACTION_METHOD_IDS) {
  const result = computeGliderActionValue({ scenario: mixed, methodId });
  assertField01(result.actionValueField, `${methodId} action value`);
  assert.equal(result.usesFlowCoupling, true, `${methodId} uses flow coupling`);
  assert.equal(result.usesRoutePlanning, false, `${methodId} excludes route planning`);
  assert.equal(result.usesMissionScoring, false, `${methodId} excludes mission scoring`);
}

const balanced = computeGliderActionValue({ scenario: mixed, methodId: 'balancedActionValue' });
assert.notDeepEqual(balanced.actionValueField, balanced.components.globalPriority, 'balancedActionValue combines components beyond global priority');

const assistedScenario = createFlowCoupledSamplingScenario({ scenarioId: 'currentAssistedTarget', seed: 'glider-action-current-smoke' });
const assisted = computeGliderActionValue({ scenario: assistedScenario, methodId: 'currentAssisted' });
const assistedTop = maxPoint(assisted.actionValueField);
assert.ok(
  valueAt(assisted.components.currentAssist, assistedTop.x, assistedTop.y) >= fieldStats(assisted.components.currentAssist).mean,
  'currentAssisted favors aligned-current target'
);

const riskScenario = createFlowCoupledSamplingScenario({ scenarioId: 'hazardGap', seed: 'glider-action-risk-smoke' });
const risk = computeGliderActionValue({ scenario: riskScenario, methodId: 'riskAvoidant' });
const riskTop = maxPoint(risk.actionValueField);
assert.ok(valueAt(risk.components.hazardPenalty, riskTop.x, riskTop.y) < 0.55, 'riskAvoidant suppresses hazard regions');
assert.ok(valueAt(risk.components.crossCurrentRisk, riskTop.x, riskTop.y) < 0.8, 'riskAvoidant suppresses high cross-current regions');

const interceptScenario = createFlowCoupledSamplingScenario({ scenarioId: 'downstreamIntercept', seed: 'glider-action-intercept-smoke' });
const intercept = computeGliderActionValue({ scenario: interceptScenario, methodId: 'interceptFuturePriority' });
const interceptTop = maxPoint(intercept.actionValueField);
assert.ok(
  valueAt(intercept.components.futurePriority, interceptTop.x, interceptTop.y) >= fieldStats(intercept.components.futurePriority).mean,
  'interceptFuturePriority favors future priority'
);

const redundancyScenario = createFlowCoupledSamplingScenario({ scenarioId: 'twoGliderRedundancyPreview', seed: 'glider-action-redundancy-smoke' });
const redundancy = computeGliderActionValue({ scenario: redundancyScenario, methodId: 'redundancyAware' });
const redundantPeak = maxPoint(redundancy.components.redundancyPenalty);
assert.ok(
  valueAt(redundancy.actionValueField, redundantPeak.x, redundantPeak.y) < 0.62,
  'redundancyAware suppresses redundant/recently sampled regions'
);

assert.equal(balanced.diagnostics.actionValueNotGlobalPriority, true, 'action value is not identical to global priority in mixedFlowMission');

console.log('smoke_glider_action_value_model: ok');

function maxPoint(field) {
  let best = { x: 0, y: 0, value: -Infinity };
  for (let y = 0; y < (field?.length ?? 0); y += 1) {
    for (let x = 0; x < (field?.[0]?.length ?? 0); x += 1) {
      const value = valueAt(field, x, y);
      if (value > best.value) best = { x, y, value };
    }
  }
  return best;
}

function valueAt(field, x, y, fallback = 0) {
  const value = Number(field?.[y]?.[x]);
  return Number.isFinite(value) ? value : fallback;
}
