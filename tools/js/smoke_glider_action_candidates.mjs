import assert from 'node:assert/strict';

import { fieldStats } from '../../src/core/demo/flowCoupledSampling/FlowCoupledSamplingFieldMath.js';
import { generateGliderActionCandidates } from '../../src/core/demo/flowCoupledSampling/GliderActionCandidates.js';
import { computeGliderActionValue } from '../../src/core/demo/flowCoupledSampling/GliderActionValueModel.js';
import { createFlowCoupledSamplingScenario } from '../../src/core/demo/flowCoupledSampling/FlowCoupledSamplingScenarios.js';

function candidatesFor(scenarioId, methodId, candidateMode) {
  const scenario = createFlowCoupledSamplingScenario({ scenarioId, seed: 'glider-action-candidates-smoke' });
  const result = computeGliderActionValue({ scenario, methodId });
  const candidates = generateGliderActionCandidates({
    actionValueField: result.actionValueField,
    components: result.components,
    glider: result.components.glider,
    candidateMode,
    candidateCount: 4,
    minDistance: 2,
    accessibleMask: result.components.accessibleMask,
    reachableMask: result.components.reachableMask
  });
  return { scenario, result, candidates };
}

const base = candidatesFor('mixedFlowMission', 'balancedActionValue', 'reachableTopK');
assert.equal(base.candidates.length, 4, 'candidate generator returns requested count when possible');
assert.ok(base.candidates.every((candidate) => candidate.reason), 'candidates have reason labels');
assert.ok(base.candidates.every((candidate) => candidate.gliderId), 'candidates include gliderId');
assert.ok(base.candidates.every((candidate) => candidate.reachable && candidate.accessible), 'reachableTopK candidates are reachable and accessible');

const assisted = candidatesFor('currentAssistedTarget', 'currentAssisted', 'currentAssistedTargets');
assert.ok(
  average(assisted.candidates.map((candidate) => candidate.currentAssist)) >= fieldStats(assisted.result.components.currentAssist).mean,
  'currentAssistedTargets choose high-assist regions'
);

const lowRisk = candidatesFor('crossCurrentRisk', 'riskAvoidant', 'lowRiskTargets');
assert.ok(
  average(lowRisk.candidates.map((candidate) => candidate.crossCurrentRisk)) <= fieldStats(lowRisk.result.components.crossCurrentRisk).mean + 0.15,
  'lowRiskTargets avoid high risk regions'
);

const intercept = candidatesFor('downstreamIntercept', 'interceptFuturePriority', 'interceptTargets');
assert.ok(
  average(intercept.candidates.map((candidate) => candidate.componentBreakdown.futurePriority)) >= fieldStats(intercept.result.components.futurePriority).mean,
  'interceptTargets choose future-priority regions'
);

const redundancy = candidatesFor('twoGliderRedundancyPreview', 'redundancyAware', 'redundancyAvoidingTargets');
assert.ok(
  average(redundancy.candidates.map((candidate) => candidate.redundancyPenalty)) <= fieldStats(redundancy.result.components.redundancyPenalty).mean + 0.2,
  'redundancyAvoidingTargets avoid redundant zones'
);

console.log('smoke_glider_action_candidates: ok');

function average(values) {
  const finite = values.map(Number).filter(Number.isFinite);
  return finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : 0;
}
